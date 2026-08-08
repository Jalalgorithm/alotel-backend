import { apiClient } from '@/lib/apiClient';
import { clone } from '@/lib/mock/utils';
import { ROLES } from '@/lib/mock/people';
import { toApiPayload, toUiStaff } from '../utils/staffMapping';
import { toAuditLogPage, toAuditLogParams } from '../utils/auditLogMapping';

/** Staff administration, role reference and the audit trail — all real API calls. */
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
  listAudit: async (params) => {
    const { data } = await apiClient.get('/admin/audit-log/', { params: toAuditLogParams(params) });
    return toAuditLogPage(data);
  },
};

export const peopleService = {
  getStaff: () => realPeople.listStaff(),
  createStaff: (payload) => realPeople.createStaff(payload),
  updateStaff: (id, patch) => realPeople.updateStaff(id, patch),
  // This app's own capability matrix, not backend data — never fetched over the network.
  getRoles: () => Promise.resolve(clone(ROLES)),
  getAuditLog: (params) => realPeople.listAudit(params),
};
