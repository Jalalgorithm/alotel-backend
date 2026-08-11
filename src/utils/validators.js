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
 * Only `name`, `country` and `value` reach the API — it stores one percentage
 * per country. The remaining fields stay in the form (they describe where the
 * builder is going) but carry no validation, because nothing is done with them.
 */
export const taxRuleSchema = z.object({
  name: z.string().min(3, 'Rule name is required'),
  country: z.string().min(1, 'Select a country'),
  value: z.coerce
    .number({ message: 'Enter a percentage' })
    .min(0, 'Cannot be negative')
    .max(100, 'Cannot exceed 100%'),

  /* Collected but not yet stored server-side. */
  state: z.string().optional().default(''),
  segment: z.string().optional().default('All Guests'),
  type: z.string().optional().default('Percentage'),
  frequency: z.string().optional().default('Per Booking'),
  label: z.string().optional().default(''),
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

export const damageSchema = z.object({
  room: z.string().min(1, 'Select a room'),
  description: z.string().min(3, 'Describe the damage'),
  severity: z.string().min(1, 'Select a severity'),
  cost: z.coerce.number().positive('Enter the estimated cost'),
});

export const propertyWizardSchema = z.object({
  classification: z.string().min(1),
  country: z.string().min(1),
  state: z.string().min(1),
  city: z.string().min(2, 'City is required'),
  address: z.string().min(5, 'Full address is required'),
});
