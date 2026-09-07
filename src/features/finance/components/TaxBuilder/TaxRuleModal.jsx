import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { taxRuleSchema } from '@/utils/validators';
import { formatDate } from '@/utils/format';
import { useCountries, useCountryStates } from '@/hooks/useCountries';
import { citiesFor, LOCATION_BY_TAX_COUNTRY } from '@/lib/geoData';
import {
  CONFIDENCE_BADGE_VARIANT,
  GUEST_SEGMENT_NOTE,
  GUEST_SEGMENTS,
  TAX_COUNTRIES,
  TAX_FREQUENCIES,
  TAX_STATUSES,
  TAX_TYPES,
} from '@/lib/taxSchema';

const emptyValues = () => ({
  ruleName: '',
  country: '',
  state: '',
  county: '',
  city: '',
  guestSegment: [],
  taxType: 'percentage',
  value: '',
  frequency: 'per_night',
  displayLabel: '',
  status: 'active',
});

/** Create/edit form for one tax rule — country is required, state/county/city narrow its scope. */
export const TaxRuleModal = ({ isOpen, onClose, rule, createRule, updateRule, isSaving }) => {
  const isEditing = Boolean(rule);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(taxRuleSchema),
    defaultValues: emptyValues(),
  });

  const [manualCity, setManualCity] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    reset(
      rule
        ? {
            ruleName: rule.ruleName,
            country: rule.country,
            state: rule.state,
            county: rule.county,
            city: rule.city,
            guestSegment: rule.guestSegment,
            taxType: rule.taxType,
            value: rule.value,
            frequency: rule.frequency,
            displayLabel: rule.displayLabel,
            status: rule.status,
          }
        : emptyValues(),
    );
    // A loaded rule's city might not be in the curated list (an uncommon
    // town, or a country we haven't curated) — start in manual mode rather
    // than silently discarding it.
    const loadedCities = citiesFor(LOCATION_BY_TAX_COUNTRY[rule?.country]);
    setManualCity(Boolean(rule?.city) && !loadedCities.includes(rule.city));
  }, [isOpen, rule, reset]);

  const guestSegment = watch('guestSegment') ?? [];
  const toggleSegment = (value) => {
    setValue('guestSegment', guestSegment.includes(value) ? guestSegment.filter((v) => v !== value) : [...guestSegment, value]);
  };

  // Country here is a `TAX_COUNTRIES` value ('USA', 'UAE', …) — bridge to the
  // `LOCATIONS` value so the same live state list and curated city list
  // Properties/Spaces already use can be reused here too.
  const watchedCountry = watch('country');
  const location = LOCATION_BY_TAX_COUNTRY[watchedCountry];
  const { data: countries } = useCountries();
  const countryCode = countries?.find((entry) => entry.location === location)?.code;
  const { data: states } = useCountryStates(countryCode);
  const cityOptions = citiesFor(location);

  // A country switch makes the previous state/city meaningless — clear both
  // and drop back to dropdown mode for the new country's list.
  const changeCountry = () => {
    setValue('state', '');
    setValue('city', '');
    setManualCity(false);
  };

  const submit = (values) => {
    if (isEditing) {
      updateRule(rule.id, values, { onSuccess: onClose });
    } else {
      createRule(values, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit tax rule' : 'Add a tax rule'}
      description="Applies to every property matching this scope. Several rules can stack for one booking."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" isLoading={isSaving} onClick={handleSubmit(submit)}>
            {isEditing ? 'Save changes' : 'Save rule'}
          </Button>
        </div>
      }
    >
      <form className="space-y-3.5" noValidate>
        {isEditing && rule?.status === 'rejected' && rule?.rejectedReason && (
          <div className="rounded-lg border border-danger/20 bg-danger-soft p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-danger">Rejected</p>
            <p className="mt-1 text-[11.5px] leading-5 text-ink-soft">{rule.rejectedReason}</p>
            <p className="mt-2 text-[10.5px] text-ink-muted">Saving changes here re-submits it as a manual edit — it stays Rejected until approved separately.</p>
          </div>
        )}

        {isEditing && rule?.aiGenerated && (
          <div className="rounded-lg border border-line bg-brand-50/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">AI-sourced</Badge>
              {rule.confidence && (
                <Badge variant={CONFIDENCE_BADGE_VARIANT[rule.confidence] ?? 'neutral'}>{rule.confidence} confidence</Badge>
              )}
              {rule.lastVerifiedAt && <span className="text-[11px] text-ink-muted">Verified {formatDate(rule.lastVerifiedAt)}</span>}
            </div>
            {rule.caveat && <p className="mt-2 text-[11.5px] text-ink-soft">{rule.caveat}</p>}
            {rule.sourceUrl && (
              <a
                href={rule.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-brand-700 hover:underline"
              >
                View source <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            )}
            <p className="mt-2 text-[10.5px] text-ink-muted">Saving changes here records them as a manual edit, same as any other rule.</p>
          </div>
        )}

        <Input label="Rule name" placeholder="e.g. NYC Hotel Occupancy Tax" error={errors.ruleName?.message} {...register('ruleName')} />

        <div className="grid grid-cols-3 gap-3">
          <Select
            label="Country"
            placeholder="Select"
            options={TAX_COUNTRIES}
            error={errors.country?.message}
            {...register('country', { onChange: changeCountry })}
          />

          {states?.length ? (
            <Select label="State / province" placeholder="Optional" options={states} error={errors.state?.message} {...register('state')} />
          ) : (
            <Input label="State / province" placeholder="Optional" error={errors.state?.message} {...register('state')} />
          )}

          <div>
            {cityOptions.length && !manualCity ? (
              <Select label="City" placeholder="Optional" options={cityOptions} error={errors.city?.message} {...register('city')} />
            ) : (
              <Input label="City" placeholder="Optional" error={errors.city?.message} {...register('city')} />
            )}
            {cityOptions.length > 0 && (
              <button
                type="button"
                onClick={() => setManualCity((current) => !current)}
                className="mt-1 text-[11px] font-semibold text-brand-700 hover:underline"
              >
                {manualCity ? 'Choose from the list instead' : "Can't find your city? Enter it manually"}
              </button>
            )}
          </div>
        </div>
        <Input
          label="County"
          placeholder="Optional — stored for reference, not matched against a property yet"
          error={errors.county?.message}
          {...register('county')}
        />

        <div className="grid grid-cols-3 gap-3">
          <Select label="Tax type" options={TAX_TYPES} error={errors.taxType?.message} {...register('taxType')} />
          <Input label="Value" type="number" step="0.0001" min="0" error={errors.value?.message} {...register('value')} />
          <Select label="Frequency" options={TAX_FREQUENCIES} error={errors.frequency?.message} {...register('frequency')} />
        </div>

        <Input label="Display label" placeholder="Guest-facing checkout label" error={errors.displayLabel?.message} {...register('displayLabel')} />

        <Select label="Status" options={TAX_STATUSES} error={errors.status?.message} {...register('status')} />

        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Guest segment</p>
          <div className="flex flex-wrap gap-1.5">
            {GUEST_SEGMENTS.map((segment) => (
              <button
                key={segment.value}
                type="button"
                onClick={() => toggleSegment(segment.value)}
                className={
                  guestSegment.includes(segment.value)
                    ? 'rounded-full border border-brand-700 bg-brand-700 px-2.5 py-1 text-[11px] font-medium text-white'
                    : 'rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-ink-soft hover:border-brand-300'
                }
              >
                {segment.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10.5px] text-ink-muted">Empty = applies to all segments. {GUEST_SEGMENT_NOTE}</p>
        </div>
      </form>
    </Modal>
  );
};
