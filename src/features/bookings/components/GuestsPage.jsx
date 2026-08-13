import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Pagination } from '@/components/shared/Pagination';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { AvatarCell } from '@/components/ui/Avatar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useGuestBookingHistory, useGuestDetail, useGuests, useUpdateGuest } from '../hooks/useBookings';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_VARIANT } from '@/lib/bookingSchema';
import { formatDate } from '@/utils/format';

const KYC_STATUS_LABELS = {
  none: 'No KYC on file',
  pending: 'Pending',
  in_review: 'In review',
  verified: 'Verified',
  rejected: 'Rejected',
  full_kyc: 'Full KYC',
};
const KYC_STATUS_VARIANT = { verified: 'ok', full_kyc: 'ok', pending: 'warn', in_review: 'warn', rejected: 'danger', none: 'neutral' };

/** Phone, KYC status, stay stats and booking history for one guest. */
const GuestDetail = ({ guestId, onClose }) => {
  const { data: guest, isLoading } = useGuestDetail(guestId);
  const { data: history = [], isLoading: isLoadingHistory } = useGuestBookingHistory(guestId);

  return (
    <Modal isOpen onClose={onClose} size="lg" title={guest?.name ?? 'Guest'} description={guest?.email}>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Phone</p>
              <p className="mt-1 text-[12.5px] text-ink">{guest?.phone || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">KYC status</p>
              <Badge variant={KYC_STATUS_VARIANT[guest?.kycStatus] ?? 'neutral'} className="mt-1">
                {KYC_STATUS_LABELS[guest?.kycStatus] ?? guest?.kycStatus}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Total bookings</p>
              <p className="mt-1 text-[12.5px] font-semibold text-ink">{guest?.stayStats?.totalBookings ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">Completed stays</p>
              <p className="mt-1 text-[12.5px] font-semibold text-ink">{guest?.stayStats?.completedStays ?? 0}</p>
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <h3 className="mb-2 font-display text-[13px] font-semibold text-ink">Booking history</h3>
            {isLoadingHistory ? (
              <Skeleton className="h-24 w-full" />
            ) : history.length ? (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {history.map((booking) => (
                  <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-ink">{booking.propertyName}</p>
                      <p className="text-[10.5px] text-ink-muted">
                        {formatDate(booking.checkIn)} – {formatDate(booking.checkOut)} · {booking.nights} nights
                      </p>
                    </div>
                    <Badge variant={BOOKING_STATUS_VARIANT[booking.status] ?? 'neutral'} dot>
                      {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No bookings yet" description="This guest hasn't made a reservation." />
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

/**
 * Guest directory — the list table (`GET /auth/admin/guests/`) only exposes
 * name, email, active/inactive and joined date, so it keeps to those columns.
 * Phone, KYC status and stay stats come from `GET /auth/admin/guests/<id>/`
 * and only load once a row is opened.
 */
export const GuestsPage = () => {
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedGuestId, setSelectedGuestId] = useState(null);

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching } = useGuests({ query: debouncedSearch, isActive, page, pageSize: 10 });
  const { updateGuest, isPending, pendingId } = useUpdateGuest();

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const columns = [
    {
      key: 'name',
      header: 'Guest',
      render: (row) => <AvatarCell name={row.name} primary={row.name} secondary={row.email} size="sm" />,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => <Badge variant={row.isActive ? 'ok' : 'neutral'}>{row.isActive ? 'Active' : 'Deactivated'}</Badge>,
    },
    {
      key: 'joinedAt',
      header: 'Joined',
      render: (row) => <span className="whitespace-nowrap text-ink-muted">{formatDate(row.joinedAt, 'MMM yyyy')}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div onClick={(event) => event.stopPropagation()}>
          <Button
            size="xs"
            variant={row.isActive ? 'dangerSoft' : 'subtle'}
            isLoading={isPending && pendingId === row.id}
            onClick={() => updateGuest(row.id, { isActive: !row.isActive })}
          >
            {row.isActive ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Guests" subtitle="Every registered guest account." />

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={withReset(setSearch)}
            searchPlaceholder="Search by name or email…"
            total={data?.total}
            noun="guest"
            filters={[
              { id: 'isActive', value: isActive, onChange: withReset(setIsActive), options: ['All', 'Active', 'Inactive'], label: 'Status' },
            ]}
          />
        </div>

        <div className="border-t border-line">
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isFetching && !data}
            onRowClick={(row) => setSelectedGuestId(row.id)}
            emptyTitle="No guests match these filters"
          />
        </div>
      </Card>

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />

      {selectedGuestId && <GuestDetail guestId={selectedGuestId} onClose={() => setSelectedGuestId(null)} />}
    </div>
  );
};
