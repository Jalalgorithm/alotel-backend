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

/** Today's room-status board (Occupied / Due Check-out / Needs Cleaning / Ready), scoped server-side to the caller's assigned properties. */
export const useTodaysRooms = () =>
  useQuery({
    queryKey: queryKeys.bookings.housekeeping(),
    queryFn: bookingService.getTodaysRooms,
  });

/** Housekeeping/maintenance/inspection tasks — a housekeeper only ever sees their own. */
export const useTasks = (params = {}) =>
  useQuery({
    queryKey: [...queryKeys.bookings.housekeeping(), 'tasks', params],
    queryFn: () => bookingService.getTasks(params),
  });

/** Advance a task's status (e.g. mark a cleaning task `cleaned`). */
export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, patch }) => bookingService.updateTaskStatus(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.housekeeping() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Task updated');
    },
    onError: (error) => toast.error('Could not update task', getErrorMessage(error)),
  });

  return { updateTaskStatus: (id, patch) => mutation.mutate({ id, patch }), isPending: mutation.isPending, pendingId: mutation.variables?.id };
};

/** Properties assigned to the current staff member — populates the "report an issue" picker. */
export const useAssignedProperties = () =>
  useQuery({
    queryKey: [...queryKeys.bookings.housekeeping(), 'assigned-properties'],
    queryFn: bookingService.getAssignedProperties,
  });

/** Log a maintenance issue. Write-only — there is no list/resolve endpoint for issues yet. */
export const useReportIssue = () => {
  const mutation = useMutation({
    mutationFn: bookingService.reportIssue,
    onSuccess: () => toast.success('Issue reported', 'Logged for the property team.'),
    onError: (error) => toast.error('Could not report issue', getErrorMessage(error)),
  });

  return { reportIssue: mutation.mutate, isPending: mutation.isPending };
};
