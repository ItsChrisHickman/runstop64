/**
 * Which Monty on the Run creature stands for each of Wanted's, as a picture to look at: a row for every creature kind the rooms use,
 * Wanted's own four frames (white) beside the four frames of the creature kinds.ts gives it (yellow), and the rooms it is in. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/creature-shots.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { indicesPng } from '../../../tools/probe/render';
import { imageAt, SPRITE_BASE } from '../../montymole/src/data';
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { Enemy } from '../../montymole/src/enemy-rules';
import { enemyBank } from '../../montyotr/src/data';
import { lookOfSet } from '../src/kinds';

const outDir = process.argv[2];
if (outDir === undefined) throw new Error('usage: creature-shots.ts <out-dir>');
fs.mkdirSync(outDir, { recursive: true });

/** where each frame set is used */
const used = new Map<number, Set<number>>();
for (const room of ROOMS) {
  for (const rec of room.enemies) {
    const e = new Enemy();
    e.fromBytes(rec);
    for (const set of e.sets) {
      if (set < SPRITE_BASE || set >= 0x7780) continue;
      const rooms = used.get(set) ?? new Set<number>();
      rooms.add(room.id);
      used.set(set, rooms);
    }
  }
}
const sets = [...used.keys()].sort((a, b) => a - b);
const W = 16 * 9 + 8, H = 18;
const px = new Uint8Array(W * H * sets.length);
sets.forEach((set, n) => {
  const put = (frame: Uint8Array, x0: number, colour: number, bank: boolean) => {
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const byte = bank ? frame[(r >> 3) * 16 + (c >> 3) * 8 + (r & 7)] ?? 0 : frame[r * 2 + (c >> 3)] ?? 0;
        if (byte & (0x80 >> (c & 7))) px[(n * H + r) * W + x0 + c] = colour;
      }
    }
  };
  for (let f = 0; f < 4; f++) put(imageAt(set + 32 * f), f * 17, 1, false);
  const look = lookOfSet(set);
  const type = look !== null && 'type' in look ? look.type : null;
  if (type !== null) {
    const bank = enemyBank(type);
    for (let f = 0; f < 4; f++) put(bank.subarray(f * 32, f * 32 + 32), 4 * 17 + 8 + f * 17, 7, true);
  }
  console.log(`${set.toString(16)} type ${type} rooms ${[...(used.get(set) ?? [])].join(',')}`);
});
indicesPng(path.join(outDir, 'creatures.png'), px, W, H * sets.length, 3);
