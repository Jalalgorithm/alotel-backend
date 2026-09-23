/**
 * Single, typed-ish access point for every `import.meta.env` value.
 * Nothing else in the app should read `import.meta.env` directly.
 *
 * The `VITE_USE_MOCK*` family that used to live here is gone: every feature
 * now talks to the real API, so the flags were read by nothing and only made
 * the env badge claim the portal was running on mock data when it wasn't.
 */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL || '/api/v1',
  appName: import.meta.env.VITE_APP_NAME || 'Alotel Spaces Admin',
  isDev: import.meta.env.DEV,
};
