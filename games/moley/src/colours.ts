/**
 * The colours of our own screens in Moley Christmas (the pause screen, the map, the continue panels), as indexes of the Spectrum palette
 * the renderer has (palette.ts: `bright * 8 + colour`): only the Spectrum's own, bright and normal.
 */
import type { PauseColours } from '../../shared/native/pause';

export const SPECTRUM = {
  black: 0,
  /** blue: the dark of a screen not seen, the dividers */
  dim: 1,
  /** white: ordinary text */
  text: 7,
  /** bright blue, bright green, bright cyan, bright yellow, bright white */
  blue: 9,
  good: 12,
  cyan: 13,
  yellow: 14,
  white: 15,
} as const;

/** The pause screen's and the panels' colours. */
export const PAUSE_COLOURS: PauseColours = {
  black: SPECTRUM.black,
  yellow: SPECTRUM.yellow,
  white: SPECTRUM.white,
  lgrey: SPECTRUM.text,
  dgrey: SPECTRUM.dim,
  grey: SPECTRUM.dim,
  cyan: SPECTRUM.cyan,
  lgreen: SPECTRUM.good,
};
