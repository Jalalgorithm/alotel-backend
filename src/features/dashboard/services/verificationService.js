import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { clone, delay } from '@/lib/mock/utils';
import { jsonStorage } from '@/lib/storage';
import { verifications } from '@/lib/mock/operations';
import { ApiError } from '@/utils/errors';

/**
 * Identity / ownership verification queue.
 *
 * Decisions persist to localStorage so an approval survives a reload — without
 * that the dashboard would keep re-offering an item the admin already actioned.
 */
const QUEUE_KEY = 'alotel.admin.mock.verifications';

const readQueue = () => {
  const rows = jsonStorage.read(QUEUE_KEY, null);
  if (rows) return rows;

  const seeded = clone(verifications);
  jsonStorage.write(QUEUE_KEY, seeded);
  return seeded;
};

const mockVerifications = {
  async list() {
    await delay(250);
    return clone(readQueue());
  },

  async decide(id, decision) {
    await delay(500);

    const rows = readQueue();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Verification not found.', 404);

    rows[index] = { ...rows[index], status: decision, decidedAt: new Date().toISOString() };
    jsonStorage.write(QUEUE_KEY, rows);

    return clone(rows[index]);
  },
};

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

/**
 * `GET /kyc/full/pending/` (list) and `POST /kyc/full/approve/` (decide) —
 * the real identity/ownership verification queue. Previously pointed at a
 * `/verifications` path that doesn't exist on this backend.
 */
const realVerifications = {
  list: async () => {
    const { data } = await apiClient.get('/kyc/full/pending/');
    return (data?.results ?? []).map(toVerification);
  },
  decide: async (id, decision, reviewNotes) => {
    const { data } = await apiClient.post('/kyc/full/approve/', {
      kyc_check_id: id,
      decision: decision === 'Approved' ? 'approved' : 'rejected',
      ...(reviewNotes ? { review_notes: reviewNotes } : {}),
    });
    return data;
  },
};

const backend = env.useMockVerifications ? mockVerifications : realVerifications;

export const verificationService = {
  list: () => backend.list(),
  decide: (id, decision, reviewNotes) => backend.decide(id, decision, reviewNotes),
};
