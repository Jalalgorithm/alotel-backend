import axios from 'axios';
import { env } from './env';
import { authStorage } from './storage';

/**
 * Shared axios instance.
 *
 * Responsibilities:
 *  - attach the bearer token to every outgoing request;
 *  - send cookies (`withCredentials`) so a cookie-based backend works unchanged;
 *  - transparently refresh an expired access token on the first 401 and replay
 *    the original request; any sibling requests that 401 while a refresh is
 *    already in flight await that same refresh instead of starting their own,
 *    so only one refresh call ever leaves the browser no matter how many
 *    requests a page fires at once.
 */
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 20000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Let the browser set the multipart boundary for FormData payloads.
  if (config.data instanceof FormData) delete config.headers['Content-Type'];

  return config;
});

/** Broadcast a forced logout; `AuthProvider` listens and clears app state. */
const emitSessionExpired = () => {
  authStorage.clear();
  window.dispatchEvent(new CustomEvent('alotel:session-expired'));
};

// Every 401'd request awaits this *same* promise rather than each deciding
// independently whether a refresh is already underway. A page that fires many
// requests at once (e.g. the Contracts board) can have several of them 401
// around the same moment; sharing one promise — instead of a boolean flag plus
// a manually-managed queue — means there is no window where a slightly late
// 401 fails to see "a refresh is in flight" and kicks off a second, redundant
// /auth/refresh/ call. A second call racing the first against the backend's
// one-time-use refresh token was spuriously logging out sessions that were
// actually still valid.
let refreshPromise = null;

const refreshAccessToken = () => {
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) {
    emitSessionExpired();
    return Promise.reject(new Error('No refresh token available'));
  }

  refreshPromise = axios
    .post(`${env.apiUrl}/auth/refresh/`, { refresh: refreshToken }, { withCredentials: true })
    .then(({ data }) => {
      // The API rotates refresh tokens and blacklists the old one immediately,
      // so the new refresh MUST be persisted or the next refresh will 401.
      const token = data.access;
      authStorage.setSession({ token, refreshToken: data.refresh ?? refreshToken });
      return token;
    })
    .catch((refreshError) => {
      emitSessionExpired();
      throw refreshError;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config: originalRequest } = error;

    if (!response || response.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    // Never try to refresh the refresh call itself, and never bounce someone
    // out of a session they were only just trying to start.
    const isAuthEntryPoint = ['/auth/refresh', '/auth/login', '/auth/admin/login', '/auth/admin/2fa'].some(
      (path) => originalRequest.url?.includes(path),
    );
    if (isAuthEntryPoint) {
      if (originalRequest.url?.includes('/auth/refresh')) emitSessionExpired();
      return Promise.reject(error);
    }

    // Marked unconditionally, before awaiting the (possibly shared) refresh —
    // this is what stops a queued sibling from mistaking its own retry for a
    // fresh, first-time 401 and triggering another refresh call.
    originalRequest._retry = true;

    try {
      const token = await (refreshPromise ?? refreshAccessToken());
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return await apiClient(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);
