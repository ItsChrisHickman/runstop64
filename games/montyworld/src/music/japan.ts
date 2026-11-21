import type { RegionTune } from './region-tune';

/**
 * Japan's version of Monty on the Run's tune. Hubbard's tune is in G minor with chromatic colour; Japan bends it to the Hirajoshi pentatonic on G (G A Bb D Eb: semitones
 * 0 2 3 7 8 above the tonic, the koto's scale). The tune's own G, A, Bb, D and Eb stay; the notes between them move to the nearest (G# down to G, the major third B down to Bb,
 * the fourth C and C# up to D, the major sixth E down to Eb, the minor seventh F and the leading note F# up to G). A semitone is left in it (A to Bb, D to Eb), the sound of the koto.
 */

/** Semitones above G: G# goes down to G, B down to Bb, C up to D, C# up to D, E down to Eb, F up to G, F# up to G. */
const SHIFT = [0, -1, 0, 0, -1, +2, +1, 0, 0, -1, +2, +1] as const;

/**
 * A shakuhachi for the theme (the main theme 0 and the second theme 15): a triangle wave with a soft attack, a long sustain and a slow vibrato, a breathy flute. A koto for the runs (4 and 5):
 * a narrow plucked pulse with a quick decay and a little sweep. The intro's soft lead (9), the stabs, the drums and the bass are Hubbard's.
 */
const SHAKUHACHI = { control: 0x11, attackDecay: 0x38, sustainRelease: 0xa8, vibrato: 2, pulseSweep: 0 } as const;
const KOTO = { pulseWidth: 0x0500, control: 0x41, attackDecay: 0x08, sustainRelease: 0x42, vibrato: 0, pulseSweep: 0 } as const;

export const JAPAN: RegionTune = {
  id: 'japan',
  tonic: 7,
  shift: SHIFT,
  instruments: [
    { instrument: 0, set: SHAKUHACHI }, { instrument: 15, set: SHAKUHACHI },
    { instrument: 4, set: KOTO }, { instrument: 5, set: KOTO },
  ],
  breaks: [],
};
