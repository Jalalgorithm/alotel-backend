import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { getErrorMessage } from '@/utils/errors';
import { AuthShell } from './AuthShell';
import { useResetPassword } from '../hooks/usePasswordRecovery';
import { paths } from '@/routes/paths';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must contain a letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Set a new password from an emailed link.
 *
 * `uid` and `token` come from the path, because that is the shape of the link
 * the API sends: `{ADMIN_FRONTEND_URL}/password-reset/{uid}/{token}/`.
 */
export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { uid, token } = useParams();
  const { resetPassword, isPending, isSuccess, error } = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { password: '', confirmPassword: '' } });

  useEffect(() => {
    if (!isSuccess) return undefined;
    const timer = setTimeout(() => navigate(paths.login, { replace: true }), 1600);
    return () => clearTimeout(timer);
  }, [isSuccess, navigate]);

  // A truncated or hand-typed URL can't be recovered from — say so plainly
  // rather than failing on submit.
  if (!uid || !token) {
    return (
      <AuthShell>
        <h1 className="page-title text-[26px]">This reset link is incomplete</h1>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          Open the link directly from the email we sent, or request a new one.
        </p>
        <Button variant="primary" size="lg" fullWidth className="mt-6" to={paths.forgotPassword}>
          Request a new link
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <span className="flex size-11 items-center justify-center rounded-full bg-brand-50">
        <ShieldCheck className="size-5 text-brand-600" aria-hidden="true" />
      </span>

      <h1 className="page-title mt-4 text-[26px]">Reset your password</h1>
      <p className="mt-1.5 text-[13px] text-ink-soft">Choose a strong password to keep the portal secure.</p>

      <form onSubmit={handleSubmit(({ password }) => resetPassword({ uid, token, password }))} className="mt-6 space-y-4" noValidate>
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="Enter your new password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {error && <Alert variant="error">{getErrorMessage(error)}</Alert>}
        {isSuccess && <Alert variant="success">Password updated — redirecting you to sign in…</Alert>}

        <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isPending}>
          {isPending ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>

      <Link
        to={paths.login}
        className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-semibold text-brand-700 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to sign in
      </Link>
    </AuthShell>
  );
};
