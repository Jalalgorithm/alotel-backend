import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { formatCurrency, formatDate } from '@/utils/format';
import { usePaymentActions } from '../hooks/useFinance';

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
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const { refund, isPending } = usePaymentActions();

  if (!payment) return null;

  const isRefundEligible = payment.status === 'succeeded' && payment.transactionType === 'payment';

  const submitRefund = () => {
    refund(
      { bookingId: payment.bookingId, amount: payment.amount, currency: payment.currency, reason: reason.trim() },
      { onSuccess: () => onClose() },
    );
  };

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

      {isRefundEligible ? (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          {!confirming ? (
            <Button variant="dangerSoft" fullWidth onClick={() => setConfirming(true)}>
              Refund {formatCurrency(payment.amount, payment.currency)}
            </Button>
          ) : (
            <>
              <Alert variant="warn" icon={<ShieldAlert className="size-4" aria-hidden="true" />}>
                This refunds the full amount back to the guest via {payment.provider}. This cannot be undone.
              </Alert>
              <Textarea label="Reason for refund" value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => setConfirming(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button variant="danger" className="flex-1" isLoading={isPending} disabled={!reason.trim()} onClick={submitRefund}>
                  Confirm refund
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        payment.transactionType === 'payment' && (
          <p className="mt-4 border-t border-line pt-4 text-[11.5px] text-ink-muted">
            Only a succeeded payment can be refunded — this transaction is {payment.status}.
          </p>
        )
      )}
    </Modal>
  );
};
