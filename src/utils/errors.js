/**
 * Every API error arrives in one envelope:
 *
 *   { "error": "Staff accounts must log in via the staff login endpoint." }
 *   { "error": { "email": ["A user with this email already exists"] } }
 *   { "error": { "detail": "Token is blacklisted", "code": "token_not_valid" } }
 *
 * plus an optional `request_id`. These helpers flatten that into something a
 * component can render, and into per-field errors a form can attach to inputs.
 */

/** Pull the first human-readable string out of any nested error value. */
const firstMessage = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return firstMessage(value[0]);

  if (typeof value === 'object') {
    // DRF/SimpleJWT auth failures nest the useful text under `detail`.
    if (value.detail) return firstMessage(value.detail);
    const first = Object.values(value)[0];
    return firstMessage(first);
  }

  return String(value);
};

/**
 * Normalise anything thrown by axios into a display string.
 *
 * @param {unknown} error
 * @param {string} [fallback]
 * @returns {string}
 */
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  const data = error?.response?.data;

  if (data) {
    if (typeof data === 'string') return data;
    // The API envelope.
    if (data.error !== undefined) return firstMessage(data.error) ?? fallback;
    // Bare DRF shapes, in case a view bypasses the custom handler.
    if (data.detail) return firstMessage(data.detail) ?? fallback;
    const nested = firstMessage(data);
    if (nested) return nested;
  }

  if (error?.code === 'ERR_NETWORK') {
    return 'Unable to reach the server. Check your connection and try again.';
  }
  if (error?.code === 'ECONNABORTED') {
    return 'The server took too long to respond. Please try again.';
  }

  return error?.message || fallback;
};

/**
 * Field-level errors, for handing straight to React Hook Form's `setError`.
 * Returns `{}` when the failure wasn't field-specific.
 *
 * @param {unknown} error
 * @returns {Record<string, string>}
 */
export const getFieldErrors = (error) => {
  const payload = error?.response?.data?.error;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};

  return Object.entries(payload).reduce((fields, [key, value]) => {
    // `non_field_errors` and `detail` are form-level, not tied to an input.
    if (key === 'non_field_errors' || key === 'detail' || key === 'code' || key === 'messages') {
      return fields;
    }
    const message = firstMessage(value);
    if (message) fields[key] = message;
    return fields;
  }, {});
};

/** The API echoes a `request_id` on failures — worth showing when support is involved. */
export const getRequestId = (error) => error?.response?.data?.request_id ?? null;

/**
 * Some endpoints (contracts/templates) add a machine-readable `code` alongside
 * `error` for specific business-rule rejections — e.g. `{"error": "...", "code":
 * "not_editable"}` — so the UI can show a precise, actionable message instead of
 * the raw string. Not every error carries one (plain 404s and generic
 * validation 400s don't) — callers must fall back to `getErrorMessage` when
 * this returns `null`.
 */
export const getErrorCode = (error) => error?.response?.data?.code ?? null;

/** Round `seconds` into the coarsest unit that still reads honestly. */
const humaniseWait = (seconds) => {
  if (seconds < 90) return `${Math.max(1, Math.round(seconds))} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  const hours = Math.round(seconds / 3600);
  return hours === 1 ? 'an hour' : `${hours} hours`;
};

/**
 * A human sentence for a rate-limited (429) response, or `null` for anything
 * else — callers fall back to `getErrorMessage`.
 *
 * DRF phrases this as "Request was throttled. Expected available in 3540
 * seconds.", which is precise and unusable. The wait is worth showing, since
 * it tells the admin whether to wait or to go find another way in, so we read
 * it from the `Retry-After` header and fall back to parsing the sentence.
 */
export const getRetryAfterMessage = (error) => {
  if (error?.response?.status !== 429) return null;

  const header = Number(error.response.headers?.['retry-after']);
  const parsed = Number(String(firstMessage(error.response.data) ?? '').match(/(\d+)\s*seconds?/i)?.[1]);
  const seconds = [header, parsed].find((value) => Number.isFinite(value) && value > 0);

  if (!seconds) return 'Too many attempts. Please wait a little while before trying again.';
  return `Too many attempts. Please try again in about ${humaniseWait(seconds)}.`;
};

/** Error subclass used by the mock backend so failures look like real 4xx responses. */
export class ApiError extends Error {
  constructor(message, status = 400, data = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = { status, data: { error: message, ...data } };
  }
}
