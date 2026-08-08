import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { useProperties, usePropertiesByIds } from '@/features/properties/hooks/useProperties';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const LABEL = 'mb-1.5 block text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted';

/**
 * Searchable property picker, controlled as an array of property IDs.
 * Backs `profile.assigned_properties` on the staff record.
 *
 * The properties API is fixed at 10 results per page, so this searches
 * server-side (via the `query` param) rather than loading every property —
 * already-selected properties are resolved independently by id so their
 * names still show even once they scroll out of the current search results.
 */
export const PropertyMultiSelect = ({ value = [], onChange, error }) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading } = useProperties({ query: debouncedSearch, page: 1 });
  const results = data?.items ?? [];

  const selectedDetailQueries = usePropertiesByIds(value);
  const namesById = useMemo(() => {
    const map = new Map(results.map((property) => [property.id, property.name]));
    selectedDetailQueries.forEach((query) => {
      if (query.data) map.set(query.data.id, query.data.name);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, selectedDetailQueries.map((q) => q.data?.id).join(',')]);

  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter((entry) => entry !== id) : [...value, id]);
  };

  return (
    <div className="w-full min-w-0">
      <label className={LABEL}>Assigned properties</label>

      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((id) => (
            <Badge key={id} variant="brand" className="pr-1">
              {namesById.get(id) ?? 'Loading…'}
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-label={`Remove ${namesById.get(id) ?? 'property'}`}
                className="rounded-full p-0.5 hover:bg-black/10"
              >
                <X className="size-2.5" aria-hidden="true" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Input
        leftIcon={<Search className="size-3.5" aria-hidden="true" />}
        placeholder="Search properties…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        containerClassName="mb-2"
      />

      <div className={`max-h-40 overflow-y-auto rounded-lg border ${error ? 'border-danger' : 'border-line'} divide-y divide-line`}>
        {isLoading ? (
          <p className="px-3 py-2.5 text-[12px] text-ink-muted">Searching properties…</p>
        ) : results.length === 0 ? (
          <p className="px-3 py-2.5 text-[12px] text-ink-muted">
            {debouncedSearch ? 'No properties match your search.' : 'Start typing to find a property.'}
          </p>
        ) : (
          results.map((property) => (
            <label
              key={property.id}
              className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-[13px] text-ink"
            >
              <span className="truncate">{property.name}</span>
              <Toggle checked={value.includes(property.id)} onChange={() => toggle(property.id)} label={property.name} />
            </label>
          ))
        )}
      </div>

      {error ? <p className="mt-1 text-[11px] text-danger">{error}</p> : null}
    </div>
  );
};
