import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peopleService } from '../services/peopleService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

export const useStaff = () =>
  useQuery({
    queryKey: queryKeys.people.staff(),
    queryFn: peopleService.getStaff,
  });

export const useRoles = () =>
  useQuery({
    queryKey: queryKeys.people.roles(),
    queryFn: peopleService.getRoles,
    staleTime: Infinity, // role definitions are static
  });

export const useAuditLog = (params = {}) =>
  useQuery({
    queryKey: queryKeys.people.auditLog(params),
    queryFn: () => peopleService.getAuditLog(params),
    placeholderData: keepPreviousData,
  });

/**
 * Staff create / edit / activate.
 *
 * The audit log is invalidated alongside the staff list because both are
 * written by the same action — an admin should see their own change appear.
 */
export const useStaffMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.people.all });
  };

  const create = useMutation({
    mutationFn: peopleService.createStaff,
    onSuccess: (member) => {
      invalidate();
      toast.success('Staff member created', member.name);
    },
    onError: (error) => toast.error('Could not add staff member', getErrorMessage(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }) => peopleService.updateStaff(id, patch),
    onSuccess: (member, { message }) => {
      invalidate();
      toast.success(message ?? 'Staff member updated', member.name);
    },
    onError: (error) => toast.error('Could not update staff member', getErrorMessage(error)),
  });

  return {
    createStaff: create.mutate,
    // Lets the caller await the response to show the just-set password once —
    // the backend never returns it again after this call.
    createStaffAsync: create.mutateAsync,
    isCreating: create.isPending,
    updateStaff: (id, patch, message) => update.mutate({ id, patch, message }),
    isUpdating: update.isPending,
    pendingId: update.variables?.id,
  };
};
