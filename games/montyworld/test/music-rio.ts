/**
 * Rio's version of Monty on the Run's tune (games/montyworld/src/music/rio.ts), made from the original .sid by a scale and instruments only (music-kit.ts):
 * the minor pentatonic on G (G Bb C D F), a panpipes lead (a triangle wave with a short attack and a long sustain), the tempo Hubbard's.
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
  lead: { text: 'a cavaquinho: a narrow pulse with a short decay and a quick vibrato', ok: (lead) => lead.control === 0x41 && (lead.attackDecay & 0x0f) <= 5 && lead.vibrato === 3 },
  rooms: [RIO_ROOM.quay, RIO_ROOM.lap, RIO_ROOM.steak, RIO_ROOM.bust], others: [[AND.bank, 'andes'], [AND.mist, 'andes'], [0, 'moscow']], sample: RIO_ROOM.sugar,
});
finish();
