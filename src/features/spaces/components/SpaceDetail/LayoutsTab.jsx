import { useEffect, useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useLayouts, useLayoutMutations } from '../../hooks/useSpaces';

const LayoutModal = ({ isOpen, onClose, layout, createLayout, updateLayout, isSaving }) => {
  const [form, setForm] = useState({ name: '', maxCapacity: '' });

  useEffect(() => {
    if (isOpen) setForm({ name: layout?.name ?? '', maxCapacity: layout?.maxCapacity ?? '' });
  }, [isOpen, layout]);

  const save = () => {
    if (layout) updateLayout(layout.id, form, { onSuccess: onClose });
    else createLayout(form, { onSuccess: onClose });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={layout ? 'Edit layout' : 'Add layout'}
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

/** Layouts sub-tab of the Space detail page — seating/room configurations, each with its own capacity. */
export const LayoutsTab = ({ spaceId, canManage }) => {
  const { data: layouts = [], isLoading } = useLayouts(spaceId);
  const { createLayout, isCreating, updateLayout, deleteLayout, pendingId } = useLayoutMutations(spaceId);
  const [editing, setEditing] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setIsModalOpen(true);
  };

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
              <div onClick={(e) => e.stopPropagation()}>
                <Button size="xs" variant="ghost" aria-label="Delete layout" isLoading={pendingId === row.id} onClick={() => deleteLayout(row.id)}>
                  <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
                </Button>
              </div>
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
        action={canManage && <Button size="sm" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={openCreate}>Add layout</Button>}
      />
      <div className="border-t border-line">
        <DataTable
          columns={columns}
          rows={layouts}
          isLoading={isLoading}
          onRowClick={canManage ? openEdit : undefined}
          emptyTitle="No layouts yet"
          emptyDescription="Add at least one layout so this space can be booked."
        />
      </div>

      <LayoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        layout={editing}
        createLayout={createLayout}
        updateLayout={updateLayout}
        isSaving={isCreating || (Boolean(editing) && pendingId === editing.id)}
      />
    </Card>
  );
};
