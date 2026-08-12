import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

/** KPI set for the selected country + period. */
export const useAnalytics = (filters = {}) =>
  useQuery({
    queryKey: queryKeys.analytics.kpis(filters),
    queryFn: () => analyticsService.getKpis(filters),
    placeholderData: keepPreviousData,
  });

/** Downloads the CSV/PDF export and saves it via the browser — the API returns a real file, not JSON. */
export const useExportAnalytics = () => {
  const mutation = useMutation({
    mutationFn: analyticsService.exportReport,
    onSuccess: (blob, { format = 'csv' } = {}) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-export.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Export ready', `Downloaded as ${format.toUpperCase()}`);
    },
    onError: (error) => toast.error('Could not export analytics', getErrorMessage(error)),
  });

  return { exportReport: mutation.mutate, isPending: mutation.isPending };
};
