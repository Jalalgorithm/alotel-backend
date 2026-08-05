import { cn } from '@/utils/classNames';

/** Shimmer placeholder used while queries resolve. */
export const Skeleton = ({ className, ...props }) => (
  <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-black/[0.06]', className)} {...props} />
);

/** Rows matching the footprint of `DataTable`, so lists never jump on load. */
export const TableSkeleton = ({ rows = 6, columns = 5 }) => (
  <div className="divide-y divide-line">
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={rowIndex} className="flex items-center gap-4 px-4 py-3">
        {Array.from({ length: columns }, (_, colIndex) => (
          <Skeleton key={colIndex} className={cn('h-3.5', colIndex === 0 ? 'w-40' : 'flex-1')} />
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton = ({ className }) => (
  <div className={cn('rounded-card border border-line bg-surface p-4', className)}>
    <Skeleton className="h-3 w-24" />
    <Skeleton className="mt-3 h-7 w-28" />
    <Skeleton className="mt-2 h-3 w-32" />
  </div>
);
