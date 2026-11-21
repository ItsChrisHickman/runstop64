/**
 * Monty in Rio's costume, the carnival headdress, close up and at 4x (the walk, the rope and the
 * somersault), beside his plain pictures. Pictures only.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rio-hat-shots.ts <out-dir>
 */
import { bankImage } from '../../montyotr/src/data';
import { headdressWorn, RIO_HAT_COLOUR } from '../src/art/rio-hat';
import { writeHatSheet } from './hat-sheet-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: rio-hat-shots.ts <out-dir>');
writeHatSheet(out, 'rio-hats-on-monty.png', [
  { label: 'PLAIN', colour: 1 },
  { label: 'CARNIVAL HEADDRESS', worn: headdressWorn(bankImage), colour: RIO_HAT_COLOUR },
]);
console.log('ok');
