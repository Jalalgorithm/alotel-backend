import { ClipboardList, Clock, HardHat, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency } from '@/utils/format';
import { paths } from '@/routes/paths';
import { useMaintenanceDashboard, useMaintenanceDashboardBreakdown } from '../hooks/useMaintenanceDashboard';

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

const breakdownColumns = [
  { key: 'propertyName', header: 'Property', render: (row) => <span className="font-semibold text-ink">{row.propertyName || row.propertyId}</span> },
  { key: 'openCount', header: 'Open tickets', align: 'right' },
  { key: 'avgResolutionHours', header: 'Avg. resolution', align: 'right', render: (row) => (row.avgResolutionHours != null ? `${row.avgResolutionHours}h` : '—') },
  { key: 'totalSpend', header: 'Total spend', align: 'right', render: (row) => formatCurrency(row.totalSpend ?? 0, 'NGN') },
];

/** Portfolio-wide summary — `GET /operations/maintenance/dashboard/`, no `listing_id` filter. */
export const MaintenanceDashboardPage = () => {
  const { data, isLoading } = useMaintenanceDashboard();
  const { data: breakdown, isLoading: isBreakdownLoading, isError: isBreakdownError } = useMaintenanceDashboardBreakdown();

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

      <Card>
        <CardHeader title="Per-property breakdown" subtitle="Open tickets, resolution time and spend, one row per property." />
        <div className="border-t border-line">
          {isBreakdownError ? (
            <div className="p-4">
              <Alert variant="info">
                Per-property breakdown isn't available yet — it needs a backend endpoint
                (<code>GET /operations/maintenance/dashboard/by-property/</code>) that hasn't been built. Each property's own
                Maintenance tab already shows its correct, individually-scoped ticket list in the meantime.
              </Alert>
            </div>
          ) : (
            <DataTable
              columns={breakdownColumns}
              rows={breakdown ?? []}
              isLoading={isBreakdownLoading}
              emptyTitle="No properties yet"
              emptyDescription="Breakdown rows appear once properties have logged maintenance tickets."
            />
          )}
        </div>
      </Card>
    </div>
  );
};
