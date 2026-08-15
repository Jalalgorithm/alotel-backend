import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { maintenanceTicketSchema } from '@/utils/validators';
import { TICKET_PRIORITIES } from '@/lib/maintenanceSchema';
import { useProperties } from '@/features/properties/hooks/useProperties';
import { useMaintenanceWorkers } from '../hooks/useMaintenanceWorkers';
import { useCreateTicket } from '../hooks/useMaintenanceTickets';

const emptyValues = (propertyId = '', spaceId = '') => ({
  propertyId: spaceId ? '' : propertyId,
  spaceId,
  category: '',
  description: '',
  priority: 'medium',
  assignedWorkerId: '',
});

/**
 * Create a ticket — `MaintenanceTicketCreateSerializer`. `propertyId` pre-fills
 * and locks the property when opened from a Property detail page's Maintenance
 * tab; `spaceId` does the same for a Space's Maintenance tab (Super-Admin-only
 * server-side — the caller is responsible for only rendering that entry point
 * for Super Admins). Exactly one of the two is ever passed.
 */
export const TicketFormModal = ({ isOpen, onClose, propertyId, propertyName, spaceId, spaceName }) => {
  const { data: propertiesData } = useProperties({ pageSize: 100, status: 'published' }, { enabled: !spaceId });
  const { data: workersData } = useMaintenanceWorkers({ status: 'active', pageSize: 100 });
  const { createTicket, isPending } = useCreateTicket();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(maintenanceTicketSchema), defaultValues: emptyValues(propertyId, spaceId) });

  useEffect(() => {
    if (isOpen) reset(emptyValues(propertyId, spaceId));
  }, [isOpen, propertyId, spaceId, reset]);

  const submit = (values) => createTicket(values, { onSuccess: onClose });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New ticket"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" isLoading={isPending} onClick={handleSubmit(submit)}>Create ticket</Button>
        </div>
      }
    >
      <form className="space-y-3.5" noValidate>
        {spaceId ? (
          <Input label="Space" value={spaceName} readOnly />
        ) : propertyId ? (
          <Input label="Property" value={propertyName} readOnly />
        ) : (
          <Select
            label="Property"
            placeholder="Select a property"
            options={(propertiesData?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
            error={errors.propertyId?.message}
            {...register('propertyId')}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Category" placeholder="e.g. Plumbing" error={errors.category?.message} {...register('category')} />
          <Select label="Priority" options={TICKET_PRIORITIES} error={errors.priority?.message} {...register('priority')} />
        </div>

        <Textarea label="Description" rows={3} error={errors.description?.message} {...register('description')} />

        <Select
          label="Assign worker (optional)"
          placeholder="Unassigned for now"
          options={(workersData?.items ?? []).map((w) => ({ value: w.id, label: w.name }))}
          {...register('assignedWorkerId')}
        />
      </form>
    </Modal>
  );
};
