/**
 * Monty in each of Rio's two costume proposals, the carnival headdress and the straw hat, close up and at 4x (the walk, the rope and the
 * somersault), beside his plain pictures. Pictures only.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rio-hat-shots.ts <out-dir>
 */
import { bankImage } from '../../montyotr/src/data';
import { headdressWorn, RIO_HAT_COLOUR, strawWorn } from '../src/art/rio-hat';
import { writeHatSheet } from './hat-sheet-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: rio-hat-shots.ts <out-dir>');
writeHatSheet(out, 'rio-hats-on-monty.png', [
  { label: 'PLAIN', colour: 1 },
  { label: 'CARNIVAL HEADDRESS (PROPOSED)', worn: headdressWorn(bankImage), colour: RIO_HAT_COLOUR },
  { label: 'STRAW HAT (ALTERNATIVE)', worn: strawWorn(bankImage), colour: RIO_HAT_COLOUR },
]);
console.log('ok');
