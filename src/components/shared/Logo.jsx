import { Link } from 'react-router-dom';
import { cn } from '@/utils/classNames';
import { paths } from '@/routes/paths';

/**
 * The Alotel Spaces mark — the A-frame with an arched doorway.
 *
 * Geometry is taken verbatim from the supplied brand asset
 * (`alotel-logo-only.svg`) with the `<rect>` matte removed, so the mark is
 * transparent and sits on any surface. Strokes use `currentColor`, letting the
 * parent decide the colour.
 */
export const LogoMark = ({ className }) => (
  <svg viewBox="0 0 1000 1000" className={cn('shrink-0', className)} aria-hidden="true" fill="none">
    <path d="M500 120 L820 760 L180 760 Z" stroke="currentColor" strokeWidth="42" strokeLinejoin="round" />
    <circle cx="500" cy="120" r="26" stroke="currentColor" strokeWidth="24" />
    <path
      d="M420 760 L420 500 Q420 430 500 430 Q580 430 580 500 L580 760"
      stroke="currentColor"
      strokeWidth="42"
    />
    <line x1="370" y1="560" x2="630" y2="560" stroke="currentColor" strokeWidth="42" strokeLinecap="round" />
    <circle cx="545" cy="650" r="17" fill="currentColor" />
  </svg>
);

const MARK_SIZES = { sm: 'size-6', md: 'size-7', lg: 'size-9' };
const WORD_SIZES = { sm: 'text-[13px]', md: 'text-[15px]', lg: 'text-[19px]' };
const SUB_SIZES = { sm: 'text-[8px] tracking-[0.26em]', md: 'text-[9px] tracking-[0.28em]', lg: 'text-[10px] tracking-[0.3em]' };

/**
 * Full logo lockup: mark + "Alotel" wordmark with the "SPACES" sub-label.
 *
 * @param {{
 *   tone?: 'brand' | 'light',
 *   size?: 'sm' | 'md' | 'lg',
 *   withText?: boolean,
 *   as?: 'link' | 'div',
 * }} props
 */
export const Logo = ({ tone = 'brand', size = 'md', withText = true, as = 'link', className }) => {
  const isLight = tone === 'light';

  const content = (
    <>
      <LogoMark className={cn(MARK_SIZES[size], isLight ? 'text-white' : 'text-logo')} />

      {withText && (
        <span className="flex min-w-0 flex-col leading-none">
          <span
            className={cn(
              'truncate font-serif font-bold leading-none',
              WORD_SIZES[size],
              isLight ? 'text-white' : 'text-logo-deep',
            )}
          >
            Alotel
          </span>
          <span
            className={cn(
              'mt-0.5 font-sans font-medium uppercase leading-none',
              SUB_SIZES[size],
              isLight ? 'text-white/80' : 'text-logo',
            )}
          >
            Spaces
          </span>
        </span>
      )}
    </>
  );

  const classes = cn('inline-flex items-center gap-2', className);

  if (as === 'div') return <span className={classes}>{content}</span>;

  return (
    <Link to={paths.dashboard} className={classes} aria-label="Alotel Spaces Admin — dashboard">
      {content}
    </Link>
  );
};
