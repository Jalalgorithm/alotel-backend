import { cn } from '@/utils/classNames';

const VARIANTS = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  gold: 'bg-gold/12 text-gold',
  brand: 'bg-brand-50 text-brand-700',
  neutral: 'bg-black/5 text-ink-soft',
  solid: 'bg-brand-600 text-white',
};

/**
 * Status pill.
 *
 * @param {{ variant?: keyof typeof VARIANTS, dot?: boolean, icon?: React.ReactNode }} props
 *  `dot` prefixes a coloured dot, matching the booking-status column in the design.
 */
export const Badge = ({ variant = 'neutral', dot = false, icon, className, children, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold',
      VARIANTS[variant] ?? VARIANTS.neutral,
      className,
    )}
    {...props}
  >
    {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
    {icon}
    {children}
  </span>
);

/**
 * Maps every domain status string in the app to a badge variant, so a status
 * always looks the same wherever it is rendered.
 */
const STATUS_VARIANT = {
  // Bookings
  Confirmed: 'ok',
  Active: 'ok',
  Completed: 'neutral',
  Pending: 'warn',
  'Pending KYC': 'warn',
  'Awaiting Sign': 'warn',
  Cancelled: 'danger',
  Refunded: 'info',
  // Verification / contracts
  Verified: 'ok',
  'Full KYC': 'info',
  Signed: 'ok',
  Sent: 'info',
  Declined: 'danger',
  Expired: 'warn',
  Overdue: 'danger',
  'Not sent': 'neutral',
  Failed: 'danger',
  Approved: 'ok',
  Rejected: 'danger',
  // Properties / units
  Live: 'ok',
  Published: 'ok',
  Draft: 'neutral',
  Paused: 'warn',
  Archived: 'neutral',
  'Under Review': 'warn',
  Ready: 'ok',
  Occupied: 'info',
  'Needs Cleaning': 'warn',
  Maintenance: 'danger',
  // Payments
  Paid: 'ok',
  Processing: 'info',
  Scheduled: 'info',
  Due: 'warn',
  // Staff
  Inactive: 'danger',
  // Priorities
  High: 'danger',
  Medium: 'warn',
  Low: 'info',
};

/** Convenience wrapper: `<StatusBadge status="Confirmed" />`. */
export const StatusBadge = ({ status, dot = true, className }) => (
  <Badge variant={STATUS_VARIANT[status] ?? 'neutral'} dot={dot} className={className}>
    {status}
  </Badge>
);
