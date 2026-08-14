import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/utils/format';
import { WEEKDAYS } from '@/lib/spaceSchema';
import { useBlackoutDateMutations, useBlackoutDates, useOperatingHours, useUpdateOperatingHours } from '../../hooks/useSpaces';

const rowsFromQuery = (hours) =>
  WEEKDAYS.map(({ value }) => hours?.find((row) => row.dayOfWeek === value) ?? { dayOfWeek: value, isOpen: false, openTime: '09:00', closeTime: '18:00' });

/** Weekly operating hours + one-off blackout dates — both gate `space_bookings` availability (spec §A.3.2). */
export const HoursBlackoutsTab = ({ spaceId, canManage }) => {
  const { data: hours, isLoading: isLoadingHours } = useOperatingHours(spaceId);
  const { saveHours, isPending: isSaving } = useUpdateOperatingHours(spaceId);
  const { data: blackouts = [], isLoading: isLoadingBlackouts } = useBlackoutDates(spaceId);
  const { createBlackout, isCreating, deleteBlackout, pendingId } = useBlackoutDateMutations(spaceId);

  const [rows, setRows] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [newBlackout, setNewBlackout] = useState({ date: '', reason: '' });

  useEffect(() => {
    if (hours) {
      setRows(rowsFromQuery(hours));
      setIsDirty(false);
    }
  }, [hours]);

  const setRow = (dayOfWeek, patch) => {
    setRows((current) => current.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row)));
    setIsDirty(true);
  };

  const addBlackout = () => {
    if (!newBlackout.date) return;
    createBlackout(newBlackout, { onSuccess: () => setNewBlackout({ date: '', reason: '' }) });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Operating hours"
          subtitle="Guests can only book within these windows."
          action={canManage && <Button size="sm" variant="primary" isLoading={isSaving} disabled={!isDirty} onClick={() => saveHours(rows)}>Save hours</Button>}
        />
        <div className="space-y-1.5 border-t border-line p-4">
          {isLoadingHours ? (
            <p className="text-[12px] text-ink-muted">Loading…</p>
          ) : (
            rows.map((row) => {
              const label = WEEKDAYS.find((d) => d.value === row.dayOfWeek)?.label;
              return (
                <div key={row.dayOfWeek} className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2">
                  <span className="w-24 shrink-0 text-[12px] font-semibold text-ink">{label}</span>
                  <Toggle checked={row.isOpen} onChange={(isOpen) => setRow(row.dayOfWeek, { isOpen })} disabled={!canManage} label={`${label} open`} />
                  {row.isOpen ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="time"
                        disabled={!canManage}
                        value={row.openTime}
                        onChange={(e) => setRow(row.dayOfWeek, { openTime: e.target.value })}
                        className="h-8 rounded-md border border-line px-2 text-[12px] disabled:bg-black/5"
                      />
                      <span className="text-ink-muted">–</span>
                      <input
                        type="time"
                        disabled={!canManage}
                        value={row.closeTime}
                        onChange={(e) => setRow(row.dayOfWeek, { closeTime: e.target.value })}
                        className="h-8 rounded-md border border-line px-2 text-[12px] disabled:bg-black/5"
                      />
                    </div>
                  ) : (
                    <span className="text-[11.5px] text-ink-muted">Closed</span>
                  )}
                </div>
              );
            })
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
                    <Button size="xs" variant="ghost" aria-label="Remove blackout date" isLoading={pendingId === row.id} onClick={() => deleteBlackout(row.id)}>
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
