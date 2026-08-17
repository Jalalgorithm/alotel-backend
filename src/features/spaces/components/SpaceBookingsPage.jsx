import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Pagination } from '@/components/shared/Pagination';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/utils/format';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSpaceBookings } from '../hooks/useSpaceBookings';
import { useSpaces } from '../hooks/useSpaces';
import { BOOKING_STATUS_BADGE_VARIANT, SPACE_BOOKING_STATUSES } from '@/lib/spaceSchema';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';
import { SpaceBookingDetailModal } from './SpaceBookingDetailModal';

/** Cross-space bookings table — `SpaceDetail/BookingsTab.jsx` is the per-listing equivalent. */
export const SpaceBookingsPage = () => {
  const { can } = useAuth();
  const canManage = can(CAPABILITIES.spacesBookingsManage);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [spaceId, setSpaceId] = useState('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const debouncedSearch = useDebouncedValue(search);
  const { data: spacesData } = useSpaces({ pageSize: 100 });
  const { data, isFetching } = useSpaceBookings({
    query: debouncedSearch,
    status: status === 'All' ? undefined : status,
    spaceId: spaceId === 'All' ? undefined : spaceId,
    page,
  });

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const columns = [
    { key: 'guestName', header: 'Guest', render: (row) => <span className="font-semibold text-ink">{row.guestName}</span> },
    { key: 'spaceName', header: 'Space' },
    { key: 'layoutName', header: 'Layout' },
    { key: 'window', header: 'When', render: (row) => <span className="whitespace-nowrap text-[12px] text-ink-soft">{formatDate(row.startDatetime, 'd MMM yyyy, HH:mm')}</span> },
    { key: 'totalPrice', header: 'Total', align: 'right', render: (row) => <span className="font-semibold tabular-nums">{formatCurrency(row.totalPrice, row.currency)}</span> },
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
    <div className="space-y-5">
      <PageHeader
        title="Space Bookings"
        subtitle="Every booking across every space."
        actions={
          <Button to={paths.spaceCalendar} leftIcon={<CalendarDays className="size-3.5" aria-hidden="true" />}>
            Calendar view
          </Button>
        }
      />

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={withReset(setSearch)}
            searchPlaceholder="Search by guest or space…"
            total={data?.total}
            noun="booking"
            filters={[
              { id: 'status', value: status, onChange: withReset(setStatus), label: 'Status', options: [{ value: 'All', label: 'All statuses' }, ...SPACE_BOOKING_STATUSES] },
              {
                id: 'spaceId',
                value: spaceId,
                onChange: withReset(setSpaceId),
                label: 'Space',
                options: [
                  { value: 'All', label: 'All spaces' },
                  ...(spacesData?.items ?? []).map((space) => ({ value: space.id, label: space.title })),
                ],
              },
            ]}
          />
        </div>
        <div className="border-t border-line">
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isFetching && !data}
            onRowClick={setSelected}
            emptyTitle="No bookings match these filters"
            emptyDescription="Try clearing a filter."
          />
        </div>
      </Card>

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />

      <SpaceBookingDetailModal isOpen={Boolean(selected)} onClose={() => setSelected(null)} booking={selected} canManage={canManage} />
    </div>
  );
};
