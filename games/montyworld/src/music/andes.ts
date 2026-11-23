import type { RegionTune } from './region-tune';

/**
 * The Andes' version of Monty on the Run's tune, kept as subtle as Moscow's and with one clear colour, the panpipes: Hubbard's melody, harmony and drums (his patterns, his driver, his tempo) stay, with
 *
 * - **panpipes** for the lead (the main theme 0, the second theme 15 and the lead's held notes 6): a triangle wave with a soft, breathy attack and a high held sustain, a gentle vibrato; the introduction, the runs, the stabs and the drums are Hubbard's;
 * - **the minor pentatonic on G** (G Bb C D F: semitones 0 3 5 7 10 above the tonic, the scale of the panpipes' songs): the notes between those move to the nearest (G# down to G, the second A up to Bb, the major third B down to Bb,
 *   C# down to C, the sixth Eb down to D, the major sixth E up to F, the leading note F# down to F), the lead only where it is consonant with the bass (region-tune.ts).
 *
 * Nothing is rewritten: no groove of its own, no phrase in place of Hubbard's.
 */

/** Semitones above G: G# down to G, A up to Bb, B down to Bb, C# down to C, Eb down to D, E up to F, F# down to F. */
const SHIFT = [0, -1, +1, 0, -1, 0, -1, 0, -1, +1, 0, -1] as const;

const PANPIPES = { control: 0x11, attackDecay: 0x45, sustainRelease: 0xa8, vibrato: 2, pulseSweep: 0 } as const;
const PANPIPE_INSTRUMENTS = [0, 6, 15] as const;

export const ANDES: RegionTune = {
  id: 'andes',
  tonic: 7,
  shift: SHIFT,
  instruments: PANPIPE_INSTRUMENTS.map((instrument) => ({ instrument, set: PANPIPES })),
  breaks: [],
};
