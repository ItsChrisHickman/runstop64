/**
 * The crusher rooms of Wanted: Monty Mole Remix as pictures, to look at: for each room with a crusher, the crusher just before it
 * goes down, part way, and at the bottom, and the faithful game's own picture of the same rooms at the same moments (Spectrum
 * screen), as PNGs. Not a check (test/crusher.ts is).
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/crusher-shots.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { indicesPng } from '../../../tools/probe/render';
import { screenPng } from '../../../tools/zx/screen';
import { Crusher } from '../../montymole/src/crusher';
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { Field } from '../../montymole/src/field';
import { Random } from '../../montymole/src/random';
import { must } from '../../shared/test/must';
import { retile } from '../src/retile';
import { newGame, NONE, picture, place, standingSpot, step } from './harness';

const outDir = process.argv[2];
if (outDir === undefined) throw new Error('usage: crusher-shots.ts <out-dir>');
fs.mkdirSync(outDir, { recursive: true });

for (const data of ROOMS) {
  const [column = 0, top = 0, lowest = 0, , , highest = 0] = data.crusher;
  if (column === 0 && top === 0) continue;
  const n = String(data.id).padStart(2, '0');
  // the remix
  const room = retile(data);
  const away = must(standingSpot(room, column < 16 ? 27 : 3, 10), `a place in room ${data.id}`);
  const p = newGame();
  const at = place(away.col, away.row);
  p.g.enterAt(data.id, at.x2, at.y);
  p.g.graceActive = () => true;
  const middle = (highest + lowest) / 2;
  let phase = 0;
  let wasDown = false;
  for (let i = 0; i < 6000 && phase < 3; i++) {
    step(p, NONE);
    const cr = p.g.crusher;
    const down = (cr.direction & 1) !== 0;
    const now = phase === 0 ? down && cr.wait > 0 : phase === 1 ? down && cr.y <= middle && wasDown : down && cr.y <= lowest + 2 && wasDown;
    wasDown = down;
    if (now) {
      indicesPng(path.join(outDir, `remix-${n}-${phase}.png`), picture(p.g), 320, 200, 2);
      phase++;
    }
  }
  // the faithful game
  const f = new Field();
  f.drawRoom(data);
  const c = new Crusher();
  c.enter(data);
  const rnd = new Random(0x2c5a);
  const shot = (name: string) => {
    const mem = new Uint8Array(65536);
    f.screen.forEach((b, i) => { mem[0x4000 + i] = b; });
    f.attrs.forEach((b, i) => { mem[0x5800 + i] = b; });
    screenPng(path.join(outDir, name), mem, 0, false, 2, false);
  };
  let rest = false;
  let seen = 0;
  for (let i = 0; i < 8000 && (seen < 2 || !rest); i++) {
    c.step(f, rnd);
    if (!rest && (c.direction & 1) !== 0 && c.wait > 0) { shot(`faithful-${n}-0.png`); rest = true; }
    const down = (c.direction & 1) !== 0;
    if (seen === 0 && down && c.y <= middle) { shot(`faithful-${n}-1.png`); seen = 1; }
    if (seen === 1 && down && c.y <= lowest + 2) { shot(`faithful-${n}-2.png`); seen = 2; }
  }
}
console.log('done');
