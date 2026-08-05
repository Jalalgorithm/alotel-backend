import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/uiStore';

/**
 * Sign-out mutation.
 *
 * Clearing the *entire* query cache matters: without it, the next admin to sign
 * in on this device could briefly see the previous admin's cached data — which
 * on this portal could mean financials a Level 2 is not permitted to see.
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);

  const mutation = useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      clearSession();
      queryClient.clear();
      toast.info('Signed out', 'Your admin session has ended.');
    },
  });

  return {
    logout: mutation.mutate,
    logoutAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
};
