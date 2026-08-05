import { Inbox } from 'lucide-react';
import { cn } from '@/utils/classNames';

/** Shown when a filtered list returns nothing. */
export const EmptyState = ({ icon, title = 'Nothing to show here', description, action, className }) => (
  <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
    <span className="flex size-11 items-center justify-center rounded-full bg-brand-50">
      {icon ?? <Inbox className="size-5 text-brand-600" aria-hidden="true" />}
    </span>
    <h3 className="mt-3 text-[14px] font-semibold">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-[12px] text-ink-muted">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
