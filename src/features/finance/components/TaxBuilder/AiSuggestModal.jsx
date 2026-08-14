import { useEffect, useState } from 'react';
import { Check, ExternalLink, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CONFIDENCE_BADGE_VARIANT, TAX_COUNTRIES } from '@/lib/taxSchema';
import { useCreateTaxRuleFromSuggestion, useSuggestTaxRules } from '../../hooks/useFinance';

const emptyQuery = () => ({ country: '', state: '', city: '' });

/**
 * Gemini-backed tax rate research — `POST /properties/taxes/suggest/`. Read-only
 * on the backend; "Add rule" here is what actually creates a `TaxRule`
 * (`source`/`status` both `ai_suggested`), so several suggestions can be
 * reviewed and added one at a time without the modal closing after the first.
 */
export const AiSuggestModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState(emptyQuery());
  const [addedIds, setAddedIds] = useState(() => new Set());

  const { suggest, suggestions, isPending: isSuggesting, reset } = useSuggestTaxRules();
  const { addSuggestion, isPending: isAdding, pendingId } = useCreateTaxRuleFromSuggestion();

  useEffect(() => {
    if (!isOpen) return;
    setQuery(emptyQuery());
    setAddedIds(new Set());
    reset();
    // `reset` is stable across renders (react-query), safe to omit from deps here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
      title="AI Suggest tax rates"
      description="Gemini researches likely tax rates for a market — review each suggestion before it goes live."
      size="xl"
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <Select
            label="Country"
            placeholder="Select"
            options={TAX_COUNTRIES}
            value={query.country}
            onChange={(event) => setQuery((current) => ({ ...current, country: event.target.value }))}
          />
          <Input
            label="State (optional)"
            placeholder="Narrows the research"
            value={query.state}
            onChange={(event) => setQuery((current) => ({ ...current, state: event.target.value }))}
          />
          <Input
            label="City (optional)"
            placeholder="Narrows further"
            value={query.city}
            onChange={(event) => setQuery((current) => ({ ...current, city: event.target.value }))}
          />
          <Button
            variant="primary"
            isLoading={isSuggesting}
            disabled={!query.country}
            leftIcon={<Sparkles className="size-3.5" aria-hidden="true" />}
            onClick={runSearch}
          >
            Suggest rates
          </Button>
        </div>

        {isSuggesting && <p className="text-[12px] text-ink-muted">Researching…</p>}

        {!isSuggesting && suggestions.length === 0 && (
          <EmptyState
            icon={<Sparkles className="size-5 text-brand-600" aria-hidden="true" />}
            title="No suggestions yet"
            description="Pick a country — and optionally a state or city to narrow it — then run a search."
          />
        )}

        <div className="space-y-3">
          {suggestions.map((suggestion) => {
            const isAdded = addedIds.has(suggestion.suggestion_id);
            const hasValue = suggestion.value !== null && suggestion.value !== undefined;

            return (
              <Card key={suggestion.suggestion_id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{suggestion.rule_name || suggestion.display_label || suggestion.country}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-muted">
                      {[suggestion.city, suggestion.state, suggestion.country].filter(Boolean).join(', ')} · {suggestion.scope_level} level
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant={CONFIDENCE_BADGE_VARIANT[suggestion.confidence] ?? 'neutral'}>{suggestion.confidence ?? 'unknown'} confidence</Badge>
                  </div>
                </div>

                <p className="mt-3 text-[13px] font-semibold text-ink">
                  {hasValue ? (
                    <>
                      {suggestion.tax_type === 'percentage' ? `${suggestion.value}%` : suggestion.value}{' '}
                      <span className="font-normal text-ink-muted">{suggestion.frequency === 'per_night' ? 'per night' : 'per booking'}</span>
                    </>
                  ) : (
                    <span className="font-normal text-ink-muted">No rate found — add manually if you can confirm one elsewhere.</span>
                  )}
                </p>

                {suggestion.caveat && <p className="mt-1.5 text-[11.5px] text-warn">{suggestion.caveat}</p>}

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                  {suggestion.source_url ? (
                    <a
                      href={suggestion.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11.5px] text-brand-700 hover:underline"
                    >
                      Source <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  ) : (
                    <span />
                  )}

                  {isAdded ? (
                    <Badge variant="ok" icon={<Check className="size-3" aria-hidden="true" />}>
                      Added — pending review
                    </Badge>
                  ) : (
                    <Button size="sm" variant="primary" disabled={!hasValue} isLoading={isAdding && pendingId === suggestion.suggestion_id} onClick={() => add(suggestion)}>
                      Add rule
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
