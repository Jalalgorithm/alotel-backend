import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Pagination } from '@/components/shared/Pagination';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { AvatarCell } from '@/components/ui/Avatar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useGuests, useUpdateGuest } from '../hooks/useBookings';
import { formatDate } from '@/utils/format';

/**
 * Guest directory — `GET /auth/admin/guests/` only exposes name, email,
 * active/inactive and joined date (confirmed via `GuestSerializer`). Phone,
 * country, KYC status, guest segment and stay stats aren't on this endpoint,
 * so this table doesn't show columns the API can't back.
 */
export const GuestsPage = () => {
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState('All');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching } = useGuests({ query: debouncedSearch, isActive, page, pageSize: 10 });
  const { updateGuest, isPending, pendingId } = useUpdateGuest();

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const columns = [
    {
      key: 'name',
      header: 'Guest',
      render: (row) => <AvatarCell name={row.name} primary={row.name} secondary={row.email} size="sm" />,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => <Badge variant={row.isActive ? 'ok' : 'neutral'}>{row.isActive ? 'Active' : 'Deactivated'}</Badge>,
    },
    {
      key: 'joinedAt',
      header: 'Joined',
      render: (row) => <span className="whitespace-nowrap text-ink-muted">{formatDate(row.joinedAt, 'MMM yyyy')}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button
          size="xs"
          variant={row.isActive ? 'dangerSoft' : 'subtle'}
          isLoading={isPending && pendingId === row.id}
          onClick={() => updateGuest(row.id, { isActive: !row.isActive })}
        >
          {row.isActive ? 'Deactivate' : 'Reactivate'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Guests" subtitle="Every registered guest account." />

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={withReset(setSearch)}
            searchPlaceholder="Search by name or email…"
            total={data?.total}
            noun="guest"
            filters={[
              { id: 'isActive', value: isActive, onChange: withReset(setIsActive), options: ['All', 'Active', 'Inactive'], label: 'Status' },
            ]}
          />
        </div>

        <div className="border-t border-line">
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isFetching && !data}
            emptyTitle="No guests match these filters"
          />
        </div>
      </Card>

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
};
