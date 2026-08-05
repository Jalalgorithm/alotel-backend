import { apiClient } from '@/lib/apiClient';
import { toTaxPayload, toTaxRule } from '@/lib/taxSchema';
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
      searchFields: ['owner', 'period'],
      filterFields: ['status'],
    });
  },

  async releasePayout(id) {
    await delay(500);

    const rows = readPayouts();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Payout not found.', 404);

    rows[index] = { ...rows[index], status: 'Paid', paidAt: new Date().toISOString() };
    jsonStorage.write(KEYS.payouts, rows);
    return clone(rows[index]);
  },

  async revenue() {
    await delay(320);
    return clone({ invoices, revenueByMonth, costBreakdown });
  },

  async listTaxRules() {
    await delay(260);
    return clone(readTaxRules());
  },

  async createTaxRule(payload) {
    await delay(450);

    const rule = { id: createId('tax'), active: true, ...payload };
    jsonStorage.write(KEYS.taxRules, [...readTaxRules(), rule]);
    return clone(rule);
  },

  async updateTaxRule(id, patch) {
    await delay(350);

    const rows = readTaxRules();
    const index = rows.findIndex((entry) => entry.id === id);
    if (index < 0) throw new ApiError('Tax rule not found.', 404);

    rows[index] = { ...rows[index], ...patch };
    jsonStorage.write(KEYS.taxRules, rows);
    return clone(rows[index]);
  },

  async deleteTaxRule(id) {
    await delay(350);
    jsonStorage.write(KEYS.taxRules, readTaxRules().filter((entry) => entry.id !== id));
    return { success: true };
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
 * Country tax rules. Public to read (the guest quote depends on them) and
 * admin-only to change.
 */
const realTaxes = {
  async list() {
    const { data } = await apiClient.get('/properties/taxes/');
    return (data?.results ?? data ?? []).map(toTaxRule);
  },

  async create(values) {
    const { data } = await apiClient.post('/properties/taxes/', toTaxPayload(values));
    return toTaxRule(data);
  },

  async update(id, patch) {
    const { data } = await apiClient.patch(`/properties/taxes/${id}/`, toTaxPayload(patch));
    return toTaxRule(data);
  },

  async remove(id) {
    await apiClient.delete(`/properties/taxes/${id}/`);
    return { success: true };
  },
};

const realFinance = {
  listPayments: async (params) => (await apiClient.get('/payments', { params })).data,
  listPayouts: async (params) => (await apiClient.get('/payouts', { params })).data,
  releasePayout: async (id) => (await apiClient.post(`/payouts/${id}/release`)).data,
  revenue: async () => (await apiClient.get('/revenue')).data,
  listTaxRules: async () => (await apiClient.get('/tax-rules')).data,
  createTaxRule: async (payload) => (await apiClient.post('/tax-rules', payload)).data,
  updateTaxRule: async (id, patch) => (await apiClient.patch(`/tax-rules/${id}`, patch)).data,
  deleteTaxRule: async (id) => (await apiClient.delete(`/tax-rules/${id}`)).data,
};

const backend = env.useMock ? mockFinance : realFinance;
// `payments` is already the imported mock fixture — name the backend distinctly.
const paymentOps = env.useMockPayments ? mockPayments : realPayments;
const taxes = env.useMockTaxes ? mockFinance : realTaxes;

export const financeService = {
  /* Payment operations — wired to the real API. */
  refundBooking: (payload) => paymentOps.refund(payload),
  getDeposit: (bookingId) => paymentOps.getDeposit(bookingId),
  preauthDeposit: (payload) => paymentOps.preauthDeposit(payload),
  captureDeposit: (payload) => paymentOps.captureDeposit(payload),
  releaseDeposit: (payload) => paymentOps.releaseDeposit(payload),
  deductDeposit: (payload) => paymentOps.deductDeposit(payload),
  getFxRates: (base) => paymentOps.fxRates(base),

  /* Payouts, revenue and tax rules remain on mocks. */
  getPayments: (params) => backend.listPayments(params),
  getPayouts: (params) => backend.listPayouts(params),
  releasePayout: (id) => backend.releasePayout(id),
  getRevenue: () => backend.revenue(),
  /* Tax rules — wired to the real API. */
  getTaxRules: () => (env.useMockTaxes ? backend.listTaxRules() : taxes.list()),
  createTaxRule: (payload) => (env.useMockTaxes ? backend.createTaxRule(payload) : taxes.create(payload)),
  updateTaxRule: (id, patch) => (env.useMockTaxes ? backend.updateTaxRule(id, patch) : taxes.update(id, patch)),
  deleteTaxRule: (id) => (env.useMockTaxes ? backend.deleteTaxRule(id) : taxes.remove(id)),
};
