import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useLayoutMutations, useLayouts } from '../../hooks/useSpaces';

const AddLayoutModal = ({ isOpen, onClose, createLayout, isSaving }) => {
  const [form, setForm] = useState({ name: '', maxCapacity: '' });

  const save = () => createLayout(form, { onSuccess: () => { setForm({ name: '', maxCapacity: '' }); onClose(); } });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add layout"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" isLoading={isSaving} onClick={save}>Save</Button>
        </div>
      }
    >
      <form className="space-y-3.5" noValidate>
        <Input label="Layout name" placeholder="e.g. Theatre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        <Input label="Max capacity" type="number" min="1" value={form.maxCapacity} onChange={(e) => setForm((p) => ({ ...p, maxCapacity: e.target.value }))} />
      </form>
    </Modal>
  );
};

/**
 * Layouts sub-tab — seating/room configurations, each with its own capacity.
 * Add + delete only: the real API has no update endpoint for a layout, and
 * `SpaceBooking.layout` is a protected FK, so deleting one still in use by a
 * booking fails with a clear error rather than a raw crash.
 */
export const LayoutsTab = ({ spaceId, canManage }) => {
  const { data: layouts = [], isLoading } = useLayouts(spaceId);
  const { createLayout, isCreating, deleteLayout, pendingId } = useLayoutMutations(spaceId);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const columns = [
    {
      key: 'name',
      header: 'Layout',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <Users className="size-3.5 text-brand-600" aria-hidden="true" /> {row.name}
        </span>
      ),
    },
    { key: 'maxCapacity', header: 'Max capacity', align: 'right', render: (row) => row.maxCapacity },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) => (
              <Button size="xs" variant="ghost" aria-label="Delete layout" isLoading={pendingId === row.id} onClick={() => deleteLayout(row.id)}>
                <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader
        title="Layouts"
        subtitle="Each layout is a seating/room configuration guests choose at booking, with its own capacity."
        action={canManage && <Button size="sm" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={() => setIsModalOpen(true)}>Add layout</Button>}
      />
      <div className="border-t border-line">
        <DataTable
          columns={columns}
          rows={layouts}
          isLoading={isLoading}
          emptyTitle="No layouts yet"
          emptyDescription="Add at least one layout so this space can be booked."
        />
      </div>

      <AddLayoutModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} createLayout={createLayout} isSaving={isCreating} />
    </Card>
  );
};
