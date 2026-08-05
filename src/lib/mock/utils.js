import { env } from '../env';

/**
 * Helpers shared by every mocked service.
 * They exist purely to make the mock layer *feel* like a network boundary.
 */

/** Resolve after a realistic amount of latency. */
export const delay = (ms = env.mockLatency) => new Promise((resolve) => setTimeout(resolve, ms));

/** Deep clone so callers can never mutate the in-memory "database". */
export const clone = (value) =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

/** Reasonably unique id without pulling in a uuid dependency. */
export const createId = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Build a fake, structurally-valid JWT (header.payload.signature).
 * It is *not* signed — it only needs to look and decode like the real thing.
 */
export const createFakeToken = (payload, ttlSeconds = 60 * 60 * 8) => {
  const encode = (value) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const issuedAt = Math.floor(Date.now() / 1000);
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    ...payload,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  })}.${btoa(`mock-signature-${issuedAt}`).replace(/=+$/, '')}`;
};

/**
 * Generic list pipeline shared by the list endpoints: text search across the
 * given fields, equality filters, then pagination.
 *
 * @param {object[]} source
 * @param {{ query?: string, page?: number, pageSize?: number, [key: string]: unknown }} params
 * @param {{ searchFields?: string[], filterFields?: string[] }} config
 */
export const paginate = (source, params = {}, config = {}) => {
  const { query = '', page = 1, pageSize = 10 } = params;
  const { searchFields = [], filterFields = [] } = config;

  const needle = query.trim().toLowerCase();

  const filtered = source.filter((row) => {
    const matchesQuery =
      !needle ||
      searchFields.some((field) => String(row[field] ?? '').toLowerCase().includes(needle));

    const matchesFilters = filterFields.every((field) => {
      const wanted = params[field];
      if (!wanted || wanted === 'All') return true;
      return String(row[field]) === String(wanted);
    });

    return matchesQuery && matchesFilters;
  });

  const start = (page - 1) * pageSize;

  return {
    items: clone(filtered.slice(start, start + pageSize)),
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
  };
};
