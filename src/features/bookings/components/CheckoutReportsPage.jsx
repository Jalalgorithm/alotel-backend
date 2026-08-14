import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Pagination } from '@/components/shared/Pagination';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDate } from '@/utils/format';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useBookings, useCheckoutReportsByBookingIds } from '../hooks/useBookings';
import { CheckoutReportDetailModal } from './CheckoutReportDetailModal';

/**
 * Completed-booking deposit reconciliation queue.
 *
 * There is no backend list endpoint for check-out reports themselves — every
 * `Inspection`/`DamageAssessment`/`PostCheckoutReport` is reached per-booking
 * (`/inspections/<booking_id>/...`). So the queue is the real completed-
 * bookings list (`GET /bookings/admin/list/?status=completed`, the same
 * endpoint/hook `BookingsPage`/`CheckInOutPage` already use), and each row's
 * report status is resolved separately — see `useCheckoutReportsByBookingIds`.
 */
export const CheckoutReportsPage = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching } = useBookings({ status: 'completed', query: debouncedSearch, page, pageSize: 10 });

  const items = data?.items ?? [];
  const reportQueries = useCheckoutReportsByBookingIds(items.map((row) => row.id));

  const columns = [
    { key: 'guestName', header: 'Guest', render: (row) => <span className="font-semibold text-ink">{row.guestName}</span> },
    { key: 'propertyName', header: 'Property' },
    { key: 'checkOut', header: 'Checked out', render: (row) => <span className="whitespace-nowrap text-[12px] text-ink-soft">{formatDate(row.checkOut)}</span> },
    { key: 'nights', header: 'Nights', align: 'right' },
    { key: 'total', header: 'Total', align: 'right', render: (row) => <span className="font-semibold tabular-nums">{formatCurrency(row.total, row.currency)}</span> },
    {
      key: 'reportStatus',
      header: 'Report',
      render: (row) => {
        const index = items.findIndex((entry) => entry.id === row.id);
        const query = reportQueries[index];
        if (query?.isLoading) return <span className="text-[11px] text-ink-muted">Checking…</span>;
        return query?.data ? (
          <Badge variant="ok" dot>Generated</Badge>
        ) : (
          <Badge variant="warn" dot>Needs review</Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Check-out Reports" subtitle="Compare condition photography, log damage and settle the deposit for completed stays." />

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder="Search by guest, property or booking id…"
            total={data?.total}
            noun="booking"
          />
        </div>
        <div className="border-t border-line">
          <DataTable
            columns={columns}
            rows={items}
            isLoading={isFetching && !data}
            onRowClick={setSelected}
            emptyTitle="No completed stays match this search"
            emptyDescription="Check-out reports appear here once a booking reaches Completed status."
          />
        </div>
      </Card>

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />

      <CheckoutReportDetailModal isOpen={Boolean(selected)} onClose={() => setSelected(null)} booking={selected} />
    </div>
  );
};
