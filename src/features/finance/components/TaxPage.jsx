import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { ProgressRow } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTaxRuleMutations, useTaxRules } from '../hooks/useFinance';
import { availableCountries, TAX_COUNTRIES } from '@/lib/taxSchema';
import { MarketCard } from './TaxBuilder/MarketCard';
import { BuilderPanel } from './TaxBuilder/BuilderPanel';

/** Tax builder: pick a market, shape its rate, see the effect immediately, save. */
export const TaxPage = () => {
  const { data: rules = [], isLoading } = useTaxRules();
  const { createRule, isCreating, updateRule, deleteRule, pendingId } = useTaxRuleMutations();
  const [selectedCountry, setSelectedCountry] = useState(null);

  const ruleByCountry = useMemo(() => new Map(rules.map((rule) => [rule.country, rule])), [rules]);
  const openCountries = availableCountries(rules);
  const activeRule = selectedCountry ? ruleByCountry.get(selectedCountry) : undefined;

  const handleSelect = (country) => setSelectedCountry(country);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tax Builder"
        subtitle="Pick a market, set its rate, and see the effect on a real quote before you save."
      />

      <Card>
        <CardHeader
          title="Coverage"
          subtitle={rules.length ? `${rules.length} of ${TAX_COUNTRIES.length} markets have a tax rate` : 'No tax rules yet — bookings are quoted without tax'}
        />
        <div className="border-t border-line px-4 py-3.5">
          <ProgressRow label="Markets" value={rules.length} max={TAX_COUNTRIES.length} display={`${rules.length}/${TAX_COUNTRIES.length}`} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        <Card>
          <CardHeader title="Markets" subtitle="Select a market to configure its rule." />
          <div className="grid grid-cols-1 gap-2.5 border-t border-line p-4 sm:grid-cols-2">
            {isLoading
              ? Array.from({ length: TAX_COUNTRIES.length }, (_, index) => <Skeleton key={index} className="h-20" />)
              : TAX_COUNTRIES.map((country) => (
                  <MarketCard
                    key={country}
                    country={country}
                    rule={ruleByCountry.get(country)}
                    isSelected={country === selectedCountry}
                    isDeleting={pendingId === ruleByCountry.get(country)?.id}
                    onSelect={handleSelect}
                    onDelete={(id) => {
                      deleteRule(id);
                      if (selectedCountry === country) setSelectedCountry(null);
                    }}
                  />
                ))}
          </div>
        </Card>

        <BuilderPanel
          country={selectedCountry}
          rule={activeRule}
          openCountries={openCountries}
          onPickCountry={setSelectedCountry}
          onClose={() => setSelectedCountry(null)}
          createRule={(values) => {
            createRule(values, { onSuccess: () => setSelectedCountry(null) });
          }}
          updateRule={updateRule}
          isSaving={isCreating || pendingId === activeRule?.id}
        />
      </div>
    </div>
  );
};
