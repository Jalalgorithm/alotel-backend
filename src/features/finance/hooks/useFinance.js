import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../services/financeService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

export const usePayments = (params = {}) =>
  useQuery({
    queryKey: queryKeys.finance.payments(params),
    queryFn: () => financeService.getPayments(params),
    placeholderData: keepPreviousData,
  });

export const usePayouts = (params = {}) =>
  useQuery({
    queryKey: queryKeys.finance.payouts(params),
    queryFn: () => financeService.getPayouts(params),
    placeholderData: keepPreviousData,
  });

export const useReleasePayout = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: financeService.releasePayout,
    onSuccess: (payout) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
      toast.success('Payout released', `${payout.owner} · ${payout.period}`);
    },
    onError: (error) => toast.error('Could not release payout', getErrorMessage(error)),
  });

  return { releasePayout: mutation.mutate, isPending: mutation.isPending, pendingId: mutation.variables };
};

export const useRevenue = () =>
  useQuery({
    queryKey: queryKeys.finance.invoices(),
    queryFn: financeService.getRevenue,
  });

/* --------------------------------------------------------------- tax rules */

export const useTaxRules = () =>
  useQuery({
    queryKey: queryKeys.finance.taxRules(),
    queryFn: financeService.getTaxRules,
  });

/**
 * Create / toggle / delete tax rules.
 *
 * All three invalidate the same key, so the live calculation preview on the Tax
 * screen recomputes the moment a rule changes.
 */
export const useTaxRuleMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.finance.taxRules() });

  const create = useMutation({
    mutationFn: financeService.createTaxRule,
    onSuccess: (rule) => {
      invalidate();
      toast.success('Tax rule saved', `${rule.name} · ${rule.country}`);
    },
    onError: (error) => toast.error('Could not save rule', getErrorMessage(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }) => financeService.updateTaxRule(id, patch),
    onSuccess: (rule) => {
      invalidate();
      toast.success('Tax rule updated', `${rule.name} · ${rule.percentage}%`);
    },
    onError: (error) => toast.error('Could not update rule', getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: financeService.deleteTaxRule,
    onSuccess: () => {
      invalidate();
      toast.info('Rule deleted');
    },
    onError: (error) => toast.error('Could not delete rule', getErrorMessage(error)),
  });

  return {
    createRule: create.mutate,
    isCreating: create.isPending,
    /** Editing a live rule's name or rate. */
    updateRule: (id, patch) => update.mutate({ id, patch }),
    isUpdating: update.isPending,
    deleteRule: remove.mutate,
    pendingId: update.variables?.id ?? remove.variables,
  };
};

/* -------------------------------------------------------------------------- */
/* Payment operations                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The security deposit held against a booking.
 *
 * A booking with no deposit is a normal state, not an error — the query just
 * resolves to null rather than surfacing a 404 to the panel.
 */
export const useDeposit = (bookingId) =>
  useQuery({
    queryKey: queryKeys.finance.deposit(bookingId),
    queryFn: () => financeService.getDeposit(bookingId).catch(() => null),
    enabled: Boolean(bookingId),
    retry: false,
  });

/** Supported currencies, live FX and the currency→provider mapping. */
export const useFxRates = (base = 'GBP') =>
  useQuery({
    queryKey: queryKeys.finance.fxRates(base),
    queryFn: () => financeService.getFxRates(base),
    staleTime: 1000 * 60 * 30,
  });

/**
 * Refunds and the deposit lifecycle.
 *
 * Grouped into one hook because they all invalidate the same things — the
 * booking, its receipt and its deposit — and a screen that offers one of them
 * almost always offers the rest.
 */
export const usePaymentActions = () => {
  const queryClient = useQueryClient();

  const refresh = (bookingId) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    if (bookingId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.receipt(bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.deposit(bookingId) });
    }
  };

  /**
   * Each operation is its own `useMutation` rather than being generated in a
   * loop: hooks must be called unconditionally and in a stable order, and a
   * factory that calls `useMutation` is not one.
   */
  const onError = (title) => (error) => toast.error(title, getErrorMessage(error));
  const onDone = (title) => (result, variables) => {
    refresh(variables?.bookingId);
    toast.success(title, result?.detail ?? undefined);
  };

  const refund = useMutation({
    mutationFn: financeService.refundBooking,
    onSuccess: onDone('Refund issued'),
    onError: onError('Could not issue refund'),
  });

  const preauth = useMutation({
    mutationFn: financeService.preauthDeposit,
    onSuccess: onDone('Deposit held'),
    onError: onError('Could not hold deposit'),
  });

  const capture = useMutation({
    mutationFn: financeService.captureDeposit,
    onSuccess: onDone('Deposit captured'),
    onError: onError('Could not capture deposit'),
  });

  const release = useMutation({
    mutationFn: financeService.releaseDeposit,
    onSuccess: onDone('Deposit released'),
    onError: onError('Could not release deposit'),
  });

  const deduct = useMutation({
    mutationFn: financeService.deductDeposit,
    onSuccess: onDone('Deduction recorded'),
    onError: onError('Could not record deduction'),
  });

  return {
    refund: refund.mutate,
    holdDeposit: preauth.mutate,
    captureDeposit: capture.mutate,
    releaseDeposit: release.mutate,
    deductDeposit: deduct.mutate,
    isPending:
      refund.isPending ||
      preauth.isPending ||
      capture.isPending ||
      release.isPending ||
      deduct.isPending,
  };
};
