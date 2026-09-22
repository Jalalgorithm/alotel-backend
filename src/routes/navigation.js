import { paths } from './paths';
import { CAPABILITIES as C, ROLES } from '@/lib/mock/people';

/**
 * The sidebar spine.
 *
 * Group order follows `paths.js`'s own documented grouping: core inventory,
 * then core transactions, then money, then the secondary Spaces product line,
 * then internal ops support, then admin/system last.
 *
 * Each item declares the capability it needs. The sidebar filters itself with
 * this list and `ProtectedRoute` enforces the same value, so navigation and
 * access can never drift apart. `badge` names a counter supplied by the layout
 * (see `useNavBadges`) rather than a hard-coded number — and is only declared
 * on items backed by a real "needs attention" count, never a catalog total.
 */
export const NAV_GROUPS = [
  {
    id: 'overview',
    label: null,
    items: [
      { id: 'dashboard', label: 'Dashboard', to: paths.dashboard, icon: 'LayoutDashboard', capability: C.dashboardView, end: true },
      { id: 'analytics', label: 'KPI Analytics', to: paths.analytics, icon: 'TrendingUp', capability: C.analyticsView },
    ],
  },
  {
    id: 'property',
    label: 'Property Management',
    items: [
      { id: 'properties', label: 'Properties', to: paths.properties, icon: 'Building2', capability: C.propertiesView },
      { id: 'pricing', label: 'Pricing & Availability', to: paths.pricing, icon: 'Tags', capability: C.pricingManage },
      { id: 'property-review', label: 'Property Review', to: paths.propertyReview, icon: 'Star', capability: C.reviewsModerate },
    ],
  },
  {
    id: 'booking',
    label: 'Booking Management',
    items: [
      { id: 'bookings', label: 'Bookings', to: paths.bookings, icon: 'CalendarCheck', capability: C.bookingsView, badge: 'bookings' },
      { id: 'guests', label: 'Guests', to: paths.guests, icon: 'Users', capability: C.guestsView },
      { id: 'check-in-out', label: 'Check-ins / Check-outs', to: paths.checkInOut, icon: 'LogIn', capability: C.checkinManage, badge: 'checkins' },
      { id: 'checkout-reports', label: 'Check-out Reports', to: paths.checkoutReports, icon: 'ClipboardCheck', capability: C.checkoutReview, badge: 'checkoutReports' },
      { id: 'contracts', label: 'Contracts & E-Sign', to: paths.contracts, icon: 'FileSignature', capability: C.contractsManage, badge: 'contracts' },
      { id: 'contract-templates', label: 'Contract Templates', to: paths.contractTemplates, icon: 'FileText', capability: C.contractsManage },
      { id: 'housekeeping', label: 'Housekeeping', to: paths.housekeeping, icon: 'BrushCleaning', capability: C.housekeepingView, badge: 'housekeeping' },
      { id: 'calendar', label: 'Calendar', to: paths.calendar, icon: 'CalendarDays', capability: C.calendarView },
      { id: 'cancellations', label: 'Cancellations', to: paths.cancellations, icon: 'CalendarX', capability: C.cancellationsManage },
    ],
  },
  {
    id: 'financials',
    label: 'Financials',
    items: [
      { id: 'payments', label: 'Payments', to: paths.payments, icon: 'CreditCard', capability: C.financeView },
      { id: 'payouts', label: 'Payouts', to: paths.payouts, icon: 'Banknote', capability: C.financeView, badge: 'payments' },
      { id: 'revenue', label: 'Revenue & Invoice', to: paths.revenue, icon: 'ReceiptText', capability: C.financeView },
      { id: 'tax', label: 'Tax Builder', to: paths.tax, icon: 'Landmark', capability: C.taxManage },
    ],
  },
  {
    id: 'spaces',
    label: 'Spaces',
    items: [
      { id: 'spaces', label: 'Spaces', to: paths.spaces, icon: 'Warehouse', capability: C.spacesView },
      { id: 'space-bookings', label: 'Space Bookings', to: paths.spaceBookings, icon: 'CalendarClock', capability: C.spacesBookingsView },
      { id: 'space-calendar', label: 'Booking Calendar', to: paths.spaceCalendar, icon: 'CalendarRange', capability: C.spacesBookingsView },
      { id: 'space-approvals', label: 'Booking Approvals', to: paths.spaceApprovals, icon: 'ListChecks', capability: C.spacesBookingsManage, badge: 'spaceApprovals' },
    ],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    items: [
      { id: 'maintenance-dashboard', label: 'Dashboard', to: paths.maintenanceDashboard, icon: 'Gauge', capability: C.maintenanceView, end: true },
      { id: 'maintenance-workers', label: 'Worker Directory', to: paths.maintenanceWorkers, icon: 'HardHat', capability: C.maintenanceView },
      { id: 'maintenance-tickets', label: 'Tickets', to: paths.maintenanceTickets, icon: 'Wrench', capability: C.maintenanceView, badge: 'maintenanceTickets' },
    ],
  },
  {
    id: 'people',
    label: 'Users & Roles',
    items: [
      { id: 'staff', label: 'Staff Management', to: paths.staff, icon: 'UserCog', capability: C.staffManage },
      { id: 'roles', label: 'Roles & Permissions', to: paths.roles, icon: 'ShieldCheck', capability: C.rolesView },
      { id: 'audit-log', label: 'Audit Log', to: paths.auditLog, icon: 'ScrollText', capability: C.auditView },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'notifications', label: 'Notifications', to: paths.notifications, icon: 'Bell', capability: C.notificationsView, badge: 'notifications' },
      { id: 'settings', label: 'Settings', to: paths.settings, icon: 'Settings', capability: C.settingsManage },
      { id: 'help', label: 'Help', to: paths.help, icon: 'CircleHelp', capability: C.helpView },
    ],
  },
];

/** Flat list — used by the command palette and the "where do I land" logic. */
export const NAV_ITEMS = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
);

/**
 * Where a given role should land after signing in.
 *
 * A role may nominate its own `home` — a cleaner belongs on Housekeeping, not
 * on whichever permitted screen happens to sit highest in the nav. Otherwise
 * this falls back to the first item their capabilities allow, so nobody is ever
 * dropped on a screen the guard will immediately bounce them out of.
 *
 * @param {string[]} capabilities
 * @param {string} [roleId]
 * @returns {string}
 */
export const landingPathFor = (capabilities = [], roleId) => {
  const role = ROLES.find((entry) => entry.id === roleId);

  if (role?.home) {
    const homeItem = NAV_ITEMS.find((item) => item.to === role.home);
    // Only honour it if the role can actually open it.
    if (homeItem && capabilities.includes(homeItem.capability)) return role.home;
  }

  const first = NAV_ITEMS.find((item) => capabilities.includes(item.capability));
  return first?.to ?? paths.help;
};
