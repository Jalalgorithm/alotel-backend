import { Download } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Skeleton } from '@/components/ui/Skeleton';
import { BarChart, DonutChart } from '@/components/charts';
import { useRevenue } from '../hooks/useFinance';
import { formatCurrency, formatDate } from '@/utils/format';
import { toast } from '@/stores/uiStore';

/** Revenue trend, cost split and the invoice ledger. */
export const RevenuePage = () => {
  const { data, isLoading } = useRevenue();

  const columns = [
    {
      key: 'id',
      header: 'Invoice',
      render: (row) => (
        <div className="min-w-0">
          <p className="font-mono text-[11.5px] font-bold text-brand-700">{row.id}</p>
          <p className="text-[10.5px] text-ink-muted">#{row.bookingId}</p>
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
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button
          size="xs"
          variant="ghost"
          leftIcon={<Download className="size-3" aria-hidden="true" />}
          onClick={() => toast.success('Invoice downloaded', row.id)}
        >
          PDF
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Revenue & Invoice" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-72 rounded-card" />
        </div>
        <Skeleton className="h-80 rounded-card" />
      </div>
    );
  }

  const total = data.revenueByMonth.reduce((sum, month) => sum + month.value, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Revenue & Invoice"
        subtitle="Six-month revenue trend, operating cost split and the invoice ledger."
        actions={
          <Button leftIcon={<Download className="size-3.5" aria-hidden="true" />} onClick={() => toast.success('Export started')}>
            Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Revenue by month"
            subtitle={`£${(total / 1000).toFixed(1)}k across the period · hover a column for detail`}
          />
          <div className="px-4 pb-4">
            <BarChart
              data={data.revenueByMonth}
              highlightIndex={data.revenueByMonth.length - 1}
              height={200}
              formatValue={(value) => `£${value >= 1000 ? `${(value / 1000).toFixed(value % 1000 ? 1 : 0)}k` : value}`}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Operating cost breakdown" subtitle="Share of total operating spend" />
          <div className="px-4 pb-4">
            <DonutChart data={data.costBreakdown} centerValue="100%" centerLabel="Operating spend" size={150} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Invoices" subtitle="Issued to guests and corporate clients." />
        <div className="border-t border-line">
          <DataTable columns={columns} rows={data.invoices} emptyTitle="No invoices issued" />
        </div>
      </Card>
    </div>
  );
};
