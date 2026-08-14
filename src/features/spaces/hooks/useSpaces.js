import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { spaceService } from '../services/spaceService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';
import { paths } from '@/routes/paths';

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

export const useDeleteSpace = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: (id) => spaceService.deleteSpace(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.spaces.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all });
      toast.success('Space deleted');
      navigate(paths.spaces);
    },
    onError: (error) => toast.error('Could not delete space', getErrorMessage(error)),
  });

  return { deleteSpace: mutation.mutate, isPending: mutation.isPending };
};

/* -------------------------------------------------------------------------- */
/* Layouts                                                                     */
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

  const update = useMutation({
    mutationFn: ({ id, values }) => spaceService.updateLayout(spaceId, id, values),
    onSuccess: () => {
      invalidate();
      toast.success('Layout updated');
    },
    onError: (error) => toast.error('Could not update layout', getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id) => spaceService.deleteLayout(spaceId, id),
    onSuccess: () => {
      invalidate();
      toast.info('Layout removed');
    },
    onError: (error) => toast.error('Could not remove layout', getErrorMessage(error)),
  });

  return {
    createLayout: create.mutate,
    isCreating: create.isPending,
    updateLayout: (id, values) => update.mutate({ id, values }),
    deleteLayout: remove.mutate,
    pendingId: update.isPending ? update.variables?.id : remove.isPending ? remove.variables : undefined,
  };
};

/* -------------------------------------------------------------------------- */
/* Add-ons                                                                     */
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

  const update = useMutation({
    mutationFn: ({ id, values }) => spaceService.updateAddon(spaceId, id, values),
    onSuccess: () => {
      invalidate();
      toast.success('Add-on updated');
    },
    onError: (error) => toast.error('Could not update add-on', getErrorMessage(error)),
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
    updateAddon: (id, values) => update.mutate({ id, values }),
    deleteAddon: remove.mutate,
    pendingId: update.isPending ? update.variables?.id : remove.isPending ? remove.variables : undefined,
  };
};

/* -------------------------------------------------------------------------- */
/* Operating hours & blackout dates                                            */
/* -------------------------------------------------------------------------- */

export const useOperatingHours = (spaceId) =>
  useQuery({
    queryKey: queryKeys.spaces.hours(spaceId),
    queryFn: () => spaceService.getOperatingHours(spaceId),
    enabled: Boolean(spaceId),
  });

export const useUpdateOperatingHours = (spaceId) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (weekRows) => spaceService.updateOperatingHours(spaceId, weekRows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.hours(spaceId) });
      toast.success('Operating hours saved');
    },
    onError: (error) => toast.error('Could not save operating hours', getErrorMessage(error)),
  });

  return { saveHours: mutation.mutate, isPending: mutation.isPending };
};

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
