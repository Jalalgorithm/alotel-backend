/**
 * Property catalogue: listings, units, amenities, guest reviews and the
 * pricing rules that sit on top of them.
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

/* -------------------------------------------------------------------------- */
/* Units & rooms                                                               */
/* -------------------------------------------------------------------------- */

export const units = [
  { id: 'U-1A', label: 'Unit 1A', propertyId: 'AS-1043', property: 'Studio Apartment', floor: '1st', status: 'Needs Cleaning', note: 'Checkout today 10:00', beds: 1, baths: 1, lastCleaned: '2026-08-02T11:00:00.000Z' },
  { id: 'U-2B', label: 'Unit 2B', propertyId: 'AS-1049', property: 'VI Luxury Flat', floor: '2nd', status: 'Ready', note: 'Check-in Aug 5, 15:00', beds: 2, baths: 2, lastCleaned: '2026-08-04T07:20:00.000Z' },
  { id: 'U-3C', label: 'Unit 3C', propertyId: 'AS-1047', property: 'Canary Wharf Studio', floor: '3rd', status: 'Occupied', note: 'Guest until Aug 12', beds: 1, baths: 1, lastCleaned: '2026-08-01T09:30:00.000Z' },
  { id: 'U-4A', label: 'Unit 4A', propertyId: 'AS-1045', property: 'Gothic Quarter 2-Bed', floor: '4th', status: 'Maintenance', note: 'Blocked — leaking tap', beds: 2, baths: 1, lastCleaned: '2026-07-30T13:00:00.000Z' },
  { id: 'U-5B', label: 'Unit 5B', propertyId: 'AS-1043', property: 'Studio Apartment', floor: '5th', status: 'Ready', note: 'Available', beds: 1, baths: 1, lastCleaned: '2026-08-03T16:10:00.000Z' },
  { id: 'U-6D', label: 'Unit 6D', propertyId: 'AS-1046', property: 'Dubai Marina Suite', floor: '6th', status: 'Needs Cleaning', note: 'Checkout today 11:00', beds: 2, baths: 2, lastCleaned: '2026-08-01T12:00:00.000Z' },
  { id: 'U-7E', label: 'Unit 7E', propertyId: 'AS-1049', property: 'VI Luxury Flat', floor: '7th', status: 'Occupied', note: 'Guest until Aug 9', beds: 2, baths: 2, lastCleaned: '2026-08-02T08:45:00.000Z' },
  { id: 'U-8F', label: 'Unit 8F', propertyId: 'AS-1048', property: 'Manhattan Studio', floor: '8th', status: 'Ready', note: 'Available', beds: 1, baths: 1, lastCleaned: '2026-08-03T18:20:00.000Z' },
  { id: 'U-9A', label: 'Unit 9A', propertyId: 'AS-1042', property: '3-Bedroom Penthouse', floor: 'PH', status: 'Ready', note: 'Available', beds: 3, baths: 3, lastCleaned: '2026-08-04T06:00:00.000Z' },
  { id: 'U-10B', label: 'Unit 10B', propertyId: 'AS-1044', property: '2-Bedroom Apartment', floor: '2nd', status: 'Needs Cleaning', note: 'Checkout today 12:00', beds: 2, baths: 2, lastCleaned: '2026-08-01T10:15:00.000Z' },
];

export const UNIT_STATUSES = ['Ready', 'Needs Cleaning', 'Occupied', 'Maintenance'];

/* -------------------------------------------------------------------------- */
/* Amenities                                                                   */
/* -------------------------------------------------------------------------- */

export const amenityGroups = [
  {
    id: 'tech',
    label: 'Tech & Comfort',
    items: ['High-speed WiFi', 'Smart TV', 'Air conditioning', 'Central heating', 'Smart thermostat', 'Washing machine', 'Dryer', 'Dishwasher'],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    items: ['Full kitchen', 'Microwave', 'Coffee machine', 'Dining table', 'Plates & cookware'],
  },
  {
    id: 'security',
    label: 'Security',
    items: ['Smart lock / keyless entry', 'Video doorbell', 'Alarm system', 'CCTV (exterior)', 'Safe / lockbox'],
  },
  {
    id: 'building',
    label: 'Building & Outdoor',
    items: ['Secure parking', 'Balcony', 'Garden', 'Pool access', 'Gym access', 'Concierge', 'Bike storage'],
  },
];

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

/** Which amenities are currently enabled portfolio-wide. */
export const enabledAmenities = [
  'High-speed WiFi',
  'Smart TV',
  'Air conditioning',
  'Washing machine',
  'Full kitchen',
  'Coffee machine',
  'Smart lock / keyless entry',
  'CCTV (exterior)',
  'Secure parking',
  'Concierge',
];

/* -------------------------------------------------------------------------- */
/* Property reviews (moderation queue)                                         */
/* -------------------------------------------------------------------------- */

export const propertyReviews = [
  { id: 'rev_01', guest: 'Eleanor Thompson', initials: 'ET', color: '#2a78d6', property: 'Canary Wharf Studio', rating: 5, comment: 'Immaculate, and the check-in was completely seamless. Would book again without hesitation.', submittedAt: '2026-08-03T19:20:00.000Z', status: 'Pending' },
  { id: 'rev_02', guest: 'Marcus Chen', initials: 'MC', color: '#eb6834', property: 'Dubai Marina Suite', rating: 4, comment: 'Great location for business. Wifi dropped twice during a call.', submittedAt: '2026-08-03T12:05:00.000Z', status: 'Pending' },
  { id: 'rev_03', guest: 'Amina Okafor', initials: 'AO', color: '#6D28D9', property: 'VI Luxury Flat', rating: 5, comment: 'Felt like a five-star hotel with the privacy of a home. The concierge was outstanding.', submittedAt: '2026-08-02T16:40:00.000Z', status: 'Approved' },
  { id: 'rev_04', guest: 'Pierre Martin', initials: 'PM', color: '#1baf7a', property: 'Gothic Quarter 2-Bed', rating: 2, comment: 'Listing said lift access — there was no working lift for the whole stay.', submittedAt: '2026-08-02T09:15:00.000Z', status: 'Pending' },
  { id: 'rev_05', guest: 'David Chen', initials: 'DC', color: '#0F766E', property: 'Manhattan Studio', rating: 4, comment: 'Compact but well designed. Would have liked a proper desk.', submittedAt: '2026-08-01T21:30:00.000Z', status: 'Approved' },
  { id: 'rev_06', guest: 'Sofia Reyes', initials: 'SR', color: '#BE185D', property: 'Sevilla Casa', rating: 1, comment: 'Contains contact details and an off-platform booking request.', submittedAt: '2026-08-01T08:00:00.000Z', status: 'Rejected' },
];

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

/** Corporate long-stay discount ladder. `DR` = daily rate. */
export const discountTiers = [
  { id: 'weekly', period: 'Weekly', nights: 7, percent: 5 },
  { id: 'monthly', period: 'Monthly', nights: 30, percent: 12 },
  { id: 'quarterly', period: '3 Months', nights: 90, percent: 18 },
  { id: 'biannual', period: '6 Months', nights: 180, percent: 22 },
  { id: 'annual', period: '12 Months', nights: 365, percent: 28 },
];

export const depositDefaults = [
  { id: 'dep_studio', tier: 'Room / Studio', amount: 150 },
  { id: 'dep_small', tier: '1–2 Bedroom', amount: 250 },
  { id: 'dep_large', tier: '3+ Bedroom / Premium', amount: 350 },
  { id: 'dep_lux', tier: 'Luxury / Corporate', amount: 500 },
];

export const seasonalRules = [
  { id: 'season_xmas', label: 'Christmas week (Dec 20 – Jan 2)', adjustment: 20, active: true },
  { id: 'season_easter', label: 'Easter weekend', adjustment: 15, active: true },
  { id: 'season_summer', label: 'Summer peak (Jul–Aug)', adjustment: 10, active: false },
  { id: 'season_ramadan', label: 'Ramadan (UAE portfolio)', adjustment: -8, active: true },
];
