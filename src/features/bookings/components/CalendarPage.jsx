import { useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/classNames';
import { useCalendar } from '../hooks/useBookings';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Occupancy calendar — one cell per night, stacked with that night's stays. */
export const CalendarPage = () => {
  const [cursor, setCursor] = useState(new Date('2026-08-01'));
  const monthKey = format(cursor, 'yyyy-MM');

  const { data: nightsByDate = {}, isFetching } = useCalendar(monthKey);

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) }),
    [cursor],
  );

  // date-fns getDay() is Sunday-first; the grid is Monday-first.
  const leadingBlanks = (getDay(startOfMonth(cursor)) + 6) % 7;

  const totalNights = Object.values(nightsByDate).reduce((sum, stays) => sum + stays.length, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendar"
        subtitle="Occupied nights across the portfolio."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setCursor((date) => subMonths(date, 1))} aria-label="Previous month">
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="min-w-[8.5rem] text-center text-[13px] font-semibold">{format(cursor, 'MMMM yyyy')}</span>
            <Button size="sm" onClick={() => setCursor((date) => addMonths(date, 1))} aria-label="Next month">
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        }
      />

      <Card className="p-4">
        <p className="mb-3 text-[12px] text-ink-muted">
          <span className="font-semibold text-ink">{totalNights}</span> occupied room-nights this month
        </p>

        <div className="table-scroll">
          <div className="min-w-[44rem]">
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((day) => (
                <div key={day} className="pb-1 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                  {day}
                </div>
              ))}

              {Array.from({ length: leadingBlanks }, (_, index) => (
                <div key={`blank-${index}`} />
              ))}

              {isFetching && !Object.keys(nightsByDate).length
                ? days.map((day) => <Skeleton key={day.toISOString()} className="h-24" />)
                : days.map((day) => {
                    const key = format(day, 'yyyy-MM-dd');
                    const stays = nightsByDate[key] ?? [];

                    return (
                      <div
                        key={key}
                        className={cn(
                          'flex min-h-24 flex-col rounded-lg border p-1.5',
                          stays.length ? 'border-brand-200 bg-brand-50/40' : 'border-line bg-white',
                        )}
                      >
                        <span className="text-[11px] font-semibold tabular-nums text-ink-soft">
                          {format(day, 'd')}
                        </span>

                        <div className="mt-1 space-y-1">
                          {stays.slice(0, 3).map((stay) => (
                            <div
                              key={`${key}-${stay.id}`}
                              title={`${stay.guest} · ${stay.property}`}
                              className="flex items-center gap-1 rounded px-1 py-0.5"
                              style={{ background: `${stay.color}1F` }}
                            >
                              <span
                                aria-hidden="true"
                                className="size-1.5 shrink-0 rounded-full"
                                style={{ background: stay.color }}
                              />
                              <span className="truncate text-[9.5px] font-medium text-ink">{stay.guest}</span>
                            </div>
                          ))}

                          {stays.length > 3 && (
                            <p className="px-1 text-[9px] text-ink-muted">+{stays.length - 3} more</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
