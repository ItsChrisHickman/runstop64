/**
 * Siberia's version of Monty on the Run's tune (games/montyworld/src/music/siberia.ts), made from the original .sid by a scale, instruments, a drum groove and one phrase (music-kit.ts):
 * Dorian where it is consonant with the bass, an icy triangle lead (from the introduction's first bar), a train's clickety-clack on the noise channel and a whistle in the
 * breakdown, the tempo Hubbard's.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-siberia.ts
 */
import { finish } from '../../shared/test/check';
import { SIBERIA } from '../src/music/siberia';
import { SIB } from '../src/siberia';
import { checkTune } from './music-kit';

checkTune({
  name: 'Siberia', tune: SIBERIA, moved: '1,4,6,8',
  scale: { text: 'is not on the minor sixth (Dorian: the sixth is the major one)', ok: (degree) => degree !== 8 },
  lead: { text: 'ice: a triangle struck like glass, a long sustain, no vibrato', ok: (lead) => lead.control === 0x11 && lead.attackDecay >> 4 <= 1 && lead.sustainRelease >> 4 >= 8 && lead.vibrato === 0 },
  rooms: [SIB.gravy, SIB.yeti, SIB.border], others: [[0, 'moscow']], sample: SIB.mine,
});
finish();
