import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { ApiError } from '@/utils/errors';
import { clone, createId, delay, paginate } from '@/lib/mock/utils';
import { jsonStorage } from '@/lib/storage';
import { auditLog, ROLES, staff } from '@/lib/mock/people';
import { getInitials } from '@/utils/format';
import { toApiPayload, toUiStaff } from '../utils/staffMapping';

/**
 * Staff administration, role reference and the audit trail.
 *
 * Staff share the same localStorage table the auth service reads, so
 * deactivating an account here really does block that person's next sign-in.
 */
const STAFF_KEY = 'alotel.admin.mock.staff';
const AUDIT_KEY = 'alotel.admin.mock.audit';

const readStaff = () => {
  const rows = jsonStorage.read(STAFF_KEY, null);
  if (rows) return rows;
  const value = clone(staff);
  jsonStorage.write(STAFF_KEY, value);
  return value;
};

const readAudit = () => {
  const rows = jsonStorage.read(AUDIT_KEY, null);
  if (rows) return rows;
  const value = clone(auditLog);
  jsonStorage.write(AUDIT_KEY, value);
  return value;
};

/** Never let the password escape the service layer. */
const toPublic = ({ password, ...member }) => member;

/** Record an action so the audit log reflects what actually happened. */
const appendAudit = (entry) => {
  jsonStorage.write(AUDIT_KEY, [
    { id: createId('log'), at: new Date().toISOString(), ip: '102.89.45.12', ...entry },
    ...readAudit(),
  ]);
};

const mockPeople = {
  async listStaff() {
    await delay(280);
    return clone(readStaff().map(toPublic));
  },

  async createStaff(payload) {
    await delay(600);

    const rows = readStaff();
    if (rows.some((member) => member.email.toLowerCase() === payload.email.toLowerCase())) {
      throw new ApiError('A staff member with that email already exists.', 409);
    }

    const role = ROLES.find((entry) => entry.id === payload.role) ?? ROLES[1];
    const name = [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim();
    const member = {
      id: createId('stf'),
      firstName: payload.firstName,
      lastName: payload.lastName,
      otherName: payload.otherName ?? '',
      name,
      initials: getInitials(name),
      color: role.color,
      role: payload.role,
      email: payload.email,
      password: payload.password,
      assignedProperties: payload.assignedProperties ?? [],
      status: 'Active',
      joinedAt: new Date().toISOString(),
      lastActive: null,
    };

    jsonStorage.write(STAFF_KEY, [...rows, member]);
    appendAudit({ actor: 'Michael Davies', role: 'L1', action: 'Staff created', target: `${member.name} · ${role.level}` });

    return toPublic(clone(member));
  },

  async updateStaff(id, patch) {
    await delay(450);

    const rows = readStaff();
    const index = rows.findIndex((member) => member.id === id);
    if (index < 0) throw new ApiError('Staff member not found.', 404);

    const updated = { ...rows[index], ...patch };
    if (patch.firstName !== undefined || patch.lastName !== undefined) {
      updated.name = [updated.firstName, updated.lastName].filter(Boolean).join(' ').trim();
      updated.initials = getInitials(updated.name);
    }
    rows[index] = updated;
    jsonStorage.write(STAFF_KEY, rows);

    if (patch.status) {
      appendAudit({
        actor: 'Michael Davies',
        role: 'L1',
        action: patch.status === 'Active' ? 'Staff reactivated' : 'Staff deactivated',
        target: rows[index].name,
      });
    }

    return toPublic(clone(rows[index]));
  },

  async listRoles() {
    await delay(180);
    return clone(ROLES);
  },

  async listAudit(params) {
    await delay(300);
    return paginate(readAudit(), params, {
      searchFields: ['actor', 'action', 'target', 'ip'],
      filterFields: ['role'],
    });
  },
};

const realPeople = {
  listStaff: async () => {
    const { data } = await apiClient.get('/admin/staff/', { params: { page_size: 100 } });
    return (data.results ?? []).map(toUiStaff);
  },
  createStaff: async (payload) => {
    const { data } = await apiClient.post('/admin/staff/', toApiPayload(payload, 'create'));
    return toUiStaff(data);
  },
  updateStaff: async (id, patch) => {
    const { data } = await apiClient.patch(`/admin/staff/${id}/`, toApiPayload(patch, 'edit'));
    return toUiStaff(data);
  },
};

const staffBackend = env.useMockPeople ? mockPeople : realPeople;

export const peopleService = {
  getStaff: () => staffBackend.listStaff(),
  createStaff: (payload) => staffBackend.createStaff(payload),
  updateStaff: (id, patch) => staffBackend.updateStaff(id, patch),
  // Roles are this app's own capability matrix, not backend data — never fetched over the network.
  getRoles: () => mockPeople.listRoles(),
  // Audit log has no wired endpoint yet — stays on mock data regardless of useMockPeople.
  getAuditLog: (params) => mockPeople.listAudit(params),
};
