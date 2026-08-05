/**
 * The property vocabulary the API accepts, and the translation between its
 * wire shape and the shape the portal works in.
 *
 * These lists mirror the model's `choices` exactly — sending anything else
 * fails validation — so they live in one place rather than being retyped into
 * each form.
 */

export const CLASSIFICATIONS = ['Alotel', 'Third-Party', 'Third-Party — Social Housing'];

export const PROPERTY_TYPES = [
  'Room',
  'Studio',
  '1-Bedroom Flat',
  '2-Bedroom Flat',
  '3-Bedroom Flat',
  'House',
  'Duplex',
  'Bungalow',
  'Luxury Suite',
  'Other',
];

export const FURNISHED_OPTIONS = ['Fully Furnished', 'Part Furnished', 'Unfurnished'];

export const PETS_OPTIONS = ['No pets', 'Pets allowed', 'Small pets only', 'Service animals only'];

/** `location` is a fixed market list, distinct from the free-text `country`. */
export const LOCATIONS = ['UK', 'Spain', 'Nigeria', 'UAE Dubai', 'US'];

export const PROPERTY_STATUSES = ['draft', 'published', 'archived', 'under_review'];

/** Statuses shown as human labels in the UI. */
export const STATUS_LABELS = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
  under_review: 'Under Review',
};

/**
 * The list endpoint returns no currency — only the detail endpoint does, inside
 * `price_breakdown`. Deriving it from the market keeps prices correct in the
 * table without an extra request per row. Mirrors the backend's
 * PricingConfiguration seeding.
 */
const CURRENCY_BY_LOCATION = {
  UK: 'GBP',
  Spain: 'EUR',
  Nigeria: 'NGN',
  'UAE Dubai': 'AED',
  US: 'USD',
};

const CURRENCY_BY_COUNTRY = {
  UK: 'GBP',
  'United Kingdom': 'GBP',
  Spain: 'EUR',
  Nigeria: 'NGN',
  'UAE Dubai': 'AED',
  UAE: 'AED',
  US: 'USD',
  USA: 'USD',
  'United States': 'USD',
};

/** @param {{ location?: string, country?: string }} property */
export const currencyFor = (property) =>
  CURRENCY_BY_LOCATION[property?.location] ?? CURRENCY_BY_COUNTRY[property?.country] ?? 'GBP';

/** Amenity catalogue offered by the wizard. Free-form on the API side. */
export const AMENITY_GROUPS = [
  {
    id: 'tech',
    label: 'Tech & comfort',
    items: ['WiFi', 'Air conditioning', 'Central heating', 'Smart TV', 'Washing machine', 'Dryer', 'Dishwasher', 'Dedicated workspace'],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    items: ['Full kitchen', 'Microwave', 'Coffee machine', 'Dining table', 'Plates & cookware'],
  },
  {
    id: 'security',
    label: 'Security',
    items: ['Smart lock', 'Video doorbell', 'Alarm system', 'CCTV', '24/7 Security', 'Safe'],
  },
  {
    id: 'building',
    label: 'Building & outdoor',
    items: ['Parking', 'Balcony', 'Garden', 'Infinity pool', 'Gym access', 'Concierge', 'Bike storage'],
  },
];

export const ACCESS_FEATURES = [
  'Step-free entry',
  'Wheelchair accessible',
  'Wide doorways',
  'Elevator',
  'Ground floor unit',
  'Accessible parking',
  'Grab bars',
  'Roll-in shower',
  'Shower chair',
  'Visual fire alarm',
  'Lever door handles',
  'Service animals welcome',
];

/* -------------------------------------------------------------------------- */
/* Wire ⇄ app translation                                                      */
/* -------------------------------------------------------------------------- */

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Normalise one API property.
 *
 * The API sends decimals as strings (`"340.00"`) so they survive JSON without
 * float rounding; the UI wants numbers to format and compare. It also uses
 * camelCase already, so field names mostly pass through.
 *
 * @param {object} raw
 */
export const toProperty = (raw) => {
  if (!raw) return null;

  return {
    id: raw.id,
    host: raw.host,
    name: raw.name,
    classification: raw.classification,
    status: raw.status,
    statusLabel: STATUS_LABELS[raw.status] ?? raw.status,

    country: raw.country,
    state: raw.state,
    city: raw.city,
    address: raw.address,
    coordinates: raw.coordinates ?? null,
    location: raw.location,

    type: raw.type,
    bedrooms: raw.bedrooms ?? 0,
    bathrooms: toNumber(raw.bathrooms) ?? 0,
    maxGuests: raw.maxGuests ?? 0,
    area: toNumber(raw.area),
    furnished: raw.furnished,
    pets: raw.pets,

    accessFeatures: raw.accessFeatures ?? [],
    amenities: raw.amenities ?? [],

    baseRate: toNumber(raw.baseRate) ?? 0,
    weekendRate: toNumber(raw.weekendRate),
    monthlyRate: toNumber(raw.monthlyRate),
    cleaningFee: toNumber(raw.cleaningFee),
    securityDeposit: toNumber(raw.securityDeposit),
    minStay: raw.minStay ?? 1,
    maxStay: raw.maxStay ?? null,
    instantBook: Boolean(raw.instantBook),

    currency: raw.price_breakdown?.currency ?? currencyFor(raw),
    thumbnail: raw.thumbNail ?? null,

    rating: toNumber(raw.rating),
    reviewCount: raw.reviewCount ?? 0,

    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    publishedAt: raw.publishedAt,

    /** Detail responses only. */
    priceBreakdown: raw.price_breakdown ?? null,
  };
};

/** Normalise a DRF paginated envelope into the shape the tables expect. */
export const toPage = (raw, { page = 1, pageSize = 10 } = {}) => ({
  items: (raw?.results ?? []).map((entry) => toProperty(entry)),
  total: raw?.count ?? 0,
  page,
  pageSize,
  totalPages: Math.max(1, Math.ceil((raw?.count ?? 0) / pageSize)),
  hasNext: Boolean(raw?.next),
  hasPrevious: Boolean(raw?.previous),
});

/**
 * Build the create/update payload the API expects.
 *
 * Decimals go out as strings to match the serializer, and empty optionals are
 * omitted entirely rather than sent as `""`, which would fail validation.
 */
export const toApiPayload = (form, { partial = false } = {}) => {
  const payload = {
    name: form.name?.trim(),
    classification: form.classification,
    country: form.country?.trim(),
    state: form.state?.trim(),
    city: form.city?.trim(),
    address: form.address?.trim(),
    location: form.location || undefined,
    type: form.type,
    bedrooms: Number(form.bedrooms) || 0,
    bathrooms: String(Number(form.bathrooms) || 0),
    maxGuests: Number(form.maxGuests) || 1,
    area: String(Number(form.area) || 0),
    furnished: form.furnished,
    pets: form.pets,
    accessFeatures: form.accessFeatures ?? [],
    amenities: form.amenities ?? [],
    baseRate: String(Number(form.baseRate) || 0),
    minStay: Number(form.minStay) || 1,
    instantBook: Boolean(form.instantBook),
  };

  if (form.coordinates?.lat && form.coordinates?.lng) {
    payload.coordinates = {
      lat: Number(form.coordinates.lat),
      lng: Number(form.coordinates.lng),
    };
  }

  // Optional numerics: only send when actually filled in.
  const optional = {
    weekendRate: form.weekendRate,
    monthlyRate: form.monthlyRate,
    cleaningFee: form.cleaningFee,
    securityDeposit: form.securityDeposit,
  };
  Object.entries(optional).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) payload[key] = String(Number(value));
  });

  if (form.maxStay !== '' && form.maxStay !== null && form.maxStay !== undefined) {
    payload.maxStay = Number(form.maxStay);
  }

  // `status` is never part of the create form — it only reaches here via an
  // edit that is deliberately changing state.
  if (form.status) payload.status = form.status;

  if (!partial) return payload;

  /**
   * A PATCH must not resend fields the caller didn't touch: doing so would let
   * a stale value from a half-populated edit form overwrite good data. Keep
   * only the keys the patch actually mentions.
   */
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => form[key] !== undefined),
  );
};
