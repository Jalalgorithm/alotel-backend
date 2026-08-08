import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/ui/DataTable';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/features/auth';
import { useAuditLog, useStaff } from '../hooks/usePeople';
import { AUDIT_METHODS } from '../utils/auditLogMapping';
import { formatDate } from '@/utils/format';

const METHOD_OPTIONS = [{ value: '', label: 'All methods' }, ...AUDIT_METHODS.map((method) => ({ value: method, label: method }))];

const STATUS_VARIANT = (code) => (code >= 500 ? 'danger' : code >= 400 ? 'warn' : 'ok');

/** Immutable record of every admin API request, straight from the server's own request log. */
export const AuditLogPage = () => {
  const { user } = useAuth();
  const { data: staff = [] } = useStaff();

  const [method, setMethod] = useState('');
  const [userId, setUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const { data, isFetching } = useAuditLog({ method, userId, startDate, endDate, page, pageSize: 20 });

  const actorById = useMemo(() => {
    const map = new Map(staff.map((member) => [member.id, { name: member.name, role: member.role }]));
    if (user?.id) map.set(user.id, { name: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'You', role: 'L1' });
    return map;
  }, [staff, user]);

  const adminOptions = useMemo(
    () => [
      { value: '', label: 'All admins' },
      ...(user?.id ? [{ value: user.id, label: 'Me' }] : []),
      ...staff.map((member) => ({ value: member.id, label: member.name })),
    ],
    [staff, user],
  );

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const handleMethod = withReset(setMethod);
  const handleUserId = withReset(setUserId);
  const handleStartDate = withReset(setStartDate);
  const handleEndDate = withReset(setEndDate);

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
      render: (row) => {
        const actor = actorById.get(row.userId);
        return actor ? (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[12px] font-medium text-ink">{actor.name}</span>
            <Badge variant={actor.role === 'L1' ? 'ok' : 'info'}>{actor.role}</Badge>
          </span>
        ) : (
          <code className="font-mono text-[10.5px] text-ink-muted" title={row.userId}>
            {row.userId ? `${row.userId.slice(0, 8)}…` : '—'}
          </code>
        );
      },
    },
    { key: 'action', header: 'Action', render: (row) => <Badge variant="info">{row.action}</Badge> },
    {
      key: 'request',
      header: 'Request',
      render: (row) => (
        <span className="whitespace-nowrap font-mono text-[10.5px] text-ink-soft">
          {row.method} {row.path}
        </span>
      ),
    },
    {
      key: 'statusCode',
      header: 'Status',
      render: (row) => <Badge variant={STATUS_VARIANT(row.statusCode)}>{row.statusCode}</Badge>,
    },
    {
      key: 'durationMs',
      header: 'Duration',
      render: (row) => <span className="whitespace-nowrap text-ink-muted">{row.durationMs}ms</span>,
    },
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
        subtitle="Read-only record of every admin API request. Retained for seven years."
      />

      <Alert variant="info">
        Entries cannot be edited or deleted from the portal — including by a Super Admin. Export requests go
        through the compliance team.
      </Alert>

      <Card>
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-wrap items-end gap-3">
            <Select
              label="Method"
              value={method}
              onChange={(event) => handleMethod(event.target.value)}
              options={METHOD_OPTIONS}
              containerClassName="w-full sm:w-36"
            />
            <Select
              label="Admin"
              value={userId}
              onChange={(event) => handleUserId(event.target.value)}
              options={adminOptions}
              containerClassName="w-full sm:w-48"
            />
            <Input
              label="From"
              type="date"
              value={startDate}
              onChange={(event) => handleStartDate(event.target.value)}
              containerClassName="w-full sm:w-40"
            />
            <Input
              label="To"
              type="date"
              value={endDate}
              onChange={(event) => handleEndDate(event.target.value)}
              containerClassName="w-full sm:w-40"
            />
          </div>

          {typeof data?.total === 'number' && (
            <p className="whitespace-nowrap text-[12px] text-ink-muted">
              <span className="font-semibold text-ink">{data.total.toLocaleString()}</span>{' '}
              {data.total === 1 ? 'entry' : 'entries'}
            </p>
          )}
        </div>

        <div className="border-t border-line">
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isFetching && !data}
            emptyTitle="No entries match this filter"
          />
        </div>
      </Card>

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
};
