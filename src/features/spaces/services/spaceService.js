import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { ApiError } from '@/utils/errors';
import { clone, createId, delay, paginate } from '@/lib/mock/utils';
import { jsonStorage } from '@/lib/storage';
import {
  spaces as spacesFixture,
  spaceLayouts as layoutsFixture,
  spaceAddons as addonsFixture,
  spaceOperatingHours as hoursFixture,
  spaceBlackoutDates as blackoutsFixture,
  spaceBookings as bookingsFixture,
} from '@/lib/mock/spaces';
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
    if (params.status) query.status = params.status;
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

/* -------------------------------------------------------------------------- */
/* Offline-dev-only mock                                                       */
/* -------------------------------------------------------------------------- */

const KEYS = {
  spaces: 'alotel.admin.mock.spaces',
  layouts: 'alotel.admin.mock.spaceLayouts',
  addons: 'alotel.admin.mock.spaceAddons',
  hours: 'alotel.admin.mock.spaceHours',
  blackouts: 'alotel.admin.mock.spaceBlackouts',
  images: 'alotel.admin.mock.spaceImages',
  bookings: 'alotel.admin.mock.spaceBookings',
};

const seeded = (key, source) => {
  const rows = jsonStorage.read(key, null);
  if (rows) return rows;
  const value = clone(source);
  jsonStorage.write(key, value);
  return value;
};

const readSpaces = () => seeded(KEYS.spaces, spacesFixture);
const readLayouts = () => seeded(KEYS.layouts, layoutsFixture);
const readAddons = () => seeded(KEYS.addons, addonsFixture);
const readHours = () => seeded(KEYS.hours, hoursFixture);
const readBlackouts = () => seeded(KEYS.blackouts, blackoutsFixture);
const readImages = () => jsonStorage.read(KEYS.images, []);
const readBookings = () => seeded(KEYS.bookings, bookingsFixture);

/** A space's `max_capacity` is derived from its widest layout — recompute whenever layouts change. */
const recomputeMaxCapacity = (spaceId) => {
  const layouts = readLayouts().filter((row) => row.space === spaceId);
  const maxCapacity = layouts.reduce((max, row) => Math.max(max, row.max_capacity ?? 0), 0);

  const rows = readSpaces();
  const index = rows.findIndex((row) => row.id === spaceId);
  if (index >= 0) {
    rows[index] = { ...rows[index], max_capacity: maxCapacity };
    jsonStorage.write(KEYS.spaces, rows);
  }
};

const mockSpaces = {
  async listSpaces(params = {}) {
    await delay(300);
    const result = paginate(readSpaces(), params, { searchFields: ['title'], filterFields: ['status'] });
    return { ...result, items: result.items.map(toSpace) };
  },

  async getSpace(id) {
    await delay(220);
    const row = readSpaces().find((entry) => entry.id === id);
    if (!row) throw new ApiError('Space not found.', 404);
    return { ...toSpace(row), images: readImages().filter((img) => img.space === id).map(toSpaceImage) };
  },

  async createSpace(values) {
    await delay(450);
    const payload = toSpacePayload(values);
    const record = { id: createId('spc'), host: null, max_capacity: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...payload };
    jsonStorage.write(KEYS.spaces, [...readSpaces(), record]);
    return toSpace(record);
  },

  async updateSpace(id, values) {
    await delay(350);
    const rows = readSpaces();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Space not found.', 404);
    const payload = toSpacePayload({ ...toSpace(rows[index]), ...values });
    rows[index] = { ...rows[index], ...payload, updated_at: new Date().toISOString() };
    jsonStorage.write(KEYS.spaces, rows);
    return toSpace(rows[index]);
  },

  async setSpaceStatus(id, status) {
    return mockSpaces.updateSpace(id, { ...(await mockSpaces.getSpace(id)), status });
  },

  async listLayouts(spaceId) {
    await delay(200);
    return readLayouts().filter((row) => row.space === spaceId).map(toLayout);
  },
  async createLayout(spaceId, values) {
    await delay(300);
    const record = { id: createId('lay'), space: spaceId, ...toLayoutPayload(values) };
    jsonStorage.write(KEYS.layouts, [...readLayouts(), record]);
    recomputeMaxCapacity(spaceId);
    return toLayout(record);
  },
  async deleteLayout(spaceId, id) {
    await delay(300);
    jsonStorage.write(KEYS.layouts, readLayouts().filter((entry) => entry.id !== id));
    recomputeMaxCapacity(spaceId);
    return { success: true };
  },

  async listAddons(spaceId) {
    await delay(200);
    return readAddons().filter((row) => row.space === spaceId).map(toAddon);
  },
  async createAddon(spaceId, values) {
    await delay(300);
    const record = { id: createId('add'), space: spaceId, ...toAddonPayload(values) };
    jsonStorage.write(KEYS.addons, [...readAddons(), record]);
    return toAddon(record);
  },
  async deleteAddon(_spaceId, id) {
    await delay(300);
    jsonStorage.write(KEYS.addons, readAddons().filter((entry) => entry.id !== id));
    return { success: true };
  },

  async listOperatingHours(spaceId) {
    await delay(200);
    return readHours().filter((row) => row.space === spaceId).sort((a, b) => a.day_of_week - b.day_of_week).map(toOperatingHours);
  },
  async createOperatingHoursRow(spaceId, values) {
    await delay(250);
    const record = { id: createId('hrs'), space: spaceId, ...toOperatingHoursPayload(values) };
    jsonStorage.write(KEYS.hours, [...readHours(), record]);
    return toOperatingHours(record);
  },
  async deleteOperatingHoursRow(_spaceId, id) {
    await delay(250);
    jsonStorage.write(KEYS.hours, readHours().filter((entry) => entry.id !== id));
    return { success: true };
  },

  async listBlackoutDates(spaceId) {
    await delay(200);
    return readBlackouts().filter((row) => row.space === spaceId).map(toBlackoutDate);
  },
  async createBlackoutDate(spaceId, values) {
    await delay(300);
    const record = { id: createId('blk'), space: spaceId, ...toBlackoutDatePayload(values) };
    jsonStorage.write(KEYS.blackouts, [...readBlackouts(), record]);
    return toBlackoutDate(record);
  },
  async deleteBlackoutDate(_spaceId, id) {
    await delay(300);
    jsonStorage.write(KEYS.blackouts, readBlackouts().filter((entry) => entry.id !== id));
    return { success: true };
  },

  async listImages(spaceId) {
    await delay(200);
    return readImages().filter((row) => row.space === spaceId).map(toSpaceImage);
  },
  async uploadImage(spaceId, { caption = '', order = 0 }) {
    await delay(400);
    const record = { id: createId('img'), space: spaceId, image: '', order, caption, created_at: new Date().toISOString() };
    jsonStorage.write(KEYS.images, [...readImages(), record]);
    return toSpaceImage(record);
  },
  async deleteImage(_spaceId, id) {
    await delay(250);
    jsonStorage.write(KEYS.images, readImages().filter((entry) => entry.id !== id));
    return { success: true };
  },

  async listBookings(params = {}) {
    await delay(300);
    const rows = readBookings().filter((row) => (params.spaceId ? row.space === params.spaceId : true) && (params.status ? row.status === params.status : true));
    const result = paginate(rows, params, { searchFields: ['guest_name', 'guest_email', 'space_name'], filterFields: [] });
    return { ...result, items: result.items.map(toSpaceBooking) };
  },
  async getBooking(id) {
    await delay(200);
    const row = readBookings().find((entry) => entry.id === id);
    if (!row) throw new ApiError('Booking not found.', 404);
    return toSpaceBooking(row);
  },
  async approveBooking(id) {
    await delay(350);
    const rows = readBookings();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Booking not found.', 404);
    rows[index] = { ...rows[index], status: 'confirmed' };
    jsonStorage.write(KEYS.bookings, rows);
    return toSpaceBooking(rows[index]);
  },
  async declineBooking(id, reason) {
    await delay(350);
    const rows = readBookings();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Booking not found.', 404);
    rows[index] = { ...rows[index], status: 'declined', decline_reason: reason ?? '' };
    jsonStorage.write(KEYS.bookings, rows);
    return toSpaceBooking(rows[index]);
  },
};

const backend = env.useMockSpaces ? mockSpaces : realSpaces;

export const spaceService = {
  getSpaces: (params) => backend.listSpaces(params),
  getSpace: (id) => backend.getSpace(id),
  createSpace: (values) => backend.createSpace(values),
  updateSpace: (id, values) => backend.updateSpace(id, values),
  setSpaceStatus: (id, status) => backend.setSpaceStatus(id, status),

  getLayouts: (spaceId) => backend.listLayouts(spaceId),
  createLayout: (spaceId, values) => backend.createLayout(spaceId, values),
  deleteLayout: (spaceId, id) => backend.deleteLayout(spaceId, id),

  getAddons: (spaceId) => backend.listAddons(spaceId),
  createAddon: (spaceId, values) => backend.createAddon(spaceId, values),
  deleteAddon: (spaceId, id) => backend.deleteAddon(spaceId, id),

  getOperatingHours: (spaceId) => backend.listOperatingHours(spaceId),
  createOperatingHoursRow: (spaceId, values) => backend.createOperatingHoursRow(spaceId, values),
  deleteOperatingHoursRow: (spaceId, id) => backend.deleteOperatingHoursRow(spaceId, id),

  getBlackoutDates: (spaceId) => backend.listBlackoutDates(spaceId),
  createBlackoutDate: (spaceId, values) => backend.createBlackoutDate(spaceId, values),
  deleteBlackoutDate: (spaceId, id) => backend.deleteBlackoutDate(spaceId, id),

  getImages: (spaceId) => backend.listImages(spaceId),
  uploadImage: (spaceId, payload) => backend.uploadImage(spaceId, payload),
  deleteImage: (spaceId, id) => backend.deleteImage(spaceId, id),

  getSpaceBookings: (params) => backend.listBookings(params),
  getSpaceBooking: (id) => backend.getBooking(id),
  getApprovalQueue: (params) => backend.listBookings({ ...params, status: 'pending_host_approval' }),
  approveBooking: (id) => backend.approveBooking(id),
  declineBooking: (id, reason) => backend.declineBooking(id, reason),
};
