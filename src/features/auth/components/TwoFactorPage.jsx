import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { CodeInput } from '@/components/ui/CodeInput';
import { getErrorMessage } from '@/utils/errors';
import { AuthShell } from './AuthShell';
import { useConfirmTwoFactor, useResendTwoFactor } from '../hooks/useLogin';
import { landingPathFor } from '@/routes/navigation';
import { paths } from '@/routes/paths';

const CODE_LENGTH = 6;

/**
 * Second step of a two-factor staff sign-in.
 *
 * Reached only when `/auth/admin/login/` answers "code sent" instead of tokens;
 * the email is carried in router state, so a direct visit bounces to login.
 */
export const TwoFactorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');

  const { confirmCode, isPending, error } = useConfirmTwoFactor();
  const { resendCode, isPending: isResending, isSuccess: resent } = useResendTwoFactor();

  const email = location.state?.email;

  if (!email) return <Navigate to={paths.login} replace />;

  const submit = (value = code) => {
    if (value.length !== CODE_LENGTH) return;

    confirmCode(
      { email, code: value },
      {
        onSuccess: (result) => {
          const target = location.state?.from ?? landingPathFor(result.user.capabilities, result.user.role);
          navigate(target, { replace: true });
        },
      },
    );
  };

  const resend = () => resendCode({ email });

  return (
    <AuthShell>
      <span className="flex size-11 items-center justify-center rounded-full bg-brand-50">
        <MailCheck className="size-5 text-brand-600" aria-hidden="true" />
      </span>

      <h1 className="page-title mt-4 text-[26px]">Check your email</h1>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        We sent a {CODE_LENGTH}-digit verification code to <span className="font-semibold text-ink">{email}</span>.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="mt-6"
        noValidate
      >
        <CodeInput length={CODE_LENGTH} onChange={setCode} disabled={isPending} onComplete={submit} />

        {error && (
          <Alert variant="error" className="mt-4">
            {getErrorMessage(error, 'That code was not accepted.')}
          </Alert>
        )}

        {resent && !error && (
          <Alert variant="success" className="mt-4">
            A new code is on its way.
          </Alert>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          className="mt-5"
          isLoading={isPending}
          disabled={code.length !== CODE_LENGTH}
        >
          {isPending ? 'Verifying…' : 'Verify and sign in'}
        </Button>
      </form>

      <p className="mt-5 text-[12.5px] text-ink-soft">
        Didn&apos;t get it?{' '}
        <button
          type="button"
          onClick={resend}
          disabled={isResending}
          className="font-semibold text-brand-700 hover:underline disabled:opacity-50"
        >
          {isResending ? 'Sending…' : 'Send a new code'}
        </button>
      </p>

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
