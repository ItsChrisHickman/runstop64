/**
 * The beeper effects as audio: the five the game uses (data/sounds-data.ts, the speaker's flips as the original did them) turned
 * into samples at the browser's sample rate by c64kit's `renderToggles`.
 */
import { renderToggles, SPECTRUM_48K_CLOCK } from 'c64kit';
import { EFFECTS } from './data';

/** The effects the game calls, by the number it gives (`Game.sounds`): 0 death, 1 time-out noise, 2 pickup, 3 energy hit, 5 mechanism. */
export const EFFECT_IDS: readonly number[] = EFFECTS.map((e) => e.id);

/** The samples of effect `id` at `sampleRate` (peaks at 1 before the game's volume), or null for a number that is not an effect. */
export function effectSamples(id: number, sampleRate: number): Float32Array | null {
  const effect = EFFECTS.find((e) => e.id === id);
  return effect === undefined ? null : renderToggles(effect, sampleRate);
}

/** How long effect `id` blocks the original game, in seconds (0 for a number that is not an effect). */
export function effectSeconds(id: number): number {
  const effect = EFFECTS.find((e) => e.id === id);
  return effect === undefined ? 0 : (effect.lead + effect.tail + effect.gaps.reduce((a, g) => a + g, 0)) / SPECTRUM_48K_CLOCK;
}
