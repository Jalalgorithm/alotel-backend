import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { ApiError } from '@/utils/errors';
import { clone, createId, delay, paginate } from '@/lib/mock/utils';
import { jsonStorage } from '@/lib/storage';
import { toApiPayload, toPage, toProperty } from '@/lib/propertySchema';
import {
  toDiscountRule,
  toDiscountPayload,
  toPricingConfig,
  toPricingConfigPayload,
  toPricingRule,
  toPricingRulePayload,
} from '@/lib/pricingSchema';
import {
  amenityGroups,
  discountRules,
  enabledAmenities,
  pricingConfigs,
  pricingRules,
  properties,
  propertyReviews,
  units,
} from '@/lib/mock/catalogue';

/**
 * Property catalogue service — listings, units, amenities, review moderation
 * and pricing rules.
 *
 * Mutations persist to localStorage so a publish/pause or a discount edit
 * survives a reload, which is what makes the screens feel real to test against.
 */

const KEYS = {
  properties: 'alotel.admin.mock.properties',
  units: 'alotel.admin.mock.units',
  reviews: 'alotel.admin.mock.reviews',
  amenities: 'alotel.admin.mock.amenities',
  discounts: 'alotel.admin.mock.discounts',
  pricingConfigs: 'alotel.admin.mock.pricingConfigs',
  pricingRules: 'alotel.admin.mock.pricingRules',
};

const seeded = (key, source) => {
  const rows = jsonStorage.read(key, null);
  if (rows) return rows;
  const value = clone(source);
  jsonStorage.write(key, value);
  return value;
};

const readProperties = () => seeded(KEYS.properties, properties);
const readUnits = () => seeded(KEYS.units, units);
const readReviews = () => seeded(KEYS.reviews, propertyReviews);
const readAmenities = () => seeded(KEYS.amenities, enabledAmenities);
const readDiscounts = () => seeded(KEYS.discounts, discountRules);
const readPricingConfigs = () => seeded(KEYS.pricingConfigs, pricingConfigs);
const readPricingRules = () => seeded(KEYS.pricingRules, pricingRules);

/**
 * The fixtures predate the API and use their own field names. Rendering them
 * through the same normaliser as live data means components only ever see one
 * property shape, whichever backend is in play.
 */
const fixtureToWire = (fixture) => ({
  id: fixture.id,
  host: 'admin@alotelspaces.com',
  name: fixture.name,
  classification: fixture.classification ?? 'Alotel',
  status: { Live: 'published', Draft: 'draft', Paused: 'archived' }[fixture.status] ?? 'draft',
  country: fixture.country,
  state: fixture.state ?? fixture.city,
  city: fixture.city,
  address: fixture.address ?? '',
  coordinates: fixture.coordinates ?? null,
  location: fixture.location ?? fixture.country,
  type: fixture.type,
  bedrooms: fixture.beds ?? fixture.bedrooms ?? 0,
  bathrooms: String(fixture.baths ?? fixture.bathrooms ?? 1),
  maxGuests: fixture.maxGuests ?? 2,
  area: String(fixture.area ?? 0),
  furnished: fixture.furnished ?? 'Fully Furnished',
  pets: fixture.pets ?? 'No pets',
  accessFeatures: fixture.accessibility ?? fixture.accessFeatures ?? [],
  amenities: fixture.amenities ?? [],
  baseRate: String(fixture.rate ?? fixture.baseRate ?? 0),
  minStay: fixture.minStay ?? 1,
  instantBook: Boolean(fixture.instantBook),
  thumbNail: null,
  rating: fixture.rating ?? null,
  reviewCount: fixture.reviews ?? 0,
  createdAt: fixture.createdAt ?? new Date().toISOString(),
});

const mockProperties = {
  /* ---------------------------------------------------------------- listings */
  async list(params) {
    await delay(320);
    const page = paginate(readProperties(), params, {
      searchFields: ['name', 'city', 'id'],
      filterFields: ['country', 'status', 'classification', 'type'],
    });
    return { ...page, items: page.items.map((entry) => toProperty(fixtureToWire(entry))) };
  },

  async detail(id) {
    await delay(220);
    const property = readProperties().find((entry) => entry.id === id);
    if (!property) throw new ApiError('Property not found.', 404);
    return toProperty(fixtureToWire(clone(property)));
  },

  async create(payload) {
    await delay(700);

    const record = {
      id: `AS-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Draft',
      occupancy: 0,
      rating: null,
      reviews: 0,
      ...payload,
      rate: payload.baseRate,
      beds: payload.bedrooms,
      baths: payload.bathrooms,
    };

    jsonStorage.write(KEYS.properties, [record, ...readProperties()]);
    return toProperty(fixtureToWire(record));
  },

  async update(id, patch) {
    await delay(400);

    const rows = readProperties();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Property not found.', 404);

    rows[index] = { ...rows[index], ...patch };
    jsonStorage.write(KEYS.properties, rows);
    return toProperty(fixtureToWire(clone(rows[index])));
  },

  async remove(id) {
    await delay(350);
    jsonStorage.write(KEYS.properties, readProperties().filter((entry) => entry.id !== id));
    return { success: true };
  },

  /** Fixtures carry image URLs inline rather than on a separate collection. */
  async images(id) {
    await delay(200);
    const property = readProperties().find((entry) => entry.id === id);
    return (property?.images ?? []).map((url, order) => ({
      id: `${id}-${order}`,
      property_image: url,
      order,
      roomType: 'Other',
      caption: '',
    }));
  },

  async uploadImage({ file }) {
    await delay(400);
    return {
      id: createId('img'),
      property_image: URL.createObjectURL(file),
      roomType: 'Other',
      caption: '',
      order: 0,
    };
  },

  async deleteImage() {
    await delay(250);
    return { success: true };
  },

  async videos(id) {
    await delay(200);
    const property = readProperties().find((entry) => entry.id === id);
    return property?.videos ?? [];
  },

  async uploadVideo({ file }) {
    await delay(500);
    return {
      id: createId('vid'),
      property_video: URL.createObjectURL(file),
      roomType: 'Walkthrough',
      caption: '',
      order: 0,
      duration: null,
    };
  },

  async deleteVideo() {
    await delay(250);
    return { success: true };
  },

  async availability(id) {
    await delay(250);
    const property = readProperties().find((entry) => entry.id === id);
    const rows = jsonStorage.read(`alotel.admin.mock.availability.${id}`, null);
    if (rows) return clone(rows);
    const today = new Date().toISOString().slice(0, 10);
    const oneYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    return [
      {
        id: null,
        startDate: today,
        endDate: oneYear,
        basePrice: Number(property?.rate ?? property?.baseRate ?? 0),
        isAvailable: true,
        blockedDates: [],
        corporateDiscounts: [],
      },
    ];
  },

  async createAvailability({ propertyId, ...payload }) {
    await delay(350);
    const key = `alotel.admin.mock.availability.${propertyId}`;
    const rows = jsonStorage.read(key, []);
    const row = { id: createId('avail'), blockedDates: [], corporateDiscounts: [], ...payload };
    jsonStorage.write(key, [...rows.filter((entry) => entry.id), row]);
    return row;
  },

  async updateAvailability({ propertyId, id, ...patch }) {
    await delay(300);
    const key = `alotel.admin.mock.availability.${propertyId}`;
    const rows = jsonStorage.read(key, []);
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Availability row not found.', 404);
    rows[index] = { ...rows[index], ...patch };
    jsonStorage.write(key, rows);
    return rows[index];
  },

  async deleteAvailability({ propertyId, id }) {
    await delay(300);
    const key = `alotel.admin.mock.availability.${propertyId}`;
    const rows = jsonStorage.read(key, []);
    jsonStorage.write(key, rows.filter((entry) => entry.id !== id));
    return { success: true };
  },

  async setThumbnail({ propertyId }) {
    await delay(250);
    return mockProperties.detail(propertyId);
  },

  async setStatus(id, status) {
    await delay(400);

    const rows = readProperties();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Property not found.', 404);

    const fixtureStatus = { published: 'Live', draft: 'Draft', archived: 'Paused' }[status] ?? status;
    rows[index] = { ...rows[index], status: fixtureStatus };
    jsonStorage.write(KEYS.properties, rows);
    return toProperty(fixtureToWire(clone(rows[index])));
  },

  /* ------------------------------------------------------------------- units */
  async listUnits(params) {
    await delay(280);
    return paginate(readUnits(), params, {
      searchFields: ['label', 'property'],
      filterFields: ['status'],
    });
  },

  async setUnitStatus(id, status) {
    await delay(350);

    const rows = readUnits();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Unit not found.', 404);

    rows[index] = {
      ...rows[index],
      status,
      lastCleaned: status === 'Ready' ? new Date().toISOString() : rows[index].lastCleaned,
      note: status === 'Ready' ? 'Available' : status === 'Maintenance' ? 'Blocked by admin' : rows[index].note,
    };
    jsonStorage.write(KEYS.units, rows);
    return clone(rows[index]);
  },

  /* --------------------------------------------------------------- amenities */
  async getAmenities() {
    await delay(200);
    return { groups: clone(amenityGroups), enabled: clone(readAmenities()) };
  },

  async toggleAmenity(name) {
    await delay(250);

    const enabled = readAmenities();
    const next = enabled.includes(name) ? enabled.filter((item) => item !== name) : [...enabled, name];
    jsonStorage.write(KEYS.amenities, next);
    return clone(next);
  },

  /* ----------------------------------------------------------------- reviews */
  async listPropertyReviews() {
    await delay(280);
    return readReviews().filter((entry) => !entry.isFlagged);
  },

  async respondToReview(id, body) {
    await delay(350);
    return { id: createId('resp'), review: id, body, respondedByEmail: 'admin@aotel.test' };
  },

  async flagReview(id, reason) {
    await delay(350);
    const rows = readReviews();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Review not found.', 404);
    rows[index] = { ...rows[index], isFlagged: true, flagReason: reason };
    jsonStorage.write(KEYS.reviews, rows);
    return clone(rows[index]);
  },

  /* --------------------------------------------------------------- discounts */
  async listDiscounts() {
    await delay(220);
    return clone(readDiscounts());
  },

  async createDiscount(payload) {
    await delay(400);
    const rule = { id: createId('disc'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...payload };
    jsonStorage.write(KEYS.discounts, [...readDiscounts(), rule]);
    return clone(rule);
  },

  async updateDiscount(id, patch) {
    await delay(350);
    const rows = readDiscounts();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Discount not found.', 404);
    rows[index] = { ...rows[index], ...patch, updatedAt: new Date().toISOString() };
    jsonStorage.write(KEYS.discounts, rows);
    return clone(rows[index]);
  },

  async deleteDiscount(id) {
    await delay(300);
    jsonStorage.write(KEYS.discounts, readDiscounts().filter((entry) => entry.id !== id));
    return { success: true };
  },

  /* --------------------------------------------------------- pricing configs */
  async listPricingConfigs() {
    await delay(220);
    return clone(readPricingConfigs());
  },

  async createPricingConfig(payload) {
    await delay(400);
    const config = { id: createId('pconf'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...payload };
    jsonStorage.write(KEYS.pricingConfigs, [...readPricingConfigs(), config]);
    return clone(config);
  },

  async updatePricingConfig(id, patch) {
    await delay(350);
    const rows = readPricingConfigs();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Pricing configuration not found.', 404);
    rows[index] = { ...rows[index], ...patch, updatedAt: new Date().toISOString() };
    jsonStorage.write(KEYS.pricingConfigs, rows);
    return clone(rows[index]);
  },

  async deletePricingConfig(id) {
    await delay(300);
    jsonStorage.write(KEYS.pricingConfigs, readPricingConfigs().filter((entry) => entry.id !== id));
    return { success: true };
  },

  /* ----------------------------------------------------------- pricing rules */
  async listPricingRules() {
    await delay(220);
    return clone(readPricingRules());
  },

  async upsertPricingRule(payload) {
    await delay(400);
    const rows = readPricingRules();
    const index = rows.findIndex((entry) => entry.region === payload.region && entry.property_type === payload.property_type);
    const next = { id: index >= 0 ? rows[index].id : createId('prule'), updated_at: new Date().toISOString(), ...payload };
    if (index >= 0) rows[index] = next;
    else rows.push(next);
    jsonStorage.write(KEYS.pricingRules, rows);
    return clone(next);
  },
};

/**
 * Translate the portal's filter state into the API's query parameters.
 *
 * Only send what the user actually chose — `status=All` or an empty search
 * would otherwise narrow the results to nothing, and any search/filter param
 * bypasses the server's 15-minute list cache, so sending them needlessly costs
 * a fresh query every time.
 */
/**
 * The API validates `sort` against exactly these two values and 400s on
 * anything else; `newest` is the server's default ordering, expressed by
 * omitting the param.
 */
const SORT_PARAM = {
  'price-asc': 'price_asc',
  'price-desc': 'price_desc',
  price_asc: 'price_asc',
  price_desc: 'price_desc',
};

const toListParams = ({
  query,
  status,
  type,
  location,
  classification,
  minPrice,
  maxPrice,
  bedrooms,
  amenities,
  accessibility,
  sort,
  page = 1,
} = {}) => {
  const params = { page };

  if (query?.trim()) params.q = query.trim();
  if (status && status !== 'All') params.status = status;
  if (type && type !== 'All') params.property_type = type;
  if (location && location !== 'All') params.location = location;
  if (classification && classification !== 'All') params.classification = classification;
  if (minPrice) params.price_min = minPrice;
  if (maxPrice) params.price_max = maxPrice;
  if (bedrooms && bedrooms !== 'All') params.bedrooms = bedrooms;
  if (amenities?.length) params.amenities = amenities.join(',');
  if (accessibility) params.accessibility = Array.isArray(accessibility) ? accessibility.join(',') : 'true';

  if (SORT_PARAM[sort]) params.sort = SORT_PARAM[sort];

  return params;
};

/** Page size is fixed by the API's pagination class. */
const API_PAGE_SIZE = 10;

const realProperties = {
  async list(params) {
    const query = toListParams(params);
    const { data } = await apiClient.get('/properties/', { params: query });
    return toPage(data, { page: query.page, pageSize: API_PAGE_SIZE });
  },

  async detail(id) {
    const { data } = await apiClient.get(`/properties/${id}/`);
    return toProperty(data);
  },

  /**
   * Listings are always created as drafts; publishing is a second call against
   * the dedicated endpoint. Doing both here keeps "Publish now" atomic from the
   * wizard's point of view.
   */
  async create(payload) {
    const { data } = await apiClient.post('/properties/', toApiPayload(payload));
    return toProperty(data);
  },

  async update(id, patch) {
    const { data } = await apiClient.patch(`/properties/${id}/`, toApiPayload(patch, { partial: true }));
    return toProperty(data);
  },

  async remove(id) {
    await apiClient.delete(`/properties/${id}/`);
    return { success: true };
  },

  /** The gallery is a separate collection, not part of the property payload. */
  async images(id) {
    const { data } = await apiClient.get(`/properties/${id}/images/`);
    return (data?.results ?? data ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  /** One image per request — the endpoint takes a single file, not a list. */
  async uploadImage({ propertyId, file, roomType = 'Other', caption = '', order = 0 }) {
    const form = new FormData();
    form.append('property_image', file);
    form.append('roomType', roomType);
    form.append('caption', caption);
    form.append('order', String(order));

    const { data } = await apiClient.post(`/properties/${propertyId}/images/`, form);
    return data;
  },

  async deleteImage({ propertyId, imageId }) {
    await apiClient.delete(`/properties/${propertyId}/images/${imageId}/`);
    return { success: true };
  },

  async videos(id) {
    const { data } = await apiClient.get(`/properties/${id}/videos/`);
    return (data?.results ?? data ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  /** Upload field is `property_video`, not `property_image` — the rest mirrors the photo upload shape. */
  async uploadVideo({ propertyId, file, roomType = 'Walkthrough', caption = '', order = 0 }) {
    const form = new FormData();
    form.append('property_video', file);
    form.append('roomType', roomType);
    form.append('caption', caption);
    form.append('order', String(order));

    const { data } = await apiClient.post(`/properties/${propertyId}/videos/`, form);
    return data;
  },

  async deleteVideo({ propertyId, videoId }) {
    await apiClient.delete(`/properties/${propertyId}/videos/${videoId}/`);
    return { success: true };
  },

  /**
   * `GET /properties/<id>/availability/` — when no `BookingPricing` rows
   * exist yet, the API synthesizes a single unsaved default row (full year,
   * the property's own base rate) instead of an empty list, so `id` may be
   * `null` — that row can't be edited/deleted directly, only used as the
   * starting point for "Add a date range".
   */
  async availability(id) {
    const { data } = await apiClient.get(`/properties/${id}/availability/`);
    return data ?? [];
  },

  async createAvailability({ propertyId, ...payload }) {
    const { data } = await apiClient.post(`/properties/${propertyId}/availability/`, payload);
    return data;
  },

  async updateAvailability({ propertyId, id, ...patch }) {
    const { data } = await apiClient.patch(`/properties/${propertyId}/availability/${id}/`, patch);
    return data;
  },

  async deleteAvailability({ propertyId, id }) {
    await apiClient.delete(`/properties/${propertyId}/availability/${id}/`);
    return { success: true };
  },

  /**
   * `thumbNail` lives on the property itself rather than in the gallery, so it
   * is a multipart PATCH. It is what the card grids and the guest listing show,
   * which is why the wizard sets it from the first photo.
   */
  async setThumbnail({ propertyId, file, imageUrl }) {
    const form = new FormData();

    if (file) {
      form.append('thumbNail', file);
    } else {
      /**
       * Promoting a photo that is already in the gallery: there is no
       * "copy this image to thumbNail" endpoint, so the served file is fetched
       * back and re-uploaded. It is one extra round trip, but it keeps the two
       * fields genuinely independent — deleting the gallery entry later must
       * not blank the cover.
       */
      const response = await fetch(imageUrl);
      if (!response.ok) throw new ApiError('Could not read that photo.', response.status);

      const blob = await response.blob();
      const name = imageUrl.split('/').pop()?.split('?')[0] || 'cover.jpg';
      form.append('thumbNail', blob, name);
    }

    const { data } = await apiClient.patch(`/properties/${propertyId}/`, form);
    return toProperty(data);
  },

  /**
   * Publishing has its own endpoint (it also stamps `publishedAt`); every other
   * status change is a plain PATCH.
   */
  async setStatus(id, status) {
    if (status === 'published') {
      const { data } = await apiClient.post(`/properties/${id}/publish/`);
      return toProperty(data);
    }
    const { data } = await apiClient.patch(`/properties/${id}/`, { status });
    return toProperty(data);
  },

  listUnits: async (params) => (await apiClient.get('/units', { params })).data,
  setUnitStatus: async (id, status) => (await apiClient.patch(`/units/${id}`, { status })).data,
  getAmenities: async () => (await apiClient.get('/amenities')).data,
  toggleAmenity: async (name) => (await apiClient.post('/amenities/toggle', { name })).data,
  /** `GET /reviews/<listing_id>/` — public, per-property, already excludes flagged reviews. No cross-property admin list exists. */
  listPropertyReviews: async (propertyId) => {
    const { data } = await apiClient.get(`/reviews/${propertyId}/`);
    return data ?? [];
  },

  /** `POST /reviews/<id>/response/` — one official response per review; 400s if one already exists. */
  respondToReview: async (id, body) => {
    const { data } = await apiClient.post(`/reviews/${id}/response/`, { body });
    return data;
  },

  /** `POST /reviews/<id>/flag/` — hides the review from the public (and this) list on next fetch. No unflag. */
  flagReview: async (id, reason) => {
    const { data } = await apiClient.post(`/reviews/${id}/flag/`, { reason });
    return data;
  },
};

/** Mapbox-backed address lookup and postal-code verification for the property wizard. Super Admin only. */
const realGeocoding = {
  async forwardGeocode({ address, city, state, location }) {
    const { data } = await apiClient.get('/listings/geocode/forward/', {
      params: { address, ...(city ? { city } : {}), ...(state ? { state } : {}), ...(location ? { location } : {}) },
    });
    return {
      formattedAddress: data.formatted_address,
      postalCode: data.postal_code ?? '',
      city: data.city,
      state: data.state,
      country: data.country,
      coordinates: { lat: data.lat, lng: data.lng },
    };
  },

  async verifyPostalCode({ location, postalCode, address, city, state, propertyId }) {
    const { data } = await apiClient.post('/listings/verify-postal-code/', {
      location,
      postal_code: postalCode ?? '',
      address,
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(propertyId ? { property_id: propertyId } : {}),
    });
    return {
      validFormat: data.valid_format,
      formatError: data.format_error,
      verified: data.verified,
      matchedPostalCode: data.matched_postal_code,
      coordinates: data.coordinates,
      detail: data.detail,
    };
  },

  /**
   * `GET /listings/postcode-lookup/` — every candidate address under a
   * postcode, so an admin can pick the right one instead of typing a single
   * address and hoping the geocoder resolves it correctly. Falls back to
   * manual entry when `manual_override_required` is true or nothing matches.
   */
  async lookupPostcode({ postcode, location }) {
    const { data } = await apiClient.get('/listings/postcode-lookup/', {
      params: { postcode, ...(location ? { location } : {}) },
    });
    return {
      postcode: data.postcode,
      manualOverrideRequired: Boolean(data.manual_override_required),
      addresses: (data.addresses ?? []).map((entry) => ({
        formattedAddress: entry.formatted_address,
        postalCode: entry.postal_code ?? '',
        city: entry.city,
        state: entry.state,
        country: entry.country,
        coordinates: { lat: entry.lat, lng: entry.lng },
      })),
    };
  },
};

const mockGeocoding = {
  async forwardGeocode({ address, city, state }) {
    await delay(300);
    return {
      formattedAddress: [address, city, state].filter(Boolean).join(', '),
      postalCode: '',
      city: city ?? '',
      state: state ?? '',
      country: '',
      coordinates: { lat: 0, lng: 0 },
    };
  },

  async verifyPostalCode({ postalCode }) {
    await delay(300);
    return {
      validFormat: true,
      formatError: null,
      verified: Boolean(postalCode),
      matchedPostalCode: postalCode ?? '',
      coordinates: null,
      detail: 'Mock verification — not checked against a real address.',
    };
  },

  async lookupPostcode({ postcode }) {
    await delay(300);
    return {
      postcode,
      manualOverrideRequired: true,
      addresses: [],
    };
  },
};

/**
 * Country discounts, country fee configs, and global deposit/seasonal rules.
 * Public to read, `IsSuperAdmin`-only to write — see `property/views.py`.
 */
const realPricing = {
  async listDiscounts() {
    const { data } = await apiClient.get('/properties/discounts/');
    return (data?.results ?? data ?? []).map(toDiscountRule);
  },
  async createDiscount(values) {
    const { data } = await apiClient.post('/properties/discounts/', toDiscountPayload(values));
    return toDiscountRule(data);
  },
  async updateDiscount(id, patch) {
    const { data } = await apiClient.patch(`/properties/discounts/${id}/`, toDiscountPayload(patch));
    return toDiscountRule(data);
  },
  async deleteDiscount(id) {
    await apiClient.delete(`/properties/discounts/${id}/`);
    return { success: true };
  },

  async listPricingConfigs() {
    const { data } = await apiClient.get('/properties/pricing-configs/');
    return (data?.results ?? data ?? []).map(toPricingConfig);
  },
  async createPricingConfig(values) {
    const { data } = await apiClient.post('/properties/pricing-configs/', toPricingConfigPayload(values));
    return toPricingConfig(data);
  },
  async updatePricingConfig(id, patch) {
    const { data } = await apiClient.patch(`/properties/pricing-configs/${id}/`, toPricingConfigPayload(patch));
    return toPricingConfig(data);
  },
  async deletePricingConfig(id) {
    await apiClient.delete(`/properties/pricing-configs/${id}/`);
    return { success: true };
  },

  /** `PricingRuleConfig` has no per-id CRUD — GET lists everything, PUT upserts by (region, property_type). */
  async listPricingRules() {
    const { data } = await apiClient.get('/admin/pricing/settings/');
    return (data ?? []).map(toPricingRule);
  },
  async upsertPricingRule(values) {
    const { data } = await apiClient.put('/admin/pricing/settings/', toPricingRulePayload(values));
    return toPricingRule(data);
  },
};

const mockPricing = {
  listDiscounts: async () => (await mockProperties.listDiscounts()).map(toDiscountRule),
  createDiscount: async (values) => toDiscountRule(await mockProperties.createDiscount(toDiscountPayload(values))),
  updateDiscount: async (id, patch) => toDiscountRule(await mockProperties.updateDiscount(id, toDiscountPayload(patch))),
  deleteDiscount: (id) => mockProperties.deleteDiscount(id),

  listPricingConfigs: async () => (await mockProperties.listPricingConfigs()).map(toPricingConfig),
  createPricingConfig: async (values) => toPricingConfig(await mockProperties.createPricingConfig(toPricingConfigPayload(values))),
  updatePricingConfig: async (id, patch) => toPricingConfig(await mockProperties.updatePricingConfig(id, toPricingConfigPayload(patch))),
  deletePricingConfig: (id) => mockProperties.deletePricingConfig(id),

  listPricingRules: async () => (await mockProperties.listPricingRules()).map(toPricingRule),
  upsertPricingRule: async (values) => toPricingRule(await mockProperties.upsertPricingRule(toPricingRulePayload(values))),
};

/**
 * Properties are wired to the real API; the remaining catalogue features
 * (units, amenities, reviews) still run on mocks, so each half picks its own
 * backend. Discounts, pricing configs and pricing rules have their own switch,
 * same reasoning as `useMockTaxes`.
 */
const propertiesBackend = env.useMockProperties ? mockProperties : realProperties;
const backend = env.useMock ? mockProperties : realProperties;
const pricing = env.useMockPricing ? mockPricing : realPricing;
const geocoding = env.useMockProperties ? mockGeocoding : realGeocoding;

export const propertyService = {
  getProperties: (params) => propertiesBackend.list(params),
  getProperty: (id) => propertiesBackend.detail(id),

  /**
   * The API always creates in `draft`; "Publish now" is the create followed by
   * the publish call, so the wizard can treat it as a single action.
   */
  async createProperty({ form, publish = false }) {
    const property = await propertiesBackend.create(form);
    if (!publish) return property;
    return propertiesBackend.setStatus(property.id, 'published');
  },

  getPropertyImages: (id) => propertiesBackend.images(id),
  uploadPropertyImage: (payload) => propertiesBackend.uploadImage(payload),
  deletePropertyImage: (payload) => propertiesBackend.deleteImage(payload),

  getPropertyVideos: (id) => propertiesBackend.videos(id),
  uploadPropertyVideo: (payload) => propertiesBackend.uploadVideo(payload),
  deletePropertyVideo: (payload) => propertiesBackend.deleteVideo(payload),

  getPropertyAvailability: (id) => propertiesBackend.availability(id),
  createPropertyAvailability: (payload) => propertiesBackend.createAvailability(payload),
  updatePropertyAvailability: (payload) => propertiesBackend.updateAvailability(payload),
  deletePropertyAvailability: (payload) => propertiesBackend.deleteAvailability(payload),
  setPropertyThumbnail: (payload) => propertiesBackend.setThumbnail(payload),
  updateProperty: (id, patch) => propertiesBackend.update(id, patch),
  deleteProperty: (id) => propertiesBackend.remove(id),
  setPropertyStatus: (id, status) => propertiesBackend.setStatus(id, status),

  getUnits: (params) => backend.listUnits(params),
  setUnitStatus: (id, status) => backend.setUnitStatus(id, status),

  getAmenities: () => backend.getAmenities(),
  toggleAmenity: (name) => backend.toggleAmenity(name),

  getPropertyReviews: (propertyId) => propertiesBackend.listPropertyReviews(propertyId),
  respondToReview: (id, body) => propertiesBackend.respondToReview(id, body),
  flagReview: (id, reason) => propertiesBackend.flagReview(id, reason),

  getDiscounts: () => pricing.listDiscounts(),
  createDiscount: (values) => pricing.createDiscount(values),
  updateDiscount: (id, patch) => pricing.updateDiscount(id, patch),
  deleteDiscount: (id) => pricing.deleteDiscount(id),

  getPricingConfigs: () => pricing.listPricingConfigs(),
  createPricingConfig: (values) => pricing.createPricingConfig(values),
  updatePricingConfig: (id, patch) => pricing.updatePricingConfig(id, patch),
  deletePricingConfig: (id) => pricing.deletePricingConfig(id),

  getPricingRules: () => pricing.listPricingRules(),
  upsertPricingRule: (values) => pricing.upsertPricingRule(values),

  forwardGeocode: (values) => geocoding.forwardGeocode(values),
  verifyPostalCode: (values) => geocoding.verifyPostalCode(values),
  lookupPostcode: (values) => geocoding.lookupPostcode(values),

  /** Exposed for the wizard's draft id generation. */
  createDraftId: () => createId('draft'),
};
