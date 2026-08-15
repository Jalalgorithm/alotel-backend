import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, Plus, Search } from 'lucide-react';
import { cn } from '@/utils/classNames';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth';
import { useMarkNotificationRead } from '@/features/notifications';
import { useUIStore } from '@/stores/uiStore';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useHotkey } from '@/hooks/useHotkey';
import { ROLES, CAPABILITIES } from '@/lib/mock/people';
import { formatRelative } from '@/utils/format';
import { paths } from '@/routes/paths';

/** Notification tray — a preview of the real inbox (`useMyNotifications`); "View all" opens the full page. */
const NotificationTray = ({ notifications, onMarkRead, onClose }) => {
  const trayRef = useClickOutside(onClose, true);
  const unreadCount = notifications.filter((entry) => !entry.isRead).length;

  return (
    <div
      ref={trayRef}
      className="animate-fade-up absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-card border border-line bg-surface shadow-raised"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-[13px] font-semibold">Notifications</p>
        {unreadCount > 0 && (
          <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-bold text-warn">
            {unreadCount} new
          </span>
        )}
      </div>

      <ul className="scrollbar-slim max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <li className="px-4 py-6 text-center text-[11.5px] text-ink-muted">Nothing yet.</li>
        ) : (
          notifications.slice(0, 8).map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => !entry.isRead && onMarkRead(entry.id)}
                className={cn(
                  'flex w-full gap-2.5 border-b border-line px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-line-soft',
                  !entry.isRead && 'bg-brand-50/40',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn('mt-1 size-2 shrink-0 rounded-full', entry.isRead ? 'bg-line' : 'bg-brand-600')}
                />
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-ink">{entry.title}</span>
                  <span className="line-clamp-2 block text-[11px] text-ink-muted">{entry.body}</span>
                  <span className="mt-0.5 block text-[10px] text-ink-muted">{formatRelative(entry.createdAt)}</span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>

      <Link
        to={paths.notifications}
        onClick={onClose}
        className="block border-t border-line px-4 py-2.5 text-center text-[11.5px] font-semibold text-brand-700 hover:underline"
      >
        View all notifications
      </Link>
    </div>
  );
};

/**
 * Top bar: drawer trigger, command search, primary action, notifications and
 * the account chip — matching the Figma admin header.
 */
export const Topbar = ({ notifications = [] }) => {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const openDrawer = useUIStore((state) => state.openDrawer);
  const openCommand = useUIStore((state) => state.openCommand);
  const { markRead } = useMarkNotificationRead();

  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const role = ROLES.find((entry) => entry.id === user?.role);
  const unreadCount = notifications.filter((entry) => !entry.isRead).length;

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
            aria-label={`Notifications (${unreadCount} unread)`}
            aria-expanded={isTrayOpen}
            className="relative rounded-full p-2 text-ink-soft transition-colors hover:bg-black/5 hover:text-ink"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-surface" />
            )}
          </button>

          {isTrayOpen && (
            <NotificationTray notifications={notifications} onMarkRead={markRead} onClose={() => setIsTrayOpen(false)} />
          )}
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
