import { useState } from 'react';
import { Download, TrendingDown, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ProgressRow } from '@/components/ui/Progress';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { BarChart } from '@/components/charts';
import { cn } from '@/utils/classNames';
import { useAnalytics, useExportAnalytics } from '../hooks/useAnalytics';
import { LOCATIONS } from '@/lib/propertySchema';

/** `range` values the backend actually accepts (`_parse_date_range`). */
const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
];

/** Key in `kpis` → tile label + how to format the raw number. */
const KPI_TILES = [
  { key: 'occupancy_rate', label: 'Occupancy Rate', suffix: '%' },
  { key: 'adr', label: 'ADR', note: 'Average daily rate' },
  { key: 'revpar', label: 'RevPAR', note: 'Revenue per available room' },
  { key: 'total_revenue', label: 'Total Revenue' },
  { key: 'revenue_growth', label: 'Revenue Growth', suffix: '%', signed: true },
  { key: 'total_bookings', label: 'Total Bookings' },
  { key: 'conversion_rate', label: 'Conversion Rate', suffix: '%' },
  { key: 'listing_views', label: 'Listing Views' },
  { key: 'booking_lead_time_days', label: 'Avg. Lead Time', note: 'days' },
  { key: 'alos_nights', label: 'Avg. Length of Stay', note: 'nights' },
  { key: 'cancellation_rate', label: 'Cancellation Rate', suffix: '%' },
  { key: 'refund_rate', label: 'Refund Rate', suffix: '%' },
  { key: 'review_score', label: 'Review Score', note: '/ 5.0' },
  { key: 'turnover_efficiency_hours', label: 'Turnover Time', note: 'hours between checkout & next check-in' },
];

/** One KPI tile. A headline number with context — not a one-bar chart. */
const KpiTile = ({ label, value, note, suffix, signed }) => {
  const numeric = Number(value) || 0;
  const trend = signed ? (numeric >= 0 ? 'up' : 'down') : null;
  const TrendIcon = trend === 'down' ? TrendingDown : TrendingUp;
  const display = `${signed && numeric > 0 ? '+' : ''}${value}${suffix ?? ''}`;

  return (
    <Card className="p-4">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-[22px] font-bold leading-none text-ink">
        {typeof value === 'number' ? display : value}
      </p>
      {(note || trend) && (
        <p
          className={cn(
            'mt-1.5 inline-flex items-center gap-1 text-[11px]',
            trend === 'up' ? 'text-ok' : trend === 'down' ? 'text-danger' : 'text-ink-muted',
          )}
        >
          {trend && <TrendIcon className="size-3" aria-hidden="true" />}
          {note}
        </p>
      )}
    </Card>
  );
};

const CHANNEL_LABELS = { direct: 'Direct', platform: 'Platform', other: 'Other' };

/** Portfolio KPI analytics — one call to `GET /analytics/kpis/`, which already returns the full metrics bundle. */
export const AnalyticsPage = () => {
  const [country, setCountry] = useState('All');
  const [range, setRange] = useState('30d');

  const { data, isFetching } = useAnalytics({ country, range });
  const { exportReport, isPending: isExporting } = useExportAnalytics();

  const kpis = data?.kpis;
  const channelMixTotal = kpis ? Object.values(kpis.channel_mix ?? {}).reduce((sum, n) => sum + n, 0) : 0;

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
              options={['All', ...LOCATIONS]}
              aria-label="Country"
              containerClassName="w-36"
            />
            <Select
              value={range}
              onChange={(event) => setRange(event.target.value)}
              options={RANGES}
              aria-label="Period"
              containerClassName="w-40"
            />
            <Button
              leftIcon={<Download className="size-3.5" aria-hidden="true" />}
              isLoading={isExporting}
              onClick={() => exportReport({ format: 'csv', range, country })}
            >
              Export
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {isFetching && !kpis
          ? Array.from({ length: 8 }, (_, index) => <CardSkeleton key={index} />)
          : KPI_TILES.map((tile) => <KpiTile key={tile.key} {...tile} value={kpis?.[tile.key] ?? 0} />)}
      </section>

      {kpis && (
        <>
          {(kpis.review_trend ?? []).length > 0 && (
            <Card>
              <CardHeader title="Review trend" subtitle="Average rating per day this period." />
              <div className="px-4 pb-4">
                <BarChart
                  data={kpis.review_trend.map((entry) => ({ label: entry.date?.slice(5) ?? '', value: entry.avg_rating }))}
                  highlightIndex={kpis.review_trend.length - 1}
                  height={190}
                  formatValue={(value) => `${value.toFixed(1)}★`}
                />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Channel mix" subtitle="Where bookings originate, this period." />
            <div className="space-y-3 px-4 pb-4">
              {Object.entries(kpis.channel_mix ?? {}).map(([channel, count]) => (
                <ProgressRow
                  key={channel}
                  label={CHANNEL_LABELS[channel] ?? channel}
                  value={channelMixTotal ? Math.round((count / channelMixTotal) * 100) : 0}
                  display={`${count}`}
                  labelWidth="w-36"
                />
              ))}
            </div>
          </Card>
        </>
      )}

      {isFetching && !kpis && <Skeleton className="h-64 rounded-card" />}
    </div>
  );
};
