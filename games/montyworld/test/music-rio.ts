/**
 * Rio's version of Monty on the Run's tune (games/montyworld/src/music/rio.ts), made from the original .sid by a scale and instruments only (music-kit.ts):
 * G major where it is consonant with the bass, a brass lead that slides into long notes; the introduction, drums and tempo Hubbard's.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-rio.ts
 */
import { finish } from '../../shared/test/check';
import { AND } from '../src/andes';
import { RIO } from '../src/music/rio';
import { RIO_ROOM } from '../src/rio';
import { checkTune } from './music-kit';

/** G A B C D E F#: the degrees (semitones above G) of G major. */
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

checkTune({
  name: 'Rio', tune: RIO, moved: '1,3,6,8,10',
  scale: { text: 'every note is one of G major\'s seven', ok: (degree) => MAJOR.includes(degree) },
  lead: { text: 'brass: a sawtooth with a quick attack, a held sustain and a light vibrato', ok: (lead) => lead.control === 0x21 && lead.attackDecay >> 4 <= 3 && lead.sustainRelease >> 4 >= 8 && lead.vibrato === 1 },
  rooms: [RIO_ROOM.arms, RIO_ROOM.lap, RIO_ROOM.steak, RIO_ROOM.bust], others: [[AND.bank, 'andes'], [AND.mist, 'andes'], [0, 'moscow']], sample: RIO_ROOM.sugar,
});
finish();
