import { apiClient } from '@/lib/apiClient';
import { toTemplate, toTemplatePayload } from '@/lib/contractSchema';
import { env } from '@/lib/env';
import { ApiError } from '@/utils/errors';
import { clone, createId, delay, paginate } from '@/lib/mock/utils';
import { jsonStorage } from '@/lib/storage';
import {
  bookings,
  cancellations,
  checkoutReports,
  guests,
  maintenanceRequests,
  resolveContractType,
} from '@/lib/mock/operations';
import { units } from '@/lib/mock/catalogue';
import { toAdminListParams, toBookingDetail, toBookingPage, toReceipt } from '@/lib/bookingSchema';

/**
 * Booking-operations service: reservations, guests, check-in/out, check-out
 * reports, contracts, housekeeping, calendar and cancellations.
 */

const KEYS = {
  bookings: 'alotel.admin.mock.bookings',
  reports: 'alotel.admin.mock.checkoutReports',
  cancellations: 'alotel.admin.mock.cancellations',
  units: 'alotel.admin.mock.units',
  maintenance: 'alotel.admin.mock.maintenance',
};

/**
 * Resolve a bare `/media/...` path against the API's own origin. A no-op for
 * already-absolute URLs and for a same-origin deployment (relative `apiUrl`,
 * e.g. `/api/v1` behind a reverse proxy) — there `new URL` throws on the
 * relative base, which is exactly the case where the path is already correct
 * as-is.
 */
const resolveMediaUrl = (path) => {
  if (!path || /^https?:\/\//i.test(path)) return path;
  try {
    return new URL(path, env.apiUrl).href;
  } catch {
    return path;
  }
};

const seeded = (key, source) => {
  const rows = jsonStorage.read(key, null);
  if (rows) return rows;
  const value = clone(source);
  jsonStorage.write(key, value);
  return value;
};

const readBookings = () => seeded(KEYS.bookings, bookings);
const readReports = () => seeded(KEYS.reports, checkoutReports);
const readCancellations = () => seeded(KEYS.cancellations, cancellations);
const readUnits = () => seeded(KEYS.units, units);
const readMaintenance = () => seeded(KEYS.maintenance, maintenanceRequests);

const mockBookings = {
  /* --------------------------------------------------------------- bookings */
  async list(params) {
    await delay(320);
    return paginate(readBookings(), params, {
      searchFields: ['guest', 'id', 'property', 'email'],
      filterFields: ['status', 'country'],
    });
  },

  async detail(id) {
    await delay(200);
    const booking = readBookings().find((entry) => entry.id === id);
    if (!booking) throw new ApiError('Booking not found.', 404);
    return clone(booking);
  },

  async update(id, patch) {
    await delay(450);

    const rows = readBookings();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Booking not found.', 404);

    rows[index] = { ...rows[index], ...patch, updatedAt: new Date().toISOString() };
    jsonStorage.write(KEYS.bookings, rows);
    return clone(rows[index]);
  },

  async timeline(id) {
    await delay(200);
    const booking = readBookings().find((entry) => entry.id === id);
    return booking ? [{ from: '', to: booking.status, reason: '', triggeredBy: null, at: booking.createdAt }] : [];
  },

  async receipt(id) {
    await delay(250);
    const booking = readBookings().find((entry) => entry.id === id);
    if (!booking) throw new ApiError('Booking not found.', 404);

    return {
      bookingId: id,
      status: booking.status,
      currency: booking.currency ?? 'GBP',
      totals: { total_due_now: booking.total ?? 0 },
      lineItems: [],
      payments: [],
      generatedAt: new Date().toISOString(),
    };
  },

  async confirm(id) {
    return mockBookings.update(id, { status: 'Confirmed' });
  },

  async cancelBooking(id, reason) {
    return mockBookings.update(id, { status: 'Cancelled', reason });
  },

  /* ----------------------------------------------------------------- guests */
  async listGuests(params) {
    await delay(280);
    return paginate(guests, params, {
      searchFields: ['name', 'email', 'phone'],
      filterFields: ['kyc', 'country', 'segment'],
    });
  },

  /* -------------------------------------------------------- check-out reports */
  async listReports() {
    await delay(260);
    return clone(readReports());
  },

  async saveReport(id, patch) {
    await delay(450);

    const rows = readReports();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Report not found.', 404);

    rows[index] = { ...rows[index], ...patch };
    jsonStorage.write(KEYS.reports, rows);
    return clone(rows[index]);
  },

  /* -------------------------------------------------------------- contracts */
  async contractForBooking() {
    await delay(200);
    return null;
  },

  async sendContract() {
    await delay(400);
    return { detail: 'Mock contract sent.' };
  },

  async getContractStatus() {
    await delay(200);
    return null;
  },

  async listContractTemplates() {
    await delay(200);
    return [];
  },

  async createContractTemplate(values) {
    await delay(400);
    return { id: createId('tpl'), ...values, isActive: true };
  },

  async updateContractTemplate(id, patch) {
    await delay(300);
    return { id, ...patch };
  },

  async deleteContractTemplate() {
    await delay(250);
    return { success: true };
  },

  /* ------------------------------------------------------------ inspections */
  async uploadInspectionPhoto() {
    await delay(400);
    return { id: createId('insp'), photos: [] };
  },

  async getInspectionState() {
    await delay(200);
    return { checkin: null, checkout: null };
  },

  async listPendingReviewInspections() {
    await delay(220);
    return [];
  },

  async reviewInspection() {
    await delay(300);
    return { review_status: 'approved' };
  },

  async completeCheckIn() {
    await delay(400);
    return { detail: 'Mock check-in completed.', status: 'active' };
  },

  async completeCheckOut() {
    await delay(400);
    return { detail: 'Mock check-out completed.', status: 'completed' };
  },

  async listContracts() {
    await delay(280);

    // Same envelope as the real implementation, so the screen renders
    // identically whichever backend is in play.
    return {
      items: clone(
        readBookings().map((booking) => ({
          ...booking,
          contractType: resolveContractType(booking.nights, booking.country),
          sentAt: booking.contract === 'Not sent' ? null : '2026-08-01',
          signedAt: booking.contract === 'Signed' ? '2026-08-02' : null,
        })),
      ),
      total: readBookings().length,
    };
  },

  /* ----------------------------------------------------------- housekeeping */
  async listHousekeeping() {
    await delay(250);
    return clone({ units: readUnits(), maintenance: readMaintenance() });
  },

  async resolveMaintenance(id) {
    await delay(400);

    const rows = readMaintenance();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Request not found.', 404);

    rows[index] = { ...rows[index], status: 'Resolved', resolvedAt: new Date().toISOString() };
    jsonStorage.write(KEYS.maintenance, rows);
    return clone(rows[index]);
  },

  /* --------------------------------------------------------------- calendar */
  async calendar(month) {
    await delay(280);

    // Expand each booking into the nights it occupies, so the grid can simply
    // look up a date key instead of re-deriving ranges per cell.
    const nightsByDate = {};

    readBookings()
      .filter((booking) => !['Cancelled'].includes(booking.status))
      .forEach((booking) => {
        const start = new Date(booking.checkIn);
        const end = new Date(booking.checkOut);

        for (let date = new Date(start); date < end; date.setDate(date.getDate() + 1)) {
          const key = date.toISOString().slice(0, 10);
          if (!key.startsWith(month)) continue;
          nightsByDate[key] = nightsByDate[key] ?? [];
          nightsByDate[key].push({
            id: booking.id,
            guest: booking.guest,
            property: booking.property,
            color: booking.color,
            status: booking.status,
          });
        }
      });

    return clone(nightsByDate);
  },

  /* ---------------------------------------------------------- cancellations */
  async listCancellations(params) {
    await delay(260);
    return paginate(readCancellations(), params, {
      searchFields: ['guest', 'bookingId', 'property', 'reason'],
      filterFields: ['status'],
    });
  },

  async processRefund(id) {
    await delay(500);

    const rows = readCancellations();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Cancellation not found.', 404);

    rows[index] = { ...rows[index], status: 'Refunded', refundedAt: new Date().toISOString() };
    jsonStorage.write(KEYS.cancellations, rows);
    return clone(rows[index]);
  },
};

const realBookings = {
  async list(params) {
    const query = toAdminListParams(params);
    const { data } = await apiClient.get('/bookings/admin/list/', { params: query });
    return toBookingPage(data, { page: query.page });
  },

  async detail(id) {
    const { data } = await apiClient.get(`/bookings/${id}/`);
    return toBookingDetail(data);
  },

  async timeline(id) {
    const { data } = await apiClient.get(`/bookings/${id}/timeline/`);
    // The endpoint answers with a bare list of status events.
    return (Array.isArray(data) ? data : (data?.results ?? [])).map((event) => ({
      from: event.from_status,
      to: event.to_status,
      reason: event.reason,
      triggeredBy: event.triggered_by,
      at: event.created_at,
    }));
  },

  async receipt(id) {
    const { data } = await apiClient.get(`/bookings/${id}/receipt/`);
    return toReceipt(data);
  },

  /** Approve a booking that is waiting on an admin decision. */
  async confirm(id) {
    const { data } = await apiClient.post(`/bookings/${id}/confirm/`);
    return data;
  },

  async cancelBooking(id, reason = '') {
    const { data } = await apiClient.post(`/bookings/${id}/cancel/`, { reason });
    return data;
  },

  /**
   * There is no general booking PATCH on the API — every state change goes
   * through its own endpoint, which is what keeps the status history honest.
   */
  update: async () => {
    throw new ApiError('Bookings are changed through confirm/cancel, not a direct update.', 405);
  },

  listGuests: async (params) => (await apiClient.get('/guests', { params })).data,
  listReports: async () => (await apiClient.get('/checkout-reports')).data,
  saveReport: async (id, patch) => (await apiClient.patch(`/checkout-reports/${id}`, patch)).data,
  /**
   * There is no "list contracts" endpoint — a contract is only reachable
   * through the booking it belongs to. So the screen is built from the admin
   * booking list, and each row's contract state is fetched on demand rather
   * than firing one request per row on load.
   */
  listContracts: async (params) => {
    const { data } = await apiClient.get('/bookings/admin/list/', { params });
    const rows = data?.results ?? data ?? [];

    return {
      items: rows.map((row) => ({
        id: row.id,
        guest: row.guest_name || row.guest_email,
        guestEmail: row.guest_email,
        property: row.property_name,
        country: row.country,
        nights: row.nights,
        checkIn: row.check_in_date,
        checkOut: row.check_out_date,
        status: row.status,

        /**
         * The list payload carries no contract fields, so the type is derived
         * from the same nights + country matrix the API uses server-side, and
         * the issuing state stays unknown until a row is opened — shown as
         * "Not sent" rather than left blank.
         */
        contractType: resolveContractType(row.nights, row.country),
        contract: 'Not sent',
        sentAt: null,
        signedAt: null,
      })),
      total: data?.count ?? rows.length,
    };
  },

  /** The agreement text and its issuing state, for one booking. */
  contractForBooking: async (bookingId) => {
    try {
      const { data } = await apiClient.get(`/contracts/booking/${bookingId}/text/`);
      return {
        contractId: data.contract_id,
        status: data.status,
        templateName: data.template_name,
        templateVersion: data.template_version,
        content: data.content ?? '',
      };
    } catch (error) {
      // 404 simply means nothing has been issued for this booking yet.
      if (error?.status === 404 || error?.response?.status === 404) return null;
      throw error;
    }
  },

  sendContract: async ({ bookingId, templateId }) => {
    const { data } = await apiClient.post('/contracts/send/', {
      booking_id: bookingId,
      ...(templateId ? { template_id: templateId } : {}),
    });
    return data;
  },

  /** The signed-document link only lives on the status endpoint, not the text one. */
  getContractStatus: async (contractId) => {
    const { data } = await apiClient.get(`/contracts/${contractId}/status/`);
    return {
      contractId: data.contract_id,
      status: data.status,
      signedDocumentUrl: data.signed_document_url || '',
      sentAt: data.sent_at,
      signedAt: data.signed_at,
    };
  },

  listContractTemplates: async () => {
    const { data } = await apiClient.get('/contracts/templates/');
    return (data?.results ?? data ?? []).map(toTemplate);
  },

  createContractTemplate: async (values) => {
    const { data } = await apiClient.post('/contracts/templates/', toTemplatePayload(values));
    return toTemplate(data);
  },

  updateContractTemplate: async (id, patch) => {
    const { data } = await apiClient.patch(`/contracts/templates/${id}/`, toTemplatePayload(patch));
    return toTemplate(data);
  },

  deleteContractTemplate: async (id) => {
    await apiClient.delete(`/contracts/templates/${id}/`);
    return { success: true };
  },

  /** One photo per call — the API has no bulk-upload variant. */
  uploadInspectionPhoto: async ({ bookingId, stage, roomArea, file, caption }) => {
    const form = new FormData();
    form.append('room_area', roomArea);
    form.append('file', file);
    if (caption) form.append('caption', caption);

    const { data } = await apiClient.post(`/inspections/${bookingId}/${stage}/`, form);
    return data;
  },

  /**
   * Which rooms already have photos for this booking, so re-opening one an
   * admin (or a colleague) already started doesn't look like a blank slate —
   * the backend's `Inspection` row is `get_or_create`d per (booking, stage),
   * so progress genuinely persists server-side.
   *
   * Also carries `reviewStatus`/`reviewNote`/`reviewedAt` and the raw `photos`
   * list (not just grouped by room) — since a guest's self-submitted check-in
   * or check-out media puts the stage into `pending_review`, which blocks
   * `completeCheckIn`/`completeCheckOut` below until staff clears it via
   * `reviewInspection`.
   *
   * `file` comes back as a bare `/media/...` path (the `InspectionSerializer`
   * isn't built with request context, unlike other file fields in this API) —
   * resolved against the API's own origin so it loads even when the admin
   * portal is served from a different origin in dev.
   */
  getInspectionState: async (bookingId) => {
    const { data } = await apiClient.get(`/inspections/${bookingId}/compare/`);
    const resolveFile = (photo) => ({ ...photo, file: resolveMediaUrl(photo.file) });
    const stage = (obj) => ({
      photosByArea: Object.fromEntries(
        Object.entries(obj?.photos_by_area ?? {}).map(([area, photos]) => [area, photos.map(resolveFile)]),
      ),
      photos: (obj?.photos ?? []).map(resolveFile),
      reviewStatus: obj?.review_status ?? 'not_required',
      reviewNote: obj?.review_note ?? '',
      reviewedAt: obj?.reviewed_at ?? null,
    });
    return { checkin: stage(data?.checkin), checkout: stage(data?.checkout) };
  },

  /** Guest-submitted check-in/check-out inspections awaiting staff review, scoped to the caller's assigned properties. */
  listPendingReviewInspections: async () => {
    const { data } = await apiClient.get('/inspections/pending-review/');
    return (data?.results ?? []).map((row) => ({
      inspectionId: row.inspection_id,
      bookingId: row.booking_id,
      propertyId: row.property_id,
      propertyName: row.property_name,
      guestName: row.guest_name,
      stage: row.stage,
      photoCount: row.photo_count,
      submittedAt: row.submitted_at,
      notes: row.notes,
    }));
  },

  /** Clears the `pending_review` block — `disposition` is `'approved'` or `'noted'` (a `note` is required for `'noted'`). */
  reviewInspection: async ({ inspectionId, disposition, note }) => {
    const { data } = await apiClient.post(`/inspections/${inspectionId}/review/`, {
      disposition,
      ...(note ? { note } : {}),
    });
    return data;
  },

  completeCheckIn: async ({ bookingId, notes, contractId }) => {
    const { data } = await apiClient.post(`/inspections/${bookingId}/checkin/complete/`, {
      ...(notes ? { notes } : {}),
      ...(contractId ? { contract_id: contractId } : {}),
    });
    return data;
  },

  completeCheckOut: async ({ bookingId, notes }) => {
    const { data } = await apiClient.post(`/inspections/${bookingId}/checkout/complete/`, {
      ...(notes ? { notes } : {}),
    });
    return data;
  },

  listHousekeeping: async () => (await apiClient.get('/housekeeping')).data,
  resolveMaintenance: async (id) => (await apiClient.patch(`/maintenance/${id}`, { status: 'Resolved' })).data,
  calendar: async (month) => (await apiClient.get('/calendar', { params: { month } })).data,
  listCancellations: async (params) => (await apiClient.get('/cancellations', { params })).data,
  processRefund: async (id) => (await apiClient.post(`/cancellations/${id}/refund`)).data,
};

/**
 * Reservations, contracts and inspections (check-in/out) are wired to the
 * real API via `bookingsBackend`; the surrounding operations features
 * (guests, housekeeping, calendar, checkout reports) are still mocked and
 * stay on the global `backend` flag.
 */
const bookingsBackend = env.useMockBookings ? mockBookings : realBookings;
const backend = env.useMock ? mockBookings : realBookings;

export const bookingService = {
  getBookings: (params) => bookingsBackend.list(params),
  getBooking: (id) => bookingsBackend.detail(id),
  getBookingTimeline: (id) => bookingsBackend.timeline(id),
  getBookingReceipt: (id) => bookingsBackend.receipt(id),
  confirmBooking: (id) => bookingsBackend.confirm(id),
  cancelBooking: (id, reason) => bookingsBackend.cancelBooking(id, reason),

  /**
   * Contract and KYC nudges still run on mocks — the API models those through
   * the compliance endpoints, which are not part of this pass — so they stay
   * on the mock backend rather than hitting a booking PATCH that does not exist.
   */
  updateBooking: (id, patch) => mockBookings.update(id, patch),

  getGuests: (params) => backend.listGuests(params),

  getCheckoutReports: () => backend.listReports(),
  saveCheckoutReport: (id, patch) => backend.saveReport(id, patch),

  /*
   * Contracts follow the bookings flag, not the global one: they are wired to
   * the real API while the surrounding operations screens are still mocked.
   */
  getContracts: (params) => bookingsBackend.listContracts(params),
  getContractForBooking: (bookingId) => bookingsBackend.contractForBooking(bookingId),
  getContractStatus: (contractId) => bookingsBackend.getContractStatus(contractId),
  sendContract: (payload) => bookingsBackend.sendContract(payload),
  getContractTemplates: () => bookingsBackend.listContractTemplates(),
  createContractTemplate: (values) => bookingsBackend.createContractTemplate(values),
  updateContractTemplate: (id, patch) => bookingsBackend.updateContractTemplate(id, patch),
  deleteContractTemplate: (id) => bookingsBackend.deleteContractTemplate(id),

  uploadInspectionPhoto: (payload) => bookingsBackend.uploadInspectionPhoto(payload),
  getInspectionState: (bookingId) => bookingsBackend.getInspectionState(bookingId),
  getPendingReviewInspections: () => bookingsBackend.listPendingReviewInspections(),
  reviewInspection: (payload) => bookingsBackend.reviewInspection(payload),
  completeCheckIn: (payload) => bookingsBackend.completeCheckIn(payload),
  completeCheckOut: (payload) => bookingsBackend.completeCheckOut(payload),

  getHousekeeping: () => backend.listHousekeeping(),
  resolveMaintenance: (id) => backend.resolveMaintenance(id),

  getCalendar: (month) => backend.calendar(month),

  getCancellations: (params) => backend.listCancellations(params),
  processRefund: (id) => backend.processRefund(id),

  createDamageId: () => createId('dmg'),
};
