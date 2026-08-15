import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
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

/**
 * Sidebar counters.
 *
 * Only fetched for roles that can see at least the dashboard — a Level 3
 * cleaner has no business pulling portfolio-wide counts.
 */
export const useNavBadges = () => {
  const { isAuthenticated, can } = useAuth();

  return useQuery({
    queryKey: [...queryKeys.dashboard.all, 'badges'],
    queryFn: dashboardService.getBadges,
    enabled: isAuthenticated && can(CAPABILITIES.dashboardView),
    staleTime: 1000 * 60,
  });
};
