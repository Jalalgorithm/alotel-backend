import { apiClient } from '@/lib/apiClient';
import { ApiError } from '@/utils/errors';
import { createId } from '@/lib/mock/utils';
import { toApiPayload, toGuidebook, toGuidebookPayload, toPage, toProperty } from '@/lib/propertySchema';
import {
  toDiscountRule,
  toDiscountPayload,
  toPricingConfig,
  toPricingConfigPayload,
  toPricingRule,
  toPricingRulePayload,
} from '@/lib/pricingSchema';

/** Property catalogue service — listings, review moderation and pricing rules. */

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

  /**
   * `GET /stay/guidebook/<id>/` — no row exists until the first save, so a 404
   * means "nothing written yet" rather than an error (same convention
   * `bookingService.getCheckoutReport` uses for the same "absence is normal"
   * shape).
   */
  async getGuidebook(id) {
    try {
      const { data } = await apiClient.get(`/stay/guidebook/${id}/`);
      return toGuidebook(data);
    } catch (error) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  /**
   * `PUT /stay/guidebook/<id>/` — the backend implements this as an upsert
   * (`get_or_create` + partial update), so this is the only write call this
   * app ever needs to make; `POST` also exists server-side but 400s if a row
   * already exists, so there's no reason to reach for it here.
   */
  async saveGuidebook({ propertyId, ...form }) {
    const { data } = await apiClient.put(`/stay/guidebook/${propertyId}/`, toGuidebookPayload(form));
    return toGuidebook(data);
  },

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

export const propertyService = {
  getProperties: (params) => realProperties.list(params),
  getProperty: (id) => realProperties.detail(id),

  /**
   * The API always creates in `draft`; "Publish now" is the create followed by
   * the publish call, so the wizard can treat it as a single action.
   */
  async createProperty({ form, publish = false }) {
    const property = await realProperties.create(form);
    if (!publish) return property;
    return realProperties.setStatus(property.id, 'published');
  },

  getPropertyImages: (id) => realProperties.images(id),
  uploadPropertyImage: (payload) => realProperties.uploadImage(payload),
  deletePropertyImage: (payload) => realProperties.deleteImage(payload),

  getPropertyVideos: (id) => realProperties.videos(id),
  uploadPropertyVideo: (payload) => realProperties.uploadVideo(payload),
  deletePropertyVideo: (payload) => realProperties.deleteVideo(payload),

  getGuidebook: (id) => realProperties.getGuidebook(id),
  saveGuidebook: (payload) => realProperties.saveGuidebook(payload),

  getPropertyAvailability: (id) => realProperties.availability(id),
  createPropertyAvailability: (payload) => realProperties.createAvailability(payload),
  updatePropertyAvailability: (payload) => realProperties.updateAvailability(payload),
  deletePropertyAvailability: (payload) => realProperties.deleteAvailability(payload),
  setPropertyThumbnail: (payload) => realProperties.setThumbnail(payload),
  updateProperty: (id, patch) => realProperties.update(id, patch),
  deleteProperty: (id) => realProperties.remove(id),
  setPropertyStatus: (id, status) => realProperties.setStatus(id, status),

  getPropertyReviews: (propertyId) => realProperties.listPropertyReviews(propertyId),
  respondToReview: (id, body) => realProperties.respondToReview(id, body),
  flagReview: (id, reason) => realProperties.flagReview(id, reason),

  getDiscounts: () => realPricing.listDiscounts(),
  createDiscount: (values) => realPricing.createDiscount(values),
  updateDiscount: (id, patch) => realPricing.updateDiscount(id, patch),
  deleteDiscount: (id) => realPricing.deleteDiscount(id),

  getPricingConfigs: () => realPricing.listPricingConfigs(),
  createPricingConfig: (values) => realPricing.createPricingConfig(values),
  updatePricingConfig: (id, patch) => realPricing.updatePricingConfig(id, patch),
  deletePricingConfig: (id) => realPricing.deletePricingConfig(id),

  getPricingRules: () => realPricing.listPricingRules(),
  upsertPricingRule: (values) => realPricing.upsertPricingRule(values),

  forwardGeocode: (values) => realGeocoding.forwardGeocode(values),
  verifyPostalCode: (values) => realGeocoding.verifyPostalCode(values),
  lookupPostcode: (values) => realGeocoding.lookupPostcode(values),

  /** Exposed for the wizard's draft id generation. */
  createDraftId: () => createId('draft'),
};
