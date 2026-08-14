import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Check, FileText, ImageOff, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/utils/format';
import { damageAssessmentSchema } from '@/utils/validators';
import { DAMAGE_SEVERITIES, ROOM_AREAS, SEVERITY_BADGE_VARIANT } from '@/lib/checkoutSchema';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { useDeposit, usePaymentActions } from '@/features/finance';
import {
  useCheckoutReport,
  useCreateDamageAssessment,
  useDamageAssessments,
  useGenerateCheckoutReport,
  useInspectionState,
  useUpdateDamageAssessment,
} from '../hooks/useBookings';

const roomLabel = (value) => ROOM_AREAS.find((r) => r.value === value)?.label ?? value;
const severityLabel = (value) => DAMAGE_SEVERITIES.find((s) => s.value === value)?.label ?? value;

/** One stage's real inspection photos, grouped by room — replaces the old page's icon-tile placeholders. */
const PhotoStage = ({ title, stage }) => {
  const areas = Object.entries(stage?.photosByArea ?? {}).filter(([, photos]) => photos.length);

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={stage?.guestAcknowledged ? `Guest acknowledged ${formatDate(stage.guestAcknowledgedAt, 'd MMM, HH:mm')}` : 'Not yet acknowledged by guest'}
        action={
          stage?.guestAcknowledged ? (
            <Badge variant="ok" icon={<Check className="size-3" aria-hidden="true" />}>Acknowledged</Badge>
          ) : (
            <Badge variant="neutral">Pending</Badge>
          )
        }
      />
      <div className="space-y-3 border-t border-line p-4">
        {areas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-ink-muted">
            <ImageOff className="size-5" aria-hidden="true" />
            <p className="text-[11.5px]">No photos uploaded for this stage.</p>
          </div>
        ) : (
          areas.map(([area, photos]) => (
            <div key={area}>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">{roomLabel(area)}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((photo) => (
                  <a key={photo.id} href={photo.file} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-line">
                    <img src={photo.file} alt={photo.caption || roomLabel(area)} className="aspect-square w-full object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

const AddDamageForm = ({ bookingId, currency, onDone }) => {
  const { createDamage, isPending } = useCreateDamageAssessment(bookingId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(damageAssessmentSchema),
    defaultValues: { roomArea: ROOM_AREAS[0].value, description: '', severity: 'minor', estimatedCost: '' },
  });

  const submit = (values) =>
    createDamage(
      { ...values, currency },
      {
        onSuccess: () => {
          reset();
          onDone();
        },
      },
    );

  return (
    <form className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-white p-3.5 sm:grid-cols-2" onSubmit={handleSubmit(submit)}>
      <Select label="Room / area" options={ROOM_AREAS} error={errors.roomArea?.message} {...register('roomArea')} />
      <Select label="Severity" options={DAMAGE_SEVERITIES} error={errors.severity?.message} {...register('severity')} />
      <Input label="Description" placeholder="e.g. Cracked mirror" error={errors.description?.message} containerClassName="sm:col-span-2" {...register('description')} />
      <Input label={`Estimated cost (${currency})`} type="number" min="0" error={errors.estimatedCost?.message} {...register('estimatedCost')} />
      <div className="flex items-end gap-2">
        <Button type="button" onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" isLoading={isPending}>Log item</Button>
      </div>
    </form>
  );
};

const DamageRow = ({ bookingId, damage, canManage }) => {
  const { updateDamage, isPending, pendingId } = useUpdateDamageAssessment(bookingId);
  const [approvedCost, setApprovedCost] = useState(damage.approvedCost ?? damage.estimatedCost);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-ink">{damage.description}</p>
        <p className="mt-0.5 flex items-center gap-2 text-[10.5px] text-ink-muted">
          {roomLabel(damage.roomArea)}
          <Badge variant={SEVERITY_BADGE_VARIANT[damage.severity] ?? 'neutral'}>{severityLabel(damage.severity)}</Badge>
        </p>
      </div>

      <p className="shrink-0 text-[11.5px] text-ink-muted">
        Estimated <span className="font-semibold text-ink">{formatCurrency(damage.estimatedCost, damage.currency)}</span>
      </p>

      {canManage ? (
        <Input
          label="Approved cost"
          type="number"
          min="0"
          value={approvedCost}
          onChange={(e) => setApprovedCost(e.target.value)}
          onBlur={() => updateDamage(damage.id, { approvedCost: approvedCost === '' ? null : approvedCost })}
          containerClassName="w-32 shrink-0"
        />
      ) : (
        <p className="shrink-0 text-[12.5px] font-semibold text-ink">{formatCurrency(damage.approvedCost ?? damage.estimatedCost, damage.currency)}</p>
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        <span className="text-[10.5px] text-ink-muted">Deduct</span>
        <Toggle
          checked={damage.deductFromDeposit}
          disabled={!canManage || (isPending && pendingId === damage.id)}
          label={`Deduct ${damage.description}`}
          onChange={(value) => updateDamage(damage.id, { deductFromDeposit: value })}
        />
      </div>
    </div>
  );
};

const GenerateReportSection = ({ bookingId, damageItems }) => {
  const { data: report, isLoading } = useCheckoutReport(bookingId);
  const { generateReport, isPending } = useGenerateCheckoutReport(bookingId);
  const [isConfirming, setIsConfirming] = useState(false);

  const previewDeduction = damageItems
    .filter((item) => item.deductFromDeposit)
    .reduce((sum, item) => sum + Number(item.approvedCost ?? item.estimatedCost ?? 0), 0);

  if (isLoading) return <Skeleton className="h-24" />;

  return (
    <Card>
      <CardHeader title="Check-out report" subtitle="Generating settles the deposit — deducting flagged damage and releasing the remainder." />
      <div className="space-y-3 border-t border-line p-4">
        {report ? (
          <div className="space-y-2 text-[12.5px]">
            <div className="flex items-center justify-between gap-4">
              <span className="text-ink-muted">Generated</span>
              <span className="text-ink">{formatDate(report.generatedAt, 'd MMM yyyy, HH:mm')}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-ink-muted">Deposit deducted</span>
              <span className="font-semibold text-ink">{formatCurrency(report.depositDeductionTotal, damageItems[0]?.currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-ink-muted">Sent to guest</span>
              <span className="text-ink">{report.sentToGuest ? `Yes — ${formatDate(report.sentAt)}` : 'Not yet'}</span>
            </div>
            {report.pdfUrl && (
              <a href={report.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-700 hover:underline">
                <FileText className="size-3.5" aria-hidden="true" /> Open report PDF
              </a>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-ink-muted">No report generated yet for this booking.</p>
        )}

        {isConfirming ? (
          <Alert variant="warn" title={report ? 'Regenerate the report?' : 'Generate the report?'}>
            <p>
              This will deduct an estimated <strong>{formatCurrency(previewDeduction, damageItems[0]?.currency)}</strong> from the deposit (sum of
              items marked "Deduct") and auto-release the remainder. The server computes the final number — this is a preview.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" onClick={() => setIsConfirming(false)}>Cancel</Button>
              <Button
                size="sm"
                variant="primary"
                isLoading={isPending}
                onClick={() => generateReport(undefined, { onSuccess: () => setIsConfirming(false) })}
              >
                Confirm & generate
              </Button>
            </div>
          </Alert>
        ) : (
          <Button variant="primary" onClick={() => setIsConfirming(true)}>
            {report ? 'Regenerate report' : 'Generate report'}
          </Button>
        )}
      </div>
    </Card>
  );
};

const ManualDepositOverride = ({ bookingId, currency }) => {
  const { captureDeposit, deductDeposit, releaseDeposit, isPending } = usePaymentActions();
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');

  return (
    <Card>
      <CardHeader title="Manual override" subtitle="Super Admin only — bypasses the automatic report-driven resolution above." />
      <div className="space-y-3 border-t border-line p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label={`Amount (${currency})`} type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input label="Reason (for deduction)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button isLoading={isPending} onClick={() => captureDeposit({ bookingId, amount: amount || undefined })}>Capture</Button>
          <Button variant="dangerSoft" isLoading={isPending} disabled={!amount} onClick={() => deductDeposit({ bookingId, amount, reason })}>Deduct</Button>
          <Button variant="primary" isLoading={isPending} onClick={() => releaseDeposit({ bookingId })}>Release remainder</Button>
        </div>
      </div>
    </Card>
  );
};

/** Deposit reconciliation for one completed booking — inspection photos, itemized damage, and the server-generated check-out report. */
export const CheckoutReportDetailModal = ({ isOpen, onClose, booking }) => {
  const { can } = useAuth();
  const canManage = can(CAPABILITIES.checkoutReview);
  const canOverride = can(CAPABILITIES.financeView);

  const [isAddingDamage, setIsAddingDamage] = useState(false);
  const bookingId = booking?.id;

  const { data: deposit } = useDeposit(bookingId);
  const { data: inspection, isLoading: isLoadingInspection } = useInspectionState(bookingId);
  const { data: damageItems = [], isLoading: isLoadingDamage } = useDamageAssessments(bookingId);

  if (!booking) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={booking.guestName}
      description={`${booking.propertyName} · ${formatDate(booking.checkIn)} → ${formatDate(booking.checkOut)} · ${booking.nights} night${booking.nights === 1 ? '' : 's'}`}
      size="xl"
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {[
            ['Deposit status', deposit?.status ?? '—', 'bg-line-soft text-ink'],
            ['Held', deposit ? formatCurrency(Number(deposit.amount_captured ?? deposit.amount_authorized ?? 0), deposit.currency ?? booking.currency) : '—', 'bg-line-soft text-ink'],
            ['Deducted', deposit ? formatCurrency(Number(deposit.amount_deducted ?? 0), deposit.currency ?? booking.currency) : '—', 'bg-warn-soft text-warn'],
            ['Released', deposit ? formatCurrency(Number(deposit.amount_released ?? 0), deposit.currency ?? booking.currency) : '—', 'bg-ok-soft text-ok'],
          ].map(([label, value, tone]) => (
            <div key={label} className={`rounded-lg px-3.5 py-2.5 ${tone}`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] opacity-80">{label}</p>
              <p className="mt-1 font-display text-[15px] font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {isLoadingInspection ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <PhotoStage title="Check-in photos" stage={inspection?.checkin} />
            <PhotoStage title="Check-out photos" stage={inspection?.checkout} />
          </div>
        )}

        <Card>
          <CardHeader
            title="Damage assessment"
            subtitle="Only items marked “Deduct” count against the deposit when the report is generated."
            action={
              canManage && !isAddingDamage && (
                <Button size="xs" leftIcon={<Plus className="size-3" aria-hidden="true" />} onClick={() => setIsAddingDamage(true)}>
                  Add item
                </Button>
              )
            }
          />
          <div className="space-y-2.5 border-t border-line p-4">
            {isAddingDamage && (
              <AddDamageForm bookingId={bookingId} currency={booking.currency} onDone={() => setIsAddingDamage(false)} />
            )}

            {isLoadingDamage ? (
              <Skeleton className="h-16" />
            ) : damageItems.length ? (
              damageItems.map((damage) => <DamageRow key={damage.id} bookingId={bookingId} damage={damage} canManage={canManage} />)
            ) : (
              <EmptyState
                icon={<AlertTriangle className="size-5 text-brand-600" aria-hidden="true" />}
                title="No damage logged"
                description="The deposit will be released in full when the report is generated."
              />
            )}
          </div>
        </Card>

        <GenerateReportSection bookingId={bookingId} damageItems={damageItems.length ? damageItems : [{ currency: booking.currency }]} />

        {canOverride && <ManualDepositOverride bookingId={bookingId} currency={booking.currency} />}
      </div>
    </Modal>
  );
};
