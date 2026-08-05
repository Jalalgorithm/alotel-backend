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

/* ---------------------------------------------------------------- pricing -- */

export const usePricing = () =>
  useQuery({
    queryKey: queryKeys.properties.pricing(),
    queryFn: propertyService.getPricing,
  });

export const useSavePricing = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: propertyService.savePricing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.pricing() });
      toast.success('Pricing saved', 'Changes apply to all future bookings.');
    },
    onError: (error) => toast.error('Could not save pricing', getErrorMessage(error)),
  });

  return { savePricing: mutation.mutate, isPending: mutation.isPending };
};
