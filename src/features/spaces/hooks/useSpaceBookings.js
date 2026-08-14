import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { spaceService } from '../services/spaceService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

export const useSpaceBookings = (params = {}) =>
  useQuery({
    queryKey: queryKeys.spaces.bookings(params),
    queryFn: () => spaceService.getSpaceBookings(params),
    placeholderData: keepPreviousData,
  });

export const useSpaceBooking = (id) =>
  useQuery({
    queryKey: queryKeys.spaces.bookingDetail(id),
    queryFn: () => spaceService.getSpaceBooking(id),
    enabled: Boolean(id),
  });

export const useApprovalQueue = (params = {}) =>
  useQuery({
    queryKey: queryKeys.spaces.approvalQueue(params),
    queryFn: () => spaceService.getApprovalQueue(params),
    placeholderData: keepPreviousData,
  });

/** Approve / decline a request-mode booking. Both invalidate every bookings view, not just the queue. */
export const useBookingDecisions = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all });

  const approve = useMutation({
    mutationFn: (id) => spaceService.approveBooking(id),
    onSuccess: (booking) => {
      invalidate();
      toast.success('Booking approved', `${booking.guestName} · ${booking.spaceName}`);
    },
    onError: (error) => toast.error('Could not approve booking', getErrorMessage(error)),
  });

  const decline = useMutation({
    mutationFn: ({ id, reason }) => spaceService.declineBooking(id, reason),
    onSuccess: (booking) => {
      invalidate();
      toast.info('Booking declined', `${booking.guestName} · ${booking.spaceName}`);
    },
    onError: (error) => toast.error('Could not decline booking', getErrorMessage(error)),
  });

  return {
    approveBooking: approve.mutate,
    isApproving: approve.isPending,
    declineBooking: (id, reason) => decline.mutate({ id, reason }),
    isDeclining: decline.isPending,
    pendingId: approve.isPending ? approve.variables : decline.isPending ? decline.variables?.id : undefined,
  };
};
