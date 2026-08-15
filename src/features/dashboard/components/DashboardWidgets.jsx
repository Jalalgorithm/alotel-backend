import { useState } from 'react';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subWeeks } from 'date-fns';
import { Link } from 'react-router-dom';
import { CheckCircle2, ThumbsDown, ThumbsUp, Wrench, XCircle } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { BarChart } from '@/components/charts';
import { formatDate, formatRelative } from '@/utils/format';
import { paths } from '@/routes/paths';
import { PRIORITY_BADGE_VARIANT, STATUS_BADGE_VARIANT, TICKET_STATUSES } from '@/lib/maintenanceSchema';
import { useMaintenanceDashboard, useMaintenanceTickets } from '@/features/maintenance';
import { useAnnouncements } from '@/features/system';
import { useRevenueOverview } from '../hooks/useDashboard';
import { useVerificationDecision, useVerifications } from '../hooks/useVerificationDecision';

const RANGE_PRESETS = {
  this_week: 'This week',
  last_4_weeks: 'Last 4 weeks',
  this_month: 'This month',
};

const rangeFor = (preset) => {
  const now = new Date();
  if (preset === 'last_4_weeks') {
    return { start: subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 3), end: endOfWeek(now, { weekStartsOn: 1 }) };
  }
  if (preset === 'this_month') {
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }
  return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
};

/** `/admin/dashboard/revenue-overview/` — Mon–Sun totals for the selected preset range. */
export const RevenueOverviewCard = () => {
  const [preset, setPreset] = useState('this_week');
  const { start, end } = rangeFor(preset);

  const { data, isLoading } = useRevenueOverview({
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  });

  const chartData = (data?.series ?? []).map((point) => ({ label: point.day, value: Number(point.revenue) || 0 }));

  return (
    <Card>
      <CardHeader
        title="Revenue Overview"
        action={
          <Select
            aria-label="Date range"
            value={preset}
            onChange={(event) => setPreset(event.target.value)}
            options={Object.entries(RANGE_PRESETS).map(([value, label]) => ({ value, label }))}
            containerClassName="w-36"
          />
        }
      />
      <div className="border-t border-line p-4">
        {isLoading ? <Skeleton className="h-44 rounded-lg" /> : <BarChart data={chartData} />}
      </div>
    </Card>
  );
};

/** `/operations/maintenance/dashboard/` — total spend for the property scope, no category breakdown available server-side. */
export const MaintenanceSpendCard = () => {
  const { data, isLoading } = useMaintenanceDashboard();

  if (isLoading) return <Skeleton className="h-full min-h-[9rem] rounded-card" />;

  return (
    <Card className="p-4">
      <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50">
        <Wrench className="size-4 text-brand-600" aria-hidden="true" />
      </span>
      <p className="mt-3 font-display text-[26px] font-bold leading-none text-ink">
        {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(data?.totalSpend ?? 0)}
      </p>
      <p className="mt-1.5 text-[12px] text-ink-soft">Maintenance spend this period</p>
      <p className="mt-2 text-[11px] text-ink-muted">
        {data?.openCount ?? 0} open ticket{data?.openCount === 1 ? '' : 's'}
        {data?.avgResolutionHours != null ? ` · ${data.avgResolutionHours}h avg resolution` : ''}
      </p>
    </Card>
  );
};

/** `GET /kyc/full/pending/` + `POST /kyc/full/approve/` — identity/ownership verification queue. */
export const PendingVerificationsCard = () => {
  const { data: verifications = [], isLoading } = useVerifications();
  const { decide, pendingId } = useVerificationDecision();

  return (
    <Card className="flex flex-col">
      <CardHeader title="Pending Verifications" subtitle="Identity & ownership documents awaiting review." />

      {isLoading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : verifications.length ? (
        <ul className="divide-y divide-line border-t border-line">
          {verifications.slice(0, 5).map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-ink">{entry.guest}</p>
                <p className="truncate text-[10.5px] text-ink-muted">
                  {entry.provider} · {formatRelative(entry.createdAt)}
                </p>
              </div>
              <Button
                size="xs"
                variant="subtle"
                isLoading={pendingId === `${entry.id}:Approved`}
                disabled={Boolean(pendingId)}
                leftIcon={<ThumbsUp className="size-3" aria-hidden="true" />}
                onClick={() => decide(entry, 'Approved')}
              >
                Approve
              </Button>
              <Button
                size="xs"
                variant="dangerSoft"
                isLoading={pendingId === `${entry.id}:Rejected`}
                disabled={Boolean(pendingId)}
                leftIcon={<ThumbsDown className="size-3" aria-hidden="true" />}
                onClick={() => decide(entry, 'Rejected')}
              >
                Reject
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<CheckCircle2 className="size-5 text-brand-600" aria-hidden="true" />} title="Nothing pending review" />
      )}
    </Card>
  );
};

/** `/operations/maintenance/tickets/` filtered to open tickets — a shortlist, not the full ticket table. */
export const MaintenanceRequestCard = () => {
  const { data, isFetching } = useMaintenanceTickets({ status: 'open', pageSize: 5 });
  const tickets = data?.items ?? [];

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Maintenance Requests"
        action={
          <Link to={paths.maintenanceTickets} className="shrink-0 text-[11px] font-semibold text-brand-700 hover:underline">
            View all
          </Link>
        }
      />

      {isFetching && !data ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : tickets.length ? (
        <ul className="divide-y divide-line border-t border-line">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-ink">{ticket.category || 'Maintenance ticket'}</p>
                <p className="truncate text-[10.5px] text-ink-muted">{ticket.propertyName}</p>
              </div>
              <Badge variant={PRIORITY_BADGE_VARIANT[ticket.priority] ?? 'neutral'}>{ticket.priority}</Badge>
              <Badge variant={STATUS_BADGE_VARIANT[ticket.status] ?? 'neutral'} dot>
                {TICKET_STATUSES.find((s) => s.value === ticket.status)?.label ?? ticket.status}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<XCircle className="size-5 text-brand-600" aria-hidden="true" />} title="No open maintenance requests" />
      )}
    </Card>
  );
};

/** `GET /admin/announcements/` — real, previously unused fixture-only feature. */
export const AnnouncementsCard = () => {
  const { data: announcements = [], isLoading } = useAnnouncements();

  return (
    <Card className="flex flex-col">
      <CardHeader title="System Announcements" />

      {isLoading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : announcements.length ? (
        <ul className="divide-y divide-line border-t border-line">
          {announcements.slice(0, 3).map((entry) => (
            <li key={entry.id} className="px-4 py-2.5">
              <p className="text-[12.5px] font-semibold text-ink">{entry.title}</p>
              <p className="mt-0.5 text-[11px] text-ink-muted">{entry.body}</p>
              <p className="mt-1 text-[10px] text-ink-muted">{formatDate(entry.createdAt)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No announcements" />
      )}
    </Card>
  );
};
