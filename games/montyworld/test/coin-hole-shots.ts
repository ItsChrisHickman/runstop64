/**
 * Rio's churrascaria and carnival with their coins on, then with every coin taken: a taken coin must leave the room's backdrop, not a black hole. Pictures only.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/coin-hole-shots.ts <out-dir>
 */
import fs from 'node:fs';
import { takeCoin } from '../../shared/monty/screen';
import { RIO_ROOM } from '../src/rio';
import { placed, savePng, shot } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: coin-hole-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

const ROOMS = [
  { room: RIO_ROOM.steak, name: 'churrascaria', col: 30, floor: 18 },
  { room: RIO_ROOM.drum, name: 'carnival-drum', col: 1, floor: 18 },
  { room: RIO_ROOM.float, name: 'carnival-float', col: 1, floor: 18 },
  { room: RIO_ROOM.bust, name: 'carnival-bust', col: 2, floor: 18 },
  { room: RIO_ROOM.quay, name: 'quay-sky', col: 2, floor: 8 },
  { room: RIO_ROOM.lap, name: 'lapa-sky', col: 4, floor: 18 },
];
for (const r of ROOMS) {
  const { s, px } = placed({ room: r.room, col: r.col, floor: r.floor, frames: 5 });
  savePng(out, `${r.name}-before.png`, px);
  for (const e of [...s.g.entities]) takeCoin(s.g.mem, e.at, s.g.entities);
  savePng(out, `${r.name}-taken.png`, shot(s.g));
}
console.log('ok');
