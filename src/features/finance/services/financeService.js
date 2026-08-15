import { apiClient } from '@/lib/apiClient';
import { toAiSuggestionPayload, toCoverageAlert, toCsvRowPayload, toTaxRule, toTaxRulePayload } from '@/lib/taxSchema';
import { env } from '@/lib/env';
import { ApiError } from '@/utils/errors';
import { clone, createId, delay, paginate } from '@/lib/mock/utils';
import { jsonStorage } from '@/lib/storage';
import {
  costBreakdown,
  invoices,
  payments,
  payouts,
  revenueByMonth,
  taxRules,
} from '@/lib/mock/finance';

/** Financial service — payments, payouts, invoices and tax rules. */

const KEYS = {
  payouts: 'alotel.admin.mock.payouts',
  taxRules: 'alotel.admin.mock.taxRules',
};

const seeded = (key, source) => {
  const rows = jsonStorage.read(key, null);
  if (rows) return rows;
  const value = clone(source);
  jsonStorage.write(key, value);
  return value;
};

const readPayouts = () => seeded(KEYS.payouts, payouts);
const readTaxRules = () => seeded(KEYS.taxRules, taxRules);

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

const mockFinance = {
  async listPayments(params) {
    await delay(300);
    return paginate(payments, params, {
      searchFields: ['guest', 'bookingId', 'property', 'reference'],
      filterFields: ['status', 'method'],
    });
  },

  async listPayouts(params) {
    await delay(300);
    return paginate(readPayouts(), params, {
      searchFields: ['propertyName', 'hostEmail'],
      filterFields: ['status'],
    });
  },

  async releasePayout(id) {
    await delay(500);

    const rows = readPayouts();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Payout not found.', 404);

    rows[index] = { ...rows[index], status: 'Released', releasedAt: new Date().toISOString() };
    jsonStorage.write(KEYS.payouts, rows);
    return clone(rows[index]);
  },

  async revenue() {
    await delay(320);
    return clone({ invoices, revenueByMonth, costBreakdown });
  },

  async listTaxRules(params = {}) {
    await delay(260);
    const rows = readTaxRules();
    const filtered = rows.filter(
      (rule) =>
        (!params.country || rule.country === params.country) &&
        (!params.state || rule.state === params.state) &&
        (!params.city || rule.city === params.city) &&
        (!params.status || rule.status === params.status),
    );
    return clone(filtered);
  },

  async createTaxRule(payload) {
    await delay(450);

    const rule = { id: createId('tax'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...payload };
    jsonStorage.write(KEYS.taxRules, [...readTaxRules(), rule]);
    return clone(rule);
  },

  async updateTaxRule(id, patch) {
    await delay(350);

    const rows = readTaxRules();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Tax rule not found.', 404);

    rows[index] = { ...rows[index], ...patch, updatedAt: new Date().toISOString() };
    jsonStorage.write(KEYS.taxRules, rows);
    return clone(rows[index]);
  },

  async deleteTaxRule(id) {
    await delay(350);
    jsonStorage.write(KEYS.taxRules, readTaxRules().filter((entry) => entry.id !== id));
    return { success: true };
  },

  async approveTaxRule(id) {
    await delay(350);
    return mockFinance.updateTaxRule(id, { status: 'active' });
  },

  async rejectTaxRule(id, reason) {
    await delay(350);
    return mockFinance.updateTaxRule(id, { status: 'rejected', rejectedReason: reason });
  },

  /**
   * Shaped like the real `/properties/taxes/suggest/` response (snake_case) —
   * `AiTaxCompanionPanel` consumes the AI response as-is with no normaliser, so the
   * mock mirrors that wire shape rather than this file's usual camelCase
   * convention for everything else.
   */
  async suggestTaxRules({ country, state, city }) {
    await delay(700);
    const scopeLevel = city ? 'city' : state ? 'state' : 'country';
    return {
      mode: `${scopeLevel}_level`,
      queried: { country, state: state || null, city: city || null },
      suggestions: [
        {
          suggestion_id: 'sugg_mock_1',
          rule_name: `${city || state || country} Occupancy Tax`,
          scope_level: scopeLevel,
          country,
          state: state || null,
          city: city || null,
          tax_type: 'percentage',
          value: 8.5,
          frequency: 'per_night',
          display_label: 'Occupancy Tax',
          confidence: 'medium',
          source_url: 'https://example.com/mock-tax-reference',
          caveat: 'Mock suggestion — GEMINI_API_KEY is not configured on the backend; this is placeholder data for demo purposes.',
        },
      ],
    };
  },

  async createTaxRuleFromSuggestion(suggestion) {
    return mockFinance.createTaxRule(toTaxRule(toAiSuggestionPayload(suggestion)));
  },

  /** Always "all clear" — this is fundamentally a real-backend panel, not a rich fixture. */
  async coverageAlerts() {
    await delay(250);
    return { count: 0, alerts: [] };
  },

  async confirmNoTax(payload) {
    await delay(300);
    return { id: createId('ntc'), ...payload, confirmed_by: null, created_at: new Date().toISOString() };
  },

  async createTaxRuleFromCsvRow(row) {
    return mockFinance.createTaxRule(toTaxRule(toCsvRowPayload(row)));
  },

  /** No bulk endpoint in mock mode — goes row-by-row through the same mock create path, mirroring the real bulk endpoint's `{importedCount, rules}` shape. */
  async bulkImportTaxRules(rows) {
    await delay(400);
    const rules = [];
    for (const row of rows) rules.push(await mockFinance.createTaxRuleFromCsvRow(row));
    return { importedCount: rules.length, rules };
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
    return data;
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

const mockPayments = {
  refund: async () => ({ detail: 'Mock refund recorded.' }),
  getDeposit: async (bookingId) => ({ booking_id: bookingId, status: 'held', amount: '150.00', currency: 'GBP' }),
  preauthDeposit: async () => ({ detail: 'Mock deposit held.' }),
  captureDeposit: async () => ({ detail: 'Mock deposit captured.' }),
  releaseDeposit: async () => ({ detail: 'Mock deposit released.' }),
  deductDeposit: async () => ({ detail: 'Mock deduction recorded.' }),
  fxRates: async () => ({
    base: 'GBP',
    rates: {},
    supportedCurrencies: ['GBP', 'EUR', 'USD', 'AED', 'NGN'],
    providerByCurrency: { GBP: 'stripe', EUR: 'stripe', USD: 'stripe', AED: 'stripe', NGN: 'flutterwave' },
    note: '',
  }),
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

  /** Turn one AI suggestion into a real rule — `source`/`status` both `ai_suggested`, landing it in the existing review queue. */
  async createFromSuggestion(suggestion) {
    const { data } = await apiClient.post('/properties/taxes/', toAiSuggestionPayload(suggestion));
    return toTaxRule(data);
  },

  /** `GET /properties/taxes/coverage-alerts/` — Super Admin only. Locations a real pricing calculation priced with zero active tax coverage. */
  async coverageAlerts() {
    const { data } = await apiClient.get('/properties/taxes/coverage-alerts/');
    return { count: data?.count ?? 0, alerts: (data?.alerts ?? []).map(toCoverageAlert) };
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

  /** One CSV row → one create call — used by the mock/offline path only; the real path uses `bulkImport` below. */
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
  revenue: async () => (await apiClient.get('/revenue')).data,
  listTaxRules: async () => (await apiClient.get('/tax-rules')).data,
  createTaxRule: async (payload) => (await apiClient.post('/tax-rules', payload)).data,
  updateTaxRule: async (id, patch) => (await apiClient.patch(`/tax-rules/${id}`, patch)).data,
  deleteTaxRule: async (id) => (await apiClient.delete(`/tax-rules/${id}`)).data,
};

const backend = env.useMock ? mockFinance : realFinance;
// `payments` is already the imported mock fixture — name the backend distinctly.
const paymentOps = env.useMockPayments ? mockPayments : realPayments;
// The payments ledger has its own flag (previously declared but unused — it fell through to the global one).
const paymentsList = env.useMockPayments ? mockFinance : realFinance;
// Payouts share the payments flag rather than the global `env.useMock` — they were
// silently stuck on mock data because `backend` above is keyed off the wrong flag.
const payoutsBackend = env.useMockPayments ? mockFinance : realFinance;
const taxes = env.useMockTaxes ? mockFinance : realTaxes;

/** Real payout rows have no free-text search field server-side — filter client-side over the fields the table shows. */
const filterPayoutRows = (rows, query) => {
  if (!query) return rows;
  const needle = query.toLowerCase();
  return rows.filter((row) =>
    [row.propertyName, row.hostEmail, row.periodStart, row.periodEnd].some((field) => (field || '').toLowerCase().includes(needle)),
  );
};

export const financeService = {
  /* Payment operations — wired to the real API. */
  refundBooking: (payload) => paymentOps.refund(payload),
  getDeposit: (bookingId) => paymentOps.getDeposit(bookingId),
  preauthDeposit: (payload) => paymentOps.preauthDeposit(payload),
  captureDeposit: (payload) => paymentOps.captureDeposit(payload),
  releaseDeposit: (payload) => paymentOps.releaseDeposit(payload),
  deductDeposit: (payload) => paymentOps.deductDeposit(payload),
  getFxRates: (base) => paymentOps.fxRates(base),

  getPayments: (params) => paymentsList.listPayments(params),

  /* Payouts — wired to the real API by default (`VITE_USE_MOCK_PAYMENTS`). Real
   * `/payouts/` returns a plain array with no pagination envelope, so it's
   * normalised into the same `{items, total, ...}` shape every other list uses. */
  getPayouts: async (params = {}) => {
    if (env.useMockPayments) return payoutsBackend.listPayouts(params);
    const rows = filterPayoutRows((await payoutsBackend.listPayouts(params)).map(toPayout), params.query);
    return { items: rows, total: rows.length, page: 1, pageSize: rows.length || 1, totalPages: 1 };
  },
  releasePayout: async (id) => {
    const payout = await payoutsBackend.releasePayout(id);
    return env.useMockPayments ? payout : toPayout(payout);
  },
  /** Schedule a payout — Super Admin only, real API only (no mock create flow exists). */
  createPayout: async (values) => {
    if (env.useMockPayments) throw new ApiError('Scheduling a payout requires the real API.', 400);
    return toPayout(await payoutsBackend.createPayout(toPayoutPayload(values)));
  },

  /**
   * Manual cost log (`operations.ExpenseEntry`) for the Cost Breakdown categories
   * with no automatic source (Operation/Staff/Marketing/Others — Maintenance is
   * derived server-side from ticket costs). `IsLevel1Or2`, real API only — this
   * model is new enough there's no mock fixture for it.
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

  getRevenue: () => backend.revenue(),
  /* Tax rules — wired to the real API. */
  getTaxRules: (params) => (env.useMockTaxes ? backend.listTaxRules(params) : taxes.list(params)),
  createTaxRule: (payload) => (env.useMockTaxes ? backend.createTaxRule(payload) : taxes.create(payload)),
  updateTaxRule: (id, patch) => (env.useMockTaxes ? backend.updateTaxRule(id, patch) : taxes.update(id, patch)),
  deleteTaxRule: (id) => (env.useMockTaxes ? backend.deleteTaxRule(id) : taxes.remove(id)),
  approveTaxRule: (id) => (env.useMockTaxes ? backend.approveTaxRule(id) : taxes.approve(id)),
  rejectTaxRule: (id, reason) => (env.useMockTaxes ? backend.rejectTaxRule(id, reason) : taxes.reject(id, reason)),
  suggestTaxRules: (payload) => (env.useMockTaxes ? mockFinance.suggestTaxRules(payload) : realTaxes.suggest(payload)),
  createTaxRuleFromSuggestion: (suggestion) =>
    env.useMockTaxes ? mockFinance.createTaxRuleFromSuggestion(suggestion) : realTaxes.createFromSuggestion(suggestion),
  getCoverageAlerts: () => (env.useMockTaxes ? mockFinance.coverageAlerts() : realTaxes.coverageAlerts()),
  confirmNoTax: (payload) => (env.useMockTaxes ? mockFinance.confirmNoTax(payload) : realTaxes.confirmNoTax(payload)),
  createTaxRuleFromCsvRow: (row) => (env.useMockTaxes ? mockFinance.createTaxRuleFromCsvRow(row) : realTaxes.createFromCsvRow(row)),
  /**
   * Bulk CSV import. Real path sends the raw `file`; mock path has no
   * server-side parser to hand it to, so it replays the already-parsed `rows`
   * (from the modal's own client-side preview parser) through the per-row
   * mock create path instead.
   */
  bulkImportTaxRules: ({ file, rows }) =>
    env.useMockTaxes ? mockFinance.bulkImportTaxRules(rows) : realTaxes.bulkImport(file),
};
