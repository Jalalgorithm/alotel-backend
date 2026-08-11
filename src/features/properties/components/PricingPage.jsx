import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  useDiscountRules,
  useDiscountRuleMutations,
  usePricingConfigs,
  usePricingConfigMutations,
  usePricingRules,
  useUpsertPricingRule,
} from '../hooks/useCatalogue';
import { availableDiscountCountries, availableConfigCountries, PRICING_COUNTRIES } from '@/lib/pricingSchema';
import { DiscountCard } from './PricingBuilder/DiscountCard';
import { DiscountPanel } from './PricingBuilder/DiscountPanel';
import { FeeConfigCard } from './PricingBuilder/FeeConfigCard';
import { FeeConfigPanel } from './PricingBuilder/FeeConfigPanel';
import { GlobalRulesPanel } from './PricingBuilder/GlobalRulesPanel';

const TABS = [
  { id: 'discounts', label: 'Country Discounts' },
  { id: 'fees', label: 'Country Fees & Currency' },
  { id: 'global', label: 'Global Deposit & Seasonal Rules' },
];

const DiscountsTab = () => {
  const { data: rules = [], isLoading } = useDiscountRules();
  const { createRule, isCreating, updateRule, deleteRule, pendingId } = useDiscountRuleMutations();
  const [selectedCountry, setSelectedCountry] = useState(null);

  const ruleByCountry = useMemo(() => new Map(rules.map((rule) => [rule.country, rule])), [rules]);
  const openCountries = availableDiscountCountries(rules);
  const activeRule = selectedCountry ? ruleByCountry.get(selectedCountry) : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
      <Card>
        <CardHeader title="Markets" subtitle="Select a country to configure its promotional discount." />
        <div className="grid grid-cols-1 gap-2.5 border-t border-line p-4 sm:grid-cols-2">
          {isLoading
            ? Array.from({ length: PRICING_COUNTRIES.length }, (_, index) => <Skeleton key={index} className="h-20" />)
            : PRICING_COUNTRIES.map((country) => (
                <DiscountCard
                  key={country}
                  country={country}
                  rule={ruleByCountry.get(country)}
                  isSelected={country === selectedCountry}
                  isDeleting={pendingId === ruleByCountry.get(country)?.id}
                  onSelect={setSelectedCountry}
                  onDelete={(id) => {
                    deleteRule(id);
                    if (selectedCountry === country) setSelectedCountry(null);
                  }}
                />
              ))}
        </div>
      </Card>

      <DiscountPanel
        country={selectedCountry}
        rule={activeRule}
        openCountries={openCountries}
        onPickCountry={setSelectedCountry}
        onClose={() => setSelectedCountry(null)}
        createRule={(values) => createRule(values, { onSuccess: () => setSelectedCountry(null) })}
        updateRule={updateRule}
        isSaving={isCreating || pendingId === activeRule?.id}
      />
    </div>
  );
};

const FeesTab = () => {
  const { data: configs = [], isLoading } = usePricingConfigs();
  const { createConfig, isCreating, updateConfig, deleteConfig, pendingId } = usePricingConfigMutations();
  const [selectedCountry, setSelectedCountry] = useState(null);

  const configByCountry = useMemo(() => new Map(configs.map((config) => [config.country, config])), [configs]);
  const openCountries = availableConfigCountries(configs);
  const activeConfig = selectedCountry ? configByCountry.get(selectedCountry) : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
      <Card>
        <CardHeader title="Markets" subtitle="Select a country to set its cleaning fee and security deposit." />
        <div className="grid grid-cols-1 gap-2.5 border-t border-line p-4 sm:grid-cols-2">
          {isLoading
            ? Array.from({ length: PRICING_COUNTRIES.length }, (_, index) => <Skeleton key={index} className="h-20" />)
            : PRICING_COUNTRIES.map((country) => (
                <FeeConfigCard
                  key={country}
                  country={country}
                  config={configByCountry.get(country)}
                  isSelected={country === selectedCountry}
                  isDeleting={pendingId === configByCountry.get(country)?.id}
                  onSelect={setSelectedCountry}
                  onDelete={(id) => {
                    deleteConfig(id);
                    if (selectedCountry === country) setSelectedCountry(null);
                  }}
                />
              ))}
        </div>
      </Card>

      <FeeConfigPanel
        country={selectedCountry}
        config={activeConfig}
        openCountries={openCountries}
        onPickCountry={setSelectedCountry}
        onClose={() => setSelectedCountry(null)}
        createConfig={(values) => createConfig(values, { onSuccess: () => setSelectedCountry(null) })}
        updateConfig={updateConfig}
        isSaving={isCreating || pendingId === activeConfig?.id}
      />
    </div>
  );
};

const GlobalTab = () => {
  const { data: rules = [], isLoading } = usePricingRules();
  const { upsertRule, isPending } = useUpsertPricingRule();

  return <GlobalRulesPanel rules={rules} isLoading={isLoading} upsertRule={upsertRule} isSaving={isPending} />;
};

/**
 * Pricing & Availability: country discounts, country fee/currency defaults,
 * and global deposit/seasonal rules — three independent backend resources,
 * each tab saving directly against its own endpoint.
 */
export const PricingPage = () => {
  const [tab, setTab] = useState('discounts');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pricing & Availability"
        subtitle="Country discounts, fee defaults and global deposit/seasonal rules."
      />

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'discounts' && <DiscountsTab />}
      {tab === 'fees' && <FeesTab />}
      {tab === 'global' && <GlobalTab />}
    </div>
  );
};
