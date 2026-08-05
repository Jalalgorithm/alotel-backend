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

/** Alert strip + notification tray. */
export const useAlerts = () => {
  const { isAuthenticated, can } = useAuth();

  return useQuery({
    queryKey: [...queryKeys.dashboard.all, 'alerts'],
    queryFn: dashboardService.getAlerts,
    enabled: isAuthenticated && can(CAPABILITIES.bookingsView),
    staleTime: 1000 * 60,
  });
};
