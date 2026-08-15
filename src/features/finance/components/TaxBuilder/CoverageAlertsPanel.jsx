import { useState } from 'react';
import { ShieldCheck, TriangleAlert } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useConfirmNoTax, useCoverageAlerts } from '../../hooks/useFinance';

const scopeLabel = (alert) => [alert.city, alert.state, alert.country].filter(Boolean).join(', ');

const AlertRow = ({ alert }) => {
  const { confirmNoTax, isPending } = useConfirmNoTax();
  const [isConfirming, setIsConfirming] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-ink">{scopeLabel(alert)}</p>
          <p className="text-[11px] text-ink-muted">
            {alert.propertyIds.length} propert{alert.propertyIds.length === 1 ? 'y' : 'ies'} priced with no active rule
          </p>
        </div>
        {!isConfirming && (
          <Button size="xs" onClick={() => setIsConfirming(true)}>
            Confirm no tax
          </Button>
        )}
      </div>

      {isConfirming && (
        <div className="mt-2.5 space-y-2">
          <Input
            placeholder="Why does this location have no tax? (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button size="xs" onClick={() => setIsConfirming(false)}>Cancel</Button>
            <Button
              size="xs"
              variant="primary"
              isLoading={isPending}
              disabled={!reason.trim()}
              onClick={() =>
                confirmNoTax(
                  { country: alert.country, state: alert.state, city: alert.city, reason: reason.trim() },
                  { onSuccess: () => setIsConfirming(false) },
                )
              }
            >
              Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Sidebar card — locations a real pricing calculation priced with zero active tax coverage (`GET /properties/taxes/coverage-alerts/`). */
export const CoverageAlertsPanel = () => {
  const { data, isLoading } = useCoverageAlerts();
  const alerts = data?.alerts ?? [];

  return (
    <Card>
      <CardHeader title="Unconfirmed tax coverage" subtitle="Locations that priced a booking with no active rule." />
      <div className="border-t border-line p-4">
        {isLoading ? (
          <Skeleton className="h-16" />
        ) : alerts.length === 0 ? (
          <div className="flex items-start gap-2.5 rounded-lg bg-ok-soft p-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" />
            <p className="text-[12px] leading-5 text-ink-soft">
              Every location that has priced a booking has confirmed coverage. Nothing needs attention.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-warn">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              {alerts.length} location{alerts.length === 1 ? '' : 's'} need review
            </div>
            {alerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)}
          </div>
        )}
      </div>
    </Card>
  );
};
