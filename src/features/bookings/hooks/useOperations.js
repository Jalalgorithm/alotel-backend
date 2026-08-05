import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../services/bookingService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

/* ------------------------------------------------------- check-out reports */

export const useCheckoutReports = () =>
  useQuery({
    queryKey: queryKeys.bookings.checkouts(),
    queryFn: bookingService.getCheckoutReports,
  });

/**
 * Save a check-out report — damage list edits and the final deposit decision.
 */
export const useSaveCheckoutReport = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, patch }) => bookingService.saveCheckoutReport(id, patch),
    onSuccess: (_report, { message }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      if (message) toast.success(message);
    },
    onError: (error) => toast.error('Could not save report', getErrorMessage(error)),
  });

  return { saveReport: mutation.mutate, isPending: mutation.isPending };
};

/* ------------------------------------------------------------ housekeeping */

export const useHousekeeping = () =>
  useQuery({
    queryKey: queryKeys.bookings.housekeeping(),
    queryFn: bookingService.getHousekeeping,
  });

export const useResolveMaintenance = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: bookingService.resolveMaintenance,
    onSuccess: (request) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.housekeeping() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Marked resolved', request.title);
    },
    onError: (error) => toast.error('Could not update request', getErrorMessage(error)),
  });

  return { resolve: mutation.mutate, isPending: mutation.isPending, pendingId: mutation.variables };
};
