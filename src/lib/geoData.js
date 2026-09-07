/**
 * Curated "pick a city" lists for the 5 supported markets (`propertySchema.js`'s
 * `LOCATIONS`). There's no backend cities endpoint to fetch these from (only a
 * country → states endpoint exists, `useCountryStates`), so this is a
 * hand-curated list of the cities admins are most likely to actually need —
 * not an exhaustive gazetteer. Any value not in this list is still accepted
 * as free text (see `CityField` in `AddressFields.jsx`), so an existing
 * property in a smaller town is never blocked or clobbered by this list.
 */
export const CITIES_BY_LOCATION = {
  UK: [
    'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Bristol', 'Edinburgh',
    'Sheffield', 'Newcastle upon Tyne', 'Nottingham', 'Cardiff', 'Belfast', 'Leicester', 'Southampton',
    'Brighton', 'Oxford', 'Cambridge', 'York', 'Aberdeen',
  ],
  Spain: [
    'Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma',
    'Las Palmas de Gran Canaria', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Granada',
    'San Sebastián', 'Marbella', 'Santa Cruz de Tenerife',
  ],
  Nigeria: [
    'Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City', 'Kaduna', 'Enugu',
    'Warri', 'Uyo', 'Calabar', 'Owerri', 'Abeokuta', 'Ilorin', 'Jos', 'Onitsha',
  ],
  'UAE Dubai': ['Dubai', 'Dubai Marina', 'Downtown Dubai', 'Jumeirah', 'Business Bay', 'Deira', 'Palm Jumeirah', 'Al Barsha'],
  US: [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego',
    'Dallas', 'Austin', 'San Jose', 'San Francisco', 'Seattle', 'Denver', 'Boston', 'Miami',
    'Atlanta', 'Las Vegas', 'Portland', 'Washington',
  ],
};

export const citiesFor = (location) => CITIES_BY_LOCATION[location] ?? [];

/**
 * `TaxRule.COUNTRY_CHOICES`/`taxSchema.js`'s `TAX_COUNTRIES` use a different
 * vocabulary than `Property.LOCATION_CHOICES`/`propertySchema.js`'s
 * `LOCATIONS` for the same five markets ("USA" vs "US", "UAE" vs "UAE
 * Dubai") — this bridges the two so tax rules can be matched against a
 * property/space's location, and so the tax builder can reuse the same
 * curated city list and live state lookup Properties already has.
 */
export const TAX_COUNTRY_BY_LOCATION = { UK: 'UK', Spain: 'Spain', Nigeria: 'Nigeria', 'UAE Dubai': 'UAE', US: 'USA' };
export const LOCATION_BY_TAX_COUNTRY = Object.fromEntries(
  Object.entries(TAX_COUNTRY_BY_LOCATION).map(([location, taxCountry]) => [taxCountry, location]),
);
