import { useEffect, useState } from 'react';
import { Check, ExternalLink, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { CONFIDENCE_BADGE_VARIANT, TAX_COUNTRIES, TAX_COUNTRY_LABELS } from '@/lib/taxSchema';
import { useCreateTaxRuleFromSuggestion, useSuggestTaxRules } from '../../hooks/useFinance';

const COUNTRY_OPTIONS = TAX_COUNTRIES.map((value) => ({ value, label: TAX_COUNTRY_LABELS[value] ?? value }));

const emptyQuery = () => ({ country: '', state: '', city: '' });

/**
 * AI-backed tax rate research (`POST /properties/taxes/suggest/`), on demand
 * behind a button rather than a permanent sidebar slot. Read-only on the
 * backend; "Add rule" is what actually creates a `TaxRule` (`source`/`status`
 * both `ai_suggested`), so several suggestions can be reviewed and added one
 * at a time without losing the others — closing and reopening the modal
 * always starts a fresh search.
 */
export const AiTaxCompanionModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState(emptyQuery());
  const [addedIds, setAddedIds] = useState(() => new Set());

  const { suggest, suggestions, isPending: isSuggesting, reset: resetSuggestions } = useSuggestTaxRules();
  const { addSuggestion, isPending: isAdding, pendingId } = useCreateTaxRuleFromSuggestion();

  useEffect(() => {
    if (!isOpen) return;
    setQuery(emptyQuery());
    setAddedIds(new Set());
    resetSuggestions();
  }, [isOpen, resetSuggestions]);

  const runSearch = () => {
    if (!query.country) return;
    suggest({ country: query.country, state: query.state.trim() || undefined, city: query.city.trim() || undefined });
  };

  const add = (suggestion) => {
    addSuggestion(suggestion, {
      onSuccess: () => setAddedIds((current) => new Set(current).add(suggestion.suggestion_id)),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Tax Companion"
      description="Researches published rates and drafts rules. It cannot save anything — every suggestion goes through the form, where you decide."
      size="lg"
    >
      <div className="space-y-3">
        <Select
          label="Country"
          placeholder="Select"
          options={COUNTRY_OPTIONS}
          value={query.country}
          onChange={(event) => setQuery((current) => ({ ...current, country: event.target.value }))}
        />
        <div className="grid grid-cols-2 gap-2.5">
          <Input
            label="State"
            placeholder="Optional"
            value={query.state}
            onChange={(event) => setQuery((current) => ({ ...current, state: event.target.value }))}
          />
          <Input
            label="City"
            placeholder="Optional"
            value={query.city}
            onChange={(event) => setQuery((current) => ({ ...current, city: event.target.value }))}
          />
        </div>
        <Button
          fullWidth
          variant="primary"
          isLoading={isSuggesting}
          disabled={!query.country}
          leftIcon={<Sparkles className="size-3.5" aria-hidden="true" />}
          onClick={runSearch}
        >
          Search country-wide
        </Button>

        {isSuggesting && <p className="text-[11.5px] text-ink-muted">Researching…</p>}

        {!isSuggesting && suggestions.length > 0 && (
          <div className="space-y-2.5 border-t border-line pt-3">
            {suggestions.map((suggestion) => {
              const isAdded = addedIds.has(suggestion.suggestion_id);
              const hasValue = suggestion.value !== null && suggestion.value !== undefined;

              return (
                <div key={suggestion.suggestion_id} className="rounded-lg border border-line bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-ink">{suggestion.rule_name || suggestion.display_label || suggestion.country}</p>
                      <p className="mt-0.5 truncate text-[10.5px] text-ink-muted">
                        {[suggestion.city, suggestion.state, suggestion.country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <Badge variant={CONFIDENCE_BADGE_VARIANT[suggestion.confidence] ?? 'neutral'}>{suggestion.confidence ?? 'unknown'}</Badge>
                  </div>

                  <p className="mt-2 text-[12.5px] font-semibold text-ink">
                    {hasValue ? (
                      <>
                        {suggestion.tax_type === 'percentage' ? `${suggestion.value}%` : suggestion.value}{' '}
                        <span className="font-normal text-ink-muted">{suggestion.frequency === 'per_night' ? '/ night' : '/ booking'}</span>
                      </>
                    ) : (
                      <span className="text-[11px] font-normal text-ink-muted">No rate found</span>
                    )}
                  </p>

                  {suggestion.caveat && <p className="mt-1 text-[10.5px] text-warn">{suggestion.caveat}</p>}

                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
                    {suggestion.source_url ? (
                      <a href={suggestion.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10.5px] text-brand-700 hover:underline">
                        Source <ExternalLink className="size-2.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <span />
                    )}

                    {isAdded ? (
                      <Badge variant="ok" icon={<Check className="size-2.5" aria-hidden="true" />}>Added</Badge>
                    ) : (
                      <Button size="xs" variant="primary" disabled={!hasValue} isLoading={isAdding && pendingId === suggestion.suggestion_id} onClick={() => add(suggestion)}>
                        Add rule
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
