import { format } from 'date-fns';
import { CalendarDays, Clock, Download, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { StatCard } from './StatCard';
import { QuickActions } from './QuickActions';
import { CheckInsPanel, HousekeeperTasksPanel, RecentBookingsPanel } from './DashboardPanels';
import { AnnouncementsCard, MaintenanceRequestCard, MaintenanceSpendCard, PendingVerificationsCard, RevenueOverviewCard } from './DashboardWidgets';
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
  revenue_mtd: 'Revenue (MTD)',
  pending_checkins: 'Pending Check-ins',
  pending_checkouts: 'Pending Check-outs',
  unresolved_issues: 'Unresolved Issues',
  properties_created: 'Properties Created',
  staff_count: 'Staff Count',
  users_count: 'Registered Users',
};

const CARD_ICONS = {
  active_bookings: 'calendar',
  occupancy_rate: 'gauge',
  revenue_mtd: 'wallet',
  pending_checkins: 'calendar',
  pending_checkouts: 'calendar',
  unresolved_issues: 'building',
  properties_created: 'building',
  staff_count: 'building',
  users_count: 'building',
};

/** The 3 headline cards shown in the primary KPI row (alongside the Total Properties tile) — the rest render in a secondary row. */
const PRIMARY_CARD_ORDER = ['active_bookings', 'occupancy_rate', 'revenue_mtd'];
const SECONDARY_CARD_ORDER = ['pending_checkins', 'pending_checkouts', 'unresolved_issues', 'properties_created', 'staff_count', 'users_count'];

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
 * `/admin/dashboard/`'s role-based response: Super Admin gets 9 KPI cards,
 * Facility Manager gets 4 operational cards (no financials), Housekeeper
 * gets today's task list (no guest PII, so no booking panels for that role).
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
  const secondaryCards = data?.cards
    ? SECONDARY_CARD_ORDER.filter((key) => key in data.cards).map((key) => [key, data.cards[key]])
    : [];

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
              {format(now, 'h:mm:ssa')}
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
          {/* Primary KPI row — Total Properties + the 3 headline cards the screenshot shows. */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }, (_, index) => <CardSkeleton key={index} />)
            ) : (
              <>
                {canSeeProperties && (
                  <StatCard label="Total Properties" value={propertyTotals?.total ?? '—'} icon="building" />
                )}
                {primaryCards.map(([key, card]) => (
                  <StatCard
                    key={key}
                    label={CARD_LABELS[key] ?? key}
                    value={card.unit === '%' ? `${card.value}%` : card.value}
                    subtext={card.sub_text}
                    icon={CARD_ICONS[key]}
                  />
                ))}
              </>
            )}
          </section>

          {/* Secondary operational cards — real, just not part of the screenshot's headline row. */}
          {!isLoading && secondaryCards.length > 0 && (
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {secondaryCards.map(([key, card]) => (
                <StatCard
                  key={key}
                  label={CARD_LABELS[key] ?? key}
                  value={card.unit === '%' ? `${card.value}%` : card.value}
                  subtext={card.sub_text}
                  icon={CARD_ICONS[key]}
                  className="p-3.5"
                />
              ))}
            </section>
          )}

          <QuickActions />

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {isLoading ? (
              <>
                <Skeleton className="h-64 rounded-card" />
                <Skeleton className="h-64 rounded-card" />
              </>
            ) : (
              <>
                <RecentBookingsPanel bookings={(recentBookings?.items ?? []).map(toBookingRow)} />
                {canSeeRevenue ? <RevenueOverviewCard /> : <CheckInsPanel checkIns={(arrivals?.items ?? []).map(toCheckInEntry)} />}
              </>
            )}
          </section>

          {!isLoading && (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {canSeeMaintenance && <MaintenanceSpendCard />}
              {canSeeRevenue && <CheckInsPanel checkIns={(arrivals?.items ?? []).map(toCheckInEntry)} />}
              {canSeeVerifications && <PendingVerificationsCard />}
            </section>
          )}

          {!isLoading && (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {canSeeMaintenance && <MaintenanceRequestCard />}
              <AnnouncementsCard />
            </section>
          )}
        </>
      )}
    </div>
  );
};
