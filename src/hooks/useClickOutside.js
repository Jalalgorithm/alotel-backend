import { useEffect, useRef } from 'react';

/**
 * Call `handler` when a pointer event lands outside the returned ref, or when
 * Escape is pressed. Powers dropdowns, the notification tray and the modal.
 *
 * @param {(event: Event) => void} handler
 * @param {boolean} [enabled=true]
 */
export const useClickOutside = (handler, enabled = true) => {
  const ref = useRef(null);
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return undefined;

    const onPointerDown = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      // A click inside a DIFFERENT dialog (e.g. a confirmation modal portaled on
      // top of this one) isn't "outside" — it's inside another modal, which is a
      // DOM sibling rather than a descendant once portaled. Without this check, a
      // nested modal closes its parent on mousedown before its own onClick can
      // fire, since the parent's "outside" check can't see through portals.
      if (event.target.closest?.('[role="dialog"]')) return;
      savedHandler.current(event);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') savedHandler.current(event);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled]);

  return ref;
};
