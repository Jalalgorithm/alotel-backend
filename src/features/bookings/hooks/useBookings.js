import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../services/bookingService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

export const useBookings = (params = {}, options = {}) =>
  useQuery({
    queryKey: queryKeys.bookings.list(params),
    queryFn: () => bookingService.getBookings(params),
    placeholderData: keepPreviousData,
    ...options,
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

  const approve = useMutation({
    mutationFn: (id) => bookingService.approveBooking(id),
    onSuccess: (result, id) => {
      refresh(id);
      const confirmed = result?.status === 'confirmed';
      toast.success(
        confirmed ? 'Booking approved' : 'Approval granted',
        confirmed ? 'The guest has been notified.' : 'Waiting on the remaining requirements before it confirms.',
      );
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
    approve: approve.mutate,
    cancel: (id, reason = '') => cancel.mutate({ id, reason }),
    sendContract: (id) => nudge.mutate({ id, patch: { contract: 'Signed' }, message: 'Contract sent for signature' }),
    remindKyc: (id) => nudge.mutate({ id, patch: { kyc: 'Pending' }, message: 'KYC reminder sent' }),
    isPending: approve.isPending || cancel.isPending || nudge.isPending,
    pendingId: approve.isPending ? approve.variables : cancel.isPending ? cancel.variables?.id : nudge.isPending ? nudge.variables?.id : undefined,
  };
};

export const useGuests = (params = {}) =>
  useQuery({
    queryKey: queryKeys.bookings.guests(params),
    queryFn: () => bookingService.getGuests(params),
    placeholderData: keepPreviousData,
  });

/** Enriched guest profile — phone, KYC status, stay stats. Fetched only when a row is opened. */
export const useGuestDetail = (id) =>
  useQuery({
    queryKey: queryKeys.bookings.guestDetail(id),
    queryFn: () => bookingService.getGuestDetail(id),
    enabled: Boolean(id),
  });

/** One guest's booking history — powers the detail drawer's stay list. */
export const useGuestBookingHistory = (id, params = {}) =>
  useQuery({
    queryKey: queryKeys.bookings.guestBookings(id, params),
    queryFn: () => bookingService.getGuestBookingHistory(id, params),
    enabled: Boolean(id),
  });

/** Activate / deactivate a guest account, or edit their name — the only fields `PATCH /auth/admin/guests/<id>/` accepts. */
export const useUpdateGuest = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, patch }) => bookingService.updateGuest(id, patch),
    onSuccess: (guest) => {
      // Prefix-match every filtered/paginated view of the guest list, not just one filter combination.
      queryClient.invalidateQueries({ queryKey: ['bookings', 'guests'] });
      toast.success('Guest updated', `${guest.name} is now ${guest.isActive ? 'active' : 'deactivated'}`);
    },
    onError: (error) => toast.error('Could not update guest', getErrorMessage(error)),
  });

  return { updateGuest: (id, patch) => mutation.mutate({ id, patch }), isPending: mutation.isPending, pendingId: mutation.variables?.id };
};

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

/* -------------------------------------------------------- check-out reports */

export const useDamageAssessments = (bookingId) =>
  useQuery({
    queryKey: queryKeys.bookings.damageAssessments(bookingId),
    queryFn: () => bookingService.getDamageAssessments(bookingId),
    enabled: Boolean(bookingId),
  });

export const useCreateDamageAssessment = (bookingId) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values) => bookingService.createDamageAssessment(bookingId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.damageAssessments(bookingId) });
      toast.success('Damage item logged');
    },
    onError: (error) => toast.error('Could not log damage item', getErrorMessage(error)),
  });

  return { createDamage: mutation.mutate, isPending: mutation.isPending };
};

/** The admin approval step — confirm a cost, decide whether it counts against the deposit. */
export const useUpdateDamageAssessment = (bookingId) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, values }) => bookingService.updateDamageAssessment(bookingId, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.damageAssessments(bookingId) });
      // A report already generated from the old numbers is now stale.
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.checkoutReport(bookingId) });
    },
    onError: (error) => toast.error('Could not update damage item', getErrorMessage(error)),
  });

  return {
    updateDamage: (id, values, options) => mutation.mutate({ id, values }, options),
    isPending: mutation.isPending,
    pendingId: mutation.isPending ? mutation.variables?.id : undefined,
  };
};

/** `null` (not an error) until a report has been generated for this booking — same "absence is normal" pattern `useDeposit` already uses. */
export const useCheckoutReport = (bookingId) =>
  useQuery({
    queryKey: queryKeys.bookings.checkoutReport(bookingId),
    queryFn: () => bookingService.getCheckoutReport(bookingId),
    enabled: Boolean(bookingId),
  });

/**
 * Report status for a handful of bookings in parallel — there is no backend
 * list endpoint for this, so the Check-out Reports queue resolves it per
 * visible row instead, the same bounded-fan-out pattern `usePropertiesByIds`
 * already uses in `useProperties.js` for the equivalent "resolve records the
 * list endpoint doesn't carry" need. Bounded to one page of ids, not
 * unbounded — fine at this scale, would need a real backend list endpoint to
 * go further.
 */
export const useCheckoutReportsByBookingIds = (bookingIds = []) =>
  useQueries({
    queries: bookingIds.map((bookingId) => ({
      queryKey: queryKeys.bookings.checkoutReport(bookingId),
      queryFn: () => bookingService.getCheckoutReport(bookingId),
      enabled: Boolean(bookingId),
      staleTime: 1000 * 60,
    })),
  });

/** Real side effect: deducts approved damage from the deposit and auto-releases the remainder — see `bookingService.generateCheckoutReport`. */
export const useGenerateCheckoutReport = (bookingId) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => bookingService.generateCheckoutReport(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.checkoutReport(bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.deposit(bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(bookingId) });
      toast.success('Check-out report generated', 'The deposit has been reconciled.');
    },
    onError: (error) => toast.error('Could not generate the report', getErrorMessage(error)),
  });

  return { generateReport: mutation.mutate, isPending: mutation.isPending };
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

/**
 * A cancelled booking's reason/timestamp isn't on the list payload — there's
 * no dedicated cancellations endpoint, only `getBookingTimeline` per booking
 * (the same one the booking detail drawer uses). Bounded fan-out over the
 * visible page of rows, same pattern as `useCheckoutReportsByBookingIds`.
 */
export const useCancellationReasons = (bookingIds = []) =>
  useQueries({
    queries: bookingIds.map((bookingId) => ({
      queryKey: queryKeys.bookings.timeline(bookingId),
      queryFn: () => bookingService.getBookingTimeline(bookingId),
      enabled: Boolean(bookingId),
      staleTime: 1000 * 60,
      select: (events) => events.find((event) => event.to === 'cancelled') ?? null,
    })),
  });
