import { useQuery } from '@tanstack/react-query';
import { maintenanceService } from '../services/maintenanceService';
import { queryKeys } from '@/lib/queryKeys';

export const useMaintenanceDashboard = (params = {}) =>
  useQuery({
    queryKey: queryKeys.maintenanceOps.dashboard(params),
    queryFn: () => maintenanceService.getDashboard(params),
  });

/** Per-property breakdown rows for the dashboard table — `GET /operations/maintenance/dashboard/by-property/`. */
export const useMaintenanceDashboardBreakdown = () =>
  useQuery({
    queryKey: queryKeys.maintenanceOps.dashboardByProperty(),
    queryFn: () => maintenanceService.getDashboardByProperty(),
  });
