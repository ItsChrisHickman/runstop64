import type { RegionTune } from './region-tune';

/**
 * Japan's version of Monty on the Run's tune, a light flavour on Hubbard's own: the lead sheds the tune's chromatic notes towards the koto's scale
 * (Hirajoshi, G A Bb D Eb, with the tune's own C and F kept), the bass and the drums stay Hubbard's. The chromatic notes move to the nearest (G# down to G,
 * the major third B down to Bb, C# up to D, the major sixth E down to Eb, the leading note F# up to G), and only where the result is consonant with the bass
 * under it (region-tune.ts). The introduction is Hubbard's note for note.
 */

/** Semitones above G: G# goes down to G, B down to Bb, C# up to D, E down to Eb, F# up to G. */
const SHIFT = [0, -1, 0, 0, -1, 0, +1, 0, 0, -1, 0, +1] as const;
const KEEP = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as const;

/**
 * A koto for the lead (the instruments the melody is played on: the main theme 0, the run 4 and 5, the second theme 15): a narrow pulse, an instant
 * attack and a quick decay to a quiet sustain, no vibrato, a plucked string. The intro's soft lead (9), the stabs, the drums and the bass are Hubbard's.
 */
const KOTO = { pulseWidth: 0x0500, control: 0x41, attackDecay: 0x08, sustainRelease: 0x32, vibrato: 0, pulseSweep: 0 } as const;
const LEAD_INSTRUMENTS = [0, 4, 5, 15] as const;

export const JAPAN: RegionTune = {
  id: 'japan',
  tonic: 7,
  shift: SHIFT,
  bassShift: KEEP,
  instruments: LEAD_INSTRUMENTS.map((instrument) => ({ instrument, set: KOTO })),
  breaks: [],
};
