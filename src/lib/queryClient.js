import { QueryClient } from '@tanstack/react-query';

/**
 * Application-wide React Query client.
 *
 * `retry` deliberately skips 4xx responses: a 401/403/404 will not become a 200
 * by asking again, and retrying auth failures delays the redirect to /login.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = error?.response?.status ?? error?.status;
        if (status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});
