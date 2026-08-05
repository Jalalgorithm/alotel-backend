import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { AuthShell } from './AuthShell';
import { useForgotPassword } from '../hooks/usePasswordRecovery';
import { emailField } from '@/utils/validators';
import { paths } from '@/routes/paths';

const schema = z.object({ email: emailField });

/** Request a password reset link for a staff account. */
export const ForgotPasswordPage = () => {
  const { requestReset, isPending, isSuccess, data } = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  return (
    <AuthShell>
      <span className="flex size-11 items-center justify-center rounded-full bg-brand-50">
        <KeyRound className="size-5 text-brand-600" aria-hidden="true" />
      </span>

      <h1 className="page-title mt-4 text-[26px] leading-tight">Forgot your password?</h1>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        Enter your work email and we&apos;ll send a link to reset it.
      </p>

      <form onSubmit={handleSubmit(requestReset)} className="mt-6 space-y-4" noValidate>
        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@alotelspaces.com"
          error={errors.email?.message}
          {...register('email')}
        />

        {isSuccess && (
          <Alert variant="success">
            If an account exists for <span className="font-semibold">{data?.email}</span>, a reset link is on
            its way. Check your inbox and spam folder.
          </Alert>
        )}

        <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isPending}>
          {isPending ? 'Sending…' : 'Send reset link'}
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
