import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Pagination } from '@/components/shared/Pagination';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { AvatarCell } from '@/components/ui/Avatar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useGuests } from '../hooks/useBookings';
import { formatCurrency, formatDate } from '@/utils/format';
import { COUNTRIES } from '@/lib/mock/catalogue';

const SEGMENT_VARIANT = { Returning: 'ok', Corporate: 'info', 'Long-stay': 'brand', New: 'neutral' };

/** Guest directory. */
export const GuestsPage = () => {
  const [search, setSearch] = useState('');
  const [kyc, setKyc] = useState('All');
  const [country, setCountry] = useState('All');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching } = useGuests({ query: debouncedSearch, kyc, country, page, pageSize: 10 });

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const columns = [
    {
      key: 'name',
      header: 'Guest',
      render: (row) => (
        <AvatarCell
          name={row.name}
          initials={row.initials}
          color={row.color}
          primary={row.name}
          secondary={row.email}
          size="sm"
        />
      ),
    },
    { key: 'phone', header: 'Phone', render: (row) => <span className="whitespace-nowrap text-ink-soft">{row.phone}</span> },
    { key: 'country', header: 'Country', render: (row) => <span className="text-ink-soft">{row.country}</span> },
    { key: 'kyc', header: 'KYC', render: (row) => <StatusBadge status={row.kyc} /> },
    {
      key: 'segment',
      header: 'Segment',
      render: (row) => <Badge variant={SEGMENT_VARIANT[row.segment] ?? 'neutral'}>{row.segment}</Badge>,
    },
    { key: 'stays', header: 'Stays', align: 'right', render: (row) => <span className="tabular-nums">{row.stays}</span> },
    { key: 'nights', header: 'Nights', align: 'right', render: (row) => <span className="tabular-nums">{row.nights}</span> },
    {
      key: 'lifetimeValue',
      header: 'Lifetime value',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap font-semibold tabular-nums">
          {formatCurrency(row.lifetimeValue, row.currency, { compact: row.lifetimeValue > 99999 })}
        </span>
      ),
    },
    {
      key: 'joinedAt',
      header: 'Joined',
      render: (row) => <span className="whitespace-nowrap text-ink-muted">{formatDate(row.joinedAt, 'MMM yyyy')}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Guests" subtitle="Everyone who has stayed or is booked to stay, with verification state." />

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={withReset(setSearch)}
            searchPlaceholder="Search by name, email or phone…"
            total={data?.total}
            noun="guest"
            filters={[
              { id: 'kyc', value: kyc, onChange: withReset(setKyc), options: ['All', 'Verified', 'Pending', 'Full KYC'], label: 'KYC' },
              { id: 'country', value: country, onChange: withReset(setCountry), options: ['All', ...COUNTRIES], label: 'Country' },
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
