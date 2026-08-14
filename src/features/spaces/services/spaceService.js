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
  toSpaceBooking,
} from '@/lib/spaceSchema';

/**
 * Spaces has no real backend yet (confirmed by reading `aotel-backend` — no
 * app, models, serializers or URLs exist for it). Every method below is
 * mocked against `jsonStorage`, seeded from `@/lib/mock/spaces.js`. Fixtures
 * are kept in the spec's proposed wire shape and normalised through
 * `spaceSchema.js` on the way in/out, the same way a real API response would
 * be — so this mock layer is the exact seam a future `realSpaces` slots into.
 */

const KEYS = {
  spaces: 'alotel.admin.mock.spaces',
  layouts: 'alotel.admin.mock.spaceLayouts',
  addons: 'alotel.admin.mock.spaceAddons',
  hours: 'alotel.admin.mock.spaceHours',
  blackouts: 'alotel.admin.mock.spaceBlackouts',
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

/* -------------------------------------------------------------------------- */
/* Spaces                                                                       */
/* -------------------------------------------------------------------------- */

const mockSpaces = {
  async listSpaces(params = {}) {
    await delay(300);
    const result = paginate(readSpaces(), params, {
      searchFields: ['title'],
      filterFields: ['status'],
    });
    return { ...result, items: result.items.map(toSpace) };
  },

  async getSpace(id) {
    await delay(220);
    const row = readSpaces().find((entry) => entry.id === id);
    if (!row) throw new ApiError('Space not found.', 404);
    return toSpace(row);
  },

  async createSpace(values) {
    await delay(450);
    const payload = toSpacePayload(values);
    const record = {
      id: createId('spc'),
      host: null,
      max_capacity: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload,
    };
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

  async deleteSpace(id) {
    await delay(350);
    jsonStorage.write(KEYS.spaces, readSpaces().filter((entry) => entry.id !== id));
    jsonStorage.write(KEYS.layouts, readLayouts().filter((entry) => entry.space !== id));
    jsonStorage.write(KEYS.addons, readAddons().filter((entry) => entry.space !== id));
    jsonStorage.write(KEYS.hours, readHours().filter((entry) => entry.space !== id));
    jsonStorage.write(KEYS.blackouts, readBlackouts().filter((entry) => entry.space !== id));
    return { success: true };
  },

  /* ------------------------------------------------------------- layouts -- */

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

  async updateLayout(spaceId, id, values) {
    await delay(300);
    const rows = readLayouts();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Layout not found.', 404);
    rows[index] = { ...rows[index], ...toLayoutPayload(values) };
    jsonStorage.write(KEYS.layouts, rows);
    recomputeMaxCapacity(spaceId);
    return toLayout(rows[index]);
  },

  async deleteLayout(spaceId, id) {
    await delay(300);
    jsonStorage.write(KEYS.layouts, readLayouts().filter((entry) => entry.id !== id));
    recomputeMaxCapacity(spaceId);
    return { success: true };
  },

  /* -------------------------------------------------------------- add-ons -- */

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

  async updateAddon(spaceId, id, values) {
    await delay(300);
    const rows = readAddons();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Add-on not found.', 404);
    rows[index] = { ...rows[index], ...toAddonPayload(values) };
    jsonStorage.write(KEYS.addons, rows);
    return toAddon(rows[index]);
  },

  async deleteAddon(_spaceId, id) {
    await delay(300);
    jsonStorage.write(KEYS.addons, readAddons().filter((entry) => entry.id !== id));
    return { success: true };
  },

  /* --------------------------------------------------------- operating hours -- */

  async listOperatingHours(spaceId) {
    await delay(200);
    return readHours()
      .filter((row) => row.space === spaceId)
      .sort((a, b) => a.day_of_week - b.day_of_week)
      .map(toOperatingHours);
  },

  /** Upserts all seven weekday rows in one call — the editor always submits the full week. */
  async updateOperatingHours(spaceId, weekRows) {
    await delay(350);
    const others = readHours().filter((row) => row.space !== spaceId);
    const updated = weekRows.map((row) => ({
      id: row.id ?? createId('hrs'),
      space: spaceId,
      ...toOperatingHoursPayload(row),
    }));
    jsonStorage.write(KEYS.hours, [...others, ...updated]);
    return updated.map(toOperatingHours);
  },

  /* -------------------------------------------------------------- blackouts -- */

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

  /* --------------------------------------------------------------- bookings -- */

  async listBookings(params = {}) {
    await delay(300);
    const rows = readBookings().filter((row) => (params.spaceId ? row.space === params.spaceId : true));
    const result = paginate(rows, params, {
      searchFields: ['guest_name', 'guest_email', 'space_name'],
      filterFields: ['status'],
    });
    return { ...result, items: result.items.map(toSpaceBooking) };
  },

  async getBooking(id) {
    await delay(200);
    const row = readBookings().find((entry) => entry.id === id);
    if (!row) throw new ApiError('Booking not found.', 404);
    return toSpaceBooking(row);
  },

  async listApprovalQueue(params = {}) {
    await delay(280);
    const rows = readBookings().filter((row) => row.status === 'pending_host_approval');
    const result = paginate(rows, params, { searchFields: ['guest_name', 'space_name'], filterFields: [] });
    return { ...result, items: result.items.map(toSpaceBooking) };
  },

  async decideBooking(id, { status, reason }) {
    await delay(350);
    const rows = readBookings();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Booking not found.', 404);

    rows[index] = {
      ...rows[index],
      status,
      decided_at: new Date().toISOString(),
      decline_reason: status === 'declined' ? reason ?? '' : '',
    };
    jsonStorage.write(KEYS.bookings, rows);
    return toSpaceBooking(rows[index]);
  },
};

/** No real backend exists yet — every method documents the future integration seam. */
const realSpaces = new Proxy(
  {},
  {
    get: (_target, method) => () => {
      throw new Error(`spaceService.${String(method)}: Spaces has no real backend yet.`);
    },
  },
);

const backend = env.useMockSpaces ? mockSpaces : realSpaces;

export const spaceService = {
  getSpaces: (params) => backend.listSpaces(params),
  getSpace: (id) => backend.getSpace(id),
  createSpace: (values) => backend.createSpace(values),
  updateSpace: (id, values) => backend.updateSpace(id, values),
  setSpaceStatus: (id, status) => backend.setSpaceStatus(id, status),
  deleteSpace: (id) => backend.deleteSpace(id),

  getLayouts: (spaceId) => backend.listLayouts(spaceId),
  createLayout: (spaceId, values) => backend.createLayout(spaceId, values),
  updateLayout: (spaceId, id, values) => backend.updateLayout(spaceId, id, values),
  deleteLayout: (spaceId, id) => backend.deleteLayout(spaceId, id),

  getAddons: (spaceId) => backend.listAddons(spaceId),
  createAddon: (spaceId, values) => backend.createAddon(spaceId, values),
  updateAddon: (spaceId, id, values) => backend.updateAddon(spaceId, id, values),
  deleteAddon: (spaceId, id) => backend.deleteAddon(spaceId, id),

  getOperatingHours: (spaceId) => backend.listOperatingHours(spaceId),
  updateOperatingHours: (spaceId, weekRows) => backend.updateOperatingHours(spaceId, weekRows),

  getBlackoutDates: (spaceId) => backend.listBlackoutDates(spaceId),
  createBlackoutDate: (spaceId, values) => backend.createBlackoutDate(spaceId, values),
  deleteBlackoutDate: (spaceId, id) => backend.deleteBlackoutDate(spaceId, id),

  getSpaceBookings: (params) => backend.listBookings(params),
  getSpaceBooking: (id) => backend.getBooking(id),
  getApprovalQueue: (params) => backend.listApprovalQueue(params),
  approveBooking: (id) => backend.decideBooking(id, { status: 'confirmed' }),
  declineBooking: (id, reason) => backend.decideBooking(id, { status: 'declined', reason }),
};
