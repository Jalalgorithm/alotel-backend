import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { schedulePayoutSchema } from '@/utils/validators';
import { useProperties } from '@/features/properties/hooks/useProperties';
import { useFxRates, useSchedulePayout } from '../hooks/useFinance';

const emptyValues = () => ({ propertyId: '', amount: '', currency: '', periodStart: '', periodEnd: '' });

/** Schedule a payout to a property's host — `POST /payouts/`, Super Admin only. */
export const SchedulePayoutModal = ({ isOpen, onClose }) => {
  const { data: propertiesData } = useProperties({ pageSize: 100, status: 'published' }, { enabled: isOpen });
  const { data: fxRates } = useFxRates();
  const { schedulePayout, isPending } = useSchedulePayout();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schedulePayoutSchema), defaultValues: emptyValues() });

  useEffect(() => {
    if (isOpen) reset(emptyValues());
  }, [isOpen, reset]);

  const submit = (values) => schedulePayout(values, { onSuccess: onClose });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule a payout"
      description="Sets up a pending payout to a property's host for the given period."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" isLoading={isPending} onClick={handleSubmit(submit)}>Schedule payout</Button>
        </div>
      }
    >
      <form className="space-y-3.5" noValidate>
        <Select
          label="Property"
          placeholder="Select a property"
          options={(propertiesData?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
          error={errors.propertyId?.message}
          {...register('propertyId')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Amount" type="number" step="0.01" min="0" error={errors.amount?.message} {...register('amount')} />
          <Select
            label="Currency"
            placeholder="Select"
            options={(fxRates?.supportedCurrencies ?? ['GBP', 'EUR', 'USD', 'AED', 'NGN']).map((code) => ({ value: code, label: code }))}
            error={errors.currency?.message}
            {...register('currency')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Period start" type="date" error={errors.periodStart?.message} {...register('periodStart')} />
          <Input label="Period end" type="date" error={errors.periodEnd?.message} {...register('periodEnd')} />
        </div>
      </form>
    </Modal>
  );
};
