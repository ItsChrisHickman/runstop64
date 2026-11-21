import type { RegionTune } from './region-tune';

/**
 * Siberia's version of Monty on the Run's tune. Hubbard's tune is in G minor with chromatic colour (the major third B, the major sixth
 * E, the raised fourth C# and a flat second G#, against the minor third, minor sixth and plain fourth). Siberia bends it to G Dorian, the
 * mode of the long Russian songs: the minor third stays, the sixth is always the major one (E, as Hubbard has it in his brighter
 * moments), the fourth is plain, the second is plain, and the leading note and the minor seventh stay as they are. So the tune is
 * minor with a lift in it, under a wider sky than Moscow's plain minor.
 */

/** Semitones above G: G# goes up to A, B down to Bb, C# down to C, Eb up to E (the Dorian sixth). */
const SHIFT = [0, +1, 0, 0, -1, 0, -1, 0, +1, 0, 0, 0] as const;

/**
 * A pipe for the lead (the instruments the melody is played on: the main theme 0, the run 4 and 5, the second theme 15): a triangle wave, a
 * soft attack and a long held sustain, no vibrato, no pulse sweep. A hollow flute of the taiga against Moscow's plucked balalaika; the
 * intro's soft lead (9), the stabs, the drums and the bass are Hubbard's.
 */
const PIPE = { control: 0x11, attackDecay: 0x28, sustainRelease: 0xa4, vibrato: 0, pulseSweep: 0 } as const;
const LEAD_INSTRUMENTS = [0, 4, 5, 15] as const;

export const SIBERIA: RegionTune = {
  id: 'siberia',
  tonic: 7,
  shift: SHIFT,
  instruments: LEAD_INSTRUMENTS.map((instrument) => ({ instrument, set: PIPE })),
  breaks: [],
};
