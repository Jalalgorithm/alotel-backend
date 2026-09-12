/** Dashboard headline figures, analytics KPIs, integrations and settings. */

/** The four KPI cards along the top of the dashboard. */
export const dashboardStats = [
  { id: 'properties', label: 'Total Properties', value: '128', delta: '+12% this month', trend: 'up', icon: 'building' },
  { id: 'bookings', label: 'Active Bookings', value: '342', delta: '+18% this week', trend: 'up', icon: 'calendar' },
  { id: 'occupancy', label: 'Occupancy Rate', value: '68%', delta: '+10% vs last month', trend: 'up', icon: 'gauge' },
  { id: 'revenue', label: 'Monthly Revenue', value: '₦24.6M', delta: '+22% vs last month', trend: 'up', icon: 'wallet' },
];

export const occupancyByRegion = [
  { label: 'Nigeria', value: 83 },
  { label: 'UK', value: 91 },
  { label: 'Spain', value: 72 },
  { label: 'UAE', value: 65 },
  { label: 'USA', value: 60 },
];

/* -------------------------------------------------------------------------- */
/* Analytics                                                                   */
/* -------------------------------------------------------------------------- */

export const analyticsKpis = [
  { id: 'occupancy', label: 'Occupancy Rate', value: '78%', note: 'Demand health', progress: 78 },
  { id: 'adr', label: 'ADR', value: '£124', note: '+8% MoM', trend: 'up' },
  { id: 'revpar', label: 'RevPAR', value: '£96', note: '+5% MoM', trend: 'up' },
  { id: 'conversion', label: 'Conversion Rate', value: '4.2%', note: '−0.3% MoM', trend: 'down' },
  { id: 'lead', label: 'Booking Lead Time', value: '11 days', note: 'Avg before stay' },
  { id: 'alos', label: 'ALOS', value: '6.4 nights', note: 'Avg length of stay' },
  { id: 'cancellation', label: 'Cancellation Rate', value: '9.1%', note: 'Of total bookings', progress: 9.1 },
  { id: 'refund', label: 'Refund Rate', value: '2.3%', note: 'Of total revenue', progress: 2.3 },
  { id: 'views', label: 'Listing Views', value: '4,821', note: 'This period' },
  { id: 'review', label: 'Review Score', value: '4.78', note: 'Guest satisfaction' },
  { id: 'growth', label: 'Revenue Growth', value: '+12%', note: 'Month over month', trend: 'up' },
  { id: 'turnover', label: 'Turnover Efficiency', value: '3.2 hrs', note: 'Avg gap between stays' },
];

export const reviewBreakdown = [
  { label: 'Cleanliness', value: 4.9 },
  { label: 'Accuracy', value: 4.7 },
  { label: 'Location', value: 4.8 },
  { label: 'Value', value: 4.3 },
  { label: 'Communication', value: 4.9 },
];

export const channelMix = [
  { label: 'Direct Bookings', value: 42 },
  { label: 'Platform', value: 38 },
  { label: 'Corporate / Referral', value: 20 },
];

export const durationMix = [
  { label: 'Short stay (<4 wks)', value: 71 },
  { label: 'Medium (4–24 wks)', value: 19 },
  { label: 'Long stay (6+ months)', value: 10 },
];

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

export const defaultSettings = {
  notifyEmail: true,
  notifySms: false,
  notifyInApp: true,
  twoFactor: true,
  sessionHours: '8',
  gdprMode: 'Strict',
  autoReleaseDeposit: true,
  stripePreAuth: true,
  contractReminderHours: '48',
  kycReminderHours: '24',
  autoCancelOnKycFailure: false,
  invoiceCompanyName: 'Alotel Spaces',
  invoiceSupportEmail: 'support@alotelspaces.com',
  invoiceLegalAddress: '',
};

export const integrations = [
  { id: 'stripe-identity', name: 'Stripe Identity', description: 'KYC for stays under 6 months · ~$1.50/check', status: 'Connected' },
  { id: 'dropbox-sign', name: 'Dropbox Sign', description: 'E-signature API · eIDAS + ESIGN compliant', status: 'Connected' },
  { id: 'flutterwave', name: 'Flutterwave', description: 'Nigeria payments · NGN · bank transfer + USSD', status: 'Connected' },
  { id: 'onfido', name: 'Onfido / Credas', description: 'Full KYC + AML for stays 6+ months', status: 'Action required' },
  { id: 'sendgrid', name: 'SendGrid', description: 'Transactional email provider', status: 'Connected' },
];

/* -------------------------------------------------------------------------- */
/* Help centre                                                                 */
/* -------------------------------------------------------------------------- */

export const helpArticles = [
  // Getting started
  { id: 'help-dashboard-by-role', category: 'Getting started', title: 'What you see on the Dashboard depends on your role', body: 'Super Admins and Facility Managers land on the full Dashboard — KPI tiles, Quick Actions, Recent Bookings, Revenue Overview, Cost Breakdown, Check-ins Today, Pending Verifications and Maintenance Requests. A Housekeeper (Level 3) instead lands directly on Housekeeping, with no guest names, bookings or financial data anywhere in their view.' },
  { id: 'help-dashboard-kpi-na', category: 'Getting started', title: 'Reading a KPI tile that says "Not available for this role"', body: "If a Dashboard tile shows this instead of a number, it isn't broken — the backend simply doesn't return that figure for your role. Check with a Super Admin if you believe you should be seeing it." },
  { id: 'help-cost-breakdown-source', category: 'Getting started', title: "Where Cost Breakdown's numbers come from", body: 'The Maintenance slice is calculated automatically from ticket costs. Every other category — utilities, supplies, marketing, and so on — only appears if someone has logged it manually via "Log expense" on the Dashboard. Nothing populates those categories on its own.' },
  { id: 'help-analytics-filters', category: 'Getting started', title: 'Analytics filters', body: "The Country and Period filters on the Analytics screen only accept five preset ranges — Today, 7 days, 30 days, This month, Last month. There's no custom date range yet." },

  // Properties
  { id: 'help-property-publish', category: 'Properties', title: 'Publishing a property — what’s actually required', body: 'A listing can be published with zero photos — photos can always be added later. Every new property is created as a draft first; publishing is a separate, explicit step once you’re ready.' },
  { id: 'help-property-classification', category: 'Properties', title: 'What Classification does (and doesn’t)', body: 'Classification — Alotel, Third-Party, or Third-Party (Social Housing) — is internal only and never shown to a guest. It’s used for internal reporting; it does not itself change pricing, compliance requirements, or anything the guest sees.' },
  { id: 'help-amenities-not-retroactive', category: 'Properties', title: 'Amenity changes aren’t retroactive', body: 'Turning an amenity on or off in the master Amenities list only affects new listings going forward. A property that already advertises an amenity keeps it until someone edits that listing directly.' },
  { id: 'help-pricing-fallback', category: 'Properties', title: 'How a price’s fees and deposit are decided', body: 'If a listing doesn’t set its own cleaning fee or deposit, the platform falls back to that country’s fee configuration; if the country hasn’t set one either, it falls back to the global region + property-type rule. If a fee looks unexpected, check all three levels before assuming it’s wrong.' },
  { id: 'help-global-pricing-rules', category: 'Properties', title: 'Global pricing & seasonal rules are Level 1 only', body: 'The Global Deposit & Seasonal Rules panel (under Pricing & Availability) can only be changed by a Super Admin, and rules can only be added or replaced — there’s no delete. Retiring a rule means superseding it, not removing it.' },
  { id: 'help-property-review', category: 'Properties', title: 'Moderating a guest review', body: 'Property Review shows reviews one listing at a time — there’s no cross-property feed. You can respond once per review, or flag it with a reason; a flag can’t be undone from this screen.' },

  // Bookings & guests
  { id: 'help-booking-statuses', category: 'Bookings & guests', title: 'Booking statuses and what moves them along', body: 'A booking runs pending_payment → pending_approval / pending_kyc → confirmed → active → completed, or can be cancelled/refunded at any point along the way. "Active" means the guest has checked in; once active, a booking can no longer be cancelled from the portal.' },
  { id: 'help-refund-amount', category: 'Bookings & guests', title: 'Refunding a booking', body: 'There’s no "refund everything" button — an amount and currency are always required. Leaving the amount field blank in the refund dialog defaults it to the booking’s full total, not a partial guess.' },
  { id: 'help-cancelled-refund-status', category: 'Bookings & guests', title: 'Why a cancelled booking’s payment status can look inconsistent', body: 'A cancelled booking’s status never automatically flips to "refunded" on the server, even after a refund is issued. Always check the Payments ledger for the real refund record rather than reading it off the booking’s status badge.' },
  { id: 'help-guest-detail-loads-on-open', category: 'Bookings & guests', title: 'Guest list vs. guest detail', body: 'The Guests list only shows name, email, active/inactive and join date. Phone number, KYC status and stay statistics are a separate lookup that only loads once you open a specific guest’s record.' },
  { id: 'help-invoice', category: 'Bookings & guests', title: 'Viewing and downloading a booking’s invoice', body: 'Open a booking from the Bookings table and click "View invoice" next to Payments. It opens a printable receipt with the guest, property, stay, line items and settled payments — use your browser’s Print dialog and choose "Save as PDF" to download it. The company name, support email and legal address shown on it come from Settings → Invoicing.' },

  // Check-in & check-out
  { id: 'help-inspection-photo-tagging', category: 'Check-in & check-out', title: 'Tagging room-inspection photos', body: 'Add one or more photos from the check-in/check-out screen, then use the dropdown that appears next to each one to say which room or area it’s of — the same way property-listing photos are tagged. Nothing is sent to the server until you tap "Upload", so it’s safe to fix a wrongly-guessed room before it’s saved.' },
  { id: 'help-inspection-min-photos', category: 'Check-in & check-out', title: 'How many inspection photos you need, and why', body: 'At least 4 of the 7 room areas need a photo before you can continue past the photograph step — this is the condition record both parties rely on if a damage or deposit dispute comes up later. Every photo is server-timestamped at the moment it’s uploaded, not when it was taken.' },
  { id: 'help-checkout-report-flow', category: 'Check-in & check-out', title: 'Checkout reports: from damage log to deposit release', body: 'A checkout report compares check-in and check-out photos side by side, then lets you log itemized damage. Only items you explicitly mark "Deduct" count against the deposit — clicking "Generate report" deducts those items and auto-releases whatever remains of the deposit, all in one action, so review the deduction list carefully before generating it.' },
  { id: 'help-manual-deposit-override', category: 'Check-in & check-out', title: 'Manual deposit override', body: 'A Super Admin can capture, deduct from, or release a deposit directly from the Checkout Reports screen, bypassing the report-generation flow entirely. Use this only when the normal report process doesn’t fit the situation — it skips the itemized damage record.' },

  // Contracts & compliance
  { id: 'help-contract-required-vs-template', category: 'Contracts & compliance', title: 'When a signed contract is actually required', body: 'A signed contract (via Dropbox Sign) is only required for stays of 183 nights (about 6 months) or longer — anything shorter only ever needs the guest’s own booking-agreement checkbox from checkout, full stop. The jurisdiction × duration matrix on the Contracts screen only decides which template gets used once a stay already clears that 183-night bar; it doesn’t decide whether a contract is needed at all.' },
  { id: 'help-pending-kyc', category: 'Contracts & compliance', title: 'A booking stuck on Pending KYC', body: 'The guest hasn’t completed identity verification yet. There’s currently no working "send a reminder" action from the booking drawer — the KYC/contract reminder intervals in Settings describe timing configuration only, not an action you can trigger by hand today.' },

  // Housekeeping & maintenance
  { id: 'help-housekeeping-l3-scope', category: 'Housekeeping & maintenance', title: 'Housekeeping is a Level 3 cleaner’s whole world', body: 'A cleaner (Level 3) sees nothing but Housekeeping, Units, Notifications and Help — no guest names, no booking details, no financial data anywhere. That’s not a gap in what they can see; it’s the intended scope for that role.' },
  { id: 'help-ticket-lifecycle', category: 'Housekeeping & maintenance', title: 'Maintenance ticket lifecycle', body: 'A ticket moves open → assigned → in_progress → resolved → closed, carries a priority (low/medium/high/urgent), and links to exactly one Property or Space — never both. Cost entries (materials/labor/other) and photo attachments can be added at any point, though resolution notes are really meant to be filled in once a ticket reaches Resolved or Closed.' },
  { id: 'help-maintenance-dashboard-fallback', category: 'Housekeeping & maintenance', title: 'When the Maintenance Dashboard’s property breakdown is missing', body: 'If the per-property cost breakdown table shows a fallback message instead of data, that endpoint isn’t available yet — check each property’s own Maintenance tab individually instead.' },

  // Spaces
  { id: 'help-spaces-vs-bookings', category: 'Spaces', title: 'Spaces is a separate system from Properties/Bookings', body: 'Spaces is its own booking system for bookable venues — meeting rooms, event halls, studios — priced and booked by the hour, half-day, full-day or a custom duration, not by the night. It has its own statuses, its own calendar, and its own approval flow; none of it shares a table with the guest-stay Bookings feature.' },
  { id: 'help-spaces-booking-mode', category: 'Spaces', title: 'Instant vs. request booking mode', body: 'A Space set to "instant" auto-confirms a booking the moment it’s paid for. One set to "request" needs a host decision from the Approval Queue — and if no decision is made within the space’s approval window (24 hours by default), the request auto-expires on its own.' },
  { id: 'help-spaces-editing', category: 'Spaces', title: 'Editing a Space’s hours, layouts or add-ons', body: 'Layouts, add-ons, operating hours and blackout dates are create-and-delete only — there’s no in-place update. To change a set of hours, add the new one and delete the old one; you can’t edit a row directly.' },
  { id: 'help-spaces-approval-expiry-lazy', category: 'Spaces', title: 'The approval queue’s countdown isn’t live', body: 'An "Overdue" request in the Space Approval Queue is only detected the next time the queue is loaded or a background job runs — it’s not a running timer ticking down in real time. Refresh the page if a countdown looks stuck.' },

  // Finance & payments
  { id: 'help-payments-ledger', category: 'Finance & payments', title: 'Reading the Payments ledger', body: 'Every transaction type shows up here — payment, deposit pre-auth/charge/capture/release, refund, and referencing fee — filterable by booking, status or provider. Card numbers are never stored or shown anywhere in the portal; transactions are only ever referenced by the payment provider’s own token.' },
  { id: 'help-deposit-lifecycle', category: 'Finance & payments', title: 'Deposit lifecycle: hold, capture, release, deduct', body: 'How a deposit is secured depends on the payment provider, not a portal setting: Stripe holds it as a pre-authorization that then needs a separate "Capture" action, while Flutterwave charges it outright up front (shown as already fully captured, with no Capture button — that’s expected, not missing functionality). Either way, it’s eventually released in full, released in part after damage deductions, or deducted against via a checkout report.' },
  { id: 'help-payouts-gross-net', category: 'Finance & payments', title: 'Payouts: gross, commission, net', body: 'Payouts run monthly in arrears. Gross is what the guest paid, commission is the Alotel share, and net is what actually reaches the host’s account. Scheduling and releasing a payout are both Super Admin-only actions.' },
  { id: 'help-card-numbers', category: 'Finance & payments', title: 'Card numbers are never visible', body: 'No admin at any level can view a full card number anywhere in the portal — this is enforced in the data layer itself, not by a permission that could be granted. There is no screen capable of rendering one.' },

  // Tax
  { id: 'help-tax-rules-fresh', category: 'Tax', title: 'Tax rules apply going forward, not retroactively', body: 'Every price is calculated fresh against whatever tax rules are active at that moment — changing a rule doesn’t rewrite bookings that were already quoted under the old one. Rules can also stack (a state tax and a city tax can both apply to the same booking).' },
  { id: 'help-tax-ai-csv-approval', category: 'Tax', title: 'AI-suggested and CSV-imported tax rules need approval first', body: 'A rule sourced from the AI Tax Companion or a bulk CSV import lands in a pending/needs-review state — it can never go live on its own. A human always has to move it to Active before it affects a single price.' },
  { id: 'help-tax-segment-not-enforced', category: 'Tax', title: 'Guest-segment tax scoping isn’t enforced yet', body: 'A tax rule can be scoped to a guest segment in the builder, but the pricing engine doesn’t actually check segment yet — a matched rule currently applies to every guest regardless of the segment it’s set to. Don’t rely on segment scoping to exclude anyone until this is confirmed fixed.' },

  // Staff & access
  { id: 'help-staff-levels', category: 'Staff & access', title: 'What each staff level can see', body: 'Level 1 (Super Admin) has unrestricted access. Level 2 (Facility Manager) runs day-to-day operations — properties, bookings, check-in/out, contracts, housekeeping, calendar, cancellations, and Spaces and Maintenance management — but has no access to financials, tax rules, staff administration or the audit log. Level 3 (cleaner) sees Housekeeping and unit status only, with no guest personal data at all.' },
  { id: 'help-staff-create', category: 'Staff & access', title: 'Creating a staff account', body: 'New Level 2 and Level 3 accounts are created from the Staff screen (Super Admin only) and get a one-time temporary password shown exactly once at creation — make sure it’s captured or shared securely then, since it can’t be retrieved again afterward.' },
  { id: 'help-audit-log-immutable', category: 'Staff & access', title: 'The audit log can’t be edited by anyone', body: 'Every admin API request — method, path, status, duration, IP — is logged and kept for 7 years. It cannot be edited or deleted by anyone, including a Super Admin; an export request has to go through the compliance team.' },

  // Settings & invoicing
  { id: 'help-deposit-automation-settings', category: 'Settings & invoicing', title: 'Deposit & payment automation settings', body: '"Auto-release deposits" releases a deposit automatically if no damage is logged within 48 hours of checkout. "Stripe pre-authorisation" controls whether stays under 4 weeks hold rather than charge the deposit, in every market except Nigeria (which always charges via Flutterwave).' },
  { id: 'help-invoicing-settings', category: 'Settings & invoicing', title: 'Setting up the invoice footer', body: 'The company name, support email and legal address shown at the bottom of every booking invoice come from Settings → Invoicing. Until these are set, invoices show a generic fallback — set them once and every invoice generated afterward picks them up automatically.' },
  { id: 'help-2fa', category: 'Settings & invoicing', title: 'Why two-factor authentication shouldn’t stay off', body: 'With 2FA disabled, every admin account can sign in with a password alone. The Settings screen shows a visible warning banner whenever this is the case — treat it as a real prompt to re-enable it, not routine noise.' },
];
