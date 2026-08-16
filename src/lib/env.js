/**
 * Single, typed-ish access point for every `import.meta.env` value.
 * Nothing else in the app should read `import.meta.env` directly.
 */
const toBool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

const useMock = toBool(import.meta.env.VITE_USE_MOCK, true);

export const env = {
  apiUrl: import.meta.env.VITE_API_URL || '/api/v1',

  /**
   * Mock mode for the catalogue/booking features, which are not wired to the
   * backend yet. Defaults on so a fresh clone runs with zero setup.
   */
  useMock,

  /**
   * Auth has its own switch so it can talk to the real API while the rest of
   * the app stays on mocks. Falls back to the global flag when unset.
   */
  useMockAuth: toBool(import.meta.env.VITE_USE_MOCK_AUTH, useMock),

  /**
   * Properties are wired to the real API independently of the rest of the
   * catalogue (units, amenities, reviews), which is still mocked.
   */
  useMockProperties: toBool(import.meta.env.VITE_USE_MOCK_PROPERTIES, useMock),

  /**
   * Reservations and payments. Separate from the surrounding operations
   * features (check-in/out, housekeeping, contracts), which are still mocked.
   */
  useMockBookings: toBool(import.meta.env.VITE_USE_MOCK_BOOKINGS, useMock),
  useMockPayments: toBool(import.meta.env.VITE_USE_MOCK_PAYMENTS, useMock),

  /** Country tax rules — the builder writes straight to the API. */
  useMockTaxes: toBool(import.meta.env.VITE_USE_MOCK_TAXES, useMock),

  /** Discounts, country fee configs and global deposit/seasonal rules — writes straight to the API. */
  useMockPricing: toBool(import.meta.env.VITE_USE_MOCK_PRICING, useMock),

  /** Role-based `/admin/dashboard/` cards. Sidebar badges/alert tray have no backend equivalent yet and stay on the global flag. */
  useMockDashboard: toBool(import.meta.env.VITE_USE_MOCK_DASHBOARD, useMock),

  /** The `/analytics/*` endpoints and CSV/PDF export. */
  useMockAnalytics: toBool(import.meta.env.VITE_USE_MOCK_ANALYTICS, useMock),

  /** Spaces now has a real backend (`/api/v1/spaces/...`) — defaults to it regardless of the global flag, matching `useMockMaintenance`. Flip on only for offline dev. */
  useMockSpaces: toBool(import.meta.env.VITE_USE_MOCK_SPACES, false),

  /** Maintenance oversight (`/operations/maintenance/*`) is a real, working endpoint — defaults to the live API regardless of the global flag. Flip on only for offline dev. */
  useMockMaintenance: toBool(import.meta.env.VITE_USE_MOCK_MAINTENANCE, false),

  /** Identity verification queue (`/kyc/full/...`) — real, working endpoint. Defaults to it regardless of the global flag. */
  useMockVerifications: toBool(import.meta.env.VITE_USE_MOCK_VERIFICATIONS, false),

  /** System announcements (`/admin/announcements/`) — real. Defaults to it regardless of the global flag. */
  useMockAnnouncements: toBool(import.meta.env.VITE_USE_MOCK_ANNOUNCEMENTS, false),

  /** Admin settings (`/admin/system/config/`) and per-user notification preferences (`/notifications/preferences/<id>/`) — both real. */
  useMockSettings: toBool(import.meta.env.VITE_USE_MOCK_SETTINGS, false),

  /** The signed-in admin's own notification inbox (`/notifications/<user_id>/`) — real. */
  useMockNotifications: toBool(import.meta.env.VITE_USE_MOCK_NOTIFICATIONS, false),

  mockLatency: Number(import.meta.env.VITE_MOCK_LATENCY ?? 500),
  appName: import.meta.env.VITE_APP_NAME || 'Alotel Spaces Admin',
  isDev: import.meta.env.DEV,
};
