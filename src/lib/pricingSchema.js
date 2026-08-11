import { LOCATIONS } from './propertySchema';

/**
 * The pricing vocabulary the API actually supports, and the translation to and
 * from the three builders on the Pricing & Availability page.
 *
 * The backend splits pricing into three independent resources — this module is
 * the single place that knows their wire shapes, so the UI never has to guess:
 *
 *   DiscountRule       { id, country, name, percentage, startDate, endDate, isActive }
 *   PricingConfiguration { id, country, currency, cleaningFee, securityDeposit, isActive }
 *   PricingRuleConfig  { id, region, property_type, default_security_deposit,
 *                         deposit_currency, default_cleaning_fee, seasonal_price_rules }
 */

/** Countries the API accepts — its `LOCATION_CHOICES`. */
export const PRICING_COUNTRIES = LOCATIONS;

/**
 * One currency per country. Mirrors `LOCATION_CURRENCY` in the backend's
 * `property/pricing.py` — `PricingConfiguration.currency` is validated against
 * this exact mapping server-side, so the builder locks the field instead of
 * letting an admin type a mismatched currency and hit a 400.
 */
export const LOCATION_CURRENCY = {
  UK: 'GBP',
  Spain: 'EUR',
  Nigeria: 'NGN',
  'UAE Dubai': 'AED',
  US: 'USD',
};

/** `PricingRuleConfig.REGION_CHOICES`. */
export const PRICING_REGIONS = [
  { value: 'UK', label: 'United Kingdom' },
  { value: 'ES', label: 'Spain' },
  { value: 'US', label: 'United States' },
  { value: 'AE', label: 'UAE / Dubai' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'ALL', label: 'All Regions' },
];

/** `Property.PROPERTY_TYPE_CHOICES`, reused by `PricingRuleConfig.property_type`. */
export const PRICING_PROPERTY_TYPES = [
  'Room',
  'Studio',
  '1-Bedroom Flat',
  '2-Bedroom Flat',
  '3-Bedroom Flat',
  'House',
  'Duplex',
  'Bungalow',
  'Luxury Suite',
  'Other',
];

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/* ------------------------------------------------------------- discounts -- */

export const toDiscountRule = (raw) => ({
  id: raw.id,
  country: raw.country,
  name: raw.name,
  percentage: toNumber(raw.percentage),
  startDate: raw.startDate,
  endDate: raw.endDate,
  isActive: Boolean(raw.isActive),
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

export const toDiscountPayload = ({ country, name, percentage, startDate, endDate, isActive }) => {
  const payload = {};
  if (country !== undefined) payload.country = country;
  if (name !== undefined) payload.name = name?.trim() ?? '';
  if (percentage !== undefined && percentage !== '') payload.percentage = String(Number(percentage));
  if (startDate !== undefined) payload.startDate = startDate;
  if (endDate !== undefined) payload.endDate = endDate;
  if (isActive !== undefined) payload.isActive = Boolean(isActive);
  return payload;
};

/** Countries that do not yet have a discount — the only ones a new rule can use. */
export const availableDiscountCountries = (rules = []) => {
  const taken = new Set(rules.map((rule) => rule.country));
  return PRICING_COUNTRIES.filter((country) => !taken.has(country));
};

/* --------------------------------------------------------- pricing config -- */

export const toPricingConfig = (raw) => ({
  id: raw.id,
  country: raw.country,
  currency: raw.currency,
  cleaningFee: toNumber(raw.cleaningFee),
  securityDeposit: toNumber(raw.securityDeposit),
  isActive: Boolean(raw.isActive),
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

export const toPricingConfigPayload = ({ country, cleaningFee, securityDeposit, isActive }) => {
  const payload = {};
  if (country !== undefined) {
    payload.country = country;
    payload.currency = LOCATION_CURRENCY[country];
  }
  if (cleaningFee !== undefined && cleaningFee !== '') payload.cleaningFee = String(Number(cleaningFee));
  if (securityDeposit !== undefined && securityDeposit !== '') payload.securityDeposit = String(Number(securityDeposit));
  if (isActive !== undefined) payload.isActive = Boolean(isActive);
  return payload;
};

/** Countries that do not yet have a fee config. */
export const availableConfigCountries = (configs = []) => {
  const taken = new Set(configs.map((config) => config.country));
  return PRICING_COUNTRIES.filter((country) => !taken.has(country));
};

/* ----------------------------------------------------------- pricing rule -- */

export const toSeasonalRule = (raw) => ({
  label: raw?.label ?? '',
  start: raw?.start ?? '',
  end: raw?.end ?? '',
  multiplier: toNumber(raw?.multiplier ?? 1),
});

export const toPricingRule = (raw) => ({
  id: raw.id,
  region: raw.region,
  propertyType: raw.property_type,
  defaultSecurityDeposit: toNumber(raw.default_security_deposit),
  depositCurrency: raw.deposit_currency,
  defaultCleaningFee: toNumber(raw.default_cleaning_fee),
  seasonalPriceRules: Array.isArray(raw.seasonal_price_rules) ? raw.seasonal_price_rules.map(toSeasonalRule) : [],
  updatedBy: raw.updated_by,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export const toPricingRulePayload = ({
  region,
  propertyType,
  defaultSecurityDeposit,
  depositCurrency,
  defaultCleaningFee,
  seasonalPriceRules,
}) => ({
  region,
  property_type: propertyType,
  default_security_deposit: String(Number(defaultSecurityDeposit || 0)),
  deposit_currency: (depositCurrency || '').trim().toUpperCase(),
  default_cleaning_fee: String(Number(defaultCleaningFee || 0)),
  seasonal_price_rules: (seasonalPriceRules ?? [])
    .filter((rule) => rule.label && rule.start && rule.end)
    .map((rule) => ({ label: rule.label, start: rule.start, end: rule.end, multiplier: Number(rule.multiplier || 1) })),
});

/** A rule already exists for this (region, property_type) pair — PUT will update it, not create a new one. */
export const findPricingRule = (rules = [], region, propertyType) =>
  rules.find((rule) => rule.region === region && rule.propertyType === propertyType);
