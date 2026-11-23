import type { RegionTune } from './region-tune';

/**
 * Rio's version of Monty on the Run's tune, kept as subtle as Moscow's and with one clear colour, the carnival's brass: Hubbard's melody, harmony and drums (his patterns, his driver, his tempo) stay, with
 *
 * - **the tune lifted to its major**, the carnival's lift (every note not in G major moves up a semitone onto one that is: the minor third Bb up to B, the minor sixth Eb up to E, the minor seventh F up to F#, the flat second G# up to A,
 *   the tritone C# up to D; the notes of G major stay), the lead only where it is consonant with the bass (region-tune.ts);
 * - **a brass lead** (the main theme 0 and the second theme 15): a sawtooth, a quick attack and a held sustain, a light vibrato, the sound of a carnival's trumpets, that slides up into its longer notes from below as a cuica's squeak does (`scoop`).
 *
 * The introduction, the runs, the stabs, the drums and the breakdown are Hubbard's.
 */

/** Semitones above G: the minor ones up a semitone. */
const SHIFT = [0, +1, 0, +1, 0, 0, +1, 0, +1, 0, +1, 0] as const;

const BRASS = { pulseWidth: 0x0800, control: 0x21, attackDecay: 0x24, sustainRelease: 0xa5, vibrato: 1, pulseSweep: 0 } as const;
const BRASS_INSTRUMENTS = [0, 15] as const;

export const RIO: RegionTune = {
  id: 'rio',
  tonic: 7,
  shift: SHIFT,
  scoop: { minTicks: 8, maxTicks: 32, below: 3 },
  instruments: BRASS_INSTRUMENTS.map((instrument) => ({ instrument, set: BRASS })),
  breaks: [],
};
