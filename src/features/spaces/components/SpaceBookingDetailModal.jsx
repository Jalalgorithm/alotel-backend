import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/utils/format';
import { BOOKING_STATUS_BADGE_VARIANT, SPACE_BOOKING_STATUSES } from '@/lib/spaceSchema';
import { useBookingDecisions } from '../hooks/useSpaceBookings';

const Row = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4 text-[12.5px]">
    <span className="text-ink-muted">{label}</span>
    <span className="tabular-nums text-ink">{children}</span>
  </div>
);

/** Shared booking detail — used by the space's Bookings tab, the global bookings table, and the approval queue. */
export const SpaceBookingDetailModal = ({ isOpen, onClose, booking, canManage }) => {
  const { approveBooking, declineBooking, isApproving, isDeclining } = useBookingDecisions();
  const [declineReason, setDeclineReason] = useState('');
  const [isDeclining_, setIsDeclining_] = useState(false);

  if (!booking) return null;

  const isPending = booking.status === 'pending_host_approval';
  const start = new Date(booking.startDatetime);
  const end = new Date(booking.endDatetime);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={booking.spaceName}
      description={`${booking.guestName} · ${formatDate(booking.startDatetime, 'd MMM yyyy')}`}
      size="lg"
      footer={
        canManage && isPending ? (
          isDeclining_ ? (
            <div className="space-y-2.5">
              <Textarea label="Decline reason" placeholder="Shown to the guest" value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} rows={2} />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsDeclining_(false)}>Back</Button>
                <Button
                  variant="danger"
                  isLoading={isDeclining}
                  disabled={!declineReason.trim()}
                  onClick={() => declineBooking(booking.id, declineReason, { onSuccess: onClose })}
                >
                  Confirm decline
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="dangerSoft" onClick={() => setIsDeclining_(true)}>Decline</Button>
              <Button variant="primary" isLoading={isApproving} onClick={() => approveBooking(booking.id, { onSuccess: onClose })}>Approve</Button>
            </div>
          )
        ) : (
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={BOOKING_STATUS_BADGE_VARIANT[booking.status]} dot>
            {SPACE_BOOKING_STATUSES.find((s) => s.value === booking.status)?.label ?? booking.status}
          </Badge>
          {/* `booking_mode` lives on the parent Space, not the booking itself — inferred here from whether an approval deadline was ever set. */}
          <Badge variant={booking.approvalDueAt ? 'info' : 'ok'}>{booking.approvalDueAt ? 'Request' : 'Instant'}</Badge>
        </div>

        <div className="space-y-1.5 rounded-lg border border-line bg-white p-3">
          <Row label="Layout">{booking.layoutName}</Row>
          <Row label="Guests">{booking.guestCount}</Row>
          <Row label="Window">
            {formatDate(start, 'HH:mm')} – {formatDate(end, 'HH:mm')}, {formatDate(start, 'd MMM yyyy')}
          </Row>
          <Row label="Contact">{booking.guestEmail}</Row>
        </div>

        {booking.addons.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Add-ons</p>
            <div className="space-y-1">
              {booking.addons.map((addon) => (
                <div key={addon.id ?? addon.addonId} className="flex items-center justify-between text-[12px] text-ink-soft">
                  <span>{addon.name} × {addon.qty}</span>
                  <span className="tabular-nums">{formatCurrency(addon.price * addon.qty, booking.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5 border-t border-line pt-3">
          <Row label="Base price">{formatCurrency(booking.basePrice, booking.currency)}</Row>
          <Row label="Add-ons">{formatCurrency(booking.addonsPrice, booking.currency)}</Row>
          <Row label="Tax">{formatCurrency(booking.taxTotal, booking.currency)}</Row>
          <div className="flex items-center justify-between gap-4 border-t border-line pt-2 text-[13px] font-semibold">
            <span className="text-ink">Total</span>
            <span className="tabular-nums text-brand-700">{formatCurrency(booking.totalPrice, booking.currency)}</span>
          </div>
        </div>

        {booking.status === 'declined' && booking.declineReason && (
          <p className="rounded-lg bg-danger-soft p-3 text-[12px] text-danger">Declined: {booking.declineReason}</p>
        )}
      </div>
    </Modal>
  );
};
