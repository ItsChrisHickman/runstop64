/**
 * Rooms with coins over something drawn (a backdrop's wall or sky, a room tile), before and after every coin is taken by the game's own collection (`collectCoin`, as a
 * touch takes it), shot over a whole shimmer cycle after: a taken coin must leave what the room has behind it, never a black hole and never a cell that goes on flashing
 * (Chris, 2026-11-24, on BACK ALLEY BEIJING's bricks, THE WATCHTOWER's holes, NOODLE MARKET's bricks and THE EMPEROR'S ROOFTOPS' sunset; Rio's rooms from 2026-11-23).
 * Each room's coin cells are also compared, pixel for pixel, with the room loaded with its coins already taken, at every frame of the cycle: the count of cells that differ
 * is printed (0 is right). Pictures and that count only: the check is backdrop-holes.ts.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/coin-hole-shots.ts <out-dir>
 */
import fs from 'node:fs';
import { ROW, SCREEN } from '../../montyotr/src/game';
import { collectCoin } from '../../montyotr/src/items';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { CHI } from '../src/china';
import { RIO_ROOM } from '../src/rio';
import { placed, savePng, shot, W } from './shots-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: coin-hole-shots.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

const ROOMS = [
  { room: CHI.alley, name: 'back-alley-beijing', col: 2, floor: 17 },
  { room: CHI.tower, name: 'watchtower', col: 20, floor: 17 },
  { room: CHI.market, name: 'noodle-market', col: 2, floor: 17 },
  { room: CHI.roofs, name: 'emperors-rooftops', col: 22, floor: 17 },
  { room: CHI.heaven, name: 'heaven-can-wait', col: 28, floor: 17 },
  { room: RIO_ROOM.steak, name: 'churrascaria', col: 30, floor: 18 },
  { room: RIO_ROOM.drum, name: 'carnival-drum', col: 1, floor: 18 },
  { room: RIO_ROOM.bust, name: 'carnival-bust', col: 2, floor: 18 },
  { room: RIO_ROOM.sugar, name: 'sugar-sea', col: 2, floor: 18 },
  { room: RIO_ROOM.lap, name: 'lapa-sky', col: 4, floor: 18 },
];
/** Frames shot after the coins are taken: past a whole shimmer cycle (11 steps). */
const AFTER = 24;

/** The 8 x 8 pixels of a screen cell (its index in the screen) in a picture. */
const cellPixels = (px: Uint8Array, at: number) => {
  const x = (at % ROW) * 8, y = Math.floor(at / ROW) * 8;
  return Array.from({ length: 64 }, (_, i) => px[(y + Math.floor(i / 8)) * W + x + (i % 8)] ?? 0).join();
};
/** Monty put back where he stood, still. */
function park(s: State, x2: number, y: number) {
  s.g.x2 = x2; s.g.y = y; s.g.falling = 0; s.g.montyAction = 0; s.g.onRope = 0;
}

let differ = 0;
for (const r of ROOMS) {
  const place = { room: r.room, col: r.col, floor: r.floor, frames: 5, noEnemies: true };
  const { s, px } = placed(place);
  savePng(out, `${r.name}-before.png`, px);
  const x2 = s.g.x2, y = s.g.y;
  const taken = s.g.entities.filter((e) => e.index >= 0).map((e) => ({ at: e.at - SCREEN, index: e.index }));
  for (const c of taken) { // touched where it hangs, as the game takes it
    s.g.x2 = 0x0c + (c.at % ROW) * 4; s.g.y = 0x32 + Math.floor(c.at / ROW) * 8;
    collectCoin(s.g);
  }
  park(s, x2, y);
  // the room as he finds it coming back with them taken, the same frames on
  const ref = placed({ ...place, frames: 0 });
  for (const c of taken) ref.s.g.coinCollected[c.index] = 0xff;
  ref.s.g.loadRoom(); ref.s.g.enemies = [];
  park(ref.s, x2, y);
  let bad = 0;
  for (let n = 0; n < AFTER; n++) {
    frame(s, NONE); frame(ref.s, NONE); park(s, x2, y); park(ref.s, x2, y);
    const a = shot(s.g), b = shot(ref.s.g);
    bad += taken.filter((c) => cellPixels(a, c.at) !== cellPixels(b, c.at)).length;
    if (n === 0 || n === 5 || n === 11) savePng(out, `${r.name}-taken-${n}.png`, a);
  }
  differ += bad;
  console.log(`${r.name}: ${taken.length} coins taken, ${bad} coin cells unlike the room without them over ${AFTER} frames`);
}
console.log(`${differ} cells differ in all`);
