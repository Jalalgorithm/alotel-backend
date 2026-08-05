import { Check } from 'lucide-react';
import { cn } from '@/utils/classNames';

/**
 * Horizontal step rail for multi-step flows (property wizard, check-in).
 * Completed steps are clickable so an admin can go back and edit.
 *
 * @param {{ steps: string[], current: number, onStepClick?: (index: number) => void }} props
 */
export const Stepper = ({ steps = [], current = 0, onStepClick, className }) => (
  <ol className={cn('scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto sm:gap-2', className)}>
    {steps.map((step, index) => {
      const isComplete = index < current;
      const isCurrent = index === current;

      return (
        <li key={step} className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            disabled={!isComplete}
            onClick={() => isComplete && onStepClick?.(index)}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
              isComplete && 'border-brand-600 bg-brand-50 text-brand-700 hover:bg-brand-100',
              isCurrent && 'border-brand-700 bg-brand-700 text-white',
              !isComplete && !isCurrent && 'border-line bg-white text-ink-muted',
            )}
          >
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded-full text-[9px]',
                isCurrent ? 'bg-white/20' : isComplete ? 'bg-brand-600 text-white' : 'bg-black/5',
              )}
            >
              {isComplete ? <Check className="size-2.5" aria-hidden="true" /> : index + 1}
            </span>
            <span className="whitespace-nowrap">{step}</span>
          </button>

          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn('h-px w-3 shrink-0 sm:w-5', isComplete ? 'bg-brand-600' : 'bg-line')}
            />
          )}
        </li>
      );
    })}
  </ol>
);
