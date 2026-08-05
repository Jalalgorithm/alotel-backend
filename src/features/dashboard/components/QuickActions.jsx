import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Plus, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';

const ACTIONS = [
  {
    id: 'add-property',
    icon: Plus,
    title: 'Add New Property',
    description: 'Create and publish a new property listing',
    to: paths.propertyNew,
    capability: CAPABILITIES.propertiesManage,
  },
  {
    id: 'view-bookings',
    icon: CalendarCheck,
    title: 'View Bookings',
    description: 'View and manage guest bookings',
    to: paths.bookings,
    capability: CAPABILITIES.bookingsView,
  },
  {
    id: 'add-staff',
    icon: UserPlus,
    title: 'Add Staff',
    description: 'Invite staff and assign roles',
    to: paths.staff,
    capability: CAPABILITIES.staffManage,
  },
];

/** The three-up shortcut row beneath the KPIs. */
export const QuickActions = () => {
  const { can } = useAuth();
  const visible = ACTIONS.filter((action) => can(action.capability));

  if (!visible.length) return null;

  return (
    <section>
      <h2 className="text-[14px] font-semibold text-ink">Quick Actions</h2>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((action) => (
          <Card key={action.id} className="transition-shadow hover:shadow-raised">
            <Link to={action.to} className="flex items-center gap-3 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50">
                <action.icon className="size-4 text-brand-600" aria-hidden="true" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-ink">{action.title}</span>
                <span className="block truncate text-[11px] text-ink-muted">{action.description}</span>
              </span>

              <ArrowRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
};
