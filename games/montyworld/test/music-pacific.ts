/**
 * The Pacific's version of Monty on the Run's tune (games/montyworld/src/music/pacific.ts), made from the original .sid by a scale and instruments only (music-kit.ts):
 * the mixolydian turn of the tune (minor third and sixth up) in lead and bass, a steel-guitar lead that slides up into some notes, a strummed backing, softer drums, the introduction and the tempo Hubbard's.
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
  lead: { text: 'a steel guitar: a pulse wave with a soft attack, a held sustain and a slow vibrato', ok: (lead) => lead.control === 0x41 && lead.attackDecay >> 4 > 0 && lead.sustainRelease >> 4 >= 8 && lead.vibrato > 0 },
  rooms: [PAC.stern, PAC.surf, PAC.road, PAC.hold], others: [[JP.port, 'japan'], [0, 'moscow']], sample: PAC.road,
});
finish();
