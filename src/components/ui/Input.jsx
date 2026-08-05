import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/classNames';

const LABEL = 'mb-1.5 block text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted';

/**
 * Labelled text field with inline validation messaging.
 * `error` wires up `aria-invalid` + `aria-describedby`.
 */
export const Input = forwardRef(function Input(
  { label, error, hint, leftIcon, className, containerClassName, id, type = 'text', ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  const isPassword = type === 'password';
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className={cn('w-full min-w-0', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className={LABEL}>
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={isPassword && isRevealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-9 w-full rounded-lg border bg-white px-3 text-[13px] text-ink transition-colors',
            'placeholder:text-ink-muted focus:border-brand-600 focus:outline-none',
            'focus:ring-2 focus:ring-brand-600/15 disabled:bg-black/5 disabled:text-ink-muted',
            'read-only:bg-line-soft read-only:text-ink-soft',
            leftIcon && 'pl-9',
            isPassword && 'pr-9',
            error ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-line',
            className,
          )}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setIsRevealed((value) => !value)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-ink"
            aria-label={isRevealed ? 'Hide password' : 'Show password'}
          >
            {isRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-[11px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1 text-[11px] text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

/** Multi-line variant sharing the same chrome. */
export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className, containerClassName, id, rows = 3, ...props },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className={cn('w-full min-w-0', containerClassName)}>
      {label && (
        <label htmlFor={fieldId} className={LABEL}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(
          'w-full rounded-lg border bg-white px-3 py-2 text-[13px] text-ink transition-colors',
          'placeholder:text-ink-muted focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-[11px] text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
});
