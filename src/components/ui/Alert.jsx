import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/utils/classNames';

const VARIANTS = {
  info: { wrapper: 'bg-brand-50/70 border-brand-600', icon: Info, tone: 'text-brand-600' },
  success: { wrapper: 'bg-ok-soft border-ok', icon: CheckCircle2, tone: 'text-ok' },
  warn: { wrapper: 'bg-warn-soft border-warn', icon: AlertTriangle, tone: 'text-warn' },
  error: { wrapper: 'bg-danger-soft border-danger', icon: AlertCircle, tone: 'text-danger' },
};

/** Bordered notice block — form-level errors, compliance callouts, tips. */
export const Alert = ({ variant = 'info', title, children, className, icon }) => {
  const config = VARIANTS[variant] ?? VARIANTS.info;
  const Icon = config.icon;

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('rounded-lg border-l-[3px] p-3', config.wrapper, className)}
    >
      <div className="flex gap-2.5">
        <span className={cn('mt-0.5 shrink-0', config.tone)}>
          {icon ?? <Icon className="size-4" aria-hidden="true" />}
        </span>
        <div className="min-w-0 text-[12px] leading-5">
          {title && <p className="font-semibold text-ink">{title}</p>}
          {children && <div className="text-ink-soft">{children}</div>}
        </div>
      </div>
    </div>
  );
};
