import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';
import { queryKeys } from '@/lib/queryKeys';

/** KPI set for the selected country + period. */
export const useAnalytics = (filters = {}) =>
  useQuery({
    queryKey: queryKeys.analytics.kpis(filters),
    queryFn: () => analyticsService.getKpis(filters),
    placeholderData: keepPreviousData,
  });
