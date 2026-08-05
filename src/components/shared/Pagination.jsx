import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/classNames';

/** Build a compact page list: 1 2 3 … 12 */
const buildPages = (current, total) => {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, 2, 3, current, total]);
  return [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
};

export const Pagination = ({ page = 1, totalPages = 1, onChange, className }) => {
  if (totalPages <= 1) return null;

  const pages = buildPages(page, totalPages);
  const arrow =
    'flex size-8 items-center justify-center rounded-md border border-line text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft';

  return (
    <nav className={cn('flex items-center justify-center gap-1.5', className)} aria-label="Pagination">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page" className={arrow}>
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      {pages.map((entry, index) => (
        <span key={entry} className="flex items-center gap-1.5">
          {index > 0 && entry - pages[index - 1] > 1 && <span className="px-1 text-ink-muted">…</span>}
          <button
            type="button"
            onClick={() => onChange(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(
              'flex size-8 items-center justify-center rounded-md border text-[12px] transition-colors',
              entry === page
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-line text-ink-soft hover:border-brand-300 hover:text-brand-700',
            )}
          >
            {entry}
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={arrow}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
};
