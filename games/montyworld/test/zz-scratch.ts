import { WORLD } from '../src/data';
import { ushankaWorn } from '../src/art';
import { bankImage } from '../../montyotr/src/data';
console.log(Array.from(WORLD.enemyColours).join(','));
const w = ushankaWorn(bankImage);
const uniq = new Set(w.hat.map((h) => Array.from(h.block).join(',')));
console.log('hat overlays', w.hat.length, 'unique', uniq.size);
