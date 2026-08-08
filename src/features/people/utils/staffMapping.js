import { ROLES, levelForApiRole } from '@/lib/mock/people';
import { getInitials } from '@/utils/format';

/** Inverse of `levelForApiRole` — only Level 2 / Level 3 are creatable via this API. */
const LEVEL_TO_API_ROLE = {
  L2: 'facility_manager',
  L3: 'housekeeper',
};

export const levelToApiRole = (levelId) => LEVEL_TO_API_ROLE[levelId] ?? null;

/**
 * Map a `/admin/staff/` employee record onto the shape `StaffPage` renders.
 * @param {object} employee
 */
export const toUiStaff = (employee) => {
  const level = levelForApiRole(employee.role) ?? 'L2';
  const role = ROLES.find((entry) => entry.id === level);
  const name = [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim() || employee.email;

  return {
    id: employee.id,
    name,
    firstName: employee.first_name ?? '',
    lastName: employee.last_name ?? '',
    otherName: employee.other_name ?? '',
    initials: getInitials(name),
    color: role?.color ?? '#2a78d6',
    role: level,
    email: employee.email,
    status: employee.is_active ? 'Active' : 'Inactive',
    assignedProperties: employee.profile?.assigned_properties ?? [],
  };
};

/**
 * Build the request body for create/update.
 *
 * Create sends the full record. Edit is a PATCH and may be called with either
 * a full form submission or a narrow patch (e.g. `{ status }` from the
 * activate/deactivate button), so it only forwards keys that were actually
 * supplied — anything else would blow away fields (like assigned properties)
 * the caller never meant to touch.
 *
 * @param {object} values form values
 * @param {'create'|'edit'} mode
 */
export const toApiPayload = (values, mode) => {
  if (mode === 'create') {
    return {
      email: values.email,
      password: values.password,
      role: levelToApiRole(values.role),
      first_name: values.firstName,
      last_name: values.lastName,
      other_name: values.otherName ?? '',
      profile: { assigned_properties: values.assignedProperties ?? [] },
    };
  }

  const payload = {};
  if (values.firstName !== undefined) payload.first_name = values.firstName;
  if (values.lastName !== undefined) payload.last_name = values.lastName;
  if (values.otherName !== undefined) payload.other_name = values.otherName;
  if (values.assignedProperties !== undefined) {
    payload.profile = { assigned_properties: values.assignedProperties };
  }
  if (values.status !== undefined) payload.is_active = values.status === 'Active';
  return payload;
};
