import { groove, melody, type Hit, type RegionTune } from './region-tune';

/**
 * Siberia's version of Monty on the Run's tune: cold, and on a train, on Hubbard's own driver at his tempo. Hubbard's tune is in G minor with chromatic colour (the major third B, the major sixth
 * E, the raised fourth C# and a flat second G#, against the minor third, minor sixth and plain fourth). Siberia bends it to G Dorian, the
 * mode of the long Russian songs: the minor third stays, the sixth is always the major one (E, as Hubbard has it in his brighter
 * moments), the fourth is plain, the second is plain, and the leading note and the minor seventh stay as they are, the lead only where it is consonant with the bass
 * (region-tune.ts). The introduction's notes are Hubbard's, but in Siberia's instruments from its first bar:
 *
 * - **ice** for the lead (the introduction's soft lead, the main theme and the second theme): a triangle struck like a glass, a long ring, no vibrato; the runs shimmer
 *   (a triangle whose pitch jumps an octave every frame, the driver's arpeggio effect); the backing stabs are dry ticks;
 * - **a train on the noise channel**: the wheels over the rail joints, di-di-dum, di-di-dum, a steady clickety-clack, and a rush of clicks at the end of every fourth bar, in the two
 *   patterns the groove is made of (the drum fills and the introduction's are Hubbard's);
 * - **a whistle**: in the tune's breakdown (pattern $38) the lead is a train's whistle in the distance, two calls to every two bars (a long note and a falling short one) over the bass's chords,
 *   with the silence of the plain between them. A call of a whistle, not a quoted tune.
 */

/** Semitones above G: G# goes up to A, B down to Bb, C# down to C, Eb up to E (the Dorian sixth). */
const SHIFT = [0, +1, 0, 0, -1, 0, -1, 0, +1, 0, 0, 0] as const;

const ICE = { pulseWidth: 0x0800, control: 0x11, attackDecay: 0x19, sustainRelease: 0xa9, vibrato: 0, pulseSweep: 0 } as const;
const SHIMMER = { pulseWidth: 0x0800, control: 0x11, attackDecay: 0x09, sustainRelease: 0x59, vibrato: 0, pulseSweep: 0, effects: 4 } as const;
const TICK = { attackDecay: 0x04, sustainRelease: 0x00 } as const;
const ICE_INSTRUMENTS = [0, 6, 9, 15] as const;

const DRUMS: Readonly<Record<string, Hit>> = {
  t: [1, 91], // a click of the rail joint
  K: [14, 47], // the dum of the wheel over it
  c: [3, 47], // a clack
};
/** A bar is 8 steps of 2 ticks: di-di-dum, di-di-dum. */
const BAR = 'ttK.ttK.';
const RUSH = 'ttK.ttKc';
const TRAIN = [BAR, BAR, BAR, RUSH, BAR, BAR, BAR, RUSH].join('');

/**
 * The whistle over the breakdown's bass (Dm, C, Gm, Dm, two bars each: 64 ticks): a long call on a chord note, silence, a shorter one falling to another,
 * silence (20 + 12 + 16 + 16 ticks).
 */
const CALL = (long: string, short: string): readonly (readonly [string, number])[] => [[long, 20], ['-', 12], [short, 16], ['-', 16]];
const WHISTLE = [...CALL('A5', 'F5'), ...CALL('G5', 'Eb5'), ...CALL('D6', 'Bb5'), ...CALL('A5', 'F5')];

export const SIBERIA: RegionTune = {
  id: 'siberia',
  tonic: 7,
  shift: SHIFT,
  instruments: [
    ...ICE_INSTRUMENTS.map((instrument) => ({ instrument, set: ICE })),
    { instrument: 4, set: SHIMMER }, { instrument: 5, set: SHIMMER },
    { instrument: 2, set: TICK },
  ],
  breaks: [
    { pattern: 0x38, events: melody(0, WHISTLE) },
    { pattern: 0x39, events: groove(TRAIN, DRUMS) },
    { pattern: 0x01, events: groove(BAR + RUSH, DRUMS) },
  ],
};
