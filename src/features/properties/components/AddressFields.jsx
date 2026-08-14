import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';
import { useCountries, useCountryStates } from '@/hooks/useCountries';
import { currencyFor, LOCATIONS, LOCATION_META } from '@/lib/propertySchema';
import { propertyService } from '../services/propertyService';

/**
 * Country/state/city/address/postal/coordinates block — shared by
 * `PropertyWizardPage` and `PropertyDetailPage`'s inline edit form so both
 * get the same country-aware fields and Mapbox-backed lookup, not two
 * independently-drifting copies.
 *
 * Country drives everything else here: changing it re-fetches that
 * country's real state list (`GET /countries/<code>/states/`), clears
 * whatever state/city/postal code was typed for the previous country (a
 * stale "Lagos" surviving a switch to UK is exactly the bug this exists to
 * fix), and swaps every placeholder to a market-appropriate example.
 *
 * @param {{ form: object, update: (patch: object) => void, errorFor?: (field: string) => string|undefined }} props
 */
export const AddressFields = ({ form, update, errorFor = () => undefined }) => {
  const { data: countries } = useCountries();
  const country = countries?.find((entry) => entry.location === form.location);
  const { data: states } = useCountryStates(country?.code);
  const meta = LOCATION_META[form.location];
  const currency = currencyFor(form);

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isVerifyingPostal, setIsVerifyingPostal] = useState(false);
  const [postalCheck, setPostalCheck] = useState(null);
  const [isLookingUpPostcode, setIsLookingUpPostcode] = useState(false);
  const [postcodeLookup, setPostcodeLookup] = useState(null);

  /** Country changed — state/city/postal code from the old country are actively misleading left in place, not just stale. */
  const changeCountry = (location) => {
    update({ location, country: location, state: '', city: '', postalCode: '' });
    setPostalCheck(null);
    setPostcodeLookup(null);
  };

  /** Forward-geocode the typed address (Mapbox) and fill coordinates — still editable afterward. */
  const findOnMap = async () => {
    if (!form.address.trim()) {
      toast.error('Enter an address first', 'Type the street address before looking it up.');
      return;
    }
    setIsGeocoding(true);
    try {
      const result = await propertyService.forwardGeocode({
        address: form.address,
        city: form.city,
        state: form.state,
        location: form.location,
      });
      update({ coordinates: { lat: String(result.coordinates.lat), lng: String(result.coordinates.lng) } });
      toast.success('Location found', result.formattedAddress);
    } catch (error) {
      toast.error('Could not find that address', getErrorMessage(error));
    } finally {
      setIsGeocoding(false);
    }
  };

  /** Format-check + Mapbox-confirm the postal code against the typed address. Never blocks submission. */
  const verifyPostalCode = async () => {
    if (!form.address.trim()) {
      toast.error('Enter an address first', 'Type the street address before verifying the postal code.');
      return;
    }
    setIsVerifyingPostal(true);
    setPostalCheck(null);
    try {
      const result = await propertyService.verifyPostalCode({
        location: form.location,
        postalCode: form.postalCode,
        address: form.address,
        city: form.city,
        state: form.state,
      });
      setPostalCheck(result);
    } catch (error) {
      toast.error('Could not verify postal code', getErrorMessage(error));
    } finally {
      setIsVerifyingPostal(false);
    }
  };

  /**
   * List every candidate address under a postcode so the admin can pick the
   * right one instead of typing free-text and hoping it geocodes correctly.
   * Falls back to manual entry (the existing address fields) when nothing
   * matches or the backend flags `manual_override_required`.
   */
  const lookupAddresses = async () => {
    if (!form.postalCode.trim()) {
      toast.error('Enter a postal code first', 'Type the postcode before looking up addresses.');
      return;
    }
    setIsLookingUpPostcode(true);
    setPostcodeLookup(null);
    try {
      const result = await propertyService.lookupPostcode({ postcode: form.postalCode, location: form.location });
      setPostcodeLookup(result);
      if (!result.addresses.length) {
        toast.info('No addresses found', 'Enter the address manually below.');
      }
    } catch (error) {
      toast.error('Could not look up that postcode', getErrorMessage(error));
    } finally {
      setIsLookingUpPostcode(false);
    }
  };

  const selectLookupAddress = (address) => {
    update({
      address: address.formattedAddress,
      city: address.city || form.city,
      state: address.state || form.state,
      postalCode: address.postalCode || form.postalCode,
      coordinates: { lat: String(address.coordinates.lat), lng: String(address.coordinates.lng) },
    });
    setPostcodeLookup(null);
  };

  return (
    <div className="space-y-4">
      <Select
        label="Country"
        value={form.location}
        onChange={(event) => changeCountry(event.target.value)}
        options={LOCATIONS}
        hint={`Sets the pricing currency (${currency}) and the state list, postal code format and placeholders below`}
        error={errorFor('location')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {states?.length ? (
          <Select
            label="State / province"
            placeholder="Select"
            value={form.state}
            onChange={(event) => update({ state: event.target.value })}
            options={states}
            error={errorFor('state')}
          />
        ) : (
          <Input
            label="State / province"
            value={form.state}
            onChange={(event) => update({ state: event.target.value })}
            error={errorFor('state')}
          />
        )}
        <Input
          label="City"
          placeholder={meta?.cityPlaceholder}
          value={form.city}
          onChange={(event) => update({ city: event.target.value })}
          error={errorFor('city')}
        />
      </div>

      <Textarea
        label="Street address"
        rows={2}
        placeholder="Building, street, postcode"
        value={form.address}
        onChange={(event) => update({ address: event.target.value })}
        error={errorFor('address')}
      />

      {meta?.postalSearchSupported ? (
        <>
          <div className="flex items-end gap-3">
            <Input
              label={`${meta.postalLabel} (optional)`}
              placeholder={meta.postalPlaceholder}
              value={form.postalCode}
              onChange={(event) => {
                update({ postalCode: event.target.value });
                setPostalCheck(null);
              }}
              containerClassName="flex-1"
            />
            <Button type="button" variant="secondary" isLoading={isVerifyingPostal} onClick={verifyPostalCode}>
              Verify
            </Button>
            <Button type="button" variant="secondary" isLoading={isLookingUpPostcode} onClick={lookupAddresses}>
              Find addresses
            </Button>
          </div>
          {postalCheck && (
            <Alert variant={postalCheck.verified ? 'success' : postalCheck.formatError ? 'error' : 'warn'}>
              {postalCheck.formatError ?? postalCheck.detail}
            </Alert>
          )}

          {postcodeLookup && (
            <div className="rounded-lg border border-line bg-white">
              {postcodeLookup.addresses.length ? (
                <ul className="divide-y divide-line">
                  {postcodeLookup.addresses.map((address, index) => (
                    <li key={`${address.formattedAddress}-${index}`}>
                      <button
                        type="button"
                        onClick={() => selectLookupAddress(address)}
                        className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left text-[12.5px] text-ink hover:bg-brand-50/60"
                      >
                        <span>{address.formattedAddress}</span>
                        <span className="shrink-0 text-[11px] font-semibold text-brand-700">Use this</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3">
                  <Alert variant="warn">
                    No addresses found under this postcode. Enter the street address manually above and continue.
                  </Alert>
                </div>
              )}
              {postcodeLookup.manualOverrideRequired && postcodeLookup.addresses.length > 0 && (
                <div className="border-t border-line p-3">
                  <Alert variant="info">Can&apos;t find the right one? Edit the street address above directly — manual entry is always allowed.</Alert>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <Input
          label={`${meta?.postalLabel ?? 'Postal code'} (optional)`}
          placeholder={meta?.postalPlaceholder}
          value={form.postalCode}
          onChange={(event) => update({ postalCode: event.target.value })}
          hint="Manual entry only — no automated lookup is reliable enough to offer for this market."
        />
      )}

      <div className="flex items-end gap-3">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Latitude (optional)"
            type="number"
            step="any"
            placeholder="6.4253"
            value={form.coordinates.lat}
            onChange={(event) => update({ coordinates: { ...form.coordinates, lat: event.target.value } })}
          />
          <Input
            label="Longitude (optional)"
            type="number"
            step="any"
            placeholder="3.4419"
            value={form.coordinates.lng}
            onChange={(event) => update({ coordinates: { ...form.coordinates, lng: event.target.value } })}
          />
        </div>
        <Button type="button" variant="secondary" isLoading={isGeocoding} leftIcon={<MapPin className="size-3.5" aria-hidden="true" />} onClick={findOnMap}>
          Find on map
        </Button>
      </div>
    </div>
  );
};
