import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { systemService } from '../services/systemService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';
import { useAuth } from '@/features/auth';

/** `userId` is needed to read the signed-in admin's own notification preferences alongside the shared config store. */
export const useSettings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.system.settings(),
    queryFn: () => systemService.getSettings(user?.id),
    enabled: Boolean(user),
  });
};

/**
 * Persist a settings change.
 *
 * Each control saves on change rather than behind a Save button — an admin
 * toggling 2FA off should not be able to walk away believing it stuck.
 */
export const useSaveSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (patch) => systemService.saveSettings(patch, user?.id),
    onMutate: async (patch) => {
      // Optimistic: the switch moves immediately, then reconciles.
      await queryClient.cancelQueries({ queryKey: queryKeys.system.settings() });
      const previous = queryClient.getQueryData(queryKeys.system.settings());

      queryClient.setQueryData(queryKeys.system.settings(), (current) =>
        current ? { ...current, settings: { ...current.settings, ...patch } } : current,
      );

      return { previous };
    },
    onError: (error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.system.settings(), context.previous);
      toast.error('Could not save setting', getErrorMessage(error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.system.settings() }),
  });

  return { saveSettings: mutation.mutate, isPending: mutation.isPending };
};

export const useHelpArticles = () =>
  useQuery({
    queryKey: ['system', 'help'],
    queryFn: systemService.getHelp,
    staleTime: Infinity,
  });

/* -------------------------------------------------------------------------- */
/* Announcements — `GET/POST /admin/announcements/`                           */
/* -------------------------------------------------------------------------- */

export const useAnnouncements = () =>
  useQuery({
    queryKey: queryKeys.system.announcements(),
    queryFn: systemService.getAnnouncements,
  });

/** Super Admin only — enforced server-side; the form that calls this should be hidden for anyone else. */
export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: systemService.createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.announcements() });
      toast.success('Announcement posted');
    },
    onError: (error) => toast.error('Could not post announcement', getErrorMessage(error)),
  });

  return { createAnnouncement: mutation.mutate, isPending: mutation.isPending };
};
