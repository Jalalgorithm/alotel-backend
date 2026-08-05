import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/classNames';

const SIZES = { sm: 'size-4', md: 'size-6', lg: 'size-8' };

export const Spinner = ({ size = 'md', className, label = 'Loading' }) => (
  <Loader2
    role="status"
    aria-label={label}
    className={cn('animate-spin text-brand-600', SIZES[size] ?? SIZES.md, className)}
  />
);

/** Centred loading state — Suspense fallback and route-guard placeholder. */
export const Loading = ({ label = 'Loading…', fullScreen = false, className }) => (
  <div
    className={cn(
      'flex w-full flex-col items-center justify-center gap-3 py-16',
      fullScreen && 'min-h-screen py-0',
      className,
    )}
  >
    <Spinner size="lg" />
    <p className="text-[12px] text-ink-muted">{label}</p>
  </div>
);
