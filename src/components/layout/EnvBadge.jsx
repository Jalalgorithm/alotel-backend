import { useState } from 'react';
import { Server } from 'lucide-react';
import { env } from '@/lib/env';
import { cn } from '@/utils/classNames';
import { useClickOutside } from '@/hooks/useClickOutside';

/**
 * Which backend this tab is actually talking to — visible at a glance instead
 * of something only discoverable via DevTools. Grew directly out of a
 * debugging session where "is this even hitting the right server" took far
 * longer to answer than it should have.
 *
 * It used to also count active `VITE_USE_MOCK*` flags. Those are gone, and by
 * the end they were worse than useless: the flags were read by nothing, so the
 * badge sat there reading "Mock: 5" over a portal running entirely on the real
 * API — the opposite of what it exists to tell you.
 */
export const EnvBadge = () => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useClickOutside(() => setIsOpen(false), true);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-colors',
          'border-line bg-white text-ink-muted hover:border-brand-300',
        )}
      >
        <Server className="size-3" aria-hidden="true" />
        Live API
      </button>

      {isOpen && (
        <div className="animate-fade-up absolute right-0 top-full z-50 mt-2 w-64 rounded-card border border-line bg-surface p-3 text-[11px] shadow-raised">
          <p className="font-semibold text-ink">API base URL</p>
          <p className="mt-0.5 break-all text-ink-muted">{env.apiUrl}</p>
        </div>
      )}
    </div>
  );
};
