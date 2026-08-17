import { apiClient } from '@/lib/apiClient';

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

export const analyticsService = {
  getKpis: (filters) => realAnalytics.kpis(filters),
  exportReport: (params) => realAnalytics.export(params),
};
