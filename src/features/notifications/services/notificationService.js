import { apiClient } from '@/lib/apiClient';

/**
 * `Notification` — `guest.urls`, mounted at `/notifications/`. The signed-in
 * admin's own inbox: `GET /notifications/<user_id>/` (list) and
 * `PUT /notifications/<id>/read/` (mark one read). Preferences live in
 * `system/services/systemService.js` alongside the rest of Settings — this
 * service is only the inbox the Topbar bell and the Notifications page read.
 */
const realNotifications = {
  list: async (userId) => (await apiClient.get(`/notifications/${userId}/`)).data,
  markRead: async (id) => (await apiClient.put(`/notifications/${id}/read/`)).data,
  /** Self-scoped — no `user_id` path param, unlike `list`. */
  unreadCount: async () => (await apiClient.get('/notifications/unread-count/')).data,
  markAllRead: async () => (await apiClient.post('/notifications/read-all/')).data,
};

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
  getMyNotifications: async (userId) => (await realNotifications.list(userId)).map(toNotification),
  markRead: async (id) => toNotification(await realNotifications.markRead(id)),
  getUnreadCount: async () => (await realNotifications.unreadCount()).unread_count ?? 0,
  markAllRead: async () => (await realNotifications.markAllRead()).marked_read ?? 0,
};
