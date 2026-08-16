import { useMemo, useState } from 'react';
import { Pencil, Plus, Sparkles, ThumbsDown, ThumbsUp, Trash2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { useTaxRuleMutations, useTaxRules } from '../hooks/useFinance';
import { GUEST_SEGMENTS, REVIEWABLE_STATUSES, scopeLabel, SOURCE_LABELS, STATUS_BADGE_VARIANT, TAX_STATUSES } from '@/lib/taxSchema';
import { TaxRuleModal } from './TaxBuilder/TaxRuleModal';
import { RejectRuleModal } from './TaxBuilder/RejectRuleModal';
import { CoverageAlertsPanel } from './TaxBuilder/CoverageAlertsPanel';
import { AiTaxCompanionModal } from './TaxBuilder/AiTaxCompanionModal';
import { ImportCsvModal } from './TaxBuilder/ImportCsvModal';

const appliesToLabel = (guestSegment) =>
  guestSegment?.length ? guestSegment.map((value) => GUEST_SEGMENTS.find((s) => s.value === value)?.label ?? value).join(', ') : 'Every guest';

/** Tax Rule Builder v2: country/state/city rules that stack, with a status lifecycle and approve/reject. */
export const TaxPage = () => {
  const { data: rules = [], isLoading } = useTaxRules({});
  const { createRule, isCreating, updateRule, deleteRule, approveRule, rejectRule, pendingId } = useTaxRuleMutations();

  const [tab, setTab] = useState('all');
  const [editingRule, setEditingRule] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectingRule, setRejectingRule] = useState(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAiCompanionOpen, setIsAiCompanionOpen] = useState(false);

  const openCreate = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };
  const openEdit = (rule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const pendingRules = useMemo(() => rules.filter((rule) => REVIEWABLE_STATUSES.includes(rule.status)), [rules]);
  const visibleRules = tab === 'pending' ? pendingRules : rules;

  const columns = [
    {
      key: 'ruleName',
      header: 'Rule',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">
            {row.ruleName || `${row.country} tax`}
            {!row.ruleName && <span className="ml-1.5 font-normal text-ink-muted">(unnamed)</span>}
          </p>
          <p className="truncate text-[10.5px] text-ink-muted">{scopeLabel(row) || row.country}</p>
        </div>
      ),
    },
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
    { key: 'appliesTo', header: 'Applies to', render: (row) => <span className="text-ink-soft">{appliesToLabel(row.guestSegment)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={STATUS_BADGE_VARIANT[row.status] ?? 'neutral'}>{TAX_STATUSES.find((s) => s.value === row.status)?.label ?? row.status}</Badge>,
    },
    { key: 'source', header: 'Source', render: (row) => <span className="text-ink-soft">{SOURCE_LABELS[row.source] ?? row.source}</span> },
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
          <Button size="xs" variant="ghost" aria-label="Edit rule" onClick={() => openEdit(row)}>
            <Pencil className="size-3.5 text-ink-muted" aria-hidden="true" />
          </Button>
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
        title="Tax management"
        subtitle="Rules are checked fresh every time a price is calculated — not once when a property is published."
        actions={
          <>
            <Button leftIcon={<Sparkles className="size-3.5" aria-hidden="true" />} onClick={() => setIsAiCompanionOpen(true)}>
              AI Tax Companion
            </Button>
            <Button leftIcon={<Upload className="size-3.5" aria-hidden="true" />} onClick={() => setIsImportOpen(true)}>
              Import CSV
            </Button>
            <Button variant="primary" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={openCreate}>
              Add tax rule
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader
            title="Tax rules"
            subtitle="Only rules marked Active are applied at checkout."
            action={
              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { id: 'all', label: 'All rules', count: rules.length },
                  { id: 'pending', label: 'Pending review', count: pendingRules.length },
                ]}
              />
            }
          />
          <div className="border-t border-line">
            <DataTable
              columns={columns}
              rows={visibleRules}
              isLoading={isLoading}
              onRowClick={openEdit}
              emptyTitle={tab === 'pending' ? 'Nothing pending review' : 'No tax rules yet'}
              emptyDescription={tab === 'pending' ? 'Every rule has been reviewed.' : 'Bookings are quoted without tax until a rule is added.'}
            />
          </div>
        </Card>

        <div className="space-y-5">
          <CoverageAlertsPanel />
        </div>
      </div>

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

      <ImportCsvModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />

      <AiTaxCompanionModal isOpen={isAiCompanionOpen} onClose={() => setIsAiCompanionOpen(false)} />
    </div>
  );
};
