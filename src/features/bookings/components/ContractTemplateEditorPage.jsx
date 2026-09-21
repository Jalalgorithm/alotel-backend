import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';
import { getErrorCode, getErrorMessage } from '@/utils/errors';
import {
  regionLabel,
  stayTypeLabel,
  groupMergeFields,
  hasSignatureField,
  SIGNATURE_STAY_TYPES,
} from '@/lib/contractSchema';
import {
  useContractCoverage,
  useCreateTemplateDraft,
  useDuplicateTemplate,
  useMergeFields,
  usePreviewTemplate,
  usePublishTemplate,
  useTemplatesForCell,
  useUpdateTemplateDraft,
} from '../hooks/useContracts';
import { useBookings } from '../hooks/useBookings';

/** Insert `{{ key }}` at the caret, or append if the textarea ref isn't available yet. */
const insertAtCursor = (textareaEl, content, setContent, snippet) => {
  if (!textareaEl) {
    setContent(content + snippet);
    return;
  }
  const start = textareaEl.selectionStart ?? content.length;
  const end = textareaEl.selectionEnd ?? content.length;
  setContent(content.slice(0, start) + snippet + content.slice(end));
  requestAnimationFrame(() => {
    textareaEl.focus();
    textareaEl.selectionStart = textareaEl.selectionEnd = start + snippet.length;
  });
};

const jumpToField = (textareaEl, content, field) => {
  if (!textareaEl) return;
  const match = new RegExp(`\\{\\{\\s*${field}\\s*\\}\\}`).exec(content);
  if (!match) return;
  textareaEl.focus();
  textareaEl.selectionStart = match.index;
  textareaEl.selectionEnd = match.index + match[0].length;
};

const BookingPicker = ({ selected, onSelect, onClear }) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 400);
  const { data, isFetching } = useBookings({ query: debouncedQuery, pageSize: 5 }, { enabled: debouncedQuery.length > 1 });

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-line-soft px-3 py-2">
        <span className="min-w-0 truncate text-[12px] text-ink">
          {selected.guestName} · {selected.propertyName} · {selected.nights}n
        </span>
        <button type="button" onClick={onClear} aria-label="Clear booking" className="shrink-0 text-ink-muted hover:text-ink">
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        placeholder="Search a real booking to preview against…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        leftIcon={<Search className="size-3.5" aria-hidden="true" />}
      />
      {debouncedQuery.length > 1 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-line bg-white shadow-raised">
          {isFetching ? (
            <p className="p-3 text-[11.5px] text-ink-muted">Searching…</p>
          ) : data?.items?.length ? (
            <ul className="max-h-48 overflow-y-auto py-1">
              {data.items.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect({ id: row.id, guestName: row.guestName, propertyName: row.propertyName, nights: row.nights });
                      setQuery('');
                    }}
                    className="block w-full px-3 py-2 text-left text-[12px] text-ink hover:bg-line-soft"
                  >
                    {row.guestName} · {row.propertyName} · {row.nights}n
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-3 text-[11.5px] text-ink-muted">No matching bookings.</p>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Full-page template editor — write side (name, fixed region/stay type, content,
 * merge-field palette, unknown-fields list) and preview side (debounced render
 * against a sample or real booking). New drafts go through `useCreateTemplateDraft`;
 * existing ones through `useUpdateTemplateDraft`. Publishing is a separate,
 * explicit confirm step once the draft is saved.
 */
export const ContractTemplateEditorPage = () => {
  const { templateId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const canAuthor = can(CAPABILITIES.contractTemplatesManage);

  const region = searchParams.get('region');
  const stayType = searchParams.get('stayType');
  const isNew = !templateId;

  const { data: cellTemplates = [], isLoading: isCellLoading } = useTemplatesForCell(region, stayType);
  const existing = useMemo(() => cellTemplates.find((t) => t.id === templateId) ?? null, [cellTemplates, templateId]);

  // Whether this cell is signed for real (Dropbox Sign) or just tick-box accepted.
  // The coverage response is authoritative; the stay-type list is the fallback
  // for the moment before it lands.
  const { data: coverage } = useContractCoverage();
  const bandMode = coverage?.bands?.find((band) => band.stayType === stayType)?.mode;
  const requiresSignature = bandMode ? bandMode === 'signature' : SIGNATURE_STAY_TYPES.includes(stayType);

  const { data: mergeFields = [] } = useMergeFields();
  const groupedFields = useMemo(() => groupMergeFields(mergeFields), [mergeFields]);

  const { createDraftAsync, isCreating } = useCreateTemplateDraft();
  const { updateDraftAsync, isSaving } = useUpdateTemplateDraft();
  const { publish, isPublishing } = usePublishTemplate();
  const { duplicate, isDuplicating } = useDuplicateTemplate();
  const { preview, result: previewResult, isPreviewing } = usePreviewTemplate();

  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [notEditableError, setNotEditableError] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const textareaRef = useRef(null);
  const previewRequestRef = useRef(0);
  const seededRef = useRef(false);

  useEffect(() => {
    if (existing && !seededRef.current) {
      setName(existing.name);
      setContent(existing.content);
      seededRef.current = true;
    }
  }, [existing]);

  const isDirty = existing ? name !== existing.name || content !== existing.content : Boolean(name || content);

  // Warn on browser close/refresh with unsaved changes — in-app navigation isn't intercepted (no router-level guard exists elsewhere in this app to hook into).
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const debouncedContent = useDebouncedValue(content, 600);

  useEffect(() => {
    if (!region || !stayType) return;
    const requestId = ++previewRequestRef.current;
    preview(
      { content: debouncedContent, region, stayType, bookingId: selectedBooking?.id },
      {
        onSettled: () => {
          if (previewRequestRef.current !== requestId) return; // a newer preview call has already started
        },
      },
    );
  }, [debouncedContent, region, stayType, selectedBooking?.id, preview]);

  if (!region || !stayType) {
    return (
      <div className="space-y-5">
        <PageHeader title="New contract template" />
        <Alert variant="error">A region and stay type are required to open the editor — go back and pick a cell.</Alert>
      </div>
    );
  }

  /** Resolves to whether the draft actually reached the server — publishing a
   *  template whose save was rejected would publish the server's stale copy. */
  const save = async () => {
    setSaveError(null);
    setNotEditableError(false);
    try {
      if (isNew) {
        const created = await createDraftAsync({ name, region, stayType, content });
        navigate(`${paths.contractTemplateEdit(created.id)}?region=${region}&stayType=${stayType}`, { replace: true });
      } else {
        await updateDraftAsync({ id: templateId, patch: { name, content } });
      }
      return true;
    } catch (error) {
      if (getErrorCode(error) === 'not_editable') setNotEditableError(true);
      else setSaveError(error);
      return false;
    }
  };

  const openPublish = async () => {
    if (isDirty && !(await save())) return;
    setPublishError(null);
    setIsPublishOpen(true);
  };

  const confirmPublish = () => {
    publish({ id: templateId }, { onSuccess: () => { setIsPublishOpen(false); navigate(paths.contractTemplates); }, onError: setPublishError });
  };

  const readOnly = !canAuthor;
  const isBusy = isCreating || isSaving;
  // The server rejects publish without this block, and the preview endpoint
  // doesn't check — so surface it while the template is still being written.
  const signatureMissing = requiresSignature && !hasSignatureField(content);

  return (
    <div className="space-y-5">
      <PageHeader
        title={isNew ? 'New contract template' : existing?.name || 'Edit template'}
        subtitle={`${regionLabel(region)} · ${stayTypeLabel(stayType)}`}
        actions={
          <>
            <Button to={paths.contractTemplates} leftIcon={<ArrowLeft className="size-3.5" aria-hidden="true" />}>
              Back to templates
            </Button>
            {!readOnly && (
              <>
                <Button variant="primary" isLoading={isBusy} disabled={!isDirty} onClick={save}>
                  {isNew ? 'Create draft' : 'Save changes'}
                </Button>
                {!isNew && existing?.status === 'draft' && (
                  <Button
                    variant="dangerSoft"
                    isLoading={isPublishing}
                    disabled={signatureMissing}
                    title={signatureMissing ? 'Add a {{ signature }} block before publishing' : undefined}
                    onClick={openPublish}
                  >
                    Publish
                  </Button>
                )}
                {!isNew && existing?.status !== 'draft' && (
                  <Button isLoading={isDuplicating} onClick={() => duplicate({ id: templateId })}>
                    New draft from this
                  </Button>
                )}
              </>
            )}
          </>
        }
      />

      {readOnly && (
        <Alert variant="info">Only Super Admin can edit contract templates. You can still preview.</Alert>
      )}
      {notEditableError && (
        <Alert variant="error" title="Can't save">
          Published templates can&apos;t be changed. Create a new draft from it instead.
        </Alert>
      )}
      {saveError && <Alert variant="error">{getErrorMessage(saveError)}</Alert>}

      {isCellLoading && !isNew ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {/* Write side */}
          <div className="space-y-4">
            <Card className="p-5 space-y-4">
              <Input label="Template name" value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />
              <div className="flex gap-2">
                <Badge variant="brand">{regionLabel(region)}</Badge>
                <Badge variant="neutral">{stayTypeLabel(stayType)}</Badge>
              </div>
              <Textarea
                ref={textareaRef}
                label="Contract text"
                rows={20}
                className="font-mono text-[11.5px]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={readOnly}
              />

              {signatureMissing && (
                <Alert variant="warn" title="Signature block required">
                  {stayTypeLabel(stayType)} contracts are signed through Dropbox Sign, so this template must contain a{' '}
                  <code className="font-mono">{'{{ signature }}'}</code> block — insert it from the{' '}
                  <strong>Signing</strong> group below. Note that{' '}
                  <code className="font-mono">{'{{ signature_date }}'}</code> and{' '}
                  <code className="font-mono">{'{{ initials }}'}</code> don&apos;t count on their own. It can&apos;t be
                  published until this is added.
                </Alert>
              )}

              {previewResult?.unknownFields?.length > 0 && (
                <Alert variant="warn" title="Unknown fields">
                  <ul className="mt-1 space-y-1">
                    {previewResult.unknownFields.map((field) => (
                      <li key={field}>
                        <button
                          type="button"
                          className="text-[11.5px] text-brand-700 underline-offset-2 hover:underline"
                          onClick={() => jumpToField(textareaRef.current, content, field)}
                        >
                          {`{{ ${field} }}`}
                        </button>
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}
            </Card>

            <Card>
              <CardHeader title="Merge fields" subtitle="Click to insert at the cursor." />
              <div className="space-y-3 border-t border-line p-4">
                {groupedFields.map(({ group, fields }) => (
                  <div key={group}>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">{group}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {fields.map((field) => (
                        <button
                          key={field.key}
                          type="button"
                          disabled={readOnly}
                          onClick={() => insertAtCursor(textareaRef.current, content, setContent, `{{ ${field.key} }}`)}
                          title={field.example}
                          className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-ink hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
                        >
                          {field.label}
                          {field.required && <span className="ml-1 text-danger">*</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Preview side */}
          <div className="space-y-4">
            <Card>
              <CardHeader title="Preview" subtitle={isPreviewing ? 'Rendering…' : 'Updates automatically as you type.'} />
              <div className="space-y-3 border-t border-line p-4">
                <BookingPicker selected={selectedBooking} onSelect={setSelectedBooking} onClear={() => setSelectedBooking(null)} />

                {previewResult?.stayTypeMismatch && (
                  <Alert variant="warn">This booking would actually receive a different template — previewing anyway.</Alert>
                )}

                {previewResult?.missingValues?.length > 0 && (
                  <Alert variant={previewResult.missingValues.some((v) => v.required) ? 'error' : 'warn'} title="Missing values">
                    <ul className="mt-1 list-inside list-disc">
                      {previewResult.missingValues
                        .slice()
                        .sort((a, b) => Number(b.required) - Number(a.required))
                        .map((v) => (
                          <li key={v.field}>
                            {v.field} {v.required && <span className="text-[10px]">(required to publish)</span>}
                          </li>
                        ))}
                    </ul>
                  </Alert>
                )}

                <div className="rounded-lg border border-line bg-white p-5">
                  <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap font-sans text-[12px] leading-6 text-ink">
                    {previewResult?.rendered || content || 'Nothing to preview yet.'}
                  </pre>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      <Modal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        size="sm"
        title={`Publish ${regionLabel(region)} · ${stayTypeLabel(stayType)}?`}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setIsPublishOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" isLoading={isPublishing} onClick={confirmPublish}>Publish</Button>
          </div>
        }
      >
        <p className="text-[12.5px] text-ink-soft">
          This replaces whatever is currently published for this cell for new bookings. Guests who already accepted the
          old version keep that version on their booking.
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
    </div>
  );
};
