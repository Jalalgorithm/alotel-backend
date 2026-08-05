import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, Plus, Search } from 'lucide-react';
import { cn } from '@/utils/classNames';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth';
import { useUIStore } from '@/stores/uiStore';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useHotkey } from '@/hooks/useHotkey';
import { ROLES, CAPABILITIES } from '@/lib/mock/people';
import { formatRelative } from '@/utils/format';
import { paths } from '@/routes/paths';

/** Notification tray — the same alert set the dashboard surfaces. */
const NotificationTray = ({ alerts, onClose }) => {
  const trayRef = useClickOutside(onClose, true);

  return (
    <div
      ref={trayRef}
      className="animate-fade-up absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-card border border-line bg-surface shadow-raised"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-[13px] font-semibold">Notifications</p>
        <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-bold text-warn">
          {alerts.length} new
        </span>
      </div>

      <ul className="scrollbar-slim max-h-80 overflow-y-auto">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <Link
              to={alert.to}
              onClick={onClose}
              className="flex gap-2.5 border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-line-soft"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-1 size-2 shrink-0 rounded-full',
                  alert.tone === 'danger' ? 'bg-danger' : alert.tone === 'warn' ? 'bg-warn' : 'bg-brand-600',
                )}
              />
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-ink">{alert.title}</span>
                <span className="block text-[11px] text-ink-muted">{alert.description}</span>
                <span className="mt-0.5 block text-[10px] text-ink-muted">{formatRelative(alert.at)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Top bar: drawer trigger, command search, primary action, notifications and
 * the account chip — matching the Figma admin header.
 */
export const Topbar = ({ alerts = [] }) => {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const openDrawer = useUIStore((state) => state.openDrawer);
  const openCommand = useUIStore((state) => state.openCommand);

  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const role = ROLES.find((entry) => entry.id === user?.role);

  useHotkey('k', openCommand);

  return (
    <header className="flex h-[var(--spacing-topbar)] shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-5">
      <button
        type="button"
        onClick={openDrawer}
        aria-label="Open navigation"
        className="rounded-md p-2 text-ink-soft transition-colors hover:bg-black/5 hover:text-ink lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {/* Command search — centred on wide screens, as in the design */}
      <button
        type="button"
        onClick={openCommand}
        className="mx-auto flex h-9 w-full max-w-md items-center gap-2 rounded-full border border-line bg-canvas px-3.5 text-left transition-colors hover:border-brand-300"
      >
        <Search className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[12px] text-ink-muted">
          Search by property, bookings, guests…
        </span>
        <kbd className="hidden shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] text-ink-muted sm:block">
          ⌘K
        </kbd>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        {can(CAPABILITIES.propertiesManage) && (
          <Button
            variant="primary"
            size="sm"
            to={paths.propertyNew}
            leftIcon={<Plus className="size-3.5" aria-hidden="true" />}
            className="hidden sm:inline-flex"
          >
            Add Property
          </Button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsTrayOpen((open) => !open)}
            aria-label={`Notifications (${alerts.length} unread)`}
            aria-expanded={isTrayOpen}
            className="relative rounded-full p-2 text-ink-soft transition-colors hover:bg-black/5 hover:text-ink"
          >
            <Bell className="size-4" />
            {alerts.length > 0 && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-surface" />
            )}
          </button>

          {isTrayOpen && <NotificationTray alerts={alerts} onClose={() => setIsTrayOpen(false)} />}
        </div>

        <button
          type="button"
          onClick={() => navigate(paths.settings)}
          aria-label="Account settings"
          className="rounded-full transition-transform hover:scale-105"
        >
          <Avatar name={user?.name} initials={user?.initials} color={role?.color} size="md" />
        </button>
      </div>
    </header>
  );
};
