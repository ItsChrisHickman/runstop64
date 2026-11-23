import { groove, melody, type Hit, type RegionTune } from './region-tune';

/**
 * The Pacific's version of Monty on the Run's tune, made to say islands at once and still be Hubbard's: the lead is a Hawaiian steel guitar that
 * slides up into its notes (Hubbard's own slide, region-tune.ts `scoop`) with a gentle vibrato, the backing is strummed like a ukulele, the drums are
 * softer, and the minor tune turns to the sunny mixolydian (the minor third and sixth go up: the major third B, the major sixth E; the minor seventh F stays,
 * the leading note F# stays), for the bass and the lead both, a hula's heartbeat on the noise channel, and a roll down the chords in the breakdown (pattern $38).
 * Hubbard's notes are otherwise kept; the introduction is his note for note, in the steel guitar's sound.
 */

/** Semitones above G: G# up to A, Bb up to B, C# up to D, Eb up to E. */
const SHIFT = [0, +1, 0, +1, 0, 0, +1, 0, +1, 0, 0, 0] as const;

/** A steel guitar for the theme (the main theme 0 and the second theme 15): a pulse a little wider than square, a soft attack, a held sustain, a slow vibrato. */
const STEEL = { pulseWidth: 0x0a00, control: 0x41, attackDecay: 0x36, sustainRelease: 0x86, vibrato: 2, pulseSweep: 0 } as const;
/** A ukulele for the runs (4 and 5): a pulse with no attack, a quick decay and no sustain, so every note is a pluck. */
const UKULELE = { pulseWidth: 0x0800, control: 0x41, attackDecay: 0x09, sustainRelease: 0x20, vibrato: 0, pulseSweep: 0 } as const;
/** The backing stabs (2) strummed: a pluck whose pitch jumps an octave every frame (the driver's arpeggio effect), a quick ring of strings. */
const STRUM = { pulseWidth: 0x0800, control: 0x41, attackDecay: 0x08, sustainRelease: 0x20, effects: 4 } as const;
/** The drums, softer: shorter noise (1, 3, 11) and a shorter thud (14). */
const SOFT_1 = { attackDecay: 0x01, sustainRelease: 0x05 } as const;
const SOFT_3 = { attackDecay: 0x07, sustainRelease: 0x05 } as const;
const SOFT_11 = { attackDecay: 0x08, sustainRelease: 0x06 } as const;
const SOFT_14 = { attackDecay: 0x05, sustainRelease: 0x08 } as const;

/** The introduction's soft lead (9) and the lead of the first part (6) are the steel guitar too, so the islands are there from the first bar. */
const STEEL_INSTRUMENTS = [0, 6, 9, 15] as const;

/** A hula's heartbeat on the noise channel: a soft ipu thud on the beat, a shaker between, a crack at the end of every fourth bar. */
const DRUMS: Readonly<Record<string, Hit>> = { S: [14, 47], t: [1, 91], c: [3, 47] };
const BAR = 'S.t.tt.t';
const FILL = 'S.t.cc.t';
const HULA = [BAR, BAR, BAR, FILL, BAR, BAR, BAR, FILL].join('');

/** A roll down a chord, 12 + 12 + 8 ticks, twice in each two bars (64 ticks): a strummed ukulele's glide, played by the steel guitar over the breakdown's chords. */
const ROLL = (a: string, b: string, c: string): readonly (readonly [string, number])[] => [[a, 12], [b, 12], [c, 8], [a, 12], [b, 12], [c, 8]];
const ROLLS = [...ROLL('F6', 'D6', 'A5'), ...ROLL('D6', 'C6', 'G5'), ...ROLL('D6', 'B5', 'A5'), ...ROLL('F6', 'D6', 'A5')];

export const PACIFIC: RegionTune = {
  id: 'pacific',
  tonic: 7,
  shift: SHIFT,
  scoop: { minTicks: 6, maxTicks: 16, below: 2 },
  instruments: [
    ...STEEL_INSTRUMENTS.map((instrument) => ({ instrument, set: STEEL })),
    { instrument: 4, set: UKULELE }, { instrument: 5, set: UKULELE },
    { instrument: 2, set: STRUM },
    { instrument: 1, set: SOFT_1 }, { instrument: 3, set: SOFT_3 }, { instrument: 11, set: SOFT_11 }, { instrument: 14, set: SOFT_14 },
  ],
  breaks: [{ pattern: 0x38, events: melody(0, ROLLS) }, { pattern: 0x39, events: groove(HULA, DRUMS) }, { pattern: 0x01, events: groove(BAR + FILL, DRUMS) }],
};
