import { useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Logo } from '@/components/shared/Logo';
import { useBooking, useBookingReceipt, useGuestDetail } from '../hooks/useBookings';
import { useProperty } from '@/features/properties';
import { useSettings } from '@/features/system';
import { formatCurrency, formatDate } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import { BOOKING_STATUS_LABELS } from '@/lib/bookingSchema';
import { paths } from '@/routes/paths';

const DEFAULT_COMPANY_NAME = 'Alotel Spaces';
const DEFAULT_SUPPORT_EMAIL = 'support@alotelspaces.com';

/** Booking status → the payment-state pill shown in the header (distinct from the booking status row below it). */
const paymentState = (totalDueNow, payments) => {
  const totalPaid = payments
    .filter((payment) => payment.status === 'succeeded')
    .reduce((sum, payment) => sum + (payment.amount ?? 0), 0);

  if (totalDueNow > 0 && totalPaid >= totalDueNow) return { label: 'Paid', variant: 'ok' };
  if (totalPaid > 0) return { label: 'Partially paid', variant: 'warn' };
  return { label: 'Unpaid', variant: 'danger' };
};

const Column = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">{label}</p>
    <div className="mt-1 text-[13px] leading-5 text-ink">{children}</div>
  </div>
);

/**
 * A printable booking receipt/invoice, styled after the guest-site PDF.
 *
 * Assembled entirely from data that already exists — the booking detail,
 * the property (for the "Residence" block), the guest (for "Billed To"),
 * and the receipt endpoint (totals/line items already parsed via
 * `booking.pricing`/`booking.lineItems`, plus settled payments) — no backend
 * change was needed to build this.
 */
export const BookingInvoicePage = () => {
  const { bookingId } = useParams();

  const { data: booking, isLoading: isBookingLoading, isError, error } = useBooking(bookingId);
  const { data: property, isLoading: isPropertyLoading } = useProperty(booking?.propertyId);
  const { data: guest, isLoading: isGuestLoading } = useGuestDetail(booking?.guestId);
  const { data: receipt, isLoading: isReceiptLoading } = useBookingReceipt(bookingId);
  const { data: settingsData } = useSettings();

  const isLoading = isBookingLoading || (Boolean(booking) && (isPropertyLoading || isGuestLoading || isReceiptLoading));

  const companyName = settingsData?.settings?.invoiceCompanyName || DEFAULT_COMPANY_NAME;
  const supportEmail = settingsData?.settings?.invoiceSupportEmail || DEFAULT_SUPPORT_EMAIL;
  const legalAddress = settingsData?.settings?.invoiceLegalAddress || '';

  return (
    <div className="mx-auto max-w-3xl space-y-4 print:max-w-none print:space-y-0">
      <div className="print:hidden">
        <PageHeader
          title="Booking invoice"
          subtitle={bookingId ? `Reference ${bookingId}` : undefined}
          actions={
            <>
              <Button to={paths.bookings} variant="secondary" leftIcon={<ArrowLeft className="size-3.5" aria-hidden="true" />}>
                Back to bookings
              </Button>
              <Button
                variant="primary"
                disabled={!booking}
                leftIcon={<Printer className="size-3.5" aria-hidden="true" />}
                onClick={() => window.print()}
              >
                Print / Save as PDF
              </Button>
            </>
          }
        />
      </div>

      {isLoading && (
        <Card className="p-6 print:hidden">
          <Skeleton className="h-40 w-full" />
        </Card>
      )}

      {isError && (
        <Card className="p-6 print:hidden">
          <EmptyState title="Could not load this booking" description={getErrorMessage(error)} />
        </Card>
      )}

      {booking && receipt && (
        <Card className="overflow-hidden print:border-0 print:shadow-none">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 bg-brand-700 px-6 py-6 text-white print:bg-brand-700 print:text-white">
            <Logo tone="light" />
            <div className="text-right">
              <p className="font-display text-[15px] font-bold uppercase tracking-[0.04em]">Booking receipt</p>
              <p className="mt-1 text-[11.5px] text-white/80">Issued {formatDate(receipt.generatedAt)}</p>
              <div className="mt-2 flex justify-end">
                {(() => {
                  const state = paymentState(booking.pricing?.totalDueNow ?? 0, receipt.payments ?? []);
                  return (
                    <Badge variant={state.variant} className="uppercase">
                      {state.label}
                    </Badge>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            {/* Billed to / Residence / Stay */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Column label="Billed to">
                <p className="font-medium">{guest?.name ?? '—'}</p>
                <p className="text-ink-muted">{guest?.email ?? '—'}</p>
              </Column>
              <Column label="Residence">
                <p className="font-medium">{property?.name ?? '—'}</p>
                <p className="text-ink-muted">
                  {[property?.city, property?.country].filter(Boolean).join(', ') || '—'}
                </p>
              </Column>
              <Column label="Stay">
                <p className="font-medium">
                  {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                </p>
                <p className="text-ink-muted">
                  {booking.nights} {booking.nights === 1 ? 'night' : 'nights'} · {booking.adults}{' '}
                  {booking.adults === 1 ? 'adult' : 'adults'}
                  {booking.children > 0 ? `, ${booking.children} children` : ''}
                </p>
              </Column>
            </div>

            {/* Reference / status / currency */}
            <div className="grid grid-cols-1 gap-5 border-t border-line pt-5 sm:grid-cols-3">
              <Column label="Booking reference">
                <span className="break-all font-mono text-[11.5px]">{booking.id}</span>
              </Column>
              <Column label="Status">{BOOKING_STATUS_LABELS[booking.status] ?? booking.status}</Column>
              <Column label="Currency">{booking.currency}</Column>
            </div>

            {/* Line items */}
            <div className="border-t border-line pt-5">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 pb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="space-y-1.5">
                {(booking.lineItems ?? []).map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-4 text-[12.5px]">
                    <span className="text-ink">{item.label}</span>
                    <span className="text-right tabular-nums text-ink-muted">{item.quantity}</span>
                    <span className="text-right tabular-nums text-ink">{formatCurrency(item.total, item.currency)}</span>
                  </div>
                ))}
              </div>

              {booking.pricing && (
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[14px] font-semibold">
                  <span className="text-ink">Total</span>
                  <span className="tabular-nums text-brand-700">
                    {formatCurrency(booking.pricing.totalDueNow, booking.currency)}
                  </span>
                </div>
              )}

              {booking.pricing?.securityDeposit > 0 && (
                <p className="mt-2 text-[11px] text-ink-muted">
                  Includes a refundable security deposit of{' '}
                  {formatCurrency(booking.pricing.securityDeposit, booking.currency)}, released after checkout.
                </p>
              )}
            </div>

            {/* Payments */}
            {receipt.payments?.length > 0 && (
              <div className="border-t border-line pt-5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">Payments</p>
                <div className="space-y-1.5">
                  {receipt.payments.map((payment, index) => (
                    <div
                      key={payment.id ?? `payment-${index}`}
                      className="flex items-center justify-between gap-4 text-[12.5px]"
                    >
                      <span className="text-ink-muted">
                        {payment.provider} · {payment.status}
                      </span>
                      <span className="tabular-nums text-ink">{formatCurrency(payment.amount, payment.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-line pt-5 text-[11px] text-ink-muted">
              <p className="font-semibold text-ink">
                {companyName} · {supportEmail}
              </p>
              {legalAddress && <p className="mt-0.5">{legalAddress}</p>}
              <p className="mt-2">
                This receipt reflects the booking record at the time of issue. Refunds and deposit releases follow the
                cancellation policy agreed at the time of booking.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
