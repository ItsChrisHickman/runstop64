/**
 * The ending's scrolling scenes (games/shared/ending/machine-reel.ts), headless, with the real game under it: where Pendragon runs
 * into the edge of a hall the room scrolls a pixel a frame, and the picture the show draws has to scroll with it, a pixel a frame:
 * never a frame ahead or behind (the game moves its screen a whole character on at the frame the fine scroll wraps, after the VIC
 * has fetched it: a picture made from the memory after the frame, with the fine scroll from the fetch, jumps 8 pixels for a frame).
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/ending-scroll.ts
 */
import fs from 'node:fs';
import { BitmapFont, Input, KIT_GLYPHS, PixelRenderer, unpackState } from 'c64kit';
import { Ending, MachineReel } from '../../shared/ending/machine-reel';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { game } from './guided-kit';
import { blackwycheEnding } from '../src/ending';
import { renderPixels } from '../../../tools/probe/render';

useMemoryStorage();
const title = unpackState(new Uint8Array(fs.readFileSync(game.title)));
const input = new Input(nowhere);
const renderer = new PixelRenderer();
const font = new BitmapFont().addDrawn(KIT_GLYPHS);
const show = new Ending({ host: { renderer, input, canvas: nowhere }, spec: blackwycheEnding, port: game.port, title: () => title, sound: { pushFrame: () => {} }, font: () => font, done: () => {} });
show.start([]);

/** The rows of the room (picture pixels) and the columns compared: what the machine draws of the room, sprites aside. */
const ROWS = { from: 40, to: 150 }, COLS = { from: 24, to: 296 }, REACH = 10;

/** How far the room moved between two pictures: the shift (-REACH to REACH) the two agree best at, or null where they agree at none. */
function shiftBetween(a: Uint8Array, b: Uint8Array): number | null {
  let best: number | null = null, fewest = Infinity, atZero = Infinity;
  for (let s = -REACH; s <= REACH; s++) {
    let wrong = 0;
    for (let y = ROWS.from; y < ROWS.to; y += 2) for (let x = COLS.from; x < COLS.to; x += 2) if (a[y * 320 + x] !== b[y * 320 + x - s]) wrong++;
    if (s === 0) atZero = wrong;
    if (wrong < fewest) { fewest = wrong; best = s; }
  }
  return fewest === 0 && atZero === 0 ? 0 : best;
}

// the first three places: a hall run along (scrolling when he reaches its edge), and others
let last: Uint8Array | null = null, lastPlace = -1;
const shifts: number[] = [];
let scrolling = 0, frames = 0;
while (show.active && frames < 1500) {
  input.poll();
  show.tick();
  show.render(0);
  frames++;
  const p = show.progress;
  if (p.phase === 'loading') continue;
  if (p.phase !== 'montage' || p.place > 3) break;
  const reel = p.reel;
  if (!(reel instanceof MachineReel)) continue;
  const px = renderPixels(reel.machine, renderer.layout);
  if (p.place === lastPlace && last) {
    const s = shiftBetween(last, px);
    if (s !== null && s !== 0) { shifts.push(s); scrolling++; }
  }
  last = px;
  lastPlace = p.place;
}
const jumps = shifts.filter((s) => Math.abs(s) > 1);
check(`the room scrolls in the montage (${scrolling} frames of ${frames})`, scrolling >= 40);
check(`it scrolls a pixel a frame, never a jump (${jumps.length} frames moved more than 1 pixel${jumps.length ? `: ${jumps.slice(0, 8).join(' ')}` : ''})`, jumps.length === 0);
finish();
