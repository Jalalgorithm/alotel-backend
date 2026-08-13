import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Accessibility,
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  CalendarRange,
  Check,
  Copy,
  ImageOff,
  Maximize2,
  MapPin,
  PawPrint,
  Pencil,
  Sofa,
  Star,
  Trash2,
  Users,
  VideoOff,
  X,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/utils/classNames';
import { formatCurrency, formatDate } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import { toast } from '@/stores/uiStore';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';
import {
  ACCESS_FEATURES,
  AMENITY_GROUPS,
  CLASSIFICATIONS,
  FURNISHED_OPTIONS,
  LOCATIONS,
  PETS_OPTIONS,
  PROPERTY_TYPES,
} from '@/lib/propertySchema';
import {
  useDeleteProperty,
  useDeletePropertyImage,
  useDeletePropertyVideo,
  useProperty,
  usePropertyImages,
  usePropertyStatus,
  usePropertyVideos,
  useSetCoverPhoto,
  useUpdateProperty,
  useUploadPropertyImages,
  useUploadPropertyVideos,
} from '../hooks/useProperties';
import { PhotoUploadButton } from './PhotoPicker';
import { VideoUploadButton } from './VideoPicker';
import { AvailabilityPanel } from './AvailabilityPanel';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'space', label: 'Space & features' },
  { id: 'pricing', label: 'Pricing & rules' },
  { id: 'availability', label: 'Availability' },
];

/* -------------------------------------------------------------------------- */
/* Read-only pieces                                                            */
/* -------------------------------------------------------------------------- */

const Field = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">{label}</p>
    <p className="mt-1 break-words text-[13px] text-ink">{children ?? '—'}</p>
  </div>
);

const Spec = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5">
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
      <Icon className="size-3.5" aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-muted">{label}</p>
      <p className="truncate text-[13px] font-semibold text-ink">{value}</p>
    </div>
  </div>
);

const TagList = ({ items, empty }) =>
  items?.length ? (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px] text-ink-soft"
        >
          <Check className="size-2.5 text-brand-600" aria-hidden="true" />
          {item}
        </span>
      ))}
    </div>
  ) : (
    <p className="text-[12px] text-ink-muted">{empty}</p>
  );

/**
 * The API's own pricing maths, shown verbatim so admin and guest agree.
 *
 * `sample_one_night` is the API's worked example for tomorrow's date — it is
 * the only place discounts and tax are actually applied, so it's what an admin
 * needs to see to sanity-check a listing's pricing.
 */
const PriceBreakdown = ({ breakdown, currency }) => {
  if (!breakdown) {
    return (
      <p className="text-[12px] text-ink-muted">
        The API returns a breakdown only once a pricing configuration exists for this market.
      </p>
    );
  }

  const sample = breakdown.sample_one_night;
  const money = (value) => formatCurrency(Number(value), breakdown.currency ?? currency);

  const rows = sample
    ? [
        ['Nightly rate', sample.nightly_rate],
        ['Discount', sample.discount_total, Number(sample.discount_total) > 0],
        ['Cleaning fee', sample.cleaning_fee],
        ['Tax', sample.tax_total],
        ['Security deposit', sample.security_deposit],
      ]
    : [
        ['Base rate', breakdown.base_rate],
        ['Weekend rate', breakdown.weekend_rate],
        ['Cleaning fee', breakdown.cleaning_fee],
        ['Security deposit', breakdown.security_deposit],
      ];

  return (
    <div className="space-y-2">
      {sample && (
        <p className="text-[11px] text-ink-muted">
          Worked example for a one-night stay from {formatDate(sample.check_in_date)}.
        </p>
      )}

      <div className="space-y-1.5">
        {rows
          // A zero discount or zero tax is noise, not information — the total
          // below already reflects their absence.
          .filter(([, value]) => value !== undefined && value !== null && Number(value) !== 0)
          .map(([label, value, isDiscount]) => (
            <div key={label} className="flex items-center justify-between gap-4 text-[12.5px]">
              <span className="text-ink-muted">{label}</span>
              <span className={cn('tabular-nums', isDiscount ? 'text-ok' : 'text-ink')}>
                {isDiscount ? '−' : ''}
                {money(value)}
              </span>
            </div>
          ))}
      </div>

      {sample?.total_due_now !== undefined && (
        <div className="flex items-center justify-between gap-4 border-t border-line pt-2 text-[13px] font-semibold">
          <span className="text-ink">Total due now</span>
          <span className="tabular-nums text-brand-700">{money(sample.total_due_now)}</span>
        </div>
      )}

      {breakdown.active_discount && (
        <Badge variant="ok" className="mt-1">
          Discount active: {breakdown.active_discount.name ?? 'Promotion'}
        </Badge>
      )}

      {!breakdown.pricing_config && (
        <p className="pt-1 text-[11px] text-warn">
          No pricing configuration exists for this market — fees fall back to whatever is set on the listing itself.
        </p>
      )}
    </div>
  );
};

/**
 * Photo strip: hero plus the room shots, with the room type labelled so an
 * admin can see at a glance what coverage a listing actually has.
 */
const Gallery = ({ propertyId, fallback, canManage, coverUrl }) => {
  const { data: images, isLoading } = usePropertyImages(propertyId);
  const { setCover, isPending: isSettingCover } = useSetCoverPhoto();
  const { uploadImages, isPending: isUploading } = useUploadPropertyImages();
  const { deleteImage, isPending: isDeleting } = useDeletePropertyImage();
  const [active, setActive] = useState(0);

  /** New photos go on the end, so existing ordering is never disturbed. */
  const addPhotos = (files) =>
    uploadImages({
      propertyId,
      photos: files.map((file) => ({ file, roomType: 'Other', caption: '' })),
      startOrder: images?.length ?? 0,
      // Only claim the cover slot when the listing has no photos at all.
      setThumbnail: !images?.length,
    });

  // A different listing resets the selection; otherwise index 3 on a five-shot
  // gallery would carry over to one that only has two.
  useEffect(() => setActive(0), [propertyId]);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-card" />;

  if (!images?.length) {
    return fallback ? (
      <div className="space-y-2">
        <div className="overflow-hidden rounded-card border border-line">
          <img src={fallback} alt="" className="h-64 w-full object-cover" />
        </div>
        {canManage && <PhotoUploadButton onFiles={addPhotos} isPending={isUploading} />}
      </div>
    ) : (
      <Card className="flex h-40 flex-col items-center justify-center gap-2 text-ink-muted">
        <ImageOff className="size-5" aria-hidden="true" />
        <p className="text-[12px]">No photos uploaded for this listing yet.</p>
        {canManage && <PhotoUploadButton onFiles={addPhotos} isPending={isUploading} />}
      </Card>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  /**
   * `thumbNail` is stored as its own copy, so the URLs differ by Django's
   * upload path and any `_suffix` it adds on collision. Comparing the base file
   * name is what actually identifies the same photo.
   */
  const baseName = (url = '') => url.split('/').pop()?.split('?')[0]?.replace(/_[A-Za-z0-9]{7}(\.[a-z]+)$/i, '$1') ?? '';
  const isCover = (image) => Boolean(coverUrl && image && baseName(coverUrl) === baseName(image.property_image));

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-card border border-line bg-line-soft">
        <img
          src={current.property_image}
          alt={current.caption || current.roomType}
          className="h-64 w-full object-cover sm:h-80"
        />
        {current.roomType && current.roomType !== 'Other' && (
          <span className="absolute bottom-3 left-3 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {current.roomType}
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {Math.min(active, images.length - 1) + 1} / {images.length}
        </span>

        {isCover(current) && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand-700 px-2.5 py-1 text-[11px] font-semibold text-white">
            <Star className="size-2.5 fill-current" aria-hidden="true" />
            Cover photo
          </span>
        )}
      </div>

      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <PhotoUploadButton onFiles={addPhotos} isPending={isUploading} />

          {!isCover(current) && (
            <Button
              size="sm"
              isLoading={isSettingCover}
              leftIcon={<Star className="size-3.5" aria-hidden="true" />}
              onClick={() => setCover({ propertyId, imageUrl: current.property_image })}
            >
              Make cover
            </Button>
          )}

          <Button
            size="sm"
            variant="dangerSoft"
            isLoading={isDeleting}
            leftIcon={<Trash2 className="size-3.5" aria-hidden="true" />}
            onClick={() => deleteImage({ propertyId, imageId: current.id })}
          >
            Remove this photo
          </Button>
          <span className="text-[11px] text-ink-muted">
            The cover is what guests see in search results.
          </span>
        </div>
      )}

      {images.length > 1 && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show ${image.caption || image.roomType}`}
              aria-pressed={index === active}
              className={cn(
                'relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                index === active ? 'border-brand-600' : 'border-transparent hover:border-brand-300',
              )}
            >
              <img src={image.property_image} alt="" className="size-full object-cover" loading="lazy" />
              {isCover(image) && (
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-brand-700/90 py-px">
                  <Star className="size-2 fill-current text-white" aria-hidden="true" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** Video gallery — walkthroughs and room clips, alongside the photo gallery above. */
const VideoGallery = ({ propertyId, canManage }) => {
  const { data: videos, isLoading } = usePropertyVideos(propertyId);
  const { uploadVideos, isPending: isUploading } = useUploadPropertyVideos();
  const { deleteVideo, isPending: isDeleting, pendingId } = useDeletePropertyVideo();

  const addVideos = (files) =>
    uploadVideos({
      propertyId,
      videos: files.map((file) => ({ file, roomType: 'Walkthrough', caption: '' })),
      startOrder: videos?.length ?? 0,
    });

  if (isLoading) return <Skeleton className="h-32 w-full rounded-card" />;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[14px] font-semibold text-ink">Videos</h2>
        {canManage && <VideoUploadButton onFiles={addVideos} isPending={isUploading} />}
      </div>

      {videos?.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <div key={video.id} className="space-y-1.5">
              <video src={video.property_video} controls className="aspect-video w-full rounded-lg bg-black object-cover" />
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[11px] text-ink-muted">{video.caption || video.roomType}</p>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => deleteVideo({ propertyId, videoId: video.id })}
                    disabled={isDeleting && pendingId === video.id}
                    aria-label="Remove video"
                    className="shrink-0 rounded p-1 text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-ink-muted">
          <VideoOff className="size-5" aria-hidden="true" />
          <p className="text-[12px]">No videos uploaded for this listing yet.</p>
        </div>
      )}
    </Card>
  );
};

/* -------------------------------------------------------------------------- */
/* Edit form                                                                   */
/* -------------------------------------------------------------------------- */

/** Only the fields the API accepts on PATCH; everything else stays read-only. */
const toEditable = (property) => ({
  name: property.name ?? '',
  classification: property.classification ?? CLASSIFICATIONS[0],
  location: property.location ?? LOCATIONS[0],
  country: property.country ?? '',
  state: property.state ?? '',
  city: property.city ?? '',
  address: property.address ?? '',
  type: property.type ?? PROPERTY_TYPES[0],
  bedrooms: property.bedrooms ?? 0,
  bathrooms: property.bathrooms ?? 1,
  maxGuests: property.maxGuests ?? 1,
  area: property.area ?? '',
  furnished: property.furnished ?? FURNISHED_OPTIONS[0],
  pets: property.pets ?? PETS_OPTIONS[0],
  amenities: property.amenities ?? [],
  accessFeatures: property.accessFeatures ?? [],
  baseRate: property.baseRate ?? '',
  weekendRate: property.weekendRate ?? '',
  monthlyRate: property.monthlyRate ?? '',
  cleaningFee: property.cleaningFee ?? '',
  securityDeposit: property.securityDeposit ?? '',
  minStay: property.minStay ?? 1,
  maxStay: property.maxStay ?? '',
  instantBook: Boolean(property.instantBook),
});

const EditForm = ({ property, onCancel, onSaved }) => {
  const [form, setForm] = useState(() => toEditable(property));
  const { updatePropertyAsync, isPending } = useUpdateProperty();

  const update = (patch) => setForm((previous) => ({ ...previous, ...patch }));

  const toggleIn = (key, value) =>
    setForm((previous) => ({
      ...previous,
      [key]: previous[key].includes(value)
        ? previous[key].filter((entry) => entry !== value)
        : [...previous[key], value],
    }));

  const save = async () => {
    try {
      await updatePropertyAsync({ id: property.id, patch: form });
      onSaved();
    } catch {
      /* the mutation's onError already raised a toast */
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="mb-4 font-display text-[14px] font-semibold text-ink">Identity &amp; location</h2>

        <div className="space-y-4">
          <Input label="Listing name" value={form.name} onChange={(e) => update({ name: e.target.value })} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Classification"
              value={form.classification}
              onChange={(e) => update({ classification: e.target.value })}
              options={CLASSIFICATIONS}
            />
            <Select
              label="Market"
              value={form.location}
              onChange={(e) => update({ location: e.target.value })}
              options={LOCATIONS}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Country" value={form.country} onChange={(e) => update({ country: e.target.value })} />
            <Input label="State / province" value={form.state} onChange={(e) => update({ state: e.target.value })} />
            <Input label="City" value={form.city} onChange={(e) => update({ city: e.target.value })} />
          </div>

          <Textarea
            label="Street address"
            rows={2}
            value={form.address}
            onChange={(e) => update({ address: e.target.value })}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-display text-[14px] font-semibold text-ink">Space</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Type" value={form.type} onChange={(e) => update({ type: e.target.value })} options={PROPERTY_TYPES} />
          <Input label="Bedrooms" type="number" min="0" value={form.bedrooms} onChange={(e) => update({ bedrooms: e.target.value })} />
          <Input label="Bathrooms" type="number" min="0" step="0.5" value={form.bathrooms} onChange={(e) => update({ bathrooms: e.target.value })} />
          <Input label="Max guests" type="number" min="1" value={form.maxGuests} onChange={(e) => update({ maxGuests: e.target.value })} />
          <Input label="Floor area (m²)" type="number" min="0" value={form.area} onChange={(e) => update({ area: e.target.value })} />
          <Select label="Furnishing" value={form.furnished} onChange={(e) => update({ furnished: e.target.value })} options={FURNISHED_OPTIONS} />
          <Select label="Pets" value={form.pets} onChange={(e) => update({ pets: e.target.value })} options={PETS_OPTIONS} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-display text-[14px] font-semibold text-ink">Amenities &amp; accessibility</h2>

        <div className="space-y-4">
          {AMENITY_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="mb-2 text-[11px] font-semibold text-ink-soft">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => {
                  const checked = form.amenities.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={checked}
                      onClick={() => toggleIn('amenities', item)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[11.5px] transition-colors',
                        checked
                          ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700'
                          : 'border-line bg-white text-ink-soft hover:border-brand-300',
                      )}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="border-t border-line pt-4">
            <p className="mb-2 text-[11px] font-semibold text-ink-soft">Accessibility</p>
            <div className="flex flex-wrap gap-1.5">
              {ACCESS_FEATURES.map((feature) => {
                const checked = form.accessFeatures.includes(feature);
                return (
                  <button
                    key={feature}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggleIn('accessFeatures', feature)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11.5px] transition-colors',
                      checked
                        ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700'
                        : 'border-line bg-white text-ink-soft hover:border-brand-300',
                    )}
                  >
                    {feature}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-display text-[14px] font-semibold text-ink">Pricing &amp; rules</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label={`Nightly rate (${property.currency})`} type="number" min="0" value={form.baseRate} onChange={(e) => update({ baseRate: e.target.value })} />
          <Input label="Weekend rate" type="number" min="0" value={form.weekendRate} onChange={(e) => update({ weekendRate: e.target.value })} />
          <Input label="Monthly rate" type="number" min="0" value={form.monthlyRate} onChange={(e) => update({ monthlyRate: e.target.value })} />
          <Input label="Cleaning fee" type="number" min="0" value={form.cleaningFee} onChange={(e) => update({ cleaningFee: e.target.value })} />
          <Input label="Security deposit" type="number" min="0" value={form.securityDeposit} onChange={(e) => update({ securityDeposit: e.target.value })} />
          <Input label="Minimum stay (nights)" type="number" min="1" value={form.minStay} onChange={(e) => update({ minStay: e.target.value })} />
          <Input label="Maximum stay (nights)" type="number" min="1" placeholder="No maximum" value={form.maxStay} onChange={(e) => update({ maxStay: e.target.value })} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-line bg-line-soft px-4 py-3">
          <div>
            <p className="text-[12.5px] font-semibold text-ink">Instant book</p>
            <p className="text-[11px] text-ink-muted">Confirm bookings without admin approval.</p>
          </div>
          <Toggle checked={form.instantBook} onChange={(value) => update({ instantBook: value })} label="Instant book" />
        </div>
      </Card>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-line bg-surface/95 py-3 backdrop-blur sm:flex-row sm:justify-end">
        <Button onClick={onCancel} leftIcon={<X className="size-3.5" aria-hidden="true" />}>
          Discard
        </Button>
        <Button variant="primary" onClick={save} isLoading={isPending}>
          Save changes
        </Button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export const PropertyDetailPage = () => {
  const { propertyId } = useParams();
  const { data: property, isLoading, isError, error } = useProperty(propertyId);

  const [tab, setTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { setStatus, isPending: isStatusPending } = usePropertyStatus();
  const { deleteProperty, isPending: isDeleting } = useDeleteProperty();

  const { can } = useAuth();
  const canManage = can(CAPABILITIES.propertiesManage);

  // A fresh id means a different listing — don't carry the previous one's
  // open edit form or scroll-restored tab across.
  useEffect(() => {
    setIsEditing(false);
    setTab('overview');
  }, [propertyId]);

  const currency = property?.currency ?? 'GBP';

  const statusActions = useMemo(() => {
    if (!property) return [];
    return [
      property.status !== 'published' && { label: 'Publish', status: 'published', variant: 'primary' },
      property.status !== 'draft' && { label: 'Move to draft', status: 'draft' },
      property.status !== 'archived' && { label: 'Archive', status: 'archived' },
    ].filter(Boolean);
  }, [property]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(property.id);
      toast.success('Copied', `${property.id} is on your clipboard.`);
    } catch {
      toast.error('Could not copy', 'Your browser blocked clipboard access.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-56 lg:col-span-2" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  if (isError || !property) {
    return (
      <div className="space-y-5">
        <PageHeader title="Property" />
        <EmptyState
          icon={<Building2 className="size-5 text-brand-600" aria-hidden="true" />}
          title="Could not load this property"
          description={getErrorMessage(error) || 'It may have been deleted, or you may not have access to it.'}
          action={<Button to={paths.properties}>Back to properties</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={property.name}
        subtitle={[property.address, property.city, property.state, property.country].filter(Boolean).join(', ')}
        meta={
          <>
            <StatusBadge status={property.statusLabel} />
            <Badge variant="brand">{property.classification}</Badge>
            <button
              type="button"
              onClick={copyId}
              className="inline-flex items-center gap-1 text-[11.5px] text-ink-muted transition-colors hover:text-brand-700"
            >
              <Copy className="size-3" aria-hidden="true" />
              {property.id}
            </button>
            {property.rating ? (
              <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-muted">
                <Star className="size-3 fill-gold text-gold" aria-hidden="true" />
                {property.rating.toFixed(1)} · {property.reviewCount} reviews
              </span>
            ) : null}
          </>
        }
        actions={
          isEditing ? null : (
            <>
              <Button to={paths.properties} leftIcon={<ArrowLeft className="size-3.5" aria-hidden="true" />}>
                Back
              </Button>

              {canManage && (
                <>
                  <Button onClick={() => setIsEditing(true)} leftIcon={<Pencil className="size-3.5" aria-hidden="true" />}>
                    Edit
                  </Button>

                  {statusActions.map((action) => (
                    <Button
                      key={action.status}
                      variant={action.variant}
                      isLoading={isStatusPending}
                      onClick={() => setStatus({ id: property.id, status: action.status })}
                    >
                      {action.label}
                    </Button>
                  ))}

                  <Button
                    onClick={() => setConfirmDelete(true)}
                    leftIcon={<Trash2 className="size-3.5" aria-hidden="true" />}
                    aria-label="Delete property"
                  />
                </>
              )}
            </>
          )
        }
      />

      {isEditing ? (
        <EditForm property={property} onCancel={() => setIsEditing(false)} onSaved={() => setIsEditing(false)} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Spec icon={BedDouble} label="Bedrooms" value={property.bedrooms || 'Studio'} />
            <Spec icon={Bath} label="Bathrooms" value={property.bathrooms} />
            <Spec icon={Users} label="Sleeps" value={property.maxGuests} />
            <Spec icon={Maximize2} label="Area" value={property.area ? `${property.area} m²` : '—'} />
            <Spec icon={Sofa} label="Furnishing" value={property.furnished} />
            <Spec icon={PawPrint} label="Pets" value={property.pets} />
          </div>

          <Gallery
            propertyId={property.id}
            fallback={property.thumbnail}
            coverUrl={property.thumbnail}
            canManage={canManage}
          />

          <VideoGallery propertyId={property.id} canManage={canManage} />

          <Tabs tabs={TABS} value={tab} onChange={setTab} variant="underline" />

          {tab === 'overview' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
              <Card className="p-5">
                <h2 className="mb-4 font-display text-[14px] font-semibold text-ink">Details</h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Type">{property.type}</Field>
                  <Field label="Market">{property.location}</Field>
                  <Field label="Host">{property.host}</Field>
                  <Field label="Currency">{currency}</Field>
                  <Field label="Created">{property.createdAt ? formatDate(property.createdAt) : null}</Field>
                  <Field label="Last updated">{property.updatedAt ? formatDate(property.updatedAt) : null}</Field>
                  <Field label="Published">
                    {property.publishedAt ? formatDate(property.publishedAt) : 'Not published'}
                  </Field>
                  <Field label="Coordinates">
                    {property.coordinates?.lat
                      ? `${property.coordinates.lat}, ${property.coordinates.lng}`
                      : null}
                  </Field>
                </div>

                <div className="mt-5 border-t border-line pt-4">
                  <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                    <MapPin className="size-3 text-brand-600" aria-hidden="true" />
                    Address
                  </p>
                  <p className="text-[13px] text-ink">
                    {[property.address, property.city, property.state, property.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">Rate</h2>

                <p className="font-display text-[26px] font-bold leading-none text-brand-700">
                  {formatCurrency(property.baseRate, currency)}
                  <span className="ml-1.5 text-[12px] font-normal text-ink-muted">/night</span>
                </p>

                <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-[12.5px]">
                  <div className="flex justify-between gap-4">
                    <span className="text-ink-muted">Weekend</span>
                    <span className="text-ink">
                      {property.weekendRate ? formatCurrency(property.weekendRate, currency) : 'Same as nightly'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-ink-muted">Monthly</span>
                    <span className="text-ink">
                      {property.monthlyRate ? formatCurrency(property.monthlyRate, currency) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-ink-muted">Stay limits</span>
                    <span className="text-ink">
                      {property.minStay} min{property.maxStay ? ` · ${property.maxStay} max` : ''}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
                  <Badge variant={property.instantBook ? 'info' : 'neutral'} icon={<Zap className="size-2.5" />}>
                    {property.instantBook ? 'Instant book' : 'Admin approves'}
                  </Badge>
                  <Badge variant="neutral" icon={<CalendarRange className="size-2.5" />}>
                    {property.minStay} night minimum
                  </Badge>
                </div>
              </Card>
            </div>
          )}

          {tab === 'space' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">
                  Amenities <span className="font-normal text-ink-muted">({property.amenities.length})</span>
                </h2>
                <TagList items={property.amenities} empty="No amenities recorded for this listing yet." />
              </Card>

              <Card className="p-5">
                <h2 className="mb-3 inline-flex items-center gap-1.5 font-display text-[14px] font-semibold text-ink">
                  <Accessibility className="size-4 text-brand-600" aria-hidden="true" />
                  Accessibility{' '}
                  <span className="font-normal text-ink-muted">({property.accessFeatures.length})</span>
                </h2>
                <TagList items={property.accessFeatures} empty="No accessibility features recorded." />
              </Card>
            </div>
          )}

          {tab === 'pricing' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">Configured on the listing</h2>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Nightly rate">{formatCurrency(property.baseRate, currency)}</Field>
                  <Field label="Weekend rate">
                    {property.weekendRate ? formatCurrency(property.weekendRate, currency) : null}
                  </Field>
                  <Field label="Monthly rate">
                    {property.monthlyRate ? formatCurrency(property.monthlyRate, currency) : null}
                  </Field>
                  <Field label="Cleaning fee">
                    {property.cleaningFee !== null ? formatCurrency(property.cleaningFee, currency) : 'Market default'}
                  </Field>
                  <Field label="Security deposit">
                    {property.securityDeposit !== null
                      ? formatCurrency(property.securityDeposit, currency)
                      : 'Market default'}
                  </Field>
                  <Field label="Instant book">{property.instantBook ? 'Enabled' : 'Disabled'}</Field>
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="mb-1 font-display text-[14px] font-semibold text-ink">Guest-facing breakdown</h2>
                <p className="mb-3 text-[11.5px] text-ink-muted">
                  Computed by the API from this market&apos;s pricing configuration and tax rules.
                </p>
                <PriceBreakdown breakdown={property.priceBreakdown} currency={currency} />
              </Card>
            </div>
          )}

          {tab === 'availability' && (
            <AvailabilityPanel propertyId={property.id} currency={currency} canManage={canManage} />
          )}
        </>
      )}

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this property?"
        description="This cannot be undone."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" isLoading={isDeleting} onClick={() => deleteProperty(property.id)}>
              Delete permanently
            </Button>
          </div>
        }
      >
        <Alert variant="warn" title="Archiving is usually the better option">
          Archiving hides the listing from guests but keeps its booking history intact. Deleting removes the record
          entirely.
        </Alert>
        <p className="mt-3 text-[13px] text-ink">
          <span className="font-semibold">{property.name}</span> — {property.city}, {property.country}
        </p>
      </Modal>
    </div>
  );
};
