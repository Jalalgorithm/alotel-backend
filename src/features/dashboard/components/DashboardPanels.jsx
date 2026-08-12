import { Link } from 'react-router-dom';
import { AlertTriangle, ListChecks } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarCell } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/classNames';
import { formatCurrency, formatDate } from '@/utils/format';
import { paths } from '@/routes/paths';

const ViewAll = ({ to }) => (
  <Link to={to} className="shrink-0 text-[11px] font-semibold text-brand-700 hover:underline">
    View all
  </Link>
);

/* -------------------------------------------------------------------------- */

/** Recent bookings table. */
export const RecentBookingsPanel = ({ bookings = [] }) => (
  <Card className="flex flex-col">
    <CardHeader title="Recent Bookings" action={<ViewAll to={paths.bookings} />} />

    <div className="table-scroll border-t border-line">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Guest</th>
            <th>Property</th>
            <th>Status</th>
            <th className="text-right">Amount</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td className="whitespace-nowrap font-mono text-[11px] font-semibold text-brand-700">
                #{booking.id}
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <Avatar name={booking.guest} initials={booking.initials} color={booking.color} size="xs" />
                  <span className="whitespace-nowrap text-[12px]">{booking.guest}</span>
                </div>
              </td>
              <td className="max-w-[11rem]">
                <p className="truncate text-[12px] font-medium text-ink">{booking.property}</p>
                <p className="whitespace-nowrap text-[10.5px] text-ink-muted">
                  {formatDate(booking.checkIn, 'MMM d')} – {formatDate(booking.checkOut, 'MMM d')}
                </p>
              </td>
              <td>
                <StatusBadge status={booking.status} />
              </td>
              <td className="text-right font-semibold tabular-nums">
                {formatCurrency(booking.amount, booking.currency, { compact: booking.amount > 99999 })}
              </td>
              <td className="text-right">
                <Button size="xs" variant="primary" to={paths.bookings}>
                  View Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Card>
);

/* -------------------------------------------------------------------------- */

/** Today's arrivals. */
export const CheckInsPanel = ({ checkIns = [] }) => (
  <Card className="flex flex-col">
    <CardHeader title="Check-ins Today" action={<ViewAll to={paths.checkInOut} />} />

    {checkIns.length ? (
      <ul className="divide-y divide-line border-t border-line">
        {checkIns.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
            <AvatarCell
              name={entry.guest}
              initials={entry.initials}
              color={entry.color}
              primary={entry.guest}
              secondary={entry.property}
              size="sm"
            />
            <span className="ml-auto shrink-0 text-[11px] font-semibold tabular-nums text-ink-soft">
              {entry.time}
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <EmptyState title="No arrivals today" />
    )}
  </Card>
);

/* -------------------------------------------------------------------------- */

/** Housekeeper role's dashboard: today's assigned tasks (`/admin/dashboard/`'s `tasks` list — no guest PII). */
export const HousekeeperTasksPanel = ({ tasks = [] }) => (
  <Card className="flex flex-col">
    <CardHeader title="Today's Tasks" action={<ViewAll to={paths.housekeeping} />} />

    {tasks.length ? (
      <ul className="divide-y divide-line border-t border-line">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-line-soft">
              <ListChecks className="size-3.5 text-ink-soft" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold capitalize text-ink">{task.taskType}</p>
              {task.notes && <p className="truncate text-[10.5px] text-ink-muted">{task.notes}</p>}
            </div>

            <StatusBadge status={task.status === 'pending' ? 'Pending' : task.status} dot={false} />
          </li>
        ))}
      </ul>
    ) : (
      <EmptyState title="Nothing due today" />
    )}
  </Card>
);

/* -------------------------------------------------------------------------- */

const ALERT_TONES = {
  danger: 'border-l-danger text-danger',
  warn: 'border-l-warn text-warn',
  info: 'border-l-brand-600 text-brand-600',
};

/** The alert strip above the KPI row. */
export const AlertStrip = ({ alerts = [] }) => {
  if (!alerts.length) return null;

  return (
    <div className="space-y-2">
      {alerts.slice(0, 3).map((alert) => (
        <div
          key={alert.id}
          className={cn(
            'flex flex-wrap items-center gap-2.5 rounded-lg border border-l-[3px] border-line bg-surface px-3.5 py-2.5',
            ALERT_TONES[alert.tone] ?? ALERT_TONES.info,
          )}
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />

          <p className="min-w-[12rem] flex-1 text-[12px]">
            <span className="font-semibold text-ink">{alert.title}</span>
            <span className="ml-2 text-ink-muted">{alert.description}</span>
          </p>

          <Button size="xs" variant="secondary" to={alert.to} className="shrink-0">
            {alert.action}
          </Button>
        </div>
      ))}
    </div>
  );
};
