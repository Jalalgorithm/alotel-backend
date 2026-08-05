import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { ApiError } from '@/utils/errors';
import { clone, createId, delay, paginate } from '@/lib/mock/utils';
import { jsonStorage } from '@/lib/storage';
import { auditLog, ROLES, staff } from '@/lib/mock/people';
import { getInitials } from '@/utils/format';

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
    const member = {
      id: createId('stf'),
      initials: getInitials(payload.name),
      color: role.color,
      status: 'Active',
      password: 'Admin123',
      joinedAt: new Date().toISOString(),
      lastActive: null,
      ...payload,
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

    rows[index] = { ...rows[index], ...patch };
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
  listStaff: async () => (await apiClient.get('/staff')).data,
  createStaff: async (payload) => (await apiClient.post('/staff', payload)).data,
  updateStaff: async (id, patch) => (await apiClient.patch(`/staff/${id}`, patch)).data,
  listRoles: async () => (await apiClient.get('/roles')).data,
  listAudit: async (params) => (await apiClient.get('/audit-log', { params })).data,
};

const backend = env.useMock ? mockPeople : realPeople;

export const peopleService = {
  getStaff: () => backend.listStaff(),
  createStaff: (payload) => backend.createStaff(payload),
  updateStaff: (id, patch) => backend.updateStaff(id, patch),
  getRoles: () => backend.listRoles(),
  getAuditLog: (params) => backend.listAudit(params),
};
