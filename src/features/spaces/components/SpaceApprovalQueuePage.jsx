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

/**
 * `approval_due_at` is real and server-set — but expiry itself only happens
 * lazily (checked on the next read of this booking, or via the backend's
 * `expire_space_bookings` management command) or on the next fetch of this
 * list, not client-side in real time, so this is a countdown display, not a
 * live timer that flips the row itself.
 */
const expiresLabel = (booking) => {
  if (!booking.approvalDueAt) return 'No deadline set';
  const remaining = new Date(booking.approvalDueAt).getTime() - Date.now();
  if (remaining <= 0) return 'Overdue — will expire on next refresh';
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
    { key: 'createdAt', header: 'Requested', render: (row) => <span className="text-[11px] text-ink-muted">{formatRelative(row.createdAt)}</span> },
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
