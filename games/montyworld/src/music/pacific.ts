import type { RegionTune } from './region-tune';

/**
 * The Pacific's version of Monty on the Run's tune. Hubbard's tune is in G minor with chromatic colour; Hawaii bends it to G major, the sunny scale of the islands' songs: the tune's own G, A, B, C, D, E and F# stay, and the
 * notes between them move up to the next (G# to A, the minor third Bb to B, C# to D, the minor sixth Eb to E, the minor seventh F to F#). So the minor tune turns bright, with no pentatonic gap (China's and Japan's are) and
 * every minor colour gone.
 */

/** Semitones above G: G# up to A, Bb up to B, C# up to D, Eb up to E, F up to F#. */
const SHIFT = [0, +1, 0, +1, 0, 0, +1, 0, +1, 0, +1, 0] as const;

/**
 * A ukulele for the lead (the instruments the melody is played on: the main theme 0, the run 4 and 5, the second theme 15): a square-ish pulse with no attack, a quick decay and no sustain, so every note is a pluck
 * and a held one dies away. The intro's soft lead (9), the stabs, the drums and the bass are Hubbard's.
 */
const UKULELE = { pulseWidth: 0x0800, control: 0x41, attackDecay: 0x09, sustainRelease: 0x20, vibrato: 0, pulseSweep: 0 } as const;
const LEAD_INSTRUMENTS = [0, 4, 5, 15] as const;

export const PACIFIC: RegionTune = {
  id: 'pacific',
  tonic: 7,
  shift: SHIFT,
  instruments: LEAD_INSTRUMENTS.map((instrument) => ({ instrument, set: UKULELE })),
  breaks: [],
};
