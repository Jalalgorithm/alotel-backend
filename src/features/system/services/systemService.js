import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { clone, delay } from '@/lib/mock/utils';
import { jsonStorage } from '@/lib/storage';
import { defaultSettings, helpArticles, integrations } from '@/lib/mock/system';

const SETTINGS_KEY = 'alotel.admin.mock.settings';

const readSettings = () => {
  const stored = jsonStorage.read(SETTINGS_KEY, null);
  if (stored) return stored;
  const value = clone(defaultSettings);
  jsonStorage.write(SETTINGS_KEY, value);
  return value;
};

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
};

const realSystem = {
  getSettings: async () => (await apiClient.get('/settings')).data,
  saveSettings: async (patch) => (await apiClient.patch('/settings', patch)).data,
  getHelp: async () => (await apiClient.get('/help')).data,
};

const backend = env.useMock ? mockSystem : realSystem;

export const systemService = {
  getSettings: () => backend.getSettings(),
  saveSettings: (patch) => backend.saveSettings(patch),
  getHelp: () => backend.getHelp(),
};
