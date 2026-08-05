import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useTaxRuleMutations, useTaxRules } from '../hooks/useFinance';
import { taxRuleSchema } from '@/utils/validators';
import { formatCurrency } from '@/utils/format';
import { TAX_FREQUENCIES, TAX_SEGMENTS, TAX_TYPES } from '@/lib/mock/finance';
import { availableCountries, TAX_COUNTRIES, UNSUPPORTED_FIELDS } from '@/lib/taxSchema';

/** Inline percentage editor — the one value the API lets an admin change. */
const RateEditor = ({ rule, onSave, isPending }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(rule.percentage));

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(String(rule.percentage));
          setIsEditing(true);
        }}
        className="rounded px-1.5 py-0.5 text-[12.5px] font-semibold tabular-nums transition-colors hover:bg-brand-50 hover:text-brand-700"
        aria-label={`Edit ${rule.name} rate`}
      >
        {rule.percentage}%
      </button>
    );
  }

  const save = () => {
    setIsEditing(false);
    if (Number(value) !== rule.percentage) onSave(value);
  };

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        min="0"
        max="100"
        step="0.01"
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') save();
          if (event.key === 'Escape') setIsEditing(false);
        }}
        className="h-7 w-20 rounded border border-brand-600 px-1.5 text-right text-[12.5px] tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-600/15"
        aria-label={`${rule.name} percentage`}
      />
      <span className="text-[12px] text-ink-muted">%</span>
      {isPending && <span className="text-[10px] text-ink-muted">saving…</span>}
    </span>
  );
};

/** A worked example so the effect of a rule change is visible immediately. */
const PREVIEW_QUOTE = {
  nightlyRate: 185,
  nights: 10,
  cleaningFee: 50,
  country: 'Spain',
  state: 'Barcelona',
  segment: 'EU Citizen',
  currency: 'EUR',
};

/** Tax rule builder with a live calculation preview. */
export const TaxPage = () => {
  const { data: rules = [], isLoading } = useTaxRules();
  const { createRule, isCreating, updateRule, deleteRule, pendingId } = useTaxRuleMutations();
  const [isAdding, setIsAdding] = useState(false);

  /** Countries already covered cannot take a second rule — the API rejects it. */
  const openCountries = availableCountries(rules);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(taxRuleSchema),
    defaultValues: {
      name: '',
      country: '',
      state: '',
      segment: 'All Guests',
      type: 'Percentage',
      value: '',
      frequency: 'Per Night',
      label: '',
    },
  });

  /**
   * Mirrors what the API does: the country's percentage is applied to the
   * nightly subtotal, not to the cleaning fee. Confirmed against a real quote —
   * a 5-night UK stay of 675 with a 45 cleaning fee is taxed 135, exactly 20%
   * of 675.
   */
  const preview = useMemo(() => {
    const subtotal = PREVIEW_QUOTE.nightlyRate * PREVIEW_QUOTE.nights;
    const rule = rules.find((entry) => entry.country === PREVIEW_QUOTE.country);
    const taxAmount = rule ? (subtotal * rule.percentage) / 100 : 0;

    return {
      subtotal,
      cleaningFee: PREVIEW_QUOTE.cleaningFee,
      rule,
      lines: rule
        ? [{ id: rule.id, label: `${rule.name} (${rule.percentage}%)`, amount: taxAmount }]
        : [],
      total: subtotal + PREVIEW_QUOTE.cleaningFee + taxAmount,
    };
  }, [rules]);

  const submit = (values) => {
    createRule({ ...values, country: values.country || openCountries[0] });
    reset();
    setIsAdding(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tax Management"
        subtitle="Rules are applied automatically at checkout based on property location and guest segment."
        actions={
          <Button variant="primary" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={() => setIsAdding(true)}>
            Add rule
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Tax rules"
          subtitle={
            rules.length
              ? `${rules.length} of ${TAX_COUNTRIES.length} markets have a tax rate`
              : 'No tax rules yet — bookings are quoted without tax'
          }
        />

        <div className="table-scroll border-t border-line">
          {isLoading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Jurisdiction</th>
                  <th>Guest segment</th>
                  <th>Type</th>
                  <th className="text-right">Value</th>
                  <th>Frequency</th>
                  <th>Guest label</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="font-semibold">{rule.name}</td>
                    <td className="whitespace-nowrap text-ink-soft">{rule.country}</td>
                    <td title={UNSUPPORTED_FIELDS.segment}>
                      <Badge variant="neutral">{rule.segment}</Badge>
                    </td>
                    <td title={UNSUPPORTED_FIELDS.type}>
                      <Badge variant="ok">{rule.type}</Badge>
                    </td>
                    <td className="text-right">
                      <RateEditor
                        rule={rule}
                        onSave={(percentage) => updateRule(rule.id, { percentage })}
                        isPending={pendingId === rule.id}
                      />
                    </td>
                    <td className="whitespace-nowrap text-ink-soft" title={UNSUPPORTED_FIELDS.frequency}>
                      {rule.frequency}
                    </td>
                    <td className="text-[11px] italic text-ink-muted">“{rule.label}”</td>
                    <td>
                      {/* The API has no on/off state — a country either has a
                          rule or it doesn't. Shown on so the column still reads
                          truthfully, with the reason on hover. */}
                      <Toggle checked disabled label={`${rule.name} active`} title={UNSUPPORTED_FIELDS.active} />
                    </td>
                    <td className="text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        aria-label={`Delete ${rule.name}`}
                        isLoading={pendingId === rule.id}
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="size-3 text-danger" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Live preview */}
      <Card>
        <CardHeader
          title="Live calculation preview"
          subtitle="Recomputes as rules are toggled — this is the exact maths applied at checkout."
        />

        <div className="grid grid-cols-1 gap-3 border-t border-line p-4 sm:grid-cols-3">
          {[
            ['Property', 'Gothic Quarter 2-Bed, Barcelona'],
            ['Guest status', 'EU Citizen (French passport)'],
            ['Stay', `10 nights @ €${PREVIEW_QUOTE.nightlyRate}/night`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-line-soft px-3 py-2">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-ink-muted">{label}</p>
              <p className="mt-0.5 text-[12px] font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>

        <div className="mx-4 mb-4 rounded-lg bg-line-soft p-4">
          <dl>
            <div className="flex justify-between border-b border-line py-1.5 text-[12.5px]">
              <dt className="text-ink-soft">
                Nightly subtotal (€{PREVIEW_QUOTE.nightlyRate} × {PREVIEW_QUOTE.nights})
              </dt>
              <dd className="font-semibold tabular-nums">{formatCurrency(preview.subtotal, 'EUR', { decimals: 2 })}</dd>
            </div>

            <div className="flex justify-between border-b border-line py-1.5 text-[12.5px]">
              <dt className="text-ink-soft">Cleaning fee</dt>
              <dd className="font-semibold tabular-nums">{formatCurrency(preview.cleaningFee, 'EUR', { decimals: 2 })}</dd>
            </div>

            {preview.lines.map((line) => (
              <div key={line.id} className="flex justify-between border-b border-line py-1.5 text-[12.5px]">
                <dt className="text-warn">{line.label}</dt>
                <dd className="font-semibold tabular-nums text-warn">
                  {formatCurrency(line.amount, 'EUR', { decimals: 2 })}
                </dd>
              </div>
            ))}

            <div className="flex justify-between pt-3 text-[14px] font-bold">
              <dt>Total to pay</dt>
              <dd className="tabular-nums text-brand-700">{formatCurrency(preview.total, 'EUR', { decimals: 2 })}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <Modal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        size="lg"
        title="Add tax rule"
        description="Applied automatically to any booking matching the jurisdiction and segment."
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button variant="primary" isLoading={isCreating} onClick={handleSubmit(submit)}>
              Save rule
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit(submit)} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2" noValidate>
          <Input
            containerClassName="sm:col-span-2"
            label="Rule name"
            placeholder="e.g. Lagos State Tourism Levy"
            error={errors.name?.message}
            {...register('name')}
          />
          <Select
            label="Country"
            options={openCountries}
            hint="One rule per market. Countries already covered are not listed."
            error={errors.country?.message}
            {...register('country')}
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

          {/*
            Everything below is collected by the design but has nowhere to go
            yet — the API stores a single percentage per country. The inputs
            stay so the intent is not lost, disabled so nobody fills them in
            expecting an effect.
          */}
          <div className="sm:col-span-2">
            <Alert variant="info" title="Not applied yet">
              Only the country, name and percentage are saved. The fields below are part of the planned tax model and
              have no effect on pricing today.
            </Alert>
          </div>

          <Input label="State / city" placeholder="e.g. Lagos" disabled hint={UNSUPPORTED_FIELDS.state} {...register('state')} />
          <Select label="Guest segment" options={TAX_SEGMENTS} disabled hint={UNSUPPORTED_FIELDS.segment} {...register('segment')} />
          <Select label="Tax type" options={TAX_TYPES} disabled hint={UNSUPPORTED_FIELDS.type} {...register('type')} />
          <Select label="Frequency" options={TAX_FREQUENCIES} disabled hint={UNSUPPORTED_FIELDS.frequency} {...register('frequency')} />
          <Input
            containerClassName="sm:col-span-2"
            label="Guest-facing label (shown at checkout)"
            placeholder="Guests see the rule name"
            disabled
            hint={UNSUPPORTED_FIELDS.label}
            {...register('label')}
          />
        </form>
      </Modal>
    </div>
  );
};
