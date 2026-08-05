import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/classNames';

/**
 * Native select styled to match `Input`. Native is deliberate: correct keyboard
 * and mobile behaviour for free.
 *
 * @param {{ options?: Array<string | { value: string, label: string }> }} props
 */
export const Select = forwardRef(function Select(
  { label, error, hint, options = [], placeholder, className, containerClassName, id, children, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={cn('w-full min-w-0', containerClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          className={cn(
            'h-9 w-full appearance-none rounded-lg border bg-white px-3 pr-8 text-[13px] text-ink',
            'transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15',
            error ? 'border-danger' : 'border-line',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => {
            const value = option?.value ?? option;
            return (
              <option key={value} value={value}>
                {option?.label ?? option}
              </option>
            );
          })}
          {children}
        </select>

        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" />
      </div>

      {error ? (
        <p className="mt-1 text-[11px] text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
});
