import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/utils/classNames';
import { getErrorMessage } from '@/utils/errors';
import { toast } from '@/stores/uiStore';
import { useCreateSpace, useSetSpaceStatus } from '../hooks/useSpaces';
import { spaceService } from '../services/spaceService';
import {
  ADDON_CATEGORY_SUGGESTIONS,
  ADDON_PRICING_BASIS,
  BOOKING_MODES,
  SLOT_UNITS,
  SPACE_TYPES,
  WEEKDAYS,
} from '@/lib/spaceSchema';
import { paths } from '@/routes/paths';

const DRAFT_KEY = 'alotel.admin.spaceDraft';

const STEPS = [
  { id: 'basics', label: 'Basics & Pricing', hint: 'What it is, where it is, and the base rate' },
  { id: 'layouts', label: 'Layouts', hint: 'Seating or room configurations and their capacity' },
  { id: 'addons', label: 'Add-ons', hint: 'Optional extras guests can add at checkout' },
  { id: 'hours', label: 'Hours & Blackouts', hint: 'When the space is bookable' },
  { id: 'booking-mode', label: 'Booking Mode', hint: 'Instant confirmation or host approval' },
  { id: 'review', label: 'Review', hint: 'Check everything and publish' },
];

const emptyHours = () =>
  WEEKDAYS.map(({ value }) => ({ dayOfWeek: value, isOpen: value < 5, openTime: '09:00', closeTime: '18:00' }));

const EMPTY_FORM = {
  title: '',
  type: SPACE_TYPES[0],
  description: '',
  country: '',
  state: '',
  city: '',
  address: '',
  sizeSqm: '',
  baseRate: '',
  currency: 'NGN',
  slotUnit: 'hourly',
  customSlotMinutes: '',
  minSlots: 1,
  maxSlots: '',
  bookingMode: 'instant',
  approvalExpiryHours: 24,
  layouts: [],
  addons: [],
  hours: emptyHours(),
  blackouts: [],
};

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

/** Repeatable-row builder shared by the Layouts and Add-ons steps. */
const RepeatableRows = ({ rows, onChange, onAdd, renderRow, addLabel }) => (
  <div className="space-y-2.5">
    {rows.map((row, index) => (
      <div key={index} className="flex items-start gap-2 rounded-lg border border-line bg-white p-3">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">{renderRow(row, index, onChange)}</div>
        <button
          type="button"
          onClick={() => onChange(rows.filter((_, i) => i !== index))}
          aria-label="Remove row"
          className="mt-1 shrink-0 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    ))}
    <Button type="button" size="sm" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={onAdd}>
      {addLabel}
    </Button>
  </div>
);

/* -------------------------------------------------------------------------- */

export const SpaceWizardPage = () => {
  const navigate = useNavigate();
  const { createSpaceAsync, isPending: isCreating } = useCreateSpace();
  const { setStatus: setSpaceStatus } = useSetSpaceStatus();

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
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      /* storage full or disabled — the form still works, it just won't persist */
    }
  }, [form]);

  const update = (patch) => setForm((previous) => ({ ...previous, ...patch }));

  const stepErrors = useMemo(() => {
    const errors = {};

    if (step === 0) {
      if (!form.title.trim()) errors.title = 'Give the space a name';
      if (!form.country.trim()) errors.country = 'Country is required';
      if (!form.city.trim()) errors.city = 'City is required';
      if (!form.address.trim()) errors.address = 'Address is required';
      if (!form.baseRate || Number(form.baseRate) <= 0) errors.baseRate = 'A base rate is required';
      if (form.slotUnit === 'custom' && (!form.customSlotMinutes || Number(form.customSlotMinutes) <= 0)) {
        errors.customSlotMinutes = 'Enter the slot length in minutes';
      }
    }

    if (step === 1 && form.layouts.length === 0) {
      errors.layouts = 'Add at least one layout';
    }

    if (step === 4 && form.bookingMode === 'request' && Number(form.approvalExpiryHours) <= 0) {
      errors.approvalExpiryHours = 'Enter how many hours the host has to respond';
    }

    return errors;
  }, [step, form]);

  const canAdvance = Object.keys(stepErrors).length === 0;

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
    setIsSubmitting(true);
    try {
      const space = await createSpaceAsync({ ...form, status: 'draft' });

      await Promise.all([
        ...form.layouts.map((layout) => spaceService.createLayout(space.id, layout)),
        ...form.addons.map((addon) => spaceService.createAddon(space.id, addon)),
        ...form.blackouts.map((blackout) => spaceService.createBlackoutDate(space.id, blackout)),
        spaceService.updateOperatingHours(space.id, form.hours),
      ]);

      if (publish) await setSpaceStatus({ id: space.id, status: 'published' });

      sessionStorage.removeItem(DRAFT_KEY);
      navigate(paths.spaceDetail(space.id));
    } catch (error) {
      toast.error('Could not save space', getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetDraft = () => {
    setForm(EMPTY_FORM);
    setStep(0);
    setFurthest(0);
    setShowErrors(false);
    sessionStorage.removeItem(DRAFT_KEY);
  };

  const isBusy = isSubmitting || isCreating;

  /* ------------------------------------------------------------------ steps */

  const steps = [
    // 0 · Basics & Pricing
    <div key="basics" className="space-y-4">
      <Input label="Space name" placeholder="e.g. Executive Boardroom" value={form.title} onChange={(e) => update({ title: e.target.value })} error={showErrors ? stepErrors.title : undefined} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Type" options={SPACE_TYPES} value={form.type} onChange={(e) => update({ type: e.target.value })} />
        <Input label="Size (sqm)" type="number" min="0" value={form.sizeSqm} onChange={(e) => update({ sizeSqm: e.target.value })} />
      </div>
      <Textarea label="Description" rows={3} value={form.description} onChange={(e) => update({ description: e.target.value })} />
      <div className="grid grid-cols-3 gap-3">
        <Input label="Country" value={form.country} onChange={(e) => update({ country: e.target.value })} error={showErrors ? stepErrors.country : undefined} />
        <Input label="State / province" value={form.state} onChange={(e) => update({ state: e.target.value })} />
        <Input label="City" value={form.city} onChange={(e) => update({ city: e.target.value })} error={showErrors ? stepErrors.city : undefined} />
      </div>
      <Input label="Address" value={form.address} onChange={(e) => update({ address: e.target.value })} error={showErrors ? stepErrors.address : undefined} />

      <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
        <Input label="Base rate" type="number" min="0" value={form.baseRate} onChange={(e) => update({ baseRate: e.target.value })} error={showErrors ? stepErrors.baseRate : undefined} />
        <Input label="Currency" value={form.currency} onChange={(e) => update({ currency: e.target.value.toUpperCase() })} maxLength={3} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Select label="Slot unit" options={SLOT_UNITS} value={form.slotUnit} onChange={(e) => update({ slotUnit: e.target.value })} />
        {form.slotUnit === 'custom' && (
          <Input
            label="Slot length (minutes)"
            type="number"
            min="1"
            value={form.customSlotMinutes}
            onChange={(e) => update({ customSlotMinutes: e.target.value })}
            error={showErrors ? stepErrors.customSlotMinutes : undefined}
          />
        )}
        <Input label="Min slots per booking" type="number" min="1" value={form.minSlots} onChange={(e) => update({ minSlots: e.target.value })} />
        <Input label="Max slots per booking" type="number" min="1" placeholder="No limit" value={form.maxSlots} onChange={(e) => update({ maxSlots: e.target.value })} />
      </div>
    </div>,

    // 1 · Layouts
    <div key="layouts" className="space-y-3">
      {showErrors && stepErrors.layouts && <Alert variant="error">{stepErrors.layouts}</Alert>}
      <RepeatableRows
        rows={form.layouts}
        onChange={(layouts) => update({ layouts })}
        onAdd={() => update({ layouts: [...form.layouts, { name: '', maxCapacity: '' }] })}
        addLabel="Add layout"
        renderRow={(row, index, onChange) => (
          <>
            <Input
              label="Layout name"
              placeholder="e.g. Theatre"
              value={row.name}
              onChange={(e) => onChange(form.layouts.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)))}
            />
            <Input
              label="Max capacity"
              type="number"
              min="1"
              value={row.maxCapacity}
              onChange={(e) => onChange(form.layouts.map((r, i) => (i === index ? { ...r, maxCapacity: e.target.value } : r)))}
            />
          </>
        )}
      />
    </div>,

    // 2 · Add-ons
    <div key="addons" className="space-y-3">
      <p className="text-[11.5px] text-ink-muted">Free-text categories — type your own or pick a suggestion: {ADDON_CATEGORY_SUGGESTIONS.join(', ')}.</p>
      <RepeatableRows
        rows={form.addons}
        onChange={(addons) => update({ addons })}
        onAdd={() => update({ addons: [...form.addons, { category: '', name: '', price: '', unitType: 'flat', minQty: 0, maxQty: '' }] })}
        addLabel="Add add-on"
        renderRow={(row, index, onChange) => {
          const set = (patch) => onChange(form.addons.map((r, i) => (i === index ? { ...r, ...patch } : r)));
          return (
            <>
              <Input label="Category" placeholder="e.g. Catering" value={row.category} onChange={(e) => set({ category: e.target.value })} />
              <Input label="Name" placeholder="e.g. High Tea — Set 2" value={row.name} onChange={(e) => set({ name: e.target.value })} />
              <Input label="Price" type="number" min="0" value={row.price} onChange={(e) => set({ price: e.target.value })} />
              <Select label="Pricing basis" options={ADDON_PRICING_BASIS} value={row.unitType} onChange={(e) => set({ unitType: e.target.value })} />
              <Input label="Min qty" type="number" min="0" value={row.minQty} onChange={(e) => set({ minQty: e.target.value })} />
              <Input label="Max qty" type="number" min="0" placeholder="No limit" value={row.maxQty} onChange={(e) => set({ maxQty: e.target.value })} />
            </>
          );
        }}
      />
    </div>,

    // 3 · Hours & Blackouts
    <div key="hours" className="space-y-5">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Weekly hours</p>
        <div className="space-y-1.5">
          {form.hours.map((row, index) => {
            const label = WEEKDAYS.find((d) => d.value === row.dayOfWeek)?.label;
            const setRow = (patch) => update({ hours: form.hours.map((r, i) => (i === index ? { ...r, ...patch } : r)) });
            return (
              <div key={row.dayOfWeek} className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2">
                <span className="w-24 shrink-0 text-[12px] font-semibold text-ink">{label}</span>
                <Toggle checked={row.isOpen} onChange={(isOpen) => setRow({ isOpen })} label={`${label} open`} />
                {row.isOpen ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input type="time" value={row.openTime} onChange={(e) => setRow({ openTime: e.target.value })} className="h-8 rounded-md border border-line px-2 text-[12px]" />
                    <span className="text-ink-muted">–</span>
                    <input type="time" value={row.closeTime} onChange={(e) => setRow({ closeTime: e.target.value })} className="h-8 rounded-md border border-line px-2 text-[12px]" />
                  </div>
                ) : (
                  <span className="text-[11.5px] text-ink-muted">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Blackout dates</p>
        <RepeatableRows
          rows={form.blackouts}
          onChange={(blackouts) => update({ blackouts })}
          onAdd={() => update({ blackouts: [...form.blackouts, { date: '', reason: '' }] })}
          addLabel="Add blackout date"
          renderRow={(row, index, onChange) => (
            <>
              <Input
                label="Date"
                type="date"
                value={row.date}
                onChange={(e) => onChange(form.blackouts.map((r, i) => (i === index ? { ...r, date: e.target.value } : r)))}
              />
              <Input
                label="Reason (optional)"
                placeholder="e.g. Under maintenance"
                value={row.reason}
                onChange={(e) => onChange(form.blackouts.map((r, i) => (i === index ? { ...r, reason: e.target.value } : r)))}
              />
            </>
          )}
        />
      </div>
    </div>,

    // 4 · Booking Mode
    <div key="booking-mode" className="space-y-3">
      {BOOKING_MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          onClick={() => update({ bookingMode: mode.value })}
          className={cn(
            'w-full rounded-lg border p-4 text-left transition-colors',
            form.bookingMode === mode.value ? 'border-brand-700 bg-brand-50' : 'border-line bg-white hover:border-brand-300',
          )}
        >
          <p className="text-[13px] font-semibold text-ink">{mode.label}</p>
          <p className="mt-1 text-[11.5px] text-ink-muted">
            {mode.value === 'instant'
              ? 'Guests get confirmation immediately at checkout — no host action needed.'
              : "Request gives you time to confirm catering, but guests wait for your response."}
          </p>
        </button>
      ))}

      {form.bookingMode === 'request' && (
        <Input
          label="Auto-expire requests after (hours)"
          type="number"
          min="1"
          value={form.approvalExpiryHours}
          onChange={(e) => update({ approvalExpiryHours: e.target.value })}
          error={showErrors ? stepErrors.approvalExpiryHours : undefined}
          hint="An unanswered request auto-declines and releases the time window after this many hours."
        />
      )}
    </div>,

    // 5 · Review
    <div key="review" className="space-y-4">
      <Card className="divide-y divide-line">
        <div className="p-3.5 text-[12.5px]">
          <p className="font-semibold text-ink">{form.title || 'Untitled space'}</p>
          <p className="mt-0.5 text-ink-muted">
            {form.type} · {[form.city, form.state, form.country].filter(Boolean).join(', ')}
          </p>
        </div>
        <div className="p-3.5 text-[12.5px] text-ink-soft">
          {form.currency} {form.baseRate || 0} / {form.slotUnit === 'custom' ? `${form.customSlotMinutes || 0}-min slot` : form.slotUnit.replace('_', '-')}
        </div>
        <div className="p-3.5 text-[12.5px] text-ink-soft">
          {form.layouts.length} layout{form.layouts.length === 1 ? '' : 's'} · {form.addons.length} add-on{form.addons.length === 1 ? '' : 's'} · {form.blackouts.length} blackout date{form.blackouts.length === 1 ? '' : 's'}
        </div>
        <div className="p-3.5 text-[12.5px] text-ink-soft">
          Booking mode: {BOOKING_MODES.find((m) => m.value === form.bookingMode)?.label}
          {form.bookingMode === 'request' && ` · auto-expires in ${form.approvalExpiryHours}h`}
        </div>
      </Card>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button fullWidth className="sm:flex-1" isLoading={isBusy} onClick={() => submit(false)}>
          Save as draft
        </Button>
        <Button variant="primary" fullWidth className="sm:flex-1" isLoading={isBusy} onClick={() => submit(true)}>
          Publish now
        </Button>
      </div>
    </div>,
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Add Space"
        subtitle="Six steps from basics to a bookable listing. Your progress is saved as you go."
        actions={
          <>
            <Button onClick={resetDraft}>Clear draft</Button>
            <Button to={paths.spaces}>Cancel</Button>
          </>
        }
      />

      <Stepper current={step} furthest={furthest} onJump={setStep} />

      <Card className="p-5">
        <h2 className="font-display text-[15px] font-semibold text-ink">
          {step + 1}. {STEPS[step].label}
        </h2>
        <p className="mb-5 mt-0.5 text-[11.5px] text-ink-muted">{STEPS[step].hint}</p>

        {steps[step]}

        {step < STEPS.length - 1 && (
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
            <Button onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} leftIcon={<ArrowLeft className="size-3.5" aria-hidden="true" />}>
              Back
            </Button>

            <div className="flex items-center gap-3">
              {showErrors && !canAdvance && <span className="text-[11px] text-danger">Fix the highlighted fields</span>}
              <Button variant="primary" onClick={goNext} rightIcon={<ArrowRight className="size-3.5" aria-hidden="true" />}>
                {STEPS[step + 1].label}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
