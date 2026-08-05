import { useState } from 'react';
import { Download, TrendingDown, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Progress, ProgressRow } from '@/components/ui/Progress';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { BarChart } from '@/components/charts';
import { cn } from '@/utils/classNames';
import { useAnalytics } from '../hooks/useAnalytics';
import { COUNTRIES } from '@/lib/mock/catalogue';
import { toast } from '@/stores/uiStore';

const PERIODS = ['Last 7 days', 'Last 30 days', 'This month', 'Last month', 'Last 90 days'];

/** One KPI tile. A headline number with context — not a one-bar chart. */
const KpiTile = ({ label, value, note, trend, progress }) => {
  const TrendIcon = trend === 'down' ? TrendingDown : TrendingUp;

  return (
    <Card className="p-4">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-[22px] font-bold leading-none text-ink">{value}</p>

      <p
        className={cn(
          'mt-1.5 inline-flex items-center gap-1 text-[11px]',
          trend === 'up' ? 'text-ok' : trend === 'down' ? 'text-danger' : 'text-ink-muted',
        )}
      >
        {trend && <TrendIcon className="size-3" aria-hidden="true" />}
        {note}
      </p>

      {progress !== undefined && <Progress value={progress} className="mt-2.5" label={label} />}
    </Card>
  );
};

/** Portfolio KPI analytics. */
export const AnalyticsPage = () => {
  const [country, setCountry] = useState('All');
  const [period, setPeriod] = useState('Last 30 days');

  const { data, isFetching } = useAnalytics({ country, period });

  return (
    <div className="space-y-5">
      <PageHeader
        title="KPI Analytics"
        subtitle="Demand, pricing and satisfaction across the portfolio."
        actions={
          <>
            <Select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              options={['All', ...COUNTRIES]}
              aria-label="Country"
              containerClassName="w-36"
            />
            <Select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              options={PERIODS}
              aria-label="Period"
              containerClassName="w-40"
            />
            <Button
              leftIcon={<Download className="size-3.5" aria-hidden="true" />}
              onClick={() => toast.success('Export started', `${country} · ${period}`)}
            >
              Export
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {isFetching && !data
          ? Array.from({ length: 8 }, (_, index) => <CardSkeleton key={index} />)
          : data.kpis.map((kpi) => <KpiTile key={kpi.id} {...kpi} />)}
      </section>

      {data && (
        <>
          <Card>
            <CardHeader title="Revenue by month" subtitle="Hover a column for the exact figure." />
            <div className="px-4 pb-4">
              <BarChart
                data={data.revenueByMonth}
                highlightIndex={data.revenueByMonth.length - 1}
                height={190}
                formatValue={(value) => `£${value >= 1000 ? `${(value / 1000).toFixed(value % 1000 ? 1 : 0)}k` : value}`}
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader title="Review score breakdown" subtitle="Average across all completed stays" />
              <div className="space-y-2.5 px-4 pb-4">
                <p className="font-display text-[28px] font-bold text-brand-700">
                  4.78 <span className="text-[13px] font-normal text-ink-muted">/ 5.0</span>
                </p>
                {data.reviewBreakdown.map((entry) => (
                  <ProgressRow
                    key={entry.label}
                    label={entry.label}
                    value={entry.value}
                    max={5}
                    display={entry.value.toFixed(1)}
                    labelWidth="w-28"
                  />
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Channel mix" subtitle="Where bookings originate" />
              <div className="space-y-3 px-4 pb-4">
                {data.channelMix.map((entry) => (
                  <ProgressRow key={entry.label} label={entry.label} value={entry.value} labelWidth="w-36" />
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Stay duration mix" subtitle="Share of bookings by length" />
              <div className="space-y-3 px-4 pb-4">
                {data.durationMix.map((entry) => (
                  <ProgressRow key={entry.label} label={entry.label} value={entry.value} labelWidth="w-36" />
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Occupancy by region" subtitle="Share of available nights sold" />
            <div className="space-y-2.5 px-4 pb-4">
              {data.occupancyByRegion.map((region) => (
                <ProgressRow key={region.label} label={region.label} value={region.value} />
              ))}
            </div>
          </Card>
        </>
      )}

      {isFetching && !data && <Skeleton className="h-64 rounded-card" />}
    </div>
  );
};
