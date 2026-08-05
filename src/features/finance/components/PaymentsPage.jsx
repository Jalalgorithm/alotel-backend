import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Pagination } from '@/components/shared/Pagination';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Alert } from '@/components/ui/Alert';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePayments } from '../hooks/useFinance';
import { formatCurrency, formatDate } from '@/utils/format';
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '@/lib/mock/finance';

/** Guest payment ledger. */
export const PaymentsPage = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [method, setMethod] = useState('All');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching } = usePayments({ query: debouncedSearch, status, method, page, pageSize: 10 });

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
          <p className="text-[10.5px] text-ink-muted">#{row.bookingId}</p>
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
      key: 'method',
      header: 'Method',
      render: (row) => (
        <div className="whitespace-nowrap">
          <p className="text-[12px] text-ink-soft">{row.method}</p>
          <p className="text-[10.5px] text-ink-muted">{row.provider}</p>
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
      key: 'fee',
      header: 'Fee',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-ink-muted">
          {formatCurrency(row.fee, row.currency, { compact: row.fee > 99999, decimals: row.fee < 100 ? 2 : 0 })}
        </span>
      ),
    },
    {
      key: 'net',
      header: 'Net',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap font-semibold tabular-nums text-ok">
          {formatCurrency(row.net, row.currency, { compact: row.net > 99999 })}
        </span>
      ),
    },
    {
      key: 'paidAt',
      header: 'Paid',
      render: (row) => (
        <span className="whitespace-nowrap text-ink-muted">{row.paidAt ? formatDate(row.paidAt) : '—'}</span>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Payments" subtitle="Every guest payment, its processing fee and net settlement." />

      <Alert variant="info" icon={<ShieldCheck className="size-4" aria-hidden="true" />}>
        Card numbers are never stored or displayed — payments are referenced by provider token only.
      </Alert>

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={withReset(setSearch)}
            searchPlaceholder="Search by guest, reference or booking…"
            total={data?.total}
            noun="payment"
            filters={[
              { id: 'status', value: status, onChange: withReset(setStatus), options: PAYMENT_STATUSES, label: 'Status' },
              { id: 'method', value: method, onChange: withReset(setMethod), options: ['All', ...PAYMENT_METHODS], label: 'Method' },
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
