import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { spaceService } from '@/features/spaces';
import { maintenanceService } from '@/features/maintenance';
import { useUnreadCount } from '@/features/notifications';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';

/** Everything the dashboard screen renders. */
export const useDashboardOverview = () =>
  useQuery({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: dashboardService.getOverview,
  });

/** Revenue Overview chart — Mon–Sun totals for a given `{ startDate, endDate }` range. */
export const useRevenueOverview = (params = {}) =>
  useQuery({
    queryKey: queryKeys.dashboard.revenueOverview(params),
    queryFn: () => dashboardService.getRevenueOverview(params),
  });

/** Cost Breakdown donut — spend by category for a given `{ startDate, endDate }` range (defaults to month-to-date). */
export const useCostBreakdown = (params = {}) =>
  useQuery({
    queryKey: queryKeys.dashboard.costBreakdown(params),
    queryFn: () => dashboardService.getCostBreakdown(params),
  });

/**
 * Sidebar counters.
 *
 * Composed from several real "needs attention" counts, each gated on the
 * capability its own nav item requires — a role without Spaces/Maintenance
 * access never fires that fetch, and a Level 3 cleaner (no `dashboardView`)
 * skips the portfolio-wide dashboard badges entirely, same as before.
 */
export const useNavBadges = () => {
  const { isAuthenticated, can } = useAuth();

  const canDashboard = isAuthenticated && can(CAPABILITIES.dashboardView);
  const canApprovals = isAuthenticated && can(CAPABILITIES.spacesBookingsManage);
  const canMaintenance = isAuthenticated && can(CAPABILITIES.maintenanceView);

  const dashboardBadges = useQuery({
    queryKey: [...queryKeys.dashboard.all, 'badges'],
    queryFn: dashboardService.getBadges,
    enabled: canDashboard,
    staleTime: 1000 * 60,
  });

  /** Same data `SpaceApprovalQueuePage` fetches — just the total, not the list. */
  const spaceApprovals = useQuery({
    queryKey: queryKeys.spaces.approvalQueue({ pageSize: 1 }),
    queryFn: () => spaceService.getApprovalQueue({ pageSize: 1 }),
    enabled: canApprovals,
    staleTime: 1000 * 60,
  });

  /** Same data the Dashboard's open-tickets card fetches — just the total. */
  const openTickets = useQuery({
    queryKey: queryKeys.maintenanceOps.tickets({ status: 'open', pageSize: 1 }),
    queryFn: () => maintenanceService.getTickets({ status: 'open', pageSize: 1 }),
    enabled: canMaintenance,
    staleTime: 1000 * 60,
  });

  /** The exact same hook (and cache entry) the Topbar bell already uses. */
  const unread = useUnreadCount();

  return {
    data: {
      ...dashboardBadges.data,
      spaceApprovals: spaceApprovals.data?.total,
      maintenanceTickets: openTickets.data?.total,
      notifications: unread.data,
    },
    isLoading: dashboardBadges.isLoading,
  };
};
