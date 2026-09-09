import { useQuery } from '@tanstack/react-query';
import { maintenanceService } from '../services/maintenanceService';
import { queryKeys } from '@/lib/queryKeys';

export const useMaintenanceDashboard = (params = {}) =>
  useQuery({
    queryKey: queryKeys.maintenanceOps.dashboard(params),
    queryFn: () => maintenanceService.getDashboard(params),
  });

/**
 * Per-property breakdown row for the dashboard table — `GET
 * /operations/maintenance/dashboard/by-property/`. That endpoint doesn't
 * exist on the backend yet (suggested addition, not yet built), so this
 * query is expected to 404/error until it ships; `MaintenanceDashboardPage`
 * renders that as a pending-backend-work notice rather than a hard failure.
 */
export const useMaintenanceDashboardBreakdown = () =>
  useQuery({
    queryKey: queryKeys.maintenanceOps.dashboardByProperty(),
    queryFn: () => maintenanceService.getDashboardByProperty(),
    retry: false,
  });
