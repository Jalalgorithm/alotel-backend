import { AppProviders } from '@/providers';
import { AppRoutes } from '@/routes';
import { Toaster } from '@/components/shared/Toaster';

/** Application root: providers, route table and global chrome. */
export const App = () => (
  <AppProviders>
    <AppRoutes />
    <Toaster />
  </AppProviders>
);
