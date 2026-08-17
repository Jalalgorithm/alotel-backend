import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { paginate } from '@/lib/mock/utils';
import {
  toSpace,
  toSpacePayload,
  toLayout,
  toLayoutPayload,
  toAddon,
  toAddonPayload,
  toOperatingHours,
  toOperatingHoursPayload,
  toBlackoutDate,
  toBlackoutDatePayload,
  toSpaceImage,
  toSpaceBooking,
} from '@/lib/spaceSchema';

/**
 * Spaces now has a real backend (`spaces` app, `/api/v1/spaces/...`) —
 * confirmed by reading `spaces/{models,serializers,views}.py` in full.
 * `realSpaces` below is the primary path (`env.useMockSpaces` defaults
 * false). A few real capabilities are narrower than the module originally
 * mocked: no delete-space endpoint, no update endpoint for layouts/add-ons
 * (create+delete only), and operating hours are one row per open weekday
 * with no bulk-update endpoint (create+delete only, no PATCH) — the
 * exported `spaceService` below reflects exactly what's callable, nothing
 * more.
 */

/** Resolve a bare `/media/...` path against the API's own origin — same helper as `bookingService.js`. */
const resolveMediaUrl = (path) => {
  if (!path || /^https?:\/\//i.test(path)) return path;
  try {
    return new URL(path, env.apiUrl).href;
  } catch {
    return path;
  }
};

/** Normalise a list response the same defensive way regardless of whether the endpoint turns out to paginate or not. */
const toListResult = (data, params, mapFn) => {
  const items = Array.isArray(data) ? data : (data?.results ?? []);
  const pageSize = data?.page_size ?? params.pageSize ?? 20;
  const total = data?.count ?? items.length;
  return {
    items: items.map(mapFn),
    total,
    page: data?.page ?? params.page ?? 1,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};

/* -------------------------------------------------------------------------- */
/* Real backend                                                                */
/* -------------------------------------------------------------------------- */

const realSpaces = {
  async listSpaces(params = {}) {
    const { data } = await apiClient.get('/spaces/admin/');
    // No confirmed server-side search/pagination on this endpoint — filter/paginate the full list client-side.
    const result = paginate((Array.isArray(data) ? data : (data?.results ?? [])), params, {
      searchFields: ['title', 'city', 'country'],
      filterFields: ['status'],
    });
    return { ...result, items: result.items.map(toSpace) };
  },

  async getSpace(id) {
    const { data } = await apiClient.get(`/spaces/${id}/`);
    const space = toSpace(data);
    return { ...space, images: space.images.map((image) => ({ ...image, url: resolveMediaUrl(image.url) })) };
  },

  async createSpace(values) {
    const { data } = await apiClient.post('/spaces/admin/', toSpacePayload(values));
    return toSpace(data);
  },

  async updateSpace(id, values) {
    const { data } = await apiClient.patch(`/spaces/${id}/`, toSpacePayload(values));
    return toSpace(data);
  },

  async setSpaceStatus(id, status) {
    const { data } = await apiClient.patch(`/spaces/${id}/`, { status });
    return toSpace(data);
  },

  /* ------------------------------------------------------------- layouts -- */

  async listLayouts(spaceId) {
    const { data } = await apiClient.get(`/spaces/admin/${spaceId}/layouts/`);
    return (Array.isArray(data) ? data : (data?.results ?? [])).map(toLayout);
  },

  async createLayout(spaceId, values) {
    const { data } = await apiClient.post(`/spaces/admin/${spaceId}/layouts/`, toLayoutPayload(values));
    return toLayout(data);
  },

  async deleteLayout(spaceId, id) {
    await apiClient.delete(`/spaces/admin/${spaceId}/layouts/${id}/`);
    return { success: true };
  },

  /* -------------------------------------------------------------- add-ons -- */

  async listAddons(spaceId) {
    const { data } = await apiClient.get(`/spaces/admin/${spaceId}/addons/`);
    return (Array.isArray(data) ? data : (data?.results ?? [])).map(toAddon);
  },

  async createAddon(spaceId, values) {
    const { data } = await apiClient.post(`/spaces/admin/${spaceId}/addons/`, toAddonPayload(values));
    return toAddon(data);
  },

  async deleteAddon(spaceId, id) {
    await apiClient.delete(`/spaces/admin/${spaceId}/addons/${id}/`);
    return { success: true };
  },

  /* --------------------------------------------------------- operating hours -- */

  async listOperatingHours(spaceId) {
    const { data } = await apiClient.get(`/spaces/admin/${spaceId}/operating-hours/`);
    return (Array.isArray(data) ? data : (data?.results ?? []))
      .map(toOperatingHours)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  },

  async createOperatingHoursRow(spaceId, values) {
    const { data } = await apiClient.post(`/spaces/admin/${spaceId}/operating-hours/`, toOperatingHoursPayload(values));
    return toOperatingHours(data);
  },

  async deleteOperatingHoursRow(spaceId, id) {
    await apiClient.delete(`/spaces/admin/${spaceId}/operating-hours/${id}/`);
    return { success: true };
  },

  /* -------------------------------------------------------------- blackouts -- */

  async listBlackoutDates(spaceId) {
    const { data } = await apiClient.get(`/spaces/admin/${spaceId}/blackout-dates/`);
    return (Array.isArray(data) ? data : (data?.results ?? [])).map(toBlackoutDate);
  },

  async createBlackoutDate(spaceId, values) {
    const { data } = await apiClient.post(`/spaces/admin/${spaceId}/blackout-dates/`, toBlackoutDatePayload(values));
    return toBlackoutDate(data);
  },

  async deleteBlackoutDate(spaceId, id) {
    await apiClient.delete(`/spaces/admin/${spaceId}/blackout-dates/${id}/`);
    return { success: true };
  },

  /* ----------------------------------------------------------------- images -- */

  async listImages(spaceId) {
    const { data } = await apiClient.get(`/spaces/admin/${spaceId}/images/`);
    return (Array.isArray(data) ? data : (data?.results ?? []))
      .map(toSpaceImage)
      .map((image) => ({ ...image, url: resolveMediaUrl(image.url) }));
  },

  async uploadImage(spaceId, { file, caption = '', order = 0 }) {
    const form = new FormData();
    form.append('image', file);
    form.append('order', String(order));
    if (caption) form.append('caption', caption);

    const { data } = await apiClient.post(`/spaces/admin/${spaceId}/images/`, form);
    return { ...toSpaceImage(data), url: resolveMediaUrl(data.image) };
  },

  async deleteImage(spaceId, id) {
    await apiClient.delete(`/spaces/admin/${spaceId}/images/${id}/`);
    return { success: true };
  },

  /* --------------------------------------------------------------- bookings -- */

  async listBookings(params = {}) {
    const query = { page: params.page ?? 1 };
    if (params.status && params.status !== 'All') query.status = params.status;
    if (params.spaceId) query.space_id = params.spaceId;

    const { data } = await apiClient.get('/spaces/bookings/', { params: query });
    return toListResult(data, params, toSpaceBooking);
  },

  async getBooking(id) {
    const { data } = await apiClient.get(`/spaces/bookings/${id}/`);
    return toSpaceBooking(data);
  },

  async approveBooking(id) {
    const { data } = await apiClient.patch(`/spaces/bookings/${id}/approve/`);
    return toSpaceBooking(data);
  },

  async declineBooking(id, reason) {
    const { data } = await apiClient.patch(`/spaces/bookings/${id}/decline/`, { reason });
    return toSpaceBooking(data);
  },
};

export const spaceService = {
  getSpaces: (params) => realSpaces.listSpaces(params),
  getSpace: (id) => realSpaces.getSpace(id),
  createSpace: (values) => realSpaces.createSpace(values),
  updateSpace: (id, values) => realSpaces.updateSpace(id, values),
  setSpaceStatus: (id, status) => realSpaces.setSpaceStatus(id, status),

  getLayouts: (spaceId) => realSpaces.listLayouts(spaceId),
  createLayout: (spaceId, values) => realSpaces.createLayout(spaceId, values),
  deleteLayout: (spaceId, id) => realSpaces.deleteLayout(spaceId, id),

  getAddons: (spaceId) => realSpaces.listAddons(spaceId),
  createAddon: (spaceId, values) => realSpaces.createAddon(spaceId, values),
  deleteAddon: (spaceId, id) => realSpaces.deleteAddon(spaceId, id),

  getOperatingHours: (spaceId) => realSpaces.listOperatingHours(spaceId),
  createOperatingHoursRow: (spaceId, values) => realSpaces.createOperatingHoursRow(spaceId, values),
  deleteOperatingHoursRow: (spaceId, id) => realSpaces.deleteOperatingHoursRow(spaceId, id),

  getBlackoutDates: (spaceId) => realSpaces.listBlackoutDates(spaceId),
  createBlackoutDate: (spaceId, values) => realSpaces.createBlackoutDate(spaceId, values),
  deleteBlackoutDate: (spaceId, id) => realSpaces.deleteBlackoutDate(spaceId, id),

  getImages: (spaceId) => realSpaces.listImages(spaceId),
  uploadImage: (spaceId, payload) => realSpaces.uploadImage(spaceId, payload),
  deleteImage: (spaceId, id) => realSpaces.deleteImage(spaceId, id),

  getSpaceBookings: (params) => realSpaces.listBookings(params),
  getSpaceBooking: (id) => realSpaces.getBooking(id),
  getApprovalQueue: (params) => realSpaces.listBookings({ ...params, status: 'pending_host_approval' }),
  approveBooking: (id) => realSpaces.approveBooking(id),
  declineBooking: (id, reason) => realSpaces.declineBooking(id, reason),
};
