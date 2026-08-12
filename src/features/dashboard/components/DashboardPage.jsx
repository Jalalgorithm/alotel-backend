import { format } from 'date-fns';
import { CalendarDays, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from './StatCard';
import { QuickActions } from './QuickActions';
import { AlertStrip, CheckInsPanel, HousekeeperTasksPanel, RecentBookingsPanel } from './DashboardPanels';
import { useAlerts, useDashboardOverview } from '../hooks/useDashboard';
import { useAuth } from '@/features/auth';
import { useBookings } from '@/features/bookings';

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

/** Order the cards render in — the API returns an object, not an array, so the order isn't guaranteed. */
const CARD_ORDER = [
  'active_bookings',
  'occupancy_rate',
  'revenue_mtd',
  'pending_checkins',
  'pending_checkouts',
  'unresolved_issues',
  'properties_created',
  'staff_count',
  'users_count',
];

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
  const { user } = useAuth();
  const { data, isLoading } = useDashboardOverview();
  const { data: alerts = [] } = useAlerts();

  const role = data?.role;
  const isHousekeeper = role === 'housekeeper';
  const cardEntries = data?.cards
    ? CARD_ORDER.filter((key) => key in data.cards).map((key) => [key, data.cards[key]])
    : [];

  // Recent bookings / today's arrivals reuse the already-real bookings admin list —
  // Housekeepers can't call it (IsLevel1Or2), so these stay disabled for that role.
  const canSeeBookings = !isLoading && !isHousekeeper;
  const { data: recentBookings } = useBookings({ pageSize: 5 }, { enabled: canSeeBookings });
  const { data: arrivals } = useBookings(
    { status: 'confirmed', checkInFrom: today(), checkInTo: today(), pageSize: 5 },
    { enabled: canSeeBookings },
  );

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
      />

      <AlertStrip alerts={alerts} />

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
          {/* KPI row — 9 cards for Super Admin, 4 for Facility Manager; whichever the API actually returned. */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }, (_, index) => <CardSkeleton key={index} />)
              : cardEntries.map(([key, card]) => (
                  <StatCard
                    key={key}
                    label={CARD_LABELS[key] ?? key}
                    value={card.unit === '%' ? `${card.value}%` : card.value}
                    subtext={card.sub_text}
                    icon={CARD_ICONS[key]}
                  />
                ))}
          </section>

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
                <CheckInsPanel checkIns={(arrivals?.items ?? []).map(toCheckInEntry)} />
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
};
