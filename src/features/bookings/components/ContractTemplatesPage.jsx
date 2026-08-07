import { useMemo, useState } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from '@/utils/classNames';
import { formatDate } from '@/utils/format';
import { getFieldErrors } from '@/utils/errors';
import {
  AUTO_RESOLVED_STAY_TYPES,
  TEMPLATE_REGIONS,
  TEMPLATE_STAY_TYPES,
  coverageGaps,
} from '@/lib/contractSchema';
import { useContractTemplateMutations, useContractTemplates } from '../hooks/useBookings';

const EMPTY = {
  name: '',
  region: 'UK',
  stayType: 'long_residential',
  version: '1.0',
  content: '',
  isActive: true,
};

/**
 * Contract templates — the documents Dropbox Sign issues.
 *
 * The API resolves which template applies from the property's region and the
 * stay length, so what matters operationally is *coverage*: a jurisdiction with
 * no active template for a long stay simply cannot have a contract issued. The
 * matrix at the top makes that visible, rather than leaving it to be discovered
 * when a send fails.
 */
export const ContractTemplatesPage = () => {
  const { data: templates = [], isLoading } = useContractTemplates();
  const { createTemplate, isCreating, updateTemplate, updateTemplateAsync, isUpdating, deleteTemplate, pendingId } =
    useContractTemplateMutations();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const gaps = useMemo(() => coverageGaps(templates), [templates]);

  const open = (template) => {
    setErrors({});
    setIsFormOpen(true);
    setEditing(template ?? null);
    setForm(
      template
        ? {
            name: template.name,
            region: template.region,
            stayType: template.stayType,
            version: template.version,
            content: template.content,
            isActive: template.isActive,
          }
        : EMPTY,
    );
  };

  const close = () => {
    setIsFormOpen(false);
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
  };

  const submit = async () => {
    setErrors({});
    try {
      if (editing) await updateTemplateAsync({ id: editing.id, patch: form });
      else await createTemplate(form);
      close();
    } catch (error) {
      // `unique_together (region, stay_type, version)` surfaces here when a
      // duplicate is attempted — show it on the field rather than as a toast.
      setErrors(getFieldErrors(error));
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Template',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{row.name}</p>
          <p className="text-[11px] text-ink-muted">v{row.version}</p>
        </div>
      ),
    },
    { key: 'regionLabel', header: 'Region', render: (row) => <Badge variant="brand">{row.regionLabel}</Badge> },
    {
      key: 'stayTypeLabel',
      header: 'Applies to',
      render: (row) => (
        <div className="min-w-0">
          <p className="text-[12.5px] text-ink">{row.stayTypeLabel}</p>
          {!row.isAutoResolved && (
            <p className="text-[10.5px] text-ink-muted">Only by explicit selection</p>
          )}
        </div>
      ),
    },
    {
      key: 'content',
      header: 'Body',
      render: (row) => (
        <button
          type="button"
          onClick={() => setPreview(row)}
          className="text-[12px] text-brand-700 underline-offset-2 hover:underline"
        >
          {row.content ? `${row.content.length.toLocaleString()} characters` : 'Empty'}
        </button>
      ),
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (row) => (
        <Toggle
          checked={row.isActive}
          disabled={isUpdating && pendingId === row.id}
          onChange={(value) => updateTemplate({ id: row.id, patch: { isActive: value } })}
          label={`${row.name} active`}
        />
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (row) => <span className="whitespace-nowrap text-ink-muted">{formatDate(row.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="xs" onClick={() => open(row)}>
            Edit
          </Button>
          <Button size="xs" variant="ghost" aria-label={`Delete ${row.name}`} onClick={() => setConfirmDelete(row)}>
            <Trash2 className="size-3 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contract Templates"
        subtitle="The documents Dropbox Sign issues. The API picks one from the property's region and the stay length."
        actions={
          <Button variant="primary" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={() => open(null)}>
            New template
          </Button>
        }
      />

      {/* Coverage — the thing that actually determines whether sending works. */}
      <Card>
        <CardHeader
          title="Coverage for long stays"
          subtitle="Only stays of ~6 months or more get a contract; every region needs a residential and a commercial template."
        />

        <div className="border-t border-line p-4">
          {gaps.length === 0 ? (
            <Alert variant="success" title="Every region is covered">
              A contract can be issued for a long stay in any jurisdiction.
            </Alert>
          ) : (
            <Alert variant="warn" title={`${gaps.length} combination${gaps.length === 1 ? '' : 's'} not covered`}>
              A booking matching any of these cannot have a contract issued at all:
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {gaps.map((gap) => (
                  <li
                    key={`${gap.region}-${gap.stayType}`}
                    className="rounded-full bg-warn-soft px-2.5 py-1 text-[11px] font-medium text-warn"
                  >
                    {gap.regionLabel} · {gap.stayTypeLabel.replace(/ \(.*\)/, '')}
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          {/* The full grid, so partial coverage reads at a glance. */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                    Region
                  </th>
                  {AUTO_RESOLVED_STAY_TYPES.map((type) => (
                    <th
                      key={type}
                      className="pb-2 text-left text-[10px] font-bold uppercase tracking-[0.06em] text-ink-muted"
                    >
                      {type === 'long_residential' ? 'Residential' : 'Commercial'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TEMPLATE_REGIONS.map((region) => (
                  <tr key={region.value} className="border-t border-line">
                    <td className="py-2 font-medium text-ink">{region.label}</td>
                    {AUTO_RESOLVED_STAY_TYPES.map((type) => {
                      const match = templates.find(
                        (t) => t.region === region.value && t.stayType === type && t.isActive,
                      );
                      return (
                        <td key={type} className="py-2">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
                              match ? 'bg-ok-soft text-ok' : 'bg-black/5 text-ink-muted',
                            )}
                          >
                            {match ? `v${match.version}` : 'Missing'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="All templates" subtitle={`${templates.length} stored`} />
        <div className="table-scroll border-t border-line">
          <DataTable
            columns={columns}
            rows={templates}
            isLoading={isLoading}
            emptyTitle="No templates yet"
            emptyDescription="Contracts cannot be issued until at least one template exists."
          />
        </div>
      </Card>

      {/* Create / edit */}
      <Modal
        isOpen={isFormOpen}
        onClose={close}
        size="xl"
        title={editing ? `Edit ${editing.name}` : 'New contract template'}
        description="Region, stay type and version together must be unique."
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={close}>Cancel</Button>
            <Button variant="primary" isLoading={isCreating || isUpdating} onClick={submit}>
              {editing ? 'Save changes' : 'Create template'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Input
            containerClassName="sm:col-span-2"
            label="Template name"
            placeholder="e.g. UK Assured Shorthold Tenancy"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={errors.name}
          />

          <Select
            label="Region"
            value={form.region}
            onChange={(event) => setForm({ ...form, region: event.target.value })}
            options={TEMPLATE_REGIONS}
            hint="Matched against the property's country"
            error={errors.region}
          />

          <Select
            label="Applies to"
            value={form.stayType}
            onChange={(event) => setForm({ ...form, stayType: event.target.value })}
            options={TEMPLATE_STAY_TYPES}
            error={errors.stay_type}
            hint={
              AUTO_RESOLVED_STAY_TYPES.includes(form.stayType)
                ? 'Selected automatically when a contract is sent'
                : 'Only used when chosen explicitly'
            }
          />

          <Input
            label="Version"
            value={form.version}
            onChange={(event) => setForm({ ...form, version: event.target.value })}
            error={errors.version}
            hint="Bump this to supersede an existing template"
          />

          <div className="flex items-end pb-1">
            <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-line-soft px-3 py-2">
              <span className="text-[12.5px] font-medium text-ink">Active</span>
              <Toggle
                checked={form.isActive}
                onChange={(value) => setForm({ ...form, isActive: value })}
                label="Template active"
              />
            </div>
          </div>

          <Textarea
            containerClassName="sm:col-span-2"
            label="Body"
            rows={14}
            className="font-mono text-[11.5px]"
            placeholder="The full agreement text sent to Dropbox Sign…"
            value={form.content}
            onChange={(event) => setForm({ ...form, content: event.target.value })}
            error={errors.content}
            hint="Sent verbatim — placeholders are not substituted by the API"
          />
        </div>
      </Modal>

      {/* Read-only body preview */}
      <Modal
        isOpen={Boolean(preview)}
        onClose={() => setPreview(null)}
        size="xl"
        title={preview?.name}
        description={preview ? `${preview.regionLabel} · ${preview.stayTypeLabel} · v${preview.version}` : ''}
      >
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg bg-line-soft p-4 text-[11.5px] leading-6 text-ink-soft">
          {preview?.content || 'This template has no body yet.'}
        </pre>
      </Modal>

      <Modal
        isOpen={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        title="Delete this template?"
        description="Contracts already issued from it are unaffected."
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteTemplate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <Alert variant="warn" title="Deactivating is usually enough">
          Switching a template off stops it being selected while keeping it on record. Deleting removes it entirely.
        </Alert>
        <p className="mt-3 inline-flex items-center gap-2 text-[13px] text-ink">
          <FileText className="size-4 text-ink-muted" aria-hidden="true" />
          {confirmDelete?.name} · {confirmDelete?.regionLabel}
        </p>
      </Modal>
    </div>
  );
};
