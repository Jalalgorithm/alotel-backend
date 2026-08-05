import { apiClient } from '@/lib/apiClient';
import { env } from '@/lib/env';
import { authStorage, jsonStorage } from '@/lib/storage';
import { ApiError } from '@/utils/errors';
import { clone, createFakeToken, delay } from '@/lib/mock/utils';
import { staff, capabilitiesForRole, levelForApiRole, ROLES } from '@/lib/mock/people';
import { getInitials } from '@/utils/format';

/**
 * Admin authentication service.
 *
 * Two implementations behind one surface — `env.useMockAuth` picks which runs,
 * so hooks and components never change between offline and live development.
 *
 * ── Login is a two-outcome operation ────────────────────────────────────────
 * `/auth/admin/login/` returns tokens when 2FA is off, but `{detail: "2FA code
 * sent"}` when it is on. `login()` therefore resolves to a tagged result so the
 * caller can route to the code screen rather than infer it from a missing key.
 */

const STAFF_KEY = 'alotel.admin.mock.staff';

/* -------------------------------------------------------------------------- */
/* Shape translation                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Turn an API profile into the shape this portal works in — notably resolving
 * the backend role into a level id and the capability list the guards use.
 *
 * @param {object} payload `/auth/profile/` response
 */
const toAdminUser = (payload) => {
  if (!payload) return null;

  const level = levelForApiRole(payload.role);
  const firstName = payload.first_name ?? '';
  const lastName = payload.last_name ?? '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || payload.email;
  const roleDefinition = ROLES.find((entry) => entry.id === level);

  return {
    id: payload.id,
    email: payload.email,
    name,
    initials: getInitials(name),
    /** Level id (L1/L2/L3) — the vocabulary the rest of the portal uses. */
    role: level,
    /** What the API actually called it, kept for debugging and support. */
    apiRole: payload.role,
    color: roleDefinition?.color ?? '#12603F',
    capabilities: capabilitiesForRole(level),
    regions: payload.profile?.assigned_properties?.length
      ? `${payload.profile.assigned_properties.length} properties`
      : 'All regions',
    shift: payload.profile?.shift ?? '',
    twoFactorEnabled: Boolean(payload.profile?.enable_2fa),
    status: 'Active',
  };
};

/* -------------------------------------------------------------------------- */
/* Real implementation                                                         */
/* -------------------------------------------------------------------------- */

const realAuth = {
  async login({ email, password }) {
    const { data } = await apiClient.post('/auth/admin/login/', { email, password });

    // 2FA enabled: no tokens yet, a code has been emailed instead.
    if (!data.access) return { status: '2fa_required', email };

    authStorage.setSession({ token: data.access, refreshToken: data.refresh });
    return { status: 'authenticated' };
  },

  async confirmTwoFactor({ email, code }) {
    const { data } = await apiClient.post('/auth/admin/2fa/confirm/', { email, code });
    authStorage.setSession({ token: data.access, refreshToken: data.refresh });
    return { status: 'authenticated' };
  },

  /**
   * Re-send a still-pending 2FA code.
   *
   * Uses the dedicated resend endpoint rather than replaying the login call —
   * that would mean holding the password in router state just to get a new
   * code, and would re-run the password hasher for no reason.
   */
  async resendTwoFactor({ email }) {
    await apiClient.post('/auth/admin/2fa/resend/', { email });
  },

  async logout() {
    const refresh = authStorage.getRefreshToken();
    if (refresh) await apiClient.post('/auth/logout/', { refresh });
  },

  async getCurrentUser() {
    if (!authStorage.getToken()) return null;

    const { data } = await apiClient.get('/auth/profile/');
    const user = toAdminUser(data);

    // A guest token is a valid session — just not for this portal. Refusing it
    // here means no admin screen ever renders for a non-staff account.
    if (!user?.role) return null;

    return user;
  },

  async forgotPassword({ email }) {
    await apiClient.post('/auth/password-reset/', { email });
  },

  /** `uid` and `token` come from the emailed link and travel in the path. */
  async resetPassword({ uid, token, password }) {
    await apiClient.post(`/auth/password-reset-confirm/${uid}/${token}/`, {
      new_password: password,
    });
  },
};

/* -------------------------------------------------------------------------- */
/* Mock implementation                                                         */
/* -------------------------------------------------------------------------- */

const readStaff = () => {
  const rows = jsonStorage.read(STAFF_KEY, null);
  if (rows) return rows;

  const seeded = clone(staff);
  jsonStorage.write(STAFF_KEY, seeded);
  return seeded;
};

export const writeStaff = (rows) => jsonStorage.write(STAFF_KEY, rows);
export const readStaffTable = readStaff;

const toMockUser = ({ password, ...member }) => ({
  ...member,
  capabilities: capabilitiesForRole(member.role),
  apiRole: member.role,
  twoFactorEnabled: false,
});

const mockAuth = {
  async login({ email, password }) {
    await delay(600);

    const user = readStaff().find((entry) => entry.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.password !== password) {
      throw new ApiError('Incorrect email or password. Please try again.', 401);
    }
    if (user.status !== 'Active') {
      throw new ApiError('This account has been deactivated. Contact a Super Admin.', 403);
    }

    authStorage.setSession({
      token: createFakeToken({ sub: user.id, email: user.email, role: user.role }),
      refreshToken: createFakeToken({ sub: user.id, type: 'refresh' }, 60 * 60 * 24),
    });
    return { status: 'authenticated' };
  },

  async confirmTwoFactor() {
    await delay(400);
    throw new ApiError('Two-factor authentication is not simulated in mock mode.', 400);
  },

  async resendTwoFactor() {
    await delay(300);
  },

  async logout() {
    await delay(200);
  },

  async getCurrentUser() {
    await delay(150);
    if (!authStorage.getToken()) return null;

    const cached = authStorage.getUser();
    if (!cached) return null;

    const user = readStaff().find((entry) => entry.id === cached.id);
    if (!user || user.status !== 'Active') return null;

    return toMockUser(clone(user));
  },

  async forgotPassword() {
    await delay(700);
  },

  async resetPassword() {
    await delay(700);
  },
};

const backend = env.useMockAuth ? mockAuth : realAuth;

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export const authService = {
  /**
   * Authenticate a staff account. Persists the session on success.
   *
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<{ status: 'authenticated', user: object } | { status: '2fa_required', email: string }>}
   */
  async login(credentials) {
    const result = await backend.login(credentials);
    if (result.status !== 'authenticated') return result;

    const user = await authService.getCurrentUser();
    if (!user) {
      // Authenticated, but not as staff. Don't leave a half-session behind.
      authStorage.clear();
      throw new ApiError('This account cannot access the admin portal.', 403);
    }
    return { status: 'authenticated', user };
  },

  /** Exchange the emailed 6-digit code for a session. */
  async confirmTwoFactor(payload) {
    await backend.confirmTwoFactor(payload);

    const user = await authService.getCurrentUser();
    if (!user) {
      authStorage.clear();
      throw new ApiError('This account cannot access the admin portal.', 403);
    }
    return { status: 'authenticated', user };
  },

  /** Ask for a fresh code without re-authenticating. */
  resendTwoFactor: (payload) => backend.resendTwoFactor(payload),

  /** Clear the session locally even if the network call fails. */
  async logout() {
    try {
      await backend.logout();
    } catch {
      // An already-blacklisted refresh token 400s. The session is over either
      // way, so never let that block the admin from signing out.
    } finally {
      authStorage.clear();
    }
    return { success: true };
  },

  /** @returns {Promise<object|null>} the signed-in admin, or null. */
  async getCurrentUser() {
    const user = await backend.getCurrentUser();
    authStorage.setUser(user);
    return user;
  },

  forgotPassword: (payload) => backend.forgotPassword(payload),
  resetPassword: (payload) => backend.resetPassword(payload),

  getCachedUser: () => authStorage.getUser(),
};
