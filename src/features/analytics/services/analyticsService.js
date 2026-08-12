import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { clone, delay } from '@/lib/mock/utils';
import { analyticsKpis, channelMix, durationMix, occupancyByRegion, reviewBreakdown } from '@/lib/mock/system';
import { revenueByMonth } from '@/lib/mock/finance';

const mockAnalytics = {
  async kpis() {
    await delay(380);

    return clone({
      kpis: analyticsKpis,
      reviewBreakdown,
      channelMix,
      durationMix,
      occupancyByRegion,
      revenueByMonth,
    });
  },

  async export() {
    await delay(300);
    return new Blob(['mock export — not wired'], { type: 'text/plain' });
  },
};

/**
 * `GET /analytics/kpis/` already returns the full metrics bundle in one call
 * (occupancy, ADR/RevPAR, conversion, lead time, ALOS, cancellation/refund
 * rate, listing views, channel mix, review score + trend, revenue growth,
 * turnover efficiency) — the other seven `/analytics/*` endpoints are just
 * narrower subsets of this same data, so one request covers the whole page.
 */
const realAnalytics = {
  kpis: async ({ range, country, propertyId, currency } = {}) => {
    const { data } = await apiClient.get('/analytics/kpis/', {
      params: {
        ...(range ? { range } : {}),
        ...(country && country !== 'All' ? { country } : {}),
        ...(propertyId ? { property_id: propertyId } : {}),
        ...(currency ? { currency } : {}),
      },
    });
    return data;
  },

  /** `POST /analytics/export/` — returns a real file (CSV or PDF), not JSON. */
  export: async ({ format = 'csv', range, country, currency } = {}) => {
    const { data } = await apiClient.post(
      '/analytics/export/',
      { format, ...(range ? { range } : {}), ...(country && country !== 'All' ? { country } : {}), ...(currency ? { currency } : {}) },
      { responseType: 'blob' },
    );
    return data;
  },
};

const backend = env.useMockAnalytics ? mockAnalytics : realAnalytics;

export const analyticsService = {
  getKpis: (filters) => backend.kpis(filters),
  exportReport: (params) => backend.export(params),
};
