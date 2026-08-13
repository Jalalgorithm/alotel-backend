import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/utils/format';
import { useAvailabilityMutations, usePropertyAvailability } from '../hooks/useProperties';

const emptyValues = () => ({ startDate: '', endDate: '', basePrice: '', isAvailable: true });

/**
 * Date-range pricing/availability — `BookingPricing` rows from
 * `GET/POST/PATCH/DELETE /properties/<id>/availability/`. Not a drag-to-block
 * calendar widget, just CRUD on date ranges; `blockedDates` renders read-only
 * since it's server-merged from actual bookings, not admin-editable here.
 */
export const AvailabilityPanel = ({ propertyId, currency, canManage }) => {
  const { data: rows = [], isLoading } = usePropertyAvailability(propertyId);
  const { createRange, isCreating, updateRange, deleteRange, pendingId } = useAvailabilityMutations(propertyId);

  const [editingRow, setEditingRow] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyValues());

  useEffect(() => {
    if (!isModalOpen) return;
    setForm(
      editingRow
        ? { startDate: editingRow.startDate, endDate: editingRow.endDate, basePrice: editingRow.basePrice, isAvailable: editingRow.isAvailable }
        : emptyValues(),
    );
  }, [isModalOpen, editingRow]);

  const openCreate = () => {
    setEditingRow(null);
    setIsModalOpen(true);
  };
  const openEdit = (row) => {
    if (!row.id) return; // the synthesized default row has nothing to edit — "Add" a real one instead.
    setEditingRow(row);
    setIsModalOpen(true);
  };

  const submit = () => {
    const payload = {
      startDate: form.startDate,
      endDate: form.endDate,
      basePrice: String(Number(form.basePrice) || 0),
      isAvailable: form.isAvailable,
    };
    if (editingRow) {
      updateRange(editingRow.id, payload);
    } else {
      createRange(payload);
    }
    setIsModalOpen(false);
  };

  const columns = [
    {
      key: 'range',
      header: 'Date range',
      render: (row) => (
        <span className="whitespace-nowrap">
          {formatDate(row.startDate)} – {formatDate(row.endDate)}
          {!row.id && <span className="ml-2 text-[10px] text-ink-muted">(default)</span>}
        </span>
      ),
    },
    {
      key: 'basePrice',
      header: 'Base price',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatCurrency(Number(row.basePrice), currency, { decimals: 2 })}</span>,
    },
    {
      key: 'isAvailable',
      header: 'Status',
      render: (row) => <Badge variant={row.isAvailable ? 'ok' : 'neutral'}>{row.isAvailable ? 'Available' : 'Blocked'}</Badge>,
    },
    {
      key: 'blockedDates',
      header: 'Blocked dates',
      render: (row) => (row.blockedDates?.length ? `${row.blockedDates.length} date(s)` : '—'),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) =>
              row.id && (
                <Button
                  size="xs"
                  variant="ghost"
                  aria-label="Delete date range"
                  isLoading={pendingId === row.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteRange(row.id);
                  }}
                >
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
        title="Availability"
        subtitle="Date-range pricing overrides and open/closed windows."
        action={
          canManage && (
            <Button size="sm" variant="primary" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={openCreate}>
              Add date range
            </Button>
          )
        }
      />

      <div className="border-t border-line">
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id ?? 'default'}
          isLoading={isLoading}
          onRowClick={canManage ? openEdit : undefined}
          emptyTitle="No availability configured"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRow ? 'Edit date range' : 'Add a date range'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isCreating || pendingId === editingRow?.id}
              disabled={!form.startDate || !form.endDate || !form.basePrice}
              onClick={submit}
            >
              {editingRow ? 'Save changes' : 'Add range'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start date" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
            <Input label="End date" type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
          </div>
          <Input
            label={`Base price (${currency})`}
            type="number"
            min="0"
            step="0.01"
            value={form.basePrice}
            onChange={(event) => setForm((current) => ({ ...current, basePrice: event.target.value }))}
          />
          <div className="flex items-center gap-2.5">
            <Toggle checked={form.isAvailable} onChange={(value) => setForm((current) => ({ ...current, isAvailable: value }))} label="Available" />
            <span className="text-[12.5px] text-ink">Available for booking</span>
          </div>
        </div>
      </Modal>
    </Card>
  );
};
