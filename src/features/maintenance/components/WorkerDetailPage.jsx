import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/ui/DataTable';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { getErrorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';
import { PRIORITY_BADGE_VARIANT, STATUS_BADGE_VARIANT, TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/maintenanceSchema';
import { useMaintenanceWorker, useWorkerAssignments } from '../hooks/useMaintenanceWorkers';
import { useMaintenanceTickets } from '../hooks/useMaintenanceTickets';
import { useProperties } from '@/features/properties/hooks/useProperties';
import { WorkerFormModal } from './WorkerFormModal';

export const WorkerDetailPage = () => {
  const { workerId } = useParams();
  const { data: worker, isLoading, isError, error } = useMaintenanceWorker(workerId);
  const { data: ticketsData } = useMaintenanceTickets({ assignedWorkerId: workerId });
  const { data: propertiesData } = useProperties({ pageSize: 100, status: 'published' });

  const { assignProperty, isAssigning, unassignProperty, isUnassigning } = useWorkerAssignments(workerId);

  const { can } = useAuth();
  const canManage = can(CAPABILITIES.maintenanceManage);

  const [isEditing, setIsEditing] = useState(false);
  const [pickedProperty, setPickedProperty] = useState('');
  /**
   * The worker-detail endpoint only returns `assignedPropertyCount`, not the
   * individual assignments (no `GET .../assignments/` list endpoint exists) —
   * so only assignments made in this session, where the POST response handed
   * back an id, can be shown with an unassign action.
   */
  const [sessionAssignments, setSessionAssignments] = useState([]);

  const assign = () => {
    if (!pickedProperty) return;
    assignProperty(pickedProperty, {
      onSuccess: (assignment) => {
        const property = propertiesData?.items?.find((p) => p.id === pickedProperty);
        setSessionAssignments((current) => [...current, { ...assignment, propertyName: property?.name ?? pickedProperty }]);
        setPickedProperty('');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !worker) {
    return (
      <div className="space-y-5">
        <PageHeader title="Worker" />
        <EmptyState title="Could not load this worker" description={getErrorMessage(error)} action={<Button to={paths.maintenanceWorkers}>Back to directory</Button>} />
      </div>
    );
  }

  const ticketColumns = [
    { key: 'category', header: 'Category' },
    { key: 'propertyName', header: 'Property' },
    { key: 'priority', header: 'Priority', render: (row) => <Badge variant={PRIORITY_BADGE_VARIANT[row.priority]}>{TICKET_PRIORITIES.find((p) => p.value === row.priority)?.label}</Badge> },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={STATUS_BADGE_VARIANT[row.status]} dot>{TICKET_STATUSES.find((s) => s.value === row.status)?.label}</Badge> },
    { key: 'createdAt', header: 'Created', render: (row) => <span className="text-[11px] text-ink-muted">{formatDate(row.createdAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={worker.name}
        subtitle={worker.employmentType === 'external_vendor' ? worker.companyName : 'In-house staff'}
        meta={
          <>
            <Badge variant={worker.employmentType === 'in_house' ? 'info' : 'brand'}>{worker.employmentType === 'in_house' ? 'In-house' : 'External vendor'}</Badge>
            <Badge variant={worker.status === 'active' ? 'ok' : 'neutral'} dot>{worker.status === 'active' ? 'Active' : 'Inactive'}</Badge>
          </>
        }
        actions={
          <>
            <Button to={paths.maintenanceWorkers} leftIcon={<ArrowLeft className="size-3.5" aria-hidden="true" />}>Back</Button>
            {canManage && <Button onClick={() => setIsEditing(true)} leftIcon={<Pencil className="size-3.5" aria-hidden="true" />}>Edit</Button>}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-1">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Contact</p>
          <p className="text-[12.5px] text-ink">{worker.phone}</p>
          {worker.email && <p className="text-[12.5px] text-ink-soft">{worker.email}</p>}

          <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Rate</p>
          <p className="text-[12.5px] text-ink">
            {worker.rateAmount !== null ? worker.rateAmount : '—'} · {worker.rateBasis.replace('_', ' ')}
          </p>

          <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Specialties</p>
          <div className="flex flex-wrap gap-1">
            {worker.specialtyTags.map((tag) => <Badge key={tag} variant="neutral">{tag}</Badge>)}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Assigned properties" subtitle={`${worker.assignedPropertyCount} propert${worker.assignedPropertyCount === 1 ? 'y' : 'ies'} assigned in total.`} />
          <div className="space-y-3 border-t border-line p-4">
            <Alert variant="info">
              The API doesn't expose a list of individual assignments yet — only the total count above and whatever you assign in this session (shown below).
            </Alert>

            {canManage && (
              <div className="flex items-end gap-2">
                <Select
                  label="Assign to a property"
                  value={pickedProperty}
                  onChange={(e) => setPickedProperty(e.target.value)}
                  options={(propertiesData?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Select a property"
                  containerClassName="flex-1"
                />
                <Button leftIcon={<Plus className="size-3.5" aria-hidden="true" />} isLoading={isAssigning} disabled={!pickedProperty} onClick={assign}>
                  Assign
                </Button>
              </div>
            )}

            {sessionAssignments.length > 0 && (
              <div className="space-y-1.5">
                {sessionAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2.5">
                    <span className="text-[12.5px] font-semibold text-ink">{assignment.propertyName}</span>
                    {canManage && (
                      <Button
                        size="xs"
                        variant="ghost"
                        aria-label="Unassign"
                        isLoading={isUnassigning}
                        onClick={() => {
                          unassignProperty(assignment.id);
                          setSessionAssignments((current) => current.filter((a) => a.id !== assignment.id));
                        }}
                      >
                        <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Ticket history" subtitle="Every ticket this worker has been assigned to." />
        <div className="border-t border-line">
          <DataTable columns={ticketColumns} rows={ticketsData?.items ?? []} emptyTitle="No tickets yet" />
        </div>
      </Card>

      <WorkerFormModal isOpen={isEditing} onClose={() => setIsEditing(false)} worker={worker} />
    </div>
  );
};
