/**
 * Tailwind CSS v4 configuration.
 *
 * v4 is CSS-first: design tokens live in the `@theme` block of
 * `src/assets/styles/index.css`, which loads this file via `@config`.
 * Source globs, safelisting and plugins belong here.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
};
