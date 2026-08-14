import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/utils/format';
import { WEEKDAYS } from '@/lib/spaceSchema';
import { useBlackoutDates, useOperatingHours, useSpaces } from '../hooks/useSpaces';
import { useSpaceBookings } from '../hooks/useSpaceBookings';
import { SpaceBookingDetailModal } from './SpaceBookingDetailModal';

const toISODate = (date) => date.toISOString().slice(0, 10);
const minutesOf = (hhmm) => {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  return h * 60 + m;
};
/** Bookings are stored as plain UTC-labelled timestamps in the fixtures (see `mock/spaces.js`) — read them back the same way, not through the browser's local timezone. */
const utcMinutesOf = (isoString) => {
  const date = new Date(isoString);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
};

const ACTIVE_STATUSES = new Set(['pending_host_approval', 'confirmed']);

/**
 * A simple horizontal day-timeline — hour rail for the selected space's
 * operating hours, booked windows shaded. No drag/resize, no external
 * calendar library: this is the one screen in Spaces with nothing to crib
 * from elsewhere in the app, built to the spec's own description (§A.5).
 */
export const SpaceBookingCalendarPage = () => {
  const { data: spacesData } = useSpaces({ pageSize: 100 });
  const spaces = spacesData?.items ?? [];

  const [spaceId, setSpaceId] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);

  const activeSpaceId = spaceId || spaces[0]?.id || '';
  const activeSpace = spaces.find((s) => s.id === activeSpaceId);

  const { data: hours = [] } = useOperatingHours(activeSpaceId);
  const { data: blackouts = [] } = useBlackoutDates(activeSpaceId);
  const { data: bookingsPage } = useSpaceBookings({ spaceId: activeSpaceId, pageSize: 200 });

  const dateStr = toISODate(date);
  const weekday = (date.getUTCDay() + 6) % 7; // JS: 0=Sunday → spec's 0=Monday
  const todayHours = hours.find((row) => row.dayOfWeek === weekday);
  const isBlackedOut = blackouts.some((row) => row.date === dateStr);

  const bookingsToday = useMemo(
    () =>
      (bookingsPage?.items ?? []).filter(
        (booking) => ACTIVE_STATUSES.has(booking.status) && booking.startDatetime?.slice(0, 10) === dateStr,
      ),
    [bookingsPage, dateStr],
  );

  const openMin = todayHours?.isOpen ? minutesOf(todayHours.openTime) : 8 * 60;
  const closeMin = todayHours?.isOpen ? minutesOf(todayHours.closeTime) : 20 * 60;
  const rangeMin = Math.max(closeMin - openMin, 60);
  const hourTicks = useMemo(() => {
    const ticks = [];
    for (let m = Math.ceil(openMin / 60) * 60; m <= closeMin; m += 60) ticks.push(m);
    return ticks;
  }, [openMin, closeMin]);

  const shiftDate = (days) => setDate((current) => new Date(current.getTime() + days * 86400000));

  return (
    <div className="space-y-5">
      <PageHeader title="Space Booking Calendar" subtitle="Day-timeline view of booked windows for one space at a time." />

      <Card>
        <CardHeader
          title="Filters"
          action={
            <div className="flex items-center gap-2">
              <Button size="xs" variant="ghost" aria-label="Previous day" onClick={() => shiftDate(-1)}>
                <ChevronLeft className="size-3.5" aria-hidden="true" />
              </Button>
              <span className="whitespace-nowrap text-[12.5px] font-semibold text-ink">{formatDate(date, 'EEEE, d MMM yyyy')}</span>
              <Button size="xs" variant="ghost" aria-label="Next day" onClick={() => shiftDate(1)}>
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          }
        />
        <div className="border-t border-line p-4">
          <Select
            label="Space"
            value={activeSpaceId}
            onChange={(e) => setSpaceId(e.target.value)}
            options={spaces.map((s) => ({ value: s.id, label: s.title }))}
            containerClassName="max-w-xs"
          />
        </div>
      </Card>

      {!activeSpace ? (
        <EmptyState title="No spaces yet" description="Add a space to see its booking calendar." />
      ) : isBlackedOut ? (
        <Alert variant="warn" title="Blacked out">
          This space is marked unavailable on {formatDate(date)} ({blackouts.find((b) => b.date === dateStr)?.reason || 'no reason given'}).
        </Alert>
      ) : !todayHours?.isOpen ? (
        <Alert variant="info" title="Closed">
          {activeSpace.title} is closed on {WEEKDAYS.find((w) => w.value === weekday)?.label}s.
        </Alert>
      ) : (
        <Card className="p-4">
          <div className="relative">
            {/* Hour rail */}
            <div className="relative mb-1 h-5">
              {hourTicks.map((m) => (
                <span
                  key={m}
                  className="absolute -translate-x-1/2 text-[10px] text-ink-muted"
                  style={{ left: `${((m - openMin) / rangeMin) * 100}%` }}
                >
                  {String(Math.floor(m / 60)).padStart(2, '0')}:00
                </span>
              ))}
            </div>

            {/* Track */}
            <div className="relative h-14 rounded-lg border border-line bg-line-soft/60">
              {hourTicks.map((m) => (
                <span key={m} className="absolute top-0 h-full w-px bg-line" style={{ left: `${((m - openMin) / rangeMin) * 100}%` }} />
              ))}

              {bookingsToday.map((booking) => {
                const startMin = Math.max(utcMinutesOf(booking.startDatetime), openMin);
                const endMin = Math.min(utcMinutesOf(booking.endDatetime), closeMin);
                if (endMin <= startMin) return null;
                const left = ((startMin - openMin) / rangeMin) * 100;
                const width = ((endMin - startMin) / rangeMin) * 100;

                return (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() => setSelectedBooking(booking)}
                    title={`${booking.guestName} · ${booking.layoutName}`}
                    className={
                      booking.status === 'pending_host_approval'
                        ? 'absolute top-1.5 h-11 rounded-md border border-warn bg-warn/20 px-2 text-left text-[10.5px] font-semibold text-ink transition-opacity hover:opacity-80'
                        : 'absolute top-1.5 h-11 rounded-md border border-brand-600 bg-brand-100 px-2 text-left text-[10.5px] font-semibold text-brand-800 transition-opacity hover:opacity-80'
                    }
                    style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }}
                  >
                    <span className="block truncate">{booking.guestName}</span>
                  </button>
                );
              })}
            </div>

            {!bookingsToday.length && <p className="mt-2 text-[11px] text-ink-muted">No bookings on this day.</p>}
          </div>
        </Card>
      )}

      <SpaceBookingDetailModal isOpen={Boolean(selectedBooking)} onClose={() => setSelectedBooking(null)} booking={selectedBooking} canManage />
    </div>
  );
};
