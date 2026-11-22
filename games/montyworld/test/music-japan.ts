/**
 * Japan's version of Monty on the Run's tune (games/montyworld/src/music/japan.ts), made from the original .sid by a scale and instruments only (music-kit.ts):
 * a light lean of the lead to the koto's scale (Hirajoshi, with the tune's own C and F) where it is consonant with the bass, a koto pluck for the lead, the introduction and the tempo Hubbard's.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-japan.ts
 */
import { finish } from '../../shared/test/check';
import { CHI } from '../src/china';
import { JP } from '../src/japan';
import { JAPAN } from '../src/music/japan';
import { checkTune } from './music-kit';

/** G A Bb D Eb, and the tune's own C and F: the degrees (semitones above G) a bent note lands on. */
const HIRAJOSHI = [0, 2, 3, 5, 7, 8, 10];

checkTune({
  name: 'Japan', tune: JAPAN, moved: '1,4,6,9,11',
  scale: { text: 'lands on the koto\'s five (G, A, Bb, D, Eb) or the tune\'s own C or F', ok: (degree) => HIRAJOSHI.includes(degree) },
  lead: { text: 'a koto: a narrow pulse with no attack, a quick decay to a quiet sustain, no vibrato', ok: (lead) => lead.control === 0x41 && lead.attackDecay >> 4 === 0 && lead.sustainRelease >> 4 < 8 && lead.vibrato === 0 },
  rooms: [JP.harbour, JP.platform, JP.mole, JP.port], others: [[CHI.junk, 'china'], [0, 'moscow']], sample: JP.hall,
});
finish();
