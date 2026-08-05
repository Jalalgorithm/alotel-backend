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
 *    the original request, queueing any siblings that 401 while the refresh
 *    is in flight so only one refresh call ever leaves the browser.
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

let isRefreshing = false;
/** @type {Array<{ resolve: (token: string) => void, reject: (error: unknown) => void }>} */
let pendingQueue = [];

const flushQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  pendingQueue = [];
};

/** Broadcast a forced logout; `AuthProvider` listens and clears app state. */
const emitSessionExpired = () => {
  authStorage.clear();
  window.dispatchEvent(new CustomEvent('alotel:session-expired'));
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

    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) {
      emitSessionExpired();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // A bare axios call: the instance's interceptor would re-attach the dead token.
      const { data } = await axios.post(
        `${env.apiUrl}/auth/refresh/`,
        { refresh: refreshToken },
        { withCredentials: true },
      );

      // The API rotates refresh tokens and blacklists the old one immediately,
      // so the new refresh MUST be persisted or the next refresh will 401.
      const token = data.access;
      authStorage.setSession({ token, refreshToken: data.refresh ?? refreshToken });
      flushQueue(null, token);

      originalRequest.headers.Authorization = `Bearer ${token}`;
      return await apiClient(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError);
      emitSessionExpired();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
