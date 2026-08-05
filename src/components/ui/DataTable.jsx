import { cn } from '@/utils/classNames';
import { TableSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

/**
 * The table used by every list screen.
 *
 * Centralising it keeps column chrome, loading, empty and overflow behaviour
 * identical everywhere — and means the horizontal-scroll container is never
 * forgotten, so a wide table scrolls inside its own box instead of pushing the
 * page sideways on small screens.
 *
 * @param {{
 *   columns: Array<{ key: string, header: string, render?: (row) => React.ReactNode,
 *                    className?: string, align?: 'left'|'right'|'center' }>,
 *   rows: Array<object>,
 *   getRowId?: (row) => string,
 *   onRowClick?: (row) => void,
 *   isLoading?: boolean,
 *   emptyTitle?: string,
 *   emptyDescription?: string,
 *   emptyAction?: React.ReactNode,
 * }} props
 */
export const DataTable = ({
  columns = [],
  rows = [],
  getRowId = (row) => row.id,
  onRowClick,
  isLoading = false,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  className,
}) => {
  if (isLoading) return <TableSkeleton columns={columns.length} />;

  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' };

  return (
    <div className={cn('table-scroll', className)}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={cn(alignClass[column.align] ?? 'text-left', column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowId(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn('transition-colors', onRowClick && 'cursor-pointer')}
            >
              {columns.map((column) => (
                <td key={column.key} className={cn(alignClass[column.align] ?? 'text-left', column.className)}>
                  {column.render ? column.render(row) : (row[column.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
