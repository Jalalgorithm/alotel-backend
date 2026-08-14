/**
 * The Spaces vocabulary, per the "Alotel Spaces" product spec.
 *
 * Spaces has NO real backend yet — everything here is mocked (see
 * `spaceService.js`). Field names below deliberately mirror the spec's
 * proposed wire contract (`slot_unit`, `booking_mode`, `size_sqm`, …) even
 * though the mock layer is the only thing speaking it today, so that wiring
 * up a real `POST /admin/api/spaces` later is a service-file change only —
 * the UI already speaks this shape.
 */

export const SPACE_TYPES = ['Meeting Room', 'Boardroom', 'Event Hall', 'Conference Center', 'Studio', 'Other'];

export const SPACE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export const STATUS_BADGE_VARIANT = {
  draft: 'neutral',
  published: 'ok',
  archived: 'danger',
};

export const SLOT_UNITS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'half_day', label: 'Half-day' },
  { value: 'full_day', label: 'Full-day' },
  { value: 'custom', label: 'Custom' },
];

export const SLOT_UNIT_LABEL = {
  hourly: 'hour',
  half_day: 'half-day',
  full_day: 'full-day',
  custom: 'slot',
};

export const BOOKING_MODES = [
  { value: 'instant', label: 'Instant book' },
  { value: 'request', label: 'Request to book' },
];

export const ADDON_PRICING_BASIS = [
  { value: 'flat', label: 'Flat' },
  { value: 'per_person', label: 'Per person' },
  { value: 'per_hour', label: 'Per hour' },
];

export const ADDON_CATEGORY_SUGGESTIONS = ['Equipment', 'Catering', 'Decor', 'AV & Tech', 'Staffing', 'Cleaning'];

export const WEEKDAYS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

export const SPACE_BOOKING_STATUSES = [
  { value: 'pending_host_approval', label: 'Pending approval' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

export const BOOKING_STATUS_BADGE_VARIANT = {
  pending_host_approval: 'warn',
  confirmed: 'ok',
  declined: 'danger',
  expired: 'neutral',
  cancelled: 'danger',
  completed: 'info',
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** `slot_unit`-appropriate price suffix, e.g. "₦700,000 / half-day". */
export const slotUnitSuffix = (space) =>
  space?.slotUnit === 'custom' ? `/ ${space.customSlotMinutes || 0}-min slot` : `/ ${SLOT_UNIT_LABEL[space?.slotUnit] ?? 'unit'}`;

export const locationLabel = (space) => [space?.city, space?.state, space?.country].filter(Boolean).join(', ');

/* -------------------------------------------------------------------------- */
/* Space (listing)                                                             */
/* -------------------------------------------------------------------------- */

export const toSpace = (raw) => {
  if (!raw) return null;
  return {
    id: raw.id,
    host: raw.host,
    title: raw.title ?? '',
    type: raw.type ?? SPACE_TYPES[0],
    description: raw.description ?? '',
    status: raw.status ?? 'draft',
    country: raw.location?.country ?? '',
    state: raw.location?.state ?? '',
    city: raw.location?.city ?? '',
    address: raw.location?.address ?? '',
    images: raw.images ?? [],
    sizeSqm: raw.size_sqm ?? null,
    baseRate: toNumber(raw.base_rate),
    currency: raw.currency ?? 'NGN',
    slotUnit: raw.slot_unit ?? 'hourly',
    customSlotMinutes: raw.slot_unit_minutes ?? null,
    minSlots: raw.min_slots ?? 1,
    maxSlots: raw.max_slots ?? null,
    bookingMode: raw.booking_mode ?? 'instant',
    approvalExpiryHours: raw.approval_expiry_hours ?? 24,
    maxCapacity: raw.max_capacity ?? 0,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
};

export const toSpacePayload = (values) => ({
  title: values.title?.trim() ?? '',
  type: values.type,
  description: values.description?.trim() ?? '',
  status: values.status || 'draft',
  location: {
    country: values.country?.trim() ?? '',
    state: values.state?.trim() ?? '',
    city: values.city?.trim() ?? '',
    address: values.address?.trim() ?? '',
  },
  images: values.images ?? [],
  size_sqm: values.sizeSqm ? Number(values.sizeSqm) : null,
  base_rate: String(Number(values.baseRate) || 0),
  currency: values.currency || 'NGN',
  slot_unit: values.slotUnit,
  slot_unit_minutes: values.slotUnit === 'custom' ? Number(values.customSlotMinutes) || null : null,
  min_slots: Number(values.minSlots) || 1,
  max_slots: values.maxSlots ? Number(values.maxSlots) : null,
  booking_mode: values.bookingMode,
  approval_expiry_hours: Number(values.approvalExpiryHours) || 24,
});

/* -------------------------------------------------------------------------- */
/* Layouts                                                                     */
/* -------------------------------------------------------------------------- */

export const toLayout = (raw) => ({
  id: raw.id,
  spaceId: raw.space,
  name: raw.layout_name ?? '',
  maxCapacity: raw.max_capacity ?? 0,
});

export const toLayoutPayload = (values) => ({
  layout_name: values.name?.trim() ?? '',
  max_capacity: Number(values.maxCapacity) || 0,
});

/* -------------------------------------------------------------------------- */
/* Add-ons                                                                     */
/* -------------------------------------------------------------------------- */

export const toAddon = (raw) => ({
  id: raw.id,
  spaceId: raw.space,
  category: raw.category ?? '',
  name: raw.name ?? '',
  price: toNumber(raw.price),
  unitType: raw.unit_type ?? 'flat',
  minQty: raw.min_qty ?? 0,
  maxQty: raw.max_qty ?? null,
});

export const toAddonPayload = (values) => ({
  category: values.category?.trim() ?? '',
  name: values.name?.trim() ?? '',
  price: String(Number(values.price) || 0),
  unit_type: values.unitType,
  min_qty: Number(values.minQty) || 0,
  max_qty: values.maxQty ? Number(values.maxQty) : null,
});

/* -------------------------------------------------------------------------- */
/* Operating hours & blackout dates                                            */
/* -------------------------------------------------------------------------- */

export const toOperatingHours = (raw) => ({
  id: raw.id,
  spaceId: raw.space,
  dayOfWeek: raw.day_of_week,
  isOpen: raw.is_open ?? true,
  openTime: raw.open_time ?? '09:00',
  closeTime: raw.close_time ?? '18:00',
});

export const toOperatingHoursPayload = (row) => ({
  day_of_week: row.dayOfWeek,
  is_open: row.isOpen,
  open_time: row.openTime,
  close_time: row.closeTime,
});

export const toBlackoutDate = (raw) => ({
  id: raw.id,
  spaceId: raw.space,
  date: raw.date,
  reason: raw.reason ?? '',
});

export const toBlackoutDatePayload = (values) => ({
  date: values.date,
  reason: values.reason?.trim() ?? '',
});

/* -------------------------------------------------------------------------- */
/* Bookings                                                                     */
/* -------------------------------------------------------------------------- */

export const toSpaceBooking = (raw) => ({
  id: raw.id,
  spaceId: raw.space,
  spaceName: raw.space_name ?? '',
  layoutId: raw.layout_id,
  layoutName: raw.layout_name ?? '',
  guestName: raw.guest_name ?? '',
  guestEmail: raw.guest_email ?? '',
  guestPhone: raw.guest_phone ?? '',
  startDatetime: raw.start_datetime,
  endDatetime: raw.end_datetime,
  guestCount: raw.guest_count ?? 0,
  addons: (raw.addons ?? []).map((entry) => ({
    addonId: entry.addon_id,
    name: entry.name,
    qty: entry.qty,
    price: toNumber(entry.price_at_booking),
  })),
  basePrice: toNumber(raw.base_price),
  addonsPrice: toNumber(raw.addons_price),
  taxTotal: toNumber(raw.tax_total),
  totalPrice: toNumber(raw.total_price),
  currency: raw.currency ?? 'NGN',
  status: raw.status ?? 'pending_host_approval',
  bookingMode: raw.booking_mode ?? 'instant',
  requestedAt: raw.requested_at,
  decidedAt: raw.decided_at ?? null,
  decidedBy: raw.decided_by ?? null,
  declineReason: raw.decline_reason ?? '',
});
