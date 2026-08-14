import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { workerSchema } from '@/utils/validators';
import { WORKER_RATE_BASIS } from '@/lib/maintenanceSchema';
import { useCreateWorker, useUpdateWorker } from '../hooks/useMaintenanceWorkers';

const emptyValues = () => ({
  name: '',
  phone: '',
  email: '',
  specialtyTags: [],
  employmentType: 'in_house',
  companyName: '',
  rateBasis: 'hourly',
  rateAmount: '',
});

/** Free-tag input — specialties are not a fixed enum server-side (`specialty_tags` is a plain list). */
const TagInput = ({ value = [], onChange, error }) => {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const tag = draft.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft('');
  };

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Specialties</p>
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px] text-ink-soft">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remove ${tag}`}>
              <X className="size-2.5 text-ink-muted hover:text-danger" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <Input
        placeholder="Type a specialty and press Enter — e.g. Plumbing"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          }
        }}
        containerClassName="mt-2"
        error={error}
      />
    </div>
  );
};

/** Create/edit form for one maintenance worker or vendor — `MaintenanceWorkerCreateSerializer`. */
export const WorkerFormModal = ({ isOpen, onClose, worker }) => {
  const isEditing = Boolean(worker);
  const { createWorker, isPending: isCreating } = useCreateWorker();
  const { updateWorker, isPending: isUpdating } = useUpdateWorker();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(workerSchema), defaultValues: emptyValues() });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      worker
        ? {
            name: worker.name,
            phone: worker.phone,
            email: worker.email,
            specialtyTags: worker.specialtyTags,
            employmentType: worker.employmentType,
            companyName: worker.companyName,
            rateBasis: worker.rateBasis,
            rateAmount: worker.rateAmount ?? '',
          }
        : emptyValues(),
    );
  }, [isOpen, worker, reset]);

  const employmentType = watch('employmentType');
  const specialtyTags = watch('specialtyTags') ?? [];

  const submit = (values) => {
    if (isEditing) updateWorker(worker.id, values, { onSuccess: onClose });
    else createWorker(values, { onSuccess: onClose });
  };

  const isSaving = isEditing ? isUpdating : isCreating;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit worker' : 'Add worker'}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" isLoading={isSaving} onClick={handleSubmit(submit)}>Save</Button>
        </div>
      }
    >
      <form className="space-y-3.5" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
        </div>
        <Input label="Email (optional)" type="email" error={errors.email?.message} {...register('email')} />

        <TagInput value={specialtyTags} onChange={(tags) => setValue('specialtyTags', tags)} error={errors.specialtyTags?.message} />

        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Employment type</p>
          <div className="flex gap-2">
            {[
              { value: 'in_house', label: 'In-house' },
              { value: 'external_vendor', label: 'External vendor' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setValue('employmentType', option.value)}
                className={
                  employmentType === option.value
                    ? 'flex-1 rounded-lg border border-brand-700 bg-brand-50 px-3 py-2 text-[12.5px] font-semibold text-brand-700'
                    : 'flex-1 rounded-lg border border-line bg-white px-3 py-2 text-[12.5px] text-ink-soft hover:border-brand-300'
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {employmentType === 'external_vendor' && <Input label="Company name" error={errors.companyName?.message} {...register('companyName')} />}

        <div className="grid grid-cols-2 gap-3">
          <Select label="Rate basis" options={WORKER_RATE_BASIS} error={errors.rateBasis?.message} {...register('rateBasis')} />
          <Input label="Rate amount (optional)" type="number" min="0" error={errors.rateAmount?.message} {...register('rateAmount')} />
        </div>
      </form>
    </Modal>
  );
};
