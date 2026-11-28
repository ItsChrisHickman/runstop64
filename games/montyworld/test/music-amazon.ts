/**
 * The Amazon's version of Monty on the Run's tune (games/montyworld/src/music/amazon.ts), made from the original .sid by a scale and instruments only (music-kit.ts):
 * G dorian where it is consonant with the bass, a marimba lead; the introduction, drums and tempo Hubbard's.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-amazon.ts
 */
import { finish } from '../../shared/test/check';
import { AND } from '../src/andes';
import { AMAZON } from '../src/music/amazon';
import { RIO_ROOM } from '../src/rio';
import { checkTune } from './music-kit';

/** G A Bb C D E F: the degrees (semitones above G) of G dorian. */
const DORIAN = [0, 2, 3, 5, 7, 9, 10];

checkTune({
  name: 'the Amazon', tune: AMAZON, moved: '1,6,8,11',
  scale: { text: 'is one of G dorian\'s seven (G, A, Bb, C, D, E, F)', ok: (degree) => DORIAN.includes(degree) },
  lead: { text: 'a marimba: a triangle wave struck, an instant attack and a quick decay, no vibrato', ok: (lead) => lead.control === 0x11 && lead.attackDecay >> 4 === 0 && (lead.attackDecay & 15) <= 8 && lead.vibrato === 0 },
  rooms: [AND.canopy, AND.cloud, AND.vine, AND.sandbar, AND.roots, AND.kapok, AND.boat, AND.ends], others: [[AND.picchu, 'andes'], [RIO_ROOM.arms, 'rio']], sample: AND.roots,
});
finish();
