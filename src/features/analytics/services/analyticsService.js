import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { clone, delay } from '@/lib/mock/utils';
import { analyticsKpis, channelMix, durationMix, occupancyByRegion, reviewBreakdown } from '@/lib/mock/system';
import { revenueByMonth } from '@/lib/mock/finance';

const mockAnalytics = {
  async kpis(filters = {}) {
    await delay(380);

    return clone({
      filters,
      kpis: analyticsKpis,
      reviewBreakdown,
      channelMix,
      durationMix,
      occupancyByRegion,
      revenueByMonth,
    });
  },
};

const realAnalytics = {
  kpis: async (filters) => (await apiClient.get('/analytics', { params: filters })).data,
};

const backend = env.useMock ? mockAnalytics : realAnalytics;

export const analyticsService = {
  getKpis: (filters) => backend.kpis(filters),
};
