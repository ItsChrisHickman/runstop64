/**
 * Pictures of Do Svidaniya Monty's parade (the procession after the last credit line), to look at: the show run from its first frame, a frame
 * saved every `every` frames of the procession (default 40) and a strip of them at 1x.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/parade-shots.ts <out-dir> [every]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { RewardShow } from '../../shared/ending/show';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { endingStats, montyEnding } from '../../montyotr/src/ending';
import { Game, type Assists } from '../../montyotr/src/game';
import { WORLD } from '../src/data';
import { montyFont } from '../src/main';

const out = process.argv[2];
if (!out) throw new Error('usage: parade-shots.ts <out-dir> [every]');
const every = Number(process.argv[3] ?? 40);
fs.mkdirSync(out, { recursive: true });
useMemoryStorage();
let seed = 12345;
Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };

const ENHANCED: Assists = { lives: false, cloud: true, jetpack: true, c5: true, rooms: false, respawn: true };
const input = new Input(nowhere), renderer = new PixelRenderer();
renderer.frame = { x: 32, y: 36 };
const spec = montyEnding(WORLD, renderer, ENHANCED);
const show = new RewardShow({ host: { renderer, input, canvas: nowhere }, spec, font: montyFont, music: { start() {}, end() {} }, done() {} });
show.start(endingStats(new Game(WORLD), { rooms: {} }));
const strip: Uint8Array[] = [];
let n = 0;
for (let f = 0; show.active && f < 20000; f++) {
  input.poll(); show.tick(); show.render(0);
  const p = show.progress;
  if (p.phase !== 'parade' || p.frames === 0) continue;
  if (p.frames % every === 0) {
    const pic = renderer.picture();
    rgbPng(path.join(out, `parade-${String(n++).padStart(3, '0')}.png`), indicesToRgb(pic), 320, 200, 1);
    strip.push(pic);
  }
}
// the strip: four frames a row, at 1x
const cols = 4, rows = Math.ceil(strip.length / cols);
const big = new Uint8Array(320 * cols * 200 * rows);
strip.forEach((pic, i) => {
  const ox = (i % cols) * 320, oy = Math.floor(i / cols) * 200;
  for (let y = 0; y < 200; y++) big.set(pic.subarray(y * 320, y * 320 + 320), (oy + y) * 320 * cols + ox);
});
if (strip.length) rgbPng(path.join(out, 'strip.png'), indicesToRgb(big), 320 * cols, 200 * rows, 1);
console.log(`${strip.length} frames of the parade in ${out}`);
