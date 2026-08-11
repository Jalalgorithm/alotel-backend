import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/format';
import { pricingRuleSchema } from '@/utils/validators';
import { PRICING_PROPERTY_TYPES, PRICING_REGIONS, findPricingRule } from '@/lib/pricingSchema';

const emptyValues = () => ({
  region: '',
  propertyType: '',
  defaultSecurityDeposit: '',
  depositCurrency: '',
  defaultCleaningFee: '',
  seasonalPriceRules: [],
});

/**
 * Global deposit & cleaning-fee defaults by region/property type, plus each
 * combination's seasonal multiplier rules. Level-1-admin only in the backend
 * (`AdminPricingSettingsView`) — there is no per-row delete, only upsert.
 */
export const GlobalRulesPanel = ({ rules = [], isLoading, upsertRule, isSaving }) => {
  const [editingRule, setEditingRule] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(pricingRuleSchema),
    defaultValues: emptyValues(),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'seasonalPriceRules' });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      editingRule
        ? {
            region: editingRule.region,
            propertyType: editingRule.propertyType,
            defaultSecurityDeposit: editingRule.defaultSecurityDeposit,
            depositCurrency: editingRule.depositCurrency,
            defaultCleaningFee: editingRule.defaultCleaningFee,
            seasonalPriceRules: editingRule.seasonalPriceRules,
          }
        : emptyValues(),
    );
  }, [isOpen, editingRule, reset]);

  const openCreate = () => {
    setEditingRule(null);
    setIsOpen(true);
  };
  const openEdit = (rule) => {
    setEditingRule(rule);
    setIsOpen(true);
  };
  const close = () => setIsOpen(false);

  const watchedRegion = watch('region');
  const watchedType = watch('propertyType');
  const collidesWithExisting = !editingRule && Boolean(findPricingRule(rules, watchedRegion, watchedType));

  const submit = (values) => {
    upsertRule(values, { onSuccess: close });
  };

  const columns = [
    { key: 'region', header: 'Region', render: (row) => PRICING_REGIONS.find((r) => r.value === row.region)?.label ?? row.region },
    { key: 'propertyType', header: 'Property type' },
    {
      key: 'defaultSecurityDeposit',
      header: 'Default deposit',
      align: 'right',
      render: (row) => formatCurrency(row.defaultSecurityDeposit, row.depositCurrency, { decimals: 2 }),
    },
    {
      key: 'defaultCleaningFee',
      header: 'Default cleaning fee',
      align: 'right',
      render: (row) => formatCurrency(row.defaultCleaningFee, row.depositCurrency, { decimals: 2 }),
    },
    {
      key: 'seasonalPriceRules',
      header: 'Seasonal rules',
      render: (row) =>
        row.seasonalPriceRules.length ? (
          <div className="flex flex-wrap gap-1">
            {row.seasonalPriceRules.map((rule) => (
              <Badge key={`${row.id}-${rule.label}`} variant="info">
                {rule.label} · {rule.multiplier}×
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-ink-muted">None</span>
        ),
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Global deposit & seasonal rules"
        subtitle="Defaults by region and property type — used when a country has no fee config of its own."
        action={
          <Button size="sm" variant="primary" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={openCreate}>
            Add rule
          </Button>
        }
      />

      <div className="border-t border-line">
        <DataTable
          columns={columns}
          rows={rules}
          isLoading={isLoading}
          onRowClick={openEdit}
          emptyTitle="No global rules yet"
          emptyDescription="Add a rule to set deposit and cleaning-fee defaults for a region and property type."
        />
      </div>

      <Modal
        isOpen={isOpen}
        onClose={close}
        title={editingRule ? `Edit ${editingRule.propertyType} · ${editingRule.region}` : 'Add a global pricing rule'}
        description="Applies to every property of this type in this region that has no country-level fee config."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={isSaving} onClick={handleSubmit(submit)}>
              {editingRule ? 'Save changes' : 'Save rule'}
            </Button>
          </div>
        }
      >
        <form className="space-y-3.5" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Region"
              placeholder="Select a region"
              options={PRICING_REGIONS}
              disabled={Boolean(editingRule)}
              error={errors.region?.message}
              {...register('region')}
            />
            <Select
              label="Property type"
              placeholder="Select a property type"
              options={PRICING_PROPERTY_TYPES}
              disabled={Boolean(editingRule)}
              error={errors.propertyType?.message}
              {...register('propertyType')}
            />
          </div>

          {collidesWithExisting && (
            <p className="text-[11px] text-warn">
              A rule already exists for this region + property type — saving will update it, not create a new one.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Default security deposit"
              type="number"
              step="0.01"
              min="0"
              error={errors.defaultSecurityDeposit?.message}
              {...register('defaultSecurityDeposit')}
            />
            <Input
              label="Deposit currency"
              placeholder="e.g. GBP"
              maxLength={3}
              error={errors.depositCurrency?.message}
              {...register('depositCurrency')}
            />
          </div>

          <Input
            label="Default cleaning fee"
            type="number"
            step="0.01"
            min="0"
            error={errors.defaultCleaningFee?.message}
            {...register('defaultCleaningFee')}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Seasonal multiplier rules</p>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                leftIcon={<Plus className="size-3" aria-hidden="true" />}
                onClick={() => append({ label: '', start: '', end: '', multiplier: 1 })}
              >
                Add rule
              </Button>
            </div>

            {fields.length === 0 && <p className="text-[11px] text-ink-muted">No seasonal adjustment — the nightly rate applies as-is year-round.</p>}

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.6fr_auto] items-end gap-2 rounded-lg border border-line p-2.5">
                <Input
                  label="Label"
                  placeholder="e.g. Christmas"
                  error={errors.seasonalPriceRules?.[index]?.label?.message}
                  {...register(`seasonalPriceRules.${index}.label`)}
                />
                <Input
                  label="Start (MM-DD)"
                  placeholder="12-20"
                  error={errors.seasonalPriceRules?.[index]?.start?.message}
                  {...register(`seasonalPriceRules.${index}.start`)}
                />
                <Input
                  label="End (MM-DD)"
                  placeholder="01-02"
                  error={errors.seasonalPriceRules?.[index]?.end?.message}
                  {...register(`seasonalPriceRules.${index}.end`)}
                />
                <Input
                  label="×"
                  type="number"
                  step="0.01"
                  min="0"
                  error={errors.seasonalPriceRules?.[index]?.multiplier?.message}
                  {...register(`seasonalPriceRules.${index}.multiplier`)}
                />
                <Button type="button" size="xs" variant="ghost" aria-label="Remove seasonal rule" onClick={() => remove(index)}>
                  <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        </form>
      </Modal>
    </Card>
  );
};
