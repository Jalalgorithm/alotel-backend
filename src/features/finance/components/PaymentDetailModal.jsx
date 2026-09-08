import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { ReasonModal } from '@/components/shared/ReasonModal';
import { formatCurrency, formatDate } from '@/utils/format';
import { usePaymentActions } from '../hooks/useFinance';
import { useBookingRefundStatus } from '@/features/bookings';

const STATUS_BADGE_VARIANT = { initiated: 'neutral', pending: 'warn', succeeded: 'ok', failed: 'danger', cancelled: 'neutral' };

const Row = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4 py-2 text-[12.5px]">
    <span className="text-ink-muted">{label}</span>
    <span className="font-medium text-ink">{children}</span>
  </div>
);

/**
 * Row-click detail view for one payment transaction.
 *
 * `usePaymentActions` (refund/deposit lifecycle) already exists and is wired
 * to real endpoints — this is the first screen in the finance feature that
 * actually surfaces the Refund action to an admin.
 */
export const PaymentDetailModal = ({ payment, onClose }) => {
  const [confirming, setConfirming] = useState(false);
  const { refund, isPending } = usePaymentActions();
  // `payment.status` only reflects this one transaction — check whether the
  // booking it belongs to already has a succeeded refund, same real signal
  // used in Cancellations/Payment Operations, so this stays consistent with
  // both instead of letting an already-refunded booking show an active button.
  const [refundQuery] = useBookingRefundStatus(payment ? [payment.bookingId] : []);
  const alreadyRefunded = Boolean(refundQuery?.data);

  if (!payment) return null;

  const isRefundEligible = payment.status === 'succeeded' && payment.transactionType === 'payment' && !alreadyRefunded;

  return (
    <Modal isOpen={Boolean(payment)} onClose={onClose} title="Payment details" description={payment.reference} size="sm">
      <div className="divide-y divide-line">
        <Row label="Booking">#{payment.bookingId}</Row>
        <Row label="Guest">{payment.guest}</Row>
        <Row label="Property">{payment.property}</Row>
        <Row label="Amount">{formatCurrency(payment.amount, payment.currency)}</Row>
        <Row label="Provider">
          <span className="capitalize">{payment.provider}</span>
        </Row>
        <Row label="Processed">{payment.paidAt ? formatDate(payment.paidAt) : '—'}</Row>
        <Row label="Status">
          <Badge variant={STATUS_BADGE_VARIANT[payment.status] ?? 'neutral'} dot>
            {payment.status}
          </Badge>
        </Row>
        {payment.failureReason && <Row label="Failure reason">{payment.failureReason}</Row>}
      </div>

      <div className="mt-4 border-t border-line pt-4">
        {alreadyRefunded ? (
          <StatusBadge status="Refunded" />
        ) : isRefundEligible ? (
          <Button variant="dangerSoft" fullWidth onClick={() => setConfirming(true)}>
            Refund {formatCurrency(payment.amount, payment.currency)}
          </Button>
        ) : (
          payment.transactionType === 'payment' && (
            <p className="text-[11.5px] text-ink-muted">
              Only a succeeded payment can be refunded — this transaction is {payment.status}.
            </p>
          )
        )}
      </div>

      <ReasonModal
        isOpen={confirming}
        title="Refund this booking?"
        description={`${formatCurrency(payment.amount, payment.currency)} via ${payment.provider} · this cannot be undone.`}
        reasonLabel="Reason for refund"
        confirmLabel="Confirm refund"
        isPending={isPending}
        onClose={() => setConfirming(false)}
        onConfirm={(reason) => {
          refund(
            { bookingId: payment.bookingId, amount: payment.amount, currency: payment.currency, reason },
            { onSuccess: () => onClose(), onSettled: () => setConfirming(false) },
          );
        }}
      />
    </Modal>
  );
};
