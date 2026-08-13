import { useEffect, useState } from 'react';
import { Flag, MessageSquare, Star } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/utils/classNames';
import { formatRelative } from '@/utils/format';
import { useProperties } from '../hooks/useProperties';
import { useFlagReview, usePropertyReviews, useRespondToReview } from '../hooks/useCatalogue';

const Stars = ({ value }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
    {Array.from({ length: 5 }, (_, index) => (
      <Star key={index} aria-hidden="true" className={cn('size-3', index < value ? 'fill-gold text-gold' : 'text-black/15')} />
    ))}
  </span>
);

/**
 * Per-property review moderation. The backend has no cross-property admin
 * feed — `GET /reviews/<listing_id>/` is public and per-listing — so this
 * screen starts with a property picker rather than one combined queue.
 *
 * Actions match what the API actually supports: post one official response
 * per review, or flag it (with a reason). There's no approve/reject/unflag —
 * flagging just hides the review from the public listing (and this screen,
 * since both read the same endpoint) on the next fetch.
 */
export const PropertyReviewPage = () => {
  const { data: properties } = useProperties({ pageSize: 100 });
  const [propertyId, setPropertyId] = useState('');

  useEffect(() => {
    if (!propertyId && properties?.items?.length) setPropertyId(properties.items[0].id);
  }, [propertyId, properties]);

  const { data: reviews = [], isLoading } = usePropertyReviews(propertyId);
  const { respond, isPending: isResponding, pendingId: respondingId } = useRespondToReview();
  const { flag, isPending: isFlagging, pendingId: flaggingId } = useFlagReview();

  const [respondingReview, setRespondingReview] = useState(null);
  const [responseBody, setResponseBody] = useState('');
  const [respondedIds, setRespondedIds] = useState(() => new Set());

  const [flaggingReview, setFlaggingReview] = useState(null);
  const [flagReason, setFlagReason] = useState('');

  const submitResponse = () => {
    respond(respondingReview.id, responseBody.trim(), propertyId, {
      onSuccess: () => {
        setRespondedIds((current) => new Set(current).add(respondingReview.id));
        setRespondingReview(null);
        setResponseBody('');
      },
    });
  };

  const submitFlag = () => {
    flag(flaggingReview.id, flagReason.trim(), propertyId, {
      onSuccess: () => {
        setFlaggingReview(null);
        setFlagReason('');
      },
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Property Review" subtitle="Respond to or flag guest reviews for a listing." />

      <Card>
        <CardHeader title="Property" subtitle="Reviews are read per listing — pick one to see its reviews." />
        <div className="border-t border-line p-4">
          <Select
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
            options={(properties?.items ?? []).map((property) => ({ value: property.id, label: property.name }))}
            placeholder="Select a property"
            containerClassName="max-w-sm"
          />
        </div>
      </Card>

      <Card>
        <div className="border-t border-line">
          {!propertyId ? (
            <EmptyState title="Select a property" description="Choose a listing above to see its reviews." />
          ) : isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-20" />
              ))}
            </div>
          ) : reviews.length ? (
            <ul className="divide-y divide-line">
              {reviews.map((review) => (
                <li key={review.id} className="flex flex-col gap-3 p-4 sm:flex-row">
                  <Avatar name={review.guest_email} size="md" />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <p className="text-[13px] font-semibold text-ink">{review.guest_email}</p>
                      <Stars value={review.rating_overall} />
                      {respondedIds.has(review.id) && <Badge variant="ok">Responded</Badge>}
                    </div>

                    <p className="mt-0.5 text-[11px] text-ink-muted">{formatRelative(review.created_at)}</p>
                    <p className="mt-2 text-[12.5px] leading-5 text-ink-soft">&ldquo;{review.body}&rdquo;</p>
                  </div>

                  <div className="flex shrink-0 gap-2 sm:flex-col">
                    <Button
                      size="xs"
                      variant="primary"
                      disabled={respondedIds.has(review.id)}
                      isLoading={isResponding && respondingId === review.id}
                      leftIcon={<MessageSquare className="size-3" aria-hidden="true" />}
                      onClick={() => setRespondingReview(review)}
                    >
                      Respond
                    </Button>
                    <Button
                      size="xs"
                      variant="dangerSoft"
                      isLoading={isFlagging && flaggingId === review.id}
                      leftIcon={<Flag className="size-3" aria-hidden="true" />}
                      onClick={() => setFlaggingReview(review)}
                    >
                      Flag
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No reviews" description="This listing has no unflagged reviews yet." />
          )}
        </div>
      </Card>

      <Modal
        isOpen={Boolean(respondingReview)}
        onClose={() => setRespondingReview(null)}
        title="Respond to review"
        description="One official response per review — the API rejects a second attempt."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRespondingReview(null)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={isResponding} disabled={!responseBody.trim()} onClick={submitResponse}>
              Post response
            </Button>
          </div>
        }
      >
        <Textarea label="Response" value={responseBody} onChange={(event) => setResponseBody(event.target.value)} rows={4} />
      </Modal>

      <Modal
        isOpen={Boolean(flaggingReview)}
        onClose={() => setFlaggingReview(null)}
        title="Flag this review"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFlaggingReview(null)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={isFlagging} disabled={!flagReason.trim()} onClick={submitFlag}>
              Flag review
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Alert variant="warn">Hides the review from the public listing immediately. There is no unflag action.</Alert>
          <Textarea label="Reason (required)" value={flagReason} onChange={(event) => setFlagReason(event.target.value)} />
        </div>
      </Modal>
    </div>
  );
};
