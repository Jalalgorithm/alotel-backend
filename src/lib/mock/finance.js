/**
 * Financial data: guest payments, owner payouts, invoices and tax rules.
 * Every screen built on this is Level 1 only.
 */

export const payments = [
  { id: 'pay_9001', bookingId: 'AS-8821', guest: 'Jamila Amara', property: '3-Bedroom Penthouse', method: 'Bank Transfer', provider: 'Flutterwave', currency: 'NGN', amount: 1295000, fee: 19425, net: 1275575, status: 'Paid', paidAt: '2026-08-01T11:20:00.000Z', reference: 'ALT-9F2K1A' },
  { id: 'pay_9002', bookingId: 'AS-8824', guest: 'Emmanuel Okafor', property: 'Canary Wharf Studio', method: 'Card', provider: 'Stripe', currency: 'GBP', amount: 520, fee: 9.62, net: 510.38, status: 'Paid', paidAt: '2026-08-01T09:05:00.000Z', reference: 'ALT-7H3M2B' },
  { id: 'pay_9003', bookingId: 'AS-8822', guest: 'Pierre Martin', property: 'Gothic Quarter 2-Bed', method: 'Card', provider: 'Stripe', currency: 'EUR', amount: 1850, fee: 34.5, net: 1815.5, status: 'Processing', paidAt: '2026-08-03T18:40:00.000Z', reference: 'ALT-4K8P9C' },
  { id: 'pay_9004', bookingId: 'AS-8823', guest: 'Sana Khan', property: 'Dubai Marina Suite', method: 'Bank Transfer', provider: 'Stripe', currency: 'AED', amount: 13300, fee: 199.5, net: 13100.5, status: 'Due', paidAt: null, reference: 'ALT-2L5R7D' },
  { id: 'pay_9005', bookingId: 'AS-8818', guest: 'David Chen', property: 'Manhattan Studio', method: 'Card', provider: 'Stripe', currency: 'USD', amount: 1050, fee: 33.45, net: 1016.55, status: 'Paid', paidAt: '2026-07-26T14:10:00.000Z', reference: 'ALT-6T1V3E' },
  { id: 'pay_9006', bookingId: 'AS-8817', guest: 'Aisha Balogun', property: 'VI Luxury Flat', method: 'USSD', provider: 'Flutterwave', currency: 'NGN', amount: 1015000, fee: 15225, net: 999775, status: 'Paid', paidAt: '2026-07-18T08:30:00.000Z', reference: 'ALT-8W4X6F' },
  { id: 'pay_9007', bookingId: 'AS-8816', guest: 'Marco Ferrari', property: 'Sevilla Casa', method: 'Card', provider: 'Stripe', currency: 'EUR', amount: 1680, fee: 0, net: 0, status: 'Refunded', paidAt: '2026-07-05T10:00:00.000Z', reference: 'ALT-3Y7Z2G' },
  { id: 'pay_9008', bookingId: 'AS-8815', guest: 'Grace Nwosu', property: 'Studio Apartment', method: 'Bank Transfer', provider: 'Flutterwave', currency: 'NGN', amount: 434000, fee: 6510, net: 427490, status: 'Due', paidAt: null, reference: 'ALT-5A9B1H' },
];

export const PAYMENT_STATUSES = ['All', 'Paid', 'Processing', 'Due', 'Refunded'];
export const PAYMENT_METHODS = ['Bank Transfer', 'Card', 'USSD'];

/* -------------------------------------------------------------------------- */
/* Owner payouts                                                               */
/* -------------------------------------------------------------------------- */

/** Shaped like `PayoutSerializer` (real `payments.Payout`) — no owner/gross/commission/bank fields, those don't exist server-side. */
export const payouts = [
  { id: 'po_501', propertyName: 'VI Luxury Flat', hostEmail: 'lagosportfolio@example.com', amount: 4820000, currency: 'NGN', status: 'Released', periodStart: '2026-07-01', periodEnd: '2026-07-31', releasedAt: '2026-08-03T09:00:00.000Z' },
  { id: 'po_502', propertyName: 'Gothic Quarter 2-Bed', hostEmail: 'casaiberia@example.com', amount: 7599, currency: 'EUR', status: 'Pending', periodStart: '2026-07-01', periodEnd: '2026-07-31', releasedAt: null },
  { id: 'po_503', propertyName: 'Dubai Marina Suite', hostEmail: 'marinaholdings@example.com', amount: 35020, currency: 'AED', status: 'Pending', periodStart: '2026-07-01', periodEnd: '2026-07-31', releasedAt: null },
  { id: 'po_504', propertyName: 'Canary Wharf Studio', hostEmail: 'wharfliving@example.com', amount: 10608, currency: 'GBP', status: 'Released', periodStart: '2026-07-01', periodEnd: '2026-07-31', releasedAt: '2026-08-02T09:00:00.000Z' },
  { id: 'po_505', propertyName: 'Manhattan Studio', hostEmail: 'hudsonrentals@example.com', amount: 8381, currency: 'USD', status: 'Pending', periodStart: '2026-07-01', periodEnd: '2026-07-31', releasedAt: null },
];

export const PAYOUT_STATUSES = ['All', 'Pending', 'Released', 'Failed'];

/* -------------------------------------------------------------------------- */
/* Invoices                                                                    */
/* -------------------------------------------------------------------------- */

export const invoices = [
  { id: 'INV-2026-0412', bookingId: 'AS-8821', client: 'Jamila Amara', issuedAt: '2026-08-01', dueAt: '2026-08-06', currency: 'NGN', subtotal: 1295000, tax: 64750, total: 1359750, status: 'Paid' },
  { id: 'INV-2026-0413', bookingId: 'AS-8823', client: 'Sana Khan (Corporate)', issuedAt: '2026-08-02', dueAt: '2026-08-08', currency: 'AED', subtotal: 13300, tax: 1330, total: 14630, status: 'Due' },
  { id: 'INV-2026-0414', bookingId: 'AS-8819', client: 'Sofia Reyes', issuedAt: '2026-08-01', dueAt: '2026-08-15', currency: 'EUR', subtotal: 2700, tax: 270, total: 2970, status: 'Due' },
  { id: 'INV-2026-0415', bookingId: 'AS-8818', client: 'David Chen', issuedAt: '2026-07-26', dueAt: '2026-07-31', currency: 'USD', subtotal: 1050, tax: 0, total: 1050, status: 'Paid' },
  { id: 'INV-2026-0416', bookingId: 'AS-8814', client: 'Tom Whitfield (Corporate)', issuedAt: '2026-08-03', dueAt: '2026-08-17', currency: 'GBP', subtotal: 840, tax: 168, total: 1008, status: 'Due' },
];

/** Monthly revenue series backing the Revenue & Invoice screen. */
export const revenueByMonth = [
  { label: 'Feb', value: 14200 },
  { label: 'Mar', value: 16800 },
  { label: 'Apr', value: 15400 },
  { label: 'May', value: 19600 },
  { label: 'Jun', value: 21300 },
  { label: 'Jul', value: 24600 },
];

/** Weekly revenue backing the dashboard's "Revenue Overview" chart. */
export const revenueByDay = [
  { label: 'Mon', value: 2100 },
  { label: 'Tue', value: 2650 },
  { label: 'Wed', value: 1740 },
  { label: 'Thu', value: 3980 },
  { label: 'Fri', value: 2310 },
  { label: 'Sat', value: 3220 },
  { label: 'Sun', value: 2790 },
];

/** Operating cost split backing the "Cost Breakdown" donut. */
export const costBreakdown = [
  { label: 'Operation', value: 40 },
  { label: 'Staff', value: 25 },
  { label: 'Marketing', value: 15 },
  { label: 'Maintenance', value: 10 },
  { label: 'Others', value: 10, isOther: true },
];

/* -------------------------------------------------------------------------- */
/* Tax rules                                                                   */
/* -------------------------------------------------------------------------- */

/** Tax Rule Builder v2 shape (mirrors `toTaxRule()` in `@/lib/taxSchema` — see that module for field meaning). */
export const taxRules = [
  {
    id: 'tax_01', ruleName: 'Spain VAT', country: 'Spain', state: '', county: '', city: '',
    guestSegment: [], taxType: 'percentage', value: 10, frequency: 'per_night', displayLabel: 'VAT',
    status: 'active', source: 'manual', aiGenerated: false, sourceUrl: '', confidence: '', caveat: '',
    lastVerifiedAt: null, approvedBy: null, approvedAt: null, rejectedReason: '',
    createdAt: '2026-04-01T09:00:00.000Z', updatedAt: '2026-04-01T09:00:00.000Z',
  },
  {
    id: 'tax_03', ruleName: 'Barcelona City Tax', country: 'Spain', state: '', county: '', city: 'Barcelona',
    guestSegment: [], taxType: 'fixed', value: 6, frequency: 'per_night', displayLabel: 'Barcelona City Tax',
    status: 'active', source: 'manual', aiGenerated: false, sourceUrl: '', confidence: '', caveat: '',
    lastVerifiedAt: null, approvedBy: null, approvedAt: null, rejectedReason: '',
    createdAt: '2026-04-01T09:00:00.000Z', updatedAt: '2026-04-01T09:00:00.000Z',
  },
  {
    id: 'tax_05', ruleName: 'Tourism Dirham Fee', country: 'UAE', state: 'Dubai', county: '', city: '',
    guestSegment: [], taxType: 'percentage', value: 10, frequency: 'per_night', displayLabel: 'Tourism Fee (Dubai)',
    status: 'pending_review', source: 'csv_import', aiGenerated: false, sourceUrl: '', confidence: '', caveat: '',
    lastVerifiedAt: null, approvedBy: null, approvedAt: null, rejectedReason: '',
    createdAt: '2026-04-01T09:00:00.000Z', updatedAt: '2026-04-01T09:00:00.000Z',
  },
];

/**
 * Apply the active rules for a jurisdiction to a quote.
 * Kept here beside the rules so the preview on the Tax screen and any future
 * checkout calculation share one implementation.
 *
 * @param {{ nightlyRate: number, nights: number, cleaningFee?: number,
 *           country: string, state?: string, segment?: string }} quote
 * @param {object[]} rules
 */
export const calculateTax = (quote, rules) => {
  const { nightlyRate, nights, cleaningFee = 0, country, state = '', segment = 'All Guests' } = quote;
  const subtotal = nightlyRate * nights;

  const applicable = rules.filter(
    (rule) =>
      rule.active &&
      rule.country === country &&
      (!rule.state || rule.state === state) &&
      (rule.segment === 'All Guests' || rule.segment === segment),
  );

  const lines = applicable.map((rule) => {
    let amount;
    if (rule.type === 'Percentage') {
      amount = rule.frequency === 'Per Booking' ? (subtotal * rule.value) / 100 : (subtotal * rule.value) / 100;
    } else {
      amount = rule.frequency === 'Per Night' ? rule.value * nights : rule.value;
    }
    return { id: rule.id, label: rule.label, amount, isTax: true };
  });

  const taxTotal = lines.reduce((sum, line) => sum + line.amount, 0);

  return {
    subtotal,
    cleaningFee,
    lines,
    taxTotal,
    total: subtotal + cleaningFee + taxTotal,
  };
};
