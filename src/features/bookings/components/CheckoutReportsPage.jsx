import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Camera, Plus, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/classNames';
import { useCheckoutReports, useSaveCheckoutReport } from '../hooks/useOperations';
import { bookingService } from '../services/bookingService';
import { damageSchema } from '@/utils/validators';
import { formatCurrency, formatDate } from '@/utils/format';
import { DAMAGE_SEVERITIES } from '@/lib/mock/operations';

const CONDITION_STYLES = {
  good: 'border-ok/30 bg-ok-soft text-ok',
  warn: 'border-warn/30 bg-warn-soft text-warn',
  danger: 'border-danger/30 bg-danger-soft text-danger',
};

const SEVERITY_VARIANT = { Minor: 'gold', Moderate: 'warn', Major: 'danger' };

/** A timestamped photo set from check-in or check-out. */
const PhotoSet = ({ title, photos }) => (
  <Card>
    <CardHeader title={title} subtitle={`${photos.length} areas · server-timestamped`} />
    <div className="grid grid-cols-2 gap-2.5 border-t border-line p-4 sm:grid-cols-4">
      {photos.map((photo) => (
        <div
          key={`${title}-${photo.room}`}
          className={cn(
            'flex aspect-4/3 flex-col items-center justify-center gap-1 rounded-lg border',
            CONDITION_STYLES[photo.condition],
          )}
        >
          {photo.condition !== 'good' && <AlertTriangle className="size-3.5" aria-hidden="true" />}
          <Camera className="size-4" aria-hidden="true" />
          <span className="px-1 text-center text-[10px] font-medium leading-tight">{photo.room}</span>
          <span className="text-[9px] tabular-nums opacity-80">{formatDate(photo.at, 'd MMM · HH:mm')}</span>
        </div>
      ))}
    </div>
  </Card>
);

/** Deposit reconciliation after a stay. */
export const CheckoutReportsPage = () => {
  const { data: reports, isLoading } = useCheckoutReports();
  const { saveReport, isPending } = useSaveCheckoutReport();

  const [damages, setDamages] = useState([]);
  const [isAdding, setIsAdding] = useState(false);

  const report = reports?.[0];

  useEffect(() => {
    if (report) setDamages(report.damages);
  }, [report]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(damageSchema),
    defaultValues: { room: 'Living Room', description: '', severity: 'Minor', cost: '' },
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Check-out Reports" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-5">
        <PageHeader title="Check-out Reports" />
        <Card>
          <EmptyState title="No reports awaiting review" description="Every completed stay has been reconciled." />
        </Card>
      </div>
    );
  }

  const deducted = damages.filter((damage) => damage.deduct).reduce((sum, damage) => sum + damage.cost, 0);
  const refund = Math.max(0, report.deposit - deducted);

  const persist = (nextDamages, message) => {
    setDamages(nextDamages);
    saveReport({ id: report.id, patch: { damages: nextDamages }, message });
  };

  const addDamage = (values) => {
    persist([...damages, { ...values, id: bookingService.createDamageId(), deduct: true }], 'Damage item added');
    reset();
    setIsAdding(false);
  };

  const decide = (status, message) => saveReport({ id: report.id, patch: { status, damages }, message });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Check-out Reports"
        subtitle="Compare condition photography, log damage and settle the deposit."
        actions={<StatusBadge status={report.status} />}
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-[15px] font-semibold text-ink">
              #{report.bookingId} — {report.guest}
            </p>
            <p className="text-[11.5px] text-ink-muted">
              {report.property} · {report.city} · {formatDate(report.checkIn)} → {formatDate(report.checkOut)}
            </p>
          </div>
          <Badge variant="warn">Decision window closes {formatDate(report.windowClosesAt, 'd MMM, HH:mm')}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PhotoSet title="Check-in photos" photos={report.checkInPhotos} />
        <PhotoSet title="Check-out photos" photos={report.checkOutPhotos} />
      </div>

      <Card>
        <CardHeader
          title="Damage assessment"
          subtitle="Only items marked for deduction are taken from the deposit."
          action={
            <Button size="xs" leftIcon={<Plus className="size-3" aria-hidden="true" />} onClick={() => setIsAdding(true)}>
              Add item
            </Button>
          }
        />

        {damages.length ? (
          <ul className="divide-y divide-line border-t border-line">
            {damages.map((damage) => (
              <li key={damage.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-ink">{damage.description}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[10.5px] text-ink-muted">
                    {damage.room}
                    <Badge variant={SEVERITY_VARIANT[damage.severity] ?? 'neutral'}>{damage.severity}</Badge>
                  </p>
                </div>

                <p className="shrink-0 text-[13px] font-bold tabular-nums text-warn">
                  {formatCurrency(damage.cost, report.currency)}
                </p>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-[10.5px] text-ink-muted">Deduct</span>
                  <Toggle
                    checked={damage.deduct}
                    label={`Deduct ${damage.description}`}
                    onChange={(value) =>
                      persist(
                        damages.map((entry) => (entry.id === damage.id ? { ...entry, deduct: value } : entry)),
                      )
                    }
                  />
                </div>

                <button
                  type="button"
                  aria-label={`Remove ${damage.description}`}
                  onClick={() => persist(damages.filter((entry) => entry.id !== damage.id), 'Damage item removed')}
                  className="shrink-0 rounded p-1 text-ink-muted transition-colors hover:text-danger"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No damage logged" description="The deposit will be released in full." />
        )}

        <div className="grid grid-cols-1 gap-3 border-t border-line p-4 sm:grid-cols-3">
          {[
            ['Deposit held', formatCurrency(report.deposit, report.currency), 'bg-line-soft text-ink'],
            ['Total deductions', formatCurrency(deducted, report.currency), 'bg-warn-soft text-warn'],
            ['Refund to guest', formatCurrency(refund, report.currency), 'bg-ok-soft text-ok'],
          ].map(([label, value, tone]) => (
            <div key={label} className={cn('rounded-lg px-3.5 py-2.5', tone)}>
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] opacity-80">{label}</p>
              <p className="mt-1 font-display text-[18px] font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-line p-4">
          <Button
            variant="dangerSoft"
            isLoading={isPending}
            onClick={() => decide('Resolved', 'Full deposit deducted')}
          >
            Deduct full deposit
          </Button>
          <Button isLoading={isPending} onClick={() => decide('Resolved', 'Partial deduction applied')}>
            Apply partial deduction
          </Button>
          <Button variant="primary" isLoading={isPending} onClick={() => decide('Resolved', 'Deposit released in full')}>
            Release full deposit
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title="Add damage item"
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit(addDamage)}>
              Add item
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit(addDamage)} className="space-y-3.5" noValidate>
          <Select
            label="Room / area"
            options={['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Entrance', 'Other']}
            error={errors.room?.message}
            {...register('room')}
          />
          <Input
            label="Description"
            placeholder="e.g. Cracked mirror"
            error={errors.description?.message}
            {...register('description')}
          />
          <Select label="Severity" options={DAMAGE_SEVERITIES} error={errors.severity?.message} {...register('severity')} />
          <Input
            label={`Estimated cost (${report.currency})`}
            type="number"
            placeholder="e.g. 15000"
            error={errors.cost?.message}
            {...register('cost')}
          />
        </form>
      </Modal>
    </div>
  );
};
