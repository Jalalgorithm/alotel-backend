import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SLOT_UNITS, SPACE_TYPES } from '@/lib/spaceSchema';
import { useUpdateSpace } from '../../hooks/useSpaces';

const toForm = (space) => ({
  title: space?.title ?? '',
  type: space?.type ?? SPACE_TYPES[0],
  description: space?.description ?? '',
  country: space?.country ?? '',
  state: space?.state ?? '',
  city: space?.city ?? '',
  address: space?.address ?? '',
  sizeSqm: space?.sizeSqm ?? '',
  baseRate: space?.baseRate ?? '',
  currency: space?.currency ?? 'NGN',
  slotUnit: space?.slotUnit ?? 'hourly',
  customSlotMinutes: space?.customSlotMinutes ?? '',
  minSlots: space?.minSlots ?? 1,
  maxSlots: space?.maxSlots ?? '',
  bookingMode: space?.bookingMode ?? 'instant',
  approvalExpiryHours: space?.approvalExpiryHours ?? 24,
  status: space?.status,
});

export const EditSpaceModal = ({ isOpen, onClose, space }) => {
  const { updateSpace, isPending } = useUpdateSpace();
  const [form, setForm] = useState(() => toForm(space));

  useEffect(() => {
    if (isOpen) setForm(toForm(space));
  }, [isOpen, space]);

  const update = (patch) => setForm((previous) => ({ ...previous, ...patch }));

  const save = () => updateSpace({ id: space.id, values: form }, { onSuccess: onClose });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit space"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" isLoading={isPending} onClick={save}>Save changes</Button>
        </div>
      }
    >
      <form className="space-y-3.5" noValidate>
        <Input label="Space name" value={form.title} onChange={(e) => update({ title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" options={SPACE_TYPES} value={form.type} onChange={(e) => update({ type: e.target.value })} />
          <Input label="Size (sqm)" type="number" min="0" value={form.sizeSqm} onChange={(e) => update({ sizeSqm: e.target.value })} />
        </div>
        <Textarea label="Description" rows={3} value={form.description} onChange={(e) => update({ description: e.target.value })} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Country" value={form.country} onChange={(e) => update({ country: e.target.value })} />
          <Input label="State / province" value={form.state} onChange={(e) => update({ state: e.target.value })} />
          <Input label="City" value={form.city} onChange={(e) => update({ city: e.target.value })} />
        </div>
        <Input label="Address" value={form.address} onChange={(e) => update({ address: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Base rate" type="number" min="0" value={form.baseRate} onChange={(e) => update({ baseRate: e.target.value })} />
          <Input label="Currency" value={form.currency} onChange={(e) => update({ currency: e.target.value.toUpperCase() })} maxLength={3} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Select label="Slot unit" options={SLOT_UNITS} value={form.slotUnit} onChange={(e) => update({ slotUnit: e.target.value })} />
          {form.slotUnit === 'custom' && (
            <Input label="Slot length (min)" type="number" min="1" value={form.customSlotMinutes} onChange={(e) => update({ customSlotMinutes: e.target.value })} />
          )}
          <Input label="Min slots" type="number" min="1" value={form.minSlots} onChange={(e) => update({ minSlots: e.target.value })} />
          <Input label="Max slots" type="number" min="1" placeholder="No limit" value={form.maxSlots} onChange={(e) => update({ maxSlots: e.target.value })} />
        </div>
      </form>
    </Modal>
  );
};
