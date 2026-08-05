import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/classNames';

const ICONS = {
  success: { Icon: CheckCircle2, tone: 'text-ok' },
  error: { Icon: AlertCircle, tone: 'text-danger' },
  info: { Icon: Info, tone: 'text-info' },
};

/** Renders the toast queue held in `uiStore`. Mounted once, in `App`. */
export const Toaster = () => {
  const toasts = useUIStore((state) => state.toasts);
  const dismissToast = useUIStore((state) => state.dismissToast);

  if (!toasts.length) return null;

  return createPortal(
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-5 sm:items-end"
    >
      {toasts.map(({ id, title, description, variant }) => {
        const { Icon, tone } = ICONS[variant] ?? ICONS.info;

        return (
          <div
            key={id}
            className="animate-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-line bg-surface p-3 shadow-raised"
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', tone)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-ink">{title}</p>
              {description && <p className="mt-0.5 text-[11.5px] text-ink-soft">{description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(id)}
              aria-label="Dismiss notification"
              className="rounded p-0.5 text-ink-muted transition-colors hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
};
