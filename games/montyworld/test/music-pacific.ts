/**
 * The Pacific's version of Monty on the Run's tune (games/montyworld/src/music/pacific.ts), made from the original .sid by a scale and instruments only (music-kit.ts):
 * G major, a ukulele lead (a plucked pulse that dies away), the tempo Hubbard's.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-pacific.ts
 */
import { finish } from '../../shared/test/check';
import { JP } from '../src/japan';
import { PACIFIC } from '../src/music/pacific';
import { PAC } from '../src/pacific';
import { checkTune } from './music-kit';

/** G A B C D E F#: the degrees (semitones above G) of the major scale. */
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

checkTune({
  name: 'the Pacific', tune: PACIFIC, moved: '1,3,6,8,10',
  scale: { text: 'every note is one of the major scale\'s seven (G, A, B, C, D, E, F#)', ok: (degree) => MAJOR.includes(degree) },
  lead: { text: 'a ukulele: a pulse wave with no attack, a quick decay and no sustain, so each note is a pluck', ok: (lead) => lead.control === 0x41 && lead.attackDecay >> 4 === 0 && lead.sustainRelease >> 4 <= 2 && lead.vibrato === 0 },
  rooms: [PAC.stern, PAC.surf, PAC.road, PAC.hold], others: [[JP.port, 'japan'], [0, 'moscow']], sample: PAC.road,
});
finish();
