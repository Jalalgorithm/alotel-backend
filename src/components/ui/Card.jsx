import { cn } from '@/utils/classNames';

/** Surface primitive: white panel, hairline border, soft elevation. */
export const Card = ({ as: Component = 'div', className, children, ...props }) => (
  <Component
    className={cn('rounded-card border border-line bg-surface shadow-card', className)}
    {...props}
  >
    {children}
  </Component>
);

/**
 * Card header with an optional right-hand action — the "View all →" link
 * pattern repeated across the dashboard panels.
 */
export const CardHeader = ({ title, subtitle, action, className, children }) => (
  <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-3.5', className)}>
    <div className="min-w-0 flex-1">
      {title && <h2 className="font-display text-[14px] font-semibold text-ink">{title}</h2>}
      {subtitle && <p className="mt-0.5 text-[11px] text-ink-muted">{subtitle}</p>}
      {children}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const CardBody = ({ className, children, ...props }) => (
  <div className={cn('px-4 py-3.5', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className, children, ...props }) => (
  <div className={cn('border-t border-line px-4 py-3', className)} {...props}>
    {children}
  </div>
);
