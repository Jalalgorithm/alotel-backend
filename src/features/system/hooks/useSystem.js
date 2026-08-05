import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { systemService } from '../services/systemService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

export const useSettings = () =>
  useQuery({
    queryKey: queryKeys.system.settings(),
    queryFn: systemService.getSettings,
  });

/**
 * Persist a settings change.
 *
 * Each control saves on change rather than behind a Save button — an admin
 * toggling 2FA off should not be able to walk away believing it stuck.
 */
export const useSaveSettings = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: systemService.saveSettings,
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
