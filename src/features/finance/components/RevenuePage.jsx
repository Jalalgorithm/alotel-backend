import { useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Pagination } from '@/components/shared/Pagination';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart, DonutChart } from '@/components/charts';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCostBreakdown, useInvoices, useRevenueByMonth } from '../hooks/useFinance';
import { formatCurrency, formatDate } from '@/utils/format';
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS, BOOKING_STATUS_VARIANT } from '@/lib/bookingSchema';
import { paths } from '@/routes/paths';

const STATUS_OPTIONS = [
  { value: 'All', label: 'All statuses' },
  ...BOOKING_STATUSES.map((value) => ({ value, label: BOOKING_STATUS_LABELS[value] ?? value })),
];

/** Builds and downloads a CSV from the currently-loaded page of invoice rows. */
const downloadInvoicesCsv = (rows) => {
  const header = ['Invoice', 'Booking ID', 'Client', 'Issued', 'Due', 'Currency', 'Subtotal', 'Tax', 'Total', 'Status'];
  const csvRow = (values) => values.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',');
  const lines = [
    csvRow(header),
    ...rows.map((row) =>
      csvRow([
        row.id,
        row.bookingId,
        row.client,
        row.issuedAt,
        row.dueAt,
        row.currency,
        row.subtotal,
        row.tax,
        row.total,
        BOOKING_STATUS_LABELS[row.status] ?? row.status,
      ]),
    ),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `alotel-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/** Revenue trend, operating cost split and the invoice ledger — all real. */
export const RevenuePage = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query);

  const { data, isFetching } = useInvoices({
    query: debouncedQuery || undefined,
    status: status === 'All' ? undefined : status,
    page,
    pageSize: 10,
  });
  const { data: revenueByMonth, isLoading: isRevenueLoading } = useRevenueByMonth();
  const { data: costBreakdown, isLoading: isCostLoading } = useCostBreakdown();

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const columns = [
    {
      key: 'id',
      header: 'Invoice',
      render: (row) => (
        <div className="min-w-0">
          <p className="font-mono text-[11.5px] font-bold text-brand-700">{row.id}</p>
          <p className="text-[10.5px] text-ink-muted">#{row.bookingId.slice(0, 8)}</p>
        </div>
      ),
    },
    { key: 'client', header: 'Client', render: (row) => <span className="text-ink-soft">{row.client}</span> },
    { key: 'issuedAt', header: 'Issued', render: (row) => <span className="whitespace-nowrap text-ink-muted">{formatDate(row.issuedAt)}</span> },
    { key: 'dueAt', header: 'Due', render: (row) => <span className="whitespace-nowrap text-ink-muted">{formatDate(row.dueAt)}</span> },
    {
      key: 'subtotal',
      header: 'Subtotal',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-ink-soft">
          {formatCurrency(row.subtotal, row.currency, { compact: row.subtotal > 99999 })}
        </span>
      ),
    },
    {
      key: 'tax',
      header: 'Tax',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-warn">
          {formatCurrency(row.tax, row.currency, { compact: row.tax > 99999 })}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums">
          {formatCurrency(row.total, row.currency, { compact: row.total > 99999 })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={BOOKING_STATUS_VARIANT[row.status] ?? 'neutral'} dot>
          {BOOKING_STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button size="xs" variant="ghost" to={paths.bookingInvoice(row.bookingId)} leftIcon={<Download className="size-3" aria-hidden="true" />}>
          PDF
        </Button>
      ),
    },
  ];

  const monthlyTotal = (revenueByMonth ?? []).reduce((sum, month) => sum + month.value, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Revenue & Invoice"
        subtitle="Trailing 12-month revenue, operating cost split and the invoice ledger."
        actions={
          <Button
            disabled={!data?.items?.length}
            leftIcon={<Download className="size-3.5" aria-hidden="true" />}
            onClick={() => downloadInvoicesCsv(data.items)}
          >
            Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Revenue by month"
            subtitle={
              isRevenueLoading
                ? 'Loading…'
                : `£${(monthlyTotal / 1000).toFixed(1)}k across the period · hover a column for detail`
            }
          />
          <div className="px-4 pb-4">
            {isRevenueLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : revenueByMonth?.length ? (
              <BarChart
                data={revenueByMonth}
                highlightIndex={revenueByMonth.length - 1}
                height={200}
                formatValue={(value) => `£${value >= 1000 ? `${(value / 1000).toFixed(value % 1000 ? 1 : 0)}k` : value}`}
              />
            ) : (
              <EmptyState title="No revenue in this period" />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Operating cost breakdown" subtitle="Month-to-date, by category" />
          <div className="px-4 pb-4">
            {isCostLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : costBreakdown?.breakdown?.some((row) => row.value > 0) ? (
              <DonutChart
                data={costBreakdown.breakdown}
                centerValue={formatCurrency(
                  costBreakdown.breakdown.reduce((sum, row) => sum + row.value, 0),
                  'GBP',
                  { compact: true },
                )}
                centerLabel="Operating spend"
                size={150}
              />
            ) : (
              <EmptyState title="No spend logged yet this month" />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Invoices" subtitle="Issued to guests and corporate clients." />
        <div className="p-4 pt-0">
          <ListToolbar
            search={query}
            onSearchChange={withReset(setQuery)}
            searchPlaceholder="Search by booking ID or guest…"
            total={data?.total}
            noun="invoice"
            filters={[{ id: 'status', value: status, onChange: withReset(setStatus), options: STATUS_OPTIONS, label: 'Status' }]}
          />
        </div>
        <div className="border-t border-line">
          <DataTable columns={columns} rows={data?.items ?? []} isLoading={isFetching && !data} emptyTitle="No invoices issued" />
        </div>
      </Card>

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
};
