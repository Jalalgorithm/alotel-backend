import { apiClient } from '@/lib/apiClient';

/**
 * Identity / ownership verification queue.
 */

/** `KYCFullCheck` (pending list row) → the shape the dashboard panel renders. */
const toVerification = (raw) => ({
  id: raw.kyc_check_id,
  bookingId: raw.booking_id,
  guestId: raw.guest_id,
  guest: raw.guest_name,
  provider: raw.provider,
  status: raw.status,
  createdAt: raw.created_at,
});

export const verificationService = {
  /** `GET /kyc/full/pending/` */
  list: async () => {
    const { data } = await apiClient.get('/kyc/full/pending/');
    return (data?.results ?? []).map(toVerification);
  },

  /** `POST /kyc/full/approve/` */
  decide: async (id, decision, reviewNotes) => {
    const { data } = await apiClient.post('/kyc/full/approve/', {
      kyc_check_id: id,
      decision: decision === 'Approved' ? 'approved' : 'rejected',
      ...(reviewNotes ? { review_notes: reviewNotes } : {}),
    });
    return data;
  },
};
