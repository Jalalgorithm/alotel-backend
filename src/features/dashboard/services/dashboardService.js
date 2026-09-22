import { apiClient } from '@/lib/apiClient';

/**
 * `GET /admin/dashboard/` — one role-based payload, not three separate
 * overview/badges/alerts endpoints (those don't exist server-side). Shape:
 *   Super Admin / Facility Manager: `{ role, cards: { <key>: { value, unit?, sub_text } } }`
 *   Housekeeper: `{ role, today, tasks: [{ id, property_id, task_type, status, due_date, notes }] }`
 */
export const dashboardService = {
  /** `GET /admin/dashboard/` */
  getOverview: async () => (await apiClient.get('/admin/dashboard/')).data,

  /**
   * `GET /admin/dashboard/revenue-overview/` — one endpoint, two shapes via `granularity`:
   *   'weekday' (default) — Mon–Sun totals for the given date range, summed across currencies.
   *   'monthly' — one row per calendar month. Never summed across currencies (this system
   *   settles in 5 real currencies with no conversion anywhere) — pass `currency` to narrow
   *   to a single reporting currency (`revenue` per row), or omit it for a `by_currency`
   *   breakdown per row. Super Admin only (`IsLevel1`).
   */
  getRevenueOverview: async ({ startDate, endDate, granularity, currency } = {}) => {
    const { data } = await apiClient.get('/admin/dashboard/revenue-overview/', {
      params: {
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
        ...(granularity ? { granularity } : {}),
        ...(currency ? { currency } : {}),
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
  getCostBreakdown: async ({ startDate, endDate } = {}) => {
    const { data } = await apiClient.get('/admin/dashboard/cost-breakdown/', {
      params: {
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      },
    });
    return data;
  },

  /**
   * `GET /admin/dashboard/badges/` — sidebar nav counts. No `units` key —
   * no Units feature exists server-side, and `Sidebar.jsx` only renders a
   * badge when its count is `> 0`, so leaving it absent here is a no-op
   * there rather than needing an invented `0`.
   *
   * `properties` and `reviews` are also deliberately dropped even though the
   * endpoint returns them: per the backend's own docstring they're catalog
   * totals (`Property.objects.count()` / `Review.objects.count()`), not a
   * "needs attention" queue — showing a raw total as a nav badge would be
   * misleading, not useful, so `navigation.js` no longer wires a badge to
   * either item and there's nothing for this service to return for them.
   */
  getBadges: async () => {
    const { data } = await apiClient.get('/admin/dashboard/badges/');
    return {
      bookings: data?.bookings,
      checkins: data?.checkins,
      checkoutReports: data?.checkout_reports,
      contracts: data?.contracts,
      housekeeping: data?.housekeeping,
      payments: data?.payments,
    };
  },
};
