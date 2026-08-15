/** Every URL in the portal, in one place — no route string is hard-coded twice. */
export const paths = {
  login: '/login',
  twoFactor: '/verify',
  forgotPassword: '/forgot-password',
  /**
   * The API emails `{ADMIN_FRONTEND_URL}/password-reset/{uid}/{token}/`, so
   * this route's shape is fixed by the backend — don't change it without
   * changing `PasswordResetRequestSerializer` too.
   */
  resetPassword: (uid = ':uid', token = ':token') => `/password-reset/${uid}/${token}`,

  dashboard: '/',
  analytics: '/analytics',
  notifications: '/notifications',

  // Property management
  properties: '/properties',
  propertyNew: '/properties/new',
  propertyDetail: (id = ':propertyId') => `/properties/${id}`,
  units: '/units',
  amenities: '/amenities',
  pricing: '/pricing',
  propertyReview: '/property-review',

  // Booking management
  bookings: '/bookings',
  guests: '/guests',
  checkInOut: '/check-in-out',
  checkoutReports: '/checkout-reports',
  contracts: '/contracts',
  contractTemplates: '/contracts/templates',
  housekeeping: '/housekeeping',
  calendar: '/calendar',
  cancellations: '/cancellations',

  // Financials
  payments: '/payments',
  payouts: '/payouts',
  revenue: '/revenue',
  tax: '/tax',

  // Spaces (bookable venues — distinct from Property, see the Spaces spec §A.1)
  spaces: '/spaces',
  spaceNew: '/spaces/new',
  spaceBookings: '/spaces/bookings',
  spaceCalendar: '/spaces/calendar',
  spaceApprovals: '/spaces/approvals',
  // Declared last of the `/spaces/*` paths — a dynamic segment must never shadow a literal one.
  spaceDetail: (id = ':spaceId') => `/spaces/${id}`,

  // Maintenance (worker/vendor directory + ticket oversight — distinct from the housekeeper self-report flow)
  maintenanceDashboard: '/maintenance',
  maintenanceWorkers: '/maintenance/workers',
  maintenanceWorkerDetail: (id = ':workerId') => `/maintenance/workers/${id}`,
  maintenanceTickets: '/maintenance/tickets',
  maintenanceTicketDetail: (id = ':ticketId') => `/maintenance/tickets/${id}`,

  // Users & roles
  staff: '/staff',
  roles: '/roles',
  auditLog: '/audit-log',

  // System
  settings: '/settings',
  help: '/help',
};
