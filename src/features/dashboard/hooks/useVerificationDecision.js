import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { verificationService } from '../services/verificationService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

/**
 * Approve / reject a pending verification straight from the dashboard.
 *
 * `pendingId` is `"<id>:<decision>"` so the panel can put the spinner on the
 * exact button that was pressed rather than on both.
 */
export const useVerificationDecision = () => {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState(null);

  const mutation = useMutation({
    mutationFn: ({ id, decision }) => verificationService.decide(id, decision),
    onSuccess: (_result, { decision, guest }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.verifications() });
      toast.success(
        decision === 'Approved' ? 'Verification approved' : 'Verification rejected',
        `${guest}'s document has been ${decision.toLowerCase()}.`,
      );
    },
    onError: (error) => toast.error('Could not update verification', getErrorMessage(error)),
    onSettled: () => setPendingId(null),
  });

  /**
   * @param {{ id: string, guest: string }} verification
   * @param {'Approved'|'Rejected'} decision
   */
  const decide = (verification, decision) => {
    setPendingId(`${verification.id}:${decision}`);
    mutation.mutate({ id: verification.id, decision, guest: verification.guest });
  };

  return { decide, pendingId, isPending: mutation.isPending };
};
