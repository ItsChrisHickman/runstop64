/**
 * A sprite standing still is drawn where the original's VIC draws it, rows and all: the real C64View over a running original
 * (c64kit's model from a snapshot, the stick idle), rendered at the end of its frame (alpha 1) and put together as the browser
 * does (the stand-in renderer's `picture()`: the characters over the backdrop, the sprites over them in their order), against
 * tools/probe's `renderPixels` of the same frame (the VIC's own picture). In the box of every sprite that has stood still for
 * a few frames the two pictures must be the same: the view's placing (VIC y - 50, the backdrop, the order), the smoothing at
 * rest and the sprite's rows add nothing and take nothing. Standing Monty (Auf Wiedersehen Monty, Monty on the Run's engine)
 * and Antiriad's hero are drawn by the same view; a sprite that is moving is drawn between its steps, which this does not judge.
 *
 *   nice -n 15 node tools/test.mjs games/shared/test/still-sprites.ts games/antiriad/test/original.state [frames]
 *   nice -n 15 node tools/test.mjs games/shared/test/still-sprites.ts games/awm/build/play.state 200
 */
import fs from 'node:fs';
import { C64Machine, PixelRenderer, unpackState } from 'c64kit';
import { C64View } from '../../../packages/c64kit/src/c64/view';
import { renderPixels } from '../../../tools/probe/render';
import { check, finish } from './check';

const [stateFile, framesArg = '200'] = process.argv.slice(2);
if (!stateFile) throw new Error('usage: still-sprites.ts <state> [frames]');
const W = 320, H = 200;
const STILL_FOR = 4;

const m = new C64Machine();
m.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
const renderer = new PixelRenderer();
const view = new C64View(renderer, m);

/** Where each sprite occurrence was and what it drew, as text, and for how many frames it has been so. */
const stood = new Map<string, { at: string; frames: number }>();
let compared = 0, wrong = 0, first = '';
for (let f = 0; f < Number(framesArg); f++) {
  m.joy1 = m.joy2 = 0x1f;
  if (!m.runFrame()) throw new Error('the CPU stopped');
  view.update();
  view.render(1);
  const ours = renderer.picture(), vic = renderPixels(m);
  const count = new Array<number>(8).fill(0);
  const seen = new Set<string>();
  for (const s of m.capture.sprites) {
    const key = `${s.n}:${count[s.n]++}`;
    seen.add(key);
    const at = `${s.x},${s.y},${s.expandX},${s.expandY},${s.multicolour},${s.colour},${Array.from(s.data.subarray(0, 63)).join('.')}`;
    const e = stood.get(key);
    if (e && e.at === at) e.frames++;
    else stood.set(key, { at, frames: 0 });
    if ((stood.get(key)?.frames ?? 0) < STILL_FOR) continue;
    // (its box on the picture, a pixel or so wider: the box of the sprite itself)
    const x0 = (s.x >= 504 ? s.x - 504 : s.x) - 24, y0 = s.y - 50, w = s.expandX ? 48 : 24, h = s.expandY ? 42 : 21;
    let differs = 0;
    for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++) for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) if (ours[y * W + x] !== vic[y * W + x]) differs++;
    compared++;
    if (differs) { wrong++; if (!first) first = `frame ${f}, sprite ${s.n} at ${x0},${y0}: ${differs} pixels differ`; }
  }
  for (const key of [...stood.keys()]) if (!seen.has(key)) stood.delete(key);
}
check(`sprites standing still were compared (${compared} sprite-frames)`, compared > 0);
check(`every one is drawn exactly as the VIC draws it (${wrong} not${first ? `: ${first}` : ''})`, wrong === 0);
finish();
