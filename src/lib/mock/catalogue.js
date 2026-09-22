/**
 * Property catalogue: listings, guest reviews and the pricing rules that sit
 * on top of them.
 */

export const properties = [
  { id: 'AS-1042', name: '3-Bedroom Penthouse', type: 'Penthouse', city: 'Lekki', country: 'Nigeria', classification: 'Alotel', currency: 'NGN', rate: 185000, status: 'Live', beds: 3, baths: 3, maxGuests: 6, units: 4, occupancy: 85, rating: 4.9, reviews: 42, accessibility: ['Step-free', 'Lift'], emoji: '🏙️' },
  { id: 'AS-1043', name: 'Studio Apartment', type: 'Studio', city: 'Victoria Island', country: 'Nigeria', classification: 'Alotel', currency: 'NGN', rate: 62000, status: 'Live', beds: 0, baths: 1, maxGuests: 2, units: 8, occupancy: 78, rating: 4.7, reviews: 61, accessibility: ['Step-free'], emoji: '🏢' },
  { id: 'AS-1044', name: '2-Bedroom Apartment', type: '2-Bed Flat', city: 'Ikoyi', country: 'Nigeria', classification: 'Third-Party', currency: 'NGN', rate: 128000, status: 'Live', beds: 2, baths: 2, maxGuests: 4, units: 6, occupancy: 72, rating: 4.6, reviews: 28, accessibility: ['Lift', 'Wide doors'], emoji: '🌇' },
  { id: 'AS-1045', name: 'Gothic Quarter 2-Bed', type: '2-Bed Flat', city: 'Barcelona', country: 'Spain', classification: 'Third-Party', currency: 'EUR', rate: 185, status: 'Live', beds: 2, baths: 1, maxGuests: 4, units: 3, occupancy: 74, rating: 4.8, reviews: 55, accessibility: ['Lift', 'Wide doors', 'Grab bars'], emoji: '🏛️' },
  { id: 'AS-1046', name: 'Dubai Marina Suite', type: 'Luxury Suite', city: 'Dubai', country: 'UAE', classification: 'Third-Party Social', currency: 'AED', rate: 950, status: 'Draft', beds: 2, baths: 2, maxGuests: 3, units: 2, occupancy: 0, rating: 0, reviews: 0, accessibility: [], emoji: '🌴' },
  { id: 'AS-1047', name: 'Canary Wharf Studio', type: 'Studio', city: 'London', country: 'UK', classification: 'Alotel', currency: 'GBP', rate: 120, status: 'Live', beds: 0, baths: 1, maxGuests: 2, units: 5, occupancy: 91, rating: 4.9, reviews: 73, accessibility: ['Step-free'], emoji: '🌿' },
  { id: 'AS-1048', name: 'Manhattan Studio', type: 'Studio', city: 'New York', country: 'USA', classification: 'Third-Party', currency: 'USD', rate: 150, status: 'Live', beds: 0, baths: 1, maxGuests: 2, units: 4, occupancy: 60, rating: 4.4, reviews: 19, accessibility: [], emoji: '🗽' },
  { id: 'AS-1049', name: 'VI Luxury Flat', type: '2-Bed Flat', city: 'Lagos', country: 'Nigeria', classification: 'Alotel', currency: 'NGN', rate: 145000, status: 'Live', beds: 2, baths: 2, maxGuests: 5, units: 3, occupancy: 78, rating: 4.8, reviews: 37, accessibility: ['Lift', 'Wide doors'], emoji: '🏝️' },
  { id: 'AS-1050', name: 'Abuja Garden Villa', type: 'House', city: 'Abuja', country: 'Nigeria', classification: 'Alotel', currency: 'NGN', rate: 210000, status: 'Paused', beds: 4, baths: 3, maxGuests: 8, units: 1, occupancy: 44, rating: 4.5, reviews: 12, accessibility: ['Step-free', 'Accessible parking'], emoji: '🏡' },
  { id: 'AS-1051', name: 'Sevilla Casa', type: 'House', city: 'Seville', country: 'Spain', classification: 'Third-Party', currency: 'EUR', rate: 140, status: 'Live', beds: 3, baths: 2, maxGuests: 6, units: 2, occupancy: 66, rating: 4.7, reviews: 31, accessibility: [], emoji: '🌞' },
];

export const PROPERTY_TYPES = ['All', 'Studio', '1-Bed Flat', '2-Bed Flat', '3-Bed Flat', 'House', 'Duplex', 'Penthouse', 'Luxury Suite'];
export const CLASSIFICATIONS = ['Alotel', 'Third-Party', 'Third-Party Social'];
export const COUNTRIES = ['Nigeria', 'Spain', 'UK', 'UAE', 'USA'];

export const accessibilityFeatures = [
  'Step-free / ramped entry',
  'Wheelchair accessible throughout',
  'Wide doorways (min 80cm)',
  'Lift / elevator to unit',
  'Ground floor unit',
  'Accessible parking',
  'Grab bars (toilet + shower)',
  'Roll-in shower / wet room',
  'Shower chair available',
  'Visual fire alarm (strobe)',
  'Audio fire alarm',
  'Lever door handles',
  'Hearing loop',
  'Service animals allowed',
];

/* -------------------------------------------------------------------------- */
/* Property reviews (moderation queue)                                         */
/* -------------------------------------------------------------------------- */

/** Mirrors `Review` — no per-property scoping in the mock (the real endpoint is per-listing); `isFlagged` reviews are excluded, same as the public endpoint. */
export const propertyReviews = [
  { id: 'rev_01', guest: 'Eleanor Thompson', initials: 'ET', color: '#2a78d6', property: 'Canary Wharf Studio', rating: 5, comment: 'Immaculate, and the check-in was completely seamless. Would book again without hesitation.', submittedAt: '2026-08-03T19:20:00.000Z', isFlagged: false, flagReason: '' },
  { id: 'rev_02', guest: 'Marcus Chen', initials: 'MC', color: '#eb6834', property: 'Dubai Marina Suite', rating: 4, comment: 'Great location for business. Wifi dropped twice during a call.', submittedAt: '2026-08-03T12:05:00.000Z', isFlagged: false, flagReason: '' },
  { id: 'rev_03', guest: 'Amina Okafor', initials: 'AO', color: '#6D28D9', property: 'VI Luxury Flat', rating: 5, comment: 'Felt like a five-star hotel with the privacy of a home. The concierge was outstanding.', submittedAt: '2026-08-02T16:40:00.000Z', isFlagged: false, flagReason: '' },
  { id: 'rev_04', guest: 'Pierre Martin', initials: 'PM', color: '#1baf7a', property: 'Gothic Quarter 2-Bed', rating: 2, comment: 'Listing said lift access — there was no working lift for the whole stay.', submittedAt: '2026-08-02T09:15:00.000Z', isFlagged: false, flagReason: '' },
];

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

/** Corporate long-stay discount ladder. `DR` = daily rate. */
/**
 * Fixtures below mirror the real API's wire shape (`DiscountRule`,
 * `PricingConfiguration`, `PricingRuleConfig`) so the mock and real backends
 * feed the same normalisers in `@/lib/pricingSchema`.
 */
export const discountRules = [
  {
    id: 'disc_ng',
    country: 'Nigeria',
    name: 'Long-stay promo',
    percentage: 12,
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    isActive: true,
    createdAt: '2026-05-20T09:00:00.000Z',
    updatedAt: '2026-05-20T09:00:00.000Z',
  },
  {
    id: 'disc_uk',
    country: 'UK',
    name: 'Winter early-bird',
    percentage: 8,
    startDate: '2026-11-01',
    endDate: '2027-02-28',
    isActive: false,
    createdAt: '2026-05-10T09:00:00.000Z',
    updatedAt: '2026-05-10T09:00:00.000Z',
  },
];

export const pricingConfigs = [
  {
    id: 'pconf_ng',
    country: 'Nigeria',
    currency: 'NGN',
    cleaningFee: 15000,
    securityDeposit: 50000,
    isActive: true,
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
  },
  {
    id: 'pconf_uk',
    country: 'UK',
    currency: 'GBP',
    cleaningFee: 40,
    securityDeposit: 150,
    isActive: true,
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
  },
];

export const pricingRules = [
  {
    id: 'prule_all_studio',
    region: 'ALL',
    property_type: 'Studio',
    default_security_deposit: 150,
    deposit_currency: 'GBP',
    default_cleaning_fee: 40,
    seasonal_price_rules: [{ label: 'Christmas', start: '12-20', end: '01-02', multiplier: 1.2 }],
    updated_by: null,
    created_at: '2026-05-01T09:00:00.000Z',
    updated_at: '2026-05-01T09:00:00.000Z',
  },
  {
    id: 'prule_ae_luxury',
    region: 'AE',
    property_type: 'Luxury Suite',
    default_security_deposit: 500,
    deposit_currency: 'AED',
    default_cleaning_fee: 120,
    seasonal_price_rules: [],
    updated_by: null,
    created_at: '2026-05-01T09:00:00.000Z',
    updated_at: '2026-05-01T09:00:00.000Z',
  },
];
