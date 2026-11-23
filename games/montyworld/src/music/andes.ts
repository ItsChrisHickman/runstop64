import { groove, melody, type Hit, type RegionTune } from './region-tune';

/**
 * The Andes' version of Monty on the Run's tune, a huayno on Hubbard's own driver at his tempo. Hubbard's tune is in G minor with chromatic colour; the Andes bend
 * it to the minor pentatonic on G (G Bb C D F: semitones 0 3 5 7 10 above the tonic, the scale of the panpipes' songs). The tune's own G, Bb, C, D and F stay; the notes
 * between them move to the nearest (G# down to G, the second A up to Bb, the major third B down to Bb, C# down to C, the sixth Eb down to D, the major sixth
 * E up to F, the leading note F# down to F), the lead only where it is consonant with the bass (region-tune.ts); the introduction's notes are Hubbard's, but in the
 * Andes' instruments from its first bar:
 *
 * - **panpipes** for the lead (the introduction's soft lead, the main theme and the second theme): a triangle wave with a slow, breathy attack, a high held sustain and a vibrato;
 * - **a charango** for the runs and the backing: a bright narrow pluck whose pitch jumps an octave every frame, the strum;
 * - **a huayno on the noise channel**: the bombo's thud on the beat and two quick light taps after it (the huayno's long, short, short), a crack at the end of every
 *   fourth bar, in the two patterns the groove is made of (the drum fills and the introduction's are Hubbard's).
 *
 * - **a quena's descent** in the tune's breakdown (pattern $38): the pentatonic falling over the bass's chords (Dm, C, Gm, Dm, two bars each) to a long note, a phrase of ours.
 *
 * No folk melody is quoted: El Condor Pasa is not clearly free of rights, and no other was checked note for note.
 */

/** Semitones above G: G# down to G, A up to Bb, B down to Bb, C# down to C, Eb down to D, E up to F, F# down to F. */
const SHIFT = [0, -1, +1, 0, -1, 0, -1, 0, -1, +1, 0, -1] as const;

const PANPIPES = { control: 0x11, attackDecay: 0x45, sustainRelease: 0xa8, vibrato: 2, pulseSweep: 0 } as const;
const CHARANGO = { pulseWidth: 0x0400, control: 0x41, attackDecay: 0x06, sustainRelease: 0x33, vibrato: 0, pulseSweep: 0, effects: 4 } as const;
const STRUM = { pulseWidth: 0x0400, control: 0x41, attackDecay: 0x07, sustainRelease: 0x20, effects: 4 } as const;
const PANPIPE_INSTRUMENTS = [0, 6, 9, 15] as const;

const DRUMS: Readonly<Record<string, Hit>> = {
  B: [14, 47, 2], // the bombo on the beat
  t: [1, 91], // a light tap
  c: [3, 47], // a crack
};
/** A bar is 8 steps of 2 ticks: the bombo two steps long, then two light taps, twice. */
const BAR = 'B.ttB.tt';
const FILL = 'B.ttB.cc';
const HUAYNO = [BAR, BAR, BAR, FILL, BAR, BAR, BAR, FILL].join('');

/** The descent: four notes falling, the last held, then the silence of the high plain (64 ticks). */
const FALL = (a: string, b: string, c: string, d: string): readonly (readonly [string, number])[] => [[a, 8], [b, 8], [c, 8], [d, 16], ['-', 24]];
const QUENA = [...FALL('D6', 'C6', 'A5', 'F5'), ...FALL('C6', 'Bb5', 'G5', 'F5'), ...FALL('D6', 'C6', 'Bb5', 'G5'), ...FALL('D6', 'C6', 'A5', 'D5')];

export const ANDES: RegionTune = {
  id: 'andes',
  tonic: 7,
  shift: SHIFT,
  instruments: [
    ...PANPIPE_INSTRUMENTS.map((instrument) => ({ instrument, set: PANPIPES })),
    { instrument: 4, set: CHARANGO }, { instrument: 5, set: CHARANGO },
    { instrument: 2, set: STRUM },
  ],
  breaks: [{ pattern: 0x38, events: melody(0, QUENA) }, { pattern: 0x39, events: groove(HUAYNO, DRUMS) }, { pattern: 0x01, events: groove(BAR + FILL, DRUMS) }],
};
