import { useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
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
  useInspectionState,
  useUploadInspectionPhoto,
} from '../hooks/useBookings';
import { useContractForBooking } from '../hooks/useContracts';
import { CONTRACT_REQUIRED_MIN_NIGHTS, CONTRACT_STATUS_LABEL } from '@/lib/contractSchema';
import { ROOM_AREAS } from '@/lib/checkoutSchema';
import { formatRelative } from '@/utils/format';
import { RoomPhotoGallery } from './RoomPhotoGallery';

const MIN_PHOTOS = 4;
const MAX_MB = 10;
const CHECKIN_STEPS = ['Photograph unit', 'Guest acknowledgement', 'Complete'];
const CHECKOUT_STEPS = ['Photograph unit', 'Complete'];
const today = () => new Date().toISOString().slice(0, 10);

/** Guess a room area from the file name, the same way the property-photo picker does. */
const normalise = (value) => value.toLowerCase().replace(/[^a-z]/g, '');
const guessRoomArea = (name = '') => {
  const flat = normalise(name);
  const match = ROOM_AREAS.find((room) => room.value !== 'other' && flat.includes(normalise(room.label)));
  return match?.value ?? 'other';
};

/**
 * Photo add-and-tag control for room inspection — mirrors the property-photo
 * picker (`PhotoPicker.jsx`): add any number of photos first, then tag each
 * with which room it's of. Nothing uploads until "Upload" is pressed, since
 * the inspection-photo endpoint can only create a new photo, not re-tag one
 * already sent.
 */
const InspectionPhotoStaging = ({ photos, onUpdate, onRemove, onAddFiles, onUploadAll }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = (fileList) => {
    const incoming = [...fileList];
    if (!incoming.length) return;

    const tooBig = incoming.filter((file) => file.size > MAX_MB * 1024 * 1024);
    const wrongType = incoming.filter((file) => !file.type.startsWith('image/'));
    if (tooBig.length || wrongType.length) {
      setError(
        [
          tooBig.length && `${tooBig.length} file(s) over ${MAX_MB}MB`,
          wrongType.length && `${wrongType.length} non-image file(s)`,
        ]
          .filter(Boolean)
          .join(' and ') + ' were skipped.',
      );
    } else {
      setError('');
    }

    onAddFiles(incoming.filter((file) => file.type.startsWith('image/') && file.size <= MAX_MB * 1024 * 1024));
  };

  const pendingCount = photos.filter((photo) => photo.status !== 'uploading').length;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-1.5 rounded-card border-2 border-dashed px-4 py-6 transition-colors',
          isDragging ? 'border-brand-600 bg-brand-50' : 'border-line bg-line-soft hover:border-brand-300',
        )}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-50">
          <ImagePlus className="size-4 text-brand-600" aria-hidden="true" />
        </span>
        <span className="text-[13px] font-semibold text-ink">Add photos, or take one now</span>
        <span className="text-[11.5px] text-ink-muted">Tag which room each one is of once it's added</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {error && <p className="text-[11.5px] text-warn">{error}</p>}

      {photos.length > 0 && (
        <ul className="space-y-2">
          {photos.map((photo) => (
            <li key={photo.id} className="flex items-start gap-3 rounded-lg border border-line bg-white p-2.5">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-line-soft">
                <img src={photo.previewUrl} alt="" className="size-full object-cover" />
              </div>

              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <Select
                  value={photo.roomArea}
                  onChange={(event) => onUpdate(photo.id, { roomArea: event.target.value })}
                  options={ROOM_AREAS}
                  aria-label={`Room for ${photo.file.name}`}
                  disabled={photo.status === 'uploading'}
                />
                <Input
                  value={photo.caption}
                  onChange={(event) => onUpdate(photo.id, { caption: event.target.value })}
                  placeholder="Caption (optional)"
                  aria-label={`Caption for ${photo.file.name}`}
                  disabled={photo.status === 'uploading'}
                />
                {photo.status === 'error' && (
                  <p className="text-[10.5px] text-danger sm:col-span-2">Upload failed — tap Upload to retry.</p>
                )}
              </div>

              <div className="flex size-6 shrink-0 items-center justify-center">
                {photo.status === 'uploading' ? (
                  <Loader2 className="size-4 animate-spin text-ink-muted" aria-hidden="true" />
                ) : (
                  <button
                    type="button"
                    onClick={() => onRemove(photo.id)}
                    aria-label={`Remove ${photo.file.name}`}
                    className="flex size-6 items-center justify-center rounded text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pendingCount > 0 && (
        <Button size="sm" variant="primary" onClick={onUploadAll} leftIcon={<Upload className="size-3.5" aria-hidden="true" />}>
          Upload {pendingCount} photo{pendingCount === 1 ? '' : 's'}
        </Button>
      )}
    </div>
  );
};

/** Arrival / departure processing. */
export const CheckInOutPage = () => {
  const [tab, setTab] = useState('checkin');
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState(0);
  const [stagedPhotos, setStagedPhotos] = useState([]);
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

  /** Guest's own acknowledgement of this stage — informational only, nothing for staff to act on. */
  const guestAcknowledged = inspection?.[stage]?.guestAcknowledged ?? false;
  const guestAcknowledgedAt = inspection?.[stage]?.guestAcknowledgedAt ?? null;

  /** Only relevant for check-in — checkout has no contract gate. */
  const nights = selected?.nights ?? 0;
  const contractRequired = stage === 'checkin' && nights >= CONTRACT_REQUIRED_MIN_NIGHTS;
  const { data: contract } = useContractForBooking(contractRequired ? selected?.id : undefined);
  const isSigned = contract?.status === 'signed';

  const photosByArea = inspection?.[stage]?.photosByArea ?? {};
  const uploadedAreaValues = Object.keys(photosByArea).filter((area) => (photosByArea[area] ?? []).length > 0);
  const capturedCount = uploadedAreaValues.length;
  const missingAreas = ROOM_AREAS.filter((room) => !uploadedAreaValues.includes(room.value));

  const clearStaged = () => {
    stagedPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setStagedPhotos([]);
  };

  const start = (entry) => {
    clearStaged();
    setSelected(entry);
    setStep(0);
    setIsComplete(false);
    setCompleteResult(null);
  };

  const addStagedFiles = (files) => {
    const accepted = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      previewUrl: URL.createObjectURL(file),
      roomArea: guessRoomArea(file.name),
      caption: '',
      status: 'idle',
    }));

    setStagedPhotos((current) => {
      const existing = new Set(current.map((photo) => photo.id));
      return [...current, ...accepted.filter((photo) => !existing.has(photo.id))];
    });
  };

  const removeStagedPhoto = (id) => {
    const photo = stagedPhotos.find((entry) => entry.id === id);
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    setStagedPhotos((current) => current.filter((entry) => entry.id !== id));
  };

  const updateStagedPhoto = (id, patch) =>
    setStagedPhotos((current) => current.map((photo) => (photo.id === id ? { ...photo, ...patch } : photo)));

  const uploadStagedPhoto = (photo) => {
    updateStagedPhoto(photo.id, { status: 'uploading' });
    uploadPhoto(
      { bookingId: selected.id, stage, roomArea: photo.roomArea, file: photo.file, caption: photo.caption },
      {
        onSuccess: () => {
          URL.revokeObjectURL(photo.previewUrl);
          setStagedPhotos((current) => current.filter((entry) => entry.id !== photo.id));
        },
        onError: () => updateStagedPhoto(photo.id, { status: 'error' }),
      },
    );
  };

  const uploadAllStaged = () => {
    stagedPhotos.filter((photo) => photo.status !== 'uploading').forEach(uploadStagedPhoto);
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
          clearStaged();
          setTab(next);
          setSelected(null);
        }}
        tabs={[
          { id: 'checkin', label: 'Arrivals', count: arrivals?.items?.length },
          { id: 'checkout', label: 'Departures', count: departures.items.length },
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
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-[15px] font-semibold text-ink">
                    {tab === 'checkin' ? 'Check in' : 'Check out'} — {selected.guestName}
                  </h2>
                  <p className="text-[11.5px] text-ink-muted">{selected.propertyName}</p>
                </div>
                {/* Read-only — the guest acknowledges their own check-in/out on their own, nothing for staff to action here. */}
                <Badge variant={guestAcknowledged ? 'ok' : 'neutral'}>
                  {guestAcknowledged ? `Guest acknowledged · ${formatRelative(guestAcknowledgedAt)}` : 'Awaiting guest acknowledgement'}
                </Badge>
              </div>

              <Stepper steps={STEPS} current={step} onStepClick={setStep} className="mt-4" />

              <div className="mt-5">
                {step === 0 && (
                  <>
                    <p className="mb-3 text-[12.5px] font-semibold text-ink">
                      Photograph each area — these are server-timestamped and form the condition record.
                    </p>

                    <div className="space-y-3">
                      <Card>
                        <CardHeader title="Photographed" subtitle={`${capturedCount} of ${ROOM_AREAS.length} areas covered`} />
                        <div className="border-t border-line p-3">
                          <RoomPhotoGallery
                            photos={inspection?.[stage]?.photos ?? []}
                            emptyLabel="Nothing photographed yet — add photos below."
                          />
                        </div>
                      </Card>

                      <Card>
                        <CardHeader title="Adding now" subtitle="Staged locally until you tap Upload" />
                        <div className="border-t border-line p-3">
                          <InspectionPhotoStaging
                            photos={stagedPhotos}
                            onUpdate={updateStagedPhoto}
                            onRemove={removeStagedPhoto}
                            onAddFiles={addStagedFiles}
                            onUploadAll={uploadAllStaged}
                          />
                        </div>
                      </Card>
                    </div>

                    <Alert variant={capturedCount >= MIN_PHOTOS ? 'success' : 'warn'} className="mt-4">
                      {capturedCount} of {ROOM_AREAS.length} areas photographed —{' '}
                      {capturedCount >= MIN_PHOTOS
                        ? 'ready to continue.'
                        : `at least ${MIN_PHOTOS} required before proceeding.`}
                      {capturedCount < MIN_PHOTOS && missingAreas.length > 0 && (
                        <> Still need: {missingAreas.map((room) => room.label).join(', ')}.</>
                      )}
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
    </div>
  );
};
