import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/features/auth';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

/** The signed-in admin's own notification inbox — the Topbar bell and the Notifications page. */
export const useMyNotifications = () => {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.notifications.list(user?.id),
    queryFn: () => notificationService.getMyNotifications(user.id),
    enabled: isAuthenticated && Boolean(user?.id),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
};

export const useMarkNotificationRead = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(user?.id) }),
    onError: (error) => toast.error('Could not update notification', getErrorMessage(error)),
  });

  return { markRead: mutation.mutate, isPending: mutation.isPending };
};
