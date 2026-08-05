/**
 * The booking vocabulary the API speaks, and the translation into the shape
 * the portal's tables and detail panels work in.
 *
 * Mirrors `propertySchema` — one place that knows the wire format, so no
 * component has to.
 */

export const BOOKING_STATUSES = [
  'pending_payment',
  'pending_approval',
  'pending_kyc',
  'confirmed',
  'active',
  'completed',
  'cancelled',
  'refunded',
];

export const BOOKING_STATUS_LABELS = {
  pending_payment: 'Pending Payment',
  pending_approval: 'Pending Approval',
  pending_kyc: 'Pending KYC',
  confirmed: 'Confirmed',
  active: 'Checked In',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

/** Badge variants, keyed by the API's status rather than a display label. */
export const BOOKING_STATUS_VARIANT = {
  pending_payment: 'warn',
  pending_approval: 'warn',
  pending_kyc: 'warn',
  confirmed: 'ok',
  active: 'info',
  completed: 'neutral',
  cancelled: 'danger',
  refunded: 'info',
};

/** Statuses an admin can still act on. */
export const ACTIONABLE_STATUSES = ['pending_payment', 'pending_approval', 'pending_kyc', 'confirmed', 'active'];

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toPricing = (raw, currency) => {
  if (!raw) return null;

  return {
    currency,
    nightlyTotal: toNumber(raw.nightly_total) ?? 0,
    discountTotal: toNumber(raw.discount_total) ?? 0,
    cleaningFee: toNumber(raw.cleaning_fee) ?? 0,
    taxTotal: toNumber(raw.tax_total) ?? 0,
    securityDeposit: toNumber(raw.security_deposit) ?? 0,
    totalDueNow: toNumber(raw.total_due_now ?? raw.estimated_total_due_now) ?? 0,
  };
};

/** A row from `GET /bookings/admin/list/`. */
export const toBookingRow = (raw) => ({
  id: raw.id,
  propertyId: raw.property_id,
  propertyName: raw.property_name,
  country: raw.country,
  guestId: raw.guest_id,
  guestName: raw.guest_name,
  guestEmail: raw.guest_email,
  status: raw.status,
  statusLabel: BOOKING_STATUS_LABELS[raw.status] ?? raw.status,
  checkIn: raw.check_in_date,
  checkOut: raw.check_out_date,
  nights: raw.nights ?? 0,
  currency: raw.currency,
  total: toNumber(raw.total) ?? 0,
  createdAt: raw.created_at,
});

/** `GET /bookings/{id}/` — the full record behind the detail drawer. */
export const toBookingDetail = (raw) => {
  if (!raw) return null;

  return {
    id: raw.id,
    propertyId: raw.property_id,
    guestId: raw.guest_id,
    status: raw.status,
    statusLabel: BOOKING_STATUS_LABELS[raw.status] ?? raw.status,

    checkIn: raw.check_in_date,
    checkOut: raw.check_out_date,
    nights: raw.nights ?? 0,
    adults: raw.adults ?? 1,
    children: raw.children ?? 0,
    infants: raw.infants ?? 0,

    currency: raw.currency,
    pricing: toPricing(raw.pricing, raw.currency),

    lineItems: (raw.line_items ?? []).map((item) => ({
      id: item.id,
      type: item.line_type,
      label: item.label,
      unitAmount: toNumber(item.unit_amount) ?? 0,
      quantity: toNumber(item.quantity) ?? 1,
      total: toNumber(item.total_amount) ?? 0,
      currency: item.currency,
      metadata: item.metadata ?? {},
    })),

    statusHistory: (raw.status_history ?? []).map((event) => ({
      from: event.from_status,
      fromLabel: BOOKING_STATUS_LABELS[event.from_status] ?? event.from_status,
      to: event.to_status,
      toLabel: BOOKING_STATUS_LABELS[event.to_status] ?? event.to_status,
      reason: event.reason,
      triggeredBy: event.triggered_by,
      at: event.created_at,
    })),

    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
};

/** `GET /bookings/{id}/receipt/`. */
export const toReceipt = (raw) => {
  if (!raw) return null;

  return {
    bookingId: raw.booking_id,
    status: raw.status,
    currency: raw.currency,
    totals: raw.totals ?? {},
    lineItems: (raw.line_items ?? []).map((item) => ({
      label: item.label,
      type: item.line_type,
      total: toNumber(item.total_amount) ?? 0,
      currency: item.currency,
    })),
    payments: (raw.payments ?? []).map((payment) => ({
      id: payment.id ?? payment.transaction_id,
      provider: payment.provider,
      status: payment.status,
      amount: toNumber(payment.amount) ?? 0,
      currency: payment.currency,
      reference: payment.provider_reference ?? null,
      createdAt: payment.created_at,
    })),
    generatedAt: raw.generated_at,
  };
};

/**
 * Translate the portal's filter state into the admin list's query parameters.
 *
 * Anything left at "All" is omitted — the endpoint treats an unrecognised
 * value as a real filter and would return nothing.
 */
export const toAdminListParams = ({ query, status, checkInFrom, checkInTo, page = 1 } = {}) => {
  const params = { page };

  if (query?.trim()) params.q = query.trim();
  if (status && status !== 'All') params.status = status;
  if (checkInFrom) params.check_in_from = checkInFrom;
  if (checkInTo) params.check_in_to = checkInTo;

  return params;
};

/** Normalise the admin list's pagination envelope. */
export const toBookingPage = (raw, { page = 1 } = {}) => ({
  items: (raw?.results ?? []).map((entry) => toBookingRow(entry)),
  total: raw?.count ?? 0,
  page: raw?.page ?? page,
  pageSize: raw?.page_size ?? 20,
  totalPages: Math.max(1, Math.ceil((raw?.count ?? 0) / (raw?.page_size ?? 20))),
});
