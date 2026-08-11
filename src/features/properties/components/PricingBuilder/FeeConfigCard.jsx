import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/classNames';

/** One country in the fee-config grid: cleaning fee + security deposit, in the country's own currency. */
export const FeeConfigCard = ({ country, config, isSelected, isDeleting, onSelect, onDelete }) => (
  <div
    className={cn(
      'group relative rounded-lg border p-3 transition-colors',
      isSelected ? 'border-brand-700 bg-brand-50' : 'border-line bg-white hover:border-brand-200 hover:bg-brand-50/40',
    )}
  >
    <button type="button" onClick={() => onSelect(country)} aria-pressed={isSelected} className="flex w-full flex-col gap-2 text-left">
      <div className="flex items-start justify-between gap-2 pr-6">
        <p className="text-[13px] font-semibold text-ink">{country}</p>
        <Badge variant={config ? (config.isActive ? 'ok' : 'neutral') : 'neutral'}>
          {config ? (config.isActive ? 'Active' : 'Inactive') : 'Not set'}
        </Badge>
      </div>

      {config ? (
        <div className="space-y-0.5 text-[11px] text-ink-muted">
          <div className="flex justify-between">
            <span>Cleaning fee</span>
            <span className="tabular-nums text-ink">{formatCurrency(config.cleaningFee, config.currency, { decimals: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span>Security deposit</span>
            <span className="tabular-nums text-ink">{formatCurrency(config.securityDeposit, config.currency, { decimals: 2 })}</span>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-ink-muted">Falls back to each property's own fee fields.</p>
      )}
    </button>

    {config && (
      <Button
        size="xs"
        variant="ghost"
        aria-label={`Delete ${country} pricing config`}
        isLoading={isDeleting}
        onClick={() => onDelete(config.id)}
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="size-3 text-danger" aria-hidden="true" />
      </Button>
    )}
  </div>
);
