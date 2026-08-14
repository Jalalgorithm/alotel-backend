import { useMemo, useState } from 'react';
import { Plus, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { formatDate } from '@/utils/format';
import { useTaxRuleMutations, useTaxRules } from '../hooks/useFinance';
import { REVIEWABLE_STATUSES, scopeLabel, STATUS_BADGE_VARIANT, TAX_COUNTRIES, TAX_STATUSES } from '@/lib/taxSchema';
import { TaxRuleModal } from './TaxBuilder/TaxRuleModal';
import { RejectRuleModal } from './TaxBuilder/RejectRuleModal';

/** Tax Rule Builder v2: country/state/city rules that stack, with a status lifecycle and approve/reject. */
export const TaxPage = () => {
  const [filters, setFilters] = useState({ country: '', status: '' });
  const { data: rules = [], isLoading } = useTaxRules(filters);
  const { createRule, isCreating, updateRule, deleteRule, approveRule, rejectRule, pendingId } = useTaxRuleMutations();

  const [editingRule, setEditingRule] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectingRule, setRejectingRule] = useState(null);

  const openCreate = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };
  const openEdit = (rule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const activeCount = useMemo(() => rules.filter((rule) => rule.status === 'active').length, [rules]);

  const columns = [
    {
      key: 'ruleName',
      header: 'Rule',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{row.ruleName || row.displayLabel || `${row.country} tax`}</p>
          {row.aiGenerated && <span className="text-[10px] text-ink-muted">AI-sourced</span>}
        </div>
      ),
    },
    { key: 'scope', header: 'Scope', render: (row) => scopeLabel(row) || row.country },
    {
      key: 'value',
      header: 'Rate',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums">
          {row.taxType === 'percentage' ? `${row.value}%` : row.value} · {row.frequency === 'per_night' ? 'per night' : 'per booking'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={STATUS_BADGE_VARIANT[row.status] ?? 'neutral'}>{TAX_STATUSES.find((s) => s.value === row.status)?.label ?? row.status}</Badge>,
    },
    { key: 'updatedAt', header: 'Updated', render: (row) => formatDate(row.updatedAt) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
          {REVIEWABLE_STATUSES.includes(row.status) && (
            <>
              <Button
                size="xs"
                variant="subtle"
                isLoading={pendingId === row.id}
                leftIcon={<ThumbsUp className="size-3" aria-hidden="true" />}
                onClick={() => approveRule(row.id)}
              >
                Approve
              </Button>
              <Button
                size="xs"
                variant="dangerSoft"
                leftIcon={<ThumbsDown className="size-3" aria-hidden="true" />}
                onClick={() => setRejectingRule(row)}
              >
                Reject
              </Button>
            </>
          )}
          <Button size="xs" variant="ghost" aria-label="Delete rule" isLoading={pendingId === row.id} onClick={() => deleteRule(row.id)}>
            <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tax Builder"
        subtitle="Country, state and city tax rules — several can stack for one booking."
        actions={
          <Button variant="primary" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={openCreate}>
            Add rule
          </Button>
        }
      />

      <Card>
        <CardHeader title="Filters" subtitle={`${activeCount} active rule${activeCount === 1 ? '' : 's'} of ${rules.length} total`} />
        <div className="grid grid-cols-1 gap-3 border-t border-line p-4 sm:grid-cols-4">
          <Select
            label="Country"
            placeholder="All countries"
            options={TAX_COUNTRIES}
            value={filters.country}
            onChange={(event) => setFilters((current) => ({ ...current, country: event.target.value }))}
          />
          <Select
            label="Status"
            placeholder="All statuses"
            options={TAX_STATUSES}
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Rules" />
        <div className="border-t border-line">
          <DataTable
            columns={columns}
            rows={rules}
            isLoading={isLoading}
            onRowClick={openEdit}
            emptyTitle="No tax rules yet"
            emptyDescription="Bookings are quoted without tax until a rule is added."
          />
        </div>
      </Card>

      <TaxRuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        rule={editingRule}
        createRule={createRule}
        updateRule={updateRule}
        isSaving={isCreating || (Boolean(editingRule) && pendingId === editingRule.id)}
      />

      <RejectRuleModal
        rule={rejectingRule}
        onClose={() => setRejectingRule(null)}
        onReject={(reason) => rejectRule(rejectingRule.id, reason)}
        isSaving={pendingId === rejectingRule?.id}
      />
    </div>
  );
};
