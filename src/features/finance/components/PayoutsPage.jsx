import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { AvatarCell } from '@/components/ui/Avatar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePayouts, useReleasePayout } from '../hooks/useFinance';
import { formatCurrency, formatDate } from '@/utils/format';
import { PAYOUT_STATUSES } from '@/lib/mock/finance';

/** Owner payout schedule. */
export const PayoutsPage = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching } = usePayouts({ query: debouncedSearch, status, pageSize: 50 });
  const { releasePayout, pendingId } = useReleasePayout();

  const columns = [
    {
      key: 'owner',
      header: 'Owner',
      render: (row) => (
        <AvatarCell
          name={row.owner}
          initials={row.initials}
          color={row.color}
          primary={row.owner}
          secondary={`${row.properties} properties · ${row.bank}`}
          size="sm"
        />
      ),
    },
    { key: 'period', header: 'Period', render: (row) => <span className="whitespace-nowrap text-ink-soft">{row.period}</span> },
    {
      key: 'gross',
      header: 'Gross',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-ink-soft">
          {formatCurrency(row.gross, row.currency, { compact: row.gross > 99999 })}
        </span>
      ),
    },
    {
      key: 'commission',
      header: 'Commission',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-warn">
          −{formatCurrency(row.commission, row.currency, { compact: row.commission > 99999 })}
        </span>
      ),
    },
    {
      key: 'net',
      header: 'Net payout',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums text-ok">
          {formatCurrency(row.net, row.currency, { compact: row.net > 99999 })}
        </span>
      ),
    },
    {
      key: 'scheduledFor',
      header: 'Scheduled',
      render: (row) => <span className="whitespace-nowrap text-ink-muted">{formatDate(row.scheduledFor)}</span>,
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        row.status !== 'Paid' ? (
          <Button
            size="xs"
            variant="primary"
            isLoading={pendingId === row.id}
            onClick={() => releasePayout(row.id)}
          >
            Release now
          </Button>
        ) : null,
    },
  ];

  const rows = data?.items ?? [];
  const scheduled = rows.filter((row) => row.status !== 'Paid').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payouts"
        subtitle="Monthly settlements to property owners, in arrears."
        actions={
          <span className="rounded-full bg-info-soft px-3 py-1.5 text-[11.5px] font-semibold text-info">
            {scheduled} awaiting release
          </span>
        }
      />

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by owner or period…"
            total={data?.total}
            noun="payout"
            filters={[{ id: 'status', value: status, onChange: setStatus, options: PAYOUT_STATUSES, label: 'Status' }]}
          />
        </div>

        <div className="border-t border-line">
          <DataTable columns={columns} rows={rows} isLoading={isFetching && !data} emptyTitle="No payouts match these filters" />
        </div>
      </Card>
    </div>
  );
};
