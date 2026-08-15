import { Bell, Check } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/classNames';
import { formatRelative } from '@/utils/format';
import { useMarkAllRead, useMarkNotificationRead, useMyNotifications } from '../hooks/useNotifications';

const CHANNEL_LABEL = { email: 'Email', sms: 'SMS', in_app: 'In-App' };

/** Full notification history — the Topbar bell is a preview of the same feed. */
export const NotificationsPage = () => {
  const { data: notifications = [], isLoading } = useMyNotifications();
  const { markRead, isPending } = useMarkNotificationRead();
  const { markAllRead, isPending: isMarkingAllRead } = useMarkAllRead();

  const unread = notifications.filter((entry) => !entry.isRead);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        subtitle="Everything sent to you — booking alerts, KYC reminders and system notices."
        meta={
          unread.length > 0 && (
            <Badge variant="warn" dot>
              {unread.length} unread
            </Badge>
          )
        }
        actions={
          unread.length > 0 && (
            <Button size="sm" variant="secondary" isLoading={isMarkingAllRead} leftIcon={<Check className="size-3.5" aria-hidden="true" />} onClick={() => markAllRead()}>
              Mark all read
            </Button>
          )
        }
      />

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : !notifications.length ? (
          <EmptyState
            icon={<Bell className="size-5 text-brand-600" aria-hidden="true" />}
            title="No notifications yet"
            description="Booking, KYC and system alerts will show up here."
          />
        ) : (
          <ul className="divide-y divide-line">
            {notifications.map((entry) => (
              <li key={entry.id} className={cn('flex items-start gap-3 px-4 py-3.5', !entry.isRead && 'bg-brand-50/40')}>
                <span
                  aria-hidden="true"
                  className={cn('mt-1.5 size-2 shrink-0 rounded-full', entry.isRead ? 'bg-line' : 'bg-brand-600')}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-ink">{entry.title}</p>
                    <Badge variant="neutral">{CHANNEL_LABEL[entry.channel] ?? entry.channel}</Badge>
                  </div>
                  <p className="mt-0.5 text-[12px] text-ink-soft">{entry.body}</p>
                  <p className="mt-1 text-[10.5px] text-ink-muted">{formatRelative(entry.createdAt)}</p>
                </div>
                {!entry.isRead && (
                  <Button
                    size="xs"
                    variant="ghost"
                    isLoading={isPending}
                    onClick={() => markRead(entry.id)}
                    leftIcon={<Check className="size-3.5" aria-hidden="true" />}
                  >
                    Mark read
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
