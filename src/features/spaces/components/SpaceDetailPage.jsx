import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Copy, ImageOff, MapPin, Pencil, Trash2, Users, Warehouse } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { getErrorMessage } from '@/utils/errors';
import { formatCurrency } from '@/utils/format';
import { toast } from '@/stores/uiStore';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { SpaceMaintenanceTab } from '@/features/maintenance';
import { paths } from '@/routes/paths';
import { currencyForSpace, locationLabel, slotUnitSuffix, SPACE_STATUSES, STATUS_BADGE_VARIANT } from '@/lib/spaceSchema';
import { useSetSpaceStatus, useSpace, useSpaceImageMutations, useSpaceImages } from '../hooks/useSpaces';
import { EditSpaceModal } from './SpaceDetail/EditSpaceModal';
import { LayoutsTab } from './SpaceDetail/LayoutsTab';
import { AddonsTab } from './SpaceDetail/AddonsTab';
import { HoursBlackoutsTab } from './SpaceDetail/HoursBlackoutsTab';
import { BookingsTab } from './SpaceDetail/BookingsTab';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'photos', label: 'Photos' },
  { id: 'layouts', label: 'Layouts' },
  { id: 'addons', label: 'Add-ons' },
  { id: 'hours', label: 'Hours & Blackouts' },
  { id: 'bookings', label: 'Bookings' },
  /**
   * Space-linked maintenance tickets are Super-Admin-only server-side — no
   * `assigned_spaces` scoping concept exists for Facility Managers the way it
   * does for Properties. Always shown so the module reads as complete; gated
   * to Super Admins below.
   */
  { id: 'maintenance', label: 'Maintenance' },
];

/** Max images per space, server-enforced — mirrored here for a proactive "5/5 used" note instead of only surfacing it as an upload error. */
const MAX_SPACE_IMAGES = 5;

const PhotosTab = ({ spaceId, canManage }) => {
  const { data: images = [], isLoading } = useSpaceImages(spaceId);
  const { uploadImage, isUploading, deleteImage, pendingId } = useSpaceImageMutations(spaceId);
  const atCap = images.length >= MAX_SPACE_IMAGES;

  return (
    <Card>
      <div className="space-y-4 p-4">
        {canManage &&
          (atCap ? (
            <p className="text-[11.5px] text-ink-muted">{MAX_SPACE_IMAGES}/{MAX_SPACE_IMAGES} photos used — remove one to add another.</p>
          ) : (
            <FileDropzone
              accept="image/*"
              hint={`JPG or PNG, up to 20MB · ${images.length}/${MAX_SPACE_IMAGES} used`}
              compact
              onFileSelected={(file) => file && uploadImage({ file, order: images.length })}
            />
          ))}
        {isUploading && <p className="text-[11px] text-ink-muted">Uploading…</p>}

        {isLoading ? (
          <Skeleton className="h-32" />
        ) : !images.length ? (
          <EmptyState icon={<ImageOff className="size-5 text-brand-600" aria-hidden="true" />} title="No photos yet" description="Add photos so guests can see this space before booking." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((image) => (
              <div key={image.id} className="group relative overflow-hidden rounded-lg border border-line">
                <img src={image.url} alt={image.caption || 'Space photo'} className="aspect-square w-full object-cover" loading="lazy" />
                {canManage && (
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => deleteImage(image.id)}
                    disabled={pendingId === image.id}
                    className="absolute right-1.5 top-1.5 rounded-md bg-ink/70 p-1.5 text-white opacity-0 transition-opacity hover:bg-danger group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export const SpaceDetailPage = () => {
  const { spaceId } = useParams();
  const { data: space, isLoading, isError, error } = useSpace(spaceId);

  const [tab, setTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);

  const { setStatus, isPending: isStatusPending } = useSetSpaceStatus();

  const { can, role } = useAuth();
  const canManage = can(CAPABILITIES.spacesManage);
  const isSuperAdmin = role === 'L1';

  useEffect(() => {
    setIsEditing(false);
    setTab('overview');
  }, [spaceId]);

  /** Only `draft`/`published` exist on the real API — no `archived` status, no delete-space endpoint. */
  const statusActions = useMemo(() => {
    if (!space) return [];
    return [
      space.status !== 'published' && { label: 'Publish', status: 'published', variant: 'primary' },
      space.status !== 'draft' && { label: 'Move to draft', status: 'draft' },
    ].filter(Boolean);
  }, [space]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(space.id);
      toast.success('Copied', `${space.id} is on your clipboard.`);
    } catch {
      toast.error('Could not copy', 'Your browser blocked clipboard access.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !space) {
    return (
      <div className="space-y-5">
        <PageHeader title="Space" />
        <EmptyState
          icon={<Warehouse className="size-5 text-brand-600" aria-hidden="true" />}
          title="Could not load this space"
          description={getErrorMessage(error) || 'It may have been deleted, or you may not have access to it.'}
          action={<Button to={paths.spaces}>Back to spaces</Button>}
        />
      </div>
    );
  }

  const currency = currencyForSpace(space);

  return (
    <div className="space-y-5">
      <PageHeader
        title={space.title}
        subtitle={locationLabel(space)}
        meta={
          <>
            <Badge variant={STATUS_BADGE_VARIANT[space.status]} dot>
              {SPACE_STATUSES.find((s) => s.value === space.status)?.label ?? space.status}
            </Badge>
            <Badge variant="brand">{space.type}</Badge>
            <button type="button" onClick={copyId} className="inline-flex items-center gap-1 text-[11.5px] text-ink-muted transition-colors hover:text-brand-700">
              <Copy className="size-3" aria-hidden="true" />
              {space.id}
            </button>
          </>
        }
        actions={
          <>
            <Button to={paths.spaces} leftIcon={<ArrowLeft className="size-3.5" aria-hidden="true" />}>Back</Button>

            {canManage && (
              <>
                <Button onClick={() => setIsEditing(true)} leftIcon={<Pencil className="size-3.5" aria-hidden="true" />}>Edit</Button>

                {statusActions.map((action) => (
                  <Button key={action.status} variant={action.variant} isLoading={isStatusPending} onClick={() => setStatus({ id: space.id, status: action.status })}>
                    {action.label}
                  </Button>
                ))}
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
            <Users className="size-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-muted">Max capacity</p>
            <p className="truncate text-[13px] font-semibold text-ink">{space.maxCapacity || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
            <MapPin className="size-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-muted">Size</p>
            <p className="truncate text-[13px] font-semibold text-ink">{space.sizeSqm ? `${space.sizeSqm} m²` : '—'}</p>
          </div>
        </div>
        <div className="col-span-2 flex items-center justify-between gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5 sm:col-span-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-muted">Rate</p>
            <p className="truncate text-[13px] font-semibold text-ink">
              {formatCurrency(space.baseRate, currency)} <span className="font-normal text-ink-muted">{slotUnitSuffix(space)}</span>
            </p>
          </div>
          <Badge variant={space.bookingMode === 'instant' ? 'ok' : 'info'}>{space.bookingMode === 'instant' ? 'Instant book' : 'Request to book'}</Badge>
        </div>
      </div>

      {space.description && <p className="text-[12.5px] leading-5 text-ink-soft">{space.description}</p>}

      <Tabs tabs={TABS} value={tab} onChange={setTab} variant="underline" />

      {tab === 'overview' && (
        <Card className="p-4 text-[12.5px] text-ink-soft">
          <p>{locationLabel(space)} · {space.address}</p>
          <p className="mt-1">Min {space.minSlots} slot{space.minSlots === 1 ? '' : 's'}{space.maxSlots ? `, max ${space.maxSlots}` : ''} per booking.</p>
          {space.bookingMode === 'request' && <p className="mt-1">Requests auto-expire after {space.approvalExpiryHours}h without a response.</p>}
        </Card>
      )}
      {tab === 'photos' && <PhotosTab spaceId={space.id} canManage={canManage} />}
      {tab === 'layouts' && <LayoutsTab spaceId={space.id} canManage={canManage} />}
      {tab === 'addons' && <AddonsTab spaceId={space.id} canManage={canManage} currency={currency} />}
      {tab === 'hours' && <HoursBlackoutsTab spaceId={space.id} canManage={canManage} />}
      {tab === 'bookings' && <BookingsTab spaceId={space.id} canManage={canManage} />}
      {tab === 'maintenance' &&
        (isSuperAdmin ? (
          <SpaceMaintenanceTab spaceId={space.id} spaceName={space.title} />
        ) : (
          <Alert variant="info" title="Super Admin only">
            Space-linked maintenance tickets are Super Admin only — there's no Facility Manager assignment concept for
            Spaces the way there is for Properties.
          </Alert>
        ))}

      <EditSpaceModal isOpen={isEditing} onClose={() => setIsEditing(false)} space={space} />
    </div>
  );
};
