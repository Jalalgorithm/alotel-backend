import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate, formatRelative } from '@/utils/format';
import { useApprovalQueue, useBookingDecisions } from '../hooks/useSpaceBookings';
import { SpaceBookingDetailModal } from './SpaceBookingDetailModal';

/** Auto-expiry is a background-job concept on the (future) real backend — the mock surfaces the deadline for now, without ticking it down live. */
const expiresLabel = (booking) => {
  const requested = new Date(booking.requestedAt).getTime();
  const deadline = requested + 24 * 60 * 60 * 1000;
  const remaining = deadline - Date.now();
  if (remaining <= 0) return 'Expiring imminently';
  const hours = Math.round(remaining / (60 * 60 * 1000));
  return `~${hours}h left to respond`;
};

/** Request-mode bookings awaiting a host decision — approve/decline, mirroring spec §A.5's Pending Approval tab. */
export const SpaceApprovalQueuePage = () => {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const { data, isFetching } = useApprovalQueue({ page });
  const { approveBooking, isApproving, pendingId } = useBookingDecisions();

  const columns = [
    { key: 'guestName', header: 'Guest', render: (row) => <span className="font-semibold text-ink">{row.guestName}</span> },
    { key: 'spaceName', header: 'Space' },
    { key: 'window', header: 'When', render: (row) => <span className="whitespace-nowrap text-[12px] text-ink-soft">{formatDate(row.startDatetime, 'd MMM yyyy, HH:mm')}</span> },
    { key: 'guestCount', header: 'Guests', align: 'right' },
    { key: 'totalPrice', header: 'Total', align: 'right', render: (row) => <span className="font-semibold tabular-nums">{formatCurrency(row.totalPrice, row.currency)}</span> },
    { key: 'requestedAt', header: 'Requested', render: (row) => <span className="text-[11px] text-ink-muted">{formatRelative(row.requestedAt)}</span> },
    { key: 'expires', header: 'Deadline', render: (row) => <Badge variant="warn">{expiresLabel(row)}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button size="xs" variant="dangerSoft" onClick={() => setSelected(row)}>Decline</Button>
          <Button size="xs" variant="primary" isLoading={isApproving && pendingId === row.id} onClick={() => approveBooking(row.id)}>Approve</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Booking Approvals" subtitle="Request-mode bookings waiting on a host decision." />

      <Card>
        <div className="border-t border-line">
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isFetching && !data}
            onRowClick={setSelected}
            emptyTitle="Nothing pending"
            emptyDescription="Every request-mode booking has been decided."
          />
        </div>
      </Card>

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />

      <SpaceBookingDetailModal isOpen={Boolean(selected)} onClose={() => setSelected(null)} booking={selected} canManage />
    </div>
  );
};
