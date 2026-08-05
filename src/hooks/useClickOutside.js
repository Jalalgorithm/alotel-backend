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
      if (ref.current && !ref.current.contains(event.target)) savedHandler.current(event);
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
