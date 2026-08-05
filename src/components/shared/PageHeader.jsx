import { cn } from '@/utils/classNames';

/**
 * Screen heading.
 *
 * The serif italic title is lifted straight from the Figma admin design, where
 * "Dashboard Overview" is set in the same face as the "Alotel" wordmark.
 *
 * @param {{ title: string, subtitle?: string, meta?: React.ReactNode, actions?: React.ReactNode }} props
 */
export const PageHeader = ({ title, subtitle, meta, actions, className }) => (
  <header className={cn('flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between', className)}>
    <div className="min-w-0">
      <h1 className="page-title text-[20px] sm:text-[23px]">{title}</h1>
      {subtitle && <p className="mt-1 text-[12.5px] text-ink-soft">{subtitle}</p>}
      {meta && <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">{meta}</div>}
    </div>

    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);
