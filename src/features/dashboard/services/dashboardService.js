import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { clone, delay } from '@/lib/mock/utils';
import { dashboardStats, occupancyByRegion } from '@/lib/mock/system';
import { costBreakdown, payments, revenueByDay } from '@/lib/mock/finance';
import {
  announcements,
  bookings,
  checkInsToday,
  maintenanceRequests,
  verifications,
  checkoutReports,
} from '@/lib/mock/operations';
import { properties, propertyReviews, units } from '@/lib/mock/catalogue';

/** Everything the dashboard and the shell chrome need. */
const mockDashboard = {
  async overview() {
    await delay(350);

    return clone({
      stats: dashboardStats,
      recentBookings: bookings.slice(0, 3),
      revenueByDay,
      costBreakdown,
      occupancyByRegion,
      checkInsToday,
      verifications: verifications.filter((entry) => entry.status === 'Pending'),
      maintenance: maintenanceRequests.filter((entry) => entry.status !== 'Resolved').slice(0, 4),
      announcements,
    });
  },

  /**
   * Sidebar counters. Derived from the same collections the screens render, so
   * a badge can never disagree with the list it points at.
   */
  async badges() {
    await delay(120);

    return {
      properties: properties.filter((entry) => entry.status === 'Live').length,
      units: units.filter((entry) => entry.status === 'Needs Cleaning').length,
      reviews: propertyReviews.filter((entry) => entry.status === 'Pending').length,
      bookings: bookings.filter((entry) => ['Pending KYC', 'Awaiting Sign'].includes(entry.status)).length,
      checkins: checkInsToday.length,
      checkoutReports: checkoutReports.filter((entry) => entry.status === 'Pending Review').length,
      contracts: bookings.filter((entry) => ['Overdue', 'Not sent'].includes(entry.contract)).length,
      housekeeping: units.filter((entry) => ['Needs Cleaning', 'Maintenance'].includes(entry.status)).length,
      payments: payments.filter((entry) => entry.status === 'Due').length,
    };
  },

  /** The notification tray + the alert strip above the dashboard. */
  async alerts() {
    await delay(150);

    const pendingKyc = bookings.filter((entry) => entry.kyc === 'Pending');
    const overdueContracts = bookings.filter((entry) => entry.contract === 'Overdue');
    const depositReviews = checkoutReports.filter((entry) => entry.status === 'Pending Review');

    return clone([
      ...overdueContracts.map((booking) => ({
        id: `alert-contract-${booking.id}`,
        tone: 'danger',
        title: `Contract overdue — ${booking.guest}`,
        description: `${booking.property} · sent over 72h ago`,
        action: 'Re-send',
        to: '/contracts',
        at: '2026-08-03T18:05:00.000Z',
      })),
      ...pendingKyc.map((booking) => ({
        id: `alert-kyc-${booking.id}`,
        tone: 'warn',
        title: `KYC pending — ${booking.guest}`,
        description: `${booking.property} · check-in ${booking.checkIn}`,
        action: 'Send reminder',
        to: '/bookings',
        at: '2026-08-04T07:30:00.000Z',
      })),
      ...depositReviews.map((report) => ({
        id: `alert-deposit-${report.id}`,
        tone: 'info',
        title: 'Deposit review ready',
        description: `${report.property} · 24h window closing`,
        action: 'Review now',
        to: '/checkout-reports',
        at: '2026-08-04T06:00:00.000Z',
      })),
    ]);
  },
};

/**
 * `GET /admin/dashboard/` — one role-based payload, not three separate
 * overview/badges/alerts endpoints (those don't exist server-side). Shape:
 *   Super Admin / Facility Manager: `{ role, cards: { <key>: { value, unit?, sub_text } } }`
 *   Housekeeper: `{ role, today, tasks: [{ id, property_id, task_type, status, due_date, notes }] }`
 */
const realDashboard = {
  overview: async () => (await apiClient.get('/admin/dashboard/')).data,
};

const dashboardBackend = env.useMockDashboard ? mockDashboard : realDashboard;

export const dashboardService = {
  /** Real `/admin/dashboard/` — see `realDashboard.overview` for the exact shape. */
  getOverview: () => dashboardBackend.overview(),

  /**
   * Sidebar counters and the alert tray have no backend equivalent yet
   * (there's no `/dashboard/badges` or `/dashboard/alerts` endpoint) — always
   * mock, independent of `VITE_USE_MOCK_DASHBOARD`, until each counter has a
   * real source to derive from.
   */
  getBadges: () => mockDashboard.badges(),
  getAlerts: () => mockDashboard.alerts(),
};
