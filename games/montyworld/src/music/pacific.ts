import type { RegionTune } from './region-tune';

/**
 * The Pacific's version of Monty on the Run's tune, kept as subtle as Moscow's and with one clear colour, Hawaii: Hubbard's melody, harmony and drums (his patterns, his tempo) with
 *
 * - **a ukulele lead**: the theme's two instruments (the main theme 0 and the second theme 15) are a bright pluck, an instant attack and a short decay to a quiet ring, no vibrato;
 * - **the steel guitar on the held notes**: the long notes Hubbard plays on instrument 6 are a steel guitar (a soft attack, a held sustain, a wide slow vibrato), and a note of eight ticks or more that is approached from below
 *   slides up into its pitch (Hubbard's own slide, region-tune.ts `scoop`), the steel's signature;
 * - **a softer, lighter drum mix**: his drum instruments with shorter, quieter noise and thud, in his own patterns;
 * - the minor tune turns to the sunny mixolydian (the minor third and sixth go up: the major third B, the major sixth E; the minor seventh F stays, the leading note F# stays), lead and bass both.
 *
 * Nothing else is rewritten: the introduction is his note for note, the backing stabs and runs, and the breakdown are his.
 */

/** Semitones above G: G# up to A, Bb up to B, C# up to D, Eb up to E. */
const SHIFT = [0, +1, 0, +1, 0, 0, +1, 0, +1, 0, 0, 0] as const;

/** A ukulele for the theme (0 and 15): a pulse with an instant attack and a quick decay to a quiet ring (the sustain keeps the notes the tune ties together sounding), no vibrato, no sweep. */
const UKULELE = { pulseWidth: 0x0800, control: 0x41, attackDecay: 0x08, sustainRelease: 0x30, vibrato: 0, pulseSweep: 0 } as const;
/** A steel guitar for the held notes (instrument 6): a soft attack, a held sustain, the widest slow vibrato the driver has in its small table. */
const STEEL = { pulseWidth: 0x0a00, control: 0x41, attackDecay: 0x36, sustainRelease: 0x86, vibrato: 3, pulseSweep: 0 } as const;
/** The drums, softer: shorter noise (1, 3, 11) and a shorter thud (14). */
const SOFT_1 = { attackDecay: 0x01, sustainRelease: 0x05 } as const;
const SOFT_3 = { attackDecay: 0x07, sustainRelease: 0x05 } as const;
const SOFT_11 = { attackDecay: 0x08, sustainRelease: 0x06 } as const;
const SOFT_14 = { attackDecay: 0x05, sustainRelease: 0x08 } as const;

export const PACIFIC: RegionTune = {
  id: 'pacific',
  tonic: 7,
  shift: SHIFT,
  scoop: { minTicks: 8, maxTicks: 32, below: 2 },
  instruments: [
    { instrument: 0, set: UKULELE }, { instrument: 15, set: UKULELE },
    { instrument: 6, set: STEEL },
    { instrument: 1, set: SOFT_1 }, { instrument: 3, set: SOFT_3 }, { instrument: 11, set: SOFT_11 }, { instrument: 14, set: SOFT_14 },
  ],
  breaks: [],
};
