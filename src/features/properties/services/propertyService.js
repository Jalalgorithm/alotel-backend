import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { ApiError } from '@/utils/errors';
import { clone, createId, delay, paginate } from '@/lib/mock/utils';
import { jsonStorage } from '@/lib/storage';
import { toApiPayload, toPage, toProperty } from '@/lib/propertySchema';
import {
  amenityGroups,
  depositDefaults,
  discountTiers,
  enabledAmenities,
  properties,
  propertyReviews,
  seasonalRules,
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
  pricing: 'alotel.admin.mock.pricing',
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
const readPricing = () =>
  seeded(KEYS.pricing, { discounts: discountTiers, deposits: depositDefaults, seasonal: seasonalRules });

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
  async listReviews(params) {
    await delay(280);
    return paginate(readReviews(), params, {
      searchFields: ['guest', 'property', 'comment'],
      filterFields: ['status'],
    });
  },

  async moderateReview(id, status) {
    await delay(400);

    const rows = readReviews();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Review not found.', 404);

    rows[index] = { ...rows[index], status, moderatedAt: new Date().toISOString() };
    jsonStorage.write(KEYS.reviews, rows);
    return clone(rows[index]);
  },

  /* ----------------------------------------------------------------- pricing */
  async getPricing() {
    await delay(220);
    return clone(readPricing());
  },

  async savePricing(patch) {
    await delay(500);

    const next = { ...readPricing(), ...patch };
    jsonStorage.write(KEYS.pricing, next);
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
  listReviews: async (params) => (await apiClient.get('/property-reviews', { params })).data,
  moderateReview: async (id, status) => (await apiClient.patch(`/property-reviews/${id}`, { status })).data,
  getPricing: async () => (await apiClient.get('/pricing')).data,
  savePricing: async (patch) => (await apiClient.put('/pricing', patch)).data,
};

/**
 * Properties are wired to the real API; the remaining catalogue features
 * (units, amenities, reviews, pricing) still run on mocks, so each half picks
 * its own backend.
 */
const propertiesBackend = env.useMockProperties ? mockProperties : realProperties;
const backend = env.useMock ? mockProperties : realProperties;

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
  setPropertyThumbnail: (payload) => propertiesBackend.setThumbnail(payload),
  updateProperty: (id, patch) => propertiesBackend.update(id, patch),
  deleteProperty: (id) => propertiesBackend.remove(id),
  setPropertyStatus: (id, status) => propertiesBackend.setStatus(id, status),

  getUnits: (params) => backend.listUnits(params),
  setUnitStatus: (id, status) => backend.setUnitStatus(id, status),

  getAmenities: () => backend.getAmenities(),
  toggleAmenity: (name) => backend.toggleAmenity(name),

  getReviews: (params) => backend.listReviews(params),
  moderateReview: (id, status) => backend.moderateReview(id, status),

  getPricing: () => backend.getPricing(),
  savePricing: (patch) => backend.savePricing(patch),

  /** Exposed for the wizard's draft id generation. */
  createDraftId: () => createId('draft'),
};
