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

export const payouts = [
  { id: 'po_501', owner: 'Lagos Portfolio Ltd', initials: 'LP', color: '#12603F', properties: 4, period: 'July 2026', currency: 'NGN', gross: 5420000, commission: 600000, net: 4820000, status: 'Paid', scheduledFor: '2026-08-03', bank: 'GTBank ····4471' },
  { id: 'po_502', owner: 'Casa Iberia SL', initials: 'CI', color: '#2a78d6', properties: 3, period: 'July 2026', currency: 'EUR', gross: 8940, commission: 1341, net: 7599, status: 'Scheduled', scheduledFor: '2026-08-07', bank: 'CaixaBank ····9920' },
  { id: 'po_503', owner: 'Marina Holdings FZE', initials: 'MH', color: '#6D28D9', properties: 2, period: 'July 2026', currency: 'AED', gross: 41200, commission: 6180, net: 35020, status: 'Processing', scheduledFor: '2026-08-05', bank: 'Emirates NBD ····1180' },
  { id: 'po_504', owner: 'Wharf Living UK', initials: 'WL', color: '#eb6834', properties: 5, period: 'July 2026', currency: 'GBP', gross: 12480, commission: 1872, net: 10608, status: 'Paid', scheduledFor: '2026-08-02', bank: 'Barclays ····7732' },
  { id: 'po_505', owner: 'Hudson Rentals LLC', initials: 'HR', color: '#0F766E', properties: 4, period: 'July 2026', currency: 'USD', gross: 9860, commission: 1479, net: 8381, status: 'Scheduled', scheduledFor: '2026-08-09', bank: 'Chase ····2214' },
];

export const PAYOUT_STATUSES = ['All', 'Paid', 'Processing', 'Scheduled'];

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
  { label: 'Operations', value: 40 },
  { label: 'Staff', value: 26 },
  { label: 'Marketing', value: 18 },
  { label: 'Utilities', value: 10 },
  { label: 'Other', value: 6, isOther: true },
];

/* -------------------------------------------------------------------------- */
/* Tax rules                                                                   */
/* -------------------------------------------------------------------------- */

export const taxRules = [
  { id: 'tax_01', name: 'Standard VAT', country: 'Spain', state: '', segment: 'EU Citizen', type: 'Percentage', value: 10, frequency: 'Per Night', label: 'VAT (EU Resident)', active: true },
  { id: 'tax_02', name: 'Tourist VAT Exempt', country: 'Spain', state: '', segment: 'Non-EU Foreigner', type: 'Percentage', value: 0, frequency: 'Per Night', label: 'VAT (Tourist)', active: true },
  { id: 'tax_03', name: 'Barcelona City Tax', country: 'Spain', state: 'Barcelona', segment: 'All Guests', type: 'Fixed', value: 6, frequency: 'Per Night', label: 'Barcelona City Tax', active: true },
  { id: 'tax_04', name: 'Lagos Consumption', country: 'Nigeria', state: 'Lagos', segment: 'All Guests', type: 'Percentage', value: 5, frequency: 'Per Booking', label: 'State Consumption Tax', active: true },
  { id: 'tax_05', name: 'Tourism Dirham Fee', country: 'UAE', state: 'Dubai', segment: 'All Guests', type: 'Percentage', value: 10, frequency: 'Per Night', label: 'Tourism Fee (Dubai)', active: true },
  { id: 'tax_06', name: 'UK Tourism Levy', country: 'UK', state: 'London', segment: 'All Guests', type: 'Fixed', value: 4, frequency: 'Per Night', label: 'London Visitor Levy', active: false },
];

export const TAX_SEGMENTS = ['All Guests', 'EU Citizen', 'Non-EU Foreigner', 'Citizens', 'Residents', 'Tourists'];
export const TAX_TYPES = ['Percentage', 'Fixed'];
export const TAX_FREQUENCIES = ['Per Night', 'Per Guest', 'Per Booking'];

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
