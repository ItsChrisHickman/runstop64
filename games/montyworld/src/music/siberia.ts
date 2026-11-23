import { groove, melody, type Hit, type RegionTune } from './region-tune';

/**
 * Siberia's version of Monty on the Run's tune, cold and on a train, kept as subtle as Moscow's: Hubbard's melody, harmony and drums stay (his driver, his tempo, his patterns), and the train is a light touch on top.
 * Hubbard's tune is in G minor with chromatic colour (the major third B, the major sixth E, the raised fourth C# and a flat second G#, against the minor third, minor sixth and plain fourth).
 * Siberia bends it to G Dorian, the mode of the long Russian songs: the minor third stays, the sixth is always the major one (E, as Hubbard has it in his brighter moments), the fourth and
 * second are plain, the leading note and the minor seventh stay, the lead only where it is consonant with the bass (region-tune.ts). The introduction is Hubbard's, note for note and in his instruments.
 *
 * - **a colder lead**: the lead's two pulse instruments (the main theme and the second theme) have a plain square pulse and no pulse sweep, with Hubbard's envelope and a lighter vibrato; the runs and stabs are Hubbard's;
 * - **a rail joint in his groove**: the groove (pattern $39, every bar: kick, two hats, snare) is Hubbard's own, notes and lengths; in every second bar the snare gives up its last two ticks to a soft click of his own hat sound,
 *   so the bar rolls over the joints: ta-ta-DUM-ta, ta-ta-DUM;
 * - **a whistle**: a short two-note call (a rising minor third, high, the second note held) in the silence that ends the second theme's long phrase (pattern $05, which is Hubbard's till its last 24 ticks of rest), on a
 *   spare instrument: a call of a train's whistle in the distance, not a quoted tune.
 */

/** Semitones above G: G# goes up to A, B down to Bb, C# down to C, Eb up to E (the Dorian sixth). */
const SHIFT = [0, +1, 0, 0, -1, 0, -1, 0, +1, 0, 0, 0] as const;

/** Hubbard's two pulse leads, colder: a plain square pulse that does not sweep, a lighter vibrato, his envelope. */
const COLD = { pulseWidth: 0x0800, pulseSweep: 0, vibrato: 1 } as const;
const COLD_INSTRUMENTS = [0, 15] as const;

/** The spare instrument (unused by the song) the whistle sounds on: a triangle with a soft attack, a breath of vibrato. */
const WHISTLE_INSTRUMENT = 7;
const WHISTLE = { pulseWidth: 0x0800, control: 0x11, attackDecay: 0x39, sustainRelease: 0xa4, vibrato: 2, pulseSweep: 0, effects: 0 } as const;

/** Hubbard's own groove sounds ($39's kick, hats and snare): the click is his hat's (instrument 1, note 91). */
const DRUMS: Readonly<Record<string, Hit>> = {
  K: [1, 67, 2], // the kick, 4 ticks
  h: [1, 79], // the first hat, 2 ticks
  H: [1, 91], // the second hat, 2 ticks
  s: [3, 47, 4], // the snare, 8 ticks
  S: [3, 47, 3], // the snare, cut to 6 ticks
  c: [1, 91], // the rail joint
};
const BAR = 'K.hHs...';
const CLICK_BAR = 'K.hHS..c';
const GROOVE = [BAR, CLICK_BAR, BAR, CLICK_BAR, BAR, CLICK_BAR, BAR, CLICK_BAR].join('');

/** The call (24 ticks, the rest it fills): a note, a higher one held, then silence. */
const CALL: readonly (readonly [string, number])[] = [['Bb5', 5], ['D6', 11], ['-', 8]];

export const SIBERIA: RegionTune = {
  id: 'siberia',
  tonic: 7,
  shift: SHIFT,
  instruments: [
    ...COLD_INSTRUMENTS.map((instrument) => ({ instrument, set: COLD })),
    { instrument: WHISTLE_INSTRUMENT, set: WHISTLE },
  ],
  breaks: [{ pattern: 0x39, events: groove(GROOVE, DRUMS) }],
  fills: [{ pattern: 0x05, events: melody(WHISTLE_INSTRUMENT, CALL) }],
};
