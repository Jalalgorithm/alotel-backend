import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { formatDate } from '@/utils/format';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';
import { PRIORITY_BADGE_VARIANT, STATUS_BADGE_VARIANT, TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/maintenanceSchema';
import { useMaintenanceTickets } from '../hooks/useMaintenanceTickets';
import { TicketFormModal } from './TicketFormModal';

/**
 * Embedded in `PropertyDetailPage.jsx`'s "Maintenance" tab — a pre-filtered
 * ticket table scoped to one property, so a host checking one property
 * doesn't have to cross-reference the global ticket table (spec §B.4).
 */
export const PropertyMaintenanceTab = ({ propertyId, propertyName }) => {
  const { can } = useAuth();
  const canManage = can(CAPABILITIES.maintenanceManage);
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data, isLoading } = useMaintenanceTickets({ propertyId });

  const columns = [
    { key: 'category', header: 'Category', render: (row) => <span className="font-semibold text-ink">{row.category}</span> },
    { key: 'priority', header: 'Priority', render: (row) => <Badge variant={PRIORITY_BADGE_VARIANT[row.priority]}>{TICKET_PRIORITIES.find((p) => p.value === row.priority)?.label}</Badge> },
    { key: 'assignedWorkerName', header: 'Assigned to', render: (row) => row.assignedWorkerName || <span className="text-ink-muted">Unassigned</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={STATUS_BADGE_VARIANT[row.status]} dot>{TICKET_STATUSES.find((s) => s.value === row.status)?.label}</Badge> },
    { key: 'createdAt', header: 'Created', render: (row) => <span className="text-[11px] text-ink-muted">{formatDate(row.createdAt)}</span> },
  ];

  return (
    <Card>
      <CardHeader
        title="Maintenance"
        subtitle="Tickets logged against this property."
        action={canManage && <Button size="sm" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={() => setIsModalOpen(true)}>New ticket</Button>}
      />
      <div className="border-t border-line">
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          isLoading={isLoading}
          onRowClick={(row) => navigate(paths.maintenanceTicketDetail(row.id))}
          emptyTitle="No maintenance tickets"
          emptyDescription="Nothing has been logged for this property yet."
        />
      </div>

      <TicketFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} propertyId={propertyId} propertyName={propertyName} />
    </Card>
  );
};
