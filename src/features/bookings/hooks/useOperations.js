import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../services/bookingService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

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

/** Maintenance issues — scoped server-side to the caller's assigned properties. */
export const useIssues = (params = {}) =>
  useQuery({
    queryKey: [...queryKeys.bookings.housekeeping(), 'issues', params],
    queryFn: () => bookingService.getIssues(params),
  });

/** Advance an issue's status (`open → in_progress → resolved/wont_fix`). */
export const useUpdateIssueStatus = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, patch }) => bookingService.updateIssueStatus(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.bookings.housekeeping(), 'issues'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Issue updated');
    },
    onError: (error) => toast.error('Could not update issue', getErrorMessage(error)),
  });

  return {
    updateIssueStatus: (id, patch) => mutation.mutate({ id, patch }),
    isPending: mutation.isPending,
    pendingId: mutation.isPending ? mutation.variables?.id : undefined,
  };
};

/** Log a maintenance issue. */
export const useReportIssue = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: bookingService.reportIssue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.bookings.housekeeping(), 'issues'] });
      toast.success('Issue reported', 'Logged for the property team.');
    },
    onError: (error) => toast.error('Could not report issue', getErrorMessage(error)),
  });

  return { reportIssue: mutation.mutate, isPending: mutation.isPending };
};
