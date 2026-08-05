import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

/**
 * Sign-in mutation.
 *
 * Resolves to a tagged result because the API has two success outcomes:
 * tokens, or "a 2FA code has been emailed". Only the first is a session, so
 * only the first seeds the cache and greets the admin.
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  const mutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (result) => {
      if (result.status !== 'authenticated') return;

      queryClient.setQueryData(queryKeys.auth.currentUser(), result.user);
      setUser(result.user);
      toast.success('Signed in', `Welcome back, ${result.user.name.split(' ')[0]}.`);
    },
    onError: (error) => toast.error('Sign in failed', getErrorMessage(error)),
  });

  return {
    login: mutation.mutate,
    loginAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
};

/**
 * Ask for a fresh 2FA code.
 *
 * Hits the dedicated resend endpoint, so the password never has to be carried
 * around just to re-trigger an email.
 */
export const useResendTwoFactor = () => {
  const mutation = useMutation({
    mutationFn: authService.resendTwoFactor,
    onSuccess: () => toast.success('Code sent', 'A new verification code is on its way.'),
    onError: (error) => toast.error('Could not resend code', getErrorMessage(error)),
  });

  return { resendCode: mutation.mutate, isPending: mutation.isPending, isSuccess: mutation.isSuccess };
};

/** Second leg of a 2FA sign-in: exchange the emailed code for a session. */
export const useConfirmTwoFactor = () => {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  const mutation = useMutation({
    mutationFn: authService.confirmTwoFactor,
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.auth.currentUser(), result.user);
      setUser(result.user);
      toast.success('Signed in', `Welcome back, ${result.user.name.split(' ')[0]}.`);
    },
    onError: (error) => toast.error('Verification failed', getErrorMessage(error)),
  });

  return {
    confirmCode: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
  };
};
