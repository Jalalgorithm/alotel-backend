import { useQuery } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { queryKeys } from '@/lib/queryKeys';
import { authStorage } from '@/lib/storage';

/**
 * The single source of truth for "which admin is signed in".
 *
 * Session persistence across refreshes works in two layers:
 *  1. `initialData` returns the localStorage copy synchronously, so a reload
 *     paints the authenticated UI immediately — no auth flicker;
 *  2. the query then revalidates against the API (or mock) in the background,
 *     which is also how a role or deactivation change takes effect.
 */
export const useCurrentUser = () => {
  const cachedUser = authStorage.getUser();

  return useQuery({
    queryKey: queryKeys.auth.currentUser(),
    queryFn: authService.getCurrentUser,
    initialData: cachedUser ?? undefined,
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: Boolean(authStorage.getToken()),
  });
};
