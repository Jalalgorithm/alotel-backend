import { Fragment } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Logo, LogoMark } from '@/components/shared/Logo';
import { useBookingInvoice } from '../hooks/useBookings';
import { formatCurrency, formatDate } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import { paths } from '@/routes/paths';

/** Payment-state pill shown in the header (distinct from the booking status row below it). */
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
 * Sourced from the backend's dedicated invoice endpoint (`GET /bookings/{id}/invoice/`),
 * which already denormalizes the guest, the property (including its full
 * address) and the settings-backed footer — one request, no client-side
 * assembly needed.
 */
export const BookingInvoicePage = () => {
  const { bookingId } = useParams();
  const { data: invoice, isLoading, isError, error } = useBookingInvoice(bookingId);

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
                disabled={!invoice}
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

      {invoice && (
        <Card className="overflow-hidden print:border-0 print:shadow-none">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 bg-brand-700 px-6 py-6 text-white print:bg-brand-700 print:text-white">
            <Logo tone="light" />
            <div className="text-right">
              <p className="font-display text-[15px] font-bold uppercase tracking-[0.04em]">Booking receipt</p>
              <p className="mt-1 text-[11.5px] text-white/80">Issued {formatDate(invoice.issuedAt)}</p>
              <div className="mt-2 flex justify-end">
                {(() => {
                  const state = paymentState(invoice.pricing?.totalDueNow ?? 0, invoice.payments ?? []);
                  return (
                    <Badge variant={state.variant} className="uppercase">
                      {state.label}
                    </Badge>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Body, with a faint watermark of the brand mark behind the content */}
          <div className="relative overflow-hidden px-6 py-6">
            <div
              className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center gap-1 opacity-[0.05]"
              aria-hidden="true"
            >
              <LogoMark className="size-56 text-logo" />
              <span className="font-serif text-[38px] font-bold leading-none text-logo-deep">Alotel</span>
              <span className="text-[12px] font-medium uppercase leading-none tracking-[0.35em] text-logo">Spaces</span>
            </div>

            <div className="relative z-10 space-y-6">
              {/* Billed to / Residence / Stay */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Column label="Billed to">
                  <p className="font-medium">{invoice.billedTo.name ?? '—'}</p>
                  <p className="text-ink-muted">{invoice.billedTo.email ?? '—'}</p>
                </Column>
                <Column label="Residence">
                  <p className="font-medium">{invoice.residence.name ?? '—'}</p>
                  <p className="text-ink-muted">
                    {[invoice.residence.city, invoice.residence.country].filter(Boolean).join(', ') || '—'}
                  </p>
                  {invoice.residence.address && <p className="text-ink-muted">{invoice.residence.address}</p>}
                </Column>
                <Column label="Stay">
                  <p className="font-medium">
                    {formatDate(invoice.checkIn)} → {formatDate(invoice.checkOut)}
                  </p>
                  <p className="text-ink-muted">
                    {invoice.nights} {invoice.nights === 1 ? 'night' : 'nights'} · {invoice.adults}{' '}
                    {invoice.adults === 1 ? 'adult' : 'adults'}
                    {invoice.children > 0 ? `, ${invoice.children} children` : ''}
                  </p>
                </Column>
              </div>

              {/* Reference / status / currency */}
              <div className="grid grid-cols-1 gap-5 border-t border-line pt-5 sm:grid-cols-3">
                <Column label="Booking reference">
                  <span className="break-all font-mono text-[11.5px]">{invoice.bookingId}</span>
                </Column>
                <Column label="Status">{invoice.statusLabel}</Column>
                <Column label="Currency">{invoice.currency}</Column>
              </div>

              {/* Line items — one shared grid across the header, every item and the
                  Total row, so the Qty/Amount columns line up regardless of how many
                  digits any single amount has (a separate grid per row would let each
                  row size its own columns independently, which is what caused amounts
                  of different sizes to land at different horizontal positions). */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 border-t border-line pt-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">Description</span>
                <span className="text-right text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">Qty</span>
                <span className="text-right text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">Amount</span>

                {invoice.lineItems.map((item) => (
                  <Fragment key={item.id}>
                    <span className="text-[12.5px] text-ink">{item.label}</span>
                    <span className="text-right text-[12.5px] tabular-nums text-ink-muted">{item.quantity}</span>
                    <span className="text-right text-[12.5px] tabular-nums text-ink">{formatCurrency(item.total, item.currency)}</span>
                  </Fragment>
                ))}

                {invoice.pricing && (
                  <>
                    <span className="col-span-2 border-t border-line pt-3 text-[14px] font-semibold text-ink">Total</span>
                    <span className="border-t border-line pt-3 text-right text-[14px] font-semibold tabular-nums text-brand-700">
                      {formatCurrency(invoice.pricing.totalDueNow, invoice.currency)}
                    </span>
                  </>
                )}

                {invoice.pricing?.securityDeposit > 0 && (
                  <p className="col-span-3 text-[11px] text-ink-muted">
                    Includes a refundable security deposit of{' '}
                    {formatCurrency(invoice.pricing.securityDeposit, invoice.currency)}, released after checkout.
                  </p>
                )}
              </div>

              {/* Payments */}
              {invoice.payments.length > 0 && (
                <div className="border-t border-line pt-5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">Payments</p>
                  <div className="space-y-1.5">
                    {invoice.payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between gap-4 text-[12.5px]">
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
                  {invoice.footer.companyName} · {invoice.footer.supportEmail}
                </p>
                {invoice.footer.legalAddress && <p className="mt-0.5">{invoice.footer.legalAddress}</p>}
                <p className="mt-2">
                  This receipt reflects the booking record at the time of issue. Refunds and deposit releases follow
                  the cancellation policy agreed at the time of booking.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
