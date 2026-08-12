/**
 * The tax vocabulary the API actually supports (Tax Rule Builder v2), and the
 * translation to and from the builder's form.
 *
 * The backend now models tax at country **and/or** state/county/city level —
 * several rules can stack for one property (e.g. a state sales tax plus a
 * city occupancy tax both apply in NYC) — behind a status lifecycle so an
 * AI-sourced or CSV-imported row can never go live without a human looking
 * at it:
 *
 *   { id, ruleName, country, state, county, city, guestSegment, taxType,
 *     value, frequency, displayLabel, status, source, aiGenerated,
 *     sourceUrl, confidence, caveat, lastVerifiedAt, approvedBy, approvedAt,
 *     rejectedReason, createdAt, updatedAt }
 *
 * `TaxRule.COUNTRY_CHOICES` is its **own** enum — distinct from
 * `propertySchema.js`'s `LOCATIONS` (`US`/`UAE Dubai`) — the backend bridges
 * the two internally when matching a property to its applicable rules, but
 * this builder must send/receive exactly this list.
 */

export const TAX_COUNTRIES = ['UK', 'Spain', 'USA', 'UAE', 'Nigeria'];

export const TAX_TYPES = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed amount' },
];

export const TAX_FREQUENCIES = [
  { value: 'per_night', label: 'Per night' },
  { value: 'per_booking', label: 'Per booking' },
];

export const TAX_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'csv_import', label: 'CSV Import' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'ai_suggested', label: 'AI Suggested' },
  { value: 'active', label: 'Active' },
  { value: 'needs_reverification', label: 'Needs Reverification' },
  { value: 'rejected', label: 'Rejected' },
];

/** Statuses that still need a human decision — these get Approve/Reject actions in the table. */
export const REVIEWABLE_STATUSES = ['pending_review', 'ai_suggested', 'csv_import'];

/** Badge variant per lifecycle stage. */
export const STATUS_BADGE_VARIANT = {
  draft: 'neutral',
  csv_import: 'info',
  pending_review: 'warn',
  ai_suggested: 'warn',
  active: 'ok',
  needs_reverification: 'warn',
  rejected: 'danger',
};

export const GUEST_SEGMENTS = [
  { value: 'citizen', label: 'Citizen' },
  { value: 'resident', label: 'Resident' },
  { value: 'eu_foreigner', label: 'EU Foreigner' },
  { value: 'non_eu_foreigner', label: 'Non-EU Foreigner' },
  { value: 'tourist_all', label: 'Tourist (All)' },
];

/** Stored, but not yet read by the pricing engine — see `property/pricing.py`'s docstring on the backend. */
export const GUEST_SEGMENT_NOTE = 'Not yet enforced by pricing — every matched rule currently applies regardless of guest segment.';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** The scope a rule applies to, joined for display — e.g. "New York City, New York, USA". */
export const scopeLabel = (rule) => [rule.city, rule.state, rule.country].filter(Boolean).join(', ');

/** Normalise one API tax rule into the shape the table/form render. */
export const toTaxRule = (raw) => ({
  id: raw.id,
  ruleName: raw.rule_name || '',
  country: raw.country,
  state: raw.state || '',
  county: raw.county || '',
  city: raw.city || '',
  guestSegment: Array.isArray(raw.guest_segment) ? raw.guest_segment : [],
  taxType: raw.tax_type,
  value: toNumber(raw.value),
  frequency: raw.frequency,
  displayLabel: raw.display_label || '',
  status: raw.status,
  source: raw.source,
  aiGenerated: Boolean(raw.ai_generated),
  sourceUrl: raw.source_url || '',
  confidence: raw.confidence || '',
  caveat: raw.caveat || '',
  lastVerifiedAt: raw.last_verified_at,
  approvedBy: raw.approved_by,
  approvedAt: raw.approved_at,
  rejectedReason: raw.rejected_reason || '',
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

/**
 * Build the manual create/update payload — the fields
 * `TaxRuleCreateUpdateSerializer` accepts from this form. `source` is always
 * `'manual'`: submitting through this form (even to edit an AI/CSV-sourced
 * row) is itself the human decision the backend's "AI guides, humans decide"
 * model expects.
 */
export const toTaxRulePayload = ({ ruleName, country, state, county, city, guestSegment, taxType, value, frequency, displayLabel, status }) => ({
  rule_name: ruleName?.trim() ?? '',
  country,
  state: state?.trim() ?? '',
  county: county?.trim() ?? '',
  city: city?.trim() ?? '',
  guest_segment: guestSegment ?? [],
  tax_type: taxType,
  value: String(Number(value) || 0),
  frequency,
  display_label: displayLabel?.trim() ?? '',
  status: status || 'active',
  source: 'manual',
});
