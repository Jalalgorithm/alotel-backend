import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { cn } from '@/utils/classNames';
import { Logo } from '@/components/shared/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { NAV_GROUPS } from '@/routes/navigation';
import { NAV_ICONS } from './navIcons';
import { useAuth, useLogout } from '@/features/auth';
import { useUIStore } from '@/stores/uiStore';
import { ROLES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';

/**
 * Grouped navigation rail.
 *
 * Items the signed-in role cannot open are removed rather than disabled — a
 * Level 3 cleaner should not even see that a Payouts screen exists. A group
 * with nothing left in it disappears with its heading.
 */
export const Sidebar = ({ badges = {}, variant = 'docked' }) => {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const { logout, isPending } = useLogout();

  const isCollapsed = useUIStore((state) => state.isSidebarCollapsed) && variant === 'docked';
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const closeDrawer = useUIStore((state) => state.closeDrawer);

  const role = ROLES.find((entry) => entry.id === user?.role);

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(item.capability)),
  })).filter((group) => group.items.length);

  const handleLogout = () => logout(undefined, { onSuccess: () => navigate(paths.login, { replace: true }) });

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'flex h-full flex-col border-r border-line bg-surface transition-[width] duration-200',
        isCollapsed ? 'w-[var(--spacing-sidebar-collapsed)]' : 'w-[var(--spacing-sidebar)]',
        variant === 'drawer' && 'w-[var(--spacing-sidebar)]',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-[var(--spacing-topbar)] shrink-0 items-center border-b border-line',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {isCollapsed ? <Logo withText={false} size="sm" /> : <Logo size="sm" />}

        {variant === 'drawer' ? (
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-black/5 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        ) : (
          !isCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-black/5 hover:text-ink"
            >
              <PanelLeftClose className="size-4" />
            </button>
          )
        )}
      </div>

      {isCollapsed && (
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
          className="mx-auto mt-2 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-black/5 hover:text-ink"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      {/* Groups */}
      <div className="scrollbar-slim flex-1 overflow-y-auto py-2">
        {visibleGroups.map((group) => (
          <div key={group.id} className="mb-1">
            {group.label && !isCollapsed && (
              <p className="px-4 pb-1 pt-3 text-[9.5px] font-bold uppercase tracking-[0.09em] text-ink-muted">
                {group.label}
              </p>
            )}
            {group.label && isCollapsed && <div className="mx-3 my-2 h-px bg-line" />}

            <ul>
              {group.items.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                const badgeCount = item.badge ? badges[item.badge] : undefined;

                return (
                  <li key={item.id}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={variant === 'drawer' ? closeDrawer : undefined}
                      title={isCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group relative mx-2 my-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] transition-colors',
                          isCollapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-brand-50 font-semibold text-brand-700'
                            : 'text-ink-soft hover:bg-line-soft hover:text-ink',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-600"
                            />
                          )}

                          {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}

                          {!isCollapsed && (
                            <>
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              {badgeCount > 0 && (
                                <span
                                  className={cn(
                                    'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                                    isActive ? 'bg-brand-600 text-white' : 'bg-black/5 text-ink-soft',
                                  )}
                                >
                                  {badgeCount}
                                </span>
                              )}
                            </>
                          )}

                          {/* Collapsed rail still signals "there is something here" */}
                          {isCollapsed && badgeCount > 0 && (
                            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-warn" />
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Account */}
      <div className={cn('shrink-0 border-t border-line p-3', isCollapsed && 'px-2')}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar name={user?.name} initials={user?.initials} color={role?.color} size="sm" />
            <button
              type="button"
              onClick={handleLogout}
              disabled={isPending}
              aria-label="Log out"
              className="rounded-md p-1.5 text-danger transition-colors hover:bg-danger-soft disabled:opacity-50"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <Avatar name={user?.name} initials={user?.initials} color={role?.color} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-ink">{user?.name}</p>
                <p className="truncate text-[10.5px] text-ink-muted">{role?.name}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isPending}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-danger/20 bg-danger-soft py-1.5 text-[11.5px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              {isPending ? 'Signing out…' : 'Log Out'}
            </button>
          </>
        )}
      </div>
    </nav>
  );
};
