/**
 * Translation between `GET /admin/audit-log/`'s wire shape and the UI.
 *
 * The endpoint is a raw HTTP-request log, not a human "actor did action to
 * target" narrative — there's no free-text search and no role filter, only
 * `method`, `status_code`, `user_id` and a date range. The screen is built
 * around what's actually there rather than pretending otherwise.
 */

export const AUDIT_METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];

export const toAuditLogParams = ({ method, userId, startDate, endDate, page, pageSize } = {}) => {
  const params = {};

  if (method) params.method = method;
  if (userId) params.user_id = userId;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (page) params.page = page;
  if (pageSize) params.page_size = pageSize;

  return params;
};

export const toAuditLogPage = (data) => {
  const pageSize = data?.page_size || 20;

  return {
    items: (data?.results ?? []).map((row) => ({
      id: row.id,
      at: row.created_at,
      method: row.method,
      path: row.path,
      statusCode: row.status_code,
      action: row.action,
      ip: row.ip_address,
      durationMs: row.duration_ms,
      userId: row.user_id,
    })),
    total: data?.count ?? 0,
    page: data?.page ?? 1,
    pageSize,
    totalPages: Math.max(1, Math.ceil((data?.count ?? 0) / pageSize)),
  };
};
