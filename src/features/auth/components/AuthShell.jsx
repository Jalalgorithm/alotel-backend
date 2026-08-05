import { LockKeyhole } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { cn } from '@/utils/classNames';
import BACKGROUND from '@/assets/images/auth-background.jpg';

/**
 * Full-bleed photography behind an opaque card — the shell every admin auth
 * screen sits in, so login, 2FA and the password screens stay identical.
 *
 * The scrim is dark at the top and bottom (where white type sits) and light
 * through the middle, so the photograph actually reads instead of flattening
 * to solid green.
 */

export const AuthShell = ({ children, footer, className }) => (
  <div className="relative flex min-h-screen flex-col">
    <div className="absolute inset-0 -z-10">
      <img
        src={BACKGROUND}
        alt=""
        className="size-full object-cover"
        onError={(event) => {
          // Fall back to the brand gradient rather than a broken-image frame.
          event.currentTarget.style.display = 'none';
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, rgba(8,44,30,0.80) 0%, rgba(8,44,30,0.34) 26%, rgba(8,44,30,0.30) 62%, rgba(8,44,30,0.86) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(90,170,64,0.20) 0, transparent 48%), radial-gradient(circle at 85% 80%, rgba(18,96,63,0.24) 0, transparent 52%)',
        }}
      />
    </div>

    <header className="text-on-photo px-5 py-6 sm:px-10">
      <Logo tone="light" size="lg" as="div" />
    </header>

    <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
      <div className={cn('w-full max-w-[26rem]', className)}>
        <div className="overflow-hidden rounded-2xl bg-surface shadow-raised">
          <div aria-hidden="true" className="h-1 bg-logo" />
          <div className="p-6 sm:p-8">{children}</div>
        </div>

        {footer && <div className="text-on-photo mt-5 text-center text-[11.5px] text-white/90">{footer}</div>}
      </div>
    </main>

    <footer className="px-5 pb-6 text-center sm:px-10">
      <p className="text-on-photo flex items-center justify-center gap-2 text-[11px] text-white/70">
        <LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" />© {new Date().getFullYear()} Alotel
        Spaces · No admin at any level can view full card numbers.
      </p>
    </footer>
  </div>
);
