import { useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';

/**
 * Read-only view of the session, plus the capability check every guard and
 * conditional action uses.
 *
 * The store is kept in sync with React Query by `AuthProvider`, so this hook
 * never triggers a request of its own.
 *
 * @returns {{
 *   user: object|null,
 *   role: string|undefined,
 *   capabilities: string[],
 *   isAuthenticated: boolean,
 *   isInitialising: boolean,
 *   can: (capability: string) => boolean,
 *   canAny: (capabilities: string[]) => boolean,
 * }}
 */
export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const capabilities = useAuthStore((state) => state.capabilities);
  const isInitialising = useAuthStore((state) => state.isInitialising);

  const can = useCallback(
    (capability) => !capability || capabilities.includes(capability),
    [capabilities],
  );

  const canAny = useCallback(
    (wanted = []) => wanted.some((capability) => capabilities.includes(capability)),
    [capabilities],
  );

  return {
    user,
    role: user?.role,
    capabilities,
    isAuthenticated: Boolean(user),
    isInitialising,
    can,
    canAny,
  };
};
