import { useState } from 'react';
import { cn } from '@/utils/classNames';
import { CHROME, EMPHASIS } from './palette';

/**
 * Single-series column chart with emphasis.
 *
 * The reader's job here is "how did this week go, and which day stands out" —
 * one series, so there is no legend and no categorical colour. The hovered (or
 * `highlightIndex`) column takes the accent while the rest recede, which is the
 * emphasis form rather than a rainbow of equal-weight bars.
 *
 * Bars are anchored to the baseline with rounded tops only, and separated by a
 * surface-coloured gap.
 *
 * @param {{
 *   data: Array<{ label: string, value: number }>,
 *   highlightIndex?: number,
 *   formatValue?: (value: number) => string,
 *   height?: number,
 * }} props
 */
export const BarChart = ({
  data = [],
  highlightIndex,
  formatValue = (value) => value.toLocaleString(),
  height = 168,
  className,
}) => {
  const [hovered, setHovered] = useState(null);

  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  // Round the axis up to a friendly number so gridlines land on whole values.
  const step = 10 ** Math.floor(Math.log10(max));
  const axisMax = Math.ceil(max / step) * step;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => axisMax * t);

  const active = hovered ?? highlightIndex;

  return (
    <div className={cn('relative', className)}>
      <div className="flex gap-2" style={{ height }}>
        {/* Y axis — recessive, tabular so ticks align */}
        <div
          className="flex w-12 shrink-0 flex-col-reverse justify-between pb-5 text-right text-[10px] tabular-nums text-ink-muted"
          aria-hidden="true"
        >
          {ticks.map((tick) => (
            <span key={tick}>{formatValue(tick)}</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Gridlines sit behind the marks and never compete with them */}
          <div className="absolute inset-x-0 bottom-5 top-0 flex flex-col-reverse justify-between" aria-hidden="true">
            {ticks.map((tick, index) => (
              <span
                key={tick}
                className="h-px w-full"
                style={{ background: index === 0 ? CHROME.axis : CHROME.grid }}
              />
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 top-0 flex items-end gap-1.5">
            {data.map((point, index) => {
              const isActive = active === index;
              const barHeight = Math.max(2, ((point.value / axisMax) * (height - 20)));

              return (
                <div
                  key={point.label}
                  className="group relative flex min-w-0 flex-1 flex-col items-center justify-end"
                  style={{ height }}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  tabIndex={0}
                  role="img"
                  aria-label={`${point.label}: ${formatValue(point.value)}`}
                >
                  {/* Tooltip — the hover layer every interactive chart ships */}
                  {isActive && (
                    <div
                      className="pointer-events-none absolute z-10 -translate-y-1 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[10px] font-semibold text-white shadow-raised"
                      style={{ bottom: barHeight + 24 }}
                    >
                      {formatValue(point.value)}
                      <span className="ml-1 font-normal text-white/60">{point.label}</span>
                    </div>
                  )}

                  {/* Rounded top only — the mark stays anchored to the baseline */}
                  <div
                    className="w-full rounded-t-[4px] transition-colors duration-150"
                    style={{ height: barHeight, background: isActive ? EMPHASIS.accent : EMPHASIS.rest }}
                  />

                  <span
                    className={cn(
                      'mt-1.5 h-4 text-[10px] transition-colors',
                      isActive ? 'font-semibold text-ink' : 'text-ink-muted',
                    )}
                  >
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
