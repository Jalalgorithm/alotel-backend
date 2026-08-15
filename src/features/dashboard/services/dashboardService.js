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

  /** Backs the Revenue Overview chart when `VITE_USE_MOCK_DASHBOARD=true`. */
  async revenueOverview() {
    await delay(300);
    return clone({
      start_date: null,
      end_date: null,
      series: [
        { day: 'Mon', revenue: '1200.00' },
        { day: 'Tue', revenue: '1450.00' },
        { day: 'Wed', revenue: '980.00' },
        { day: 'Thu', revenue: '1600.00' },
        { day: 'Fri', revenue: '2100.00' },
        { day: 'Sat', revenue: '2450.00' },
        { day: 'Sun', revenue: '1800.00' },
      ],
    });
  },

  /** Backs the Cost Breakdown donut when `VITE_USE_MOCK_DASHBOARD=true` — reuses the existing category-split fixture. */
  async costBreakdown() {
    await delay(280);
    return clone({
      period_start: null,
      period_end: null,
      breakdown: costBreakdown.map((entry) => ({ category: entry.label, amount: String(entry.value) })),
    });
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

  /** `GET /admin/dashboard/revenue-overview/` — Mon–Sun totals for the given date range. */
  revenueOverview: async ({ startDate, endDate } = {}) => {
    const { data } = await apiClient.get('/admin/dashboard/revenue-overview/', {
      params: {
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      },
    });
    return data;
  },

  /**
   * `GET /admin/dashboard/cost-breakdown/` — spend by category, defaulting to
   * month-to-date. Maintenance is derived server-side from ticket costs;
   * Operation/Staff/Marketing/Others come from the manual `ExpenseEntry` log
   * (`financeService.getExpenses`/`createExpense`).
   */
  costBreakdown: async ({ startDate, endDate } = {}) => {
    const { data } = await apiClient.get('/admin/dashboard/cost-breakdown/', {
      params: {
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      },
    });
    return data;
  },
};

const dashboardBackend = env.useMockDashboard ? mockDashboard : realDashboard;

export const dashboardService = {
  /** Real `/admin/dashboard/` — see `realDashboard.overview` for the exact shape. */
  getOverview: () => dashboardBackend.overview(),

  /** Real `/admin/dashboard/revenue-overview/` — see `realDashboard.revenueOverview` for the exact shape. */
  getRevenueOverview: (params) => dashboardBackend.revenueOverview(params),

  /** Real `/admin/dashboard/cost-breakdown/` — see `realDashboard.costBreakdown` for the exact shape. */
  getCostBreakdown: (params) => dashboardBackend.costBreakdown(params),

  /**
   * Sidebar counters have no backend equivalent yet (there's no
   * `/dashboard/badges` endpoint) — always mock, independent of
   * `VITE_USE_MOCK_DASHBOARD`, until each counter has a real source to derive from.
   */
  getBadges: () => mockDashboard.badges(),
};
