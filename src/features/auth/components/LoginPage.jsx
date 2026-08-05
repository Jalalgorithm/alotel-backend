import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/utils/classNames';
import { getErrorMessage } from '@/utils/errors';
import { AuthShell } from './AuthShell';
import { useLogin } from '../hooks/useLogin';
import { loginSchema } from '@/utils/validators';
import { landingPathFor } from '@/routes/navigation';
import { paths } from '@/routes/paths';
import { env } from '@/lib/env';
import { ROLES, staff } from '@/lib/mock/people';

/**
 * Dev-only sign-in shortcuts, one per role level.
 *
 * Mock mode uses the bundled fixtures; live mode uses the accounts created by
 * the backend seed script, so the buttons work either way.
 */
const DEV_ACCOUNTS = env.useMockAuth
  ? ROLES.map((role) => {
      const account = staff.find((member) => member.role === role.id && member.status === 'Active');
      return { role, email: account?.email, password: account?.password };
    }).filter((entry) => entry.email)
  : [
      { role: ROLES[0], email: 'admin@alotelspaces.com', password: 'Password123' },
      { role: ROLES[1], email: 'fm@alotelspaces.com', password: 'Password123' },
      { role: ROLES[2], email: 'hk@alotelspaces.com', password: 'Password123' },
    ];

/** Admin sign-in. */
export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isPending, error } = useLogin();
  const [showDev, setShowDev] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  const onSubmit = (values) =>
    login(
      { email: values.email, password: values.password },
      {
        onSuccess: (result) => {
          // 2FA accounts get a code instead of tokens. Carry the password
          // through so the code screen can re-send without a second sign-in.
          if (result.status === '2fa_required') {
            navigate(paths.twoFactor, {
              state: { email: result.email, password: values.password, from: location.state?.from },
            });
            return;
          }

          // Land on the first screen this role can actually open — a Level 3
          // cleaner has no dashboard access and would bounce straight back out.
          const target = location.state?.from ?? landingPathFor(result.user.capabilities, result.user.role);
          navigate(target, { replace: true });
        },
      },
    );

  // Named `applyDev`, not `useDev` — a `use` prefix would make the
  // rules-of-hooks lint treat this click handler as a React hook.
  const applyDev = (account) => {
    setValue('email', account.email, { shouldValidate: true });
    setValue('password', account.password, { shouldValidate: true });
  };

  return (
    <AuthShell>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-brand-700">
        <ShieldCheck className="size-3" aria-hidden="true" />
        Admin Portal
      </span>

      <h1 className="page-title mt-3 text-[28px] leading-tight">Welcome back</h1>
      <p className="mt-1.5 text-[13px] text-ink-soft">Sign in to manage properties, bookings and staff.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@alotelspaces.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register('password')}
        />

        {error && <Alert variant="error">{getErrorMessage(error, 'We could not sign you in.')}</Alert>}

        <div className="flex justify-end">
          <Link to={paths.forgotPassword} className="text-[12px] font-semibold text-brand-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isPending}>
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {env.isDev && DEV_ACCOUNTS.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setShowDev((open) => !open)}
            aria-expanded={showDev}
            className="flex w-full items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted transition-colors hover:text-ink"
          >
            {env.useMockAuth ? 'Mock accounts' : 'Dev accounts'}
            <ChevronDown
              aria-hidden="true"
              className={cn('size-3.5 transition-transform', showDev && 'rotate-180')}
            />
          </button>

          {showDev && (
            <ul className="animate-fade-up mt-3 space-y-1.5">
              {DEV_ACCOUNTS.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    onClick={() => applyDev(account)}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-line px-2.5 py-2 text-left transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: account.role.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold text-ink">
                        {account.role.level} · {account.role.name}
                      </span>
                      <span className="block truncate text-[11px] text-ink-muted">{account.email}</span>
                    </span>
                  </button>
                </li>
              ))}

              <li className="pt-1 text-[11px] text-ink-muted">
                Password: <span className="font-semibold text-ink">{DEV_ACCOUNTS[0]?.password}</span>
              </li>
            </ul>
          )}
        </div>
      )}
    </AuthShell>
  );
};
