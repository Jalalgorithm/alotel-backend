import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { delay } from '@/lib/mock/utils';

/**
 * `Notification` — `guest.urls`, mounted at `/notifications/`. The signed-in
 * admin's own inbox: `GET /notifications/<user_id>/` (list) and
 * `PUT /notifications/<id>/read/` (mark one read). Preferences live in
 * `system/services/systemService.js` alongside the rest of Settings — this
 * service is only the inbox the Topbar bell and the Notifications page read.
 */
const mockNotifications = {
  async list() {
    await delay(200);
    return [];
  },
  async markRead(id) {
    await delay(150);
    return { id, status: 'read', read_at: new Date().toISOString() };
  },
};

const realNotifications = {
  list: async (userId) => (await apiClient.get(`/notifications/${userId}/`)).data,
  markRead: async (id) => (await apiClient.put(`/notifications/${id}/read/`)).data,
};

const backend = env.useMockNotifications ? mockNotifications : realNotifications;

/** Normalise one `Notification` row. */
const toNotification = (raw) => ({
  id: raw.id,
  channel: raw.channel,
  triggerKey: raw.trigger_key || '',
  title: raw.title,
  body: raw.body,
  status: raw.status,
  isRead: raw.status === 'read',
  sentAt: raw.sent_at,
  readAt: raw.read_at,
  createdAt: raw.created_at,
});

export const notificationService = {
  getMyNotifications: async (userId) => (await backend.list(userId)).map(toNotification),
  markRead: async (id) => toNotification(await backend.markRead(id)),
};
