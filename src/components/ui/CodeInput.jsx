import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/classNames';

/**
 * Fixed-length numeric code entry, rendered as one box per digit.
 *
 * State is held as an array and updated *functionally*. That matters: reading
 * the joined string out of a closure and rebuilding it drops digits whenever
 * keystrokes arrive faster than React re-renders — which is exactly what
 * happens when a password manager or a person types a code quickly.
 *
 * Behaviour: typing advances, backspace on an empty box steps back and clears
 * the previous one, arrows move, and pasting a whole code fills every box.
 *
 * @param {{
 *   length?: number,
 *   disabled?: boolean,
 *   onChange?: (value: string) => void,
 *   onComplete?: (value: string) => void,
 *   label?: string,
 * }} props
 */
export const CodeInput = ({
  length = 6,
  disabled = false,
  onChange,
  onComplete,
  label = 'Verification code',
  className,
}) => {
  const [digits, setDigits] = useState(() => Array(length).fill(''));
  const refs = useRef([]);
  const lastCompleted = useRef(null);

  const value = digits.join('');
  const isFull = digits.every(Boolean);

  // Report upward from an effect so the state updater stays pure.
  useEffect(() => {
    onChange?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!isFull) {
      lastCompleted.current = null;
      return;
    }
    // Only fire once per distinct complete code, so a re-render can't resubmit.
    if (lastCompleted.current === value) return;
    lastCompleted.current = value;
    onComplete?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isFull]);

  /**
   * Focus follows state, rather than being advanced imperatively inside the
   * change handler. Moving focus straight after `setDigits` races the
   * controlled re-render: the next keystroke can land on a box whose value
   * React has not yet committed, which silently scrambles the entered code.
   * Deriving the target from the committed digits makes it deterministic.
   */
  useEffect(() => {
    const firstEmpty = digits.findIndex((digit) => !digit);
    const target = firstEmpty === -1 ? length - 1 : firstEmpty;
    refs.current[target]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (index) => (event) => {
    const typed = event.target.value.replace(/\D/g, '');
    if (!typed) return;

    setDigits((previous) => {
      const next = [...previous];
      // A paste (or fast multi-char input) spreads across the boxes.
      typed
        .split('')
        .slice(0, length - index)
        .forEach((char, offset) => {
          next[index + offset] = char;
        });
      return next;
    });
  };

  const handleKeyDown = (index) => (event) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      setDigits((previous) => {
        const next = [...previous];
        if (next[index]) {
          next[index] = '';
        } else if (index > 0) {
          next[index - 1] = '';
        }
        return next;
      });
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus();
  };

  return (
    <div className={cn('flex justify-between gap-2', className)} role="group" aria-label={label}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          disabled={disabled}
          value={digit}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onFocus={(event) => event.target.select()}
          aria-label={`Digit ${index + 1} of ${length}`}
          className={cn(
            'h-12 w-full min-w-0 rounded-lg border border-line bg-white text-center font-display text-lg font-semibold text-ink',
            'transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15',
            'disabled:bg-black/5',
          )}
        />
      ))}
    </div>
  );
};
