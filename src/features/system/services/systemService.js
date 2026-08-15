import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { clone, delay } from '@/lib/mock/utils';
import { jsonStorage } from '@/lib/storage';
import { defaultSettings, helpArticles, integrations } from '@/lib/mock/system';
import { announcements as announcementsFixture } from '@/lib/mock/operations';

const SETTINGS_KEY = 'alotel.admin.mock.settings';

const readSettings = () => {
  const stored = jsonStorage.read(SETTINGS_KEY, null);
  if (stored) return stored;
  const value = clone(defaultSettings);
  jsonStorage.write(SETTINGS_KEY, value);
  return value;
};

/** `System announcement` (mock fixture) → the same shape `toAnnouncement` produces for the real one. */
const toMockAnnouncement = (raw) => ({
  id: raw.id,
  title: raw.title,
  body: raw.body,
  createdBy: null,
  isActive: true,
  createdAt: raw.date,
  updatedAt: raw.date,
});

const mockSystem = {
  async getSettings() {
    await delay(220);
    return { settings: clone(readSettings()), integrations: clone(integrations) };
  },

  async saveSettings(patch) {
    await delay(450);
    const next = { ...readSettings(), ...patch };
    jsonStorage.write(SETTINGS_KEY, next);
    return clone(next);
  },

  async getHelp() {
    await delay(180);
    return clone(helpArticles);
  },

  async getAnnouncements() {
    await delay(200);
    return clone(announcementsFixture).map(toMockAnnouncement);
  },

  async createAnnouncement(payload) {
    await delay(300);
    return { id: `ann_${Date.now()}`, createdBy: null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...payload };
  },
};

/** `Announcement` (`admin/announcements/`) → camelCase. */
const toAnnouncement = (raw) => ({
  id: raw.id,
  title: raw.title,
  body: raw.body,
  createdBy: raw.created_by,
  isActive: raw.is_active,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

/**
 * UI toggle key → `SystemConfig.key`. `AdminSystemConfigView` is a generic
 * string key-value store with no fixed schema, so these key names are ours
 * to choose — not dictated by the backend.
 */
const CONFIG_KEYS = {
  twoFactor: 'admin_two_factor_enabled',
  sessionHours: 'admin_session_timeout_hours',
  gdprMode: 'admin_data_protection_mode',
  autoReleaseDeposit: 'deposit_auto_release_enabled',
  stripePreAuth: 'stripe_preauth_enabled',
  contractReminderHours: 'contract_reminder_hours',
  kycReminderHours: 'kyc_reminder_hours',
  autoCancelOnKycFailure: 'kyc_auto_cancel_on_failure',
};

/** UI toggle key → `NotificationPreference` field — these three are dictated by the real serializer. */
const NOTIFICATION_PREF_KEYS = { notifyEmail: 'email_enabled', notifySms: 'sms_enabled', notifyInApp: 'in_app_enabled' };

const parseConfigValue = (raw, fallback) => {
  if (typeof fallback === 'boolean') return raw === 'true' || raw === true;
  return raw ?? fallback;
};

/**
 * Real backend. `GET/PUT /admin/system/config/` (Super Admin only) persists
 * the security/automation toggles; the three notification toggles are
 * genuinely per-admin, so they go to `GET/PUT /notifications/preferences/<user_id>/`
 * instead. Both are confirmed, working endpoints — there is no `/settings`
 * endpoint on this backend (the previous version of this file pointed at one).
 */
const realSystem = {
  async getSettings(userId) {
    const [{ data: configData }, prefs] = await Promise.all([
      apiClient.get('/admin/system/config/'),
      userId ? realSystem.getNotificationPreferences(userId).catch(() => null) : Promise.resolve(null),
    ]);
    const rows = Array.isArray(configData) ? configData : (configData?.results ?? []);
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row.value]));

    const settings = { ...defaultSettings };
    Object.entries(CONFIG_KEYS).forEach(([uiKey, configKey]) => {
      if (configKey in byKey) settings[uiKey] = parseConfigValue(byKey[configKey], defaultSettings[uiKey]);
    });
    if (prefs) {
      settings.notifyEmail = Boolean(prefs.email_enabled);
      settings.notifySms = Boolean(prefs.sms_enabled);
      settings.notifyInApp = Boolean(prefs.in_app_enabled);
    }

    return { settings, integrations: clone(integrations) };
  },

  /** Every control saves one key at a time — see `SettingsPage`'s `set()`/`setValue()` helpers. */
  async saveSettings(patch, userId) {
    const [uiKey, value] = Object.entries(patch)[0] ?? [];
    if (!uiKey) return patch;

    if (NOTIFICATION_PREF_KEYS[uiKey]) {
      if (!userId) throw new Error('Cannot save a notification preference without a signed-in admin id.');
      await apiClient.put(`/notifications/preferences/${userId}/`, { [NOTIFICATION_PREF_KEYS[uiKey]]: value });
      return patch;
    }

    const configKey = CONFIG_KEYS[uiKey];
    if (configKey) await apiClient.put('/admin/system/config/', { key: configKey, value: String(value) });
    return patch;
  },

  getNotificationPreferences: async (userId) => (await apiClient.get(`/notifications/preferences/${userId}/`)).data,

  getHelp: async () => (await apiClient.get('/help')).data,

  async getAnnouncements() {
    const { data } = await apiClient.get('/admin/announcements/');
    return (Array.isArray(data) ? data : (data?.results ?? [])).map(toAnnouncement);
  },

  async createAnnouncement({ title, body }) {
    const { data } = await apiClient.post('/admin/announcements/', { title, body });
    return toAnnouncement(data);
  },
};

const settingsBackend = env.useMockSettings ? mockSystem : realSystem;
const announcementsBackend = env.useMockAnnouncements ? mockSystem : realSystem;
// Help articles are untouched by this pass — same `useMock` switch as before.
const helpBackend = env.useMock ? mockSystem : realSystem;

export const systemService = {
  getSettings: (userId) => settingsBackend.getSettings(userId),
  saveSettings: (patch, userId) => settingsBackend.saveSettings(patch, userId),
  getHelp: () => helpBackend.getHelp(),
  getAnnouncements: () => announcementsBackend.getAnnouncements(),
  createAnnouncement: (payload) => announcementsBackend.createAnnouncement(payload),
};
