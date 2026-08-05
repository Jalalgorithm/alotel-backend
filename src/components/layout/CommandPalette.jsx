import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search } from 'lucide-react';
import { cn } from '@/utils/classNames';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useUIStore } from '@/stores/uiStore';
import { useAuth } from '@/features/auth';
import { NAV_ITEMS } from '@/routes/navigation';
import { NAV_ICONS } from './navIcons';

/**
 * ⌘K navigation search.
 *
 * Searches only the destinations the signed-in role can actually open, so it
 * never advertises a screen the guard would refuse.
 */
export const CommandPalette = () => {
  const navigate = useNavigate();
  const { can } = useAuth();
  const isOpen = useUIStore((state) => state.isCommandOpen);
  const close = useUIStore((state) => state.closeCommand);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const panelRef = useClickOutside(close, isOpen);

  const results = useMemo(() => {
    const permitted = NAV_ITEMS.filter((item) => can(item.capability));
    const needle = query.trim().toLowerCase();
    if (!needle) return permitted.slice(0, 8);

    return permitted
      .filter(
        (item) =>
          item.label.toLowerCase().includes(needle) || (item.group ?? '').toLowerCase().includes(needle),
      )
      .slice(0, 8);
  }, [query, can]);

  // Reset each time the palette opens, and focus the field.
  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActiveIndex(0);
    const timer = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const go = (item) => {
    if (!item) return;
    navigate(item.to);
    close();
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % Math.max(1, results.length));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % Math.max(1, results.length));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      go(results[activeIndex]);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="animate-fade-up relative z-10 w-full max-w-lg overflow-hidden rounded-card bg-surface shadow-raised"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search by property, bookings, guests…"
            aria-label="Search the admin portal"
            className="h-12 w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-muted">esc</kbd>
        </div>

        <ul className="scrollbar-slim max-h-72 overflow-y-auto p-1.5">
          {results.length ? (
            results.map((item, index) => {
              const Icon = NAV_ICONS[item.icon];
              const isActive = index === activeIndex;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(item)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-soft',
                    )}
                  >
                    {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{item.label}</span>
                    {item.group && <span className="shrink-0 text-[10.5px] text-ink-muted">{item.group}</span>}
                    {isActive && <CornerDownLeft className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />}
                  </button>
                </li>
              );
            })
          ) : (
            <li className="px-3 py-6 text-center text-[12px] text-ink-muted">
              No screens match “{query}”.
            </li>
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
};
