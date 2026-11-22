/**
 * The Andes' version of Monty on the Run's tune (games/montyworld/src/music/andes.ts), made from the original .sid by a scale, instruments and a drum groove (music-kit.ts):
 * the minor pentatonic on G where it is consonant with the bass, panpipes (from the introduction's first bar), a huayno on the noise channel at Hubbard's tempo.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-andes.ts
 */
import { finish } from '../../shared/test/check';
import { AND } from '../src/andes';
import { ANDES } from '../src/music/andes';
import { PAC } from '../src/pacific';
import { checkTune } from './music-kit';

/** G Bb C D F: the degrees (semitones above G) of the minor pentatonic. */
const PENTATONIC = [0, 3, 5, 7, 10];

checkTune({
  name: 'the Andes', tune: ANDES, moved: '1,2,4,6,8,9,11',
  scale: { text: 'every note is one of the minor pentatonic\'s five (G, Bb, C, D, F)', ok: (degree) => PENTATONIC.includes(degree) },
  lead: { text: 'panpipes: a triangle wave with a slow breathy attack and a long sustain, a vibrato', ok: (lead) => lead.control === 0x11 && lead.attackDecay >> 4 >= 4 && lead.sustainRelease >> 4 >= 8 && lead.vibrato === 2 },
  rooms: [AND.jump, AND.llama, AND.market, AND.bank], others: [[PAC.hold, 'pacific'], [0, 'moscow']], sample: AND.llama,
});
finish();
