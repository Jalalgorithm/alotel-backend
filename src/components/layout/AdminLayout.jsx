import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useUIStore } from '@/stores/uiStore';
import { useNavBadges } from '@/features/dashboard';
import { useMyNotifications } from '@/features/notifications';

/**
 * The portal shell: docked sidebar on desktop, overlay drawer below `lg`,
 * top bar, and the routed screen.
 *
 * The main region is the only scroll container, which keeps the sidebar and
 * top bar fixed the way a dense admin tool should behave.
 */
export const AdminLayout = () => {
  const location = useLocation();
  const isDrawerOpen = useUIStore((state) => state.isDrawerOpen);
  const closeDrawer = useUIStore((state) => state.closeDrawer);

  const { data: badges = {} } = useNavBadges();
  const { data: notifications = [] } = useMyNotifications();

  // Close the mobile drawer whenever navigation happens.
  useEffect(() => {
    closeDrawer();
  }, [location.pathname, closeDrawer]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!isDrawerOpen) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isDrawerOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Docked sidebar */}
      <div className="hidden shrink-0 lg:block">
        <Sidebar badges={badges} />
      </div>

      {/* Mobile drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeDrawer}
            className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
          />
          <div className="animate-fade-in absolute inset-y-0 left-0">
            <Sidebar badges={badges} variant="drawer" />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar notifications={notifications} />

        <main className="scrollbar-slim flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[100rem] p-4 sm:p-5 lg:p-6">
            {/* A crash in one screen keeps the shell intact and offers a retry */}
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <CommandPalette />
    </div>
  );
};
