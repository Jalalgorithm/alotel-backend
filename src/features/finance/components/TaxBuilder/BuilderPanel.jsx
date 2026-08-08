import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Stepper } from '@/components/ui/Stepper';
import { taxRuleSchema } from '@/utils/validators';
import { formatCurrency } from '@/utils/format';
import { TAX_FREQUENCIES, TAX_SEGMENTS, TAX_TYPES } from '@/lib/mock/finance';
import { UNSUPPORTED_FIELDS } from '@/lib/taxSchema';

const STEPS = ['Jurisdiction', 'Rate', 'Review & save'];

/** A worked example so the effect of a rate is visible immediately, not just theoretical. */
const PREVIEW_QUOTE = { nightlyRate: 185, nights: 10, cleaningFee: 50 };

const CURRENCY_FOR_COUNTRY = { UK: 'GBP', Spain: 'EUR', Nigeria: 'NGN', 'UAE Dubai': 'AED', US: 'USD' };

/**
 * The guided flow for shaping one market's tax rule. Steps through
 * jurisdiction → rate → review, with the live calculation preview inlined at
 * the rate step so the causal link between "type a number" and "guests pay
 * this much more" is immediate rather than living in a disconnected card.
 */
export const BuilderPanel = ({ country, rule, openCountries, onPickCountry, onClose, createRule, updateRule, isSaving }) => {
  const [step, setStep] = useState(0);
  const isEditing = Boolean(rule);

  const {
    register,
    handleSubmit,
    trigger,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(taxRuleSchema),
    defaultValues: {
      name: rule?.name ?? '',
      country: country ?? '',
      value: rule?.percentage ?? '',
      state: '',
      segment: 'All Guests',
      type: 'Percentage',
      frequency: 'Per Booking',
      label: '',
    },
  });

  /** Selecting a different market from the grid re-primes the form for it. */
  useEffect(() => {
    reset({
      name: rule?.name ?? '',
      country: country ?? '',
      value: rule?.percentage ?? '',
      state: '',
      segment: 'All Guests',
      type: 'Percentage',
      frequency: 'Per Booking',
      label: '',
    });
    setStep(0);
  }, [country, rule, reset]);

  const watchedCountry = watch('country') || country;
  const watchedValue = watch('value');

  const preview = useMemo(() => {
    const subtotal = PREVIEW_QUOTE.nightlyRate * PREVIEW_QUOTE.nights;
    const rate = Number(watchedValue);
    const taxAmount = Number.isFinite(rate) ? (subtotal * rate) / 100 : 0;
    const currency = CURRENCY_FOR_COUNTRY[watchedCountry] ?? 'GBP';

    return { subtotal, taxAmount, currency, total: subtotal + PREVIEW_QUOTE.cleaningFee + taxAmount };
  }, [watchedCountry, watchedValue]);

  const goNext = async () => {
    if (step === 0) {
      const ok = await trigger('country');
      if (!ok) return;
    }
    if (step === 1) {
      const ok = await trigger(['name', 'value']);
      if (!ok) return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((current) => Math.max(current - 1, 0));

  const submit = (values) => {
    if (isEditing) {
      updateRule(rule.id, { name: values.name, percentage: values.value });
    } else {
      createRule({ ...values, country: values.country || country });
    }
  };

  return (
    <Card className="sticky top-4">
      <CardHeader
        title={isEditing ? `Edit ${country}` : country ? `Configure ${country}` : 'Build a tax rule'}
        subtitle={isEditing ? 'Updates apply to future bookings immediately.' : 'Applied automatically at checkout once saved.'}
        action={
          <Button size="xs" variant="ghost" aria-label="Close builder" onClick={onClose}>
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        }
      />

      <div className="border-t border-line px-4 py-3.5">
        <Stepper steps={STEPS} current={step} onStepClick={setStep} />
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-3.5 px-4 pb-4" noValidate>
        {step === 0 && (
          <Select
            label="Country"
            placeholder={isEditing ? undefined : 'Select a market'}
            options={isEditing ? [country] : openCountries}
            disabled={isEditing}
            hint={isEditing ? 'The market a rule applies to cannot be changed — delete and recreate instead.' : 'One rule per market. Countries already covered are not listed.'}
            error={errors.country?.message}
            {...register('country', { onChange: (event) => onPickCountry(event.target.value) })}
          />
        )}

        {step === 1 && (
          <div className="space-y-3.5">
            <Input
              label="Rule name"
              placeholder="e.g. Lagos State Tourism Levy"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Percentage value (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="e.g. 7.5"
              error={errors.value?.message}
              {...register('value')}
            />

            <div className="rounded-lg bg-line-soft p-3">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                Live preview · 10-night stay
              </p>
              <dl className="mt-1.5 space-y-1 text-[12px]">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Nightly subtotal</dt>
                  <dd className="tabular-nums">{formatCurrency(preview.subtotal, preview.currency, { decimals: 2 })}</dd>
                </div>
                <div className="flex justify-between text-warn">
                  <dt>Tax added</dt>
                  <dd className="tabular-nums">{formatCurrency(preview.taxAmount, preview.currency, { decimals: 2 })}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-1 font-bold">
                  <dt>Total to pay</dt>
                  <dd className="tabular-nums text-brand-700">{formatCurrency(preview.total, preview.currency, { decimals: 2 })}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3.5">
            <div className="rounded-lg border border-line p-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink">{watch('name') || `${watchedCountry} tax`}</p>
                <Badge variant="ok">{watchedCountry}</Badge>
              </div>
              <p className="mt-1 text-[20px] font-bold tabular-nums text-brand-700">{watchedValue || 0}%</p>
              <p className="text-[11px] text-ink-muted">Applied once per booking, to the nightly subtotal only.</p>
            </div>

            <Alert variant="info" title="On the roadmap">
              These aren&apos;t saved yet — the API stores country, name and percentage only.
            </Alert>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-muted">
              <p title={UNSUPPORTED_FIELDS.segment}>Guest segment — {TAX_SEGMENTS[0]}</p>
              <p title={UNSUPPORTED_FIELDS.type}>Type — {TAX_TYPES[0]} only</p>
              <p title={UNSUPPORTED_FIELDS.frequency}>Frequency — {TAX_FREQUENCIES[2]}</p>
              <p title={UNSUPPORTED_FIELDS.state}>Sub-region — whole country</p>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 border-t border-line pt-3.5">
          <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0} leftIcon={<ArrowLeft className="size-3.5" aria-hidden="true" />}>
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" variant="primary" onClick={goNext} rightIcon={<ArrowRight className="size-3.5" aria-hidden="true" />}>
              Next
            </Button>
          ) : (
            <Button type="submit" variant="primary" isLoading={isSaving}>
              {isEditing ? 'Save changes' : 'Save rule'}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};
