import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

/**
 * Root provider stack. Order matters:
 * ErrorBoundary → Query (AuthProvider needs a client) → Router → Auth
 * (AuthProvider renders inside the router so guards can navigate).
 */
export const AppProviders = ({ children }) => (
  <ErrorBoundary>
    <QueryProvider>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryProvider>
  </ErrorBoundary>
);
