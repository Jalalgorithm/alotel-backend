import { useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/utils/format';
import { getErrorCode, getErrorMessage } from '@/utils/errors';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import {
  useContractDetail,
  useContractDocument,
  useContractEvents,
  useRemindContract,
  useSendContract,
  useTemplatesForCell,
  useVoidContract,
} from '../hooks/useContracts';

const EVENT_SOURCE_LABEL = { alotel: 'Alotel', dropbox_sign: 'Dropbox Sign' };

/** Send/re-send form — template defaults to the resolved one; picking another reveals the required reason field. */
const SendForm = ({ resolvedTemplate, region, stayType, bookingId, onSent }) => {
  const { data: templates = [] } = useTemplatesForCell(region, stayType);
  const published = templates.filter((t) => t.status === 'published');
  const { sendContractAsync, isSending } = useSendContract();
  const [templateId, setTemplateId] = useState(resolvedTemplate?.id ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);

  const isOverride = templateId && templateId !== resolvedTemplate?.id;

  const submit = () => {
    setError(null);
    sendContractAsync({ bookingId, templateId: templateId || undefined, overrideReason: reason })
      .then(onSent)
      .catch((err) => {
        const code = getErrorCode(err);
        if (code === 'already_active') setError('This booking already has a contract awaiting signature. Void it first.');
        else if (code === 'override_reason_required') setError('Add a reason for using a different template.');
        else setError(getErrorMessage(err));
      });
  };

  return (
    <div className="space-y-3">
      {templates.length > 1 && (
        <Select
          label="Template"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          options={published.map((t) => ({ value: t.id, label: `${t.name} · v${t.version}` }))}
        />
      )}
      {isOverride && (
        <Input label="Reason for using a different template" value={reason} onChange={(e) => setReason(e.target.value)} />
      )}
      {error && <Alert variant="error">{error}</Alert>}
      <Button variant="primary" isLoading={isSending} onClick={submit} disabled={isOverride && !reason.trim()}>
        {resolvedTemplate ? 'Send' : 'Send now'}
      </Button>
      {!resolvedTemplate && published.length === 0 && (
        <p className="text-[11px] text-ink-muted">No published template for this cell yet — sending will fail until one exists.</p>
      )}
    </div>
  );
};

/**
 * Contract drawer — either an existing contract (`target.contractId`) or a
 * not-yet-sent booking (`target.booking`, no contract exists yet, so only a
 * summary + Send form applies, no timeline/rendered copy to show).
 */
export const ContractDrawer = ({ target, onClose }) => {
  const isOpen = Boolean(target);
  const isUnsent = target?.type === 'unsent';
  const contractId = target?.type === 'contract' ? target.contractId : null;

  const { can } = useAuth();
  const canManage = can(CAPABILITIES.contractsManage);

  const { data: contract, isLoading, isError: isDetailError, error: detailError, refetch: refetchDetail } = useContractDetail(contractId);
  const { data: events = [], isError: isEventsError, error: eventsError, refetch: refetchEvents } = useContractEvents(contractId);
  const { remind, isReminding } = useRemindContract();
  const { voidContractAsync, isVoiding } = useVoidContract();
  const { fetchDocument, isFetching: isFetchingDocument } = useContractDocument();

  const [remindError, setRemindError] = useState(null);
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [reissue, setReissue] = useState(false);
  const [voidError, setVoidError] = useState(null);

  const openDocument = async (download) => {
    const { fileUrl } = await fetchDocument({ contractId, download });
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRemind = () => {
    setRemindError(null);
    remind(contractId, {
      onError: (error) => {
        if (getErrorCode(error) === 'too_soon') {
          const retryAt = error?.response?.data?.retry_after_seconds;
          const when = retryAt ? new Date(Date.now() + retryAt * 1000) : null;
          setRemindError(when ? `A reminder was just sent. You can send another at ${formatDate(when, 'HH:mm')}.` : 'A reminder was just sent.');
        } else {
          setRemindError(getErrorMessage(error));
        }
      },
    });
  };

  const submitVoid = async () => {
    setVoidError(null);
    try {
      await voidContractAsync({ contractId, reason: voidReason, reissue });
      setIsVoidOpen(false);
      onClose();
    } catch (error) {
      setVoidError(getErrorCode(error) === 'not_voidable' ? 'Only contracts awaiting signature can be voided.' : getErrorMessage(error));
    }
  };

  const booking = isUnsent ? target.booking : null;
  const title = isUnsent ? booking?.guest?.name ?? 'Booking' : contract?.guest?.name ?? 'Contract';
  const region = isUnsent ? booking?.region : contract?.region;
  const stayType = isUnsent ? booking?.stayType : contract?.stayType;
  const resolvedTemplate = isUnsent ? booking?.resolvedTemplate : contract?.resolution?.resolvedTemplate;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        title={title}
        description={
          isUnsent
            ? booking?.property?.name
            : contract && `#${contract.bookingId} · ${contract.property?.name ?? ''}`
        }
      >
        {isUnsent ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-3">
              <div><p className="text-[10px] font-bold uppercase text-ink-muted">Nights</p><p>{booking.nights}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-ink-muted">Check-in</p><p>{formatDate(booking.checkIn)}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-ink-muted">Region</p><p>{booking.regionLabel}</p></div>
            </div>
            {canManage ? (
              <SendForm resolvedTemplate={resolvedTemplate} region={region} stayType={stayType} bookingId={booking.bookingId} onSent={onClose} />
            ) : (
              <p className="text-[11.5px] text-ink-muted">Sending contracts needs the contracts capability.</p>
            )}
          </div>
        ) : isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : isDetailError ? (
          <Alert variant="error" title="Couldn't load this contract">
            <p>{getErrorMessage(detailError)}</p>
            <Button size="xs" className="mt-2" onClick={() => refetchDetail()}>Retry</Button>
          </Alert>
        ) : contract ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={contract.statusLabel} />
              {contract.testMode && <Badge variant="warn">Test</Badge>}
              {contract.emailCount > 0 && <span className="text-[11px] text-ink-muted">{contract.emailCount} email(s) sent</span>}
            </div>

            {contract.resolution && (
              <div className="rounded-lg border border-line bg-line-soft p-3.5 text-[12px] text-ink-soft">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Why this template</p>
                {contract.resolution.nights} nights · {contract.resolution.isCommercial ? 'commercial' : 'residential'} ·{' '}
                {contract.resolution.region} → {contract.resolution.usedTemplate?.name ?? 'no template'}
                {contract.resolution.usedTemplate ? ` v${contract.resolution.usedTemplate.version}` : ''}
                {contract.resolution.override && (
                  <p className="mt-1.5 text-[11px] text-warn">
                    Overridden by {contract.resolution.override.by?.name ?? 'an admin'}: {contract.resolution.override.reason}
                  </p>
                )}
              </div>
            )}

            <details className="rounded-lg border border-line">
              <summary className="cursor-pointer px-3.5 py-2.5 text-[12px] font-semibold text-ink">Text sent</summary>
              <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap border-t border-line p-3.5 font-sans text-[11.5px] leading-6 text-ink-soft">
                {contract.renderedContent || 'No copy on record.'}
              </pre>
            </details>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Timeline</p>
              {isEventsError ? (
                <Alert variant="error" title="Couldn't load the timeline">
                  <p>{getErrorMessage(eventsError)}</p>
                  <Button size="xs" className="mt-2" onClick={() => refetchEvents()}>Retry</Button>
                </Alert>
              ) : (
              <ol className="space-y-2">
                {events.map((event) => (
                  <li key={event.id} className="flex items-start gap-2.5 text-[12px]">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
                    <div>
                      <p className="text-ink">
                        {event.type} <span className="text-ink-muted">· {EVENT_SOURCE_LABEL[event.source] ?? event.source}</span>
                      </p>
                      <p className="text-[10.5px] text-ink-muted">
                        {formatDate(event.at, 'd MMM yyyy, HH:mm')}{event.actor?.name ? ` · ${event.actor.name}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              )}
            </div>

            {canManage && (
              <div className="space-y-3 border-t border-line pt-4">
                {remindError && <Alert variant="warn">{remindError}</Alert>}
                <div className="flex flex-wrap gap-2">
                  {contract.status === 'sent' && (
                    <>
                      <Button isLoading={isReminding} onClick={handleRemind}>Remind</Button>
                      <Button variant="dangerSoft" onClick={() => setIsVoidOpen(true)}>Void</Button>
                    </>
                  )}
                  {['declined', 'expired', 'cancelled'].includes(contract.status) && (
                    <SendForm resolvedTemplate={resolvedTemplate} region={region} stayType={stayType} bookingId={contract.bookingId} onSent={onClose} />
                  )}
                  {contract.status === 'signed' && (
                    <>
                      <Button isLoading={isFetchingDocument} leftIcon={<ExternalLink className="size-3.5" aria-hidden="true" />} onClick={() => openDocument(false)}>
                        View PDF
                      </Button>
                      <Button isLoading={isFetchingDocument} leftIcon={<Download className="size-3.5" aria-hidden="true" />} onClick={() => openDocument(true)}>
                        Download
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        size="sm"
        title="Void this contract?"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setIsVoidOpen(false)} disabled={isVoiding}>Cancel</Button>
            <Button size="sm" variant="danger" isLoading={isVoiding} onClick={submitVoid} disabled={!voidReason.trim()}>Void</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input label="Reason" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
          <label className="flex items-center gap-2 text-[12px] text-ink">
            <input type="checkbox" checked={reissue} onChange={(e) => setReissue(e.target.checked)} />
            Send a fresh contract
          </label>
          {voidError && <Alert variant="error">{voidError}</Alert>}
        </div>
      </Modal>
    </>
  );
};
