import { Check, Lock, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRoles, useStaff } from '../hooks/usePeople';
import { PERMISSION_MATRIX } from '@/lib/mock/people';

const Allowed = ({ value, hardDenied }) => (
  <span
    className={
      value
        ? 'inline-flex size-5 items-center justify-center rounded-full bg-ok-soft text-ok'
        : 'inline-flex size-5 items-center justify-center rounded-full bg-danger-soft text-danger'
    }
    title={hardDenied ? 'Denied at every level' : value ? 'Allowed' : 'Not allowed'}
  >
    {value ? <Check className="size-3" aria-hidden="true" /> : <X className="size-3" aria-hidden="true" />}
    <span className="sr-only">{value ? 'Allowed' : 'Not allowed'}</span>
  </span>
);

/** Role reference and the permission matrix. */
export const RolesPage = () => {
  const { data: roles = [], isLoading } = useRoles();
  const { data: staff = [] } = useStaff();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roles & Permissions"
        subtitle="What each level can reach. Enforced by the route guard, not just the sidebar."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-44 rounded-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id} className="p-4">
              <div className="flex items-center gap-2.5">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: role.color }} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-ink">{role.name}</p>
                  <p className="text-[10.5px] text-ink-muted">
                    {role.level} · {role.equivalent}
                  </p>
                </div>
              </div>

              <p className="mt-2.5 text-[11.5px] leading-5 text-ink-soft">{role.description}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="neutral">{role.capabilities.length} permissions</Badge>
                <Badge variant="brand">
                  {staff.filter((member) => member.role === role.id && member.status === 'Active').length} active
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader title="Permission matrix" subtitle="A tick means the level can perform the action." />

        <div className="table-scroll border-t border-line">
          <table className="data-table">
            <thead>
              <tr>
                <th>Permission</th>
                <th className="text-center">Level 1 — Super Admin</th>
                <th className="text-center">Level 2 — Facility Manager</th>
                <th className="text-center">Level 3 — Cleaner</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.permission}>
                  <td className="font-medium text-ink">
                    <span className="inline-flex items-center gap-1.5">
                      {row.hardDenied && <Lock className="size-3 text-danger" aria-hidden="true" />}
                      {row.permission}
                    </span>
                  </td>
                  <td className="text-center">
                    <Allowed value={row.L1} hardDenied={row.hardDenied} />
                  </td>
                  <td className="text-center">
                    <Allowed value={row.L2} hardDenied={row.hardDenied} />
                  </td>
                  <td className="text-center">
                    <Allowed value={row.L3} hardDenied={row.hardDenied} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Alert variant="error" title="Card numbers are denied at every level" icon={<Lock className="size-4" aria-hidden="true" />}>
        This is not a permission that can be granted. No screen in the portal is capable of rendering a full card
        number — the data never leaves the payment provider.
      </Alert>
    </div>
  );
};
