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
  { id: 'help_01', category: 'Getting started', title: 'Publishing your first property', body: 'Use Add Property from the topbar. A listing needs at least five photos, a nightly rate and a classification before it can go live. Drafts are saved automatically at each wizard step.' },
  { id: 'help_02', category: 'Getting started', title: 'Understanding property classification', body: 'Classification is internal only and never shown to guests. It determines the revenue split, the compliance path and which reports the property appears in.' },
  { id: 'help_03', category: 'Bookings', title: 'Why a booking is stuck on Pending KYC', body: 'The guest has not completed identity verification. Send a reminder from the booking drawer; if it is still incomplete 72 hours before check-in, the booking can be cancelled without penalty.' },
  { id: 'help_04', category: 'Bookings', title: 'How contract type is chosen', body: 'Contract type is derived from stay length and jurisdiction — see the matrix on the Contracts screen. Under 4 weeks is always a short-stay licence; over 26 weeks moves to a tenancy or lease.' },
  { id: 'help_05', category: 'Finance', title: 'When deposits are released', body: 'If no damage is logged within 48 hours of check-out, the deposit is released automatically. Logging any damage pauses the automation until an admin decides.' },
  { id: 'help_06', category: 'Finance', title: 'Reading the payout schedule', body: 'Payouts run monthly in arrears. Gross is guest revenue, commission is the Alotel share, net is what reaches the owner account.' },
  { id: 'help_07', category: 'Access', title: 'What each staff level can see', body: 'Level 1 has unrestricted access. Level 2 runs operations but sees no financials, tax rules, staff administration or audit log. Level 3 sees room status only, with no guest personal data.' },
  { id: 'help_08', category: 'Access', title: 'Card numbers are never visible', body: 'No admin at any level can view full card numbers. This is enforced in the data layer, not by permissions — there is no screen that can display them.' },
];
