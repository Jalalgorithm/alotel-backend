import { apiClient } from './apiClient';

/**
 * Country/state reference data — `utils/countries.py` on the backend, public,
 * no API key required (unlike Mapbox geocoding or Gemini tax suggestions).
 * Static-ish reference data, so callers should cache it aggressively.
 */
export const countryService = {
  /** `{ code, name, location, currency, secondaryCurrency }[]` — `location` matches `propertySchema.js`'s `LOCATIONS` values 1:1. */
  async getCountries() {
    const { data } = await apiClient.get('/countries/');
    return (data?.countries ?? []).map((c) => ({
      code: c.code,
      name: c.name,
      location: c.location,
      currency: c.currency,
      secondaryCurrency: c.secondary_currency ?? null,
    }));
  },

  /** @param {string} countryCode e.g. 'NG', 'GB' */
  async getCountryStates(countryCode) {
    const { data } = await apiClient.get(`/countries/${countryCode}/states/`);
    return data?.states ?? [];
  },
};
