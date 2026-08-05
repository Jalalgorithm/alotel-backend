import { useState } from 'react';
import { CalendarDays, Mail, MapPin, Receipt, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Pagination } from '@/components/shared/Pagination';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Textarea } from '@/components/ui/Input';
import { AvatarCell } from '@/components/ui/Avatar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  useBookingActions,
  useBookingReceipt,
  useBookingTimeline,
  useBooking,
  useBookings,
} from '../hooks/useBookings';
import { formatCurrency, formatDate } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { useDeposit, useFxRates, usePaymentActions } from '@/features/finance';
import {
  ACTIONABLE_STATUSES,
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_VARIANT,
} from '@/lib/bookingSchema';

const StatusPill = ({ status }) => (
  <Badge variant={BOOKING_STATUS_VARIANT[status] ?? 'neutral'} dot>
    {BOOKING_STATUS_LABELS[status] ?? status}
  </Badge>
);

/* -------------------------------------------------------------------------- */
/* Detail drawer                                                              */
/* -------------------------------------------------------------------------- */

const Field = ({ icon: Icon, label, children }) => (
  <div className="min-w-0">
    <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">
      {Icon && <Icon className="size-3 text-brand-600" aria-hidden="true" />}
      {label}
    </p>
    <p className="mt-1 break-words text-[13px] text-ink">{children ?? '—'}</p>
  </div>
);

/**
 * Refunds and the security-deposit lifecycle.
 *
 * These live on the booking rather than on a payments ledger because that is
 * how the API models them — every payment operation is addressed by booking id,
 * and there is no endpoint that lists transactions on their own.
 */
const PaymentOperations = ({ booking, currency }) => {
  const { data: deposit } = useDeposit(booking.id);
  const { data: fx } = useFxRates(currency);
  const { refund, holdDeposit, captureDeposit, releaseDeposit, isPending } = usePaymentActions();

  const [amount, setAmount] = useState('');
  const depositAmount = booking.pricing?.securityDeposit ?? 0;
  const isRefundable = ['confirmed', 'active', 'completed', 'cancelled'].includes(booking.status);

  /**
   * The refund endpoint has no "everything" mode — amount and currency are
   * both required — so an empty box means the booking's own total.
   */
  const refundAmount = amount || booking.pricing?.totalDueNow || 0;

  /**
   * Stripe holds deposits; Flutterwave charges them outright. The provider is
   * the server's decision, read from the same map the payment step uses.
   */
  const provider = fx?.providerByCurrency?.[currency];
  const securesByCharge = provider === 'flutterwave';

  return (
    <div className="border-t border-line pt-4">
      <h3 className="mb-2 font-display text-[13px] font-semibold text-ink">Payment operations</h3>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min="0"
          placeholder={`Amount (${currency})`}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          containerClassName="w-40"
          aria-label={`Amount in ${currency}`}
        />

        <Button
          size="sm"
          variant="dangerSoft"
          disabled={!isRefundable || isPending || !refundAmount}
          onClick={() => refund({ bookingId: booking.id, amount: refundAmount, currency })}
        >
          Refund {formatCurrency(Number(refundAmount), currency)}
        </Button>

        {deposit ? (
          <>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => captureDeposit({ bookingId: booking.id, amount: amount || undefined })}
            >
              Capture deposit
            </Button>
            <Button size="sm" disabled={isPending} onClick={() => releaseDeposit({ bookingId: booking.id })}>
              Release deposit
            </Button>
          </>
        ) : (
          depositAmount > 0 && (
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => holdDeposit({ bookingId: booking.id, amount: depositAmount, currency, provider })}
            >
              {securesByCharge ? 'Charge' : 'Hold'} {formatCurrency(depositAmount, currency)} deposit
            </Button>
          )
        )}
      </div>

      <p className="mt-2 text-[11px] text-ink-muted">
        {deposit
          ? `Deposit ${deposit.status ?? 'on file'}${deposit.amount ? ` · ${formatCurrency(Number(deposit.amount), deposit.currency ?? currency)}` : ''}.`
          : 'No deposit is currently held against this booking.'}{' '}
        Leave the amount blank to act on the booking total.
      </p>
    </div>
  );
};

/**
 * Everything the API knows about one reservation: the stay, the priced line
 * items, the settled payments and the full status history.
 */
const BookingDetail = ({ row, onClose, actions, canManage }) => {
  const { data: booking, isLoading, isError, error } = useBooking(row.id);
  const { data: timeline } = useBookingTimeline(row.id);
  const { data: receipt } = useBookingReceipt(row.id);

  const [isCancelling, setIsCancelling] = useState(false);
  const [reason, setReason] = useState('');

  const currency = booking?.currency ?? row.currency;
  const canAct = canManage && ACTIONABLE_STATUSES.includes(booking?.status ?? row.status);

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title={`Booking ${row.id.slice(0, 8)}`}
      description={`${row.propertyName} · ${row.country}`}
      footer={
        canAct && (
          <div className="flex flex-wrap justify-end gap-2">
            {['pending_approval', 'pending_kyc'].includes(booking?.status) && (
              <Button
                size="sm"
                variant="primary"
                isLoading={actions.isPending}
                onClick={() => actions.approve(row.id)}
              >
                Approve booking
              </Button>
            )}

            {isCancelling ? (
              <Button
                size="sm"
                variant="danger"
                isLoading={actions.isPending}
                onClick={() => actions.cancel(row.id, reason)}
              >
                Confirm cancellation
              </Button>
            ) : (
              <Button size="sm" variant="dangerSoft" onClick={() => setIsCancelling(true)}>
                Cancel booking
              </Button>
            )}
          </div>
        )
      }
    >
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {isError && (
        <EmptyState
          icon={<Receipt className="size-5 text-brand-600" aria-hidden="true" />}
          title="Could not load this booking"
          description={getErrorMessage(error)}
        />
      )}

      {booking && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AvatarCell name={row.guestName} secondary={row.guestEmail} />
            <StatusPill status={booking.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
            <Field icon={CalendarDays} label="Check-in">
              {formatDate(booking.checkIn)}
            </Field>
            <Field icon={CalendarDays} label="Check-out">
              {formatDate(booking.checkOut)}
            </Field>
            <Field label="Nights">{booking.nights}</Field>
            <Field icon={Users} label="Party">
              {booking.adults} adults
              {booking.children > 0 && `, ${booking.children} children`}
              {booking.infants > 0 && `, ${booking.infants} infants`}
            </Field>
            <Field icon={MapPin} label="Property">
              {row.propertyName}
            </Field>
            <Field icon={Mail} label="Guest">
              {row.guestEmail}
            </Field>
            <Field label="Created">{formatDate(booking.createdAt)}</Field>
            <Field label="Reference">
              <span className="font-mono text-[11px]">{booking.id}</span>
            </Field>
          </div>

          {/* Priced line items, exactly as the API computed them. */}
          {booking.lineItems.length > 0 && (
            <div className="border-t border-line pt-4">
              <h3 className="mb-2 font-display text-[13px] font-semibold text-ink">Price breakdown</h3>
              <div className="space-y-1.5">
                {booking.lineItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 text-[12.5px]">
                    <span className="text-ink-muted">
                      {item.label}
                      {item.quantity > 1 && <span className="ml-1 text-ink-muted">× {item.quantity}</span>}
                    </span>
                    <span className="tabular-nums text-ink">{formatCurrency(item.total, item.currency)}</span>
                  </div>
                ))}
                {booking.pricing && (
                  <div className="flex items-center justify-between gap-4 border-t border-line pt-2 text-[13px] font-semibold">
                    <span className="text-ink">Total</span>
                    <span className="tabular-nums text-brand-700">
                      {formatCurrency(booking.pricing.totalDueNow, currency)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settled payments */}
          {receipt?.payments?.length > 0 && (
            <div className="border-t border-line pt-4">
              <h3 className="mb-2 font-display text-[13px] font-semibold text-ink">Payments</h3>
              <div className="space-y-1.5">
                {receipt.payments.map((payment, index) => (
                  // The receipt does not guarantee an id on every payment row,
                  // so fall back to its position rather than rendering keyless.
                  <div key={payment.id ?? `payment-${index}`} className="flex items-center justify-between gap-4 text-[12.5px]">
                    <span className="text-ink-muted">
                      {payment.provider} · {payment.status}
                    </span>
                    <span className="tabular-nums text-ink">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status history */}
          {(timeline?.length > 0 || booking.statusHistory.length > 0) && (
            <div className="border-t border-line pt-4">
              <h3 className="mb-2 font-display text-[13px] font-semibold text-ink">History</h3>
              <ol className="space-y-2.5">
                {(timeline?.length ? timeline : booking.statusHistory).map((event, index) => (
                  <li key={`${event.to}-${event.at}-${index}`} className="flex items-start gap-2.5">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[12.5px] text-ink">
                        {BOOKING_STATUS_LABELS[event.to] ?? event.to}
                        {event.from && (
                          <span className="text-ink-muted"> (from {BOOKING_STATUS_LABELS[event.from] ?? event.from})</span>
                        )}
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        {formatDate(event.at)}
                        {event.triggeredBy ? ` · ${event.triggeredBy}` : ' · system'}
                        {event.reason ? ` · ${event.reason}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {canManage && <PaymentOperations booking={booking} currency={currency} />}

          {isCancelling && (
            <div className="border-t border-line pt-4">
              <Textarea
                label="Reason for cancellation"
                rows={2}
                placeholder="Recorded against the booking's history."
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export const BookingsPage = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const debouncedQuery = useDebouncedValue(query, 350);

  const { data, isLoading, isFetching, isError, error } = useBookings({
    query: debouncedQuery,
    status,
    page,
  });

  const actions = useBookingActions();
  const { can } = useAuth();
  const canManage = can(CAPABILITIES.bookingsManage);

  /** Any filter change restarts pagination — page 3 of the old result set is meaningless. */
  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const rows = data?.items ?? [];

  const columns = [
    {
      key: 'guest',
      header: 'Guest',
      render: (row) => <AvatarCell name={row.guestName} secondary={row.guestEmail} />,
    },
    {
      key: 'property',
      header: 'Property',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-ink">{row.propertyName}</p>
          <p className="truncate text-[11px] text-ink-muted">{row.country}</p>
        </div>
      ),
    },
    {
      key: 'stay',
      header: 'Stay',
      render: (row) => (
        <div className="whitespace-nowrap">
          <p className="text-[12.5px] text-ink">
            {formatDate(row.checkIn)} → {formatDate(row.checkOut)}
          </p>
          <p className="text-[11px] text-ink-muted">
            {row.nights} {row.nights === 1 ? 'night' : 'nights'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-[12.5px] font-semibold text-ink">
          {formatCurrency(row.total, row.currency)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bookings"
        subtitle="Every reservation across all markets, straight from the booking service."
      />

      <Card>
        <ListToolbar
          search={query}
          onSearchChange={withReset(setQuery)}
          searchPlaceholder="Search guest, email or property…"
          total={data?.total ?? 0}
          noun="booking"
          nounPlural="bookings"
          filters={[
            {
              id: 'status',
              value: status,
              onChange: withReset(setStatus),
              label: 'Status',
              options: [
                { value: 'All', label: 'All statuses' },
                ...BOOKING_STATUSES.map((value) => ({ value, label: BOOKING_STATUS_LABELS[value] })),
              ],
            },
          ]}
        />

        {isError ? (
          <EmptyState
            icon={<Receipt className="size-5 text-brand-600" aria-hidden="true" />}
            title="Could not load bookings"
            description={getErrorMessage(error)}
          />
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
            <DataTable
              columns={columns}
              rows={rows}
              isLoading={isLoading}
              onRowClick={setSelected}
              emptyTitle="No bookings match these filters"
              emptyDescription="Try a different status, or clear the search."
            />
          </div>
        )}

        <Pagination
          page={data?.page ?? page}
          totalPages={data?.totalPages ?? 1}
          onChange={setPage}
          className="border-t border-line py-3"
        />
      </Card>

      {selected && (
        <BookingDetail
          row={selected}
          onClose={() => setSelected(null)}
          actions={actions}
          canManage={canManage}
        />
      )}
    </div>
  );
};
