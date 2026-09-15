import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Send, Table as TableIcon } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDate } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';
import { TEMPLATE_REGIONS, TEMPLATE_STAY_TYPES } from '@/lib/contractSchema';
import {
  useContractList,
  useContractSummary,
  useSendContract,
  useUnsentContracts,
} from '../hooks/useContracts';
import { ContractDrawer } from './ContractDrawer';

const COLUMNS = [
  { id: 'unsent', label: 'Not sent' },
  { id: 'sent', label: 'Awaiting' },
  { id: 'declined', label: 'Declined' },
  { id: 'expired', label: 'Expired' },
  { id: 'signed', label: 'Signed' },
];

const CardShell = ({ tone, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors hover:border-brand-300 ${
      tone === 'critical' ? 'border-danger/30 bg-danger-soft' : tone === 'warn' ? 'border-warn/30 bg-warn-soft' : 'border-line bg-white'
    }`}
  >
    {children}
  </button>
);

const UnsentCard = ({ row, onOpen, selectable, selected, onToggleSelect }) => {
  const navigate = useNavigate();
  const critical = row.daysUntilCheckIn !== null && row.daysUntilCheckIn <= 14;
  const missingTemplate = !row.resolvedTemplate;

  // No template to send with — the useful click here is "go fix the template," not "try to send."
  const handleClick = missingTemplate
    ? () => navigate(`${paths.contractTemplates}?region=${row.region}&stayType=${row.stayType}`)
    : () => onOpen({ type: 'unsent', booking: row });

  return (
    <div className="flex items-start gap-2">
      {selectable && row.resolvedTemplate && (
        <input type="checkbox" className="mt-3.5" checked={selected} onChange={() => onToggleSelect(row.bookingId)} />
      )}
      <CardShell tone={critical ? 'critical' : missingTemplate ? 'warn' : undefined} onClick={handleClick}>
        <p className="truncate text-[12.5px] font-semibold text-ink">{row.guest?.name}</p>
        <p className="truncate text-[11px] text-ink-muted">{row.property?.name}</p>
        <p className="text-[10.5px] text-ink-muted">
          {row.nights}n · check-in {formatDate(row.checkIn)}
          {row.daysUntilCheckIn !== null && ` (${row.daysUntilCheckIn}d)`}
        </p>
        {row.resolvedTemplate ? (
          <Badge variant="neutral">{row.resolvedTemplate.name}</Badge>
        ) : (
          <Badge variant="danger">No published template — fix in Templates</Badge>
        )}
        {row.testMode && <Badge variant="warn">Test</Badge>}
      </CardShell>
    </div>
  );
};

const ContractCard = ({ row, onOpen }) => {
  const warn = row.status === 'sent' && row.daysWaiting >= 7;
  const critical =
    (row.status === 'sent' && row.expiresAt && (new Date(row.expiresAt) - Date.now()) / 86400000 <= 3) ||
    ['declined', 'expired'].includes(row.status);

  return (
    <CardShell tone={critical ? 'critical' : warn ? 'warn' : undefined} onClick={() => onOpen({ type: 'contract', contractId: row.contractId })}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[12.5px] font-semibold text-ink">{row.guest?.name}</p>
        {row.testMode && <Badge variant="warn">Test</Badge>}
      </div>
      <p className="truncate text-[11px] text-ink-muted">{row.property?.name}</p>
      {row.status === 'sent' && (
        <p className="text-[10.5px] text-ink-muted">
          waiting {row.daysWaiting}d{row.expiresAt ? ` · expires ${formatDate(row.expiresAt)}` : ''}
          {row.lastEvent ? ` · ${row.lastEvent.type} ${formatDate(row.lastEvent.at, 'HH:mm')}` : ''}
        </p>
      )}
      {row.status === 'declined' && <p className="text-[10.5px] text-danger">{row.declineReason || 'Declined'}</p>}
      {row.status === 'expired' && <p className="text-[10.5px] text-ink-muted">Expired {formatDate(row.expiresAt)}</p>}
      {row.status === 'signed' && <p className="text-[10.5px] text-ink-muted">Signed {formatDate(row.signedAt)} · {row.template?.version ? `v${row.template.version}` : ''}</p>}
    </CardShell>
  );
};

/** Signing pipeline — a board grouped by status, because four of the five states need someone to act. */
export const ContractsPage = () => {
  const { can } = useAuth();
  const canManage = can(CAPABILITIES.contractsManage);

  const [view, setView] = useState('board');
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [stayType, setStayType] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const filters = { search: debouncedSearch, region: region || undefined, stayType: stayType || undefined };

  const [target, setTarget] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkProgress, setBulkProgress] = useState(null);

  const { data: summary } = useContractSummary();
  const { data: unsent = [], isLoading: isUnsentLoading } = useUnsentContracts(filters);
  const { data: sent, isLoading: isSentLoading } = useContractList({ ...filters, status: 'sent' });
  const { data: declined, isLoading: isDeclinedLoading } = useContractList({ ...filters, status: 'declined' });
  const { data: expired, isLoading: isExpiredLoading } = useContractList({ ...filters, status: 'expired' });
  const { data: signed, isLoading: isSignedLoading } = useContractList({ ...filters, status: 'signed', ordering: '-signed_at' });
  const { data: all, isLoading: isAllLoading } = useContractList(filters);

  const { sendContractAsync } = useSendContract();

  const toggleSelect = (bookingId) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(bookingId)) next.delete(bookingId);
      else next.add(bookingId);
      return next;
    });

  const selectableRows = useMemo(() => unsent.filter((row) => row.resolvedTemplate), [unsent]);

  const bulkSend = async () => {
    const ids = [...selected];
    setBulkProgress({ total: ids.length, done: 0, results: [] });
    for (const bookingId of ids) {
      const row = unsent.find((r) => r.bookingId === bookingId);
      try {
        await sendContractAsync({ bookingId, templateId: row?.resolvedTemplate?.id });
        setBulkProgress((current) => ({ ...current, done: current.done + 1, results: [...current.results, { bookingId, ok: true }] }));
      } catch (error) {
        setBulkProgress((current) => ({ ...current, done: current.done + 1, results: [...current.results, { bookingId, ok: false, error: getErrorMessage(error) }] }));
      }
    }
    setSelected(new Set());
  };

  const tableColumns = [
    { key: 'guest', header: 'Guest', render: (row) => row.guest?.name },
    { key: 'property', header: 'Property', render: (row) => row.property?.name },
    { key: 'region', header: 'Region', render: (row) => <Badge variant="brand">{row.regionLabel}</Badge> },
    { key: 'nights', header: 'Nights', render: (row) => `${row.nights}n` },
    { key: 'status', header: 'Status', render: (row) => (
      <div className="flex items-center gap-1.5">
        <StatusBadge status={row.statusLabel} />
        {row.testMode && <Badge variant="warn">Test</Badge>}
      </div>
    ) },
    { key: 'sentAt', header: 'Sent', render: (row) => (row.sentAt ? formatDate(row.sentAt) : '—') },
    { key: 'signedAt', header: 'Signed', render: (row) => (row.signedAt ? formatDate(row.signedAt) : '—') },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contracts & E-Sign"
        subtitle="Managed via Dropbox Sign — eIDAS and ESIGN compliant, with full audit trails."
        actions={
          <div className="flex gap-1.5">
            <Button variant={view === 'board' ? 'primary' : 'secondary'} size="sm" leftIcon={<LayoutGrid className="size-3.5" aria-hidden="true" />} onClick={() => setView('board')}>
              Board
            </Button>
            <Button variant={view === 'table' ? 'primary' : 'secondary'} size="sm" leftIcon={<TableIcon className="size-3.5" aria-hidden="true" />} onClick={() => setView('table')}>
              Table
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2.5">
        <Input placeholder="Search guest, email, property, booking…" value={search} onChange={(e) => setSearch(e.target.value)} containerClassName="w-64" />
        <Select value={region} onChange={(e) => setRegion(e.target.value)} options={TEMPLATE_REGIONS} placeholder="All regions" containerClassName="w-40" />
        <Select value={stayType} onChange={(e) => setStayType(e.target.value)} options={TEMPLATE_STAY_TYPES} placeholder="All stay types" containerClassName="w-52" />
      </div>

      {view === 'table' ? (
        <Card>
          <CardHeader title="All contracts" subtitle={summary && `${summary.unsent + summary.sent + summary.declined + summary.expired + summary.signed + summary.cancelled} total`} />
          <div className="table-scroll border-t border-line">
            <DataTable
              columns={tableColumns}
              rows={all?.items ?? []}
              getRowId={(row) => row.contractId}
              isLoading={isAllLoading}
              onRowClick={(row) => setTarget({ type: 'contract', contractId: row.contractId })}
              emptyTitle="No contracts yet"
            />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {COLUMNS.map((column) => {
            const isUnsentColumn = column.id === 'unsent';
            const rows = isUnsentColumn ? unsent : { sent, declined, expired, signed }[column.id]?.items ?? [];
            const isLoading = isUnsentColumn
              ? isUnsentLoading
              : { sent: isSentLoading, declined: isDeclinedLoading, expired: isExpiredLoading, signed: isSignedLoading }[column.id];
            const count = summary?.[column.id];

            return (
              <Card key={column.id} className="flex flex-col">
                <CardHeader
                  title={`${column.label}${count !== undefined ? ` (${count})` : ''}`}
                  action={
                    isUnsentColumn && canManage && selectableRows.length > 0 && (
                      <Button size="xs" variant="primary" disabled={selected.size === 0} leftIcon={<Send className="size-3" aria-hidden="true" />} onClick={bulkSend}>
                        Send {selected.size || ''}
                      </Button>
                    )
                  }
                />
                <div className="max-h-[65vh] space-y-2 overflow-y-auto border-t border-line p-3">
                  {isLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : rows.length === 0 ? (
                    <EmptyState title="Nothing here" />
                  ) : isUnsentColumn ? (
                    rows.map((row) => (
                      <UnsentCard
                        key={row.bookingId}
                        row={row}
                        onOpen={setTarget}
                        selectable={canManage}
                        selected={selected.has(row.bookingId)}
                        onToggleSelect={toggleSelect}
                      />
                    ))
                  ) : (
                    rows.map((row) => <ContractCard key={row.contractId} row={row} onOpen={setTarget} />)
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ContractDrawer target={target} onClose={() => setTarget(null)} />

      <Modal
        isOpen={Boolean(bulkProgress)}
        onClose={() => setBulkProgress(null)}
        size="sm"
        title="Sending contracts"
        footer={
          bulkProgress?.done === bulkProgress?.total && (
            <div className="flex justify-end"><Button size="sm" onClick={() => setBulkProgress(null)}>Close</Button></div>
          )
        }
      >
        {bulkProgress && (
          <div className="space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-line-soft">
              <div className="h-full bg-brand-600 transition-all" style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }} />
            </div>
            <p className="text-[12px] text-ink-muted">{bulkProgress.done} of {bulkProgress.total} sent</p>
            <ul className="space-y-1 text-[11.5px]">
              {bulkProgress.results.map((result) => (
                <li key={result.bookingId} className={result.ok ? 'text-ok' : 'text-danger'}>
                  #{result.bookingId} — {result.ok ? 'sent' : result.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
};
