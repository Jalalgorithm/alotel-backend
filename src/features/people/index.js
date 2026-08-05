/** Public API of the people feature. */
export { StaffPage } from './components/StaffPage';
export { RolesPage } from './components/RolesPage';
export { AuditLogPage } from './components/AuditLogPage';

export { useStaff, useRoles, useAuditLog, useStaffMutations } from './hooks/usePeople';
export { peopleService } from './services/peopleService';
