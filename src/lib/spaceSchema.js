/**
 * The Spaces vocabulary — `spaces` app on the backend, mounted at
 * `/api/v1/spaces/...`. Field names/enums below are copied verbatim from
 * `spaces/models.py` and `spaces/serializers.py` (read in full before this
 * file was written), not the earlier product-spec draft this module
 * originally mocked against — a few things genuinely differ from that draft:
 * `slot_unit` values, no stored `currency`, `status` has no `archived`, and
 * layouts/add-ons/operating-hours have no update endpoint (create+delete
 * only). See `spaceService.js` for the real/mock service split.
 */

export const SPACE_TYPES = ['Meeting Room', 'Boardroom', 'Event Hall', 'Conference Center', 'Studio', 'Other'];

export const SPACE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

export const STATUS_BADGE_VARIANT = {
  draft: 'neutral',
  published: 'ok',
};

/** `half_day`/`full_day` durations are hardcoded server-side (6h/12h) — not a per-space setting. */
export const SLOT_UNITS = [
  { value: 'hour', label: 'Hour' },
  { value: 'half_day', label: 'Half-day (6h)' },
  { value: 'full_day', label: 'Full-day (12h)' },
  { value: 'custom_minutes', label: 'Custom' },
];

export const SLOT_UNIT_LABEL = {
  hour: 'hour',
  half_day: 'half-day',
  full_day: 'full-day',
  custom_minutes: 'slot',
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
  { value: 'pending_payment', label: 'Pending payment' },
  { value: 'pending_host_approval', label: 'Pending approval' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

export const BOOKING_STATUS_BADGE_VARIANT = {
  pending_payment: 'neutral',
  pending_host_approval: 'warn',
  confirmed: 'ok',
  declined: 'danger',
  expired: 'neutral',
  cancelled: 'danger',
  completed: 'info',
};

/** Same 5 markets as `propertySchema.js`'s `LOCATIONS` — `Space.LOCATION_CHOICES` is a literal reference to `Property.LOCATION_CHOICES` on the backend. */
const CURRENCY_BY_LOCATION = { UK: 'GBP', Spain: 'EUR', Nigeria: 'NGN', 'UAE Dubai': 'AED', US: 'USD' };

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * There is no stored currency on a Space — the backend derives it from
 * `location` only at booking/quote time. This is a display-only guess so the
 * admin UI can show a sensible symbol before any booking exists; it is never
 * sent to the API.
 */
export const currencyForSpace = (space) => CURRENCY_BY_LOCATION[space?.location] ?? CURRENCY_BY_LOCATION[space?.country] ?? 'GBP';

/** `slot_unit`-appropriate price suffix, e.g. "₦700,000 / half-day". */
export const slotUnitSuffix = (space) =>
  space?.slotUnit === 'custom_minutes' ? `/ ${space.customSlotMinutes || 0}-min slot` : `/ ${SLOT_UNIT_LABEL[space?.slotUnit] ?? 'unit'}`;

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
    type: raw.space_type || SPACE_TYPES[0],
    description: raw.description ?? '',
    status: raw.status ?? 'draft',
    publishedAt: raw.published_at ?? null,
    country: raw.country ?? '',
    state: raw.state ?? '',
    city: raw.city ?? '',
    address: raw.address ?? '',
    coordinates: raw.coordinates ?? {},
    location: raw.location ?? '',
    images: (raw.images ?? []).map(toSpaceImage),
    sizeSqm: raw.size_sqm ?? null,
    baseRate: toNumber(raw.base_rate),
    slotUnit: raw.slot_unit ?? 'hour',
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

/** `SpaceCreateUpdateSerializer` — flat fields, no nested `location` object (that key is the separate market enum, see `location` below). */
export const toSpacePayload = (values) => {
  const payload = {
    title: values.title?.trim() ?? '',
    description: values.description?.trim() ?? '',
    space_type: values.type || '',
    status: values.status || 'draft',
    country: values.country?.trim() ?? '',
    state: values.state?.trim() ?? '',
    city: values.city?.trim() ?? '',
    address: values.address?.trim() ?? '',
    coordinates: values.coordinates ?? {},
    size_sqm: values.sizeSqm ? Number(values.sizeSqm) : null,
    base_rate: String(Number(values.baseRate) || 0),
    slot_unit: values.slotUnit,
    slot_unit_minutes: values.slotUnit === 'custom_minutes' ? Number(values.customSlotMinutes) || null : null,
    min_slots: Number(values.minSlots) || 1,
    max_slots: values.maxSlots ? Number(values.maxSlots) : null,
    booking_mode: values.bookingMode,
    approval_expiry_hours: Number(values.approvalExpiryHours) || 24,
  };
  // Only send `location` when the typed country happens to match one of the 5 known markets —
  // otherwise the server leaves it null and currency display falls back to GBP, same as Property.
  if (CURRENCY_BY_LOCATION[payload.country]) payload.location = payload.country;
  return payload;
};

/* -------------------------------------------------------------------------- */
/* Layouts — create + delete only, no update endpoint                          */
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
/* Add-ons — create + delete only, no update endpoint                          */
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

/**
 * One row per weekday that's open — there is no `is_open` flag and no bulk
 * "set the whole week" endpoint. A weekday with no row is implicitly closed;
 * opening/changing a day means POSTing a new row (and DELETEing the old one
 * if the hours changed), not PATCHing one.
 */
export const toOperatingHours = (raw) => ({
  id: raw.id,
  spaceId: raw.space,
  dayOfWeek: raw.day_of_week,
  openTime: raw.open_time,
  closeTime: raw.close_time,
});

export const toOperatingHoursPayload = (row) => ({
  day_of_week: row.dayOfWeek,
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
/* Images                                                                       */
/* -------------------------------------------------------------------------- */

export const toSpaceImage = (raw) => ({
  id: raw.id,
  spaceId: raw.space,
  url: raw.image,
  order: raw.order ?? 0,
  caption: raw.caption ?? '',
  createdAt: raw.created_at,
});

/* -------------------------------------------------------------------------- */
/* Bookings                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * `SpaceBookingSerializer` — output-only (bookings are never created/edited
 * through this shape, only via the dedicated create/approve/decline/cancel
 * views). No `guest_phone`, no `booking_mode` on the booking itself (that
 * lives on the parent Space), no `requested_at`/`decided_at`/`decided_by` —
 * `created_at`/`approval_due_at` are what the real API actually carries.
 */
export const toSpaceBooking = (raw) => ({
  id: raw.id,
  spaceId: raw.space,
  spaceName: raw.space_title ?? '',
  layoutId: raw.layout,
  layoutName: raw.layout_name ?? '',
  guestName: raw.guest_name ?? '',
  guestEmail: raw.guest_email ?? '',
  startDatetime: raw.start_datetime,
  endDatetime: raw.end_datetime,
  guestCount: raw.guest_count ?? 0,
  addons: (raw.addon_lines ?? []).map((entry) => ({
    id: entry.id,
    addonId: entry.addon,
    name: entry.addon_name,
    qty: entry.qty,
    price: toNumber(entry.price_at_booking),
  })),
  basePrice: toNumber(raw.base_price),
  addonsPrice: toNumber(raw.addons_price),
  taxTotal: toNumber(raw.tax_total),
  totalPrice: toNumber(raw.total_price),
  currency: raw.currency ?? '',
  status: raw.status ?? 'pending_payment',
  approvalDueAt: raw.approval_due_at ?? null,
  declineReason: raw.decline_reason ?? '',
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});
