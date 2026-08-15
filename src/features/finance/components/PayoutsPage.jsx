import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { AvatarCell } from '@/components/ui/Avatar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuth } from '@/features/auth';
import { usePayouts, useReleasePayout } from '../hooks/useFinance';
import { formatCurrency, formatDate } from '@/utils/format';
import { PAYOUT_STATUSES } from '@/lib/mock/finance';
import { SchedulePayoutModal } from './SchedulePayoutModal';

/**
 * Payouts to property hosts — `payments.Payout`. Scheduling and releasing are
 * both Super Admin only server-side; there's no capability that distinguishes
 * Super Admin from Facility Manager, so both actions gate on `role === 'L1'`
 * directly, the same pattern the Topbar already uses for role-specific UI.
 */
export const PayoutsPage = () => {
  const { role } = useAuth();
  const isSuperAdmin = role === 'L1';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [isScheduling, setIsScheduling] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching } = usePayouts({ query: debouncedSearch, status, pageSize: 50 });
  const { releasePayout, pendingId } = useReleasePayout();

  const columns = [
    {
      key: 'property',
      header: 'Property',
      render: (row) => <AvatarCell name={row.propertyName} primary={row.propertyName} secondary={row.hostEmail} size="sm" />,
    },
    {
      key: 'period',
      header: 'Period',
      render: (row) => (
        <span className="whitespace-nowrap text-ink-soft">
          {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap font-bold tabular-nums text-ok">
          {formatCurrency(row.amount, row.currency, { compact: row.amount > 99999 })}
        </span>
      ),
    },
    {
      key: 'releasedAt',
      header: 'Released',
      render: (row) => <span className="whitespace-nowrap text-ink-muted">{row.releasedAt ? formatDate(row.releasedAt) : '—'}</span>,
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        isSuperAdmin && row.status === 'Pending' ? (
          <Button size="xs" variant="primary" isLoading={pendingId === row.id} onClick={() => releasePayout(row.id)}>
            Release now
          </Button>
        ) : null,
    },
  ];

  const rows = data?.items ?? [];
  const scheduled = rows.filter((row) => row.status === 'Pending').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payouts"
        subtitle="Settlements to property hosts, in arrears."
        actions={
          <>
            <span className="rounded-full bg-info-soft px-3 py-1.5 text-[11.5px] font-semibold text-info">
              {scheduled} awaiting release
            </span>
            {isSuperAdmin && (
              <Button variant="primary" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={() => setIsScheduling(true)}>
                Schedule payout
              </Button>
            )}
          </>
        }
      />

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by property or host email…"
            total={data?.total}
            noun="payout"
            filters={[{ id: 'status', value: status, onChange: setStatus, options: PAYOUT_STATUSES, label: 'Status' }]}
          />
        </div>

        <div className="border-t border-line">
          <DataTable columns={columns} rows={rows} isLoading={isFetching && !data} emptyTitle="No payouts match these filters" />
        </div>
      </Card>

      {isSuperAdmin && <SchedulePayoutModal isOpen={isScheduling} onClose={() => setIsScheduling(false)} />}
    </div>
  );
};
