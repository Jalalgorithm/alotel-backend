import { LOCATIONS } from './propertySchema';

/**
 * The tax vocabulary the API actually supports, and the translation to and
 * from the builder's form.
 *
 * The backend models one rule per country with a single percentage:
 *
 *   { id, country, name, percentage, createdAt, updatedAt }
 *
 * The builder collects rather more than that — a jurisdiction sub-region, a
 * guest segment, fixed-amount rules, a charge frequency and a separate
 * guest-facing label. None of those exist server-side yet, so they are kept in
 * the UI (they describe where this is going) but flagged as not applied. This
 * module is the single place that records which is which, so the distinction
 * can't quietly drift.
 */

/** Countries the API accepts — its `LOCATION_CHOICES`, not the mock's list. */
export const TAX_COUNTRIES = LOCATIONS;

/**
 * Fields the builder shows that the API cannot store yet.
 * Rendered as read-only with this explanation attached.
 */
export const UNSUPPORTED_FIELDS = {
  state: 'Sub-regions are not modelled yet — a rule applies to the whole country.',
  segment: 'Guest segments are not modelled yet — a rule applies to every guest.',
  type: 'Only percentage rules are applied. Fixed amounts are not supported yet.',
  frequency: 'Frequency is not modelled yet — tax is applied once per booking.',
  label: 'The rule name is what guests see; a separate label is not stored yet.',
  active: 'There is no on/off switch — a country either has a rule or it does not. Delete the rule to remove the tax.',
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Normalise one API tax rule into the shape the table renders.
 *
 * The unsupported columns are filled with honest constants rather than left
 * undefined, so the table reads as "this is what actually happens" instead of
 * showing gaps.
 */
export const toTaxRule = (raw) => ({
  id: raw.id,
  country: raw.country,
  name: raw.name || `${raw.country} tax`,
  percentage: toNumber(raw.percentage),

  /* Derived, not stored — see UNSUPPORTED_FIELDS. */
  state: '',
  segment: 'All Guests',
  type: 'Percentage',
  frequency: 'Per Booking',
  label: raw.name || `${raw.country} tax`,
  /** Existing means applied: the API has no inactive state. */
  active: true,

  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

/**
 * Build the create/update payload.
 *
 * Only the three supported fields are sent. `percentage` goes as a string to
 * match the serializer's DecimalField, the same way property rates do.
 */
export const toTaxPayload = ({ country, name, value, percentage }) => {
  const payload = {};

  if (country !== undefined) payload.country = country;
  if (name !== undefined) payload.name = name?.trim() ?? '';

  const rate = percentage ?? value;
  if (rate !== undefined && rate !== '') payload.percentage = String(Number(rate));

  return payload;
};

/** Countries that do not yet have a rule — the only ones a new rule can use. */
export const availableCountries = (rules = []) => {
  const taken = new Set(rules.map((rule) => rule.country));
  return TAX_COUNTRIES.filter((country) => !taken.has(country));
};
