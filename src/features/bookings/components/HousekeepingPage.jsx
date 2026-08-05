import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useHousekeeping, useResolveMaintenance } from '../hooks/useOperations';
import { useUnitStatus } from '@/features/properties';
import { formatRelative } from '@/utils/format';
import { UNIT_STATUSES } from '@/lib/mock/catalogue';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';

const STATUS_TONE = {
  Ready: 'border-l-ok',
  'Needs Cleaning': 'border-l-warn',
  Occupied: 'border-l-info',
  Maintenance: 'border-l-danger',
};

/**
 * Room-status board.
 *
 * This is the only operational screen a Level 3 cleaner can open, so it must
 * work standalone — no guest names, no financials, just unit state.
 */
export const HousekeepingPage = () => {
  const { can } = useAuth();
  const canManage = can(CAPABILITIES.housekeepingManage);

  const { data, isLoading } = useHousekeeping();
  const { setUnitStatus, pendingId } = useUnitStatus();
  const { resolve, pendingId: resolvingId } = useResolveMaintenance();

  const units = data?.units ?? [];
  const maintenance = (data?.maintenance ?? []).filter((entry) => entry.status !== 'Resolved');

  return (
    <div className="space-y-5">
      <PageHeader title="Housekeeping" subtitle="Live room status across the portfolio." />

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {UNIT_STATUSES.map((status) => (
          <Card key={status} className="p-3.5">
            <p className="font-display text-[22px] font-bold leading-none text-ink">
              {units.filter((unit) => unit.status === status).length}
            </p>
            <div className="mt-2">
              <StatusBadge status={status} />
            </div>
          </Card>
        ))}
      </div>

      {/* Room board */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-36 rounded-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {units.map((unit) => (
            <Card key={unit.id} className={`border-l-[3px] p-4 ${STATUS_TONE[unit.status] ?? 'border-l-line'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-ink">{unit.label}</p>
                  <p className="truncate text-[10.5px] text-ink-muted">{unit.property}</p>
                </div>
                <StatusBadge status={unit.status} />
              </div>

              <p className="mt-2 text-[11px] text-ink-soft">{unit.note}</p>
              <p className="mt-0.5 text-[10px] text-ink-muted">Cleaned {formatRelative(unit.lastCleaned)}</p>

              {canManage && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {unit.status !== 'Ready' && (
                    <Button
                      size="xs"
                      variant="primary"
                      isLoading={pendingId === unit.id}
                      onClick={() => setUnitStatus({ id: unit.id, status: 'Ready' })}
                    >
                      Mark cleaned
                    </Button>
                  )}
                  {unit.status === 'Ready' && (
                    <Button
                      size="xs"
                      isLoading={pendingId === unit.id}
                      onClick={() => setUnitStatus({ id: unit.id, status: 'Needs Cleaning' })}
                    >
                      Needs cleaning
                    </Button>
                  )}
                  {unit.status !== 'Maintenance' && (
                    <Button
                      size="xs"
                      variant="dangerSoft"
                      isLoading={pendingId === unit.id}
                      onClick={() => setUnitStatus({ id: unit.id, status: 'Maintenance' })}
                    >
                      Block
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Maintenance queue */}
      <Card>
        <CardHeader title="Open maintenance requests" subtitle="Ordered by priority." />

        {maintenance.length ? (
          <ul className="divide-y divide-line border-t border-line">
            {maintenance.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-ink">{request.title}</p>
                  <p className="truncate text-[10.5px] text-ink-muted">
                    {request.property} · reported {formatRelative(request.reportedAt)} · {request.assignee}
                  </p>
                </div>

                <StatusBadge status={request.priority} dot={false} />
                <StatusBadge status={request.status === 'Open' ? 'Due' : 'Processing'} />

                {canManage && (
                  <Button
                    size="xs"
                    variant="primary"
                    isLoading={resolvingId === request.id}
                    onClick={() => resolve(request.id)}
                  >
                    Mark resolved
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No open requests" description="Everything reported has been resolved." />
        )}
      </Card>
    </div>
  );
};
