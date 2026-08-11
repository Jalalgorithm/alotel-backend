import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { pricingConfigSchema } from '@/utils/validators';
import { LOCATION_CURRENCY } from '@/lib/pricingSchema';

const emptyValues = (country) => ({
  country: country ?? '',
  cleaningFee: '',
  securityDeposit: '',
  isActive: true,
});

/** Edit panel for one country's cleaning fee / security deposit / currency defaults. */
export const FeeConfigPanel = ({ country, config, openCountries, onPickCountry, onClose, createConfig, updateConfig, isSaving }) => {
  const isEditing = Boolean(config);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(pricingConfigSchema),
    defaultValues: emptyValues(country),
  });

  useEffect(() => {
    reset(
      config
        ? { country: config.country, cleaningFee: config.cleaningFee, securityDeposit: config.securityDeposit, isActive: config.isActive }
        : emptyValues(country),
    );
  }, [country, config, reset]);

  const watchedCountry = watch('country') || country;
  const isActive = watch('isActive');
  const currency = LOCATION_CURRENCY[watchedCountry];

  const submit = (values) => {
    if (isEditing) {
      updateConfig(config.id, values);
    } else {
      createConfig({ ...values, country: values.country || country });
    }
  };

  if (!country) {
    return (
      <Card className="sticky top-4">
        <CardHeader title="Country fees" subtitle="Select a country from the grid to configure its cleaning fee and deposit." />
        <div className="px-4 py-6 text-center text-[12px] text-ink-muted">Pick a country to get started.</div>
      </Card>
    );
  }

  return (
    <Card className="sticky top-4">
      <CardHeader
        title={isEditing ? `Edit ${country}` : `Configure ${country}`}
        subtitle={isEditing ? 'Overrides every property in this country immediately.' : 'Wins over each property’s own fee fields once saved.'}
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
          hint={isEditing ? "The country a config applies to can't be changed — delete and recreate instead." : 'One config per country.'}
          error={errors.country?.message}
          {...register('country', { onChange: (event) => onPickCountry(event.target.value) })}
        />

        <Input label="Currency" value={currency ?? ''} readOnly hint="Fixed per country — matches the backend's currency mapping." />

        <Input
          label="Cleaning fee"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 40"
          error={errors.cleaningFee?.message}
          {...register('cleaningFee')}
        />

        <Input
          label="Security deposit"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 150"
          error={errors.securityDeposit?.message}
          {...register('securityDeposit')}
        />

        <div className="flex items-center gap-2.5">
          <Toggle checked={isActive} onChange={(value) => setValue('isActive', value)} label="Active" />
          <span className="text-[12.5px] text-ink">Active</span>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-3.5">
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {isEditing ? 'Save changes' : 'Save config'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
