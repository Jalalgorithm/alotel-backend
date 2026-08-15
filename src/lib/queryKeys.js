/**
 * Central query-key registry.
 *
 * Keeping keys in one place makes invalidation predictable: invalidating
 * `queryKeys.properties.all` also invalidates every list/detail beneath it,
 * because React Query matches keys by prefix.
 */
export const queryKeys = {
  auth: {
    all: ['auth'],
    currentUser: () => ['auth', 'current-user'],
  },
  dashboard: {
    all: ['dashboard'],
    overview: () => ['dashboard', 'overview'],
  },
  analytics: {
    all: ['analytics'],
    kpis: (filters = {}) => ['analytics', 'kpis', filters],
  },
  properties: {
    all: ['properties'],
    list: (filters = {}) => ['properties', 'list', filters],
    detail: (id) => ['properties', 'detail', id],
    images: (id) => ['properties', 'images', id],
    videos: (id) => ['properties', 'videos', id],
    availability: (id) => ['properties', 'availability', id],
    units: (filters = {}) => ['properties', 'units', filters],
    amenities: () => ['properties', 'amenities'],
    reviews: (filters = {}) => ['properties', 'reviews', filters],
    discounts: () => ['properties', 'discounts'],
    pricingConfigs: () => ['properties', 'pricing-configs'],
    pricingRules: () => ['properties', 'pricing-rules'],
  },
  bookings: {
    all: ['bookings'],
    list: (filters = {}) => ['bookings', 'list', filters],
    detail: (id) => ['bookings', 'detail', id],
    timeline: (id) => ['bookings', 'timeline', id],
    receipt: (id) => ['bookings', 'receipt', id],
    guests: (filters = {}) => ['bookings', 'guests', filters],
    guestDetail: (id) => ['bookings', 'guests', 'detail', id],
    guestBookings: (id, filters = {}) => ['bookings', 'guests', 'bookings', id, filters],
    calendar: (month) => ['bookings', 'calendar', month],
    cancellations: () => ['bookings', 'cancellations'],
    contracts: (filters = {}) => ['bookings', 'contracts', filters],
    contractDetail: (id) => ['bookings', 'contract', id],
    contractStatus: (contractId) => ['bookings', 'contract-status', contractId],
    contractTemplates: () => ['bookings', 'contract-templates'],
    inspection: (bookingId) => ['bookings', 'inspection', bookingId],
    damageAssessments: (bookingId) => ['bookings', 'damage-assessments', bookingId],
    checkoutReport: (bookingId) => ['bookings', 'checkout-report', bookingId],
    housekeeping: () => ['bookings', 'housekeeping'],
    verifications: () => ['bookings', 'verifications'],
  },
  finance: {
    all: ['finance'],
    payments: (filters = {}) => ['finance', 'payments', filters],
    payouts: (filters = {}) => ['finance', 'payouts', filters],
    invoices: (filters = {}) => ['finance', 'invoices', filters],
    taxRules: (filters = {}) => ['finance', 'tax-rules', filters],
    coverageAlerts: () => ['finance', 'coverage-alerts'],
    deposit: (bookingId) => ['finance', 'deposit', bookingId],
    fxRates: (base) => ['finance', 'fx-rates', base],
  },
  people: {
    all: ['people'],
    staff: () => ['people', 'staff'],
    roles: () => ['people', 'roles'],
    auditLog: (filters = {}) => ['people', 'audit-log', filters],
  },
  spaces: {
    all: ['spaces'],
    list: (filters = {}) => ['spaces', 'list', filters],
    detail: (id) => ['spaces', 'detail', id],
    layouts: (id) => ['spaces', 'layouts', id],
    addons: (id) => ['spaces', 'addons', id],
    hours: (id) => ['spaces', 'hours', id],
    blackouts: (id) => ['spaces', 'blackouts', id],
    images: (id) => ['spaces', 'images', id],
    bookings: (filters = {}) => ['spaces', 'bookings', filters],
    bookingDetail: (id) => ['spaces', 'booking-detail', id],
    approvalQueue: (filters = {}) => ['spaces', 'approval-queue', filters],
  },
  /**
   * Namespaced `maintenance-ops` (matching the backend's `/operations/maintenance/`
   * mount) rather than a bare `maintenance` root — that name is already spoken
   * for by the unused `system.maintenance()` key and the unrelated housekeeper
   * self-report flow under `bookings.housekeeping()`.
   */
  maintenanceOps: {
    all: ['maintenance-ops'],
    workers: (filters = {}) => ['maintenance-ops', 'workers', filters],
    workerDetail: (id) => ['maintenance-ops', 'workers', 'detail', id],
    tickets: (filters = {}) => ['maintenance-ops', 'tickets', filters],
    ticketDetail: (id) => ['maintenance-ops', 'tickets', 'detail', id],
    dashboard: (filters = {}) => ['maintenance-ops', 'dashboard', filters],
  },
  system: {
    settings: () => ['system', 'settings'],
    maintenance: () => ['system', 'maintenance'],
    announcements: () => ['system', 'announcements'],
  },
  /** Country/state reference data — `utils/countries.py`, static-ish, shared across features. */
  geo: {
    countries: () => ['geo', 'countries'],
    states: (countryCode) => ['geo', 'states', countryCode],
  },
};
