import { ClipboardList, Clock, HardHat, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import { paths } from '@/routes/paths';
import { useMaintenanceDashboard } from '../hooks/useMaintenanceDashboard';

const StatCard = ({ icon: Icon, label, value }) => (
  <Card className="flex items-center gap-3 p-4">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
      <Icon className="size-4.5" aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">{label}</p>
      <p className="truncate text-[17px] font-semibold text-ink">{value}</p>
    </div>
  </Card>
);

/** Portfolio-wide summary — `GET /operations/maintenance/dashboard/`, no `listing_id` filter. */
export const MaintenanceDashboardPage = () => {
  const { data, isLoading } = useMaintenanceDashboard();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Maintenance"
        subtitle="Worker/vendor oversight and ticket status across the portfolio."
        actions={
          <>
            <Button to={paths.maintenanceWorkers} leftIcon={<HardHat className="size-3.5" aria-hidden="true" />}>Worker directory</Button>
            <Button variant="primary" to={paths.maintenanceTickets} leftIcon={<Wrench className="size-3.5" aria-hidden="true" />}>All tickets</Button>
          </>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={ClipboardList} label="Open tickets" value={data?.openCount ?? 0} />
          <StatCard icon={Clock} label="Avg. resolution time" value={data?.avgResolutionHours != null ? `${data.avgResolutionHours}h` : '—'} />
          <StatCard icon={Wrench} label="Total spend" value={formatCurrency(data?.totalSpend ?? 0, 'NGN')} />
        </div>
      )}
    </div>
  );
};
