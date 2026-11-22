import { groove, type Hit, type RegionTune } from './region-tune';

/**
 * Rio's version of Monty on the Run's tune, a samba on Hubbard's own driver at his tempo. The tune is lifted to its major, the carnival's lift
 * (every note not in G major moves up a semitone onto one that is: the minor third Bb up to B, the minor sixth Eb up to E, the minor seventh F up to F#, the flat second G# up to A,
 * the tritone C# up to D; the notes of G major stay), the lead lifts only where it is
 * consonant with the bass (region-tune.ts), and the introduction's notes are Hubbard's, but in Rio's instruments from its first bar:
 *
 * - **a brass lead** (the soft lead of the introduction, the main theme and the second theme): a sawtooth, a quick attack and a held sustain, a light vibrato, the sound
 *   of a carnival's trumpets; the lead slides up into its longer notes from below, as a cuica's friction squeak does (`scoop`);
 * - **an agogo** for the runs (a short high bell) and a **cavaquinho strum** for the backing stabs (a narrow pluck, its pitch jumping an octave every frame);
 * - **a samba on the noise channel**: the surdo's low thud on the second beat of each 2/4 bar and a soft one on the first, a tamborim's sixteenths
 *   between, a crack at the end of every fourth bar, in the two patterns the groove is made of (the drum fills and the introduction's are Hubbard's).
 *
 * No tune is quoted: Brazil's tunes of the time are not in the public domain, and the ones that are were not checked note for note.
 */

/** Semitones above G: the minor ones up a semitone. */
const SHIFT = [0, +1, 0, +1, 0, 0, +1, 0, +1, 0, +1, 0] as const;

const BRASS = { pulseWidth: 0x0800, control: 0x21, attackDecay: 0x24, sustainRelease: 0xa5, vibrato: 1, pulseSweep: 0 } as const;
const AGOGO = { pulseWidth: 0x0800, control: 0x41, attackDecay: 0x03, sustainRelease: 0x21, vibrato: 0, pulseSweep: 0 } as const;
const CAVAQUINHO = { pulseWidth: 0x0300, control: 0x41, attackDecay: 0x08, sustainRelease: 0x20, effects: 4 } as const;
/** The brass's instruments: the introduction's soft lead (9) and the lead of the first part (6), the main theme (0) and the second theme (15). */
const BRASS_INSTRUMENTS = [0, 6, 9, 15] as const;

const DRUMS: Readonly<Record<string, Hit>> = {
  k: [14, 44], // the surdo on the first beat, muted
  S: [14, 43, 2], // the surdo on the second beat, open
  t: [1, 91], // the tamborim
  u: [1, 79], // the tamborim, lower
  c: [3, 47], // a crack
};
/** A bar of 2/4 is 8 steps of a sixteenth (2 ticks): the surdo on the beats, the tamborim's syncopation between. */
const BAR = 'k.tuS.ut';
const FILL = 'k.tuS.cc';
const SAMBA = [BAR, BAR, BAR, FILL, BAR, BAR, BAR, FILL].join('');

export const RIO: RegionTune = {
  id: 'rio',
  tonic: 7,
  shift: SHIFT,
  scoop: { minTicks: 6, maxTicks: 16, below: 3 },
  instruments: [
    ...BRASS_INSTRUMENTS.map((instrument) => ({ instrument, set: BRASS })),
    { instrument: 4, set: AGOGO }, { instrument: 5, set: AGOGO },
    { instrument: 2, set: CAVAQUINHO },
  ],
  // the drum groove of the game's song (patterns $39, four bars of 32 ticks, and $01, one)
  breaks: [{ pattern: 0x39, events: groove(SAMBA, DRUMS) }, { pattern: 0x01, events: groove(BAR + FILL, DRUMS) }],
};
