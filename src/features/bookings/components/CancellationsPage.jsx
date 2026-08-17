import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { AvatarCell } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePaymentActions } from '@/features/finance';
import { useCancellationReasons, useCancellations } from '../hooks/useBookings';
import { formatCurrency, formatRelative } from '@/utils/format';

/** Reason is required before a refund can fire — recorded against the `Refund` row server-side. */
const RefundReasonModal = ({ row, isPending, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');

  if (!row) return null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title="Refund this booking?"
      description={`${row.guestName || row.guestEmail} · ${formatCurrency(row.total, row.currency)}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button size="sm" variant="danger" isLoading={isPending} disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
            Confirm refund
          </Button>
        </div>
      }
    >
      <Textarea
        label="Reason for refund"
        rows={3}
        placeholder="e.g. Guest cancelled due to a family emergency."
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
    </Modal>
  );
};

/**
 * Cancelled bookings. There's no dedicated backend list for this — it's
 * `GET /bookings/admin/list/?status=cancelled`, the same endpoint the main
 * Bookings screen uses, with each row's reason resolved from its timeline.
 * Refund uses the exact same real action `BookingsPage.jsx`'s refund button
 * calls — there's no separate cancellations-refund endpoint.
 */
export const CancellationsPage = () => {
  const [search, setSearch] = useState('');
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundedIds, setRefundedIds] = useState(() => new Set());

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching } = useCancellations({ query: debouncedSearch, pageSize: 50 });
  const { refund, isPending } = usePaymentActions();

  const rows = data?.items ?? [];
  const reasonQueries = useCancellationReasons(rows.map((row) => row.id));
  const reasonById = Object.fromEntries(rows.map((row, index) => [row.id, reasonQueries[index]?.data]));

  const columns = [
    {
      key: 'id',
      header: 'Booking',
      render: (row) => <span className="font-mono text-[11.5px] font-bold text-brand-700">#{row.id}</span>,
    },
    {
      key: 'guest',
      header: 'Guest',
      render: (row) => (
        <AvatarCell name={row.guestName || row.guestEmail} primary={row.guestName || row.guestEmail} secondary={row.propertyName} size="sm" />
      ),
    },
    {
      key: 'cancelledAt',
      header: 'Cancelled',
      render: (row) => {
        const event = reasonById[row.id];
        return <span className="whitespace-nowrap text-ink-soft">{event ? formatRelative(event.at) : '—'}</span>;
      },
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => {
        const event = reasonById[row.id];
        return <span className="text-ink-soft">{event?.reason || '—'}</span>;
      },
    },
    {
      key: 'amount',
      header: 'Booking total',
      align: 'right',
      render: (row) => <span className="whitespace-nowrap tabular-nums text-ink">{formatCurrency(row.total, row.currency)}</span>,
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.statusLabel} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        refundedIds.has(row.id) ? (
          <StatusBadge status="Refunded" />
        ) : (
          <Button size="xs" variant="primary" onClick={() => setRefundTarget(row)}>
            Refund
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cancellations"
        subtitle="Cancelled bookings and their refund status."
        actions={
          <span className="rounded-full bg-warn-soft px-3 py-1.5 text-[11.5px] font-semibold text-warn">
            {data?.total ?? rows.length} cancelled this period
          </span>
        }
      />

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by guest or property…"
            total={data?.total}
            noun="cancellation"
          />
        </div>

        <div className="border-t border-line">
          <DataTable
            columns={columns}
            rows={rows}
            isLoading={isFetching && !data}
            emptyTitle="No cancellations"
            emptyDescription="Nothing has been cancelled in this period."
          />
        </div>
      </Card>

      <RefundReasonModal
        row={refundTarget}
        isPending={isPending}
        onClose={() => setRefundTarget(null)}
        onConfirm={(reason) => {
          refund(
            { bookingId: refundTarget.id, amount: refundTarget.total, currency: refundTarget.currency, reason },
            {
              onSuccess: () => setRefundedIds((prev) => new Set(prev).add(refundTarget.id)),
              onSettled: () => setRefundTarget(null),
            },
          );
        }}
      />
    </div>
  );
};
