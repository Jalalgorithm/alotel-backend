import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Check, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input, Textarea } from '@/components/ui/Input';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/classNames';
import { getErrorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';
import { PRIORITY_BADGE_VARIANT, STATUS_BADGE_VARIANT, TICKET_COST_TYPES, TICKET_PRIORITIES, TICKET_STATUS_FLOW, TICKET_STATUSES } from '@/lib/maintenanceSchema';
import { useLogTicketCost, useMaintenanceTicket, useUpdateTicket, useUploadTicketPhoto } from '../hooks/useMaintenanceTickets';
import { useMaintenanceWorkers } from '../hooks/useMaintenanceWorkers';

const StatusStepper = ({ status, onSelect, canManage }) => {
  const currentIndex = TICKET_STATUS_FLOW.indexOf(status);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TICKET_STATUS_FLOW.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <button
            key={step}
            type="button"
            disabled={!canManage}
            onClick={() => onSelect(step)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
              isCurrent && 'border-brand-700 bg-brand-700 text-white',
              isDone && 'border-brand-200 bg-brand-50 text-brand-700',
              !isCurrent && !isDone && 'border-line bg-white text-ink-muted hover:border-brand-300',
              !canManage && 'cursor-default',
            )}
          >
            {isDone && <Check className="size-3" aria-hidden="true" />}
            {TICKET_STATUSES.find((s) => s.value === step)?.label}
          </button>
        );
      })}
    </div>
  );
};

const emptyCostForm = { costType: 'materials', amount: '', note: '', invoiceReference: '', receiptFile: null };

const CostLogForm = ({ ticketId }) => {
  const { logCost, isPending } = useLogTicketCost(ticketId);
  const [form, setForm] = useState(emptyCostForm);

  const submit = () => {
    if (!form.amount) return;
    logCost(form, { onSuccess: () => setForm(emptyCostForm) });
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-end gap-2.5">
        <Select label="Type" options={TICKET_COST_TYPES} value={form.costType} onChange={(e) => setForm((p) => ({ ...p, costType: e.target.value }))} containerClassName="w-32" />
        <Input label="Amount" type="number" min="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} containerClassName="w-28" />
        <Input label="Note" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} containerClassName="flex-1 min-w-40" />
        <Input label="Invoice ref" value={form.invoiceReference} onChange={(e) => setForm((p) => ({ ...p, invoiceReference: e.target.value }))} containerClassName="w-32" />
        <Button leftIcon={<Plus className="size-3.5" aria-hidden="true" />} isLoading={isPending} onClick={submit}>Log cost</Button>
      </div>
      <FileDropzone
        accept="image/*,.pdf"
        hint="Receipt scan (optional) — JPG, PNG or PDF"
        fileName={form.receiptFile?.name}
        compact
        onFileSelected={(file) => setForm((p) => ({ ...p, receiptFile: file }))}
      />
    </div>
  );
};

export const TicketDetailPage = () => {
  const { ticketId } = useParams();
  const { data: ticket, isLoading, isError, error } = useMaintenanceTicket(ticketId);
  const { data: workersData } = useMaintenanceWorkers({ status: 'active', pageSize: 100 });
  const { updateTicket } = useUpdateTicket();
  const { uploadPhoto, isPending: isUploading } = useUploadTicketPhoto(ticketId);

  const { can } = useAuth();
  const canManage = can(CAPABILITIES.maintenanceManage);

  const [notesDraft, setNotesDraft] = useState('');
  useEffect(() => {
    setNotesDraft(ticket?.resolutionNotes ?? '');
  }, [ticket?.id, ticket?.resolutionNotes]);
  const notesDirty = ticket && notesDraft !== (ticket.resolutionNotes ?? '');

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="space-y-5">
        <PageHeader title="Ticket" />
        <EmptyState title="Could not load this ticket" description={getErrorMessage(error)} action={<Button to={paths.maintenanceTickets}>Back to tickets</Button>} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={ticket.category}
        subtitle={ticket.propertyName || ticket.spaceName || ticket.propertyId || ticket.spaceId}
        meta={
          <>
            <Badge variant={PRIORITY_BADGE_VARIANT[ticket.priority]}>{TICKET_PRIORITIES.find((p) => p.value === ticket.priority)?.label}</Badge>
            <span className="text-[11.5px] text-ink-muted">Opened {formatDate(ticket.createdAt)}</span>
          </>
        }
        actions={<Button to={paths.maintenanceTickets} leftIcon={<ArrowLeft className="size-3.5" aria-hidden="true" />}>Back</Button>}
      />

      <Card className="p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Status</p>
        <StatusStepper status={ticket.status} canManage={canManage} onSelect={(status) => updateTicket(ticket.id, { status })} />
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Description</p>
          <p className="text-[12.5px] leading-5 text-ink-soft">{ticket.description}</p>
        </Card>

        <Card className="p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Assigned worker</p>
          {canManage ? (
            <Select
              value={ticket.assignedWorkerId ?? ''}
              onChange={(e) => updateTicket(ticket.id, { assigned_worker_id: e.target.value || null })}
              placeholder="Unassigned"
              options={(workersData?.items ?? []).map((w) => ({ value: w.id, label: w.name }))}
            />
          ) : (
            <p className="text-[12.5px] text-ink">{ticket.assignedWorkerName || 'Unassigned'}</p>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Resolution notes</p>
        {canManage ? (
          <div className="space-y-2">
            <Textarea rows={3} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="What was done to resolve this — visible once the ticket moves to Resolved or Closed." />
            {notesDirty && (
              <Button size="sm" onClick={() => updateTicket(ticket.id, { resolution_notes: notesDraft })}>
                Save notes
              </Button>
            )}
          </div>
        ) : (
          <p className="text-[12.5px] leading-5 text-ink-soft">{ticket.resolutionNotes || 'No resolution notes yet.'}</p>
        )}
      </Card>

      <Card>
        <CardHeader title="Cost log" subtitle={`Total so far: ${ticket.totalCost.toLocaleString()}`} />
        <div className="space-y-3 border-t border-line p-4">
          {canManage && <CostLogForm ticketId={ticket.id} />}
          {ticket.costs.length ? (
            <div className="space-y-1.5">
              {ticket.costs.map((cost) => (
                <div key={cost.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2.5 text-[12.5px]">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{TICKET_COST_TYPES.find((c) => c.value === cost.costType)?.label} · {cost.note || 'No note'}</p>
                    {cost.invoiceReference && <p className="text-[11px] text-ink-muted">Invoice: {cost.invoiceReference}</p>}
                    {cost.receiptUrl && (
                      <a href={cost.receiptUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-brand-700 hover:underline">
                        View receipt
                      </a>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">{cost.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-ink-muted">No costs logged yet.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Photos" />
        <div className="space-y-3 border-t border-line p-4">
          {canManage && <FileDropzone accept="image/*" hint="JPG or PNG, up to 20MB" onFileSelected={(file) => file && uploadPhoto({ file })} compact />}
          {isUploading && <p className="text-[11px] text-ink-muted">Uploading…</p>}
          {ticket.photos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {ticket.photos.map((photo) => (
                <img key={photo.id} src={photo.url} alt={photo.caption || 'Ticket photo'} className="size-24 rounded-lg border border-line object-cover" />
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-ink-muted">No photos yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
};
