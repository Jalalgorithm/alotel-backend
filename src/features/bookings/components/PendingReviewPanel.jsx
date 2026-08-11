import { useState } from 'react';
import { Check, MessageSquareWarning } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Input';
import { AvatarCell } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { formatRelative } from '@/utils/format';
import { cn } from '@/utils/classNames';
import { useInspectionState, usePendingReviewInspections, useReviewInspection } from '../hooks/useBookings';

/** One guest-submitted photo or video, full size. */
const MediaTile = ({ photo }) => (
  <div className="overflow-hidden rounded-lg border border-line bg-line-soft">
    {photo.media_type === 'video' ? (
      <video src={photo.file} controls className="aspect-video w-full bg-black" />
    ) : (
      <img src={photo.file} alt={photo.caption || photo.room_area} className="aspect-video w-full object-cover" loading="lazy" />
    )}
    <div className="px-2.5 py-1.5">
      <p className="truncate text-[11px] font-semibold text-ink">{photo.room_area.replace('_', ' ')}</p>
      {photo.caption && <p className="truncate text-[10.5px] text-ink-muted">{photo.caption}</p>}
    </div>
  </div>
);

/**
 * Guest self-submitted check-in/check-out photos & video awaiting staff
 * sign-off. Selecting a queue row loads the actual submitted media (from the
 * same `/compare/` state the Arrivals/Departures tabs use) so staff can look
 * before approving — clearing this is what unblocks the booking's own
 * "Complete check-in/out" action.
 */
export const PendingReviewPanel = () => {
  const { data: pending = [], isLoading } = usePendingReviewInspections();
  const [selectedId, setSelectedId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [isNoting, setIsNoting] = useState(false);

  const selected = pending.find((row) => row.inspectionId === selectedId) ?? null;
  const { data: inspection, isLoading: isLoadingMedia } = useInspectionState(selected?.bookingId);
  const { reviewInspection, isPending, pendingId } = useReviewInspection();

  const select = (row) => {
    setSelectedId(row.inspectionId);
    setNoteDraft('');
    setIsNoting(false);
  };

  const submit = (disposition) => {
    reviewInspection(
      { inspectionId: selected.inspectionId, bookingId: selected.bookingId, disposition, note: noteDraft.trim() || undefined },
      { onSuccess: () => setSelectedId(null) },
    );
  };

  const photos = selected ? (inspection?.[selected.stage]?.photos ?? []) : [];
  const isSaving = isPending && pendingId === selected?.inspectionId;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader title="Awaiting review" subtitle="Guest-submitted arrival/departure media." />

        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : pending.length ? (
          <ul className="divide-y divide-line border-t border-line">
            {pending.map((row) => (
              <li key={row.inspectionId}>
                <button
                  type="button"
                  onClick={() => select(row)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors',
                    selectedId === row.inspectionId ? 'bg-brand-50' : 'hover:bg-line-soft',
                  )}
                >
                  <AvatarCell name={row.guestName} primary={row.guestName} secondary={row.propertyName} size="sm" />
                  <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
                    <Badge variant={row.stage === 'checkin' ? 'info' : 'warn'}>
                      {row.stage === 'checkin' ? 'Check-in' : 'Check-out'}
                    </Badge>
                    <span className="text-[10px] text-ink-muted">{formatRelative(row.submittedAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing pending" description="No guest submissions are waiting on a review right now." />
        )}
      </Card>

      <Card className="p-5">
        {!selected ? (
          <EmptyState
            title="Select a submission to begin"
            description="Pick a row from the queue to see the guest's photos or video before deciding."
          />
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[15px] font-semibold text-ink">
                  {selected.stage === 'checkin' ? 'Check-in' : 'Check-out'} review — {selected.guestName}
                </h2>
                <p className="text-[11.5px] text-ink-muted">{selected.propertyName}</p>
              </div>
              <span className="shrink-0 text-[10.5px] text-ink-muted">Submitted {formatRelative(selected.submittedAt)}</span>
            </div>

            {selected.notes && (
              <Alert variant="info" className="mt-3">
                {selected.notes}
              </Alert>
            )}

            <div className="mt-4">
              {isLoadingMedia ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="aspect-video" />
                  ))}
                </div>
              ) : photos.length ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {photos.map((photo) => (
                    <MediaTile key={photo.id} photo={photo} />
                  ))}
                </div>
              ) : (
                <Alert variant="warn">No media loaded for this submission yet.</Alert>
              )}
            </div>

            <div className="mt-5 space-y-3 border-t border-line pt-4">
              {isNoting && (
                <Textarea
                  label="Note (required)"
                  placeholder="e.g. Minor scuff on the living room wall, logged — not blocking."
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                />
              )}

              <div className="flex items-center justify-end gap-2">
                {isNoting ? (
                  <>
                    <Button variant="ghost" onClick={() => setIsNoting(false)} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button
                      variant="warn"
                      isLoading={isSaving}
                      disabled={!noteDraft.trim()}
                      leftIcon={<MessageSquareWarning className="size-3.5" aria-hidden="true" />}
                      onClick={() => submit('noted')}
                    >
                      Save note
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => setIsNoting(true)}>
                      Note an issue
                    </Button>
                    <Button
                      variant="primary"
                      isLoading={isSaving}
                      leftIcon={<Check className="size-3.5" aria-hidden="true" />}
                      onClick={() => submit('approved')}
                    >
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
