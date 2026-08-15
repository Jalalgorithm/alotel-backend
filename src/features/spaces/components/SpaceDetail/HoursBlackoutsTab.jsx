import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/utils/format';
import { WEEKDAYS } from '@/lib/spaceSchema';
import { useBlackoutDateMutations, useBlackoutDates, useOperatingHours, useOperatingHoursMutations } from '../../hooks/useSpaces';

const EMPTY_ROW = { dayOfWeek: '', openTime: '09:00', closeTime: '18:00' };

/**
 * Weekly operating hours + one-off blackout dates — both gate booking
 * availability. Hours are an add/delete list, not a fixed 7-row toggle grid:
 * the real API has one row per open weekday and no bulk-update endpoint — a
 * weekday with no row is implicitly closed.
 */
export const HoursBlackoutsTab = ({ spaceId, canManage }) => {
  const { data: hours = [], isLoading: isLoadingHours } = useOperatingHours(spaceId);
  const { addHours, isAdding, removeHours, pendingId: pendingHoursId } = useOperatingHoursMutations(spaceId);
  const { data: blackouts = [], isLoading: isLoadingBlackouts } = useBlackoutDates(spaceId);
  const { createBlackout, isCreating, deleteBlackout, pendingId: pendingBlackoutId } = useBlackoutDateMutations(spaceId);

  const [newRow, setNewRow] = useState(EMPTY_ROW);
  const [newBlackout, setNewBlackout] = useState({ date: '', reason: '' });

  const openDays = new Set(hours.map((row) => row.dayOfWeek));
  const availableDays = WEEKDAYS.filter((day) => !openDays.has(day.value));

  const addRow = () => {
    if (newRow.dayOfWeek === '') return;
    addHours({ ...newRow, dayOfWeek: Number(newRow.dayOfWeek) }, { onSuccess: () => setNewRow(EMPTY_ROW) });
  };

  const addBlackout = () => {
    if (!newBlackout.date) return;
    createBlackout(newBlackout, { onSuccess: () => setNewBlackout({ date: '', reason: '' }) });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Operating hours" subtitle="Guests can only book within these windows. A weekday with no hours listed is closed." />
        <div className="space-y-3 border-t border-line p-4">
          {canManage && availableDays.length > 0 && (
            <div className="flex flex-wrap items-end gap-2.5">
              <Select
                label="Day"
                placeholder="Select"
                options={availableDays}
                value={newRow.dayOfWeek}
                onChange={(e) => setNewRow((p) => ({ ...p, dayOfWeek: e.target.value }))}
                containerClassName="w-40"
              />
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Hours</p>
                <div className="flex items-center gap-2">
                  <input type="time" value={newRow.openTime} onChange={(e) => setNewRow((p) => ({ ...p, openTime: e.target.value }))} className="h-9 rounded-lg border border-line px-2 text-[13px]" />
                  <span className="text-ink-muted">–</span>
                  <input type="time" value={newRow.closeTime} onChange={(e) => setNewRow((p) => ({ ...p, closeTime: e.target.value }))} className="h-9 rounded-lg border border-line px-2 text-[13px]" />
                </div>
              </div>
              <Button size="sm" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} isLoading={isAdding} disabled={newRow.dayOfWeek === ''} onClick={addRow}>
                Add
              </Button>
            </div>
          )}

          {isLoadingHours ? (
            <p className="text-[12px] text-ink-muted">Loading…</p>
          ) : !hours.length ? (
            <EmptyState title="No hours set" description="This space has no listed hours yet — add at least one open day so it can be booked." />
          ) : (
            <div className="space-y-1.5">
              {hours.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-[12px] font-semibold text-ink">{WEEKDAYS.find((d) => d.value === row.dayOfWeek)?.label}</span>
                    <span className="text-[12.5px] text-ink-soft">{row.openTime} – {row.closeTime}</span>
                  </div>
                  {canManage && (
                    <Button size="xs" variant="ghost" aria-label="Remove hours" isLoading={pendingHoursId === row.id} onClick={() => removeHours(row.id)}>
                      <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Blackout dates" subtitle="One-off dates this space is unavailable, regardless of operating hours." />
        <div className="border-t border-line p-4">
          {canManage && (
            <div className="mb-3 flex flex-wrap items-end gap-2.5">
              <Input label="Date" type="date" value={newBlackout.date} onChange={(e) => setNewBlackout((p) => ({ ...p, date: e.target.value }))} containerClassName="w-auto" />
              <Input label="Reason (optional)" placeholder="e.g. Under maintenance" value={newBlackout.reason} onChange={(e) => setNewBlackout((p) => ({ ...p, reason: e.target.value }))} containerClassName="w-auto flex-1 min-w-40" />
              <Button size="sm" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} isLoading={isCreating} onClick={addBlackout}>
                Add
              </Button>
            </div>
          )}

          {isLoadingBlackouts ? (
            <p className="text-[12px] text-ink-muted">Loading…</p>
          ) : !blackouts.length ? (
            <EmptyState title="No blackout dates" description="Block off a date the space can't be booked — a renovation, a private event, anything one-off." />
          ) : (
            <div className="space-y-1.5">
              {blackouts.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-ink">{formatDate(row.date)}</p>
                    {row.reason && <p className="truncate text-[11px] text-ink-muted">{row.reason}</p>}
                  </div>
                  {canManage && (
                    <Button size="xs" variant="ghost" aria-label="Remove blackout date" isLoading={pendingBlackoutId === row.id} onClick={() => deleteBlackout(row.id)}>
                      <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
