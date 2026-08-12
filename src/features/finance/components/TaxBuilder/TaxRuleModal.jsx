import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { taxRuleSchema } from '@/utils/validators';
import { GUEST_SEGMENT_NOTE, GUEST_SEGMENTS, TAX_COUNTRIES, TAX_FREQUENCIES, TAX_STATUSES, TAX_TYPES } from '@/lib/taxSchema';

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
  }, [isOpen, rule, reset]);

  const guestSegment = watch('guestSegment') ?? [];
  const toggleSegment = (value) => {
    setValue('guestSegment', guestSegment.includes(value) ? guestSegment.filter((v) => v !== value) : [...guestSegment, value]);
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
        <Input label="Rule name" placeholder="e.g. NYC Hotel Occupancy Tax" error={errors.ruleName?.message} {...register('ruleName')} />

        <div className="grid grid-cols-3 gap-3">
          <Select label="Country" placeholder="Select" options={TAX_COUNTRIES} error={errors.country?.message} {...register('country')} />
          <Input label="State / province" placeholder="Optional" error={errors.state?.message} {...register('state')} />
          <Input label="City" placeholder="Optional" error={errors.city?.message} {...register('city')} />
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
