import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { ApiError } from '@/utils/errors';
import { clone, createId, delay, paginate } from '@/lib/mock/utils';
import { jsonStorage } from '@/lib/storage';
import {
  bookings,
  cancellations,
  checkInsToday,
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

  /* -------------------------------------------------------------- check-ins */
  async listCheckIns() {
    await delay(220);

    const rows = readBookings();
    return clone({
      arrivals: checkInsToday,
      departures: rows.filter((booking) => booking.status === 'Active').slice(0, 3),
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
  async listContracts() {
    await delay(280);

    return clone(
      readBookings().map((booking) => ({
        ...booking,
        contractType: resolveContractType(booking.nights, booking.country),
        sentAt: booking.contract === 'Not sent' ? null : '2026-08-01',
        signedAt: booking.contract === 'Signed' ? '2026-08-02' : null,
      })),
    );
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
  listCheckIns: async () => (await apiClient.get('/check-ins')).data,
  listReports: async () => (await apiClient.get('/checkout-reports')).data,
  saveReport: async (id, patch) => (await apiClient.patch(`/checkout-reports/${id}`, patch)).data,
  listContracts: async () => (await apiClient.get('/contracts')).data,
  listHousekeeping: async () => (await apiClient.get('/housekeeping')).data,
  resolveMaintenance: async (id) => (await apiClient.patch(`/maintenance/${id}`, { status: 'Resolved' })).data,
  calendar: async (month) => (await apiClient.get('/calendar', { params: { month } })).data,
  listCancellations: async (params) => (await apiClient.get('/cancellations', { params })).data,
  processRefund: async (id) => (await apiClient.post(`/cancellations/${id}/refund`)).data,
};

/**
 * Reservations are wired to the real API; the surrounding operations features
 * (guests, check-in/out, contracts, housekeeping, calendar) are still mocked,
 * so each half picks its own backend.
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
  getCheckIns: () => backend.listCheckIns(),

  getCheckoutReports: () => backend.listReports(),
  saveCheckoutReport: (id, patch) => backend.saveReport(id, patch),

  getContracts: () => backend.listContracts(),

  getHousekeeping: () => backend.listHousekeeping(),
  resolveMaintenance: (id) => backend.resolveMaintenance(id),

  getCalendar: (month) => backend.calendar(month),

  getCancellations: (params) => backend.listCancellations(params),
  processRefund: (id) => backend.processRefund(id),

  createDamageId: () => createId('dmg'),
};
