import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { Loading } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { landingPathFor } from './navigation';
import { paths } from './paths';

/**
 * Route guard for the authenticated portal.
 *
 * Two distinct outcomes, deliberately kept separate:
 *  - *not signed in* → redirect to /login, remembering where they were going;
 *  - *signed in without the capability* → a 403 screen, not a redirect. Silently
 *    bouncing a Level 2 away from Payments looks like a broken link; saying
 *    "your role can't open this" is honest and debuggable.
 *
 * While the session is still being confirmed we render a loader rather than
 * redirecting — otherwise a refresh on any screen would flash the login page.
 */
export const ProtectedRoute = ({ children, capability }) => {
  const { isAuthenticated, isInitialising, can, capabilities, role } = useAuth();
  const location = useLocation();

  if (isInitialising) return <Loading fullScreen label="Checking your session…" />;

  if (!isAuthenticated) {
    return <Navigate to={paths.login} replace state={{ from: location.pathname + location.search }} />;
  }

  if (capability && !can(capability)) {
    return (
      <EmptyState
        className="min-h-[60vh]"
        icon={<ShieldAlert className="size-5 text-danger" aria-hidden="true" />}
        title="You don't have access to this screen"
        description="Your role doesn't include this permission. Ask a Super Admin if you need it."
        action={
          <Button variant="primary" to={landingPathFor(capabilities, role)}>
            Go to my dashboard
          </Button>
        }
      />
    );
  }

  return children ?? <Outlet />;
};

/**
 * The mirror of `ProtectedRoute`: keeps a signed-in admin off the login screen.
 */
export const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isInitialising, capabilities, role } = useAuth();

  if (isInitialising) return <Loading fullScreen label="Checking your session…" />;
  if (isAuthenticated) return <Navigate to={landingPathFor(capabilities, role)} replace />;

  return children ?? <Outlet />;
};
