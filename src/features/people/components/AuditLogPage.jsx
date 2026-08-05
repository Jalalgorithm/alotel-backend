import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Pagination } from '@/components/shared/Pagination';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Alert } from '@/components/ui/Alert';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuditLog } from '../hooks/usePeople';
import { formatDate } from '@/utils/format';

const ROLE_VARIANT = { L1: 'ok', L2: 'info', L3: 'neutral' };

/** Immutable record of admin actions. */
export const AuditLogPage = () => {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching } = useAuditLog({ query: debouncedSearch, role, page, pageSize: 12 });

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const columns = [
    {
      key: 'at',
      header: 'Timestamp',
      render: (row) => (
        <span className="whitespace-nowrap font-mono text-[11px] text-ink-soft">
          {formatDate(row.at, 'yyyy-MM-dd HH:mm')}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Admin',
      render: (row) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-[12px] font-medium text-ink">{row.actor}</span>
          <Badge variant={ROLE_VARIANT[row.role] ?? 'neutral'}>{row.role}</Badge>
        </span>
      ),
    },
    { key: 'action', header: 'Action', render: (row) => <Badge variant="info">{row.action}</Badge> },
    { key: 'target', header: 'Target', render: (row) => <span className="text-ink-soft">{row.target}</span> },
    {
      key: 'ip',
      header: 'IP address',
      render: (row) => <code className="font-mono text-[10.5px] text-ink-muted">{row.ip}</code>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Log"
        subtitle="Read-only record of every admin action. Retained for seven years."
      />

      <Alert variant="info">
        Entries cannot be edited or deleted from the portal — including by a Super Admin. Export requests go
        through the compliance team.
      </Alert>

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={withReset(setSearch)}
            searchPlaceholder="Search by admin, action, target or IP…"
            total={data?.total}
            noun="entry"
            nounPlural="entries"
            filters={[
              { id: 'role', value: role, onChange: withReset(setRole), options: ['All', 'L1', 'L2', 'L3'], label: 'Role' },
            ]}
          />
        </div>

        <div className="border-t border-line">
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isFetching && !data}
            emptyTitle="No entries match this search"
          />
        </div>
      </Card>

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
};
