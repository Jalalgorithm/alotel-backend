import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Copy, MapPin, Pencil, Trash2, Users, Warehouse } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { getErrorMessage } from '@/utils/errors';
import { formatCurrency } from '@/utils/format';
import { toast } from '@/stores/uiStore';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';
import { locationLabel, slotUnitSuffix, SPACE_STATUSES, STATUS_BADGE_VARIANT } from '@/lib/spaceSchema';
import { useDeleteSpace, useSetSpaceStatus, useSpace } from '../hooks/useSpaces';
import { EditSpaceModal } from './SpaceDetail/EditSpaceModal';
import { LayoutsTab } from './SpaceDetail/LayoutsTab';
import { AddonsTab } from './SpaceDetail/AddonsTab';
import { HoursBlackoutsTab } from './SpaceDetail/HoursBlackoutsTab';
import { BookingsTab } from './SpaceDetail/BookingsTab';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'layouts', label: 'Layouts' },
  { id: 'addons', label: 'Add-ons' },
  { id: 'hours', label: 'Hours & Blackouts' },
  { id: 'bookings', label: 'Bookings' },
  /**
   * Always visible so the module reads as complete, but inert — Maintenance's
   * real backend only links to Property today (no Space FK yet), so this tab
   * has no data to show until that ships. See `PropertyMaintenanceTab` for
   * the working equivalent on the Property detail page.
   */
  { id: 'maintenance', label: 'Maintenance', disabled: true },
];

export const SpaceDetailPage = () => {
  const { spaceId } = useParams();
  const { data: space, isLoading, isError, error } = useSpace(spaceId);

  const [tab, setTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { setStatus, isPending: isStatusPending } = useSetSpaceStatus();
  const { deleteSpace, isPending: isDeleting } = useDeleteSpace();

  const { can } = useAuth();
  const canManage = can(CAPABILITIES.spacesManage);

  useEffect(() => {
    setIsEditing(false);
    setTab('overview');
  }, [spaceId]);

  const statusActions = useMemo(() => {
    if (!space) return [];
    return [
      space.status !== 'published' && { label: 'Publish', status: 'published', variant: 'primary' },
      space.status !== 'draft' && { label: 'Move to draft', status: 'draft' },
      space.status !== 'archived' && { label: 'Archive', status: 'archived' },
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

                <Button onClick={() => setConfirmDelete(true)} leftIcon={<Trash2 className="size-3.5" aria-hidden="true" />} aria-label="Delete space" />
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
              {formatCurrency(space.baseRate, space.currency)} <span className="font-normal text-ink-muted">{slotUnitSuffix(space)}</span>
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
      {tab === 'layouts' && <LayoutsTab spaceId={space.id} canManage={canManage} />}
      {tab === 'addons' && <AddonsTab spaceId={space.id} canManage={canManage} />}
      {tab === 'hours' && <HoursBlackoutsTab spaceId={space.id} canManage={canManage} />}
      {tab === 'bookings' && <BookingsTab spaceId={space.id} canManage={canManage} />}
      {tab === 'maintenance' && (
        <Alert variant="info" title="Not available yet">
          Maintenance oversight currently only links to Properties — Space support ships once the backend adds a Space
          reference to its ticket and assignment models.
        </Alert>
      )}

      <EditSpaceModal isOpen={isEditing} onClose={() => setIsEditing(false)} space={space} />

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this space?"
        description="This permanently removes the space, its layouts, add-ons, hours and blackout dates. Existing bookings are kept for record-keeping."
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" isLoading={isDeleting} onClick={() => deleteSpace(space.id)}>Delete permanently</Button>
          </div>
        }
      />
    </div>
  );
};
