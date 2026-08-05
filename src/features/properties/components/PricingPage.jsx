import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePricing, useSavePricing } from '../hooks/useCatalogue';

/**
 * Corporate discount ladder, deposit defaults and seasonal adjustments.
 *
 * Local edits are held in component state and committed on Save, so a partly
 * typed percentage never briefly becomes the live rate.
 */
export const PricingPage = () => {
  const { data, isLoading } = usePricing();
  const { savePricing, isPending } = useSavePricing();

  const [discounts, setDiscounts] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [seasonal, setSeasonal] = useState([]);

  useEffect(() => {
    if (!data) return;
    setDiscounts(data.discounts);
    setDeposits(data.deposits);
    setSeasonal(data.seasonal);
  }, [data]);

  const patchRow = (setter) => (id, key, value) =>
    setter((rows) => rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)));

  const patchDiscount = patchRow(setDiscounts);
  const patchDeposit = patchRow(setDeposits);
  const patchSeasonal = patchRow(setSeasonal);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Pricing & Availability" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-card" />
          <Skeleton className="h-80 rounded-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pricing & Availability"
        subtitle="Long-stay discounts, deposit defaults and seasonal adjustments."
        actions={
          <Button
            variant="primary"
            isLoading={isPending}
            onClick={() => savePricing({ discounts, deposits, seasonal })}
          >
            Save changes
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Corporate discount ladder"
            subtitle="Applied automatically once a booking reaches the night threshold."
          />

          <div className="table-scroll border-t border-line">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th className="text-right">Nights</th>
                  <th className="text-right">Discount</th>
                  <th>Effective rate</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((tier) => (
                  <tr key={tier.id}>
                    <td className="font-semibold">{tier.period}</td>
                    <td className="text-right tabular-nums text-ink-soft">{tier.nights}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          max={90}
                          value={tier.percent}
                          onChange={(event) => patchDiscount(tier.id, 'percent', Number(event.target.value))}
                          className="h-8 w-16 text-right"
                          aria-label={`${tier.period} discount percent`}
                        />
                        <span className="text-[11px] text-ink-muted">%</span>
                      </div>
                    </td>
                    <td>
                      <code className="rounded bg-line-soft px-2 py-1 text-[10.5px] text-ink-soft">
                        DR × {tier.nights} × {(1 - tier.percent / 100).toFixed(2)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Default security deposits" subtitle="Per property tier, in the listing's own currency." />

            <ul className="divide-y divide-line border-t border-line">
              {deposits.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{entry.tier}</span>
                  <Input
                    type="number"
                    min={0}
                    value={entry.amount}
                    onChange={(event) => patchDeposit(entry.id, 'amount', Number(event.target.value))}
                    className="h-8 w-24 text-right"
                    aria-label={`${entry.tier} deposit`}
                    containerClassName="w-auto"
                  />
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Seasonal adjustments" subtitle="Applied on top of the nightly rate for the dated window." />

            <ul className="divide-y divide-line border-t border-line">
              {seasonal.map((rule) => (
                <li key={rule.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Toggle
                    checked={rule.active}
                    onChange={(value) => patchSeasonal(rule.id, 'active', value)}
                    label={rule.label}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{rule.label}</span>
                  <Badge variant={rule.adjustment >= 0 ? 'warn' : 'info'}>
                    {rule.adjustment >= 0 ? '+' : ''}
                    {rule.adjustment}%
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};
