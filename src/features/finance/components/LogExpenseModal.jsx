import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { logExpenseSchema } from '@/utils/validators';
import { useLogExpense } from '../hooks/useFinance';

const CATEGORY_OPTIONS = [
  { value: 'operation', label: 'Operation' },
  { value: 'staff', label: 'Staff' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'others', label: 'Others' },
];

const emptyValues = () => ({ category: '', amount: '', date: new Date().toISOString().slice(0, 10), note: '' });

/**
 * Log a manual cost-breakdown entry — `POST /operations/expenses/`. Only for
 * the categories with no automatic source; Maintenance spend is tracked via
 * ticket costs and isn't logged here.
 */
export const LogExpenseModal = ({ isOpen, onClose }) => {
  const { logExpense, isPending } = useLogExpense();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(logExpenseSchema), defaultValues: emptyValues() });

  useEffect(() => {
    if (isOpen) reset(emptyValues());
  }, [isOpen, reset]);

  const submit = (values) => logExpense(values, { onSuccess: onClose });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log an expense"
      description="Adds to the Cost Breakdown chart's Operation, Staff, Marketing or Others slice."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" isLoading={isPending} onClick={handleSubmit(submit)}>Log expense</Button>
        </div>
      }
    >
      <form className="space-y-3.5" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Category" placeholder="Select" options={CATEGORY_OPTIONS} error={errors.category?.message} {...register('category')} />
          <Input label="Amount" type="number" step="0.01" min="0" error={errors.amount?.message} {...register('amount')} />
        </div>
        <Input label="Date" type="date" error={errors.date?.message} {...register('date')} />
        <Textarea label="Note (optional)" rows={2} error={errors.note?.message} {...register('note')} />
      </form>
    </Modal>
  );
};
