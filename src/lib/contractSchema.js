/**
 * The contract-template vocabulary the API accepts, and the translation
 * between its wire shape and the portal's.
 *
 * These lists mirror `ContractTemplate`'s `choices` exactly — anything else
 * fails validation — and the region codes are deliberately not the labels the
 * rest of the portal uses: the API stores ISO-ish codes (`ES`, `US`, `AE`) and
 * resolves them from the property's **country** string, not its market.
 */

export const TEMPLATE_REGIONS = [
  { value: 'UK', label: 'United Kingdom' },
  { value: 'ES', label: 'Spain' },
  { value: 'US', label: 'United States' },
  { value: 'AE', label: 'UAE / Dubai' },
  { value: 'NG', label: 'Nigeria' },
];

export const TEMPLATE_STAY_TYPES = [
  { value: 'short_stay', label: 'Short stay (< 4 weeks)' },
  { value: 'medium_residential', label: 'Medium residential (4–26 weeks)' },
  { value: 'medium_commercial', label: 'Medium commercial (4–26 weeks)' },
  { value: 'long_residential', label: 'Long residential (26+ weeks)' },
  { value: 'long_commercial', label: 'Long commercial (26+ weeks)' },
];

/**
 * Only these two are reachable when the API resolves a template automatically:
 * `ContractSendView` rejects any booking under the ~6-month threshold before it
 * ever looks one up, so `_stay_type_for_nights` can only return a long band.
 * The others are still worth storing — they can be sent by explicit id — but
 * the screen flags the difference so nobody wonders why a short-stay template
 * never fires.
 */
export const AUTO_RESOLVED_STAY_TYPES = ['long_residential', 'long_commercial'];

export const regionLabel = (value) =>
  TEMPLATE_REGIONS.find((region) => region.value === value)?.label ?? value;

export const stayTypeLabel = (value) =>
  TEMPLATE_STAY_TYPES.find((type) => type.value === value)?.label ?? value;

/**
 * A booking only gets a signed contract via Dropbox Sign once it's at or
 * beyond this length — shorter stays use the `agreement_accepted` checkbox
 * flow instead (`POST /bookings/<id>/accept-agreement/`), and `ContractSendView`
 * rejects anything shorter with a 400. Mirrors the backend's default
 * `BOOKING_CONTRACT_REQUIRED_MIN_NIGHTS` (~6 months); the admin bookings list
 * doesn't return `contract_required` directly, so this is re-derived from nights.
 */
export const CONTRACT_REQUIRED_MIN_NIGHTS = 183;

/** `BookingContract.status` (API, snake_case) → the table/badge label. */
export const CONTRACT_STATUS_LABEL = {
  not_sent: 'Not sent',
  sent: 'Sent',
  signed: 'Signed',
  declined: 'Declined',
  expired: 'Expired',
};

/** Normalise one template from the API. */
export const toTemplate = (raw) => ({
  id: raw.id,
  name: raw.name,
  region: raw.region,
  regionLabel: regionLabel(raw.region),
  stayType: raw.stay_type,
  stayTypeLabel: stayTypeLabel(raw.stay_type),
  content: raw.content ?? '',
  version: raw.version ?? '1.0',
  isActive: raw.is_active !== false,
  isAutoResolved: AUTO_RESOLVED_STAY_TYPES.includes(raw.stay_type),
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

/**
 * Build the create/update payload.
 *
 * `unique_together` is `(region, stay_type, version)`, so a duplicate comes
 * back as a 400 rather than silently overwriting — the form surfaces that.
 */
export const toTemplatePayload = ({ name, region, stayType, content, version, isActive }) => {
  const payload = {};

  if (name !== undefined) payload.name = name?.trim();
  if (region !== undefined) payload.region = region;
  if (stayType !== undefined) payload.stay_type = stayType;
  if (content !== undefined) payload.content = content;
  if (version !== undefined) payload.version = String(version || '1.0').trim();
  if (isActive !== undefined) payload.is_active = Boolean(isActive);

  return payload;
};

/**
 * Which (region, stay type) pairs have no active template.
 *
 * Only the auto-resolved bands are counted: a gap there means a real booking in
 * that jurisdiction cannot have a contract issued at all.
 */
export const coverageGaps = (templates = []) => {
  const covered = new Set(
    templates.filter((t) => t.isActive).map((t) => `${t.region}:${t.stayType}`),
  );

  const gaps = [];
  TEMPLATE_REGIONS.forEach((region) => {
    AUTO_RESOLVED_STAY_TYPES.forEach((stayType) => {
      if (!covered.has(`${region.value}:${stayType}`)) {
        gaps.push({ region: region.value, regionLabel: region.label, stayType, stayTypeLabel: stayTypeLabel(stayType) });
      }
    });
  });

  return gaps;
};
