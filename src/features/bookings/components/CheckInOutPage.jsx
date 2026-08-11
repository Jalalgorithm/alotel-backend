import { useEffect, useState } from 'react';
import { Camera, Check, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Alert } from '@/components/ui/Alert';
import { Stepper } from '@/components/ui/Stepper';
import { AvatarCell } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/classNames';
import {
  useBookings,
  useCompleteCheckIn,
  useCompleteCheckOut,
  useContractForBooking,
  useInspectionState,
  usePendingReviewInspections,
  useUploadInspectionPhoto,
} from '../hooks/useBookings';
import { CONTRACT_REQUIRED_MIN_NIGHTS, CONTRACT_STATUS_LABEL } from '@/lib/contractSchema';
import { PendingReviewPanel } from './PendingReviewPanel';

const ROOMS = [
  { value: 'living_room', label: 'Living Room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'entrance', label: 'Entrance' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'other', label: 'Other' },
];
const MIN_PHOTOS = 4;
const CHECKIN_STEPS = ['Photograph unit', 'Guest acknowledgement', 'Complete'];
const CHECKOUT_STEPS = ['Photograph unit', 'Complete'];
const today = () => new Date().toISOString().slice(0, 10);

/** Photo capture grid — tapping a room opens the camera/file picker and uploads immediately. */
const PhotoGrid = ({ status, onCapture }) => (
  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
    {ROOMS.map((room) => {
      const state = status[room.value] ?? 'idle';
      const isDone = state === 'done';
      const isUploading = state === 'uploading';
      const isError = state === 'error';

      return (
        <label
          key={room.value}
          className={cn(
            'relative flex aspect-4/3 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed transition-colors',
            isDone && 'border-brand-600 bg-brand-50',
            isError && 'border-danger bg-danger-soft',
            !isDone && !isError && 'border-line bg-white hover:border-brand-200',
          )}
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={isUploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) onCapture(room.value, file);
            }}
          />
          {isDone && <Check className="absolute right-2 top-2 size-3.5 text-brand-600" aria-hidden="true" />}
          {isUploading ? (
            <Loader2 className="size-5 animate-spin text-ink-muted" aria-hidden="true" />
          ) : (
            <Camera
              className={cn('size-5', isDone ? 'text-brand-600' : isError ? 'text-danger' : 'text-ink-muted')}
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              'text-[11px]',
              isDone ? 'font-semibold text-brand-700' : isError ? 'font-semibold text-danger' : 'text-ink-muted',
            )}
          >
            {room.label}
          </span>
          {isError && <span className="text-[9px] text-danger">Failed — tap to retry</span>}
        </label>
      );
    })}
  </div>
);

/** Arrival / departure processing. */
export const CheckInOutPage = () => {
  const [tab, setTab] = useState('checkin');
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState(0);
  const [photoStatus, setPhotoStatus] = useState({});
  const [isComplete, setIsComplete] = useState(false);
  const [completeResult, setCompleteResult] = useState(null);

  const stage = tab === 'checkin' ? 'checkin' : 'checkout';
  const STEPS = stage === 'checkin' ? CHECKIN_STEPS : CHECKOUT_STEPS;

  const { data: arrivals, isLoading: isLoadingArrivals } = useBookings({
    status: 'confirmed',
    checkInFrom: today(),
    checkInTo: today(),
    pageSize: 50,
  });
  const { data: activeBookings, isLoading: isLoadingActive } = useBookings({ status: 'active', pageSize: 100 });
  const departures = { items: (activeBookings?.items ?? []).filter((row) => row.checkOut === today()) };

  const isLoading = tab === 'checkin' ? isLoadingArrivals : isLoadingActive;
  const list = tab === 'checkin' ? (arrivals?.items ?? []) : departures.items;

  const { data: inspection } = useInspectionState(selected?.id);
  const { uploadPhoto } = useUploadInspectionPhoto();
  const { completeCheckIn, isPending: isCompletingCheckIn } = useCompleteCheckIn();
  const { completeCheckOut, isPending: isCompletingCheckOut } = useCompleteCheckOut();
  const { data: pendingReviews } = usePendingReviewInspections();

  /** A guest self-submitted photo/video for this stage that staff hasn't cleared yet — blocks completion server-side. */
  const reviewStatus = inspection?.[stage]?.reviewStatus ?? 'not_required';
  const isPendingReview = reviewStatus === 'pending_review';

  /** Only relevant for check-in — checkout has no contract gate. */
  const nights = selected?.nights ?? 0;
  const contractRequired = stage === 'checkin' && nights >= CONTRACT_REQUIRED_MIN_NIGHTS;
  const { data: contract } = useContractForBooking(contractRequired ? selected?.id : undefined);
  const isSigned = contract?.status === 'signed';

  /** Re-prime local upload state from what the server already has on open. */
  useEffect(() => {
    if (!selected || !inspection) return;
    const byArea = inspection[stage]?.photosByArea ?? {};
    setPhotoStatus((current) => {
      const next = { ...current };
      Object.keys(byArea).forEach((area) => {
        if ((byArea[area] ?? []).length > 0 && !next[area]) next[area] = 'done';
      });
      return next;
    });
  }, [selected, inspection, stage]);

  const capturedCount = Object.values(photoStatus).filter((state) => state === 'done').length;

  const start = (entry) => {
    setSelected(entry);
    setStep(0);
    setPhotoStatus({});
    setIsComplete(false);
    setCompleteResult(null);
  };

  const capture = (roomArea, file) => {
    setPhotoStatus((current) => ({ ...current, [roomArea]: 'uploading' }));
    uploadPhoto(
      { bookingId: selected.id, stage, roomArea, file },
      {
        onSuccess: () => setPhotoStatus((current) => ({ ...current, [roomArea]: 'done' })),
        onError: () => setPhotoStatus((current) => ({ ...current, [roomArea]: 'error' })),
      },
    );
  };

  const complete = () => {
    const onSuccess = (result) => {
      setIsComplete(true);
      setCompleteResult(result);
    };

    if (stage === 'checkin') {
      completeCheckIn({ bookingId: selected.id, contractId: contract?.contractId }, { onSuccess });
    } else {
      completeCheckOut({ bookingId: selected.id }, { onSuccess });
    }
  };

  const isLastStep = step === STEPS.length - 1;
  const isAckStep = stage === 'checkin' && step === 1;
  const nextDisabled =
    (step === 0 && capturedCount < MIN_PHOTOS) || (isAckStep && contractRequired && !isSigned);
  const isCompleting = stage === 'checkin' ? isCompletingCheckIn : isCompletingCheckOut;

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
          { id: 'checkin', label: 'Arrivals', count: arrivals?.items?.length },
          { id: 'checkout', label: 'Departures', count: departures.items.length },
          { id: 'review', label: 'Pending Review', count: pendingReviews?.length },
        ]}
      />

      {tab === 'review' ? (
        <PendingReviewPanel />
      ) : (
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
                    <AvatarCell name={entry.guestName} primary={entry.guestName} secondary={entry.propertyName} size="sm" />
                    <span className="ml-auto shrink-0 text-[11px] font-semibold tabular-nums text-ink-soft">
                      {entry.nights}n
                    </span>
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
                {tab === 'checkin' ? 'Check in' : 'Check out'} — {selected.guestName}
              </h2>
              <p className="text-[11.5px] text-ink-muted">{selected.propertyName}</p>

              <Stepper steps={STEPS} current={step} onStepClick={setStep} className="mt-4" />

              <div className="mt-5">
                {step === 0 && (
                  <>
                    <p className="mb-3 text-[12.5px] font-semibold text-ink">
                      Photograph each area — these are server-timestamped and form the condition record.
                    </p>
                    <PhotoGrid status={photoStatus} onCapture={capture} />
                    <Alert variant={capturedCount >= MIN_PHOTOS ? 'success' : 'warn'} className="mt-4">
                      {capturedCount} of {ROOMS.length} areas photographed —{' '}
                      {capturedCount >= MIN_PHOTOS
                        ? 'ready to continue.'
                        : `at least ${MIN_PHOTOS} required before proceeding.`}
                    </Alert>
                  </>
                )}

                {isAckStep && (
                  <>
                    <p className="mb-3 text-[12.5px] font-semibold text-ink">Guest condition acknowledgement</p>
                    {contractRequired ? (
                      <>
                        <div className="mb-3 flex items-center gap-2">
                          <span className="text-[11.5px] text-ink-soft">Contract status:</span>
                          <StatusBadge status={contract ? CONTRACT_STATUS_LABEL[contract.status] ?? contract.status : 'Not sent'} />
                        </div>
                        <Alert variant={isSigned ? 'success' : 'warn'}>
                          {isSigned ? (
                            <>The guest has signed their tenancy contract. Check-in can proceed.</>
                          ) : (
                            <>
                              This stay is {nights} nights (≥ {CONTRACT_REQUIRED_MIN_NIGHTS}) and requires a signed
                              contract before check-in. Send or check its status from the Contracts screen, then
                              come back here.
                            </>
                          )}
                        </Alert>
                      </>
                    ) : (
                      <Alert variant="info">
                        This stay doesn&apos;t require a signed contract — the guest accepted the booking agreement
                        at checkout, so check-in can proceed once the unit is photographed.
                      </Alert>
                    )}
                  </>
                )}

                {isLastStep && (
                  <div className="py-8 text-center">
                    {isComplete ? (
                      <>
                        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-ok-soft">
                          <Check className="size-6 text-ok" aria-hidden="true" />
                        </span>
                        <p className="mt-3 font-display text-[16px] font-semibold text-ink">
                          {stage === 'checkin' ? 'Check-in complete' : 'Check-out complete'}
                        </p>
                        <p className="mt-1 text-[12px] text-ink-muted">{completeResult?.detail}</p>
                        <Badge variant="ok" className="mt-3">
                          Booking status → {completeResult?.status ?? (stage === 'checkin' ? 'Active' : 'Completed')}
                        </Badge>
                      </>
                    ) : isPendingReview ? (
                      <div className="mx-auto max-w-sm text-left">
                        <Alert variant="warn" title="Guest submission awaiting review">
                          The guest submitted their own {stage === 'checkin' ? 'check-in' : 'check-out'} photos or
                          video for this booking, and it hasn&apos;t been reviewed yet — the server won&apos;t allow
                          completion until it is. Open the <strong>Pending Review</strong> tab to approve or note it,
                          then come back here.
                        </Alert>
                        <Button
                          variant="secondary"
                          className="mt-3"
                          onClick={() => {
                            setTab('review');
                            setSelected(null);
                          }}
                        >
                          Go to Pending Review
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-[13px] font-semibold text-ink">
                          Ready to complete {stage === 'checkin' ? 'check-in' : 'check-out'} for {selected.guestName}
                        </p>
                        <p className="mt-1 text-[11.5px] text-ink-muted">
                          This updates the booking status and notifies the guest.
                        </p>
                        <Button variant="primary" className="mt-4" isLoading={isCompleting} onClick={complete}>
                          Complete {stage === 'checkin' ? 'check-in' : 'check-out'}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {!isComplete && (
                <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
                  <Button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                    Back
                  </Button>
                  {!isLastStep && (
                    <Button variant="primary" disabled={nextDisabled} onClick={() => setStep((s) => s + 1)}>
                      Next
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      </div>
      )}
    </div>
  );
};
