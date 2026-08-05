import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../services/bookingService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

export const useBookings = (params = {}) =>
  useQuery({
    queryKey: queryKeys.bookings.list(params),
    queryFn: () => bookingService.getBookings(params),
    placeholderData: keepPreviousData,
  });

export const useBooking = (id) =>
  useQuery({
    queryKey: queryKeys.bookings.detail(id),
    queryFn: () => bookingService.getBooking(id),
    enabled: Boolean(id),
  });

/** The status history behind a booking's timeline panel. */
export const useBookingTimeline = (id) =>
  useQuery({
    queryKey: queryKeys.bookings.timeline(id),
    queryFn: () => bookingService.getBookingTimeline(id),
    enabled: Boolean(id),
  });

/** Line items and settled payments, for the receipt panel. */
export const useBookingReceipt = (id) =>
  useQuery({
    queryKey: queryKeys.bookings.receipt(id),
    queryFn: () => bookingService.getBookingReceipt(id),
    enabled: Boolean(id),
  });

/**
 * Booking mutations.
 *
 * Confirm and cancel each have their own endpoint rather than being a generic
 * PATCH — that is deliberate on the API's side, because every transition is
 * recorded in the booking's status history.
 */
export const useBookingActions = () => {
  const queryClient = useQueryClient();

  const refresh = (id) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    if (id) queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(id) });
  };

  const confirm = useMutation({
    mutationFn: (id) => bookingService.confirmBooking(id),
    onSuccess: (_result, id) => {
      refresh(id);
      toast.success('Booking approved', 'The guest has been notified.');
    },
    onError: (error) => toast.error('Could not approve booking', getErrorMessage(error)),
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }) => bookingService.cancelBooking(id, reason),
    onSuccess: (_result, { id }) => {
      refresh(id);
      toast.success('Booking cancelled', 'Any refund due will follow the cancellation policy.');
    },
    onError: (error) => toast.error('Could not cancel booking', getErrorMessage(error)),
  });

  /**
   * Contract and KYC nudges are still mock-backed: the API handles both
   * through the compliance endpoints, which this pass does not cover.
   */
  const nudge = useMutation({
    mutationFn: ({ id, patch }) => bookingService.updateBooking(id, patch),
    onSuccess: (_booking, { id, message }) => {
      refresh(id);
      toast.success(message ?? 'Booking updated');
    },
    onError: (error) => toast.error('Could not update booking', getErrorMessage(error)),
  });

  return {
    approve: confirm.mutate,
    cancel: (id, reason = '') => cancel.mutate({ id, reason }),
    sendContract: (id) => nudge.mutate({ id, patch: { contract: 'Signed' }, message: 'Contract sent for signature' }),
    remindKyc: (id) => nudge.mutate({ id, patch: { kyc: 'Pending' }, message: 'KYC reminder sent' }),
    isPending: confirm.isPending || cancel.isPending || nudge.isPending,
    pendingId: confirm.variables ?? cancel.variables?.id ?? nudge.variables?.id,
  };
};

export const useGuests = (params = {}) =>
  useQuery({
    queryKey: queryKeys.bookings.guests(params),
    queryFn: () => bookingService.getGuests(params),
    placeholderData: keepPreviousData,
  });

export const useCheckIns = () =>
  useQuery({
    queryKey: [...queryKeys.bookings.all, 'check-ins'],
    queryFn: bookingService.getCheckIns,
  });

export const useContracts = () =>
  useQuery({
    queryKey: queryKeys.bookings.contracts(),
    queryFn: bookingService.getContracts,
  });

export const useCalendar = (month) =>
  useQuery({
    queryKey: queryKeys.bookings.calendar(month),
    queryFn: () => bookingService.getCalendar(month),
    placeholderData: keepPreviousData,
  });

export const useCancellations = (params = {}) =>
  useQuery({
    queryKey: [...queryKeys.bookings.cancellations(), params],
    queryFn: () => bookingService.getCancellations(params),
    placeholderData: keepPreviousData,
  });

export const useProcessRefund = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: bookingService.processRefund,
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      toast.success('Refund processed', `${record.guest} · #${record.bookingId}`);
    },
    onError: (error) => toast.error('Could not process refund', getErrorMessage(error)),
  });

  return { processRefund: mutation.mutate, isPending: mutation.isPending, pendingId: mutation.variables };
};
