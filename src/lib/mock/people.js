/**
 * Staff, role definitions and the audit trail.
 *
 * The capability strings below are the single source of truth for access:
 * routes declare the capability they need, the sidebar filters itself on the
 * same list, and the route guard enforces it. Adding a permission means adding
 * it here and nowhere else.
 */

/* -------------------------------------------------------------------------- */
/* Capabilities                                                                */
/* -------------------------------------------------------------------------- */

export const CAPABILITIES = {
  dashboardView: 'dashboard.view',
  analyticsView: 'analytics.view',

  propertiesView: 'properties.view',
  propertiesManage: 'properties.manage',
  unitsView: 'units.view',
  unitsManage: 'units.manage',
  amenitiesManage: 'amenities.manage',
  pricingManage: 'pricing.manage',
  reviewsModerate: 'reviews.moderate',

  bookingsView: 'bookings.view',
  bookingsManage: 'bookings.manage',
  guestsView: 'guests.view',
  checkinManage: 'checkin.manage',
  checkoutReview: 'checkout.review',
  contractsManage: 'contracts.manage',
  housekeepingView: 'housekeeping.view',
  housekeepingManage: 'housekeeping.manage',
  calendarView: 'calendar.view',
  cancellationsManage: 'cancellations.manage',

  financeView: 'finance.view',
  taxManage: 'tax.manage',

  staffManage: 'staff.manage',
  rolesView: 'roles.view',
  auditView: 'audit.view',

  settingsManage: 'settings.manage',
  helpView: 'help.view',
};

const C = CAPABILITIES;

/**
 * Role definitions. `level` mirrors the Level 1 / 2 / 3 language used across
 * the business, `equivalent` is the platform-industry analogue.
 */
export const ROLES = [
  {
    id: 'L1',
    level: 'Level 1',
    name: 'Super Admin',
    equivalent: 'MD / Executive',
    description: 'Unrestricted access across every region, including financials and staff administration.',
    color: '#12603F',
    capabilities: Object.values(C),
  },
  {
    id: 'L2',
    level: 'Level 2',
    name: 'Facility Manager',
    equivalent: 'Host Admin',
    description:
      'Runs day-to-day operations for assigned regions. No access to financial data, tax rules, staff administration or the audit log.',
    color: '#2a78d6',
    capabilities: [
      C.dashboardView,
      C.propertiesView,
      C.unitsView,
      C.unitsManage,
      C.amenitiesManage,
      C.reviewsModerate,
      C.bookingsView,
      C.bookingsManage,
      C.guestsView,
      C.checkinManage,
      C.checkoutReview,
      C.contractsManage,
      C.housekeepingView,
      C.housekeepingManage,
      C.calendarView,
      C.cancellationsManage,
      C.rolesView,
      C.settingsManage,
      C.helpView,
    ],
  },
  {
    id: 'L3',
    level: 'Level 3',
    name: 'Cleaner / Maintenance',
    equivalent: 'Cleaning Crew',
    description:
      'Room status only. Sees no guest personal data, no bookings, no financials — the minimum needed to service a unit.',
    color: '#eb6834',
    capabilities: [C.housekeepingView, C.housekeepingManage, C.unitsView, C.helpView],
    // Housekeeping is where the work actually happens, so send cleaners there
    // rather than to whichever permitted screen happens to sit highest in the nav.
    home: '/housekeeping',
  },
];

/**
 * The API speaks a different role vocabulary to this portal, and is not even
 * self-consistent: `/auth/admin/login/` answers `"admin"` for a Super Admin
 * while `/auth/profile/` answers `"super_admin"` for the same person. Both are
 * mapped here so neither call site has to care which one it received.
 */
const API_ROLE_TO_LEVEL = {
  super_admin: 'L1',
  admin: 'L1',
  facility_manager: 'L2',
  housekeeper: 'L3',
};

/**
 * Translate whatever the API called this role into our level id.
 * Returns `null` for anything unrecognised — notably `guest`, which has no
 * business in the admin portal at all.
 *
 * @param {string} apiRole
 * @returns {'L1'|'L2'|'L3'|null}
 */
export const levelForApiRole = (apiRole) => API_ROLE_TO_LEVEL[apiRole] ?? null;

/** @param {string} roleId @returns {string[]} */
export const capabilitiesForRole = (roleId) =>
  ROLES.find((role) => role.id === roleId)?.capabilities ?? [];

/**
 * The permission matrix rendered on the Roles & Permissions screen.
 * `null` for a level means "explicitly denied for everyone", which is how the
 * card-number rule is expressed.
 */
export const PERMISSION_MATRIX = [
  { permission: 'Full system access', L1: true, L2: false, L3: false },
  { permission: 'Create / edit / delete listings', L1: true, L2: false, L3: false },
  { permission: 'Manage bookings', L1: true, L2: true, L3: false },
  { permission: 'View guest personal data', L1: true, L2: true, L3: false },
  { permission: 'Communicate with guests', L1: true, L2: true, L3: false },
  { permission: 'Access financial / revenue data', L1: true, L2: false, L3: false },
  { permission: 'Tax rule builder', L1: true, L2: false, L3: false },
  { permission: 'Manage staff accounts', L1: true, L2: false, L3: false },
  { permission: 'View audit log', L1: true, L2: false, L3: false },
  { permission: 'View room status (no PII)', L1: true, L2: true, L3: true },
  { permission: 'Mark rooms cleaned / block', L1: true, L2: true, L3: true },
  { permission: 'View full card numbers', L1: false, L2: false, L3: false, hardDenied: true },
];

/* -------------------------------------------------------------------------- */
/* Staff directory                                                             */
/* -------------------------------------------------------------------------- */

export const staff = [
  {
    id: 'stf_001',
    firstName: 'Michael',
    lastName: 'Davies',
    otherName: '',
    name: 'Michael Davies',
    initials: 'MD',
    color: '#12603F',
    role: 'L1',
    email: 'm.davies@alotelspaces.com',
    password: 'Admin123',
    assignedProperties: [],
    status: 'Active',
    lastActive: '2026-08-04T09:12:00.000Z',
    joinedAt: '2023-01-16T09:00:00.000Z',
  },
  {
    id: 'stf_002',
    firstName: 'Nnamdi',
    lastName: 'Achebe',
    otherName: '',
    name: 'Nnamdi Achebe',
    initials: 'NA',
    color: '#2a78d6',
    role: 'L2',
    email: 'n.achebe@alotelspaces.com',
    password: 'Admin123',
    assignedProperties: [],
    status: 'Active',
    lastActive: '2026-08-04T08:40:00.000Z',
    joinedAt: '2024-03-02T09:00:00.000Z',
  },
  {
    id: 'stf_003',
    firstName: 'Amira',
    lastName: 'Mohammed',
    otherName: '',
    name: 'Amira Mohammed',
    initials: 'AM',
    color: '#6D28D9',
    role: 'L2',
    email: 'a.mohammed@alotelspaces.com',
    password: 'Admin123',
    assignedProperties: [],
    status: 'Active',
    lastActive: '2026-08-03T17:05:00.000Z',
    joinedAt: '2024-07-19T09:00:00.000Z',
  },
  {
    id: 'stf_004',
    firstName: 'Kwame',
    lastName: 'Asante',
    otherName: '',
    name: 'Kwame Asante',
    initials: 'KA',
    color: '#eb6834',
    role: 'L3',
    email: 'k.asante@alotelspaces.com',
    password: 'Admin123',
    assignedProperties: [],
    status: 'Active',
    lastActive: '2026-08-04T07:20:00.000Z',
    joinedAt: '2025-02-11T09:00:00.000Z',
  },
  {
    id: 'stf_005',
    firstName: 'Rosa',
    lastName: 'Sanchez',
    otherName: '',
    name: 'Rosa Sanchez',
    initials: 'RS',
    color: '#BE185D',
    role: 'L2',
    email: 'r.sanchez@alotelspaces.com',
    password: 'Admin123',
    assignedProperties: [],
    status: 'Inactive',
    lastActive: '2026-06-28T14:30:00.000Z',
    joinedAt: '2024-05-06T09:00:00.000Z',
  },
  {
    id: 'stf_006',
    firstName: 'Thelma',
    lastName: 'Kingston',
    otherName: '',
    name: 'Thelma Kingston',
    initials: 'TK',
    color: '#0F766E',
    role: 'L3',
    email: 't.kingston@alotelspaces.com',
    password: 'Admin123',
    assignedProperties: [],
    status: 'Active',
    lastActive: '2026-08-04T06:55:00.000Z',
    joinedAt: '2025-09-01T09:00:00.000Z',
  },
];

/* -------------------------------------------------------------------------- */
/* Audit log                                                                   */
/* -------------------------------------------------------------------------- */

export const auditLog = [
  { id: 'log_01', at: '2026-08-04T09:12:00.000Z', actor: 'Michael Davies', role: 'L1', action: 'Published property', target: '3-Bedroom Penthouse · Lekki', ip: '102.89.45.12' },
  { id: 'log_02', at: '2026-08-04T08:55:00.000Z', actor: 'Michael Davies', role: 'L1', action: 'Tax rule created', target: 'Barcelona City Tax €6/night', ip: '102.89.45.12' },
  { id: 'log_03', at: '2026-08-04T08:40:00.000Z', actor: 'Nnamdi Achebe', role: 'L2', action: 'Booking approved', target: '#AS-8821 · J. Amara', ip: '197.210.12.88' },
  { id: 'log_04', at: '2026-08-04T07:20:00.000Z', actor: 'Kwame Asante', role: 'L3', action: 'Room cleaned', target: 'Unit 2B · Garden Studio', ip: '197.210.55.91' },
  { id: 'log_05', at: '2026-08-03T18:05:00.000Z', actor: 'Nnamdi Achebe', role: 'L2', action: 'Contract re-sent', target: '#AS-8823 · S. Khan', ip: '197.210.12.88' },
  { id: 'log_06', at: '2026-08-03T17:05:00.000Z', actor: 'Amira Mohammed', role: 'L2', action: 'Verification approved', target: 'Aisha Mohammed · NIN', ip: '94.204.11.7' },
  { id: 'log_07', at: '2026-08-03T14:10:00.000Z', actor: 'Michael Davies', role: 'L1', action: 'Discount updated', target: 'Monthly → 12%', ip: '102.89.45.12' },
  { id: 'log_08', at: '2026-08-03T11:32:00.000Z', actor: 'Michael Davies', role: 'L1', action: 'Payout released', target: '₦4,820,000 · Lagos portfolio', ip: '102.89.45.12' },
  { id: 'log_09', at: '2026-08-02T16:44:00.000Z', actor: 'Michael Davies', role: 'L1', action: 'Staff created', target: 'Thelma Kingston · Level 3', ip: '102.89.45.12' },
  { id: 'log_10', at: '2026-08-02T09:45:00.000Z', actor: 'Michael Davies', role: 'L1', action: 'Staff deactivated', target: 'Rosa Sanchez', ip: '102.89.45.12' },
  { id: 'log_11', at: '2026-08-01T15:12:00.000Z', actor: 'Nnamdi Achebe', role: 'L2', action: 'Deposit released', target: '#AS-8817 · ₦45,000', ip: '197.210.12.88' },
  { id: 'log_12', at: '2026-08-01T10:03:00.000Z', actor: 'Amira Mohammed', role: 'L2', action: 'Unit blocked', target: 'Unit 4A · leaking tap', ip: '94.204.11.7' },
];
