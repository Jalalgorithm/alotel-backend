import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Pagination } from '@/components/shared/Pagination';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { formatDate } from '@/utils/format';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useMaintenanceTickets } from '../hooks/useMaintenanceTickets';
import { PRIORITY_BADGE_VARIANT, STATUS_BADGE_VARIANT, TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/maintenanceSchema';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';
import { useProperties } from '@/features/properties/hooks/useProperties';
import { TicketFormModal } from './TicketFormModal';

/**
 * Global ticket table — filterable by property/status/priority, `GET
 * /operations/maintenance/tickets/`. The backend doesn't support a `search`
 * query param and doesn't paginate this endpoint (it always returns the full
 * filtered set), so search is applied client-side over whatever property/
 * status/priority filters already narrowed the result to.
 */
export const TicketTablePage = () => {
  const { can } = useAuth();
  const canManage = can(CAPABILITIES.maintenanceManage);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [propertyId, setPropertyId] = useState('All');
  const [status, setStatus] = useState('All');
  const [priority, setPriority] = useState('All');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const { data: propertiesData } = useProperties({ pageSize: 100, status: 'published' });
  const { data, isFetching } = useMaintenanceTickets({
    propertyId: propertyId === 'All' ? undefined : propertyId,
    status: status === 'All' ? undefined : status,
    priority: priority === 'All' ? undefined : priority,
  });

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (ticket) => ticket.category?.toLowerCase().includes(term) || ticket.description?.toLowerCase().includes(term),
    );
  }, [data?.items, debouncedSearch]);

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const propertyOptions = [
    { value: 'All', label: 'All properties' },
    ...(propertiesData?.items ?? []).map((property) => ({ value: property.id, label: property.name })),
  ];

  const columns = [
    {
      key: 'category',
      header: 'Ticket',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
            <Wrench className="size-4 text-brand-600" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold text-ink">{row.category}</p>
            <p className="truncate text-[10.5px] text-ink-muted">{row.propertyName || row.spaceName || row.propertyId || row.spaceId}</p>
          </div>
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', render: (row) => <Badge variant={PRIORITY_BADGE_VARIANT[row.priority]}>{TICKET_PRIORITIES.find((p) => p.value === row.priority)?.label}</Badge> },
    { key: 'assignedWorkerName', header: 'Assigned to', render: (row) => row.assignedWorkerName || <span className="text-ink-muted">Unassigned</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={STATUS_BADGE_VARIANT[row.status]} dot>{TICKET_STATUSES.find((s) => s.value === row.status)?.label}</Badge> },
    { key: 'totalCost', header: 'Cost', align: 'right', render: (row) => (row.totalCost ? row.totalCost.toLocaleString() : '—') },
    { key: 'createdAt', header: 'Created', render: (row) => <span className="whitespace-nowrap text-[11px] text-ink-muted">{formatDate(row.createdAt)}</span> },
  ];

  // The endpoint returns the full filtered set in one response (no server-side
  // pagination) — page through the client-filtered `rows` instead.
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Maintenance Tickets"
        subtitle="Every maintenance ticket across the portfolio."
        actions={canManage && <Button variant="primary" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={() => setIsModalOpen(true)}>New ticket</Button>}
      />

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={withReset(setSearch)}
            searchPlaceholder="Search by category or description…"
            total={rows.length}
            noun="ticket"
            filters={[
              { id: 'property', value: propertyId, onChange: withReset(setPropertyId), label: 'Property', options: propertyOptions },
              { id: 'status', value: status, onChange: withReset(setStatus), label: 'Status', options: [{ value: 'All', label: 'All statuses' }, ...TICKET_STATUSES] },
              { id: 'priority', value: priority, onChange: withReset(setPriority), label: 'Priority', options: [{ value: 'All', label: 'All priorities' }, ...TICKET_PRIORITIES] },
            ]}
          />
        </div>
        <div className="border-t border-line">
          <DataTable
            columns={columns}
            rows={pagedRows}
            isLoading={isFetching && !data}
            onRowClick={(row) => navigate(paths.maintenanceTicketDetail(row.id))}
            emptyTitle="No tickets match these filters"
            emptyDescription="Create a ticket when something needs fixing."
          />
        </div>
      </Card>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <TicketFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
