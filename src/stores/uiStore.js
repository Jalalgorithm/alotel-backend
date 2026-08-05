import { create } from 'zustand';

/**
 * Ephemeral UI state: sidebar collapse, the mobile drawer, the command palette,
 * and the toast queue used to confirm mutations.
 */
let toastId = 0;

const readCollapsed = () => {
  try {
    return window.localStorage.getItem('alotel.admin.sidebar') === 'collapsed';
  } catch {
    return false;
  }
};

export const useUIStore = create((set, get) => ({
  /** Desktop: rail vs full sidebar. Persisted so it survives a reload. */
  isSidebarCollapsed: readCollapsed(),
  /** Mobile: the sidebar becomes an overlay drawer. */
  isDrawerOpen: false,
  isCommandOpen: false,
  toasts: [],

  toggleSidebar: () =>
    set((state) => {
      const next = !state.isSidebarCollapsed;
      try {
        window.localStorage.setItem('alotel.admin.sidebar', next ? 'collapsed' : 'expanded');
      } catch {
        /* storage unavailable — the preference just won't persist */
      }
      return { isSidebarCollapsed: next };
    }),

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),

  openCommand: () => set({ isCommandOpen: true }),
  closeCommand: () => set({ isCommandOpen: false }),

  /**
   * @param {{ title: string, description?: string, variant?: 'success'|'error'|'info', duration?: number }} toast
   */
  pushToast: ({ title, description, variant = 'success', duration = 3500 }) => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts, { id, title, description, variant }] }));
    if (duration > 0) setTimeout(() => get().dismissToast(id), duration);
    return id;
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

/** Imperative helper for use outside React (interceptors, services). */
export const toast = {
  success: (title, description) => useUIStore.getState().pushToast({ title, description, variant: 'success' }),
  error: (title, description) => useUIStore.getState().pushToast({ title, description, variant: 'error' }),
  info: (title, description) => useUIStore.getState().pushToast({ title, description, variant: 'info' }),
};
