import { cn } from '@/utils/classNames';
import { getInitials } from '@/utils/format';

const SIZES = {
  xs: 'size-6 text-[9px]',
  sm: 'size-7 text-[10px]',
  md: 'size-9 text-[11px]',
  lg: 'size-11 text-[13px]',
};

/**
 * Initials avatar. `color` is a hex from the record so a given person keeps a
 * stable identity colour across every screen.
 */
export const Avatar = ({ name = '', initials, color = '#12603F', size = 'md', className }) => (
  <span
    aria-hidden="true"
    style={{ backgroundColor: `${color}1F`, color, borderColor: `${color}3D` }}
    className={cn(
      'inline-flex shrink-0 items-center justify-center rounded-full border font-bold',
      SIZES[size] ?? SIZES.md,
      className,
    )}
  >
    {initials ?? getInitials(name)}
  </span>
);

/** Avatar + name + secondary line — the identity cell used in every table. */
export const AvatarCell = ({ name, initials, color, primary, secondary, size = 'md' }) => (
  <div className="flex min-w-0 items-center gap-2.5">
    <Avatar name={name} initials={initials} color={color} size={size} />
    <div className="min-w-0">
      <p className="truncate text-[12.5px] font-semibold text-ink">{primary ?? name}</p>
      {secondary && <p className="truncate text-[11px] text-ink-muted">{secondary}</p>}
    </div>
  </div>
);
