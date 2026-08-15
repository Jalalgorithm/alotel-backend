import { z } from 'zod';

export const emailField = z
  .string()
  .min(1, 'Email address is required')
  .email('Enter a valid email address');

export const phoneField = z
  .string()
  .min(7, 'Enter a valid phone number')
  .regex(/^[+()\d\s-]+$/, 'Enter a valid phone number');

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional().default(true),
});

const staffBaseFields = {
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  otherName: z.string().optional().default(''),
  role: z.enum(['L2', 'L3'], { message: 'Select a role level' }),
  assignedProperties: z.array(z.string()).optional().default([]),
};

/** New staff members also need a login — the backend requires an 8+ char password. */
export const createStaffSchema = z.object({
  ...staffBaseFields,
  email: emailField,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/** Role and email can't change once the account exists. */
export const editStaffSchema = z.object(staffBaseFields);

/**
 * Tax Rule Builder v2 — `TaxRuleCreateUpdateSerializer`. A rule applies at
 * country and/or state/county/city (blank scope fields = "applies broadly at
 * this level and above"), so only `country` and the type/value/frequency
 * fields are required; the scope narrowing fields are all optional.
 */
export const taxRuleSchema = z
  .object({
    ruleName: z.string().optional().default(''),
    country: z.string().min(1, 'Select a country'),
    state: z.string().optional().default(''),
    county: z.string().optional().default(''),
    city: z.string().optional().default(''),
    guestSegment: z.array(z.string()).optional().default([]),
    taxType: z.enum(['percentage', 'fixed'], { message: 'Select a tax type' }),
    value: z.coerce.number({ message: 'Enter a value' }).min(0, 'Cannot be negative'),
    frequency: z.enum(['per_night', 'per_booking'], { message: 'Select a frequency' }),
    displayLabel: z.string().optional().default(''),
    status: z.string().optional().default('active'),
  })
  .refine((values) => values.taxType !== 'percentage' || values.value <= 100, {
    message: 'A percentage tax type cannot exceed 100',
    path: ['value'],
  });

/** Country promotional discount — `DiscountRule`: one per country, with a date window. */
export const discountRuleSchema = z
  .object({
    country: z.string().min(1, 'Select a country'),
    name: z.string().min(3, 'Rule name is required'),
    percentage: z.coerce
      .number({ message: 'Enter a percentage' })
      .min(0, 'Cannot be negative')
      .max(100, 'Cannot exceed 100%'),
    startDate: z.string().min(1, 'Select a start date'),
    endDate: z.string().min(1, 'Select an end date'),
    isActive: z.boolean().optional().default(true),
  })
  .refine((values) => values.endDate >= values.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });

/** Country fee defaults — `PricingConfiguration`: cleaning fee, deposit and currency, one per country. */
export const pricingConfigSchema = z.object({
  country: z.string().min(1, 'Select a country'),
  cleaningFee: z.coerce.number({ message: 'Enter a cleaning fee' }).min(0, 'Cannot be negative'),
  securityDeposit: z.coerce.number({ message: 'Enter a security deposit' }).min(0, 'Cannot be negative'),
  isActive: z.boolean().optional().default(true),
});

/** One row of `PricingRuleConfig.seasonal_price_rules`. */
const MMDD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const seasonalRuleSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  start: z.string().regex(MMDD, 'Use MM-DD'),
  end: z.string().regex(MMDD, 'Use MM-DD'),
  multiplier: z.coerce.number({ message: 'Enter a multiplier' }).positive('Must be greater than 0'),
});

/** Global deposit & cleaning-fee defaults by region/property type — `PricingRuleConfig`. */
export const pricingRuleSchema = z.object({
  region: z.string().min(1, 'Select a region'),
  propertyType: z.string().min(1, 'Select a property type'),
  defaultSecurityDeposit: z.coerce.number({ message: 'Enter a deposit amount' }).min(0, 'Cannot be negative'),
  depositCurrency: z.string().min(1, 'Enter a currency code').max(3, 'Use a 3-letter code'),
  defaultCleaningFee: z.coerce.number({ message: 'Enter a cleaning fee' }).min(0, 'Cannot be negative'),
  seasonalPriceRules: z.array(seasonalRuleSchema).optional().default([]),
});

/** `DamageAssessmentCreateSerializer` — logging a newly-found item during check-out inspection. */
export const damageAssessmentSchema = z.object({
  roomArea: z.string().min(1, 'Select a room / area'),
  description: z.string().min(3, 'Describe the damage'),
  severity: z.enum(['minor', 'moderate', 'major'], { message: 'Select a severity' }),
  estimatedCost: z.coerce.number({ message: 'Enter the estimated cost' }).positive('Enter the estimated cost'),
});

/** `MaintenanceWorkerCreateSerializer` — vendor-only fields (`companyName`) are only required when `employmentType` is `external_vendor`. */
export const workerSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    phone: phoneField,
    email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
    specialtyTags: z.array(z.string()).min(1, 'Add at least one specialty'),
    employmentType: z.enum(['in_house', 'external_vendor'], { message: 'Select an employment type' }),
    companyName: z.string().optional().default(''),
    rateBasis: z.enum(['hourly', 'flat', 'per_job'], { message: 'Select a rate basis' }),
    rateAmount: z.coerce.number().min(0, 'Cannot be negative').optional().or(z.literal('')),
  })
  .refine((values) => values.employmentType !== 'external_vendor' || values.companyName.trim().length > 0, {
    message: 'Company name is required for an external vendor',
    path: ['companyName'],
  });

/** `PayoutCreateSerializer` — scheduling a new payout to a property's host. Super Admin only. */
export const schedulePayoutSchema = z
  .object({
    propertyId: z.string().min(1, 'Select a property'),
    amount: z.coerce.number({ message: 'Enter an amount' }).positive('Must be greater than 0'),
    currency: z.string().min(1, 'Select a currency').max(3, 'Use a 3-letter code'),
    periodStart: z.string().min(1, 'Select a start date'),
    periodEnd: z.string().min(1, 'Select an end date'),
  })
  .refine((values) => values.periodEnd >= values.periodStart, {
    message: 'End date must be on or after the start date',
    path: ['periodEnd'],
  });

/** `ExpenseEntry` — manual cost log for a Cost Breakdown category with no automatic source. */
export const logExpenseSchema = z.object({
  category: z.enum(['operation', 'staff', 'marketing', 'others'], { message: 'Select a category' }),
  amount: z.coerce.number({ message: 'Enter an amount' }).positive('Must be greater than 0'),
  date: z.string().min(1, 'Select a date'),
  note: z.string().optional().default(''),
});

/** `MaintenanceTicketCreateSerializer` — exactly one of `propertyId`/`spaceId` (space-linked tickets are Super-Admin-only server-side). */
export const maintenanceTicketSchema = z
  .object({
    propertyId: z.string().optional().default(''),
    spaceId: z.string().optional().default(''),
    category: z.string().min(1, 'Category is required'),
    description: z.string().min(3, 'Describe the issue'),
    priority: z.enum(['low', 'medium', 'high', 'urgent'], { message: 'Select a priority' }),
    assignedWorkerId: z.string().optional().default(''),
  })
  .refine((values) => Boolean(values.propertyId) !== Boolean(values.spaceId), {
    message: 'Select a property',
    path: ['propertyId'],
  });

/** `MaintenanceTicketCostSerializer`. */
export const ticketCostSchema = z.object({
  costType: z.enum(['materials', 'labor', 'other'], { message: 'Select a cost type' }),
  amount: z.coerce.number({ message: 'Enter an amount' }).positive('Must be greater than 0'),
  note: z.string().optional().default(''),
  invoiceReference: z.string().optional().default(''),
});

export const propertyWizardSchema = z.object({
  classification: z.string().min(1),
  country: z.string().min(1),
  state: z.string().min(1),
  city: z.string().min(2, 'City is required'),
  address: z.string().min(5, 'Full address is required'),
});
