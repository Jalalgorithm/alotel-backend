import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Pagination } from '@/components/shared/Pagination';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Alert } from '@/components/ui/Alert';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePayments } from '../hooks/useFinance';
import { formatCurrency, formatDate } from '@/utils/format';

/** `PaymentTransaction.STATUS_CHOICES` / `PROVIDER_CHOICES` / `TYPE_CHOICES`. */
const STATUS_OPTIONS = [
  { value: 'All', label: 'All statuses' },
  { value: 'initiated', label: 'Initiated' },
  { value: 'pending', label: 'Pending' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];
const PROVIDER_OPTIONS = [
  { value: 'All', label: 'All providers' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'flutterwave', label: 'Flutterwave' },
];
const STATUS_BADGE_VARIANT = { initiated: 'neutral', pending: 'warn', succeeded: 'ok', failed: 'danger', cancelled: 'neutral' };
const STATUS_LABEL = { initiated: 'Initiated', pending: 'Pending', succeeded: 'Succeeded', failed: 'Failed', cancelled: 'Cancelled' };
const TRANSACTION_TYPE_LABEL = {
  payment: 'Booking Payment',
  deposit_preauth: 'Deposit Pre-auth',
  deposit_charge: 'Deposit Charge',
  deposit_capture: 'Deposit Capture',
  deposit_release: 'Deposit Release',
  refund: 'Refund',
  referencing_fee: 'Referencing Fee',
};

/** Admin payment transaction ledger — every charge, refund and deposit movement across bookings. */
export const PaymentsPage = () => {
  const [bookingId, setBookingId] = useState('');
  const [status, setStatus] = useState('All');
  const [provider, setProvider] = useState('All');
  const [page, setPage] = useState(1);

  const debouncedBookingId = useDebouncedValue(bookingId);
  const { data, isFetching } = usePayments({
    bookingId: debouncedBookingId || undefined,
    status: status === 'All' ? undefined : status,
    provider: provider === 'All' ? undefined : provider,
    page,
    pageSize: 10,
  });

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const columns = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <div className="min-w-0">
          <p className="font-mono text-[11.5px] font-bold text-brand-700">{row.reference}</p>
          <p className="truncate text-[10.5px] text-ink-muted">#{row.bookingId}</p>
        </div>
      ),
    },
    {
      key: 'guest',
      header: 'Guest',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-ink">{row.guest}</p>
          <p className="truncate text-[10.5px] text-ink-muted">{row.property}</p>
        </div>
      ),
    },
    {
      key: 'transactionType',
      header: 'Type',
      render: (row) => (
        <div className="whitespace-nowrap">
          <p className="text-[12px] text-ink-soft">{TRANSACTION_TYPE_LABEL[row.transactionType] ?? row.transactionType}</p>
          <p className="text-[10.5px] capitalize text-ink-muted">{row.provider}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap font-semibold tabular-nums">
          {formatCurrency(row.amount, row.currency, { compact: row.amount > 99999 })}
        </span>
      ),
    },
    {
      key: 'paidAt',
      header: 'Processed',
      render: (row) => (
        <span className="whitespace-nowrap text-ink-muted">{row.paidAt ? formatDate(row.paidAt) : '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={STATUS_BADGE_VARIANT[row.status] ?? 'neutral'} dot>
          {STATUS_LABEL[row.status] ?? row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Payments" subtitle="Every payment transaction — charges, refunds and deposit movements." />

      <Alert variant="info" icon={<ShieldCheck className="size-4" aria-hidden="true" />}>
        Card numbers are never stored or displayed — payments are referenced by provider token only.
      </Alert>

      <Card>
        <div className="p-4">
          <ListToolbar
            search={bookingId}
            onSearchChange={withReset(setBookingId)}
            searchPlaceholder="Filter by booking ID…"
            total={data?.total}
            noun="payment"
            filters={[
              { id: 'status', value: status, onChange: withReset(setStatus), options: STATUS_OPTIONS, label: 'Status' },
              { id: 'provider', value: provider, onChange: withReset(setProvider), options: PROVIDER_OPTIONS, label: 'Provider' },
            ]}
          />
        </div>

        <div className="border-t border-line">
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isFetching && !data}
            emptyTitle="No payments match these filters"
          />
        </div>
      </Card>

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
};
