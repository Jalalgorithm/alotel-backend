import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/classNames';
import { useClickOutside } from '@/hooks/useClickOutside';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Accessible dialog rendered in a portal.
 * Locks body scroll and closes on backdrop click / Escape.
 */
export const Modal = ({ isOpen, onClose, title, description, size = 'md', footer, className, children }) => {
  const panelRef = useClickOutside(() => onClose?.(), isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'animate-fade-up relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-card bg-surface shadow-raised',
          SIZES[size] ?? SIZES.md,
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="font-display text-[15px] font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-[11px] text-ink-muted">{description}</p>}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-md p-1 text-ink-muted transition-colors hover:bg-black/5 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="scrollbar-slim flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && <div className="border-t border-line px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};
