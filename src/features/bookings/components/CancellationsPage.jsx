import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { AvatarCell } from '@/components/ui/Avatar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCancellations, useProcessRefund } from '../hooks/useBookings';
import { formatCurrency, formatDate } from '@/utils/format';

/** Cancelled bookings and their refund settlement. */
export const CancellationsPage = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching } = useCancellations({ query: debouncedSearch, status, pageSize: 50 });
  const { processRefund, pendingId } = useProcessRefund();

  const rows = data?.items ?? [];
  const retained = rows.reduce((sum, row) => sum + row.retained, 0);

  const columns = [
    {
      key: 'bookingId',
      header: 'Booking',
      render: (row) => <span className="font-mono text-[11.5px] font-bold text-brand-700">#{row.bookingId}</span>,
    },
    {
      key: 'guest',
      header: 'Guest',
      render: (row) => (
        <AvatarCell
          name={row.guest}
          initials={row.initials}
          color={row.color}
          primary={row.guest}
          secondary={row.property}
          size="sm"
        />
      ),
    },
    {
      key: 'cancelledAt',
      header: 'Cancelled',
      render: (row) => <span className="whitespace-nowrap text-ink-soft">{formatDate(row.cancelledAt)}</span>,
    },
    {
      key: 'noticeDays',
      header: 'Notice',
      align: 'right',
      render: (row) => <span className="tabular-nums text-ink-soft">{row.noticeDays}d</span>,
    },
    { key: 'reason', header: 'Reason', render: (row) => <span className="text-ink-soft">{row.reason}</span> },
    {
      key: 'policy',
      header: 'Policy applied',
      render: (row) => <span className="text-[11px] text-ink-muted">{row.policy}</span>,
    },
    {
      key: 'refundAmount',
      header: 'Refund',
      align: 'right',
      render: (row) => (
        <div className="whitespace-nowrap">
          <p className="font-semibold tabular-nums text-ink">{formatCurrency(row.refundAmount, row.currency)}</p>
          {row.retained > 0 && (
            <p className="text-[10.5px] tabular-nums text-warn">
              {formatCurrency(row.retained, row.currency)} retained
            </p>
          )}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        row.status !== 'Refunded' ? (
          <Button
            size="xs"
            variant="primary"
            isLoading={pendingId === row.id}
            onClick={() => processRefund(row.id)}
          >
            Process refund
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cancellations"
        subtitle="Cancelled bookings, the policy applied and the resulting refund."
        actions={
          <span className="rounded-full bg-warn-soft px-3 py-1.5 text-[11.5px] font-semibold text-warn">
            {formatCurrency(retained, 'NGN', { compact: true })} retained this period
          </span>
        }
      />

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by guest, booking or reason…"
            total={data?.total}
            noun="cancellation"
            filters={[
              {
                id: 'status',
                value: status,
                onChange: setStatus,
                options: ['All', 'Pending', 'Processing', 'Refunded'],
                label: 'Status',
              },
            ]}
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
    </div>
  );
};
