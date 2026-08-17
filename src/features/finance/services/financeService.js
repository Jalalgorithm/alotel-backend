import { apiClient } from '@/lib/apiClient';
import { toCoverageAlert, toCsvRowPayload, toTaxRule, toTaxRulePayload } from '@/lib/taxSchema';
import { clone, delay } from '@/lib/mock/utils';
import { costBreakdown, invoices, revenueByMonth } from '@/lib/mock/finance';

/** Financial service — payments, payouts, invoices and tax rules. */

/**
 * `PayoutSerializer`'s exact fields. Payee is `Property.host` directly — no
 * separate Owner entity, no gross/commission/net split and no bank details
 * anywhere in this schema (unlike the old mock fixture).
 */
const toPayout = (raw) => ({
  id: raw.id,
  propertyId: raw.property,
  propertyName: raw.property_name,
  hostEmail: raw.host_email,
  amount: Number(raw.amount),
  currency: raw.currency,
  /** `pending|released|failed` → Title Case, matching `StatusBadge`'s `STATUS_VARIANT` convention. */
  status: raw.status ? raw.status.charAt(0).toUpperCase() + raw.status.slice(1) : raw.status,
  periodStart: raw.period_start,
  periodEnd: raw.period_end,
  releasedBy: raw.released_by,
  releasedAt: raw.released_at,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

/** `PayoutCreateSerializer` — scheduling a new payout. */
const toPayoutPayload = (values) => ({
  property_id: values.propertyId,
  amount: String(values.amount),
  currency: values.currency,
  period_start: values.periodStart,
  period_end: values.periodEnd,
});

/** `PaymentTransactionSerializer`'s exact fields — no `fee`/`net`, those aren't tracked server-side. */
const toPayment = (raw) => ({
  id: raw.id,
  reference: raw.provider_reference || raw.id,
  bookingId: raw.booking,
  guest: raw.guest_email,
  property: raw.property_name,
  provider: raw.provider,
  transactionType: raw.transaction_type,
  amount: Number(raw.amount),
  currency: raw.currency,
  status: raw.status,
  failureReason: raw.failure_reason,
  paidAt: raw.processed_at,
  createdAt: raw.created_at,
});

/**
 * Revenue & Invoice screen — no confirmed real endpoint for this yet, stays
 * on fixture data (unlike everything else in this file).
 */
const mockFinance = {
  async revenue() {
    await delay(320);
    return clone({ invoices, revenueByMonth, costBreakdown });
  },
};

/**
 * Payment operations the API actually exposes.
 *
 * There is no payments *list* endpoint — transactions are reachable only
 * through the booking they belong to (`/bookings/{id}/receipt/`). So the
 * payments screen is built from the admin booking list plus each booking's
 * receipt, rather than from a table the API does not serve.
 */
/**
 * `DepositDetailView` returns `{ledger: {...DepositLedgerSerializer fields,
 * including collection_method...}, claims: [...]}`, not a flat object —
 * flattened here (field names kept as-is, snake_case) so every caller can
 * read `deposit.status`/`deposit.collection_method`/`deposit.amount_captured`
 * etc. directly instead of reaching through `.ledger` themselves.
 */
const toDeposit = (raw) => ({ ...(raw?.ledger ?? raw ?? {}), claims: raw?.claims ?? [] });

const realPayments = {
  /**
   * Refund against a booking.
   *
   * `amount` and `currency` are both mandatory — the endpoint has no "refund
   * everything" mode, so the caller resolves the full total before calling.
   */
  async refund({ bookingId, amount, currency, reason, provider }) {
    const { data } = await apiClient.post('/payments/refund/', {
      booking_id: bookingId,
      amount: String(amount),
      currency,
      ...(reason ? { reason } : {}),
      ...(provider ? { provider } : {}),
    });
    return data;
  },

  async getDeposit(bookingId) {
    const { data } = await apiClient.get(`/deposits/${bookingId}/`);
    return toDeposit(data);
  },

  /**
   * Secure the deposit.
   *
   * Stripe supports a pre-authorisation hold; Flutterwave does not, and the
   * API rejects a preauth for NGN outright, directing callers to charge
   * instead. Choosing here means the caller only has to say "secure it".
   */
  async preauthDeposit({ bookingId, amount, currency, provider }) {
    const endpoint =
      provider === 'flutterwave' ? '/payments/deposit/charge/' : '/payments/deposit/preauth/';

    const { data } = await apiClient.post(endpoint, {
      booking_id: bookingId,
      amount: String(amount),
      currency,
      ...(provider ? { provider } : {}),
    });
    return data;
  },

  /** Capture some or all of a held deposit. */
  async captureDeposit({ bookingId, amount }) {
    const { data } = await apiClient.post(`/deposits/${bookingId}/capture/`, {
      ...(amount ? { amount: String(amount) } : {}),
    });
    return data;
  },

  /** Release the hold without charging. */
  async releaseDeposit({ bookingId }) {
    const { data } = await apiClient.post('/payments/deposit/release/', { booking_id: bookingId });
    return data;
  },

  /** Deduct against the deposit for damage or cleaning. */
  async deductDeposit({ bookingId, amount, reason }) {
    const { data } = await apiClient.post(`/deposits/${bookingId}/deduct/`, {
      amount: String(amount),
      reason: reason ?? '',
    });
    return data;
  },

  async fxRates(base = 'GBP') {
    const { data } = await apiClient.get('/payments/fx-rate/', { params: { base } });
    return {
      base: data.base,
      rates: data.rates ?? {},
      supportedCurrencies: data.supported_currencies ?? [],
      providerByCurrency: data.payment_provider_by_currency ?? {},
      note: data.note ?? '',
    };
  },
};

/**
 * Tax Rule Builder v2. Public to read (the guest quote depends on it) and
 * Super-Admin-only to change. Rules stack (country + state + city can all
 * apply to one booking at once), so list supports filtering rather than
 * assuming one row per market.
 */
const realTaxes = {
  async list(params = {}) {
    const query = {};
    if (params.country) query.country = params.country;
    if (params.state) query.state = params.state;
    if (params.city) query.city = params.city;
    if (params.status) query.status = params.status;

    const { data } = await apiClient.get('/properties/taxes/', { params: query });
    return (data?.results ?? data ?? []).map(toTaxRule);
  },

  async create(values) {
    const { data } = await apiClient.post('/properties/taxes/', toTaxRulePayload(values));
    return toTaxRule(data);
  },

  async update(id, patch) {
    const { data } = await apiClient.patch(`/properties/taxes/${id}/`, toTaxRulePayload(patch));
    return toTaxRule(data);
  },

  async remove(id) {
    await apiClient.delete(`/properties/taxes/${id}/`);
    return { success: true };
  },

  /** Sets `status=active`, stamps `approved_by`/`approved_at`/`last_verified_at`. Empty body. */
  async approve(id) {
    const { data } = await apiClient.patch(`/properties/taxes/${id}/approve/`);
    return toTaxRule(data);
  },

  /** Sets `status=rejected` — kept, not deleted, for audit history. `reason` is required server-side. */
  async reject(id, reason) {
    const { data } = await apiClient.patch(`/properties/taxes/${id}/reject/`, { reason });
    return toTaxRule(data);
  },

  /**
   * `POST /properties/taxes/suggest/` — Super Admin only, Gemini-backed.
   * Read-only: never writes a `TaxRule`. Country-only is "mode A" (country-wide
   * research); country+state(+city) is "mode B" (narrower, more specific).
   */
  async suggest({ country, state, city }) {
    const body = { country };
    if (state) body.state = state;
    if (city) body.city = city;

    const { data } = await apiClient.post('/properties/taxes/suggest/', body);
    return data;
  },

  /** `GET /properties/taxes/coverage-alerts/` — Super Admin only. Locations a real pricing calculation priced with zero active tax coverage. */
  async coverageAlerts() {
    const { data } = await apiClient.get('/properties/taxes/coverage-alerts/');
    return { count: data?.count ?? 0, alerts: (data?.alerts ?? []).map(toCoverageAlert) };
  },

  /**
   * `GET /properties/taxes/coverage/` — Super Admin only. On-demand spot-check
   * for one location, distinct from `coverageAlerts` (which only surfaces
   * locations a *real booking* already priced with no coverage).
   */
  async checkCoverage({ country, state, city }) {
    const { data } = await apiClient.get('/properties/taxes/coverage/', {
      params: { country, ...(state ? { state } : {}), ...(city ? { city } : {}) },
    });
    return {
      hasActiveCoverage: Boolean(data?.has_active_coverage),
      matchedRules: data?.matched_rules ?? [],
      noTaxConfirmed: Boolean(data?.no_tax_confirmed),
    };
  },

  /** `POST /properties/taxes/no-tax-confirmation/` — idempotent upsert on the exact (country, state, city) scope. */
  async confirmNoTax({ country, state, city, reason }) {
    const { data } = await apiClient.post('/properties/taxes/no-tax-confirmation/', {
      country,
      ...(state ? { state } : {}),
      ...(city ? { city } : {}),
      reason,
    });
    return data;
  },

  /** One CSV row → one create call. */
  async createFromCsvRow(row) {
    const { data } = await apiClient.post('/properties/taxes/', toCsvRowPayload(row));
    return toTaxRule(data);
  },

  /**
   * `POST /properties/taxes/bulk-import/` — raw CSV file, multipart, Super
   * Admin only. Server-parsed and validated; all-or-nothing (any invalid row
   * rejects the whole file with per-line errors and creates nothing).
   */
  async bulkImport(file) {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/properties/taxes/bulk-import/', form);
    return { importedCount: data.imported_count, rules: (data.rules ?? []).map(toTaxRule) };
  },
};

const realFinance = {
  /** `GET /payments/` — admin transaction ledger, `IsLevel1Or2` (FM scoped to assigned properties server-side). */
  listPayments: async (params = {}) => {
    const query = { page: params.page ?? 1 };
    if (params.status) query.status = params.status;
    if (params.provider) query.provider = params.provider;
    if (params.transactionType) query.transaction_type = params.transactionType;
    if (params.bookingId) query.booking_id = params.bookingId;
    if (params.startDate) query.start_date = params.startDate;
    if (params.endDate) query.end_date = params.endDate;
    if (params.pageSize) query.page_size = params.pageSize;

    const { data } = await apiClient.get('/payments/', { params: query });
    const pageSize = data?.page_size ?? params.pageSize ?? 20;
    return {
      items: (data?.results ?? []).map(toPayment),
      total: data?.count ?? 0,
      page: data?.page ?? query.page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((data?.count ?? 0) / pageSize)),
    };
  },
  /** `GET /payouts/` — plain array, no pagination envelope. Filters: `property_id`, `status` (lowercase). */
  listPayouts: async (params = {}) => {
    const query = {};
    if (params.propertyId) query.property_id = params.propertyId;
    if (params.status && params.status !== 'All') query.status = params.status.toLowerCase();
    const { data } = await apiClient.get('/payouts/', { params: query });
    return data ?? [];
  },
  releasePayout: async (id) => (await apiClient.post(`/payouts/${id}/release/`)).data,
  /** `POST /payouts/` — Super Admin only. */
  createPayout: async (payload) => (await apiClient.post('/payouts/', payload)).data,
};

/** Real payout rows have no free-text search field server-side — filter client-side over the fields the table shows. */
const filterPayoutRows = (rows, query) => {
  if (!query) return rows;
  const needle = query.toLowerCase();
  return rows.filter((row) =>
    [row.propertyName, row.hostEmail, row.periodStart, row.periodEnd].some((field) => (field || '').toLowerCase().includes(needle)),
  );
};

export const financeService = {
  /* Payment operations. */
  refundBooking: (payload) => realPayments.refund(payload),
  getDeposit: (bookingId) => realPayments.getDeposit(bookingId),
  preauthDeposit: (payload) => realPayments.preauthDeposit(payload),
  captureDeposit: (payload) => realPayments.captureDeposit(payload),
  releaseDeposit: (payload) => realPayments.releaseDeposit(payload),
  deductDeposit: (payload) => realPayments.deductDeposit(payload),
  getFxRates: (base) => realPayments.fxRates(base),

  getPayments: (params) => realFinance.listPayments(params),

  /* Payouts — real `/payouts/` returns a plain array with no pagination
   * envelope, so it's normalised into the same `{items, total, ...}` shape
   * every other list uses. */
  getPayouts: async (params = {}) => {
    const rows = filterPayoutRows((await realFinance.listPayouts(params)).map(toPayout), params.query);
    return { items: rows, total: rows.length, page: 1, pageSize: rows.length || 1, totalPages: 1 };
  },
  releasePayout: async (id) => toPayout(await realFinance.releasePayout(id)),
  /** Schedule a payout — Super Admin only. */
  createPayout: async (values) => toPayout(await realFinance.createPayout(toPayoutPayload(values))),

  /**
   * Manual cost log (`operations.ExpenseEntry`) for the Cost Breakdown categories
   * with no automatic source (Operation/Staff/Marketing/Others — Maintenance is
   * derived server-side from ticket costs). `IsLevel1Or2`, real API only.
   */
  getExpenses: async (params = {}) => {
    const query = {};
    if (params.category) query.category = params.category;
    if (params.startDate) query.start_date = params.startDate;
    if (params.endDate) query.end_date = params.endDate;
    const { data } = await apiClient.get('/operations/expenses/', { params: query });
    return data ?? [];
  },
  createExpense: async (values) => {
    const { data } = await apiClient.post('/operations/expenses/', {
      category: values.category,
      amount: String(values.amount),
      date: values.date,
      note: values.note?.trim() ?? '',
    });
    return data;
  },

  /** Revenue & Invoice — no confirmed real endpoint yet, stays mocked. */
  getRevenue: () => mockFinance.revenue(),

  /* Tax rules. */
  getTaxRules: (params) => realTaxes.list(params),
  createTaxRule: (payload) => realTaxes.create(payload),
  updateTaxRule: (id, patch) => realTaxes.update(id, patch),
  deleteTaxRule: (id) => realTaxes.remove(id),
  approveTaxRule: (id) => realTaxes.approve(id),
  rejectTaxRule: (id, reason) => realTaxes.reject(id, reason),
  suggestTaxRules: (payload) => realTaxes.suggest(payload),
  getCoverageAlerts: () => realTaxes.coverageAlerts(),
  checkTaxCoverage: (payload) => realTaxes.checkCoverage(payload),
  confirmNoTax: (payload) => realTaxes.confirmNoTax(payload),
  createTaxRuleFromCsvRow: (row) => realTaxes.createFromCsvRow(row),
  bulkImportTaxRules: ({ file }) => realTaxes.bulkImport(file),
};
