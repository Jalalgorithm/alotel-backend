import { cn } from '@/utils/classNames';

/**
 * Segmented tab strip.
 *
 * @param {{
 *   tabs: Array<{ id: string, label: string, count?: number, disabled?: boolean }>,
 *   value: string,
 *   onChange: (id: string) => void,
 *   variant?: 'segmented' | 'underline',
 * }} props
 */
export const Tabs = ({ tabs = [], value, onChange, variant = 'segmented', className }) => {
  if (variant === 'underline') {
    return (
      <div className={cn('scrollbar-none flex gap-5 overflow-x-auto border-b border-line', className)} role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={tab.disabled || undefined}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange(tab.id)}
              className={cn(
                'relative shrink-0 whitespace-nowrap pb-2.5 pt-1 text-[13px] transition-colors',
                tab.disabled ? 'cursor-not-allowed text-ink-muted/50' : isActive ? 'font-semibold text-brand-700' : 'text-ink-muted hover:text-ink',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold">
                  {tab.count}
                </span>
              )}
              {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-700" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn('inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-line bg-white p-1', className)}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled || undefined}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
              tab.disabled
                ? 'cursor-not-allowed text-ink-muted/50'
                : isActive
                  ? 'bg-brand-700 text-white'
                  : 'text-ink-soft hover:bg-brand-50 hover:text-brand-700',
            )}
          >
            {tab.label}
            {tab.count !== undefined && <span className="ml-1.5 opacity-70">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
};

/** Filter pill row — categories, statuses, amenity chips. */
export const FilterChips = ({ options = [], value, onChange, className }) => (
  <div className={cn('scrollbar-none -mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 py-1', className)}>
    {options.map((option) => {
      const id = option?.id ?? option;
      const label = option?.label ?? option;
      const isActive = id === value;

      return (
        <button
          key={id}
          type="button"
          aria-pressed={isActive}
          onClick={() => onChange(id)}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors',
            isActive
              ? 'border-brand-700 bg-brand-700 text-white'
              : 'border-line bg-white text-ink-soft hover:border-brand-300 hover:text-brand-700',
          )}
        >
          {label}
        </button>
      );
    })}
  </div>
);
