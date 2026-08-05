import { useState } from 'react';
import { Camera, Check, Send } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Alert } from '@/components/ui/Alert';
import { Stepper } from '@/components/ui/Stepper';
import { AvatarCell } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/classNames';
import { useCheckIns } from '../hooks/useBookings';
import { formatDate } from '@/utils/format';
import { toast } from '@/stores/uiStore';

const ROOMS = ['Living Room', 'Bedroom 1', 'Bedroom 2', 'Kitchen', 'Bathroom', 'Entrance'];
const MIN_PHOTOS = 4;
const STEPS = ['Photograph unit', 'Guest acknowledgement', 'Complete'];

/** Photo capture grid — tapping a room records a timestamped photo. */
const PhotoGrid = ({ captured, onToggle }) => (
  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
    {ROOMS.map((room) => {
      const isCaptured = captured.includes(room);

      return (
        <button
          key={room}
          type="button"
          onClick={() => onToggle(room)}
          className={cn(
            'relative flex aspect-4/3 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed transition-colors',
            isCaptured ? 'border-brand-600 bg-brand-50' : 'border-line bg-white hover:border-brand-200',
          )}
        >
          {isCaptured && <Check className="absolute right-2 top-2 size-3.5 text-brand-600" aria-hidden="true" />}
          <Camera className={cn('size-5', isCaptured ? 'text-brand-600' : 'text-ink-muted')} aria-hidden="true" />
          <span className={cn('text-[11px]', isCaptured ? 'font-semibold text-brand-700' : 'text-ink-muted')}>
            {room}
          </span>
          {isCaptured && (
            <span className="text-[9px] tabular-nums text-brand-600">{formatDate(new Date(), 'd MMM · HH:mm')}</span>
          )}
        </button>
      );
    })}
  </div>
);

/** Arrival / departure processing. */
export const CheckInOutPage = () => {
  const { data, isLoading } = useCheckIns();

  const [tab, setTab] = useState('checkin');
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState(0);
  const [captured, setCaptured] = useState([]);

  const toggle = (room) =>
    setCaptured((rooms) => (rooms.includes(room) ? rooms.filter((entry) => entry !== room) : [...rooms, room]));

  const start = (entry) => {
    setSelected(entry);
    setStep(0);
    setCaptured([]);
  };

  const finish = () => {
    toast.success('Check-in complete', `${selected.guest} · access code sent automatically.`);
    setSelected(null);
    setStep(0);
    setCaptured([]);
  };

  const list = tab === 'checkin' ? (data?.arrivals ?? []) : (data?.departures ?? []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Check-ins / Check-outs"
        subtitle="Process arrivals and departures with timestamped condition photography."
      />

      <Tabs
        value={tab}
        onChange={(next) => {
          setTab(next);
          setSelected(null);
        }}
        tabs={[
          { id: 'checkin', label: 'Arrivals', count: data?.arrivals?.length },
          { id: 'checkout', label: 'Departures', count: data?.departures?.length },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader title={tab === 'checkin' ? "Today's arrivals" : 'Current departures'} />

          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-12" />
              ))}
            </div>
          ) : list.length ? (
            <ul className="divide-y divide-line border-t border-line">
              {list.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => start(entry)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors',
                      selected?.id === entry.id ? 'bg-brand-50' : 'hover:bg-line-soft',
                    )}
                  >
                    <AvatarCell
                      name={entry.guest}
                      initials={entry.initials}
                      color={entry.color}
                      primary={entry.guest}
                      secondary={entry.property}
                      size="sm"
                    />
                    {entry.time && (
                      <span className="ml-auto shrink-0 text-[11px] font-semibold tabular-nums text-ink-soft">
                        {entry.time}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing scheduled" />
          )}
        </Card>

        <Card className="p-5">
          {!selected ? (
            <EmptyState
              title="Select a guest to begin"
              description="Pick an arrival from the list to start the check-in workflow."
            />
          ) : (
            <>
              <h2 className="font-display text-[15px] font-semibold text-ink">
                {tab === 'checkin' ? 'Check in' : 'Check out'} — {selected.guest}
              </h2>
              <p className="text-[11.5px] text-ink-muted">{selected.property}</p>

              <Stepper steps={STEPS} current={step} onStepClick={setStep} className="mt-4" />

              <div className="mt-5">
                {step === 0 && (
                  <>
                    <p className="mb-3 text-[12.5px] font-semibold text-ink">
                      Photograph each area — these are server-timestamped and form the condition record.
                    </p>
                    <PhotoGrid captured={captured} onToggle={toggle} />
                    <Alert variant={captured.length >= MIN_PHOTOS ? 'success' : 'warn'} className="mt-4">
                      {captured.length} of {ROOMS.length} areas photographed —{' '}
                      {captured.length >= MIN_PHOTOS
                        ? 'ready to continue.'
                        : `at least ${MIN_PHOTOS} required before proceeding.`}
                    </Alert>
                  </>
                )}

                {step === 1 && (
                  <>
                    <p className="mb-3 text-[12.5px] font-semibold text-ink">Guest condition acknowledgement</p>
                    <Alert variant="info">
                      A digital acknowledgement will be sent to <strong>{selected.guest}</strong> via Dropbox Sign
                      confirming the property condition at check-in. The guest must sign before access codes are
                      released.
                    </Alert>
                    <Button
                      variant="primary"
                      className="mt-4"
                      leftIcon={<Send className="size-3.5" aria-hidden="true" />}
                      onClick={() => toast.success('Acknowledgement sent', `Sent to ${selected.guest}.`)}
                    >
                      Send acknowledgement
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <div className="py-8 text-center">
                    <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-ok-soft">
                      <Check className="size-6 text-ok" aria-hidden="true" />
                    </span>
                    <p className="mt-3 font-display text-[16px] font-semibold text-ink">Check-in complete</p>
                    <p className="mt-1 text-[12px] text-ink-muted">
                      Instructions and the smart-lock code have been sent automatically.
                    </p>
                    <Badge variant="ok" className="mt-3">
                      Booking status → Active
                    </Badge>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
                <Button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                  Back
                </Button>
                {step < 2 ? (
                  <Button
                    variant="primary"
                    disabled={step === 0 && captured.length < MIN_PHOTOS}
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Next
                  </Button>
                ) : (
                  <Button variant="primary" onClick={finish}>
                    Done
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};
