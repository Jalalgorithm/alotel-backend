import { apiClient } from '@/lib/apiClient';
import {
  toAssignment,
  toTicket,
  toTicketCost,
  toTicketCostPayload,
  toTicketPayload,
  toTicketPhoto,
  toWorker,
  toWorkerPayload,
} from '@/lib/maintenanceSchema';

/**
 * Maintenance Oversight — worker/vendor directory + ticketing, `IsLevel1Or2`
 * (super_admin + facility_manager, the latter scoped server-side to their
 * `assigned_properties`). This is a real, working backend (confirmed by
 * reading `operations/{models,serializers,views}.py` directly) — `realMaintenance`
 * is the primary path. List-endpoint filter params and pagination envelope
 * weren't confirmed from static reading, so responses are unwrapped
 * defensively (`data?.results ?? data ?? []`), the same way `realTaxes.list()`
 * already handles that uncertainty in `financeService.js`.
 */

/** Normalise a DRF-shaped (or bare-array) list response the same defensive way regardless of which it turns out to be. */
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

const realMaintenance = {
  async listWorkers(params = {}) {
    const query = { page: params.page ?? 1 };
    if (params.query) query.search = params.query;
    if (params.employmentType) query.employment_type = params.employmentType;
    if (params.status) query.status = params.status;

    const { data } = await apiClient.get('/operations/maintenance/workers/', { params: query });
    return toListResult(data, params, toWorker);
  },

  async getWorker(id) {
    const { data } = await apiClient.get(`/operations/maintenance/workers/${id}/`);
    return toWorker(data);
  },

  async createWorker(values) {
    const { data } = await apiClient.post('/operations/maintenance/workers/', toWorkerPayload(values));
    return toWorker(data);
  },

  async updateWorker(id, values) {
    const { data } = await apiClient.patch(`/operations/maintenance/workers/${id}/`, toWorkerPayload(values));
    return toWorker(data);
  },

  async assignWorkerToProperty(workerId, propertyId) {
    const { data } = await apiClient.post(`/operations/maintenance/workers/${workerId}/assignments/`, { property: propertyId });
    return toAssignment(data);
  },

  async unassignWorkerFromProperty(workerId, assignmentId) {
    await apiClient.delete(`/operations/maintenance/workers/${workerId}/assignments/${assignmentId}/`);
    return { success: true };
  },

  async listTickets(params = {}) {
    const query = { page: params.page ?? 1 };
    if (params.query) query.search = params.query;
    if (params.status) query.status = params.status;
    if (params.priority) query.priority = params.priority;
    if (params.category) query.category = params.category;
    if (params.propertyId) query.property = params.propertyId;
    if (params.spaceId) query.space_id = params.spaceId;
    if (params.assignedWorkerId) query.assigned_worker = params.assignedWorkerId;

    const { data } = await apiClient.get('/operations/maintenance/tickets/', { params: query });
    return toListResult(data, params, toTicket);
  },

  async getTicket(id) {
    const { data } = await apiClient.get(`/operations/maintenance/tickets/${id}/`);
    return toTicket(data);
  },

  async createTicket(values) {
    const { data } = await apiClient.post('/operations/maintenance/tickets/', toTicketPayload(values));
    return toTicket(data);
  },

  async updateTicket(id, values) {
    const { data } = await apiClient.patch(`/operations/maintenance/tickets/${id}/`, values);
    return toTicket(data);
  },

  /** Plain JSON, unless a receipt scan is attached — then `FormData`, same switch `uploadTicketPhoto` already makes. */
  async logTicketCost(ticketId, values) {
    const payload = toTicketCostPayload(values);
    let body = payload;

    if (values.receiptFile) {
      const form = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined) form.append(key, value);
      });
      form.append('receipt_file', values.receiptFile);
      body = form;
    }

    const { data } = await apiClient.post(`/operations/maintenance/tickets/${ticketId}/costs/`, body);
    return toTicketCost(data);
  },

  async uploadTicketPhoto(ticketId, { file, caption = '' }) {
    const form = new FormData();
    form.append('file', file);
    form.append('caption', caption);

    const { data } = await apiClient.post(`/operations/maintenance/tickets/${ticketId}/photos/`, form);
    return toTicketPhoto(data);
  },

  async getDashboard(params = {}) {
    const query = {};
    if (params.propertyId) query.property = params.propertyId;
    const { data } = await apiClient.get('/operations/maintenance/dashboard/', { params: query });
    return {
      openCount: data?.open_count ?? 0,
      avgResolutionHours: data?.avg_resolution_hours ?? null,
      totalSpend: Number(data?.total_spend ?? 0),
    };
  },
};

export const maintenanceService = {
  getWorkers: (params) => realMaintenance.listWorkers(params),
  getWorker: (id) => realMaintenance.getWorker(id),
  createWorker: (values) => realMaintenance.createWorker(values),
  updateWorker: (id, values) => realMaintenance.updateWorker(id, values),
  assignWorkerToProperty: (workerId, propertyId) => realMaintenance.assignWorkerToProperty(workerId, propertyId),
  unassignWorkerFromProperty: (workerId, assignmentId) => realMaintenance.unassignWorkerFromProperty(workerId, assignmentId),

  getTickets: (params) => realMaintenance.listTickets(params),
  getTicket: (id) => realMaintenance.getTicket(id),
  createTicket: (values) => realMaintenance.createTicket(values),
  updateTicket: (id, values) => realMaintenance.updateTicket(id, values),
  logTicketCost: (ticketId, values) => realMaintenance.logTicketCost(ticketId, values),
  uploadTicketPhoto: (ticketId, payload) => realMaintenance.uploadTicketPhoto(ticketId, payload),

  getDashboard: (params) => realMaintenance.getDashboard(params),
};
