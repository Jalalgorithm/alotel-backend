import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/utils/format';
import { ADDON_CATEGORY_SUGGESTIONS, ADDON_PRICING_BASIS } from '@/lib/spaceSchema';
import { useAddonMutations, useAddons } from '../../hooks/useSpaces';

const EMPTY = { category: '', name: '', price: '', unitType: 'flat', minQty: 0, maxQty: '' };

const AddonModal = ({ isOpen, onClose, addon, createAddon, updateAddon, isSaving }) => {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (isOpen) setForm(addon ? { ...EMPTY, ...addon } : EMPTY);
  }, [isOpen, addon]);

  const update = (patch) => setForm((p) => ({ ...p, ...patch }));

  const save = () => {
    if (addon) updateAddon(addon.id, form, { onSuccess: onClose });
    else createAddon(form, { onSuccess: onClose });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={addon ? 'Edit add-on' : 'Add add-on'}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" isLoading={isSaving} onClick={save}>Save</Button>
        </div>
      }
    >
      <form className="space-y-3.5" noValidate>
        <Input label="Category" placeholder="e.g. Catering" list="addon-category-suggestions" value={form.category} onChange={(e) => update({ category: e.target.value })} />
        <datalist id="addon-category-suggestions">
          {ADDON_CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
        </datalist>
        <Input label="Name" placeholder="e.g. High Tea — Set 2" value={form.name} onChange={(e) => update({ name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Price" type="number" min="0" value={form.price} onChange={(e) => update({ price: e.target.value })} />
          <Select label="Pricing basis" options={ADDON_PRICING_BASIS} value={form.unitType} onChange={(e) => update({ unitType: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Min qty" type="number" min="0" value={form.minQty} onChange={(e) => update({ minQty: e.target.value })} />
          <Input label="Max qty" type="number" min="0" placeholder="No limit" value={form.maxQty} onChange={(e) => update({ maxQty: e.target.value })} />
        </div>
      </form>
    </Modal>
  );
};

/** Add-ons sub-tab — host-defined catalog, grouped by host-defined category (per spec §A.1's white-label principle). */
export const AddonsTab = ({ spaceId, canManage }) => {
  const { data: addons = [], isLoading } = useAddons(spaceId);
  const { createAddon, isCreating, updateAddon, deleteAddon, pendingId } = useAddonMutations(spaceId);
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

  const grouped = useMemo(() => {
    const groups = new Map();
    addons.forEach((addon) => {
      const key = addon.category || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(addon);
    });
    return [...groups.entries()];
  }, [addons]);

  const unitLabel = { flat: 'flat', per_person: '/ person', per_hour: '/ hour' };

  return (
    <Card>
      <CardHeader
        title="Add-ons"
        subtitle="Optional extras guests can attach at checkout — the catalog is entirely host-authored."
        action={canManage && <Button size="sm" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={openCreate}>Add add-on</Button>}
      />

      <div className="space-y-4 border-t border-line p-4">
        {isLoading ? (
          <p className="text-[12px] text-ink-muted">Loading…</p>
        ) : !addons.length ? (
          <EmptyState title="No add-ons yet" description="Build a catalog of extras — catering, equipment, staffing — guests can add at checkout." />
        ) : (
          grouped.map(([category, rows]) => (
            <div key={category}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">{category}</p>
              <div className="space-y-1.5">
                {rows.map((addon) => (
                  <div
                    key={addon.id}
                    onClick={() => canManage && openEdit(addon)}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2.5 transition-colors hover:border-brand-200"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-ink">{addon.name}</p>
                      <p className="text-[11px] text-ink-muted">
                        {formatCurrency(addon.price, 'NGN')} {unitLabel[addon.unitType]}
                        {addon.minQty ? ` · min ${addon.minQty}` : ''}
                        {addon.maxQty ? ` · max ${addon.maxQty}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="neutral">{ADDON_PRICING_BASIS.find((b) => b.value === addon.unitType)?.label}</Badge>
                      {canManage && (
                        <Button
                          size="xs"
                          variant="ghost"
                          aria-label="Delete add-on"
                          isLoading={pendingId === addon.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAddon(addon.id);
                          }}
                        >
                          <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <AddonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        addon={editing}
        createAddon={createAddon}
        updateAddon={updateAddon}
        isSaving={isCreating || (Boolean(editing) && pendingId === editing.id)}
      />
    </Card>
  );
};
