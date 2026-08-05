import { Building2, CalendarCheck, Gauge, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '@/utils/classNames';
import { Card } from '@/components/ui/Card';

const ICONS = { building: Building2, calendar: CalendarCheck, gauge: Gauge, wallet: Wallet };

/**
 * KPI tile — the row along the top of the dashboard.
 *
 * A single headline number with a delta is a stat tile, not a one-bar chart;
 * the icon and delta carry the context that a plot would otherwise supply.
 */
export const StatCard = ({ label, value, delta, trend = 'up', icon, className }) => {
  const Icon = ICONS[icon] ?? Building2;
  const TrendIcon = trend === 'down' ? TrendingDown : TrendingUp;

  return (
    <Card className={cn('p-4', className)}>
      <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50">
        <Icon className="size-4 text-brand-600" aria-hidden="true" />
      </span>

      <p className="mt-3 font-display text-[26px] font-bold leading-none text-ink">{value}</p>
      <p className="mt-1.5 text-[12px] text-ink-soft">{label}</p>

      {delta && (
        <p
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-[11px] font-semibold',
            trend === 'down' ? 'text-danger' : 'text-ok',
          )}
        >
          <TrendIcon className="size-3" aria-hidden="true" />
          {delta}
        </p>
      )}
    </Card>
  );
};
