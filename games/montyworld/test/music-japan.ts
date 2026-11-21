/**
 * Japan's version of Monty on the Run's tune (games/montyworld/src/music/japan.ts), made from the original .sid by a scale and instruments only (music-kit.ts):
 * the Hirajoshi pentatonic on G, a shakuhachi theme and a koto for the runs, the tempo Hubbard's.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-japan.ts
 */
import { finish } from '../../shared/test/check';
import { CHI } from '../src/china';
import { JP } from '../src/japan';
import { JAPAN } from '../src/music/japan';
import { checkTune } from './music-kit';

/** G A Bb D Eb: the degrees (semitones above G) of the Hirajoshi scale. */
const HIRAJOSHI = [0, 2, 3, 7, 8];

checkTune({
  name: 'Japan', tune: JAPAN, moved: '1,4,5,6,9,10,11',
  scale: { text: 'every note is one of the Hirajoshi\'s five (G, A, Bb, D, Eb)', ok: (degree) => HIRAJOSHI.includes(degree) },
  lead: { text: 'a shakuhachi: a triangle wave with a soft attack, a held sustain and a slow vibrato', ok: (lead) => lead.control === 0x11 && lead.attackDecay >> 4 > 0 && lead.sustainRelease >> 4 >= 8 && lead.vibrato > 0 },
  rooms: [JP.harbour, JP.platform, JP.mole, JP.port], others: [[CHI.junk, 'china'], [0, 'moscow']], sample: JP.hall,
});
finish();
