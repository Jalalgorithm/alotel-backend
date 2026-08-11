import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { propertyService } from '../services/propertyService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

/* ------------------------------------------------------------------ units -- */

export const useUnits = (params = {}) =>
  useQuery({
    queryKey: queryKeys.properties.units(params),
    queryFn: () => propertyService.getUnits(params),
    placeholderData: keepPreviousData,
  });

/**
 * Change a unit's housekeeping status.
 *
 * Invalidates the dashboard too — the sidebar badge and the "needs cleaning"
 * count are derived from the same rows, so they must move together.
 */
export const useUnitStatus = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, status }) => propertyService.setUnitStatus(id, status),
    onSuccess: (unit) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Unit updated', `${unit.label} is now ${unit.status}.`);
    },
    onError: (error) => toast.error('Could not update unit', getErrorMessage(error)),
  });

  return { setUnitStatus: mutation.mutate, isPending: mutation.isPending, pendingId: mutation.variables?.id };
};

/* -------------------------------------------------------------- amenities -- */

export const useAmenities = () =>
  useQuery({
    queryKey: queryKeys.properties.amenities(),
    queryFn: propertyService.getAmenities,
  });

export const useToggleAmenity = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: propertyService.toggleAmenity,
    onSuccess: (_enabled, name) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.amenities() });
      toast.success('Amenities updated', `${name} was toggled for the portfolio.`);
    },
    onError: (error) => toast.error('Could not update amenities', getErrorMessage(error)),
  });

  return { toggleAmenity: mutation.mutate, isPending: mutation.isPending, pendingName: mutation.variables };
};

/* ---------------------------------------------------------------- reviews -- */

export const usePropertyReviews = (params = {}) =>
  useQuery({
    queryKey: queryKeys.properties.reviews(params),
    queryFn: () => propertyService.getReviews(params),
    placeholderData: keepPreviousData,
  });

export const useModerateReview = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, status }) => propertyService.moderateReview(id, status),
    onSuccess: (review) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success(`Review ${review.status.toLowerCase()}`, `${review.guest} · ${review.property}`);
    },
    onError: (error) => toast.error('Could not moderate review', getErrorMessage(error)),
  });

  return {
    moderate: mutation.mutate,
    isPending: mutation.isPending,
    pendingId: mutation.variables ? `${mutation.variables.id}:${mutation.variables.status}` : null,
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
    pendingId: update.variables?.id ?? remove.variables,
  };
};

/* -------------------------------------------------- country fee configs -- */

export const usePricingConfigs = () =>
  useQuery({
    queryKey: queryKeys.properties.pricingConfigs(),
    queryFn: propertyService.getPricingConfigs,
  });

/** Create / update / delete a country's cleaning fee & security deposit defaults. */
export const usePricingConfigMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.properties.pricingConfigs() });

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
    pendingId: update.variables?.id ?? remove.variables,
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
