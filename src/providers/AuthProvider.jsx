import { createContext, useContext, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth';
import { useAuthStore } from '@/stores/authStore';
import { authStorage } from '@/lib/storage';
import { queryKeys } from '@/lib/queryKeys';

const AuthContext = createContext(null);

/**
 * Bridges the `current-user` query into the Zustand store and reacts to forced
 * logouts raised by the axios interceptor.
 *
 * Rendering it once at the root means route guards, the sidebar and every
 * permission check read a single, always-consistent session value.
 */
export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const { data: user, isLoading, isFetched } = useCurrentUser();
  const setUser = useAuthStore((state) => state.setUser);
  const setInitialised = useAuthStore((state) => state.setInitialised);
  const clearSession = useAuthStore((state) => state.clearSession);

  // Mirror the query result into the store.
  useEffect(() => {
    if (isLoading) return;

    if (user) setUser(user);
    else if (isFetched || !authStorage.getToken()) {
      // Fetched and empty, or never had a token: this visitor is signed out.
      clearSession();
    }

    setInitialised();
  }, [user, isLoading, isFetched, setUser, clearSession, setInitialised]);

  // The interceptor fires this when a refresh attempt fails.
  useEffect(() => {
    const onSessionExpired = () => {
      clearSession();
      queryClient.setQueryData(queryKeys.auth.currentUser(), null);
      queryClient.clear();
    };

    window.addEventListener('alotel:session-expired', onSessionExpired);
    return () => window.removeEventListener('alotel:session-expired', onSessionExpired);
  }, [clearSession, queryClient]);

  const value = useMemo(() => ({ user: user ?? null, isAuthenticated: Boolean(user) }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** Optional context accessor — most components should prefer `useAuth()`. */
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within <AuthProvider>');
  return context;
};
