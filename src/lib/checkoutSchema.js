/**
 * Check-out reporting vocabulary — `operations` app on the backend:
 * `DamageAssessment` and `PostCheckoutReport`, both reached through
 * `/api/v1/inspections/<booking_id>/...`. Enum values below are copied
 * verbatim from the model `choices`.
 */

export const ROOM_AREAS = [
  { value: 'living_room', label: 'Living room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'entrance', label: 'Entrance' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'other', label: 'Other' },
];

export const DAMAGE_SEVERITIES = [
  { value: 'minor', label: 'Minor (Cosmetic)' },
  { value: 'moderate', label: 'Moderate (Functional)' },
  { value: 'major', label: 'Major (Structural/Replacement)' },
];

export const SEVERITY_BADGE_VARIANT = {
  minor: 'gold',
  moderate: 'warn',
  major: 'danger',
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

/* -------------------------------------------------------------------------- */
/* Damage assessments                                                          */
/* -------------------------------------------------------------------------- */

export const toDamageAssessment = (raw) => ({
  id: raw.id,
  bookingId: raw.booking,
  inspectionId: raw.inspection,
  roomArea: raw.room_area,
  description: raw.description ?? '',
  severity: raw.severity,
  photoId: raw.photo,
  estimatedCost: toNumber(raw.estimated_cost) ?? 0,
  approvedCost: toNumber(raw.approved_cost),
  currency: raw.currency,
  deductFromDeposit: Boolean(raw.deduct_from_deposit),
  loggedBy: raw.logged_by,
  loggedAt: raw.logged_at,
});

/** `DamageAssessmentCreateSerializer` — logging a new item found during inspection. */
export const toDamageAssessmentPayload = ({ roomArea, description, severity, estimatedCost, currency }) => ({
  room_area: roomArea,
  description: description?.trim() ?? '',
  severity,
  estimated_cost: String(Number(estimatedCost) || 0),
  currency,
});

/** `DamageAssessmentUpdateSerializer` — the admin approval step: confirm a cost, decide whether it counts against the deposit. */
export const toDamageAssessmentPatch = ({ approvedCost, deductFromDeposit }) => {
  const patch = {};
  if (approvedCost !== undefined) patch.approved_cost = approvedCost === null || approvedCost === '' ? null : String(Number(approvedCost));
  if (deductFromDeposit !== undefined) patch.deduct_from_deposit = Boolean(deductFromDeposit);
  return patch;
};

/* -------------------------------------------------------------------------- */
/* Check-out report                                                            */
/* -------------------------------------------------------------------------- */

/**
 * `PostCheckoutReportSerializer`. `pdfUrl` comes back as a bare `/media/...`
 * path — resolved to a loadable URL by the caller (`bookingService.js`),
 * the same way inspection photo files already are.
 */
export const toCheckoutReport = (raw) => {
  if (!raw) return null;
  return {
    id: raw.id,
    bookingId: raw.booking,
    pdfUrl: raw.pdf_url || '',
    sentToGuest: Boolean(raw.sent_to_guest),
    sentAt: raw.sent_at,
    adminSignatureUrl: raw.admin_signature_url || '',
    depositDeductionTotal: toNumber(raw.deposit_deduction_total) ?? 0,
    deliveryLog: raw.delivery_log ?? [],
    generatedAt: raw.generated_at,
    damageItems: (raw.damage_items ?? []).map(toDamageAssessment),
  };
};
