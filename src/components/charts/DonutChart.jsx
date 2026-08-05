import { useState } from 'react';
import { cn } from '@/utils/classNames';
import { seriesColor, OTHER } from './palette';

const TAU = Math.PI * 2;

/** Polar -> cartesian on the ring, with 12 o'clock as 0. */
const pointOnRing = (cx, cy, radius, fraction) => {
  const angle = fraction * TAU - Math.PI / 2;
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
};

/**
 * Part-to-whole donut with a hero figure in the hole.
 *
 * Segments are separated by a surface-coloured gap so adjacent fills never
 * touch, and every category is direct-labelled in the legend with its share —
 * which is what discharges the sub-3:1 contrast warning on two of the palette
 * slots. Colour never carries meaning on its own here.
 *
 * @param {{
 *   data: Array<{ label: string, value: number, isOther?: boolean }>,
 *   centerValue?: string,
 *   centerLabel?: string,
 *   size?: number,
 * }} props
 */
export const DonutChart = ({ data = [], centerValue, centerLabel, size = 168, className }) => {
  const [hovered, setHovered] = useState(null);

  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  if (!total) return null;

  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 2;
  const thickness = size * 0.19;
  const radius = outer - thickness / 2;

  // A fixed angular gap reads as a consistent 2px surface separator.
  const gap = 0.006;

  let cursor = 0;
  const segments = data.map((slice, index) => {
    const fraction = slice.value / total;
    const start = cursor + gap / 2;
    const end = cursor + fraction - gap / 2;
    cursor += fraction;

    const [x1, y1] = pointOnRing(cx, cy, radius, start);
    const [x2, y2] = pointOnRing(cx, cy, radius, Math.max(start, end));
    const largeArc = end - start > 0.5 ? 1 : 0;

    return {
      ...slice,
      index,
      fraction,
      color: slice.isOther ? OTHER : seriesColor(index),
      path: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
    };
  });

  // The hole's usable width — the centre label must not spill over the ring.
  const holeWidth = (size / 2 - thickness) * 1.5;

  return (
    // Container query, not a media query: the donut sits in cards of very
    // different widths, and it is the card that decides whether the legend
    // fits beside the ring or has to go beneath it.
    <div className={cn('@container', className)}>
      <div className="flex flex-col items-center gap-4 @[19rem]:flex-row">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={centerLabel ?? 'Breakdown'}>
          {segments.map((segment) => (
            <path
              key={segment.label}
              d={segment.path}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeLinecap="butt"
              opacity={hovered === null || hovered === segment.index ? 1 : 0.35}
              className="transition-opacity duration-150"
              onMouseEnter={() => setHovered(segment.index)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>

          {/* Hero figure in the hole */}
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center"
            style={{ maxWidth: size }}
          >
            {hovered === null ? (
              <>
                {centerValue && <span className="font-display text-[20px] font-bold leading-none text-ink">{centerValue}</span>}
                {centerLabel && (
                  <span
                    className="mt-1 text-[9.5px] leading-tight text-ink-muted"
                    style={{ maxWidth: holeWidth }}
                  >
                    {centerLabel}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="font-display text-[20px] font-bold leading-none text-ink">
                  {Math.round(segments[hovered].fraction * 100)}%
                </span>
                <span className="mt-1 text-[9.5px] leading-tight text-ink-muted" style={{ maxWidth: holeWidth }}>
                  {segments[hovered].label}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend with direct labels — identity is never colour-alone */}
        <ul className="w-full min-w-0 space-y-1.5">
          {segments.map((segment) => (
            <li
              key={segment.label}
              className="flex items-center gap-2 text-[11px]"
              onMouseEnter={() => setHovered(segment.index)}
              onMouseLeave={() => setHovered(null)}
            >
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: segment.color }}
              />
              <span className="min-w-0 flex-1 truncate text-ink-soft">{segment.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-ink">
                {Math.round(segment.fraction * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
