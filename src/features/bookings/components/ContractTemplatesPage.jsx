import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { DataTable } from '@/components/ui/DataTable';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/classNames';
import { formatDate } from '@/utils/format';
import { getErrorCode, getErrorMessage } from '@/utils/errors';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';
import { cellState, hasSignatureField } from '@/lib/contractSchema';
import {
  useContractCoverage,
  useDeleteTemplate,
  useDuplicateTemplate,
  usePublishTemplate,
  useRetireTemplate,
  useTemplates,
  useTemplatesForCell,
} from '../hooks/useContracts';

const CELL_STYLES = {
  published: 'bg-ok-soft text-ok',
  'published-short': 'bg-warn-soft text-warn',
  'draft-only': 'bg-warn-soft text-warn',
  empty: 'bg-danger-soft text-danger',
};

/** One cell of the 25-cell grid — mode (row) × region (column). */
const CoverageCell = ({ cell, onOpen }) => {
  const state = cellState(cell);

  return (
    <button
      type="button"
      onClick={() => onOpen(cell)}
      className={cn(
        'flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-opacity hover:opacity-80',
        CELL_STYLES[state],
      )}
    >
      {state === 'empty' && <span className="text-[11.5px] font-semibold">No template</span>}
      {state === 'draft-only' && (
        <>
          <span className="text-[11.5px] font-semibold">Draft · not live</span>
          <span className="text-[10px] opacity-80">{cell.draftCount} draft{cell.draftCount === 1 ? '' : 's'}</span>
        </>
      )}
      {(state === 'published' || state === 'published-short') && (
        <>
          <span className="text-[11.5px] font-semibold">
            {cell.published.name} · v{cell.published.version}
          </span>
          <span className="text-[10px] opacity-80">
            {state === 'published-short'
              ? `Short — ${cell.published.contentLength.toLocaleString()} characters`
              : formatDate(cell.published.publishedAt)}
          </span>
        </>
      )}
    </button>
  );
};

/** The cell-detail popup — every version (draft/published/retired) for one region+stay_type. */
const CellDetailModal = ({ cell, onClose, canAuthor }) => {
  const isOpen = Boolean(cell);
  const { data: templates = [], isLoading } = useTemplatesForCell(cell?.region, cell?.stayType);
  const { publish, isPublishing } = usePublishTemplate();
  const { retireAsync, isRetiring } = useRetireTemplate();
  const { duplicate, isDuplicating } = useDuplicateTemplate();
  const { deleteTemplateAsync, isDeleting } = useDeleteTemplate();

  const [publishTarget, setPublishTarget] = useState(null);
  const [publishError, setPublishError] = useState(null);
  const [retireTarget, setRetireTarget] = useState(null);
  const [retireAffected, setRetireAffected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const published = templates.find((t) => t.status === 'published') ?? null;
  const drafts = templates.filter((t) => t.status === 'draft');
  const retired = templates.filter((t) => t.status === 'retired');

  /**
   * Long stays are signed for real, and the API refuses to publish one without
   * a `{{ signature }}` block. Checked here too: publishing straight from this
   * grid skips the editor, which is the one place that used to warn.
   */
  const requiresSignature = cell?.mode === 'signature';
  const missingSignature = (template) => requiresSignature && !hasSignatureField(template.content);

  const startRetire = async (template) => {
    setRetireTarget(template);
    try {
      await retireAsync({ id: template.id, confirm: false });
    } catch (error) {
      setRetireAffected(error?.response?.data?.affected?.upcoming_bookings ?? 0);
    }
  };

  const confirmRetire = () => retireAsync({ id: retireTarget.id, confirm: true }).then(() => setRetireTarget(null));

  const confirmPublish = () => {
    setPublishError(null);
    publish(
      { id: publishTarget.id },
      { onSuccess: () => setPublishTarget(null), onError: (error) => setPublishError(error) },
    );
  };

  const confirmDelete = async () => {
    setDeleteError(null);
    try {
      await deleteTemplateAsync({ id: deleteTarget.id, region: cell.region, stayType: cell.stayType });
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(error);
    }
  };

  const Row = ({ template, actions }) => (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-3.5 py-3">
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-semibold text-ink">
          {template.name} · v{template.version}
        </p>
        <p className="text-[10.5px] text-ink-muted">
          {template.contentLength.toLocaleString()} characters
          {template.contractsIssued > 0 ? ` · used on ${template.contractsIssued} contract${template.contractsIssued === 1 ? '' : 's'}` : ''}
          {template.publishedAt ? ` · published ${formatDate(template.publishedAt)}` : ''}
        </p>
        {missingSignature(template) && (
          <Badge variant="warn" className="mt-1.5">
            No {'{{ signature }}'} block
          </Badge>
        )}
      </div>
      <div className="flex shrink-0 gap-1.5">{actions}</div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        title={cell ? `${cell.regionLabel} · ${cell.stayTypeLabel}` : ''}
        description={cell ? `${cell.mode === 'signature' ? 'Signature' : 'Tick-box'} agreement` : ''}
      >
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Published</p>
              {published ? (
                <Row
                  template={published}
                  actions={
                    canAuthor && (
                      <>
                        <Button size="xs" isLoading={isDuplicating} onClick={() => duplicate({ id: published.id })}>
                          New draft from this
                        </Button>
                        <Button size="xs" variant="dangerSoft" isLoading={isRetiring} onClick={() => startRetire(published)}>
                          Retire
                        </Button>
                      </>
                    )
                  }
                />
              ) : (
                <p className="text-[12px] text-ink-muted">Nothing published for this cell yet.</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                Drafts {drafts.length > 0 && `(${drafts.length})`}
              </p>
              {drafts.length > 0 ? (
                <div className="space-y-2">
                  {drafts.map((draft) => (
                    <Row
                      key={draft.id}
                      template={draft}
                      actions={
                        canAuthor ? (
                          <>
                            <Button size="xs" to={paths.contractTemplateEdit(draft.id) + `?region=${cell.region}&stayType=${cell.stayType}`}>
                              Edit
                            </Button>
                            <Button
                              size="xs"
                              variant="primary"
                              isLoading={isPublishing}
                              disabled={missingSignature(draft)}
                              title={
                                missingSignature(draft)
                                  ? 'This draft has no {{ signature }} block — open it in the editor and add one first'
                                  : undefined
                              }
                              onClick={() => setPublishTarget(draft)}
                            >
                              Publish
                            </Button>
                            <Button size="xs" variant="ghost" aria-label={`Delete ${draft.name}`} onClick={() => setDeleteTarget(draft)}>
                              <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
                            </Button>
                          </>
                        ) : (
                          <Button size="xs" to={paths.contractTemplateEdit(draft.id) + `?region=${cell.region}&stayType=${cell.stayType}`}>
                            View
                          </Button>
                        )
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-ink-muted">No drafts.</p>
              )}
            </div>

            {retired.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Retired</p>
                <div className="space-y-2">
                  {retired.map((template) => (
                    <Row
                      key={template.id}
                      template={template}
                      actions={
                        canAuthor && (
                          <Button size="xs" isLoading={isDuplicating} onClick={() => duplicate({ id: template.id })}>
                            Restore as new draft
                          </Button>
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {canAuthor && (
              <Button
                variant="primary"
                fullWidth
                leftIcon={<Plus className="size-3.5" aria-hidden="true" />}
                to={paths.contractTemplateNew + `?region=${cell?.region}&stayType=${cell?.stayType}`}
              >
                New draft for this cell
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* Publish confirmation */}
      <Modal
        isOpen={Boolean(publishTarget)}
        onClose={() => { setPublishTarget(null); setPublishError(null); }}
        size="sm"
        title={publishTarget ? `Publish ${cell?.regionLabel} · ${cell?.stayTypeLabel} v${publishTarget.version}?` : ''}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => { setPublishTarget(null); setPublishError(null); }}>Cancel</Button>
            <Button size="sm" variant="primary" isLoading={isPublishing} onClick={confirmPublish}>Publish</Button>
          </div>
        }
      >
        <p className="text-[12.5px] text-ink-soft">
          {published
            ? `This replaces v${published.version} for new bookings. Guests who already accepted v${published.version} keep that version on their booking.`
            : 'This is the first published template for this cell.'}
        </p>
        {publishError && (
          <Alert variant="error" className="mt-3">
            {(() => {
              const code = getErrorCode(publishError);
              const data = publishError?.response?.data;
              if (code === 'unknown_fields') {
                return (
                  <>
                    Fix these fields before publishing:
                    <ul className="mt-1 list-inside list-disc">{(data.unknown_fields ?? []).map((f) => <li key={f}>{`{{ ${f} }}`}</li>)}</ul>
                  </>
                );
              }
              if (code === 'missing_signature_field') return 'Signature templates need a {{ signature }} field.';
              if (code === 'missing_values') {
                return (
                  <>
                    Template is missing required values:
                    <ul className="mt-1 list-inside list-disc">{(data.missing_values ?? []).map((v) => <li key={v.field}>{v.field}</li>)}</ul>
                  </>
                );
              }
              return getErrorMessage(publishError);
            })()}
          </Alert>
        )}
      </Modal>

      {/* Retire confirmation */}
      <Modal
        isOpen={Boolean(retireTarget) && retireAffected !== null}
        onClose={() => { setRetireTarget(null); setRetireAffected(null); }}
        size="sm"
        title="Retire this template?"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => { setRetireTarget(null); setRetireAffected(null); }}>Cancel</Button>
            <Button size="sm" variant="danger" isLoading={isRetiring} onClick={confirmRetire}>Retire</Button>
          </div>
        }
      >
        <p className="text-[12.5px] text-ink-soft">
          Retiring leaves {cell?.regionLabel} · {cell?.stayTypeLabel} with no template.{' '}
          {retireAffected > 0
            ? `${retireAffected} upcoming booking${retireAffected === 1 ? '' : 's'} would get fallback terms.`
            : 'No upcoming bookings are affected.'}
        </p>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        size="sm"
        title="Delete this draft?"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>Cancel</Button>
            <Button size="sm" variant="danger" isLoading={isDeleting} onClick={confirmDelete}>Delete</Button>
          </div>
        }
      >
        {deleteError ? (
          <Alert variant="error">
            {getErrorCode(deleteError) === 'not_deletable'
              ? "This template has been used, so it can't be deleted. Retire it instead."
              : getErrorMessage(deleteError)}
          </Alert>
        ) : (
          <p className="text-[12.5px] text-ink-soft">This can't be undone.</p>
        )}
      </Modal>
    </>
  );
};

/** Contract templates — the documents Dropbox Sign (or the booking-agreement checkbox) issues. */
export const ContractTemplatesPage = () => {
  const { can } = useAuth();
  const canAuthor = can(CAPABILITIES.contractTemplatesManage);

  const { data: coverage, isLoading: isCoverageLoading, isError: isCoverageError, error: coverageError, refetch: refetchCoverage } = useContractCoverage();
  const { data: allTemplates = [], isLoading: isAllLoading, isError: isAllError, error: allError, refetch: refetchAll } = useTemplates();
  const [activeCell, setActiveCell] = useState(null);

  // Deep-link support — the Contracts board's "No published template" flag
  // links here with `?region=&stayType=` so the right cell opens immediately.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (!coverage) return;
    const region = searchParams.get('region');
    const stayType = searchParams.get('stayType');
    if (!region || !stayType) return;
    const cell = coverage.cells.find((c) => c.region === region && c.stayType === stayType);
    const band = coverage.bands.find((b) => b.stayType === stayType);
    if (cell) setActiveCell({ ...cell, mode: band?.mode });
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only meant to run once coverage first loads
  }, [coverage]);

  const grid = useMemo(() => {
    if (!coverage) return null;
    const byKey = new Map(coverage.cells.map((cell) => [`${cell.region}:${cell.stayType}`, cell]));
    return coverage.bands.map((band) => ({
      band,
      cells: coverage.regions.map((region) => ({ ...byKey.get(`${region}:${band.stayType}`), mode: band.mode })),
    }));
  }, [coverage]);

  const summary = useMemo(() => {
    if (!coverage) return null;
    let live = 0, drafts = 0, empty = 0;
    coverage.cells.forEach((cell) => {
      const state = cellState(cell);
      if (state === 'published' || state === 'published-short') live += 1;
      else if (state === 'draft-only') drafts += 1;
      else empty += 1;
    });
    return { live, drafts, empty, total: coverage.cells.length };
  }, [coverage]);

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
    { key: 'stayTypeLabel', header: 'Applies to', render: (row) => <span className="text-[12.5px] text-ink">{row.stayTypeLabel}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'published' ? 'ok' : row.status === 'draft' ? 'warn' : 'neutral'}>{row.statusLabel}</Badge>
      ),
    },
    { key: 'contentLength', header: 'Body', render: (row) => `${row.contentLength.toLocaleString()} characters` },
    { key: 'updatedAt', header: 'Updated', render: (row) => <span className="whitespace-nowrap text-ink-muted">{formatDate(row.updatedAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contract Templates"
        subtitle="The documents Dropbox Sign issues, or the booking-agreement checkbox for shorter stays."
        actions={
          !canAuthor && (
            <Badge variant="neutral">Only Super Admin can edit contract templates</Badge>
          )
        }
      />

      <Card>
        <CardHeader
          title="Coverage"
          subtitle={
            summary
              ? `${summary.live} of ${summary.total} live · ${summary.drafts} draft${summary.drafts === 1 ? '' : 's'} only · ${summary.empty} empty`
              : undefined
          }
        />
        <div className="border-t border-line p-4">
          {isCoverageLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : isCoverageError || !coverage ? (
            <Alert variant="error" title="Couldn't load the coverage grid">
              <p>{getErrorMessage(coverageError)}</p>
              <Button size="xs" className="mt-2" onClick={() => refetchCoverage()}>Retry</Button>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[12px]">
                <thead>
                  <tr>
                    <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-[0.06em] text-ink-muted">Stay type</th>
                    {coverage.regions.map((region) => (
                      <th key={region} className="pb-2 pl-2 text-left text-[10px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                        {coverage.cells.find((c) => c.region === region)?.regionLabel ?? region}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map(({ band, cells }) => (
                    <tr key={band.stayType} className="border-t border-line">
                      <td className="py-2 pr-3 font-medium text-ink">
                        {band.stayTypeLabel}
                        <span className="ml-1.5 text-[10px] font-normal text-ink-muted">
                          {band.mode === 'signature' ? 'Signature' : 'Tick-box'}
                        </span>
                      </td>
                      {cells.map((cell) => (
                        <td key={cell.region} className="py-1.5 pl-2">
                          <CoverageCell cell={cell} onOpen={setActiveCell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="All templates" subtitle={isAllError ? undefined : `${allTemplates.length} stored`} />
        <div className="table-scroll border-t border-line">
          {isAllError ? (
            <div className="p-4">
              <Alert variant="error" title="Couldn't load templates">
                <p>{getErrorMessage(allError)}</p>
                <Button size="xs" className="mt-2" onClick={() => refetchAll()}>Retry</Button>
              </Alert>
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={allTemplates}
              isLoading={isAllLoading}
              emptyTitle="No templates yet"
              emptyDescription="Contracts cannot be issued until at least one template exists."
              onRowClick={(row) =>
                setActiveCell({
                  region: row.region,
                  regionLabel: row.regionLabel,
                  stayType: row.stayType,
                  stayTypeLabel: row.stayTypeLabel,
                  mode: coverage?.bands.find((band) => band.stayType === row.stayType)?.mode,
                })
              }
            />
          )}
        </div>
      </Card>

      <CellDetailModal cell={activeCell} onClose={() => setActiveCell(null)} canAuthor={canAuthor} />
    </div>
  );
};
