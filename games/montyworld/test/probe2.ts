import { enterRoom } from '../../montyotr/src/ending';
import { WORLD } from '../src/data';
import { newGame, search } from './bot';
import { ROOM } from '../src/moscow';
import { LEGS, standY } from './route';

const l = LEGS[23];
if (!l) throw new Error('no leg');
console.log(l.name);
for (const col of [21, 12]) {
  for (const w of [1.5, 0.5]) {
    const s = newGame(WORLD, false);
    enterRoom(s.g, ROOM.streets, 0x0c + (col + 4) * 4, standY(17));
    const t0 = Date.now();
    const f = search(s, l.goal, l.aim, 100000, w);
    console.log('from col', col, 'w', w, f ? `found ${f.nodes} nodes, ${f.route.length} steps` : 'none', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
}
