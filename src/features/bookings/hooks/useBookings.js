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

export const useContracts = (params = {}) =>
  useQuery({
    queryKey: queryKeys.bookings.contracts(params),
    queryFn: () => bookingService.getContracts(params),
    placeholderData: keepPreviousData,
  });

/** Contract state for one booking, fetched only when a row is opened. */
export const useContractForBooking = (bookingId) =>
  useQuery({
    queryKey: queryKeys.bookings.contractDetail(bookingId),
    queryFn: () => bookingService.getContractForBooking(bookingId),
    enabled: Boolean(bookingId),
  });

/** The signed-document link, fetched only once a contract has actually been signed. */
export const useContractStatus = (contractId, { enabled = true } = {}) =>
  useQuery({
    queryKey: queryKeys.bookings.contractStatus(contractId),
    queryFn: () => bookingService.getContractStatus(contractId),
    enabled: Boolean(contractId) && enabled,
  });

export const useContractTemplates = () =>
  useQuery({
    queryKey: queryKeys.bookings.contractTemplates(),
    queryFn: bookingService.getContractTemplates,
    staleTime: 1000 * 60 * 10,
  });

/** Create, edit, activate or remove a contract template. */
export const useContractTemplateMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.contractTemplates() });

  const create = useMutation({
    mutationFn: bookingService.createContractTemplate,
    onSuccess: (template) => {
      invalidate();
      toast.success('Template created', `${template.name} is ready to be issued.`);
    },
    onError: (error) => toast.error('Could not create the template', getErrorMessage(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }) => bookingService.updateContractTemplate(id, patch),
    onSuccess: () => {
      invalidate();
      toast.success('Template updated');
    },
    onError: (error) => toast.error('Could not update the template', getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: bookingService.deleteContractTemplate,
    onSuccess: () => {
      invalidate();
      toast.success('Template deleted');
    },
    onError: (error) => toast.error('Could not delete the template', getErrorMessage(error)),
  });

  return {
    createTemplate: create.mutateAsync,
    isCreating: create.isPending,
    updateTemplate: update.mutate,
    updateTemplateAsync: update.mutateAsync,
    isUpdating: update.isPending,
    deleteTemplate: remove.mutate,
    isDeleting: remove.isPending,
    pendingId: update.variables?.id ?? remove.variables,
  };
};

/** Issue a contract for a booking through Dropbox Sign. */
export const useSendContract = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: bookingService.sendContract,
    onSuccess: (_data, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.contractDetail(bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      toast.success('Contract sent', 'The guest has been emailed a signing link.');
    },
    onError: (error) => toast.error('Could not send the contract', getErrorMessage(error)),
  });

  return { sendContract: mutation.mutate, isPending: mutation.isPending, pendingId: mutation.variables?.bookingId };
};

/* ------------------------------------------------------------- inspections */

/** Which rooms already have photos for this booking's check-in/check-out. */
export const useInspectionState = (bookingId) =>
  useQuery({
    queryKey: queryKeys.bookings.inspection(bookingId),
    queryFn: () => bookingService.getInspectionState(bookingId),
    enabled: Boolean(bookingId),
  });

export const useUploadInspectionPhoto = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: bookingService.uploadInspectionPhoto,
    onSuccess: (_data, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.inspection(bookingId) });
    },
    onError: (error) => toast.error('Could not upload the photo', getErrorMessage(error)),
  });

  return { uploadPhoto: mutation.mutate, isPending: mutation.isPending, pendingVariables: mutation.variables };
};

/** Guest-submitted check-in/check-out inspections awaiting staff review, scoped to the caller's assigned properties. */
export const usePendingReviewInspections = () =>
  useQuery({
    queryKey: queryKeys.bookings.pendingReviewInspections(),
    queryFn: bookingService.getPendingReviewInspections,
  });

/**
 * Clears an inspection's `pending_review` block. Invalidates both the queue
 * and the booking's own inspection state, so the Arrivals/Departures tab's
 * "awaiting review" banner clears the moment a review is submitted.
 */
export const useReviewInspection = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: bookingService.reviewInspection,
    onSuccess: (_result, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.pendingReviewInspections() });
      if (bookingId) queryClient.invalidateQueries({ queryKey: queryKeys.bookings.inspection(bookingId) });
      toast.success('Inspection reviewed');
    },
    onError: (error) => toast.error('Could not submit review', getErrorMessage(error)),
  });

  return { reviewInspection: mutation.mutate, isPending: mutation.isPending, pendingId: mutation.variables?.inspectionId };
};

/** Transitions a booking `confirmed`/`active` → `active`. */
export const useCompleteCheckIn = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: bookingService.completeCheckIn,
    onSuccess: (result, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(bookingId) });
      toast.success('Check-in completed', result?.detail);
    },
    onError: (error) => toast.error('Could not complete check-in', getErrorMessage(error)),
  });

  return { completeCheckIn: mutation.mutate, isPending: mutation.isPending };
};

/** Transitions a booking `active`/`completed` → `completed`. */
export const useCompleteCheckOut = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: bookingService.completeCheckOut,
    onSuccess: (result, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(bookingId) });
      toast.success('Check-out completed', result?.detail);
    },
    onError: (error) => toast.error('Could not complete check-out', getErrorMessage(error)),
  });

  return { completeCheckOut: mutation.mutate, isPending: mutation.isPending };
};

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
