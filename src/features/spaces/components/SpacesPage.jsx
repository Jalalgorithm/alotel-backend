import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, Warehouse } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Pagination } from '@/components/shared/Pagination';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency } from '@/utils/format';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSpaces } from '../hooks/useSpaces';
import { BOOKING_MODES, locationLabel, slotUnitSuffix, SPACE_STATUSES, SPACE_TYPES, STATUS_BADGE_VARIANT } from '@/lib/spaceSchema';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';

/** Discovery/list screen for bookable venues — distinct from the Properties list, per the spec's §A.1. */
export const SpacesPage = () => {
  const { can } = useAuth();
  const canManage = can(CAPABILITIES.spacesManage);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [type, setType] = useState('All');
  const [bookingMode, setBookingMode] = useState('All');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching } = useSpaces({ query: debouncedSearch, status, page });

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const items = (data?.items ?? []).filter(
    (space) => (type === 'All' || space.type === type) && (bookingMode === 'All' || space.bookingMode === bookingMode),
  );
  const isInitialLoad = isFetching && !data;

  const columns = [
    {
      key: 'title',
      header: 'Space',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
            <Warehouse className="size-4 text-brand-600" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <Link
              to={paths.spaceDetail(row.id)}
              className="block truncate text-[12.5px] font-semibold text-ink transition-colors hover:text-brand-700"
            >
              {row.title}
            </Link>
            <p className="truncate text-[10.5px] text-ink-muted">{locationLabel(row)}</p>
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (row) => <span className="whitespace-nowrap text-ink-soft">{row.type}</span> },
    {
      key: 'capacity',
      header: 'Capacity',
      render: (row) => (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11.5px] text-ink-soft">
          <Users className="size-3" aria-hidden="true" />
          {row.maxCapacity || '—'}
        </span>
      ),
    },
    {
      key: 'baseRate',
      header: 'Rate',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap">
          <span className="font-semibold tabular-nums text-ink">{formatCurrency(row.baseRate, row.currency)}</span>
          <span className="ml-1 text-[10.5px] text-ink-muted">{slotUnitSuffix(row)}</span>
        </span>
      ),
    },
    {
      key: 'bookingMode',
      header: 'Booking mode',
      render: (row) => <Badge variant={row.bookingMode === 'instant' ? 'ok' : 'info'}>{row.bookingMode === 'instant' ? 'Instant' : 'Request'}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={STATUS_BADGE_VARIANT[row.status] ?? 'neutral'} dot>
          {SPACE_STATUSES.find((entry) => entry.value === row.status)?.label ?? row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Spaces"
        subtitle="Bookable venues — meeting rooms, event halls and studios, separate from Property stays."
        actions={
          canManage && (
            <Button variant="primary" to={paths.spaceNew} leftIcon={<Plus className="size-3.5" aria-hidden="true" />}>
              Add Space
            </Button>
          )
        }
      />

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={withReset(setSearch)}
            searchPlaceholder="Search by name…"
            total={items.length}
            noun="space"
            filters={[
              {
                id: 'status',
                value: status,
                onChange: withReset(setStatus),
                label: 'Status',
                options: [{ value: 'All', label: 'All statuses' }, ...SPACE_STATUSES],
              },
              {
                id: 'type',
                value: type,
                onChange: withReset(setType),
                label: 'Type',
                options: [{ value: 'All', label: 'All types' }, ...SPACE_TYPES],
              },
              {
                id: 'bookingMode',
                value: bookingMode,
                onChange: withReset(setBookingMode),
                label: 'Booking mode',
                options: [{ value: 'All', label: 'All booking modes' }, ...BOOKING_MODES],
              },
            ]}
          />
        </div>

        <div className="border-t border-line">
          <DataTable
            columns={columns}
            rows={items}
            isLoading={isInitialLoad}
            onRowClick={(row) => navigate(paths.spaceDetail(row.id))}
            emptyTitle="No spaces match these filters"
            emptyDescription="Try clearing a filter, or add a new space."
          />
        </div>
      </Card>

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
};
