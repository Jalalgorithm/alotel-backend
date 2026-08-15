/**
 * The Maintenance Oversight vocabulary — `operations` app, `/api/v1/operations/maintenance/*`.
 *
 * Unlike Spaces, this backend is real (confirmed by reading `aotel-backend`
 * directly): `MaintenanceWorker`, `MaintenanceAssignment`, `MaintenanceTicket`,
 * `MaintenanceTicketCost`, `MaintenanceTicketPhoto`. Enum values below are
 * copied verbatim from the model `choices` — sending anything else fails
 * validation. Only links to `Property` today (no Space FK yet).
 */

export const WORKER_EMPLOYMENT_TYPES = [
  { value: 'in_house', label: 'In-house' },
  { value: 'external_vendor', label: 'External vendor' },
];

export const WORKER_RATE_BASIS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'flat', label: 'Flat' },
  { value: 'per_job', label: 'Per job' },
];

export const WORKER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const TICKET_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const PRIORITY_BADGE_VARIANT = {
  low: 'info',
  medium: 'warn',
  high: 'danger',
  urgent: 'danger',
};

export const TICKET_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

/** The order a ticket normally moves through — drives the status stepper on the detail page. */
export const TICKET_STATUS_FLOW = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];

export const STATUS_BADGE_VARIANT = {
  open: 'warn',
  assigned: 'info',
  in_progress: 'brand',
  resolved: 'ok',
  closed: 'neutral',
};

export const TICKET_COST_TYPES = [
  { value: 'materials', label: 'Materials' },
  { value: 'labor', label: 'Labor' },
  { value: 'other', label: 'Other' },
];

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/* -------------------------------------------------------------------------- */
/* Workers                                                                     */
/* -------------------------------------------------------------------------- */

export const toWorker = (raw) => {
  if (!raw) return null;
  return {
    id: raw.id,
    name: raw.name ?? '',
    phone: raw.phone ?? '',
    email: raw.email ?? '',
    specialtyTags: raw.specialty_tags ?? [],
    employmentType: raw.employment_type ?? 'in_house',
    companyName: raw.company_name ?? '',
    rateBasis: raw.rate_basis ?? 'hourly',
    rateAmount: raw.rate_amount !== null && raw.rate_amount !== undefined ? toNumber(raw.rate_amount) : null,
    status: raw.status ?? 'active',
    assignedPropertyCount: raw.assigned_property_count ?? 0,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
};

export const toWorkerPayload = (values) => ({
  name: values.name?.trim() ?? '',
  phone: values.phone?.trim() ?? '',
  email: values.email?.trim() ?? '',
  specialty_tags: values.specialtyTags ?? [],
  employment_type: values.employmentType,
  company_name: values.employmentType === 'external_vendor' ? values.companyName?.trim() ?? '' : '',
  rate_basis: values.rateBasis,
  rate_amount: values.rateAmount !== '' && values.rateAmount !== null && values.rateAmount !== undefined ? String(Number(values.rateAmount)) : null,
});

export const toAssignment = (raw) => ({
  id: raw.id,
  workerId: raw.worker,
  propertyId: raw.property,
  assignedAt: raw.assigned_at,
});

/* -------------------------------------------------------------------------- */
/* Tickets                                                                     */
/* -------------------------------------------------------------------------- */

export const toTicketCost = (raw) => ({
  id: raw.id,
  costType: raw.cost_type,
  amount: toNumber(raw.amount),
  note: raw.note ?? '',
  invoiceReference: raw.invoice_reference ?? '',
  receiptUrl: raw.receipt_file ?? null,
  loggedBy: raw.logged_by,
  createdAt: raw.created_at,
});

/** Plain object when there's no receipt to attach; the caller switches to `FormData` when `receiptFile` is present. */
export const toTicketCostPayload = (values) => ({
  cost_type: values.costType,
  amount: String(Number(values.amount) || 0),
  note: values.note?.trim() ?? '',
  invoice_reference: values.invoiceReference?.trim() || null,
});

export const toTicketPhoto = (raw) => ({
  id: raw.id,
  url: raw.file,
  caption: raw.caption ?? '',
  uploadedBy: raw.uploaded_by,
  takenAtServer: raw.taken_at_server,
});

export const toTicket = (raw) => {
  if (!raw) return null;
  return {
    id: raw.id,
    propertyId: raw.property,
    propertyName: raw.property_name ?? '',
    /** `space` FK — Super-Admin-only tickets linked to a Space instead of a Property. Exactly one of the two is ever set. */
    spaceId: raw.space,
    category: raw.category ?? '',
    description: raw.description ?? '',
    priority: raw.priority ?? 'medium',
    status: raw.status ?? 'open',
    assignedWorkerId: raw.assigned_worker,
    assignedWorkerName: raw.assigned_worker_name ?? '',
    createdBy: raw.created_by,
    resolutionNotes: raw.resolution_notes ?? '',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    resolvedAt: raw.resolved_at,
    totalCost: toNumber(raw.total_cost),
    costs: (raw.costs ?? []).map(toTicketCost),
    photos: (raw.photos ?? []).map(toTicketPhoto),
  };
};

/** Exactly one of `property_id`/`space_id` — space-linked tickets are Super-Admin-only server-side. */
export const toTicketPayload = (values) => ({
  ...(values.spaceId ? { space_id: values.spaceId } : { property_id: values.propertyId }),
  category: values.category?.trim() ?? '',
  description: values.description?.trim() ?? '',
  priority: values.priority,
  ...(values.assignedWorkerId ? { assigned_worker_id: values.assignedWorkerId } : {}),
});
