import { indicesToRgb, renderPixels, rgbPng } from '../../../tools/probe/render';
import { SceneReel } from '../src/ending';
import { Bases } from '../src/stage';
import { SCENES } from '../src/ending-scenes';
import { PixelRenderer } from 'c64kit';
import { talX, talY } from '../src/pilot';
import { V } from '../src/vars';

/**
 * Play scenes of the ending's montage headless: where Tal goes, when what the scene says gets done, and a sheet of frames.
 *   nice -n 15 node tools/test.mjs games/antiriad/re/play.ts <out-dir> <scene index or all> [every N frames for the sheet, 0: none]
 */
const out = process.argv[2] ?? '/tmp';
const which = process.argv[3] ?? 'all';
const every = Number(process.argv[4] ?? 60);
const bases = new Bases();
const renderer = new PixelRenderer();
const picks = which === 'all' ? SCENES.map((_, i) => i) : which.split(',').map(Number);
for (const i of picks) {
  const scene = SCENES[i];
  const reel = new SceneReel(renderer, bases, scene);
  const shots: Uint8Array[] = [];
  let doneAt = -1, rooms = new Set<number>(), dead = 0;
  for (let f = 0; f < scene.frames; f++) {
    reel.tick();
    const g = reel.g;
    rooms.add(g.ram[V.room]);
    if (doneAt < 0 && scene.done(g)) doneAt = f;
    if (g.ram[V.life] === 0) dead++;
    if (every && f % every === every - 1) shots.push(renderPixels(g.m));
    if (every && f % (every * 2) === 0) console.log(`  f${f} room ${g.ram[V.room].toString(16)} x ${talX(g)} y ${talY(g)} anim ${g.ram[V.anim].toString(16)} score ${g.ram[0x0697]} nrg ${g.ram[V.suitEnergy]}`);
  }
  console.log(`scene ${i} (${scene.name}): done at ${doneAt} of ${scene.frames}; rooms ${[...rooms].map((r) => r.toString(16)).join(',')}; life 0 in ${dead} frames`);
  if (shots.length) {
    const COLS = 2, W = 320, H = 200, rows = Math.ceil(shots.length / COLS);
    const sheet = new Uint8Array(COLS * W * rows * H);
    shots.forEach((px, k) => {
      const cx = (k % COLS) * W, cy = Math.floor(k / COLS) * H;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) sheet[(cy + y) * COLS * W + cx + x] = px[y * W + x];
    });
    rgbPng(`${out}/scene-${i}.png`, indicesToRgb(sheet), COLS * W, rows * H, 1);
  }
  reel.dispose();
}
