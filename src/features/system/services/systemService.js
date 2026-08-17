import { apiClient } from '@/lib/apiClient';
import { clone, delay } from '@/lib/mock/utils';
import { defaultSettings, helpArticles } from '@/lib/mock/system';

/** Help articles — never confirmed against a real `/help` endpoint; stays on fixture data. */
const mockSystem = {
  async getHelp() {
    await delay(180);
    return clone(helpArticles);
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

/** Static UI copy per integration — `GET /admin/integrations/` reports live status, not what each one is for. */
const INTEGRATION_DESCRIPTIONS = {
  stripe_identity: 'KYC for stays under 6 months · ~$1.50/check',
  dropbox_sign: 'E-signature API · eIDAS + ESIGN compliant',
  flutterwave: 'Nigeria payments · NGN · bank transfer + USSD',
  onfido: 'Full KYC + AML for stays 6+ months',
  sendgrid: 'Transactional email provider',
};

/** `GET /admin/integrations/`'s `{key: {label, configured, note?}}` → the array shape `SettingsPage.jsx` renders. */
const toIntegrationList = (raw) =>
  Object.entries(raw ?? {}).map(([id, entry]) => ({
    id,
    name: entry.label,
    description: entry.note || INTEGRATION_DESCRIPTIONS[id] || '',
    status: entry.configured ? 'Connected' : 'Not configured',
  }));

const parseConfigValue = (raw, fallback) => {
  if (typeof fallback === 'boolean') return raw === 'true' || raw === true;
  return raw ?? fallback;
};

/**
 * `GET/PUT /admin/system/config/` (Super Admin only) persists the
 * security/automation toggles; the three notification toggles are genuinely
 * per-admin, so they go to `GET/PUT /notifications/preferences/<user_id>/`
 * instead.
 */
const realSystem = {
  async getSettings(userId) {
    const [{ data: configData }, prefs, integrationsList] = await Promise.all([
      apiClient.get('/admin/system/config/'),
      userId ? realSystem.getNotificationPreferences(userId).catch(() => null) : Promise.resolve(null),
      realSystem.getIntegrations().catch(() => []),
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

    return { settings, integrations: integrationsList };
  },

  /** `GET /admin/integrations/` — live configured/not status, `IsLevel1`. */
  async getIntegrations() {
    const { data } = await apiClient.get('/admin/integrations/');
    return toIntegrationList(data);
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

  async getAnnouncements() {
    const { data } = await apiClient.get('/admin/announcements/');
    return (Array.isArray(data) ? data : (data?.results ?? [])).map(toAnnouncement);
  },

  async createAnnouncement({ title, body }) {
    const { data } = await apiClient.post('/admin/announcements/', { title, body });
    return toAnnouncement(data);
  },
};

export const systemService = {
  getSettings: (userId) => realSystem.getSettings(userId),
  saveSettings: (patch, userId) => realSystem.saveSettings(patch, userId),
  getHelp: () => mockSystem.getHelp(),
  getAnnouncements: () => realSystem.getAnnouncements(),
  createAnnouncement: (payload) => realSystem.createAnnouncement(payload),
};
