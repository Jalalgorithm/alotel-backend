import { useState } from 'react';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subWeeks } from 'date-fns';
import { Link } from 'react-router-dom';
import { CheckCircle2, Megaphone, Plus, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { BarChart, DonutChart } from '@/components/charts';
import { formatDate, formatRelative } from '@/utils/format';
import { paths } from '@/routes/paths';
import { PRIORITY_BADGE_VARIANT } from '@/lib/maintenanceSchema';
import { useMaintenanceTickets } from '@/features/maintenance';
import { useAnnouncements } from '@/features/system';
import { LogExpenseModal } from '@/features/finance';
import { useCostBreakdown, useRevenueOverview } from '../hooks/useDashboard';
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

/**
 * Cost Breakdown donut — `GET /admin/dashboard/cost-breakdown/`, month-to-date
 * spend by category. Maintenance is derived server-side from ticket costs;
 * everything else comes from the manually-logged `ExpenseEntry` model. The
 * centre figure is real too — it's the dashboard's own occupancy rate.
 */
export const CostBreakdownCard = ({ occupancyValue }) => {
  const [isLogging, setIsLogging] = useState(false);
  const { data, isLoading } = useCostBreakdown();
  const chartData = (data?.breakdown ?? []).map((entry) => ({ label: entry.category, value: Number(entry.amount) || 0 }));

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Cost Breakdown"
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsLogging(true)}
              className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline"
            >
              <Plus className="size-3" aria-hidden="true" /> Log expense
            </button>
            <Link to={paths.revenue} className="shrink-0 text-[11px] font-semibold text-brand-700 hover:underline">
              See Details
            </Link>
          </div>
        }
      />
      <div className="flex-1 px-4 pb-4">
        {isLoading ? (
          <Skeleton className="h-36 rounded-lg" />
        ) : (
          <DonutChart data={chartData} centerValue={occupancyValue ?? '—'} centerLabel="Total occupancy" size={148} />
        )}
      </div>

      <LogExpenseModal isOpen={isLogging} onClose={() => setIsLogging(false)} />
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
              <Badge variant={PRIORITY_BADGE_VARIANT[ticket.priority] ?? 'neutral'} className="capitalize">
                {ticket.priority}
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
          {announcements.slice(0, 4).map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 px-4 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <Megaphone className="size-3.5 text-brand-600" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-ink">{entry.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-ink-muted">{entry.body}</p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[10px] text-ink-muted">{formatDate(entry.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No announcements" />
      )}
    </Card>
  );
};
