/**
 * China's version of Monty on the Run's tune (games/montyworld/src/music/china.ts), made from the original .sid by a scale and instruments only (music-kit.ts):
 * the major pentatonic on G and a bowed fiddle for the lead (a sawtooth with vibrato), the tempo Hubbard's.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-china.ts
 */
import { finish } from '../../shared/test/check';
import { CHI } from '../src/china';
import { CHINA } from '../src/music/china';
import { SIB } from '../src/siberia';
import { checkTune } from './music-kit';

/** G A B D E: the degrees (semitones above G) of the major pentatonic. */
const PENTATONIC = [0, 2, 4, 7, 9];

checkTune({
  name: 'China', tune: CHINA, moved: '1,3,5,6,8,10,11',
  scale: { text: 'every note is one of the pentatonic\'s five (G, A, B, D, E): no semitone is left in the tune', ok: (degree) => PENTATONIC.includes(degree) },
  lead: { text: 'a bowed fiddle: a sawtooth with a slow attack, a held sustain and a vibrato', ok: (lead) => lead.control === 0x21 && lead.attackDecay >> 4 > 0 && lead.sustainRelease >> 4 >= 8 && lead.vibrato > 0 },
  rooms: [CHI.wall, CHI.market, CHI.junk], others: [[SIB.border, 'siberia'], [0, 'moscow']], sample: CHI.willow,
});
finish();
