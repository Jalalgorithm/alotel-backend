import { cn } from '@/utils/classNames';

/**
 * Horizontal progress / proportion bar.
 *
 * @param {{ value: number, max?: number, tone?: string, height?: string }} props
 *  `tone` is a Tailwind background class so callers stay inside the token set.
 */
export const Progress = ({ value = 0, max = 100, tone = 'bg-brand-600', height = 'h-1.5', className, label }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('w-full overflow-hidden rounded-full bg-line-soft', height, className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', tone)} style={{ width: `${pct}%` }} />
    </div>
  );
};

/** Label + bar + value row, repeated in the occupancy and rating breakdowns. */
export const ProgressRow = ({ label, value, max = 100, display, tone, labelWidth = 'w-24' }) => (
  <div className="flex items-center gap-3">
    <span className={cn('shrink-0 truncate text-[11px] text-ink-soft', labelWidth)}>{label}</span>
    <Progress value={value} max={max} tone={tone} className="flex-1" label={label} />
    <span className="w-9 shrink-0 text-right text-[11px] font-semibold text-ink">
      {display ?? `${Math.round((value / max) * 100)}%`}
    </span>
  </div>
);
