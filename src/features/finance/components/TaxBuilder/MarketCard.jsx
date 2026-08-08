import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/classNames';

/**
 * One market in the builder's left-hand grid. Selecting a card loads it into
 * the builder panel; configured markets can be deleted directly from here.
 */
export const MarketCard = ({ country, rule, isSelected, isDeleting, onSelect, onDelete }) => (
  <div
    className={cn(
      'group relative rounded-lg border p-3 transition-colors',
      isSelected ? 'border-brand-700 bg-brand-50' : 'border-line bg-white hover:border-brand-200 hover:bg-brand-50/40',
    )}
  >
    <button type="button" onClick={() => onSelect(country)} aria-pressed={isSelected} className="flex w-full flex-col gap-2 text-left">
      <div className="flex items-start justify-between gap-2 pr-6">
        <p className="text-[13px] font-semibold text-ink">{country}</p>
        <Badge variant={rule ? 'ok' : 'neutral'}>{rule ? 'Configured' : 'Not set'}</Badge>
      </div>

      {rule ? (
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[11px] text-ink-muted">{rule.name}</p>
          <p className="shrink-0 text-[14px] font-bold tabular-nums text-brand-700">{rule.percentage}%</p>
        </div>
      ) : (
        <p className="text-[11px] text-ink-muted">Bookings here are quoted without tax.</p>
      )}
    </button>

    {rule && (
      <Button
        size="xs"
        variant="ghost"
        aria-label={`Delete ${rule.name}`}
        isLoading={isDeleting}
        onClick={() => onDelete(rule.id)}
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="size-3 text-danger" aria-hidden="true" />
      </Button>
    )}
  </div>
);
