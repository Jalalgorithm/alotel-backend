import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  Check,
  MapPin,
  Minus,
  Plus,
  Save,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/classNames';
import { formatCurrency } from '@/utils/format';
import { getFieldErrors } from '@/utils/errors';
import { useCreateProperty, usePropertyStatus, useUploadPropertyImages } from '../hooks/useProperties';
import { PhotoPicker } from './PhotoPicker';
import { AddressFields } from './AddressFields';
import {
  ACCESS_FEATURES,
  AMENITY_GROUPS,
  CLASSIFICATIONS,
  FURNISHED_OPTIONS,
  LOCATION_META,
  PETS_OPTIONS,
  PROPERTY_TYPES,
  currencyFor,
} from '@/lib/propertySchema';
import { paths } from '@/routes/paths';

const DRAFT_KEY = 'alotel.admin.propertyDraft';

const STEPS = [
  { id: 'basics', label: 'Basics', hint: 'What it is and where it is' },
  { id: 'space', label: 'Space', hint: 'Layout and capacity' },
  { id: 'features', label: 'Features', hint: 'Amenities and accessibility' },
  { id: 'photos', label: 'Photos', hint: 'How the listing looks to guests' },
  { id: 'pricing', label: 'Pricing', hint: 'Rates, fees and stay rules' },
  { id: 'review', label: 'Review', hint: 'Check and publish' },
];

const EMPTY_FORM = {
  name: '',
  classification: 'Alotel',
  location: 'Nigeria',
  country: 'Nigeria',
  state: '',
  city: '',
  address: '',
  postalCode: '',
  coordinates: { lat: '', lng: '' },
  type: 'Studio',
  bedrooms: 0,
  bathrooms: 1,
  maxGuests: 2,
  area: '',
  furnished: 'Fully Furnished',
  pets: 'No pets',
  amenities: [],
  accessFeatures: [],
  baseRate: '',
  weekendRate: '',
  monthlyRate: '',
  cleaningFee: '',
  securityDeposit: '',
  minStay: 1,
  maxStay: '',
  instantBook: false,
};

/** Studios and single rooms have no bedroom count to set. */
const isStudio = (type) => ['Studio', 'Room'].includes(type);

/* -------------------------------------------------------------------------- */
/* Small controls                                                              */
/* -------------------------------------------------------------------------- */

const Stepper = ({ current, onJump, furthest }) => (
  <ol className="scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto pb-1">
    {STEPS.map((step, index) => {
      const isDone = index < current;
      const isCurrent = index === current;
      const reachable = index <= furthest;

      return (
        <li key={step.id} className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={!reachable}
            onClick={() => reachable && onJump(index)}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors',
              isCurrent && 'border-brand-700 bg-brand-700 text-white',
              isDone && 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100',
              !isCurrent && !isDone && 'border-line bg-white text-ink-muted',
              !reachable && 'cursor-not-allowed opacity-60',
            )}
          >
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded-full text-[9px]',
                isCurrent ? 'bg-white/20' : isDone ? 'bg-brand-600 text-white' : 'bg-black/5',
              )}
            >
              {isDone ? <Check className="size-2.5" aria-hidden="true" /> : index + 1}
            </span>
            {step.label}
          </button>

          {index < STEPS.length - 1 && (
            <span aria-hidden="true" className={cn('h-px w-4 shrink-0', isDone ? 'bg-brand-600' : 'bg-line')} />
          )}
        </li>
      );
    })}
  </ol>
);

const Counter = ({ label, value, onChange, min = 0, max = 99, suffix }) => (
  <div>
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">{label}</p>
    <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-white p-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, Number(value) - 1))}
        disabled={Number(value) <= min}
        aria-label={`Decrease ${label}`}
        className="flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-40"
      >
        <Minus className="size-3" />
      </button>
      <span className="min-w-10 text-center text-[14px] font-semibold tabular-nums">
        {value}
        {suffix}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, Number(value) + 1))}
        disabled={Number(value) >= max}
        aria-label={`Increase ${label}`}
        className="flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-40"
      >
        <Plus className="size-3" />
      </button>
    </div>
  </div>
);

const ChipToggle = ({ label, checked, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={checked}
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] transition-colors',
      checked
        ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700'
        : 'border-line bg-white text-ink-soft hover:border-brand-300',
    )}
  >
    <span
      className={cn(
        'flex size-3.5 items-center justify-center rounded-full border',
        checked ? 'border-brand-600 bg-brand-600' : 'border-line',
      )}
    >
      {checked && <Check className="size-2 text-white" aria-hidden="true" />}
    </span>
    {label}
  </button>
);

/** Live summary of what the listing will look like. */
const PreviewPanel = ({ form, currency }) => (
  <Card className="overflow-hidden lg:sticky lg:top-5">
    <div className="flex h-24 items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
      <Building2 className="size-6 text-brand-600/40" aria-hidden="true" />
    </div>

    <div className="p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Live preview</p>

      <h3 className="mt-2 truncate font-display text-[14px] font-semibold text-ink">
        {form.name || 'Untitled property'}
      </h3>

      <p className="mt-0.5 inline-flex items-center gap-1 truncate text-[11px] text-ink-muted">
        <MapPin className="size-3 shrink-0 text-brand-600" aria-hidden="true" />
        {[form.city, form.country].filter(Boolean).join(', ') || 'Location not set'}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <BedDouble className="size-3" aria-hidden="true" />
          {isStudio(form.type) ? 'Studio' : `${form.bedrooms} bed`}
        </span>
        <span className="inline-flex items-center gap-1">
          <Bath className="size-3" aria-hidden="true" />
          {form.bathrooms} bath
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3" aria-hidden="true" />
          {form.maxGuests}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Badge variant="ok">{form.classification}</Badge>
        <Badge variant="neutral">{form.type}</Badge>
        {form.instantBook && <Badge variant="info">Instant book</Badge>}
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <p className="font-display text-[18px] font-bold text-brand-700">
          {form.baseRate ? formatCurrency(Number(form.baseRate), currency) : '—'}
          <span className="ml-1 text-[11px] font-normal text-ink-muted">/night</span>
        </p>

        {(form.cleaningFee || form.securityDeposit) && (
          <p className="mt-1 text-[10.5px] text-ink-muted">
            {form.cleaningFee ? `${formatCurrency(Number(form.cleaningFee), currency)} cleaning` : ''}
            {form.cleaningFee && form.securityDeposit ? ' · ' : ''}
            {form.securityDeposit ? `${formatCurrency(Number(form.securityDeposit), currency)} deposit` : ''}
          </p>
        )}

        <p className="mt-1.5 text-[10.5px] text-ink-muted">
          {form.amenities.length} amenities · {form.accessFeatures.length} accessibility features
        </p>
      </div>
    </div>
  </Card>
);

/* -------------------------------------------------------------------------- */
/* Wizard                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Create a listing.
 *
 * The draft is mirrored to sessionStorage on every change, so a refresh or an
 * accidental navigation doesn't cost the admin everything they typed — this
 * form is long enough that losing it would be genuinely painful.
 */
export const PropertyWizardPage = () => {
  const navigate = useNavigate();
  const { createPropertyAsync, isPending } = useCreateProperty();
  const { uploadImagesAsync, isPending: isUploading } = useUploadPropertyImages();
  const { setStatusAsync } = usePropertyStatus();

  /**
   * Photos live in component state rather than the sessionStorage draft: a
   * `File` cannot be serialised to JSON, so persisting them would silently
   * store empty objects and the wizard would upload nothing.
   */
  const [photos, setPhotos] = useState([]);

  const [form, setForm] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      return saved ? { ...EMPTY_FORM, ...JSON.parse(saved) } : EMPTY_FORM;
    } catch {
      return EMPTY_FORM;
    }
  });
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [serverErrors, setServerErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      /* storage full or disabled — the form still works, it just won't persist */
    }
  }, [form]);

  const update = useCallback((patch) => {
    setForm((previous) => ({ ...previous, ...patch }));
    setServerErrors({});
  }, []);

  const toggleIn = (key) => (value) =>
    setForm((previous) => ({
      ...previous,
      [key]: previous[key].includes(value)
        ? previous[key].filter((entry) => entry !== value)
        : [...previous[key], value],
    }));

  const currency = useMemo(() => currencyFor(form), [form]);

  /** Per-step validation. Returned map is empty when the step is complete. */
  const stepErrors = useMemo(() => {
    const errors = {};

    if (step === 0) {
      if (!form.name.trim()) errors.name = 'Give the listing a name';
      if (!form.country.trim()) errors.country = 'Country is required';
      if (!form.state.trim()) errors.state = 'State / province is required';
      if (!form.city.trim()) errors.city = 'City is required';
      if (!form.address.trim()) errors.address = 'Street address is required';
    }

    if (step === 1) {
      if (!form.area || Number(form.area) <= 0) errors.area = 'Floor area is required';
      if (!isStudio(form.type) && Number(form.bedrooms) < 1) errors.bedrooms = 'At least one bedroom';
    }

    if (step === 4) {
      if (!form.baseRate || Number(form.baseRate) <= 0) errors.baseRate = 'A nightly rate is required';
      if (form.maxStay && Number(form.maxStay) < Number(form.minStay)) {
        errors.maxStay = 'Maximum stay cannot be shorter than the minimum';
      }
    }

    return errors;
  }, [step, form]);

  const errors = { ...stepErrors, ...serverErrors };
  /** Creating, uploading and publishing are one action from the admin's view. */
  const isBusy = isPending || isUploading;
  const canAdvance = Object.keys(stepErrors).length === 0;
  const errorFor = (field) => (showErrors ? errors[field] : serverErrors[field]);

  const goNext = () => {
    if (!canAdvance) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    const next = Math.min(step + 1, STEPS.length - 1);
    setStep(next);
    setFurthest((current) => Math.max(current, next));
  };

  const submit = async (publish) => {
    try {
      /**
       * Always create as a draft first. Publishing before the photos have
       * uploaded would put an imageless listing in front of guests, and the
       * upload endpoint needs a property id to attach them to.
       */
      const property = await createPropertyAsync({ form, publish: false });

      if (photos.length) {
        await uploadImagesAsync({ propertyId: property.id, photos, setThumbnail: true });
      }

      if (publish) {
        await setStatusAsync({ id: property.id, status: 'published' });
      }

      sessionStorage.removeItem(DRAFT_KEY);
      navigate(paths.propertyDetail(property.id));
    } catch (error) {
      // Surface field errors the API raised, and jump to the step that owns
      // the first one so the admin isn't hunting for it.
      const fields = getFieldErrors(error);
      setServerErrors(fields);
      setShowErrors(true);

      const stepOwner = {
        name: 0, classification: 0, country: 0, state: 0, city: 0, address: 0, location: 0,
        type: 1, bedrooms: 1, bathrooms: 1, maxGuests: 1, area: 1, furnished: 1, pets: 1,
        amenities: 2, accessFeatures: 2,
        baseRate: 4, weekendRate: 4, monthlyRate: 4, cleaningFee: 4, securityDeposit: 4, minStay: 4, maxStay: 4,
      };
      const firstField = Object.keys(fields)[0];
      if (firstField && stepOwner[firstField] !== undefined) setStep(stepOwner[firstField]);
    }
  };

  const resetDraft = () => {
    setForm(EMPTY_FORM);
    photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setPhotos([]);
    setStep(0);
    setFurthest(0);
    setServerErrors({});
    sessionStorage.removeItem(DRAFT_KEY);
  };

  /* ------------------------------------------------------------------ steps */

  const steps = [
    // 0 · Basics
    <div key="basics" className="space-y-4">
      <Input
        label="Listing name"
        placeholder={LOCATION_META[form.location]?.listingNamePlaceholder}
        value={form.name}
        onChange={(event) => update({ name: event.target.value })}
        error={errorFor('name')}
      />

      <Select
        label="Classification"
        value={form.classification}
        onChange={(event) => update({ classification: event.target.value })}
        options={CLASSIFICATIONS}
        hint="Internal only — never shown to guests"
        error={errorFor('classification')}
      />

      <AddressFields form={form} update={update} errorFor={errorFor} />
    </div>,

    // 1 · Space
    <div key="space" className="space-y-5">
      <Select
        label="Property type"
        value={form.type}
        onChange={(event) => {
          const type = event.target.value;
          update({ type, bedrooms: isStudio(type) ? 0 : Math.max(1, form.bedrooms) });
        }}
        options={PROPERTY_TYPES}
        error={errorFor('type')}
      />

      <div className="flex flex-wrap gap-6">
        {!isStudio(form.type) && (
          <Counter label="Bedrooms" value={form.bedrooms} onChange={(v) => update({ bedrooms: v })} min={1} />
        )}
        <Counter label="Bathrooms" value={form.bathrooms} onChange={(v) => update({ bathrooms: v })} min={1} />
        <Counter label="Max guests" value={form.maxGuests} onChange={(v) => update({ maxGuests: v })} min={1} />
      </div>
      {errorFor('bedrooms') && <p className="text-[11px] text-danger">{errorFor('bedrooms')}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          label="Floor area (m²)"
          type="number"
          min="0"
          placeholder="120"
          value={form.area}
          onChange={(event) => update({ area: event.target.value })}
          error={errorFor('area')}
        />
        <Select
          label="Furnishing"
          value={form.furnished}
          onChange={(event) => update({ furnished: event.target.value })}
          options={FURNISHED_OPTIONS}
          error={errorFor('furnished')}
        />
        <Select
          label="Pet policy"
          value={form.pets}
          onChange={(event) => update({ pets: event.target.value })}
          options={PETS_OPTIONS}
          error={errorFor('pets')}
        />
      </div>
    </div>,

    // 2 · Features
    <div key="features" className="space-y-6">
      {AMENITY_GROUPS.map((group) => (
        <div key={group.id}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[12.5px] font-semibold text-ink">{group.label}</p>
            <span className="text-[11px] text-ink-muted">
              {group.items.filter((item) => form.amenities.includes(item)).length}/{group.items.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item) => (
              <ChipToggle
                key={item}
                label={item}
                checked={form.amenities.includes(item)}
                onToggle={() => toggleIn('amenities')(item)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="border-t border-line pt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[12.5px] font-semibold text-ink">Accessibility</p>
          <span className="text-[11px] text-ink-muted">{form.accessFeatures.length} selected</span>
        </div>
        <p className="mb-2.5 text-[11.5px] text-ink-muted">
          These become filter chips guests can search on — only tick what is genuinely present.
        </p>
        <div className="flex flex-wrap gap-2">
          {ACCESS_FEATURES.map((feature) => (
            <ChipToggle
              key={feature}
              label={feature}
              checked={form.accessFeatures.includes(feature)}
              onToggle={() => toggleIn('accessFeatures')(feature)}
            />
          ))}
        </div>
      </div>
    </div>,

    // 3 · Photos
    <div key="photos" className="space-y-4">
      <Alert variant="info" title="The first photo is the cover">
        It becomes the listing&apos;s thumbnail everywhere — the admin grid, search results and the guest catalogue.
        Drag to reorder, or use the arrows.
      </Alert>

      <PhotoPicker photos={photos} onChange={setPhotos} disabled={isBusy} />

      {photos.length === 0 && (
        <p className="text-[11.5px] text-ink-muted">
          You can publish without photos and add them later from the property page — but a listing with no
          photography converts badly, so it is worth doing now.
        </p>
      )}

      {/* Files cannot be JSON-serialised, so they are the one part of the
          wizard the saved draft cannot hold. Say so rather than losing them
          silently. */}
      {photos.length > 0 && (
        <p className="text-[11.5px] text-warn">
          Photos are not kept in the saved draft — if you leave this page you will need to pick them again.
        </p>
      )}
    </div>,

    // 4 · Pricing
    <div key="pricing" className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          label={`Nightly rate (${currency})`}
          type="number"
          min="0"
          placeholder="185000"
          value={form.baseRate}
          onChange={(event) => update({ baseRate: event.target.value })}
          error={errorFor('baseRate')}
        />
        <Input
          label="Weekend rate (optional)"
          type="number"
          min="0"
          value={form.weekendRate}
          onChange={(event) => update({ weekendRate: event.target.value })}
          hint="Blank uses the nightly rate"
          error={errorFor('weekendRate')}
        />
        <Input
          label="Monthly rate (optional)"
          type="number"
          min="0"
          value={form.monthlyRate}
          onChange={(event) => update({ monthlyRate: event.target.value })}
          hint="Display only — not used in pricing"
          error={errorFor('monthlyRate')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Cleaning fee (optional)"
          type="number"
          min="0"
          value={form.cleaningFee}
          onChange={(event) => update({ cleaningFee: event.target.value })}
          hint="Blank uses the market default"
          error={errorFor('cleaningFee')}
        />
        <Input
          label="Security deposit (optional)"
          type="number"
          min="0"
          value={form.securityDeposit}
          onChange={(event) => update({ securityDeposit: event.target.value })}
          hint="Blank uses the market default"
          error={errorFor('securityDeposit')}
        />
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <Counter label="Minimum stay" value={form.minStay} onChange={(v) => update({ minStay: v })} min={1} suffix=" nights" />
        <div>
          <Input
            label="Maximum stay (optional)"
            type="number"
            min="1"
            placeholder="No maximum"
            value={form.maxStay}
            onChange={(event) => update({ maxStay: event.target.value })}
            error={errorFor('maxStay')}
            containerClassName="w-44"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-line-soft px-4 py-3">
        <div>
          <p className="text-[12.5px] font-semibold text-ink">Instant book</p>
          <p className="text-[11px] text-ink-muted">Confirm bookings automatically, without admin approval.</p>
        </div>
        <Toggle checked={form.instantBook} onChange={(value) => update({ instantBook: value })} label="Instant book" />
      </div>
    </div>,

    // 5 · Review
    <div key="review" className="space-y-4">
      <Alert variant="info" title="Nothing goes live until you say so">
        Saving as a draft keeps the listing hidden from guests. Publishing makes it immediately bookable.
      </Alert>

      {Object.keys(serverErrors).length > 0 && (
        <Alert variant="error" title="The API rejected some fields">
          <ul className="mt-1 list-inside list-disc">
            {Object.entries(serverErrors).map(([field, message]) => (
              <li key={field}>
                <span className="font-medium">{field}</span>: {message}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          ['Name', form.name || '—'],
          ['Classification', form.classification],
          ['Market', `${form.location} · ${currency}`],
          ['Address', [form.address, form.city, form.state, form.country].filter(Boolean).join(', ') || '—'],
          ['Type', form.type],
          ['Configuration', `${isStudio(form.type) ? 'Studio' : `${form.bedrooms} bed`} · ${form.bathrooms} bath · max ${form.maxGuests}`],
          ['Floor area', form.area ? `${form.area} m²` : '—'],
          ['Furnishing', form.furnished],
          ['Pets', form.pets],
          ['Amenities', form.amenities.length ? `${form.amenities.length} selected` : 'None'],
          ['Accessibility', form.accessFeatures.length ? `${form.accessFeatures.length} selected` : 'None'],
          ['Photos', photos.length ? `${photos.length} to upload` : 'None yet'],
          ['Nightly rate', form.baseRate ? formatCurrency(Number(form.baseRate), currency) : '—'],
          ['Cleaning fee', form.cleaningFee ? formatCurrency(Number(form.cleaningFee), currency) : 'Market default'],
          ['Security deposit', form.securityDeposit ? formatCurrency(Number(form.securityDeposit), currency) : 'Market default'],
          ['Stay limits', `${form.minStay} night min${form.maxStay ? ` · ${form.maxStay} night max` : ''}`],
          ['Instant book', form.instantBook ? 'Enabled' : 'Admin approves'],
        ].map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 rounded-lg bg-line-soft px-3 py-2">
            <span className="shrink-0 text-[11px] font-semibold text-brand-700">{label}</span>
            <span className="min-w-0 text-right text-[11.5px] text-ink">{value}</span>
          </div>
        ))}
      </div>

      {/*
        `fullWidth` is `w-full`, which on a flex row makes each button 100% of
        the row — two of them then overflow it and the second lands off-screen
        entirely. `sm:flex-1` sets flex-basis to 0 so they share the width
        instead, and `min-w-0` lets a long label ("Uploading 3 photos…") shrink
        rather than push the row wider.
      */}
      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
        <Button
          fullWidth
          size="lg"
          className="min-w-0 sm:flex-1"
          isLoading={isBusy}
          leftIcon={<Save className="size-3.5" aria-hidden="true" />}
          onClick={() => submit(false)}
        >
          Save as draft
        </Button>
        <Button
          variant="primary"
          fullWidth
          size="lg"
          className="min-w-0 sm:flex-1"
          isLoading={isBusy}
          onClick={() => submit(true)}
        >
          {isUploading ? `Uploading ${photos.length} photo${photos.length === 1 ? '' : 's'}…` : 'Publish now'}
        </Button>
      </div>
    </div>,
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Add Property"
        subtitle="Five steps from address to live listing. Your progress is saved as you go."
        actions={
          <>
            <Button onClick={resetDraft}>Clear draft</Button>
            <Button to={paths.properties}>Cancel</Button>
          </>
        }
      />

      <Stepper current={step} furthest={furthest} onJump={setStep} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
        <Card className="p-5">
          <h2 className="font-display text-[15px] font-semibold text-ink">
            {step + 1}. {STEPS[step].label}
          </h2>
          <p className="mb-5 mt-0.5 text-[11.5px] text-ink-muted">{STEPS[step].hint}</p>

          {steps[step]}

          {step < STEPS.length - 1 && (
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
              <Button
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
                leftIcon={<ArrowLeft className="size-3.5" aria-hidden="true" />}
              >
                Back
              </Button>

              <div className="flex items-center gap-3">
                {showErrors && !canAdvance && (
                  <span className="text-[11px] text-danger">Fix the highlighted fields</span>
                )}
                <Button
                  variant="primary"
                  onClick={goNext}
                  rightIcon={<ArrowRight className="size-3.5" aria-hidden="true" />}
                >
                  {STEPS[step + 1].label}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <div className="lg:order-last">
          <PreviewPanel form={form} currency={currency} />
        </div>
      </div>
    </div>
  );
};
