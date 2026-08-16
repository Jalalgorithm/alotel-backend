import { useState } from 'react';
import { Server } from 'lucide-react';
import { env } from '@/lib/env';
import { cn } from '@/utils/classNames';
import { useClickOutside } from '@/hooks/useClickOutside';

/** Flag key → short label, shown only for the flags that are actually on. */
const MOCK_LABELS = {
  useMock: 'catalogue/bookings',
  useMockAuth: 'auth',
  useMockProperties: 'properties',
  useMockBookings: 'reservations',
  useMockPayments: 'payments',
  useMockTaxes: 'taxes',
  useMockPricing: 'pricing',
  useMockDashboard: 'dashboard',
  useMockAnalytics: 'analytics',
  useMockSpaces: 'spaces',
  useMockMaintenance: 'maintenance',
  useMockVerifications: 'verifications',
  useMockAnnouncements: 'announcements',
  useMockSettings: 'settings',
  useMockNotifications: 'notifications',
};

/**
 * Which backend/mode this tab is actually talking to — visible at a glance
 * instead of something only discoverable via DevTools. Grew directly out of
 * a debugging session where "is this even hitting the right server" took far
 * longer to answer than it should have.
 */
export const EnvBadge = () => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useClickOutside(() => setIsOpen(false), true);

  const activeMocks = Object.entries(MOCK_LABELS).filter(([key]) => env[key]);
  const hasMocks = activeMocks.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-colors',
          hasMocks ? 'border-warn/30 bg-warn-soft text-warn' : 'border-line bg-white text-ink-muted hover:border-brand-300',
        )}
      >
        <Server className="size-3" aria-hidden="true" />
        {hasMocks ? `Mock: ${activeMocks.length}` : 'Live API'}
      </button>

      {isOpen && (
        <div className="animate-fade-up absolute right-0 top-full z-50 mt-2 w-64 rounded-card border border-line bg-surface p-3 text-[11px] shadow-raised">
          <p className="font-semibold text-ink">API base URL</p>
          <p className="mt-0.5 break-all text-ink-muted">{env.apiUrl}</p>

          <p className="mt-2.5 font-semibold text-ink">Mock data</p>
          {hasMocks ? (
            <ul className="mt-1 space-y-0.5 text-ink-muted">
              {activeMocks.map(([key, label]) => (
                <li key={key}>· {label}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-0.5 text-ink-muted">None — every feature is on the real API.</p>
          )}
        </div>
      )}
    </div>
  );
};
