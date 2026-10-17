/**
 * Auf Wiedersehen Monty's sprites as the browser draws them: the real C64View over the Program, rendered at alphas between
 * the frames. The game steps once in two frames (the logic phase moves the sprites, the drawing phase after it leaves them),
 * so a view smoothing from frame to frame would glide in one frame and hold in the next; told which frame the step was in
 * (`Program.viewStep`), it glides across both. Checked:
 * - Monty walking: the position drawn advances by the same amount at every half frame, none held (and with the step
 *   unknown to the view, the old way, it does hold: the check can see the fault);
 * - V (whole pixels): the position drawn is the step's, a whole pixel, and moves at each step;
 * - a sprite that jumps far is drawn at once at the new place, one that first shows between steps is drawn where it is;
 * - a game that moves its sprites every frame (the default step) is drawn as before.
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/smooth.ts
 */
import { EVERY_FRAME, PixelRenderer, type ViewStep } from 'c64kit';
import type { SpriteCapture } from '../../../packages/c64kit/src/c64/machine';
import { C64 } from '../../../packages/c64kit/src/c64/machine';
import { C64View } from '../../../packages/c64kit/src/c64/view';
import { Stick } from '../src/input';
import { Program } from '../src/program';
import { check, finish } from '../../shared/test/check';

/** Monty is sprite 2 in play. */
const MONTY = 2;

/**
 * Monty walking right from a new game: the x drawn for his sprite at each half frame of `frames` frames, from the
 * frame `from` (once he is up to his pace). `told`: the view is told the step (else it is not, as before).
 */
function walk(told: boolean, snap: boolean, from: number, frames: number) {
  const program = new Program();
  const renderer = new PixelRenderer();
  renderer.snap = snap;
  const view = new C64View(renderer, program);
  const frame = (stick: number) => {
    program.frame({ stick, f1: false, f7: false });
    view.update(told ? program.viewStep : EVERY_FRAME);
  };
  for (let i = 0; i < 120; i++) frame(0);
  frame(Stick.Fire);
  for (let i = 0; i < 60; i++) frame(0);
  const xs: number[] = [];
  for (let f = 0; f < from + frames; f++) {
    frame(Stick.Right);
    if (f < from) continue;
    for (const a of [0, 0.5]) {
      view.render(a);
      const h = renderer.sprites.find((s) => s.visible && s.n === MONTY);
      if (h) xs.push(h.x);
    }
  }
  return xs;
}
const diffs = (xs: number[]) => xs.slice(1).map((x, i) => x - xs[i]);
const text = (d: number[]) => d.map((s) => s.toFixed(2)).join(' ');

{
  // (from the 8th frame, 12 frames: well into his walk and before the wall)
  const xs = walk(true, false, 8, 12);
  const d = diffs(xs);
  check(`Monty walking: ${xs.length} half frames drawn`, xs.length === 24);
  check(`the position drawn advances evenly at every half frame, a quarter pixel (${text(d)})`, d.every((s) => Math.abs(s - 0.25) < 1e-6));
  const old = diffs(walk(false, false, 8, 12));
  check(`not told the step (the old way) it holds in every other frame: the check sees the fault (${old.filter((s) => Math.abs(s) < 1e-6).length} holds)`, old.filter((s) => Math.abs(s) < 1e-6).length >= 6);
}
{
  const xs = walk(true, true, 8, 12);
  check(`V: whole pixels (${xs.slice(0, 8).join(' ')} ...)`, xs.every((x) => Number.isInteger(x)));
  check('V: a pixel at each step, none between', diffs(xs).every((s, i) => (i % 4 === 1 ? s === 1 : s === 0)) || diffs(xs).every((s, i) => (i % 4 === 3 ? s === 1 : s === 0)));
}

// ---- a sprite on its own: the reset rules --------------------------------------------------------------------
function sprite(n: number, x: number, y: number): SpriteCapture {
  return { n, x, y, data: new Uint8Array(64).fill(0xff), colour: 1, multicolour: false, expandX: false, expandY: false, behind: false, mc1: 0, mc2: 0 };
}
function stage() {
  const m = new C64(), renderer = new PixelRenderer(), view = new C64View(renderer, m);
  const at = (a: number, i = 0) => { view.render(a); return renderer.sprites[i].x + 24; }; // (back to the sprite register's x)
  const show = (sprites: SpriteCapture[], step: ViewStep) => { m.capture.sprites = sprites; view.update(step); };
  return { at, show, renderer };
}
const FRESH: ViewStep = { fresh: true, frames: 2 }, BETWEEN: ViewStep = { fresh: false, frames: 2 };
{
  const { at, show } = stage();
  for (let k = 0; k < 6; k++) { show([sprite(1, 100 + 2 * k, 100)], FRESH); at(0); show([sprite(1, 100 + 2 * k, 100)], BETWEEN); at(0); }
  show([sprite(1, 300, 100)], FRESH);
  check('a jump of a hundred pixels: drawn at the new place at once, not glided in', at(0) === 300 && at(0.5) === 300);
  show([sprite(1, 300, 100)], BETWEEN);
  check('and held there between steps', at(0) === 300 && at(0.99) === 300);
}
{
  const { at, show } = stage();
  show([sprite(1, 100, 100)], FRESH);
  show([sprite(1, 100, 100), sprite(3, 50, 60)], BETWEEN);
  check('a sprite that first shows between steps is drawn where it is', at(0, 1) === 50 && at(0.9, 1) === 50);
  show([sprite(1, 102, 100), sprite(3, 52, 60)], FRESH);
  check('and glides with the others from the next step', at(0.5, 1) > 50 && at(0.5, 1) < 52);
}

// ---- a game that steps every frame: unchanged -------------------------------------------------------------------
{
  const { at, show } = stage();
  const xs: number[] = [];
  for (let f = 0; f < 10; f++) { show([sprite(3, 100 + 3 * f, 100)], EVERY_FRAME); xs.push(at(0), at(0.5)); }
  const d = diffs(xs.slice(8));
  check(`a sprite moving 3 px every frame (the default step): 1.5 px each half frame (${text(d)})`, d.every((s) => Math.abs(s - 1.5) < 0.01));
}

finish();
