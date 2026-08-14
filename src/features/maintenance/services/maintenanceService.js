import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { clone, createId, delay, paginate } from '@/lib/mock/utils';
import { jsonStorage } from '@/lib/storage';
import { maintenanceWorkers as workersFixture, maintenanceTickets as ticketsFixture } from '@/lib/mock/maintenance';
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

  async logTicketCost(ticketId, values) {
    const { data } = await apiClient.post(`/operations/maintenance/tickets/${ticketId}/costs/`, toTicketCostPayload(values));
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

/* -------------------------------------------------------------------------- */
/* Offline-dev-only mock — gated by `useMockMaintenance`, off by default       */
/* -------------------------------------------------------------------------- */

const KEYS = { workers: 'alotel.admin.mock.maintenanceWorkers', tickets: 'alotel.admin.mock.maintenanceTickets' };

const seeded = (key, source) => {
  const rows = jsonStorage.read(key, null);
  if (rows) return rows;
  const value = clone(source);
  jsonStorage.write(key, value);
  return value;
};
const readWorkers = () => seeded(KEYS.workers, workersFixture);
const readTickets = () => seeded(KEYS.tickets, ticketsFixture);

const mockMaintenance = {
  async listWorkers(params = {}) {
    await delay(250);
    const result = paginate(readWorkers(), params, { searchFields: ['name', 'company_name'], filterFields: ['employment_type', 'status'] });
    return { ...result, items: result.items.map(toWorker) };
  },
  async getWorker(id) {
    await delay(200);
    return toWorker(readWorkers().find((row) => row.id === id));
  },
  async createWorker(values) {
    await delay(350);
    const record = { id: createId('wrk'), assigned_property_count: 0, ...toWorkerPayload(values) };
    jsonStorage.write(KEYS.workers, [...readWorkers(), record]);
    return toWorker(record);
  },
  async updateWorker(id, values) {
    await delay(300);
    const rows = readWorkers();
    const index = rows.findIndex((row) => row.id === id);
    rows[index] = { ...rows[index], ...toWorkerPayload(values) };
    jsonStorage.write(KEYS.workers, rows);
    return toWorker(rows[index]);
  },
  async assignWorkerToProperty(workerId) {
    await delay(250);
    return toAssignment({ id: createId('asg'), worker: workerId, property: null, assigned_at: new Date().toISOString() });
  },
  async unassignWorkerFromProperty() {
    await delay(250);
    return { success: true };
  },
  async listTickets(params = {}) {
    await delay(250);
    const result = paginate(readTickets(), params, { searchFields: ['category', 'description'], filterFields: ['status', 'priority'] });
    return { ...result, items: result.items.map(toTicket) };
  },
  async getTicket(id) {
    await delay(200);
    return toTicket(readTickets().find((row) => row.id === id));
  },
  async createTicket(values) {
    await delay(350);
    const record = { id: createId('tkt'), status: 'open', created_at: new Date().toISOString(), costs: [], photos: [], total_cost: '0', ...toTicketPayload(values) };
    jsonStorage.write(KEYS.tickets, [...readTickets(), record]);
    return toTicket(record);
  },
  async updateTicket(id, values) {
    await delay(300);
    const rows = readTickets();
    const index = rows.findIndex((row) => row.id === id);
    rows[index] = { ...rows[index], ...values };
    jsonStorage.write(KEYS.tickets, rows);
    return toTicket(rows[index]);
  },
  async logTicketCost(ticketId, values) {
    await delay(300);
    const rows = readTickets();
    const index = rows.findIndex((row) => row.id === ticketId);
    const cost = { id: createId('cst'), created_at: new Date().toISOString(), ...toTicketCostPayload(values) };
    rows[index] = { ...rows[index], costs: [...(rows[index].costs ?? []), cost] };
    jsonStorage.write(KEYS.tickets, rows);
    return toTicketCost(cost);
  },
  async uploadTicketPhoto(ticketId, { caption = '' }) {
    await delay(400);
    const rows = readTickets();
    const index = rows.findIndex((row) => row.id === ticketId);
    const photo = { id: createId('pho'), file: '', caption, taken_at_server: new Date().toISOString() };
    rows[index] = { ...rows[index], photos: [...(rows[index].photos ?? []), photo] };
    jsonStorage.write(KEYS.tickets, rows);
    return toTicketPhoto(photo);
  },
  async getDashboard() {
    await delay(250);
    const tickets = readTickets();
    const open = tickets.filter((t) => !['resolved', 'closed'].includes(t.status));
    return { openCount: open.length, avgResolutionHours: 18, totalSpend: 0 };
  },
};

const backend = env.useMockMaintenance ? mockMaintenance : realMaintenance;

export const maintenanceService = {
  getWorkers: (params) => backend.listWorkers(params),
  getWorker: (id) => backend.getWorker(id),
  createWorker: (values) => backend.createWorker(values),
  updateWorker: (id, values) => backend.updateWorker(id, values),
  assignWorkerToProperty: (workerId, propertyId) => backend.assignWorkerToProperty(workerId, propertyId),
  unassignWorkerFromProperty: (workerId, assignmentId) => backend.unassignWorkerFromProperty(workerId, assignmentId),

  getTickets: (params) => backend.listTickets(params),
  getTicket: (id) => backend.getTicket(id),
  createTicket: (values) => backend.createTicket(values),
  updateTicket: (id, values) => backend.updateTicket(id, values),
  logTicketCost: (ticketId, values) => backend.logTicketCost(ticketId, values),
  uploadTicketPhoto: (ticketId, payload) => backend.uploadTicketPhoto(ticketId, payload),

  getDashboard: (params) => backend.getDashboard(params),
};
