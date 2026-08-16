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

/** Display-only full names for `TAX_COUNTRIES` — values sent to the API are always the short codes above, unchanged. */
export const TAX_COUNTRY_LABELS = {
  UK: 'United Kingdom',
  Spain: 'Spain',
  USA: 'United States',
  UAE: 'United Arab Emirates',
  Nigeria: 'Nigeria',
};

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

/** Badge variant per AI suggestion confidence level — shared by `AiTaxCompanionPanel` and `TaxRuleModal`. */
export const CONFIDENCE_BADGE_VARIANT = {
  high: 'ok',
  medium: 'warn',
  low: 'danger',
};

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

/** Human label for the "Source" table column. */
export const SOURCE_LABELS = {
  manual: 'Manual',
  csv_import: 'CSV Import',
  ai_suggested: 'AI Suggested',
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
 * Build the create/update payload — the fields `TaxRuleCreateUpdateSerializer`
 * accepts. One builder for every save, manual or AI-sourced: both the manual
 * form (`TaxRuleModal`) and the AI Companion (`AiTaxCompanionModal`, via
 * `suggestionToRuleValues` below) call the *same* `createRule` mutation with
 * values in this shape, so there's exactly one create code path rather than
 * two that can quietly drift apart. `source` defaults to `'manual'` —
 * submitting through the form (even to edit an AI/CSV-sourced row) is itself
 * the human decision the backend's "AI guides, humans decide" model expects —
 * `suggestionToRuleValues` is the only caller that overrides it.
 *
 * `taxType`/`frequency` are coerced to the backend's exact enum rather than
 * forwarded as-is: harmless for the form (its `<Select>` can't produce
 * anything else anyway), but required for AI suggestions, whose free-text
 * wording from Gemini isn't guaranteed to match.
 */
export const toTaxRulePayload = ({
  ruleName, country, state, county, city, guestSegment, taxType, value, frequency, displayLabel, status,
  source = 'manual', sourceUrl = '', confidence = '', caveat = '',
}) => ({
  rule_name: ruleName?.trim() ?? '',
  country,
  state: state?.trim() ?? '',
  county: county?.trim() ?? '',
  city: city?.trim() ?? '',
  guest_segment: guestSegment ?? [],
  tax_type: taxType === 'fixed' ? 'fixed' : 'percentage',
  value: String(Number(value) || 0),
  frequency: frequency === 'per_booking' ? 'per_booking' : 'per_night',
  display_label: displayLabel?.trim() ?? '',
  status: status || 'active',
  source,
  ...(sourceUrl ? { source_url: sourceUrl } : {}),
  ...(confidence ? { confidence } : {}),
  ...(caveat ? { caveat } : {}),
});

/**
 * Turn one `POST /properties/taxes/suggest/` suggestion into the *same*
 * form-values shape `TaxRuleModal` produces, so `AiTaxCompanionModal`'s "Add
 * rule" can hand it straight to the shared `createRule` mutation — the exact
 * mutation, service call and `toTaxRulePayload` the manual form uses, not a
 * parallel implementation. `source`/`status` are forced to `'ai_suggested'`
 * so the created row lands directly in the existing `REVIEWABLE_STATUSES`
 * approve/reject queue rather than going live unreviewed.
 */
export const suggestionToRuleValues = (suggestion) => ({
  ruleName: suggestion.rule_name || '',
  country: suggestion.country,
  state: suggestion.state || '',
  county: '',
  city: suggestion.city || '',
  guestSegment: [],
  taxType: suggestion.tax_type,
  value: suggestion.value,
  frequency: suggestion.frequency,
  displayLabel: suggestion.display_label || '',
  status: 'ai_suggested',
  source: 'ai_suggested',
  sourceUrl: suggestion.source_url || '',
  confidence: suggestion.confidence || '',
  caveat: suggestion.caveat || '',
});

/* -------------------------------------------------------------------------- */
/* Coverage alerts — `GET /properties/taxes/coverage-alerts/`, Super Admin only */
/* -------------------------------------------------------------------------- */

export const toCoverageAlert = (raw) => ({
  id: raw.id,
  country: raw.country,
  state: raw.state ?? '',
  city: raw.city ?? '',
  propertyIds: raw.property_ids ?? [],
  firstSeenAt: raw.first_seen_at,
  lastSeenAt: raw.last_seen_at,
});

/* -------------------------------------------------------------------------- */
/* CSV import — `POST /properties/taxes/bulk-import/` takes the raw file      */
/* (multipart) and parses/validates server-side, all-or-nothing. The mock     */
/* path below still goes row-by-row through `POST /properties/taxes/`, forced */
/* into the same pending-review path as an AI suggestion.                     */
/* -------------------------------------------------------------------------- */

/** Header row for the downloadable template, and the columns the parser reads back — mirrors `TaxRuleCreateUpdateSerializer`'s writable fields (minus `guest_segment`, too complex for a flat file). */
export const CSV_TEMPLATE_COLUMNS = ['rule_name', 'country', 'state', 'county', 'city', 'tax_type', 'value', 'frequency', 'display_label'];

/**
 * One parsed CSV row (already keyed by `CSV_TEMPLATE_COLUMNS`) → the create
 * payload. Forces `source`/`status: 'csv_import'` on every row — nothing
 * server-side enforces that landing status for CSV-sourced rows the way it
 * does for AI ones, so the frontend has to.
 */
export const toCsvRowPayload = (row) => ({
  rule_name: row.rule_name?.trim() ?? '',
  country: row.country?.trim() ?? '',
  state: row.state?.trim() ?? '',
  county: row.county?.trim() ?? '',
  city: row.city?.trim() ?? '',
  guest_segment: [],
  tax_type: row.tax_type?.trim() === 'fixed' ? 'fixed' : 'percentage',
  value: String(Number(row.value) || 0),
  frequency: row.frequency?.trim() === 'per_booking' ? 'per_booking' : 'per_night',
  display_label: row.display_label?.trim() ?? '',
  status: 'csv_import',
  source: 'csv_import',
});
