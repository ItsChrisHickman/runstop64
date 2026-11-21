import { enterRoom } from '../../montyotr/src/ending';
import { frame, NONE } from '../../montyotr/test/play';
import { WORLD } from '../src/data';
import { SIB } from '../src/siberia';
import { newGame, search } from './bot';
import { itemIndex, standY } from './route';

const s = newGame(WORLD, false);
s.g.siCollected[itemIndex(s.g, SIB.mine, 0)] = 0x81;
enterRoom(s.g, SIB.shaft, 0x0c + 6 * 4, standY(18));
for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
const noMiner = process.argv[2] === 'nominer';
if (noMiner) { s.g.enemies = []; s.g.enable &= 0x0f; s.g.vic.enable &= 0x0f; }
for (const floor of [16, 14, 12, 10]) {
  const st = { exhausted: false };
  const f = search(s, (g) => g.roomId === SIB.shaft && g.y === standY(floor) && !g.montyAction && !g.falling, undefined, 150000, 0, st);
  console.log('floor', floor, f ? `ok ${f.route.length}` : `no (${st.exhausted ? 'exhausted' : 'limit'})`);
}
