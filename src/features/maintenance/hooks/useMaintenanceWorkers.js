import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maintenanceService } from '../services/maintenanceService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

export const useMaintenanceWorkers = (params = {}) =>
  useQuery({
    queryKey: queryKeys.maintenanceOps.workers(params),
    queryFn: () => maintenanceService.getWorkers(params),
    placeholderData: keepPreviousData,
  });

export const useMaintenanceWorker = (id) =>
  useQuery({
    queryKey: queryKeys.maintenanceOps.workerDetail(id),
    queryFn: () => maintenanceService.getWorker(id),
    enabled: Boolean(id),
  });

export const useCreateWorker = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: maintenanceService.createWorker,
    onSuccess: (worker) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceOps.all });
      toast.success('Worker added', worker.name);
    },
    onError: (error) => toast.error('Could not add worker', getErrorMessage(error)),
  });

  return { createWorker: mutation.mutate, isPending: mutation.isPending };
};

export const useUpdateWorker = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, values }) => maintenanceService.updateWorker(id, values),
    onSuccess: (worker) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceOps.all });
      queryClient.setQueryData(queryKeys.maintenanceOps.workerDetail(worker.id), worker);
      toast.success('Worker updated', worker.name);
    },
    onError: (error) => toast.error('Could not update worker', getErrorMessage(error)),
  });

  return { updateWorker: (id, values, options) => mutation.mutate({ id, values }, options), isPending: mutation.isPending };
};

/** Assign / unassign a worker to a property — used from the worker detail page. */
export const useWorkerAssignments = (workerId) => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceOps.workerDetail(workerId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceOps.workers() });
  };

  const assign = useMutation({
    mutationFn: (propertyId) => maintenanceService.assignWorkerToProperty(workerId, propertyId),
    onSuccess: () => {
      invalidate();
      toast.success('Property assigned');
    },
    onError: (error) => toast.error('Could not assign property', getErrorMessage(error)),
  });

  const unassign = useMutation({
    mutationFn: (assignmentId) => maintenanceService.unassignWorkerFromProperty(workerId, assignmentId),
    onSuccess: () => {
      invalidate();
      toast.info('Property unassigned');
    },
    onError: (error) => toast.error('Could not unassign property', getErrorMessage(error)),
  });

  return {
    assignProperty: assign.mutate,
    isAssigning: assign.isPending,
    unassignProperty: unassign.mutate,
    isUnassigning: unassign.isPending,
  };
};
