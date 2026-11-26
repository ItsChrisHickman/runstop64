/**
 * The Pacific's version of Monty on the Run's tune (games/montyworld/src/music/pacific.ts), made from the original .sid by a scale and instruments only (music-kit.ts):
 * the mixolydian turn of the tune (minor third and sixth up) in lead and bass, a ukulele lead, a steel guitar (wide vibrato, a slide up) on the held notes, softer drums, the introduction, drums' patterns and the tempo Hubbard's.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-pacific.ts
 */
import { finish } from '../../shared/test/check';
import { JP } from '../src/japan';
import { PACIFIC } from '../src/music/pacific';
import { PAC } from '../src/pacific';
import { checkTune } from './music-kit';

/** G A B C D E F: the degrees (semitones above G) of the mixolydian; F# stays Hubbard's leading note. */
const MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10, 11];

checkTune({
  name: 'the Pacific', tune: PACIFIC, moved: '1,3,6,8',
  scale: { text: 'lands on the mixolydian (G, A, B, C, D, E, F) or the leading note F#', ok: (degree) => MIXOLYDIAN.includes(degree) },
  lead: { text: 'a ukulele: a pulse wave with an instant attack, a short decay and no vibrato', ok: (lead) => lead.control === 0x41 && lead.attackDecay >> 4 === 0 && (lead.attackDecay & 15) <= 9 && lead.vibrato === 0 },
  rooms: [PAC.ship, PAC.waikiki, PAC.fish, PAC.kona, PAC.falls, PAC.hilo], others: [[JP.port, 'japan'], [0, 'moscow']], sample: PAC.waikiki,
});
finish();
