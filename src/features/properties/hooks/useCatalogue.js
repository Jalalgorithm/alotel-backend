import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { propertyService } from '../services/propertyService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

/* ---------------------------------------------------------------- reviews -- */

/** `GET /reviews/<listing_id>/` — reviews are per-property; there is no cross-property admin feed. */
export const usePropertyReviews = (propertyId) =>
  useQuery({
    queryKey: queryKeys.properties.reviews(propertyId),
    queryFn: () => propertyService.getPropertyReviews(propertyId),
    enabled: Boolean(propertyId),
  });

/** One official admin response per review — the backend 400s on a second attempt, surfaced as a toast. */
export const useRespondToReview = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, body }) => propertyService.respondToReview(id, body),
    onSuccess: (_response, { propertyId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.reviews(propertyId) });
      toast.success('Response posted');
    },
    onError: (error) => toast.error('Could not post response', getErrorMessage(error)),
  });

  return {
    respond: (id, body, propertyId, options) => mutation.mutate({ id, body, propertyId }, options),
    isPending: mutation.isPending,
    pendingId: mutation.variables?.id,
  };
};

/**
 * Flags a review, which hides it from the public listing (and from this
 * screen, since both read the same endpoint) on the next fetch — there is no
 * unflag action.
 */
export const useFlagReview = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, reason }) => propertyService.flagReview(id, reason),
    onSuccess: (_review, { propertyId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.reviews(propertyId) });
      toast.info('Review flagged', 'Hidden from the public listing.');
    },
    onError: (error) => toast.error('Could not flag review', getErrorMessage(error)),
  });

  return {
    flag: (id, reason, propertyId, options) => mutation.mutate({ id, reason, propertyId }, options),
    isPending: mutation.isPending,
    pendingId: mutation.variables?.id,
  };
};

/* ------------------------------------------------------ country discounts -- */

export const useDiscountRules = () =>
  useQuery({
    queryKey: queryKeys.properties.discounts(),
    queryFn: propertyService.getDiscounts,
  });

/** Create / update / delete country discounts. All three invalidate the same list. */
export const useDiscountRuleMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.properties.discounts() });

  const create = useMutation({
    mutationFn: propertyService.createDiscount,
    onSuccess: (rule) => {
      invalidate();
      toast.success('Discount saved', `${rule.country} · ${rule.percentage}%`);
    },
    onError: (error) => toast.error('Could not save discount', getErrorMessage(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }) => propertyService.updateDiscount(id, patch),
    onSuccess: (rule) => {
      invalidate();
      toast.success('Discount updated', `${rule.country} · ${rule.percentage}%`);
    },
    onError: (error) => toast.error('Could not update discount', getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: propertyService.deleteDiscount,
    onSuccess: () => {
      invalidate();
      toast.info('Discount deleted');
    },
    onError: (error) => toast.error('Could not delete discount', getErrorMessage(error)),
  });

  return {
    createRule: create.mutate,
    isCreating: create.isPending,
    updateRule: (id, patch) => update.mutate({ id, patch }),
    deleteRule: remove.mutate,
    // Only while a mutation is actually in flight — `.variables` survives past settling.
    pendingId: update.isPending ? update.variables?.id : remove.isPending ? remove.variables : undefined,
  };
};

/* -------------------------------------------------- country fee configs -- */

export const usePricingConfigs = () =>
  useQuery({
    queryKey: queryKeys.properties.pricingConfigs(),
    queryFn: propertyService.getPricingConfigs,
  });

/**
 * Create / update / delete a country's cleaning fee & security deposit defaults.
 *
 * The API resolves every property's `cleaningFee`/`securityDeposit` live against
 * whichever country config is currently active, so an already-cached property
 * (detail or list) needs invalidating too — otherwise it keeps showing the
 * numbers from before this save until something else happens to refetch it.
 */
export const usePricingConfigMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.properties.pricingConfigs() });
    queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
  };

  const create = useMutation({
    mutationFn: propertyService.createPricingConfig,
    onSuccess: (config) => {
      invalidate();
      toast.success('Pricing config saved', `${config.country} · ${config.currency}`);
    },
    onError: (error) => toast.error('Could not save pricing config', getErrorMessage(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }) => propertyService.updatePricingConfig(id, patch),
    onSuccess: (config) => {
      invalidate();
      toast.success('Pricing config updated', `${config.country} · ${config.currency}`);
    },
    onError: (error) => toast.error('Could not update pricing config', getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: propertyService.deletePricingConfig,
    onSuccess: () => {
      invalidate();
      toast.info('Pricing config deleted');
    },
    onError: (error) => toast.error('Could not delete pricing config', getErrorMessage(error)),
  });

  return {
    createConfig: create.mutate,
    isCreating: create.isPending,
    updateConfig: (id, patch) => update.mutate({ id, patch }),
    deleteConfig: remove.mutate,
    // Only while a mutation is actually in flight — `.variables` survives past settling.
    pendingId: update.isPending ? update.variables?.id : remove.isPending ? remove.variables : undefined,
  };
};

/* --------------------------------------------- global deposit/seasonal rules -- */

export const usePricingRules = () =>
  useQuery({
    queryKey: queryKeys.properties.pricingRules(),
    queryFn: propertyService.getPricingRules,
  });

/** Upsert (by region + property type) — the API has no separate create/delete for this resource. */
export const useUpsertPricingRule = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: propertyService.upsertPricingRule,
    onSuccess: (rule) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.pricingRules() });
      toast.success('Pricing rule saved', `${rule.propertyType} · ${rule.region}`);
    },
    onError: (error) => toast.error('Could not save pricing rule', getErrorMessage(error)),
  });

  return { upsertRule: mutation.mutate, isPending: mutation.isPending };
};
