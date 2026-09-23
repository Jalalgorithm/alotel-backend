import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { CodeInput } from '@/components/ui/CodeInput';
import { getErrorMessage, getRetryAfterMessage } from '@/utils/errors';
import { AuthShell } from './AuthShell';
import { useConfirmTwoFactor, useResendTwoFactor } from '../hooks/useLogin';
import { landingPathFor } from '@/routes/navigation';
import { paths } from '@/routes/paths';

const CODE_LENGTH = 6;

/** The server destroys a code outright — retyping it can never work again. */
const CODE_IS_SPENT = /request a new one|no pending 2fa code/i;

/** No fresh code is coming either: the address is capped for the day. */
const RESEND_IS_CAPPED = /requested today/i;

/**
 * Second step of a two-factor staff sign-in.
 *
 * Reached only when `/auth/admin/login/` answers "code sent" instead of tokens;
 * the email is carried in router state, so a direct visit bounces to login.
 *
 * The login ticket travels the same way. It is what proves this screen was
 * reached by passing the password, so the code is not a credential on its own.
 * It is deliberately *not* part of the entry guard: the API still accepts a
 * confirm without one, and refusing to render here over a missing ticket would
 * break sign-in today to guard against a server setting that is currently off.
 */
export const TwoFactorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  // Bumped on each fresh code, to remount `CodeInput` and clear its digits.
  const [attempt, setAttempt] = useState(0);

  const { confirmCode, isPending, error, reset: resetConfirm } = useConfirmTwoFactor();
  const { resendCode, isPending: isResending, isSuccess: resent, error: resendError } = useResendTwoFactor();

  const email = location.state?.email;
  const loginTicket = location.state?.loginTicket ?? null;

  if (!email) return <Navigate to={paths.login} replace />;

  const confirmMessage = error ? getRetryAfterMessage(error) ?? getErrorMessage(error, 'That code was not accepted.') : null;
  const resendMessage = resendError ? getRetryAfterMessage(resendError) ?? getErrorMessage(resendError) : null;

  // Too many wrong guesses burn the code server-side. Leaving the input live
  // after that invites the admin to keep typing into something already dead.
  const codeIsSpent = CODE_IS_SPENT.test(confirmMessage ?? '');
  const resendBlocked = RESEND_IS_CAPPED.test(resendMessage ?? '') || resendError?.response?.status === 429;

  const submit = (value = code) => {
    if (value.length !== CODE_LENGTH || codeIsSpent) return;

    confirmCode(
      { email, code: value, loginTicket },
      {
        onSuccess: (result) => {
          const target = location.state?.from ?? landingPathFor(result.user.capabilities, result.user.role);
          navigate(target, { replace: true });
        },
      },
    );
  };

  const resend = () =>
    resendCode(
      { email },
      {
        // A new code makes the previous rejection stale — clear it, or the
        // page stays stuck in its dead-code state with a usable code waiting.
        onSuccess: () => {
          resetConfirm();
          setCode('');
          setAttempt((current) => current + 1);
        },
      },
    );

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
        <CodeInput
          key={attempt}
          length={CODE_LENGTH}
          onChange={setCode}
          disabled={isPending || codeIsSpent}
          onComplete={submit}
        />

        {confirmMessage && (
          <Alert variant="error" className="mt-4">
            {confirmMessage}
          </Alert>
        )}

        {resendMessage && (
          <Alert variant="error" className="mt-4">
            {resendMessage}
          </Alert>
        )}

        {resent && !confirmMessage && !resendMessage && (
          <Alert variant="success" className="mt-4">
            A new code is on its way.
          </Alert>
        )}

        {/* Once the code is spent, asking for a new one is the only way
            forward — so it becomes the primary action instead of a
            submit button that is guaranteed to fail. */}
        {codeIsSpent ? (
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            className="mt-5"
            onClick={resend}
            isLoading={isResending}
            disabled={isResending || resendBlocked}
          >
            {isResending ? 'Sending…' : 'Send a new code'}
          </Button>
        ) : (
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
        )}
      </form>

      {!codeIsSpent && (
        <p className="mt-5 text-[12.5px] text-ink-soft">
          Didn&apos;t get it?{' '}
          <button
            type="button"
            onClick={resend}
            disabled={isResending || resendBlocked}
            className="font-semibold text-brand-700 hover:underline disabled:opacity-50"
          >
            {isResending ? 'Sending…' : 'Send a new code'}
          </button>
        </p>
      )}

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
