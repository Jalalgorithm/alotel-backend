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

const realVerifications = {
  list: async () => (await apiClient.get('/verifications')).data,
  decide: async (id, decision) => (await apiClient.patch(`/verifications/${id}`, { decision })).data,
};

const backend = env.useMock ? mockVerifications : realVerifications;

export const verificationService = {
  list: () => backend.list(),
  decide: (id, decision) => backend.decide(id, decision),
};
