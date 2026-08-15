import { useEffect, useState } from 'react';

/**
 * A `Date` that updates itself every `intervalMs` — for headers that show a
 * ticking clock rather than the render-time snapshot `new Date()` gives you.
 *
 * @param {number} [intervalMs=1000]
 * @returns {Date}
 */
export const useLiveClock = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
};
