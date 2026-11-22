import type { RegionTune } from './region-tune';

/**
 * The Andes' version of Monty on the Run's tune. Hubbard's tune is in G minor with chromatic colour; the Andes bend it to the minor pentatonic on G (G Bb C D F: semitones 0 3 5 7 10 above the tonic, the scale of the
 * panpipes' songs). The tune's own G, Bb, C, D and F stay; the notes between them move to the nearest (G# down to G, the second A up to Bb, the major third B down to Bb, C# down to C, the sixth Eb down to D, the major sixth
 * E up to F, the leading note F# down to F). No folk melody is quoted.
 */

/** Semitones above G: G# down to G, A up to Bb, B down to Bb, C# down to C, Eb down to D, E up to F, F# down to F. */
const SHIFT = [0, -1, +1, 0, -1, 0, -1, 0, -1, +1, 0, -1] as const;

/**
 * Panpipes for the theme (the main theme 0 and the second theme 15): a triangle wave with a short attack, a high long sustain and a slow vibrato, a hollow breathy note. A charango for the runs (4 and 5): a bright short
 * pulse of a quarter width, no sweep, that rings a little. The intro's soft lead (9), the stabs, the drums and the bass are Hubbard's.
 */
const PANPIPES = { control: 0x11, attackDecay: 0x25, sustainRelease: 0x98, vibrato: 1, pulseSweep: 0 } as const;
const CHARANGO = { pulseWidth: 0x0400, control: 0x41, attackDecay: 0x06, sustainRelease: 0x33, vibrato: 0, pulseSweep: 0 } as const;

export const ANDES: RegionTune = {
  id: 'andes',
  tonic: 7,
  shift: SHIFT,
  instruments: [
    { instrument: 0, set: PANPIPES }, { instrument: 15, set: PANPIPES },
    { instrument: 4, set: CHARANGO }, { instrument: 5, set: CHARANGO },
  ],
  breaks: [],
};
