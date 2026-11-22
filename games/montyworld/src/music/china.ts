import type { RegionTune } from './region-tune';

/**
 * China's version of Monty on the Run's tune, a light flavour on Hubbard's own: the lead leans to the major pentatonic on G (G A B D E, the scale
 * of the old Chinese tunes), the bass and the drums stay Hubbard's. A lead note moves to the nearest note of the pentatonic (G# to A, the minor third
 * Bb up to B, the fourth C up to D and C# with it, the minor sixth Eb up to E, the minor seventh F down to E, the leading note F# up to G), but only where
 * the result is consonant with the bass under it (region-tune.ts), so the tune keeps its own notes wherever the bend would clash. The introduction is
 * Hubbard's note for note.
 */

/** Semitones above G: G# goes up to A, Bb to B, C to D, C# to D, Eb to E, F down to E, F# up to G. */
const SHIFT = [0, +1, 0, +1, 0, +2, +1, 0, +1, 0, -1, +1] as const;
const KEEP = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as const;

/**
 * A bell-like pluck for the lead (the instruments the melody is played on: the main theme 0, the run 4 and 5, the second theme 15): a triangle wave
 * (soft, round, like a struck wood or a pipa's high string), an instant attack, a medium decay to a quiet sustain, no vibrato. The intro's soft lead (9),
 * the stabs, the drums and the bass are Hubbard's.
 */
const BELL = { pulseWidth: 0x0800, control: 0x11, attackDecay: 0x09, sustainRelease: 0x34, vibrato: 0, pulseSweep: 0 } as const;
const LEAD_INSTRUMENTS = [0, 4, 5, 15] as const;

export const CHINA: RegionTune = {
  id: 'china',
  tonic: 7,
  shift: SHIFT,
  bassShift: KEEP,
  instruments: LEAD_INSTRUMENTS.map((instrument) => ({ instrument, set: BELL })),
  breaks: [],
};
