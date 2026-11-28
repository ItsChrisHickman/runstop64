import type { RegionTune } from './region-tune';

/**
 * The Amazon's version of Monty on the Run's tune (a region of its own since 2026-11-27, Chris: the Andes and the Amazon are "really two areas"), kept as subtle as Moscow's and with one clear colour,
 * the forest's wood: Hubbard's melody, harmony and drums (his patterns, his driver, his tempo) stay, with
 *
 * - **a marimba lead** (the main theme 0 and the second theme 15): a triangle wave struck, an instant attack and a quick decay to a quiet ring, no vibrato, the wooden bars of the river towns' bands
 *   (the Andes' panpipes are the same wave breathed: a slow attack and a held sustain);
 * - **G dorian**, the minor tune with its sixth raised (the minor sixth Eb up to E), the leading note F# down to the flat seventh F, the flat second G# up to A and the tritone C# up to D: G A Bb C D E F, the
 *   lead only where it is consonant with the bass (region-tune.ts).
 *
 * Nothing is rewritten: the introduction, the runs, the stabs, the drums and the breakdown are Hubbard's.
 */

/** Semitones above G: G# up to A, C# up to D, Eb up to E, F# down to F. */
const SHIFT = [0, +1, 0, 0, 0, 0, +1, 0, +1, 0, 0, -1] as const;

const MARIMBA = { control: 0x11, attackDecay: 0x07, sustainRelease: 0x24, vibrato: 0, pulseSweep: 0 } as const;
const MARIMBA_INSTRUMENTS = [0, 15] as const;

export const AMAZON: RegionTune = {
  id: 'amazon',
  tonic: 7,
  shift: SHIFT,
  instruments: MARIMBA_INSTRUMENTS.map((instrument) => ({ instrument, set: MARIMBA })),
  breaks: [],
};
