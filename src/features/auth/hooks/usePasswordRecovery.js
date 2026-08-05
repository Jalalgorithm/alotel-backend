import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

/**
 * "Forgot your password?" — requests a reset link.
 *
 * The API returns 400 "No user with this email" for an unknown address, which
 * would let anyone probe which staff emails exist. We deliberately report the
 * same neutral outcome either way, and only surface genuine failures.
 */
export const useForgotPassword = () => {
  const mutation = useMutation({
    mutationFn: async (payload) => {
      try {
        await authService.forgotPassword(payload);
      } catch (error) {
        if (error?.response?.status !== 400) throw error;
      }
      return { email: payload.email };
    },
    onSuccess: ({ email }) =>
      toast.success('Check your inbox', `If an account exists for ${email}, a reset link is on its way.`),
    onError: (error) => toast.error('Request failed', getErrorMessage(error)),
  });

  return {
    requestReset: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
};

/** "Reset your password" — consumes the emailed uid + token. */
export const useResetPassword = () => {
  const mutation = useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: () => toast.success('Password updated', 'You can now sign in with your new password.'),
    onError: (error) => toast.error('Reset failed', getErrorMessage(error)),
  });

  return {
    resetPassword: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
};
