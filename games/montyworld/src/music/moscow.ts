import { melody, type RegionTune } from './region-tune';

/**
 * Moscow's version of Monty on the Run's tune. Hubbard's tune is in G minor with chromatic colour: the major third (B), the
 * major sixth (E), the raised fourth (C#) and a flat second (G#), against the minor third, minor sixth and plain fourth. Moscow
 * bends those four degrees to the minor scale and keeps the leading note (F#) and the minor seventh (F) as they are, as Russian
 * minor tunes have both: a plain G minor all through, the tune's spikier colours smoothed away.
 */

/** Semitones above G: G# goes up to A, B down to Bb, C# down to C, E down to Eb. */
const SHIFT = [0, +1, 0, 0, -1, 0, -1, 0, 0, -1, 0, 0] as const;

/**
 * A balalaika for the lead (the instruments the tune's melody is played on: the main theme 0, the run 4 and 5, the
 * second theme 15): a narrow pulse, an instant attack and a quick decay to a quiet sustain (the sustain keeps the notes the tune
 * ties together, which never retrigger the envelope, sounding), no vibrato, no pulse sweep. The intro's soft lead (9), the
 * stabs, the drums and the bass are Hubbard's.
 */
const BALALAIKA = { pulseWidth: 0x0380, control: 0x41, attackDecay: 0x09, sustainRelease: 0x30, vibrato: 0, pulseSweep: 0 } as const;
const LEAD_INSTRUMENTS = [0, 4, 5, 15] as const;

/**
 * Korobeiniki's first eight bars (the folk song of the peddlers, public domain, the tune Tetris made famous), in D minor, in
 * the tune's breakdown (pattern $38, the last 256 ticks of it: the lead has only stabs there) over the bass's Dm, C, Gm, Dm
 * (two bars each). A bar is 32 ticks, an eighth note 4: the lengths below are in eighths.
 */
const EIGHTH = 4;
const KOROBEINIKI: readonly (readonly [string, number])[] = ([
  ['A5', 2], ['E5', 1], ['F5', 1], ['G5', 2], ['F5', 1], ['E5', 1],
  ['D5', 2], ['D5', 1], ['F5', 1], ['A5', 2], ['G5', 1], ['F5', 1],
  ['E5', 3], ['F5', 1], ['G5', 2], ['A5', 2],
  ['F5', 2], ['D5', 2], ['D5', 4],
  ['G5', 3], ['Bb5', 1], ['D6', 2], ['C6', 1], ['Bb5', 1],
  ['A5', 3], ['F5', 1], ['A5', 2], ['G5', 1], ['F5', 1],
  ['E5', 2], ['E5', 1], ['F5', 1], ['G5', 2], ['A5', 2],
  ['F5', 2], ['D5', 2], ['D5', 4],
] as const).map(([name, eighths]) => [name, eighths * EIGHTH] as const);

export const MOSCOW: RegionTune = {
  id: 'moscow',
  tonic: 7,
  shift: SHIFT,
  instruments: LEAD_INSTRUMENTS.map((instrument) => ({ instrument, set: BALALAIKA })),
  breaks: [{ pattern: 0x38, events: melody(0, KOROBEINIKI) }],
  asApproved: true,
};
