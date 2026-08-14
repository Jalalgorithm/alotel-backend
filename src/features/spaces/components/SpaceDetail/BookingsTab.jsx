import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/utils/format';
import { BOOKING_STATUS_BADGE_VARIANT, SPACE_BOOKING_STATUSES } from '@/lib/spaceSchema';
import { useSpaceBookings } from '../../hooks/useSpaceBookings';
import { SpaceBookingDetailModal } from '../SpaceBookingDetailModal';

/** This space's bookings — the per-listing view; `SpaceBookingsPage` is the cross-space equivalent. */
export const BookingsTab = ({ spaceId, canManage }) => {
  const { data, isLoading } = useSpaceBookings({ spaceId });
  const [selected, setSelected] = useState(null);

  const columns = [
    { key: 'guestName', header: 'Guest', render: (row) => <span className="font-semibold text-ink">{row.guestName}</span> },
    { key: 'layoutName', header: 'Layout' },
    {
      key: 'window',
      header: 'When',
      render: (row) => (
        <span className="whitespace-nowrap text-[12px] text-ink-soft">
          {formatDate(row.startDatetime, 'd MMM yyyy, HH:mm')}
        </span>
      ),
    },
    { key: 'guestCount', header: 'Guests', align: 'right' },
    {
      key: 'totalPrice',
      header: 'Total',
      align: 'right',
      render: (row) => <span className="font-semibold tabular-nums">{formatCurrency(row.totalPrice, row.currency)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={BOOKING_STATUS_BADGE_VARIANT[row.status]} dot>
          {SPACE_BOOKING_STATUSES.find((s) => s.value === row.status)?.label ?? row.status}
        </Badge>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader title="Bookings" subtitle="Every booking made for this space." />
      <div className="border-t border-line">
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          isLoading={isLoading}
          onRowClick={setSelected}
          emptyTitle="No bookings yet"
          emptyDescription="Bookings will show up here once guests start booking this space."
        />
      </div>

      <SpaceBookingDetailModal isOpen={Boolean(selected)} onClose={() => setSelected(null)} booking={selected} canManage={canManage} />
    </Card>
  );
};
