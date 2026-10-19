import { PixelRenderer, TRANSPARENT } from 'c64kit';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { antiriadCast } from '../src/ending-cast';
import { Bases } from '../src/stage';

/** The parade's cast: each figure's frames in a row on a sheet, with how many poses and how long (frames) each takes round. */
const out = process.argv[2] ?? '/tmp';
const t0 = performance.now();
const figures = antiriadCast(new PixelRenderer(), new Bases()).map((record) => record());
console.log(`recorded in ${(performance.now() - t0).toFixed(0)} ms`);
const W = 8 * 112, H = figures.length * 100;
const sheet = new Uint8Array(W * H);
figures.forEach((fig, row) => {
  if (!fig) { console.log(row, 'NONE'); return; }
  console.log(row, fig.name, `${fig.poses.length} poses, ${fig.poses.reduce((n, p) => n + p.frames, 0)} frames, ${fig.width}x${fig.height}`);
  fig.poses.slice(0, 8).forEach((pose, col) => pose.parts.forEach((part) => {
    const s = part.surface;
    for (let y = 0; y < s.height && y + part.dy < 98; y++) for (let x = 0; x < s.width && x + part.dx < 110; x++) {
      const v = s.pixels[y * s.width + x];
      if (v !== TRANSPARENT) sheet[(row * 100 + y + part.dy) * W + col * 112 + x + part.dx] = v;
    }
  }));
});
rgbPng(`${out}/cast.png`, indicesToRgb(sheet), W, H, 1);
