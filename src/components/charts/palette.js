/**
 * Chart palette.
 *
 * The categorical order below was chosen by running the data-viz validator, not
 * by eye. Ordering is the colour-blind-safety mechanism: the obvious
 * "green, yellow, orange, blue" arrangement FAILS the normal-vision floor
 * because yellow sits next to orange (ΔE 13.7, floor 15). This order separates
 * them and clears every gate against the white card surface:
 *
 *   lightness band  PASS
 *   chroma floor    PASS
 *   CVD separation  PASS  worst adjacent ΔE 9.1 (protan)
 *   normal-vision   PASS  worst adjacent ΔE 22.9
 *   contrast        WARN  aqua + yellow sit below 3:1
 *
 * The contrast warning is discharged by the "relief rule": every chart using
 * these colours ships visible direct labels (the donut legend prints category
 * and percentage), so colour never carries meaning alone.
 *
 * Assign slots in fixed order and never cycle them — a series keeps its colour
 * even when filters change how many series are on screen.
 */
export const CATEGORICAL = ['#1baf7a', '#eda100', '#2a78d6', '#eb6834'];

/** Reserved neutral for an explicit "Other" bucket — never a series colour. */
export const OTHER = '#8a998f';

/** Chart chrome, matched to the admin surface tokens. */
export const CHROME = {
  grid: '#eef2ea',
  axis: '#d8e0d2',
  ink: '#16211a',
  inkMuted: '#8a998f',
  surface: '#ffffff',
};

/**
 * Single-series emphasis pair: one bar carries the accent, the rest recede.
 * Used by the revenue chart, where the point is "this day", not "these days".
 */
export const EMPHASIS = {
  accent: '#12603f',
  rest: '#d6ede0',
};

/**
 * @param {number} index
 * @returns {string} the categorical slot, or the neutral once slots run out.
 */
export const seriesColor = (index) => CATEGORICAL[index] ?? OTHER;
