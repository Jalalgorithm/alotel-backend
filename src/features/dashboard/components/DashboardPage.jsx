import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Clock, Download, FileBarChart } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ProgressRow } from '@/components/ui/Progress';
import { BarChart, DonutChart } from '@/components/charts';
import { StatCard } from './StatCard';
import { QuickActions } from './QuickActions';
import {
  AlertStrip,
  AnnouncementsPanel,
  CheckInsPanel,
  MaintenancePanel,
  RecentBookingsPanel,
  VerificationsPanel,
} from './DashboardPanels';
import { useAlerts, useDashboardOverview } from '../hooks/useDashboard';
import { useVerificationDecision } from '../hooks/useVerificationDecision';
import { useAuth } from '@/features/auth';

/** Landing screen — mirrors the Figma "Dashboard Overview". */
export const DashboardPage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useDashboardOverview();
  const { data: alerts = [] } = useAlerts();
  const { decide, pendingId } = useVerificationDecision();

  const [revenueRange, setRevenueRange] = useState('Weekly');
  const now = new Date();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard Overview"
        subtitle={`Welcome back, ${user?.name?.split(' ')[0] ?? 'Admin'}. Here's what's happening with your properties today.`}
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-muted">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {format(now, 'EEEE, MMM d, yyyy')}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-muted">
              <Clock className="size-3.5" aria-hidden="true" />
              {format(now, 'h:mma')}
            </span>
          </>
        }
        actions={
          <>
            <Button variant="primary" leftIcon={<FileBarChart className="size-3.5" aria-hidden="true" />}>
              Generate Report
            </Button>
            <Button leftIcon={<Download className="size-3.5" aria-hidden="true" />}>Export Data</Button>
          </>
        }
      />

      <AlertStrip alerts={alerts} />

      {/* KPI row */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => <CardSkeleton key={index} />)
          : data.stats.map((stat) => <StatCard key={stat.id} {...stat} />)}
      </section>

      <QuickActions />

      {/* Bookings + charts.
          Three-up only from 2xl: at 1280–1535 the table's columns get squeezed
          into wrapping, so the donut drops to its own row instead. */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
        {isLoading ? (
          <>
            <Skeleton className="h-64 rounded-card xl:col-span-2 2xl:col-span-1" />
            <Skeleton className="h-64 rounded-card" />
            <Skeleton className="h-64 rounded-card" />
          </>
        ) : (
          <>
            {/* Full width until 2xl — six columns need the room to avoid
                horizontal scrolling inside the card. */}
            <div className="min-w-0 xl:col-span-2 2xl:col-span-1">
              <RecentBookingsPanel bookings={data.recentBookings} />
            </div>

            <Card className="flex flex-col">
              <CardHeader
                title="Revenue Overview"
                action={
                  <Select
                    value={revenueRange}
                    onChange={(event) => setRevenueRange(event.target.value)}
                    options={['Weekly', 'Monthly', 'Quarterly']}
                    className="h-8 w-28 text-[11px]"
                    aria-label="Revenue range"
                  />
                }
              />
              <div className="px-4 pb-4">
                <BarChart
                  data={data.revenueByDay}
                  highlightIndex={3}
                  formatValue={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(value % 1000 ? 1 : 0)}k` : value}`}
                />
              </div>
            </Card>

            <Card className="flex flex-col">
              <CardHeader title="Cost Breakdown" action={<span className="text-[11px] text-ink-muted">This month</span>} />
              <div className="px-4 pb-4">
                <DonutChart
                  data={data.costBreakdown}
                  centerValue="68%"
                  centerLabel="Total occupancy"
                  size={148}
                />
              </div>
            </Card>
          </>
        )}
      </section>

      {/* Occupancy */}
      {!isLoading && (
        <Card>
          <CardHeader title="Occupancy by Region" subtitle="Share of available nights sold, last 30 days" />
          <div className="space-y-2.5 px-4 pb-4">
            {data.occupancyByRegion.map((region) => (
              <ProgressRow key={region.label} label={region.label} value={region.value} />
            ))}
          </div>
        </Card>
      )}

      {/* Operational panels */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-56 rounded-card" />)
        ) : (
          <>
            <CheckInsPanel checkIns={data.checkInsToday} />
            <VerificationsPanel
              verifications={data.verifications}
              onDecision={decide}
              pendingId={pendingId}
            />
            <MaintenancePanel requests={data.maintenance} />
            <AnnouncementsPanel announcements={data.announcements} />
          </>
        )}
      </section>
    </div>
  );
};
