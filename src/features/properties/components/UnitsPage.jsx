import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useUnitStatus, useUnits } from '../hooks/useCatalogue';
import { formatRelative } from '@/utils/format';
import { UNIT_STATUSES } from '@/lib/mock/catalogue';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';

/** Inventory of individual lettable units, with their housekeeping state. */
export const UnitsPage = () => {
  const { can } = useAuth();
  const canManage = can(CAPABILITIES.unitsManage);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching } = useUnits({ query: debouncedSearch, status, pageSize: 50 });
  const { setUnitStatus, pendingId } = useUnitStatus();

  const counts = UNIT_STATUSES.map((entry) => ({
    status: entry,
    count: (data?.items ?? []).filter((unit) => unit.status === entry).length,
  }));

  const columns = [
    {
      key: 'label',
      header: 'Unit',
      render: (row) => (
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-ink">{row.label}</p>
          <p className="truncate text-[10.5px] text-ink-muted">{row.property}</p>
        </div>
      ),
    },
    { key: 'floor', header: 'Floor', render: (row) => <span className="text-ink-soft">{row.floor}</span> },
    {
      key: 'config',
      header: 'Config',
      render: (row) => (
        <span className="whitespace-nowrap text-ink-soft">
          {row.beds} bed · {row.baths} bath
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'note', header: 'Note', render: (row) => <span className="text-ink-muted">{row.note}</span> },
    {
      key: 'lastCleaned',
      header: 'Last cleaned',
      render: (row) => <span className="whitespace-nowrap text-ink-muted">{formatRelative(row.lastCleaned)}</span>,
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) => (
              <div className="flex justify-end gap-1.5">
                {row.status !== 'Ready' && (
                  <Button
                    size="xs"
                    variant="primary"
                    isLoading={pendingId === row.id}
                    onClick={() => setUnitStatus({ id: row.id, status: 'Ready' })}
                  >
                    Mark ready
                  </Button>
                )}
                {row.status !== 'Maintenance' && (
                  <Button
                    size="xs"
                    variant="dangerSoft"
                    isLoading={pendingId === row.id}
                    onClick={() => setUnitStatus({ id: row.id, status: 'Maintenance' })}
                  >
                    Block
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Units & Rooms" subtitle="Every lettable unit and its current housekeeping state." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counts.map((entry) => (
          <Card key={entry.status} className="p-3.5">
            <p className="font-display text-[22px] font-bold leading-none text-ink">{entry.count}</p>
            <div className="mt-2">
              <StatusBadge status={entry.status} />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by unit or property…"
            total={data?.total}
            noun="unit"
            filters={[
              { id: 'status', value: status, onChange: setStatus, options: ['All', ...UNIT_STATUSES], label: 'Status' },
            ]}
          />
        </div>

        <div className="border-t border-line">
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isFetching && !data}
            emptyTitle="No units match these filters"
          />
        </div>
      </Card>
    </div>
  );
};
