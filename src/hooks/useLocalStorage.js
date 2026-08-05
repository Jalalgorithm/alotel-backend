import { useCallback, useEffect, useState } from 'react';

/**
 * `useState` backed by localStorage, kept in sync across tabs.
 *
 * @template T
 * @param {string} key
 * @param {T} initialValue
 * @returns {[T, (value: T | ((previous: T) => T)) => void, () => void]}
 */
export const useLocalStorage = (key, initialValue) => {
  const read = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const [value, setValue] = useState(read);

  const setStoredValue = useCallback(
    (next) => {
      setValue((previous) => {
        const resolved = next instanceof Function ? next(previous) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* quota exceeded / storage disabled — keep the in-memory value */
        }
        return resolved;
      });
    },
    [key],
  );

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* no-op */
    }
    setValue(initialValue);
  }, [key, initialValue]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === key) setValue(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, read]);

  return [value, setStoredValue, remove];
};
