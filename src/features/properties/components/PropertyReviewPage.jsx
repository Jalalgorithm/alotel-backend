import { useState } from 'react';
import { Star } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/classNames';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useModerateReview, usePropertyReviews } from '../hooks/useCatalogue';
import { formatRelative } from '@/utils/format';

const Stars = ({ value }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
    {Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        aria-hidden="true"
        className={cn('size-3', index < value ? 'fill-gold text-gold' : 'text-black/15')}
      />
    ))}
  </span>
);

/** Guest review moderation queue. */
export const PropertyReviewPage = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Pending');

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching } = usePropertyReviews({ query: debouncedSearch, status, pageSize: 50 });
  const { moderate, pendingId } = useModerateReview();

  const reviews = data?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Property Review"
        subtitle="Guest reviews awaiting moderation before they appear on the public listing."
      />

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by guest, property or text…"
            total={data?.total}
            noun="review"
            filters={[
              {
                id: 'status',
                value: status,
                onChange: setStatus,
                options: ['All', 'Pending', 'Approved', 'Rejected'],
                label: 'Status',
              },
            ]}
          />
        </div>

        <div className="border-t border-line">
          {isFetching && !data ? (
            <TableSkeleton rows={4} columns={3} />
          ) : reviews.length ? (
            <ul className="divide-y divide-line">
              {reviews.map((review) => (
                <li key={review.id} className="flex flex-col gap-3 p-4 sm:flex-row">
                  <Avatar name={review.guest} initials={review.initials} color={review.color} size="md" />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <p className="text-[13px] font-semibold text-ink">{review.guest}</p>
                      <Stars value={review.rating} />
                      <StatusBadge status={review.status} />
                    </div>

                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      {review.property} · {formatRelative(review.submittedAt)}
                    </p>

                    <p className="mt-2 text-[12.5px] leading-5 text-ink-soft">“{review.comment}”</p>
                  </div>

                  {review.status === 'Pending' && (
                    <div className="flex shrink-0 gap-2 sm:flex-col">
                      <Button
                        size="xs"
                        variant="primary"
                        isLoading={pendingId === `${review.id}:Approved`}
                        onClick={() => moderate({ id: review.id, status: 'Approved' })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="xs"
                        variant="dangerSoft"
                        isLoading={pendingId === `${review.id}:Rejected`}
                        onClick={() => moderate({ id: review.id, status: 'Rejected' })}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Nothing to moderate"
              description="Every review in this filter has been actioned."
            />
          )}
        </div>
      </Card>
    </div>
  );
};
