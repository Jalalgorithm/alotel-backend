import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional class names, letting later Tailwind utilities win over
 * earlier conflicting ones (`px-4` + `px-6` -> `px-6`).
 *
 * @param {...unknown} inputs
 * @returns {string}
 */
export const cn = (...inputs) => twMerge(clsx(inputs));
