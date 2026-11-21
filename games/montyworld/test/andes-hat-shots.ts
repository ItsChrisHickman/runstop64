/**
 * Monty in the chullo, close up and at 4x (the walk, the rope and the somersault), beside his plain pictures and the ushanka. Pictures
 * only.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/andes-hat-shots.ts <out-dir>
 */
import { bankImage } from '../../montyotr/src/data';
import { CHULLO_COLOUR, chulloWorn } from '../src/art/andes-hat';
import { HAT_COLOUR, ushankaWorn } from '../src/art/hat';
import { writeHatSheet } from './hat-sheet-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: andes-hat-shots.ts <out-dir>');
writeHatSheet(out, 'chullo-on-monty.png', [
  { label: 'PLAIN', colour: 1 },
  { label: 'CHULLO', worn: chulloWorn(bankImage), colour: CHULLO_COLOUR },
  { label: 'USHANKA FOR COMPARISON', worn: ushankaWorn(bankImage), colour: HAT_COLOUR },
]);
console.log('ok');
