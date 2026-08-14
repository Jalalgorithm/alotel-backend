import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maintenanceService } from '../services/maintenanceService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

export const useMaintenanceTickets = (params = {}) =>
  useQuery({
    queryKey: queryKeys.maintenanceOps.tickets(params),
    queryFn: () => maintenanceService.getTickets(params),
    placeholderData: keepPreviousData,
  });

export const useMaintenanceTicket = (id) =>
  useQuery({
    queryKey: queryKeys.maintenanceOps.ticketDetail(id),
    queryFn: () => maintenanceService.getTicket(id),
    enabled: Boolean(id),
  });

export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: maintenanceService.createTicket,
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceOps.all });
      toast.success('Ticket created', ticket.category);
    },
    onError: (error) => toast.error('Could not create ticket', getErrorMessage(error)),
  });

  return { createTicket: mutation.mutate, createTicketAsync: mutation.mutateAsync, isPending: mutation.isPending };
};

/** Status transitions and reassignment — both are the same `PATCH` on the backend. */
export const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, values }) => maintenanceService.updateTicket(id, values),
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceOps.all });
      queryClient.setQueryData(queryKeys.maintenanceOps.ticketDetail(ticket.id), ticket);
      toast.success('Ticket updated');
    },
    onError: (error) => toast.error('Could not update ticket', getErrorMessage(error)),
  });

  return { updateTicket: (id, values, options) => mutation.mutate({ id, values }, options), isPending: mutation.isPending };
};

export const useLogTicketCost = (ticketId) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values) => maintenanceService.logTicketCost(ticketId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceOps.ticketDetail(ticketId) });
      toast.success('Cost logged');
    },
    onError: (error) => toast.error('Could not log cost', getErrorMessage(error)),
  });

  return { logCost: mutation.mutate, isPending: mutation.isPending };
};

export const useUploadTicketPhoto = (ticketId) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload) => maintenanceService.uploadTicketPhoto(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceOps.ticketDetail(ticketId) });
      toast.success('Photo uploaded');
    },
    onError: (error) => toast.error('Could not upload photo', getErrorMessage(error)),
  });

  return { uploadPhoto: mutation.mutate, isPending: mutation.isPending };
};
