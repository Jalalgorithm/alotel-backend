import { useEffect } from 'react';

/**
 * Bind a global hotkey. Used for the ⌘K / Ctrl-K command search in the topbar.
 *
 * @param {string} key single character, case-insensitive (e.g. 'k')
 * @param {() => void} handler
 * @param {{ meta?: boolean, ctrl?: boolean }} [options] modifier requirements
 */
export const useHotkey = (key, handler, options = {}) => {
  const { meta = true, ctrl = true } = options;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;

      const modifierHeld = (meta && event.metaKey) || (ctrl && event.ctrlKey);
      if (!modifierHeld) return;

      event.preventDefault();
      handler();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, handler, meta, ctrl]);
};
