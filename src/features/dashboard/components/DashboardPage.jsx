import { format } from 'date-fns';
import { CalendarDays, Clock, Download, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/classNames';
import { StatCard } from './StatCard';
import { QuickActions } from './QuickActions';
import { CheckInsPanel, HousekeeperTasksPanel, RecentBookingsPanel } from './DashboardPanels';
import { AnnouncementsCard, CostBreakdownCard, MaintenanceRequestCard, PendingVerificationsCard, RevenueOverviewCard } from './DashboardWidgets';
import { useDashboardOverview } from '../hooks/useDashboard';
import { useAuth } from '@/features/auth';
import { useBookings } from '@/features/bookings';
import { useProperties } from '@/features/properties';
import { useExportAnalytics } from '@/features/analytics';
import { useLiveClock } from '@/hooks/useLiveClock';
import { CAPABILITIES } from '@/lib/mock/people';

/** Card key → display label, matches `/admin/dashboard/`'s `cards` object exactly. */
const CARD_LABELS = {
  active_bookings: 'Active Bookings',
  occupancy_rate: 'Occupancy Rate',
  revenue_mtd: 'Monthly Revenue',
};

const CARD_ICONS = {
  active_bookings: 'calendar',
  occupancy_rate: 'gauge',
  revenue_mtd: 'wallet',
};

/** The 3 headline cards shown alongside the Total Properties tile — matches the dashboard mockup's 4-tile row exactly. */
const PRIMARY_CARD_ORDER = ['active_bookings', 'occupancy_rate', 'revenue_mtd'];

/**
 * Month-over-month deltas the mockup shows on every KPI tile. `/admin/dashboard/`
 * has no comparable-period figure yet (flagged to the backend as a real gap —
 * see the handoff notes), so these are clearly-placeholder numbers, not derived
 * from anything real, kept only so the tiles read the way the design intends.
 */
const MOCK_DELTAS = {
  properties: '+12% this month',
  active_bookings: '+18% this week',
  occupancy_rate: '+18% vs last month',
  revenue_mtd: '+22% vs last month',
};

const today = () => new Date().toISOString().slice(0, 10);

const toBookingRow = (booking) => ({
  id: booking.id,
  guest: booking.guestName,
  property: booking.propertyName,
  status: booking.statusLabel,
  amount: booking.total,
  currency: booking.currency,
  checkIn: booking.checkIn,
  checkOut: booking.checkOut,
});

const toCheckInEntry = (booking) => ({
  id: booking.id,
  guest: booking.guestName,
  property: booking.propertyName,
  time: booking.checkIn,
});

/**
 * Landing screen. Renders one of three shapes depending on
 * `/admin/dashboard/`'s role-based response: Super Admin gets the full 4-tile
 * KPI row + financials, Facility Manager gets the same layout minus anything
 * `financeView`-gated, Housekeeper gets today's task list (no guest PII, so no
 * booking panels for that role).
 */
export const DashboardPage = () => {
  const { user, can } = useAuth();
  const { data, isLoading } = useDashboardOverview();
  const { exportReport, isPending: isExporting } = useExportAnalytics();

  const role = data?.role;
  const isHousekeeper = role === 'housekeeper';
  const primaryCards = data?.cards
    ? PRIMARY_CARD_ORDER.filter((key) => key in data.cards).map((key) => [key, data.cards[key]])
    : [];
  const occupancyCard = data?.cards?.occupancy_rate;

  // Recent bookings / today's arrivals reuse the already-real bookings admin list —
  // Housekeepers can't call it (IsLevel1Or2), so these stay disabled for that role.
  const canSeeBookings = !isLoading && !isHousekeeper;
  const { data: recentBookings } = useBookings({ pageSize: 5 }, { enabled: canSeeBookings });
  const { data: arrivals } = useBookings(
    { status: 'confirmed', checkInFrom: today(), checkInTo: today(), pageSize: 5 },
    { enabled: canSeeBookings },
  );

  const canSeeProperties = !isLoading && !isHousekeeper && can(CAPABILITIES.propertiesView);
  const { data: propertyTotals } = useProperties({ pageSize: 1 }, { enabled: canSeeProperties });

  const canSeeRevenue = !isLoading && can(CAPABILITIES.financeView);
  const canSeeMaintenance = !isLoading && can(CAPABILITIES.maintenanceView);
  const canSeeVerifications = !isLoading && can(CAPABILITIES.bookingsManage);

  const now = useLiveClock();

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
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-muted tabular-nums">
              <Clock className="size-3.5" aria-hidden="true" />
              {format(now, 'h:mma')}
            </span>
          </>
        }
        actions={
          !isHousekeeper &&
          can(CAPABILITIES.analyticsView) && (
            <>
              <Button
                variant="secondary"
                leftIcon={<FileText className="size-3.5" aria-hidden="true" />}
                isLoading={isExporting}
                onClick={() => exportReport({ format: 'pdf' })}
              >
                Generate Report
              </Button>
              <Button
                variant="primary"
                leftIcon={<Download className="size-3.5" aria-hidden="true" />}
                isLoading={isExporting}
                onClick={() => exportReport({ format: 'csv' })}
              >
                Export Data
              </Button>
            </>
          )
        }
      />

      {isHousekeeper ? (
        <HousekeeperTasksPanel
          tasks={(data?.tasks ?? []).map((task) => ({
            id: task.id,
            taskType: task.task_type,
            status: task.status,
            notes: task.notes,
          }))}
        />
      ) : (
        <>
          {/* KPI row — Total Properties + the 3 headline cards, each with the mockup's delta. */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }, (_, index) => <CardSkeleton key={index} />)
            ) : (
              <>
                {canSeeProperties && (
                  <StatCard
                    label="Total Properties"
                    value={propertyTotals?.total ?? '—'}
                    delta={MOCK_DELTAS.properties}
                    icon="building"
                  />
                )}
                {primaryCards.map(([key, card]) => (
                  <StatCard
                    key={key}
                    label={CARD_LABELS[key] ?? key}
                    value={card.unit === '%' ? `${card.value}%` : card.value}
                    delta={MOCK_DELTAS[key]}
                    icon={CARD_ICONS[key]}
                  />
                ))}
              </>
            )}
          </section>

          <QuickActions />

          {/* Recent Bookings + Revenue Overview + Cost Breakdown — one row, matching the mockup's proportions. */}
          <section className={cn('grid grid-cols-1 gap-4', canSeeRevenue && 'xl:grid-cols-[1.4fr_1fr_0.9fr]')}>
            {isLoading ? (
              <>
                <Skeleton className="h-64 rounded-card xl:col-span-3" />
              </>
            ) : (
              <>
                <RecentBookingsPanel bookings={(recentBookings?.items ?? []).map(toBookingRow)} />
                {canSeeRevenue && (
                  <>
                    <RevenueOverviewCard />
                    <CostBreakdownCard occupancyValue={occupancyCard ? `${occupancyCard.value}%` : undefined} />
                  </>
                )}
              </>
            )}
          </section>

          {/* Check-ins Today / Pending Verifications / Maintenance Requests / System Announcements — one row. */}
          {!isLoading && (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <CheckInsPanel checkIns={(arrivals?.items ?? []).map(toCheckInEntry)} />
              {canSeeVerifications && <PendingVerificationsCard />}
              {canSeeMaintenance && <MaintenanceRequestCard />}
              <AnnouncementsCard />
            </section>
          )}
        </>
      )}
    </div>
  );
};
