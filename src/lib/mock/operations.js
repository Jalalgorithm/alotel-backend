/**
 * Operational data: bookings, guests, verification queue, contracts,
 * check-out reports, cancellations and maintenance.
 */

export const bookings = [
  { id: 'AS-8821', guest: 'Jamila Amara', initials: 'JA', color: '#12603F', email: 'j.amara@gmail.com', phone: '+234 803 111 2233', propertyId: 'AS-1042', property: '3-Bedroom Penthouse', city: 'Lekki', country: 'Nigeria', checkIn: '2026-08-06', checkOut: '2026-08-13', nights: 7, currency: 'NGN', amount: 1295000, kyc: 'Verified', contract: 'Signed', status: 'Confirmed', duration: 'short', deposit: 45000, channel: 'Direct' },
  { id: 'AS-8822', guest: 'Pierre Martin', initials: 'PM', color: '#2a78d6', email: 'p.martin@outlook.fr', phone: '+33 6 12 34 56 78', propertyId: 'AS-1045', property: 'Gothic Quarter 2-Bed', city: 'Barcelona', country: 'Spain', checkIn: '2026-08-07', checkOut: '2026-08-17', nights: 10, currency: 'EUR', amount: 1850, kyc: 'Pending', contract: 'Not sent', status: 'Pending KYC', duration: 'short', deposit: 250, channel: 'Platform' },
  { id: 'AS-8823', guest: 'Sana Khan', initials: 'SK', color: '#6D28D9', email: 's.khan@gmail.com', phone: '+971 50 998 1122', propertyId: 'AS-1046', property: 'Dubai Marina Suite', city: 'Dubai', country: 'UAE', checkIn: '2026-08-08', checkOut: '2026-08-22', nights: 14, currency: 'AED', amount: 13300, kyc: 'Verified', contract: 'Overdue', status: 'Awaiting Sign', duration: 'short', deposit: 500, channel: 'Corporate' },
  { id: 'AS-8824', guest: 'Emmanuel Okafor', initials: 'EO', color: '#eb6834', email: 'e.okafor@gmail.com', phone: '+44 7700 900456', propertyId: 'AS-1047', property: 'Canary Wharf Studio', city: 'London', country: 'UK', checkIn: '2026-08-05', checkOut: '2026-08-09', nights: 4, currency: 'GBP', amount: 520, kyc: 'Verified', contract: 'Signed', status: 'Confirmed', duration: 'short', deposit: 150, channel: 'Direct' },
  { id: 'AS-8819', guest: 'Sofia Reyes', initials: 'SR', color: '#BE185D', email: 's.reyes@gmail.com', phone: '+34 612 998 776', propertyId: 'AS-1045', property: 'Eixample 1-Bed', city: 'Barcelona', country: 'Spain', checkIn: '2026-03-01', checkOut: '2026-09-01', nights: 184, currency: 'EUR', amount: 16200, kyc: 'Full KYC', contract: 'Signed', status: 'Active', duration: 'long', deposit: 350, channel: 'Corporate' },
  { id: 'AS-8818', guest: 'David Chen', initials: 'DC', color: '#0F766E', email: 'd.chen@gmail.com', phone: '+1 917 555 0199', propertyId: 'AS-1048', property: 'Manhattan Studio', city: 'New York', country: 'USA', checkIn: '2026-07-28', checkOut: '2026-08-04', nights: 7, currency: 'USD', amount: 1050, kyc: 'Verified', contract: 'Signed', status: 'Active', duration: 'short', deposit: 150, channel: 'Platform' },
  { id: 'AS-8817', guest: 'Aisha Balogun', initials: 'AB', color: '#7C3AED', email: 'a.balogun@gmail.com', phone: '+234 802 445 6677', propertyId: 'AS-1049', property: 'VI Luxury Flat', city: 'Lagos', country: 'Nigeria', checkIn: '2026-07-20', checkOut: '2026-07-27', nights: 7, currency: 'NGN', amount: 1015000, kyc: 'Verified', contract: 'Signed', status: 'Completed', duration: 'short', deposit: 45000, channel: 'Direct' },
  { id: 'AS-8816', guest: 'Marco Ferrari', initials: 'MF', color: '#eda100', email: 'm.ferrari@gmail.it', phone: '+39 333 221 4455', propertyId: 'AS-1051', property: 'Sevilla Casa', city: 'Seville', country: 'Spain', checkIn: '2026-07-10', checkOut: '2026-07-22', nights: 12, currency: 'EUR', amount: 1680, kyc: 'Verified', contract: 'Signed', status: 'Cancelled', duration: 'short', deposit: 250, channel: 'Platform' },
  { id: 'AS-8815', guest: 'Grace Nwosu', initials: 'GN', color: '#1baf7a', email: 'g.nwosu@gmail.com', phone: '+234 809 332 1100', propertyId: 'AS-1043', property: 'Studio Apartment', city: 'Victoria Island', country: 'Nigeria', checkIn: '2026-08-09', checkOut: '2026-08-16', nights: 7, currency: 'NGN', amount: 434000, kyc: 'Pending', contract: 'Not sent', status: 'Pending KYC', duration: 'short', deposit: 45000, channel: 'Direct' },
  { id: 'AS-8814', guest: 'Tom Whitfield', initials: 'TW', color: '#B45309', email: 't.whitfield@gmail.com', phone: '+44 7700 900777', propertyId: 'AS-1047', property: 'Canary Wharf Studio', city: 'London', country: 'UK', checkIn: '2026-08-11', checkOut: '2026-08-18', nights: 7, currency: 'GBP', amount: 840, kyc: 'Verified', contract: 'Signed', status: 'Confirmed', duration: 'short', deposit: 150, channel: 'Corporate' },
];

export const BOOKING_STATUSES = ['All', 'Confirmed', 'Pending KYC', 'Awaiting Sign', 'Active', 'Completed', 'Cancelled'];

/* -------------------------------------------------------------------------- */
/* Guests                                                                      */
/* -------------------------------------------------------------------------- */

export const guests = [
  { id: 'gst_01', name: 'Jamila Amara', initials: 'JA', color: '#12603F', email: 'j.amara@gmail.com', phone: '+234 803 111 2233', country: 'Nigeria', kyc: 'Verified', stays: 4, nights: 26, lifetimeValue: 3820000, currency: 'NGN', joinedAt: '2025-04-12T09:00:00.000Z', segment: 'Returning' },
  { id: 'gst_02', name: 'Pierre Martin', initials: 'PM', color: '#2a78d6', email: 'p.martin@outlook.fr', phone: '+33 6 12 34 56 78', country: 'Spain', kyc: 'Pending', stays: 1, nights: 10, lifetimeValue: 1850, currency: 'EUR', joinedAt: '2026-07-30T09:00:00.000Z', segment: 'New' },
  { id: 'gst_03', name: 'Sana Khan', initials: 'SK', color: '#6D28D9', email: 's.khan@gmail.com', phone: '+971 50 998 1122', country: 'UAE', kyc: 'Verified', stays: 2, nights: 21, lifetimeValue: 24800, currency: 'AED', joinedAt: '2026-01-08T09:00:00.000Z', segment: 'Corporate' },
  { id: 'gst_04', name: 'Emmanuel Okafor', initials: 'EO', color: '#eb6834', email: 'e.okafor@gmail.com', phone: '+44 7700 900456', country: 'UK', kyc: 'Verified', stays: 6, nights: 34, lifetimeValue: 4180, currency: 'GBP', joinedAt: '2024-11-02T09:00:00.000Z', segment: 'Returning' },
  { id: 'gst_05', name: 'Sofia Reyes', initials: 'SR', color: '#BE185D', email: 's.reyes@gmail.com', phone: '+34 612 998 776', country: 'Spain', kyc: 'Full KYC', stays: 1, nights: 184, lifetimeValue: 16200, currency: 'EUR', joinedAt: '2026-02-20T09:00:00.000Z', segment: 'Long-stay' },
  { id: 'gst_06', name: 'David Chen', initials: 'DC', color: '#0F766E', email: 'd.chen@gmail.com', phone: '+1 917 555 0199', country: 'USA', kyc: 'Verified', stays: 3, nights: 19, lifetimeValue: 2900, currency: 'USD', joinedAt: '2025-08-14T09:00:00.000Z', segment: 'Corporate' },
  { id: 'gst_07', name: 'Aisha Balogun', initials: 'AB', color: '#7C3AED', email: 'a.balogun@gmail.com', phone: '+234 802 445 6677', country: 'Nigeria', kyc: 'Verified', stays: 5, nights: 31, lifetimeValue: 4650000, currency: 'NGN', joinedAt: '2024-06-30T09:00:00.000Z', segment: 'Returning' },
  { id: 'gst_08', name: 'Grace Nwosu', initials: 'GN', color: '#1baf7a', email: 'g.nwosu@gmail.com', phone: '+234 809 332 1100', country: 'Nigeria', kyc: 'Pending', stays: 1, nights: 7, lifetimeValue: 434000, currency: 'NGN', joinedAt: '2026-08-01T09:00:00.000Z', segment: 'New' },
];

/* -------------------------------------------------------------------------- */
/* Verification queue (the dashboard's "Pending Verifications" panel)          */
/* -------------------------------------------------------------------------- */

export const verifications = [
  { id: 'ver_01', guest: 'Aisha Mohammed', initials: 'AM', color: '#eb6834', type: 'NIN Verification', submittedAt: '2026-08-04T08:05:00.000Z', status: 'Pending', document: 'nin-front.pdf', bookingId: 'AS-8821' },
  { id: 'ver_02', guest: 'Oluwaseun Peters', initials: 'OP', color: '#2a78d6', type: 'Passport Verification', submittedAt: '2026-08-04T06:40:00.000Z', status: 'Pending', document: 'passport.jpg', bookingId: 'AS-8815' },
  { id: 'ver_03', guest: 'David Okonkwo', initials: 'DO', color: '#6D28D9', type: 'Property Ownership Review', submittedAt: '2026-08-04T05:55:00.000Z', status: 'Pending', document: 'title-deed.pdf', bookingId: null },
  { id: 'ver_04', guest: 'Pierre Martin', initials: 'PM', color: '#1baf7a', type: "Driver's Licence", submittedAt: '2026-08-03T18:30:00.000Z', status: 'Pending', document: 'licence.png', bookingId: 'AS-8822' },
];

/* -------------------------------------------------------------------------- */
/* Check-ins today (dashboard panel)                                           */
/* -------------------------------------------------------------------------- */

export const checkInsToday = [
  { id: 'ci_01', guest: 'Jane Rose', initials: 'JR', color: '#12603F', property: '3BR Apartment, Lekki', time: '10:00 AM', bookingId: 'AS-8821' },
  { id: 'ci_02', guest: 'Alex Michael', initials: 'AM', color: '#2a78d6', property: 'Studio Apartment, Victoria Island', time: '2:00 PM', bookingId: 'AS-8815' },
  { id: 'ci_03', guest: 'Jane Rose', initials: 'JR', color: '#6D28D9', property: '3BR Apartment, Lekki', time: '10:00 AM', bookingId: 'AS-8824' },
  { id: 'ci_04', guest: 'Thelma Kingston', initials: 'TK', color: '#eb6834', property: '3BR Apartment, Abuja', time: '4:30 PM', bookingId: 'AS-8814' },
];

/* -------------------------------------------------------------------------- */
/* Maintenance requests (dashboard panel + housekeeping)                       */
/* -------------------------------------------------------------------------- */

export const maintenanceRequests = [
  { id: 'mnt_01', title: 'AC not cooling', property: '3-Bedroom Penthouse, Lekki', priority: 'High', reportedAt: '2026-08-04T07:10:00.000Z', status: 'Open', assignee: 'Kwame Asante' },
  { id: 'mnt_02', title: 'Power outage in Unit 12', property: '3-Bedroom Apartment, Lagos', priority: 'High', reportedAt: '2026-08-04T06:20:00.000Z', status: 'Open', assignee: 'Kwame Asante' },
  { id: 'mnt_03', title: 'Plumbing leak in bathroom', property: 'Studio Apartment, Abuja', priority: 'Medium', reportedAt: '2026-08-03T15:45:00.000Z', status: 'In Progress', assignee: 'Nnamdi Achebe' },
  { id: 'mnt_04', title: 'Light not working', property: '3-Bedroom Penthouse, Dubai', priority: 'Low', reportedAt: '2026-08-03T11:05:00.000Z', status: 'Open', assignee: 'Amira Mohammed' },
  { id: 'mnt_05', title: 'Lift out of service', property: 'Gothic Quarter 2-Bed, Barcelona', priority: 'High', reportedAt: '2026-08-02T09:15:00.000Z', status: 'In Progress', assignee: 'Rosa Sanchez' },
];

/* -------------------------------------------------------------------------- */
/* System announcements (dashboard panel)                                      */
/* -------------------------------------------------------------------------- */

export const announcements = [
  { id: 'ann_01', title: 'System Update', body: 'New payment gateway integration is now live.', date: '2026-08-16' },
  { id: 'ann_02', title: 'Tax Rule Update', body: 'New VAT rate for Spain properties takes effect 10%.', date: '2026-08-16' },
  { id: 'ann_03', title: 'Maintenance Window', body: 'System will be updated on Aug 20, 2026 (12AM–2AM WAT).', date: '2026-08-16' },
];

/* -------------------------------------------------------------------------- */
/* Contracts                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Contract type is derived from stay length and jurisdiction — this is the
 * matrix the Contracts screen renders and the resolver below applies.
 */
export const CONTRACT_MATRIX = [
  { duration: '< 4 weeks', UK: 'Short-Stay T&C', Spain: 'Short-Stay T&C', USA: 'Short-Stay T&C', UAE: 'Short-Stay T&C', Nigeria: 'Short-Stay T&C' },
  { duration: '4–26 weeks (Residential)', UK: 'Licence to Occupy', Spain: 'Seasonal Rental', USA: 'Short-Term Lease', UAE: 'Holiday Home', Nigeria: 'Short-Term Tenancy' },
  { duration: '4–26 weeks (Commercial)', UK: 'Commercial Licence', Spain: 'Commercial Licence', USA: 'Commercial Licence', UAE: 'Commercial Licence', Nigeria: 'Commercial Licence' },
  { duration: '> 26 weeks (Residential)', UK: 'AST / Licence', Spain: 'Long-Term Lease', USA: 'State Residential', UAE: 'Ejari Contract', Nigeria: 'Residential Tenancy' },
  { duration: '> 26 weeks (Commercial)', UK: 'Commercial Lease', Spain: 'Commercial Lease', USA: 'Commercial Lease', UAE: 'Ejari Commercial', Nigeria: 'Commercial Lease' },
];

/**
 * @param {number} nights
 * @param {string} country
 * @returns {string} the contract template that applies
 */
export const resolveContractType = (nights, country) => {
  const row = nights < 28 ? CONTRACT_MATRIX[0] : nights < 183 ? CONTRACT_MATRIX[1] : CONTRACT_MATRIX[3];
  return row[country] ?? row.UK;
};

export const CONTRACT_TEMPLATES = {
  'Short-Stay T&C': `SHORT-STAY LICENCE TO OCCUPY — ALOTEL SPACES

This agreement is entered into between Alotel Spaces Ltd ("Licensor") and the Guest ("Licensee") named in the booking confirmation.

1. NATURE OF OCCUPATION
This licence grants the Licensee a personal, non-exclusive right to occupy the Property for the stated dates only. It does not constitute a tenancy, lease, or any form of exclusive possession under the laws of England, Wales, Spain, UAE, USA, or Nigeria.

2. PAYMENT
The total licence fee, including all applicable taxes and service charges, is as stated in the booking summary. Payment is due in full prior to check-in.

3. SECURITY DEPOSIT
A refundable security deposit is required. For stays under 4 weeks this is held as a pre-authorisation charge only and released within 7 days of checkout if no damage is reported. For stays over 4 weeks the deposit is charged upfront and refunded within 14 days.

4. PROPERTY USE
The Licensee agrees to use the Property solely for lawful personal accommodation. Sub-licensing, events, smoking (except in designated areas), and pets (unless pre-approved) are strictly prohibited.

5. DAMAGE & LIABILITY
The Licensee is liable for any damage beyond fair wear and tear. Costs will be deducted from the security deposit and, if insufficient, invoiced separately.

6. TERMINATION
Alotel Spaces reserves the right to terminate this licence immediately for breach of these terms without refund.

7. DATA PROTECTION
Personal data is processed in accordance with our Privacy Policy and applicable law (UK GDPR / EU GDPR / NDPR / PDPL).`,

  'Licence to Occupy': `LICENCE TO OCCUPY — MEDIUM-TERM STAY

Alotel Spaces Ltd grants the named Occupier a personal licence to occupy the Property for the agreed term. This licence confers no tenancy and no exclusive possession.

1. TERM & FEE
The licence runs for the fixed term stated in the booking. The fee is payable monthly in advance.

2. SERVICES INCLUDED
Utilities, broadband, and fortnightly housekeeping are included unless stated otherwise.

3. ACCESS
The Licensor may access the Property with 24 hours notice for inspection and maintenance, and without notice in an emergency.

4. DEPOSIT
Charged upfront and refunded within 14 days of departure, less any deductions evidenced in the check-out report.

5. TERMINATION
Either party may terminate with 30 days written notice after the first month.`,

  'AST / Licence': `ASSURED SHORTHOLD TENANCY AGREEMENT

PARTIES
Landlord: Alotel Spaces Ltd (acting as agent) / Property Owner
Tenant: As named in the booking confirmation

PROPERTY: As detailed in the booking summary.
TERM: Commencing on the check-in date for the fixed term stated.
RENT: As agreed at time of booking, payable monthly in advance.

1. LANDLORD OBLIGATIONS
Maintain the property in good repair, keep gas safety certificates current, provide an EPC, protect the deposit in a government-approved scheme, and give 24 hours notice before access (except emergency).

2. TENANT OBLIGATIONS
Pay rent on time. Keep the property clean. Report maintenance issues promptly. Not sublet or assign without written consent. Not make alterations. Allow access for inspections with proper notice.

3. DEPOSIT
Protected under the Tenancy Deposit Scheme. Disputes resolved per TDP scheme rules.

4. RIGHT TO RENT (UK)
Tenant confirms their Right to Rent has been verified per the Immigration Act 2014.

5. BREAK CLAUSE
Either party may terminate with 2 months written notice after the first 6 months.

6. GOVERNING LAW
This agreement is governed by English law.`,
};

/* -------------------------------------------------------------------------- */
/* Check-out reports                                                           */
/* -------------------------------------------------------------------------- */

export const checkoutReports = [
  {
    id: 'cor_01',
    bookingId: 'AS-8817',
    guest: 'Aisha Balogun',
    initials: 'AB',
    color: '#7C3AED',
    property: 'VI Luxury Flat',
    city: 'Lagos',
    checkIn: '2026-07-20',
    checkOut: '2026-07-27',
    currency: 'NGN',
    deposit: 45000,
    status: 'Pending Review',
    windowClosesAt: '2026-08-04T18:00:00.000Z',
    checkInPhotos: [
      { room: 'Living Room', condition: 'good', at: '2026-07-20T15:04:00.000Z' },
      { room: 'Bedroom', condition: 'good', at: '2026-07-20T15:06:00.000Z' },
      { room: 'Kitchen', condition: 'good', at: '2026-07-20T15:08:00.000Z' },
      { room: 'Bathroom', condition: 'good', at: '2026-07-20T15:10:00.000Z' },
    ],
    checkOutPhotos: [
      { room: 'Living Room', condition: 'good', at: '2026-07-27T10:31:00.000Z' },
      { room: 'Bedroom', condition: 'warn', at: '2026-07-27T10:33:00.000Z' },
      { room: 'Kitchen', condition: 'good', at: '2026-07-27T10:35:00.000Z' },
      { room: 'Bathroom', condition: 'danger', at: '2026-07-27T10:37:00.000Z' },
    ],
    damages: [
      { id: 'dmg_01', room: 'Bedroom', description: 'Stained bed linen', severity: 'Minor', cost: 8500, deduct: true },
      { id: 'dmg_02', room: 'Bathroom', description: 'Cracked towel rail', severity: 'Moderate', cost: 22000, deduct: true },
    ],
  },
];

export const DAMAGE_SEVERITIES = ['Minor', 'Moderate', 'Major'];

/* -------------------------------------------------------------------------- */
/* Cancellations                                                               */
/* -------------------------------------------------------------------------- */

export const cancellations = [
  { id: 'cnc_01', bookingId: 'AS-8816', guest: 'Marco Ferrari', initials: 'MF', color: '#eda100', property: 'Sevilla Casa', cancelledAt: '2026-07-08T14:20:00.000Z', reason: 'Guest changed travel plans', noticeDays: 2, currency: 'EUR', bookingAmount: 1680, refundAmount: 1540, retained: 140, status: 'Refunded', policy: 'Within 14 days — first night retained' },
  { id: 'cnc_02', bookingId: 'AS-8809', guest: 'Helen Bakare', initials: 'HB', color: '#2a78d6', property: 'Studio Apartment', cancelledAt: '2026-07-19T09:05:00.000Z', reason: 'Flight cancelled', noticeDays: 21, currency: 'NGN', bookingAmount: 434000, refundAmount: 434000, retained: 0, status: 'Refunded', policy: 'More than 14 days — full refund' },
  { id: 'cnc_03', bookingId: 'AS-8812', guest: 'Yusuf Adeyemi', initials: 'YA', color: '#eb6834', property: '2-Bedroom Apartment', cancelledAt: '2026-08-02T16:40:00.000Z', reason: 'Duplicate booking', noticeDays: 9, currency: 'NGN', bookingAmount: 768000, refundAmount: 640000, retained: 128000, status: 'Processing', policy: 'Within 14 days — first night retained' },
  { id: 'cnc_04', bookingId: 'AS-8806', guest: 'Clara Mendes', initials: 'CM', color: '#1baf7a', property: 'Gothic Quarter 2-Bed', cancelledAt: '2026-08-03T10:12:00.000Z', reason: 'Property unavailable — maintenance', noticeDays: 5, currency: 'EUR', bookingAmount: 925, refundAmount: 925, retained: 0, status: 'Pending', policy: 'Operator-initiated — full refund' },
];
