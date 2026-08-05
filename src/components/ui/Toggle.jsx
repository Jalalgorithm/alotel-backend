import { useId } from 'react';
import { cn } from '@/utils/classNames';

/**
 * Accessible switch. Rendered as a real `<button role="switch">` so it is
 * keyboard-operable and announced correctly, unlike a styled `<div>`.
 */
export const Toggle = ({ checked, onChange, label, disabled = false, className }) => {
  const id = useId();

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand-600' : 'bg-black/15',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block size-4 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
};

/** Toggle with title + description, the layout used across Settings. */
export const ToggleRow = ({ title, description, checked, onChange, disabled, control }) => (
  <div className="flex items-center justify-between gap-4 px-4 py-3">
    <div className="min-w-0">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      {description && <p className="mt-0.5 text-[11px] leading-4 text-ink-muted">{description}</p>}
    </div>
    <div className="shrink-0">
      {control ?? <Toggle checked={checked} onChange={onChange} disabled={disabled} label={title} />}
    </div>
  </div>
);
