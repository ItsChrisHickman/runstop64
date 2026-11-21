import { enterRoom } from '../../montyotr/src/ending';
import { frame, NONE } from '../../montyotr/test/play';
import { WORLD } from '../src/data';
import { ROOM } from '../src/moscow';
import { newGame } from './bot';
import { standY } from './route';
const L = { ...NONE, left: true }, R = { ...NONE, right: true };
const s = newGame(WORLD, false);
enterRoom(s.g, ROOM.streets, 0x0c + (8 + 4) * 4, standY(17));
s.g.enemies = []; s.g.enable &= 0x0f; s.g.vic.enable &= 0x0f;
for (let f = 0; f < 40 && s.g.ice[0]?.state === 'hang'; f++) frame(s, R);
console.log(s.g.roomId, s.g.ice[0]?.state, s.g.montyCol);
for (let f = 0; f < 20; f++) frame(s, L);
console.log(s.g.roomId, s.g.ice[0]?.state, s.g.montyCol);
for (let f = 0; f < 200; f++) { frame(s, NONE); if (f % 10 === 0) console.log(f, s.g.roomId, s.g.ice[0]?.state, s.g.actionCounter); }
