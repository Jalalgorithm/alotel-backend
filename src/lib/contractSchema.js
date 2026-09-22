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

export const regionLabel = (value) =>
  TEMPLATE_REGIONS.find((region) => region.value === value)?.label ?? value;

export const stayTypeLabel = (value) =>
  TEMPLATE_STAY_TYPES.find((type) => type.value === value)?.label ?? value;

/**
 * The stay types signed via Dropbox Sign rather than the acceptance checkbox.
 * Publishing one of these is rejected server-side unless its body carries a
 * `{{ signature }}` block. Fallback only — prefer the `mode` on the coverage
 * response's bands when it's already in hand.
 */
export const SIGNATURE_STAY_TYPES = ['long_residential', 'long_commercial'];

/**
 * Mirrors the server's publish check so the editor can flag a missing
 * signature block while it's being written instead of at publish time — the
 * preview endpoint deliberately doesn't run this check. Kept deliberately in
 * step with the backend's placeholder regex, which tolerates inner spacing.
 */
export const hasSignatureField = (content = '') => /\{\{\s*signature\s*\}\}/.test(content);

/**
 * A booking only gets a signed contract via Dropbox Sign once it's at or
 * beyond this length — shorter stays use the `agreement_accepted` checkbox
 * flow instead. This is a fallback default only: the real value now comes
 * back as `contract_required_min_nights` on `GET /contracts/templates/coverage/`
 * — prefer that wherever the coverage response is already in hand.
 */
export const CONTRACT_REQUIRED_MIN_NIGHTS = 183;

/** `BookingContract.status` (API, snake_case) → the table/badge label. */
export const CONTRACT_STATUS_LABEL = {
  not_sent: 'Not sent',
  sent: 'Sent',
  signed: 'Signed',
  declined: 'Declined',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

/** `ContractTemplate.status` → the table/badge label. */
export const TEMPLATE_STATUS_LABEL = {
  draft: 'Draft',
  published: 'Published',
  retired: 'Retired',
};

/**
 * A published template under this many characters is short for real legal
 * text and worth a second look — flagged as a warning on the coverage grid,
 * never blocked. One constant, easy to retune later.
 */
export const SHORT_TEMPLATE_THRESHOLD = 1500;

/** Normalise one template from the API (list/detail rows — draft, published or retired). */
export const toTemplate = (raw) => ({
  id: raw.id,
  name: raw.name,
  region: raw.region,
  regionLabel: regionLabel(raw.region),
  stayType: raw.stay_type,
  stayTypeLabel: stayTypeLabel(raw.stay_type),
  content: raw.content ?? '',
  contentLength: raw.content_length ?? (raw.content ?? '').length,
  version: raw.version ?? '1.0',
  status: raw.status ?? 'draft',
  statusLabel: TEMPLATE_STATUS_LABEL[raw.status] ?? raw.status,
  publishedAt: raw.published_at ?? null,
  publishedBy: raw.published_by ?? null,
  retiredAt: raw.retired_at ?? null,
  acceptedBookings: raw.accepted_bookings ?? 0,
  contractsIssued: raw.contracts ?? raw.issued_contracts ?? 0,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

/** `POST /contracts/templates/` — creates a draft. Version and status are server-assigned, never sent. */
export const toTemplateCreatePayload = ({ name, region, stayType, content }) => ({
  name: name?.trim(),
  region,
  stay_type: stayType,
  content: content ?? '',
});

/** `PATCH /contracts/templates/<id>/` — draft-only, and only `name`/`content` are actually editable server-side. */
export const toTemplateEditPayload = ({ name, content }) => {
  const payload = {};
  if (name !== undefined) payload.name = name?.trim();
  if (content !== undefined) payload.content = content;
  return payload;
};

/** `GET /contracts/templates/coverage/` — the 25-cell grid. */
export const toCoverage = (raw) => {
  const bands = (raw.bands ?? []).map((band) => ({
    stayType: band.stay_type,
    stayTypeLabel: stayTypeLabel(band.stay_type),
    mode: band.mode, // 'click_accept' | 'signature'
  }));

  return {
    contractRequiredMinNights: raw.contract_required_min_nights ?? CONTRACT_REQUIRED_MIN_NIGHTS,
    // The API's `regions` entries are `{code, label}` descriptors; every consumer
    // (grid lookups, the Contracts board's region filter) keys off the plain
    // code string, same as `cells[].region` below — normalize to that shape.
    regions: (raw.regions ?? TEMPLATE_REGIONS.map((r) => r.value)).map((r) => r?.code ?? r),
    bands,
    cells: (raw.cells ?? []).map((cell) => ({
      region: cell.region,
      regionLabel: regionLabel(cell.region),
      stayType: cell.stay_type,
      stayTypeLabel: stayTypeLabel(cell.stay_type),
      // The API carries `mode` on the band, not the cell, but the grid reads it
      // per cell — without this every cell claimed to be a tick-box agreement,
      // including the long stays that legally require a signature.
      mode: bands.find((band) => band.stayType === cell.stay_type)?.mode ?? null,
      published: cell.published
        ? {
            id: cell.published.id,
            name: cell.published.name,
            version: cell.published.version,
            publishedAt: cell.published.published_at,
            contentLength: cell.published.content_length ?? 0,
          }
        : null,
      draftCount: cell.draft_count ?? 0,
    })),
  };
};

/** One of the 25 cells' overall state, for the grid's colour/label — matches the doc's four states. */
export const cellState = (cell) => {
  if (cell.published) {
    return cell.published.contentLength < SHORT_TEMPLATE_THRESHOLD ? 'published-short' : 'published';
  }
  if (cell.draftCount > 0) return 'draft-only';
  return 'empty';
};

/** Merge-field palette — `GET /contracts/merge-fields/`. Flat on the wire; grouped here for the palette UI. */
export const toMergeField = (raw) => ({
  key: raw.key,
  label: raw.label,
  example: raw.example ?? '',
  required: Boolean(raw.required),
  modes: raw.modes ?? [],
});

/**
 * The backend sends a flat list with no category — group it client-side.
 * "Signing" means a field only usable in signature mode (`signature`,
 * `signature_date`, `initials`); every ordinary field lists BOTH modes, so it
 * has to be an exclusivity test rather than `modes.includes('signature')` —
 * that matched nearly every field and emptied the other groups. Everything else
 * is grouped by a small key-prefix heuristic, with an "Other" bucket so an
 * unrecognised field never silently disappears from the palette.
 */
const isSigningOnlyField = (field) => field.modes.length === 1 && field.modes[0] === 'signature';
const GROUP_BY_KEY_PREFIX = [
  { group: 'Guest', prefixes: ['guest_'] },
  { group: 'Stay', prefixes: ['booking_', 'property_', 'checkin', 'checkout', 'nights', 'stay_'] },
  { group: 'Money', prefixes: ['amount_', 'price_', 'deposit_', 'currency', 'rent_', 'total_'] },
  { group: 'Company', prefixes: ['company_', 'alotel_'] },
];

export const groupMergeFields = (fields = []) => {
  const groups = { Guest: [], Stay: [], Money: [], Company: [], Signing: [], Other: [] };

  fields.forEach((field) => {
    if (isSigningOnlyField(field)) {
      groups.Signing.push(field);
      return;
    }
    const match = GROUP_BY_KEY_PREFIX.find(({ prefixes }) => prefixes.some((prefix) => field.key.startsWith(prefix)));
    groups[match?.group ?? 'Other'].push(field);
  });

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([group, items]) => ({ group, fields: items }));
};

/** `POST /contracts/templates/preview/` response. */
export const toTemplatePreview = (raw) => ({
  rendered: raw.rendered ?? '',
  unknownFields: raw.unknown_fields ?? [],
  missingValues: (raw.missing_values ?? []).map((entry) => ({
    field: entry.field,
    required: Boolean(entry.required),
  })),
  stayTypeMismatch: Boolean(raw.stay_type_mismatch),
  booking: raw.booking ?? null,
});

/** One row of `GET /contracts/?status=`. */
export const toContractRow = (raw) => ({
  contractId: raw.contract_id,
  bookingId: raw.booking_id,
  guest: raw.guest ?? null,
  property: raw.property ?? null,
  region: raw.region,
  regionLabel: regionLabel(raw.region),
  stayType: raw.stay_type,
  stayTypeLabel: stayTypeLabel(raw.stay_type),
  nights: raw.nights,
  checkIn: raw.check_in,
  checkOut: raw.check_out,
  template: raw.template ?? null,
  status: raw.status,
  statusLabel: CONTRACT_STATUS_LABEL[raw.status] ?? raw.status,
  isEmbedded: Boolean(raw.is_embedded),
  testMode: Boolean(raw.test_mode),
  sentAt: raw.sent_at,
  viewedAt: raw.viewed_at,
  signedAt: raw.signed_at,
  expiresAt: raw.expires_at,
  daysWaiting: raw.days_waiting ?? null,
  emailCount: raw.email_count ?? 0,
  lastEmailedAt: raw.last_emailed_at ?? null,
  lastEvent: raw.last_event ? { type: raw.last_event.type, at: raw.last_event.at } : null,
});

/** One row of `GET /contracts/unsent/`. */
export const toUnsentRow = (raw) => ({
  bookingId: raw.booking_id,
  guest: raw.guest ?? null,
  property: raw.property ?? null,
  bookingStatus: raw.booking_status,
  region: raw.region,
  regionLabel: regionLabel(raw.region),
  stayType: raw.stay_type,
  stayTypeLabel: stayTypeLabel(raw.stay_type),
  nights: raw.nights,
  checkIn: raw.check_in,
  daysUntilCheckIn: raw.days_until_check_in ?? null,
  resolvedTemplate: raw.resolved_template ?? null,
  lastContract: raw.last_contract ?? null,
});

/** `GET /contracts/summary/` — column header counts. */
export const toContractSummary = (raw) => ({
  unsent: raw.unsent ?? 0,
  sent: raw.sent ?? 0,
  declined: raw.declined ?? 0,
  expired: raw.expired ?? 0,
  signed: raw.signed ?? 0,
  cancelled: raw.cancelled ?? 0,
  expiringWithin3Days: raw.expiring_within_3_days ?? 0,
  unsentCheckingInWithin14Days: raw.unsent_checking_in_within_14_days ?? 0,
});

/** `GET /contracts/<id>/` — the drawer's full detail, list row plus resolution/copy. */
export const toContractDetail = (raw) => ({
  ...toContractRow(raw),
  renderedContent: raw.rendered_content ?? '',
  declineReason: raw.decline_reason ?? '',
  sentBy: raw.sent_by ?? null,
  resolution: raw.resolution
    ? {
        nights: raw.resolution.nights,
        isCommercial: Boolean(raw.resolution.is_commercial),
        region: raw.resolution.region,
        stayType: raw.resolution.stay_type,
        resolvedTemplate: raw.resolution.resolved_template ?? null,
        usedTemplate: raw.resolution.used_template ?? null,
        override: raw.resolution.override
          ? { reason: raw.resolution.override.reason, by: raw.resolution.override.by, at: raw.resolution.override.at }
          : null,
      }
    : null,
});

/** One row of `GET /contracts/<id>/events/`. */
export const toContractEvent = (raw) => ({
  id: raw.id,
  source: raw.source, // 'alotel' | 'dropbox_sign'
  type: raw.type,
  at: raw.at,
  actor: raw.actor ?? null,
  note: raw.note ?? '',
});
