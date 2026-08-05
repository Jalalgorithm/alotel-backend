import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import { env } from '@/lib/env';

/** Supplies the shared React Query client (plus devtools during development). */
export const QueryProvider = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
    {env.isDev && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
  </QueryClientProvider>
);
