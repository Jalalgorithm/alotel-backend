import { create } from 'zustand';
import { authStorage } from '@/lib/storage';
import { capabilitiesForRole } from '@/lib/mock/people';

/**
 * Client-side mirror of the authenticated admin.
 *
 * React Query owns the *server* truth (`useCurrentUser`); this store exists so
 * the sidebar, route guards and non-React code can read the session — and the
 * capability list derived from it — synchronously.
 */
/**
 * The service already resolves capabilities when it maps the API profile.
 * Fall back to deriving them from the role so a cached user written by an
 * older build still yields a usable permission set.
 */
const resolveCapabilities = (user) => user?.capabilities ?? capabilitiesForRole(user?.role);

export const useAuthStore = create((set) => ({
  user: authStorage.getUser(),
  capabilities: resolveCapabilities(authStorage.getUser()),
  /** `true` until the initial session check resolves — drives the route guard. */
  isInitialising: true,

  setUser: (user) => {
    authStorage.setUser(user);
    set({ user, capabilities: resolveCapabilities(user), isInitialising: false });
  },

  setInitialised: () => set({ isInitialising: false }),

  clearSession: () => {
    authStorage.clear();
    set({ user: null, capabilities: [], isInitialising: false });
  },
}));

/* Stable selectors — components subscribe to one slice instead of the whole store. */
export const selectUser = (state) => state.user;
export const selectCapabilities = (state) => state.capabilities;
export const selectIsAuthenticated = (state) => Boolean(state.user);
