import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { discountRuleSchema } from '@/utils/validators';

const emptyValues = (country) => ({
  country: country ?? '',
  name: '',
  percentage: '',
  startDate: '',
  endDate: '',
  isActive: true,
});

/** Edit panel for one country's promotional discount — create if unset, otherwise update in place. */
export const DiscountPanel = ({ country, rule, openCountries, onPickCountry, onClose, createRule, updateRule, isSaving }) => {
  const isEditing = Boolean(rule);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(discountRuleSchema),
    defaultValues: emptyValues(country),
  });

  useEffect(() => {
    reset(
      rule
        ? { country: rule.country, name: rule.name, percentage: rule.percentage, startDate: rule.startDate, endDate: rule.endDate, isActive: rule.isActive }
        : emptyValues(country),
    );
  }, [country, rule, reset]);

  const isActive = watch('isActive');

  const submit = (values) => {
    if (isEditing) {
      updateRule(rule.id, values);
    } else {
      createRule({ ...values, country: values.country || country });
    }
  };

  if (!country) {
    return (
      <Card className="sticky top-4">
        <CardHeader title="Country discounts" subtitle="Select a country from the grid to configure its promotion." />
        <div className="px-4 py-6 text-center text-[12px] text-ink-muted">Pick a country to get started.</div>
      </Card>
    );
  }

  return (
    <Card className="sticky top-4">
      <CardHeader
        title={isEditing ? `Edit ${country}` : `Configure ${country}`}
        subtitle={isEditing ? 'Updates apply to future bookings immediately.' : 'Applied automatically once the booking date falls inside the window.'}
        action={
          <Button size="xs" variant="ghost" aria-label="Close panel" onClick={onClose}>
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        }
      />

      <form onSubmit={handleSubmit(submit)} className="space-y-3.5 px-4 py-3.5" noValidate>
        <Select
          label="Country"
          options={isEditing ? [country] : openCountries}
          disabled={isEditing}
          hint={isEditing ? "The country a discount applies to can't be changed — delete and recreate instead." : 'One discount per country.'}
          error={errors.country?.message}
          {...register('country', { onChange: (event) => onPickCountry(event.target.value) })}
        />

        <Input label="Promo name" placeholder="e.g. Summer Promo" error={errors.name?.message} {...register('name')} />

        <Input
          label="Percentage off (%)"
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="e.g. 10"
          error={errors.percentage?.message}
          {...register('percentage')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Start date" type="date" error={errors.startDate?.message} {...register('startDate')} />
          <Input label="End date" type="date" error={errors.endDate?.message} {...register('endDate')} />
        </div>

        <div className="flex items-center gap-2.5">
          <Toggle checked={isActive} onChange={(value) => setValue('isActive', value)} label="Open" />
          <span className="text-[12.5px] text-ink">Open (applies immediately if today is inside the window)</span>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-3.5">
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {isEditing ? 'Save changes' : 'Save discount'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
