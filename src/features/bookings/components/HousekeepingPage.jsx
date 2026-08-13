import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useAssignedProperties,
  useReportIssue,
  useTasks,
  useTodaysRooms,
  useUpdateTaskStatus,
} from '../hooks/useOperations';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';

/** `TodaysRoomStatusView`'s four statuses. */
const ROOM_STATUSES = ['occupied', 'due_checkout', 'needs_cleaning', 'ready'];
const ROOM_STATUS_LABELS = { occupied: 'Occupied', due_checkout: 'Due Check-out', needs_cleaning: 'Needs Cleaning', ready: 'Ready' };
const ROOM_STATUS_TONE = { occupied: 'border-l-info', due_checkout: 'border-l-warn', needs_cleaning: 'border-l-warn', ready: 'border-l-ok' };
const ROOM_STATUS_BADGE = { occupied: 'info', due_checkout: 'warn', needs_cleaning: 'warn', ready: 'ok' };

/** `OperationTask.STATUS_CHOICES`. */
const TASK_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'cleaned', label: 'Cleaned' },
  { value: 'ready', label: 'Ready' },
  { value: 'blocked', label: 'Blocked' },
];
const TASK_STATUS_BADGE = { pending: 'warn', in_progress: 'info', cleaned: 'ok', ready: 'ok', blocked: 'danger' };

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

const emptyIssue = { propertyId: '', title: '', description: '', severity: 'medium' };

/**
 * Housekeeping — the only operational screen a Level 3 cleaner can open, so
 * it works standalone: no guest names, no financials. Backed by
 * `GET /operations/rooms/today/` (derived room status), `GET /operations/tasks/`
 * (a housekeeper only ever sees their own), and `POST /operations/issues/report/`
 * (write-only — there's no list/resolve endpoint for issues yet).
 */
export const HousekeepingPage = () => {
  const { can } = useAuth();
  const canManage = can(CAPABILITIES.housekeepingManage);

  const { data: roomsData, isLoading: isLoadingRooms } = useTodaysRooms();
  const { data: tasks = [], isLoading: isLoadingTasks } = useTasks();
  const { updateTaskStatus, isPending: isUpdatingTask, pendingId } = useUpdateTaskStatus();
  const { data: assignedProperties = [] } = useAssignedProperties();
  const { reportIssue, isPending: isReporting } = useReportIssue();

  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueDraft, setIssueDraft] = useState(emptyIssue);

  const rooms = roomsData?.rooms ?? [];
  const propertyNameById = new Map(rooms.map((room) => [room.propertyId, room.propertyName]));

  const submitIssue = () => {
    reportIssue(issueDraft, {
      onSuccess: () => {
        setIsIssueModalOpen(false);
        setIssueDraft(emptyIssue);
      },
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Housekeeping"
        subtitle="Live room status across the portfolio."
        actions={
          canManage && (
            <Button variant="secondary" leftIcon={<AlertTriangle className="size-3.5" aria-hidden="true" />} onClick={() => setIsIssueModalOpen(true)}>
              Report an issue
            </Button>
          )
        }
      />

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ROOM_STATUSES.map((status) => (
          <Card key={status} className="p-3.5">
            <p className="font-display text-[22px] font-bold leading-none text-ink">
              {rooms.filter((room) => room.status === status).length}
            </p>
            <div className="mt-2">
              <Badge variant={ROOM_STATUS_BADGE[status]}>{ROOM_STATUS_LABELS[status]}</Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Room board */}
      {isLoadingRooms ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-card" />
          ))}
        </div>
      ) : rooms.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rooms.map((room) => (
            <Card key={room.propertyId} className={`border-l-[3px] p-4 ${ROOM_STATUS_TONE[room.status] ?? 'border-l-line'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-[13px] font-bold text-ink">{room.propertyName}</p>
                <Badge variant={ROOM_STATUS_BADGE[room.status]}>{ROOM_STATUS_LABELS[room.status] ?? room.status}</Badge>
              </div>

              {canManage && room.status === 'needs_cleaning' && room.cleaningTaskId && (
                <div className="mt-3">
                  <Button
                    size="xs"
                    variant="primary"
                    isLoading={isUpdatingTask && pendingId === room.cleaningTaskId}
                    onClick={() => updateTaskStatus(room.cleaningTaskId, { status: 'cleaned' })}
                  >
                    Mark cleaned
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing scheduled today" description="No properties assigned, or nothing due." />
      )}

      {/* Task queue */}
      <Card>
        <CardHeader title="Tasks" subtitle="Cleaning, maintenance and inspection tasks." />

        {isLoadingTasks ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        ) : tasks.length ? (
          <ul className="divide-y divide-line border-t border-line">
            {tasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold capitalize text-ink">{task.taskType} task</p>
                  <p className="truncate text-[10.5px] text-ink-muted">
                    {propertyNameById.get(task.propertyId) ?? task.propertyId} {task.notes && `· ${task.notes}`}
                  </p>
                </div>

                {canManage ? (
                  <Select
                    value={task.status}
                    onChange={(event) => updateTaskStatus(task.id, { status: event.target.value })}
                    options={TASK_STATUSES}
                    aria-label={`Status for ${task.taskType} task`}
                    className="h-8 w-36 text-[11px]"
                  />
                ) : (
                  <Badge variant={TASK_STATUS_BADGE[task.status]}>{TASK_STATUSES.find((s) => s.value === task.status)?.label ?? task.status}</Badge>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No tasks" description="Nothing assigned right now." />
        )}
      </Card>

      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Report an issue"
        description="Logs a maintenance issue for the property team to action."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isReporting}
              disabled={!issueDraft.propertyId || !issueDraft.title.trim() || !issueDraft.description.trim()}
              onClick={submitIssue}
            >
              Report issue
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5">
          <Select
            label="Property"
            placeholder="Select a property"
            options={assignedProperties.map((property) => ({ value: property.id, label: property.name }))}
            value={issueDraft.propertyId}
            onChange={(event) => setIssueDraft((current) => ({ ...current, propertyId: event.target.value }))}
          />
          <Input
            label="Title"
            placeholder="e.g. Leaking tap in bathroom"
            value={issueDraft.title}
            onChange={(event) => setIssueDraft((current) => ({ ...current, title: event.target.value }))}
          />
          <Textarea
            label="Description"
            value={issueDraft.description}
            onChange={(event) => setIssueDraft((current) => ({ ...current, description: event.target.value }))}
          />
          <Select
            label="Severity"
            options={SEVERITIES}
            value={issueDraft.severity}
            onChange={(event) => setIssueDraft((current) => ({ ...current, severity: event.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
};
