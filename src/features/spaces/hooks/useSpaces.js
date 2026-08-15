import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { spaceService } from '../services/spaceService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

/* -------------------------------------------------------------------------- */
/* Spaces                                                                       */
/* -------------------------------------------------------------------------- */

export const useSpaces = (params = {}) =>
  useQuery({
    queryKey: queryKeys.spaces.list(params),
    queryFn: () => spaceService.getSpaces(params),
    placeholderData: keepPreviousData,
  });

export const useSpace = (id) =>
  useQuery({
    queryKey: queryKeys.spaces.detail(id),
    queryFn: () => spaceService.getSpace(id),
    enabled: Boolean(id),
  });

export const useCreateSpace = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: spaceService.createSpace,
    onSuccess: (space) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all });
      queryClient.setQueryData(queryKeys.spaces.detail(space.id), space);
      toast.success(space.status === 'published' ? 'Space published' : 'Draft saved', `${space.title} · ${space.id}`);
    },
    onError: (error) => toast.error('Could not save space', getErrorMessage(error)),
  });

  return { createSpace: mutation.mutate, createSpaceAsync: mutation.mutateAsync, isPending: mutation.isPending };
};

export const useUpdateSpace = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, values }) => spaceService.updateSpace(id, values),
    onSuccess: (space) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all });
      queryClient.setQueryData(queryKeys.spaces.detail(space.id), space);
      toast.success('Changes saved', `${space.title} updated.`);
    },
    onError: (error) => toast.error('Could not save changes', getErrorMessage(error)),
  });

  return { updateSpace: mutation.mutate, updateSpaceAsync: mutation.mutateAsync, isPending: mutation.isPending };
};

export const useSetSpaceStatus = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, status }) => spaceService.setSpaceStatus(id, status),
    onSuccess: (space) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all });
      queryClient.setQueryData(queryKeys.spaces.detail(space.id), space);
      toast.success('Status updated', `${space.title} is now ${space.status}.`);
    },
    onError: (error) => toast.error('Could not update status', getErrorMessage(error)),
  });

  return { setStatus: mutation.mutate, isPending: mutation.isPending, pendingId: mutation.variables?.id };
};

/* -------------------------------------------------------------------------- */
/* Layouts — create + delete only, the real API has no update endpoint         */
/* -------------------------------------------------------------------------- */

export const useLayouts = (spaceId) =>
  useQuery({
    queryKey: queryKeys.spaces.layouts(spaceId),
    queryFn: () => spaceService.getLayouts(spaceId),
    enabled: Boolean(spaceId),
  });

export const useLayoutMutations = (spaceId) => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.spaces.layouts(spaceId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.spaces.detail(spaceId) });
  };

  const create = useMutation({
    mutationFn: (values) => spaceService.createLayout(spaceId, values),
    onSuccess: () => {
      invalidate();
      toast.success('Layout added');
    },
    onError: (error) => toast.error('Could not add layout', getErrorMessage(error)),
  });

  /** Fails with a clear error (not a crash) if a booking still references this layout — `SpaceBooking.layout` is a protected FK server-side. */
  const remove = useMutation({
    mutationFn: (id) => spaceService.deleteLayout(spaceId, id),
    onSuccess: () => {
      invalidate();
      toast.info('Layout removed');
    },
    onError: (error) => toast.error('Could not remove layout', getErrorMessage(error, 'It may still be referenced by a booking.')),
  });

  return {
    createLayout: create.mutate,
    isCreating: create.isPending,
    deleteLayout: remove.mutate,
    isDeleting: remove.isPending,
    pendingId: remove.isPending ? remove.variables : undefined,
  };
};

/* -------------------------------------------------------------------------- */
/* Add-ons — create + delete only, the real API has no update endpoint         */
/* -------------------------------------------------------------------------- */

export const useAddons = (spaceId) =>
  useQuery({
    queryKey: queryKeys.spaces.addons(spaceId),
    queryFn: () => spaceService.getAddons(spaceId),
    enabled: Boolean(spaceId),
  });

export const useAddonMutations = (spaceId) => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.spaces.addons(spaceId) });

  const create = useMutation({
    mutationFn: (values) => spaceService.createAddon(spaceId, values),
    onSuccess: () => {
      invalidate();
      toast.success('Add-on added');
    },
    onError: (error) => toast.error('Could not add add-on', getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id) => spaceService.deleteAddon(spaceId, id),
    onSuccess: () => {
      invalidate();
      toast.info('Add-on removed');
    },
    onError: (error) => toast.error('Could not remove add-on', getErrorMessage(error)),
  });

  return {
    createAddon: create.mutate,
    isCreating: create.isPending,
    deleteAddon: remove.mutate,
    pendingId: remove.isPending ? remove.variables : undefined,
  };
};

/* -------------------------------------------------------------------------- */
/* Operating hours — one row per open weekday, create + delete only            */
/* -------------------------------------------------------------------------- */

export const useOperatingHours = (spaceId) =>
  useQuery({
    queryKey: queryKeys.spaces.hours(spaceId),
    queryFn: () => spaceService.getOperatingHours(spaceId),
    enabled: Boolean(spaceId),
  });

export const useOperatingHoursMutations = (spaceId) => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.spaces.hours(spaceId) });

  const create = useMutation({
    mutationFn: (values) => spaceService.createOperatingHoursRow(spaceId, values),
    onSuccess: () => {
      invalidate();
      toast.success('Hours added');
    },
    onError: (error) => toast.error('Could not add hours', getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id) => spaceService.deleteOperatingHoursRow(spaceId, id),
    onSuccess: () => {
      invalidate();
      toast.info('Marked closed');
    },
    onError: (error) => toast.error('Could not update hours', getErrorMessage(error)),
  });

  return {
    addHours: create.mutate,
    isAdding: create.isPending,
    removeHours: remove.mutate,
    pendingId: remove.isPending ? remove.variables : undefined,
  };
};

/* -------------------------------------------------------------------------- */
/* Blackout dates                                                              */
/* -------------------------------------------------------------------------- */

export const useBlackoutDates = (spaceId) =>
  useQuery({
    queryKey: queryKeys.spaces.blackouts(spaceId),
    queryFn: () => spaceService.getBlackoutDates(spaceId),
    enabled: Boolean(spaceId),
  });

export const useBlackoutDateMutations = (spaceId) => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.spaces.blackouts(spaceId) });

  const create = useMutation({
    mutationFn: (values) => spaceService.createBlackoutDate(spaceId, values),
    onSuccess: () => {
      invalidate();
      toast.success('Blackout date added');
    },
    onError: (error) => toast.error('Could not add blackout date', getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id) => spaceService.deleteBlackoutDate(spaceId, id),
    onSuccess: () => {
      invalidate();
      toast.info('Blackout date removed');
    },
    onError: (error) => toast.error('Could not remove blackout date', getErrorMessage(error)),
  });

  return {
    createBlackout: create.mutate,
    isCreating: create.isPending,
    deleteBlackout: remove.mutate,
    pendingId: remove.variables,
  };
};

/* -------------------------------------------------------------------------- */
/* Images                                                                       */
/* -------------------------------------------------------------------------- */

export const useSpaceImages = (spaceId) =>
  useQuery({
    queryKey: queryKeys.spaces.images(spaceId),
    queryFn: () => spaceService.getImages(spaceId),
    enabled: Boolean(spaceId),
  });

export const useSpaceImageMutations = (spaceId) => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.spaces.images(spaceId) });

  const upload = useMutation({
    mutationFn: (payload) => spaceService.uploadImage(spaceId, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Photo uploaded');
    },
    onError: (error) => toast.error('Could not upload photo', getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id) => spaceService.deleteImage(spaceId, id),
    onSuccess: () => {
      invalidate();
      toast.info('Photo removed');
    },
    onError: (error) => toast.error('Could not remove photo', getErrorMessage(error)),
  });

  return {
    uploadImage: upload.mutate,
    isUploading: upload.isPending,
    deleteImage: remove.mutate,
    pendingId: remove.isPending ? remove.variables : undefined,
  };
};
