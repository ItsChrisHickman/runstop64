/**
 * Writes PNGs of rebuilt frames, to look at: the original's screen beside the rebuilt picture in each look (ORIGINAL, ENHANCED),
 * each in the 320 x 200 surface the renderer is given, border colour round it, the Spectrum's colours.
 *
 *   nice -n 15 node tools/test.mjs games/moley/re/frames.ts <out-dir> [rooms e.g. 0,1,3] [passes e.g. 40,200] [scale]
 *
 * Each room is played by a random player from its saved state (games/moley/build/room<n>.state); at each pass wanted the
 * original's screen, the rebuilt ORIGINAL picture and the rebuilt ENHANCED picture are written as
 * `room<n>-pass<p>-{original,rebuilt,enhanced}.png`, and `-sheet.png` has the three side by side.
 */
import fs from 'node:fs';
import path from 'node:path';
import { palettePng } from '../../../tools/png';
import { screenIndexes } from '../../../tools/zx/screen';
import { picture } from '../src/look';
import { centre, BORDER, SURFACE_HEIGHT, SURFACE_WIDTH } from '../src/view';
import { SPECTRUM_PALETTE } from '../src/palette';
import { mulberry, Run, Tally } from '../test/lockstep-core';
import { PictureTally, watchPicture } from '../test/picture-core';
import { RandomPlayer } from '../test/random-player';

const [outDir, roomsArg = '0,1,2,3,4,5', passesArg = '40,200', scaleArg = '3'] = process.argv.slice(2);
if (outDir === undefined) throw new Error('usage: frames.ts <out-dir> [rooms] [passes] [scale]');
fs.mkdirSync(outDir, { recursive: true });
const scale = Number(scaleArg);
const wanted = passesArg.split(',').map(Number);
const surface = (indexes: Uint8Array): Uint8Array => centre(indexes, BORDER, new Uint8Array(SURFACE_WIDTH * SURFACE_HEIGHT));

for (const room of roomsArg.split(',').map(Number)) {
  const rnd = mulberry(1000 * room + 1);
  const run = new Run(new Tally(), `games/moley/build/room${room}.state`, `room ${room}`, false);
  const w = watchPicture(run, new PictureTally(), run.label);
  const prev = run.hooks.passEnd;
  run.hooks.passEnd = (outcome, mem) => {
    prev?.(outcome, mem);
    const d = w.display();
    if (d === null || !wanted.includes(run.passes)) return;
    const original = surface(screenIndexes(mem, false));
    const rebuilt = surface(picture(d, 'original'));
    const enhanced = surface(picture(d, 'enhanced'));
    const name = path.join(outDir, `room${room}-pass${run.passes}`);
    palettePng(`${name}-original.png`, original, SURFACE_WIDTH, SURFACE_HEIGHT, SPECTRUM_PALETTE, scale);
    palettePng(`${name}-rebuilt.png`, rebuilt, SURFACE_WIDTH, SURFACE_HEIGHT, SPECTRUM_PALETTE, scale);
    palettePng(`${name}-enhanced.png`, enhanced, SURFACE_WIDTH, SURFACE_HEIGHT, SPECTRUM_PALETTE, scale);
    const sheet = new Uint8Array(SURFACE_WIDTH * 3 * SURFACE_HEIGHT);
    [original, rebuilt, enhanced].forEach((p, i) => {
      for (let y = 0; y < SURFACE_HEIGHT; y++) sheet.set(p.subarray(y * SURFACE_WIDTH, (y + 1) * SURFACE_WIDTH), y * SURFACE_WIDTH * 3 + i * SURFACE_WIDTH);
    });
    palettePng(`${name}-sheet.png`, sheet, SURFACE_WIDTH * 3, SURFACE_HEIGHT, SPECTRUM_PALETTE, Math.max(1, scale - 1));
    console.log(`room ${room} pass ${run.passes}: ${name}-*.png`);
  };
  run.play(new RandomPlayer(rnd), Math.max(...wanted) + 1);
}
