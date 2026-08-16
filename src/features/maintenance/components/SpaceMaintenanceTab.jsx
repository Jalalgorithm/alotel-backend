import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { formatDate } from '@/utils/format';
import { paths } from '@/routes/paths';
import { PRIORITY_BADGE_VARIANT, STATUS_BADGE_VARIANT, TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/maintenanceSchema';
import { useMaintenanceTickets } from '../hooks/useMaintenanceTickets';
import { useMaintenanceNames } from '../hooks/useMaintenanceNames';
import { TicketFormModal } from './TicketFormModal';

/**
 * Embedded in `SpaceDetailPage.jsx`'s "Maintenance" tab — mirrors
 * `PropertyMaintenanceTab`, but scoped to a Space instead of a Property.
 * Space-linked tickets are Super-Admin-only server-side (no `assigned_spaces`
 * scoping concept exists for Facility Managers the way it does for
 * Properties), so the caller must only render this for Super Admins.
 */
export const SpaceMaintenanceTab = ({ spaceId, spaceName }) => {
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data, isLoading } = useMaintenanceTickets({ spaceId });
  const { workerName } = useMaintenanceNames();

  const columns = [
    { key: 'category', header: 'Category', render: (row) => <span className="font-semibold text-ink">{row.category}</span> },
    { key: 'priority', header: 'Priority', render: (row) => <Badge variant={PRIORITY_BADGE_VARIANT[row.priority]}>{TICKET_PRIORITIES.find((p) => p.value === row.priority)?.label}</Badge> },
    {
      key: 'assignedWorkerName',
      header: 'Assigned to',
      render: (row) => row.assignedWorkerName || workerName(row.assignedWorkerId) || <span className="text-ink-muted">Unassigned</span>,
    },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={STATUS_BADGE_VARIANT[row.status]} dot>{TICKET_STATUSES.find((s) => s.value === row.status)?.label}</Badge> },
    { key: 'createdAt', header: 'Created', render: (row) => <span className="text-[11px] text-ink-muted">{formatDate(row.createdAt)}</span> },
  ];

  return (
    <Card>
      <CardHeader
        title="Maintenance"
        subtitle="Tickets logged against this space."
        action={<Button size="sm" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={() => setIsModalOpen(true)}>New ticket</Button>}
      />
      <div className="border-t border-line">
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          isLoading={isLoading}
          onRowClick={(row) => navigate(paths.maintenanceTicketDetail(row.id))}
          emptyTitle="No maintenance tickets"
          emptyDescription="Nothing has been logged for this space yet."
        />
      </div>

      <TicketFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} spaceId={spaceId} spaceName={spaceName} />
    </Card>
  );
};
