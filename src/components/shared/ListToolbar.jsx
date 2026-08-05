import { Search } from 'lucide-react';
import { cn } from '@/utils/classNames';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

/**
 * Search + filter row shared by every list screen.
 *
 * Keeping it in one place means the search field, the filter selects and the
 * result count sit identically on all fifteen tables — and the responsive
 * behaviour (filters wrap, search grows) is fixed once.
 *
 * @param {{
 *   search: string,
 *   onSearchChange: (value: string) => void,
 *   filters?: Array<{ id: string, value: string, onChange: (v: string) => void, options: string[], label?: string }>,
 *   total?: number,
 *   noun?: string,
 *   actions?: React.ReactNode,
 * }} props
 */
export const ListToolbar = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  total,
  noun = 'result',
  // Irregular plurals ("entry" -> "entries") need to be given explicitly.
  nounPlural = `${noun}s`,
  actions,
  className,
}) => (
  <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-center', className)}>
    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        leftIcon={<Search className="size-3.5" aria-hidden="true" />}
        containerClassName="w-full sm:max-w-xs"
        aria-label={searchPlaceholder}
      />

      {filters.map((filter) => (
        <Select
          key={filter.id}
          value={filter.value}
          onChange={(event) => filter.onChange(event.target.value)}
          options={filter.options}
          aria-label={filter.label ?? filter.id}
          containerClassName="w-full sm:w-40"
        />
      ))}
    </div>

    <div className="flex shrink-0 items-center gap-3">
      {typeof total === 'number' && (
        <p className="whitespace-nowrap text-[12px] text-ink-muted">
          <span className="font-semibold text-ink">{total.toLocaleString()}</span>{' '}
          {total === 1 ? noun : nounPlural}
        </p>
      )}
      {actions}
    </div>
  </div>
);
