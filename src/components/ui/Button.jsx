import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/classNames';

const VARIANTS = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-sm',
  secondary: 'bg-white text-ink border border-line hover:bg-brand-50 hover:border-brand-200',
  outline: 'border border-brand-700 text-brand-700 bg-transparent hover:bg-brand-50',
  ghost: 'text-ink-soft hover:bg-black/5 hover:text-ink',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  danger: 'bg-danger text-white hover:brightness-95',
  dangerSoft: 'bg-danger-soft text-danger border border-danger/20 hover:bg-danger/10',
  warn: 'bg-warn text-white hover:brightness-95',
  muted: 'bg-black/5 text-ink-muted hover:bg-black/10',
};

/** Admin UI is denser than the guest site, so `sm` is the common default. */
const SIZES = {
  xs: 'h-7 px-2.5 text-[11px] gap-1',
  sm: 'h-8 px-3 text-[12px] gap-1.5',
  md: 'h-9 px-4 text-[13px] gap-1.5',
  lg: 'h-11 px-6 text-sm gap-2',
};

/**
 * The single button primitive for the admin portal.
 *
 * Renders an `<a>`/`<Link>` when `href`/`to` is provided so navigation actions
 * stay semantically correct while keeping one visual language.
 */
export const Button = forwardRef(function Button(
  {
    as,
    to,
    href,
    variant = 'secondary',
    size = 'sm',
    italic = false,
    fullWidth = false,
    isLoading = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  const Component = as ?? (to ? Link : href ? 'a' : 'button');

  return (
    <Component
      ref={ref}
      to={to}
      href={href}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-55',
        VARIANTS[variant] ?? VARIANTS.secondary,
        SIZES[size] ?? SIZES.sm,
        italic && 'font-serif italic font-bold',
        fullWidth && 'w-full',
        className,
      )}
      disabled={Component === 'button' ? disabled || isLoading : undefined}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </Component>
  );
});
