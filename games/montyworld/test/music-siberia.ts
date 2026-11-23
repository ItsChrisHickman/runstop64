/**
 * Siberia's version of Monty on the Run's tune (games/montyworld/src/music/siberia.ts), made from the original .sid as lightly as Moscow's (music-kit.ts):
 * Dorian where it is consonant with the bass, a colder pulse lead, a soft rail-joint click in Hubbard's own groove and a short whistle in the rest that ends a phrase,
 * the tempo, melody, harmony and drums Hubbard's.
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
  lead: { text: 'colder: Hubbard\'s pulse (control and envelope kept) with a square width, no sweep, a light vibrato', ok: (lead) => lead.control === 0x41 && lead.attackDecay === 0x48 && lead.pulseWidth === 0x0800 && lead.pulseSweep === 0 && lead.vibrato === 1 },
  rooms: [SIB.gravy, SIB.yeti, SIB.border], others: [[0, 'moscow']], sample: SIB.mine,
});
finish();
