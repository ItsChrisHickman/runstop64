import type { RegionTune } from './region-tune';

/**
 * China's version of Monty on the Run's tune. Hubbard's tune is in G minor with chromatic colour (the major third B, the major sixth E, the raised
 * fourth C# and a flat second G#, against the minor third, minor sixth and plain fourth). China bends it to the major pentatonic on G (G A B D E), the
 * scale of the old Chinese tunes: the five notes are the tune's own G, A, B, D and E; the notes between them move to the nearest (G# to A, the minor third
 * Bb up to B, the fourth C up to D and C# with it, the minor sixth Eb up to E, the minor seventh F down to E, the leading note F# up to G). So the tune is
 * bright and open, with no semitone left in it.
 */

/** Semitones above G: G# goes up to A, Bb to B, C to D, C# to D, Eb to E, F down to E, F# up to G. */
const SHIFT = [0, +1, 0, +1, 0, +2, +1, 0, +1, 0, -1, +1] as const;

/**
 * A bowed fiddle for the lead (the instruments the melody is played on: the main theme 0, the run 4 and 5, the second theme 15): a sawtooth with a slow
 * attack, a held sustain and a gentle vibrato, no pulse sweep. The erhu against Moscow's plucked balalaika and Siberia's pipe; the intro's soft lead (9), the
 * stabs, the drums and the bass are Hubbard's.
 */
const ERHU = { control: 0x21, attackDecay: 0x48, sustainRelease: 0xa6, vibrato: 3, pulseSweep: 0 } as const;
const LEAD_INSTRUMENTS = [0, 4, 5, 15] as const;

export const CHINA: RegionTune = {
  id: 'china',
  tonic: 7,
  shift: SHIFT,
  instruments: LEAD_INSTRUMENTS.map((instrument) => ({ instrument, set: ERHU })),
  breaks: [],
};
