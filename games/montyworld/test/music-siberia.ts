/**
 * Siberia's version of Monty on the Run's tune (games/montyworld/src/music/siberia.ts), made from the original .sid by a scale and instruments only (music-kit.ts):
 * a Dorian scale and a piped lead (a triangle), the tempo Hubbard's.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-siberia.ts
 */
import { finish } from '../../shared/test/check';
import { SIBERIA } from '../src/music/siberia';
import { SIB } from '../src/siberia';
import { checkTune } from './music-kit';

checkTune({
  name: 'Siberia', tune: SIBERIA, moved: '1,4,6,8',
  scale: { text: 'no note is left on the minor sixth (Dorian: the sixth is the major one)', ok: (degree) => degree !== 8 },
  lead: { text: 'a pipe: a triangle wave with a soft attack, a held sustain, no vibrato', ok: (lead) => lead.control === 0x11 && lead.attackDecay >> 4 > 0 && lead.sustainRelease >> 4 >= 8 && lead.vibrato === 0 },
  rooms: [SIB.gravy, SIB.yeti, SIB.border], others: [[0, 'moscow']], sample: SIB.mine,
});
finish();
