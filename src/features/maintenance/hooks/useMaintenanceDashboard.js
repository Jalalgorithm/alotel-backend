import { useQuery } from '@tanstack/react-query';
import { maintenanceService } from '../services/maintenanceService';
import { queryKeys } from '@/lib/queryKeys';

export const useMaintenanceDashboard = (params = {}) =>
  useQuery({
    queryKey: queryKeys.maintenanceOps.dashboard(params),
    queryFn: () => maintenanceService.getDashboard(params),
  });
