import { apiClient } from '@/lib/apiClient';
import { toTemplate, toTemplatePayload } from '@/lib/contractSchema';
import { env } from '@/lib/env';
import { ApiError } from '@/utils/errors';
import { resolveContractType } from '@/lib/mock/operations';
import {
  toAdminListParams,
  toBookingDetail,
  toBookingPage,
  toBookingRow,
  toGuest,
  toGuestBooking,
  toGuestDetail,
  toGuestPage,
  toReceipt,
} from '@/lib/bookingSchema';
import {
  toCheckoutReport,
  toDamageAssessment,
  toDamageAssessmentPatch,
  toDamageAssessmentPayload,
} from '@/lib/checkoutSchema';

/**
 * Booking-operations service: reservations, guests, check-in/out, check-out
 * reports, contracts, housekeeping, calendar and cancellations.
 */

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

/** Stable per-id color for the calendar's stay dots — nothing server-side backs a "color" for a booking. */
const CALENDAR_COLORS = ['#12603F', '#2a78d6', '#6D28D9', '#eb6834', '#0F766E', '#B91C1C', '#7C3AED', '#0EA5E9'];
const colorForId = (id) => {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  return CALENDAR_COLORS[hash % CALENDAR_COLORS.length];
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

  /** Re-runs compliance checks on a booking that has already met every other requirement. */
  async confirm(id) {
    const { data } = await apiClient.post(`/bookings/${id}/confirm/`);
    return data;
  },

  /**
   * Manual admin approval for a property with `instant_book` disabled — 400s if the
   * property is instant-book (there's nothing to manually approve). Sets
   * `manual_approval_granted` and, if payment already succeeded, transitions the
   * booking straight to `confirmed`.
   */
  async approve(id) {
    const { data } = await apiClient.post(`/bookings/${id}/approve/`);
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

  /** `GET /auth/admin/guests/` — no `kyc`/`country` filters exist server-side; only `search`/`is_active`/pagination. */
  listGuests: async ({ query, isActive, page = 1, pageSize } = {}) => {
    const params = { page };
    if (query?.trim()) params.search = query.trim();
    if (isActive !== undefined && isActive !== 'All') params.is_active = isActive === 'Active';
    if (pageSize) params.page_size = pageSize;

    const { data } = await apiClient.get('/auth/admin/guests/', { params });
    return toGuestPage(data, { page });
  },

  /** `PATCH /auth/admin/guests/<id>/` — only name fields and `is_active` are editable. */
  updateGuest: async (id, patch) => {
    const payload = {};
    if (patch.isActive !== undefined) payload.is_active = patch.isActive;
    if (patch.name !== undefined) {
      const [firstName, ...rest] = patch.name.trim().split(' ');
      payload.first_name = firstName;
      if (rest.length) payload.last_name = rest.join(' ');
    }
    const { data } = await apiClient.patch(`/auth/admin/guests/${id}/`, payload);
    return toGuest(data);
  },

  /** `GET /auth/admin/guests/<id>/` — enriched with `phone`, `kyc_status`, `stay_stats`. */
  guestDetail: async (id) => {
    const { data } = await apiClient.get(`/auth/admin/guests/${id}/`);
    return toGuestDetail(data);
  },

  /** `GET /auth/admin/guests/<id>/bookings/` — the guest's stay history, `?status=` filter. */
  guestBookingHistory: async (id, { status } = {}) => {
    const { data } = await apiClient.get(`/auth/admin/guests/${id}/bookings/`, {
      params: status ? { status } : undefined,
    });
    return (Array.isArray(data) ? data : (data?.results ?? [])).map(toGuestBooking);
  },

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
   * Also carries `guestAcknowledged`/`guestAcknowledgedAt` and the raw
   * `photos` list (not just grouped by room) — staff perform the check-in/
   * check-out itself (photos + Complete), the guest's only role is to
   * acknowledge it afterward on their own via a guest-facing endpoint this
   * admin portal doesn't call; this is a read-only status, not an action.
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
      guestAcknowledged: Boolean(obj?.guest_acknowledged),
      guestAcknowledgedAt: obj?.guest_acknowledged_at ?? null,
    });
    return { checkin: stage(data?.checkin), checkout: stage(data?.checkout) };
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

  /** `GET /inspections/<id>/damage/` — every damage item logged for this booking. */
  getDamageAssessments: async (bookingId) => {
    const { data } = await apiClient.get(`/inspections/${bookingId}/damage/`);
    return (Array.isArray(data) ? data : (data?.results ?? [])).map(toDamageAssessment);
  },

  /** `POST /inspections/<id>/damage/` — log a newly-found item. Starts `deduct_from_deposit: false` — that's the approval step, not creation. */
  createDamageAssessment: async (bookingId, values) => {
    const { data } = await apiClient.post(`/inspections/${bookingId}/damage/`, toDamageAssessmentPayload(values));
    return toDamageAssessment(data);
  },

  /** `PATCH /inspections/<id>/damage/<pk>/` — the admin approval step: confirm a cost, decide whether it counts against the deposit. */
  updateDamageAssessment: async (bookingId, damageId, values) => {
    const { data } = await apiClient.patch(`/inspections/${bookingId}/damage/${damageId}/`, toDamageAssessmentPatch(values));
    return toDamageAssessment(data);
  },

  /** `GET /inspections/<id>/report/` — 404 until a report has been generated for this booking. */
  getCheckoutReport: async (bookingId) => {
    try {
      const { data } = await apiClient.get(`/inspections/${bookingId}/report/`);
      return toCheckoutReport({ ...data, pdf_url: resolveMediaUrl(data?.pdf_url) });
    } catch (error) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  /**
   * `POST /inspections/<id>/report/` — real side effect: sums `approved_cost
   * ?? estimated_cost` across every `deduct_from_deposit` item, deducts that
   * from the booking's deposit, and auto-releases the remainder. Safe to call
   * again later (regenerates from current damage data) — there is no
   * dedicated update endpoint, this is both create and refresh.
   */
  generateCheckoutReport: async (bookingId) => {
    const { data } = await apiClient.post(`/inspections/${bookingId}/report/`);
    return toCheckoutReport({ ...data, pdf_url: resolveMediaUrl(data?.pdf_url) });
  },

  /** `GET /operations/rooms/today/` — derived from real bookings + tasks, scoped to the caller's assigned properties server-side. */
  todaysRooms: async () => {
    const { data } = await apiClient.get('/operations/rooms/today/');
    return {
      date: data?.date,
      rooms: (data?.rooms ?? []).map((room) => ({
        propertyId: room.property_id,
        propertyName: room.property_name,
        status: room.status,
        bookingId: room.booking_id,
        cleaningTaskId: room.cleaning_task_id,
      })),
    };
  },

  /** `GET /operations/tasks/` — housekeepers see only their own assigned tasks (server-side scoping). */
  listTasks: async (params = {}) => {
    const query = {};
    if (params.propertyId) query.property_id = params.propertyId;
    if (params.status) query.status = params.status;
    if (params.taskType) query.task_type = params.taskType;

    const { data } = await apiClient.get('/operations/tasks/', { params: query });
    return (data ?? []).map((task) => ({
      id: task.id,
      propertyId: task.property,
      bookingId: task.booking,
      assignedTo: task.assigned_to,
      taskType: task.task_type,
      status: task.status,
      dueDate: task.due_date,
      notes: task.notes,
      completedAt: task.completed_at,
    }));
  },

  /** `PATCH /operations/tasks/<id>/status/` — status is one of pending/in_progress/cleaned/blocked/ready. */
  updateTaskStatus: async (id, { status, notes }) => {
    const { data } = await apiClient.patch(`/operations/tasks/${id}/status/`, {
      status,
      ...(notes ? { notes } : {}),
    });
    return data;
  },

  /** `POST /operations/issues/report/` */
  reportIssue: async ({ propertyId, bookingId, title, description, severity }) => {
    const { data } = await apiClient.post('/operations/issues/report/', {
      property_id: propertyId,
      ...(bookingId ? { booking_id: bookingId } : {}),
      title,
      description,
      severity,
    });
    return data;
  },

  /**
   * `GET /operations/issues/report/` — same URL as the POST above;
   * `MaintenanceIssueReportView` handles both. Scoped server-side to the
   * caller's assigned properties.
   */
  listIssues: async (params = {}) => {
    const query = {};
    if (params.propertyId) query.property_id = params.propertyId;
    if (params.status) query.status = params.status;
    if (params.severity) query.severity = params.severity;

    const { data } = await apiClient.get('/operations/issues/report/', { params: query });
    return (Array.isArray(data) ? data : (data?.results ?? [])).map((issue) => ({
      id: issue.id,
      propertyId: issue.property,
      bookingId: issue.booking,
      reportedBy: issue.reported_by,
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      status: issue.status,
      createdAt: issue.created_at,
      resolvedAt: issue.resolved_at,
    }));
  },

  /** `PATCH /operations/issues/<id>/status/` — status is one of open/in_progress/resolved/wont_fix. */
  updateIssueStatus: async (id, { status }) => {
    const { data } = await apiClient.patch(`/operations/issues/${id}/status/`, { status });
    return data;
  },

  /** `GET /operations/properties/assigned/` — for the "report an issue" property picker. */
  listAssignedProperties: async () => {
    const { data } = await apiClient.get('/operations/properties/assigned/');
    return (data ?? []).map((property) => ({ id: property.id, name: property.name }));
  },

  /**
   * No `/calendar` endpoint exists server-side — built here from the same
   * `GET /bookings/admin/list/` `BookingsPage.jsx` already uses, widened by a
   * 30-day lookback so a stay that started before the requested month still
   * shows on the nights it occupies within it.
   */
  calendar: async (month) => {
    const monthStart = new Date(`${month}-01T00:00:00`);
    const lookback = new Date(monthStart);
    lookback.setDate(lookback.getDate() - 30);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    const { data } = await apiClient.get('/bookings/admin/list/', {
      params: {
        check_in_from: lookback.toISOString().slice(0, 10),
        check_in_to: monthEnd.toISOString().slice(0, 10),
        page_size: 200,
      },
    });

    const nightsByDate = {};
    (data?.results ?? [])
      .map(toBookingRow)
      .filter((row) => !['cancelled', 'refunded'].includes(row.status))
      .forEach((row) => {
        if (!row.checkIn || !row.checkOut) return;
        const start = new Date(row.checkIn);
        const end = new Date(row.checkOut);

        for (let date = new Date(start); date < end; date.setDate(date.getDate() + 1)) {
          const key = date.toISOString().slice(0, 10);
          if (!key.startsWith(month)) continue;
          nightsByDate[key] = nightsByDate[key] ?? [];
          nightsByDate[key].push({
            id: row.id,
            guest: row.guestName || row.guestEmail,
            property: row.propertyName,
            color: colorForId(row.id),
            status: row.statusLabel,
          });
        }
      });

    return nightsByDate;
  },

  /**
   * No dedicated cancellations endpoint exists server-side either — cancelled
   * bookings are just `GET /bookings/admin/list/?status=cancelled`, the same
   * list `getBookings` uses. The per-row cancellation reason isn't on this
   * list payload — `CancellationsPage.jsx` resolves it per row from
   * `getBookingTimeline`, the same endpoint the booking detail drawer uses.
   */
  listCancellations: async (params = {}) => {
    const query = toAdminListParams({ ...params, status: 'cancelled' });
    const { data } = await apiClient.get('/bookings/admin/list/', { params: query });
    return toBookingPage(data, { page: query.page });
  },
};

export const bookingService = {
  getBookings: (params) => realBookings.list(params),
  getBooking: (id) => realBookings.detail(id),
  getBookingTimeline: (id) => realBookings.timeline(id),
  getBookingReceipt: (id) => realBookings.receipt(id),
  confirmBooking: (id) => realBookings.confirm(id),
  approveBooking: (id) => realBookings.approve(id),
  cancelBooking: (id, reason) => realBookings.cancelBooking(id, reason),

  /**
   * There is no general booking PATCH on the real API — every state change
   * goes through its own endpoint. Nothing in the UI currently calls this
   * (kept only because `useBookingActions`'s `sendContract`/`remindKyc`
   * reference it); it correctly 405s if it ever is.
   */
  updateBooking: (id, patch) => realBookings.update(id, patch),

  getGuests: (params) => realBookings.listGuests(params),
  updateGuest: (id, patch) => realBookings.updateGuest(id, patch),
  getGuestDetail: (id) => realBookings.guestDetail(id),
  getGuestBookingHistory: (id, params) => realBookings.guestBookingHistory(id, params),

  getContracts: (params) => realBookings.listContracts(params),
  getContractForBooking: (bookingId) => realBookings.contractForBooking(bookingId),
  getContractStatus: (contractId) => realBookings.getContractStatus(contractId),
  sendContract: (payload) => realBookings.sendContract(payload),
  getContractTemplates: () => realBookings.listContractTemplates(),
  createContractTemplate: (values) => realBookings.createContractTemplate(values),
  updateContractTemplate: (id, patch) => realBookings.updateContractTemplate(id, patch),
  deleteContractTemplate: (id) => realBookings.deleteContractTemplate(id),

  uploadInspectionPhoto: (payload) => realBookings.uploadInspectionPhoto(payload),
  getInspectionState: (bookingId) => realBookings.getInspectionState(bookingId),
  getDamageAssessments: (bookingId) => realBookings.getDamageAssessments(bookingId),
  createDamageAssessment: (bookingId, values) => realBookings.createDamageAssessment(bookingId, values),
  updateDamageAssessment: (bookingId, damageId, values) => realBookings.updateDamageAssessment(bookingId, damageId, values),
  getCheckoutReport: (bookingId) => realBookings.getCheckoutReport(bookingId),
  generateCheckoutReport: (bookingId) => realBookings.generateCheckoutReport(bookingId),
  completeCheckIn: (payload) => realBookings.completeCheckIn(payload),
  completeCheckOut: (payload) => realBookings.completeCheckOut(payload),

  getTodaysRooms: () => realBookings.todaysRooms(),
  getTasks: (params) => realBookings.listTasks(params),
  updateTaskStatus: (id, patch) => realBookings.updateTaskStatus(id, patch),
  reportIssue: (payload) => realBookings.reportIssue(payload),
  getIssues: (params) => realBookings.listIssues(params),
  updateIssueStatus: (id, patch) => realBookings.updateIssueStatus(id, patch),
  getAssignedProperties: () => realBookings.listAssignedProperties(),

  getCalendar: (month) => realBookings.calendar(month),

  getCancellations: (params) => realBookings.listCancellations(params),
};
