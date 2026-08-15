/** Public API of the system feature. */
export { SettingsPage } from './components/SettingsPage';
export { HelpPage } from './components/HelpPage';

export { useSettings, useSaveSettings, useHelpArticles, useAnnouncements, useCreateAnnouncement } from './hooks/useSystem';
export { systemService } from './services/systemService';
