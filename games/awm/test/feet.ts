/**
 * Where Monty's feet are, in the picture the player sees: the original's (tools/probe's `renderPixels` of its VIC frame)
 * against the rebuild's, the real C64View over the rebuild's Picture drawn by the renderer (the stand-in's `picture()`:
 * the screen, then the sprites at the place the view puts them, smoothed). For each logic step of a plan, once the step
 * is over, at the end of its two frames (alpha 1): the row of Monty's lowest sprite pixel, the gap between that and the
 * first character pixel under his feet, and whether the whole composite is the original's.
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/feet.ts games/awm/build/play.state standing:12:1
 *   nice -n 15 node tools/test.mjs games/awm/test/feet.ts games/awm/build/play.state R:20,-:10 [out-dir]
 *
 * The plan is `harness.ts`'s (a joystick per logic step: `R:20,-:10`, `rand:300:7`...); `standing:N:seed` is `sweep` (a free
 * spot in every room) with the stick idle for N steps, and is what is checked: where he has stood still for four steps, the
 * row of his lowest pixel, the row of his body's, the floor under it and the gap between are the original's (sprite 1 is his
 * black outline, a pixel down and right, so his lowest row is the outline's, over the floor's top row). Walking, jumping and
 * landing are drawn between steps, gliding, and are only reported (VERBOSE, LAG=1 for how far behind the step he is drawn).
 * ROOM, X, Y put Monty somewhere else; ROOMS=a-b limits a sweep; CROP=step, ASCII=1 and an out-dir write what the feet look like.
 */
import fs from 'node:fs';
import path from 'node:path';
import { C64Machine, PixelRenderer, unpackState } from 'c64kit';
import { C64View } from '../../../packages/c64kit/src/c64/view';
import { capturedSprites, decodePicture } from '../../../packages/c64kit/src/c64/picture';
import { TRANSPARENT } from '../../../packages/c64kit/src/surface';
import { indicesPng, renderPixels } from '../../../tools/probe/render';
import { decodeStick } from '../src/input';
import { check, finish } from '../../shared/test/check';
import { applyOriginal, makeGame, makePicture, plannedRuns, startOriginal } from './harness';

const [stateFile, plan = 'R:20', outDir] = process.argv.slice(2);
const standingPlan = plan.startsWith('standing:');
const planArg = standingPlan ? plan.replace(/^standing/, 'sweep') : plan;
if (!stateFile) throw new Error('usage: feet.ts <play.state> [plan] [out-dir]');
const state = unpackState(new Uint8Array(fs.readFileSync(stateFile)));
const W = 320, H = 200;
const verbose = !!process.env.VERBOSE;

/** Monty is drawn by sprites 0 and 1 (the second his black outline). */
const MONTY = [0, 1];

interface Shown { readonly n: number; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly pixels: Uint8Array }
/** `body` is the row of his lowest pixel (sprite 0), `floor` the first character pixel under his feet at or below 3 rows above it, `sink` how many rows of him are in the floor's row or below it (negative: the rows between). */
interface Feet { readonly bottom: number; readonly gap: number; readonly body: number; readonly floor: number; readonly sink: number }

function lowestRow(sprites: readonly Shown[]): number {
  let bottom = -1;
  for (const s of sprites) for (let y = s.h - 1; y >= 0; y--) {
    if (!s.pixels.subarray(y * s.w, (y + 1) * s.w).some((v) => v !== TRANSPARENT)) continue;
    bottom = Math.max(bottom, Math.round(s.y) + y);
    break;
  }
  return bottom;
}
function columnsAt(sprites: readonly Shown[], row: number): number[] {
  const out: number[] = [];
  for (const s of sprites) {
    const y = row - Math.round(s.y);
    if (y < 0 || y >= s.h) continue;
    for (let x = 0; x < s.w; x++) if (s.pixels[y * s.w + x] !== TRANSPARENT) out.push(Math.round(s.x) + x);
  }
  return out;
}

/** The lowest row with a pixel of Monty's sprites, and the gap from it to the first character pixel below, in the columns of his lowest row. */
function feet(sprites: readonly Shown[], colour: Uint8Array, background: number): Feet | null {
  const monty = sprites.filter((s) => MONTY.includes(s.n));
  let bottom = -1;
  for (const s of monty) {
    for (let y = s.h - 1; y >= 0; y--) {
      if (!s.pixels.subarray(y * s.w, (y + 1) * s.w).some((v) => v !== TRANSPARENT)) continue;
      bottom = Math.max(bottom, Math.round(s.y) + y);
      break;
    }
  }
  if (bottom < 0) return null;
  const cols: number[] = [];
  for (const s of monty) {
    const y = bottom - Math.round(s.y);
    if (y < 0 || y >= s.h) continue;
    for (let x = 0; x < s.w; x++) if (s.pixels[y * s.w + x] !== TRANSPARENT) cols.push(Math.round(s.x) + x);
  }
  const x0 = Math.min(...cols), x1 = Math.max(...cols);
  const firstBelow = (from: number, a: number, b: number): number => {
    for (let y = Math.max(0, from); y < H; y++) for (let x = a; x <= b; x++) if (colour[y * W + x] !== background) return y;
    return -1;
  };
  const gapAt = firstBelow(bottom + 1, x0, x1);
  const body = lowestRow(monty.filter((s) => s.n === 0));
  const bodyCols = columnsAt(monty.filter((s) => s.n === 0), body);
  const floor = bodyCols.length ? firstBelow(body - 3, Math.min(...bodyCols), Math.max(...bodyCols)) : -1;
  return { bottom, gap: gapAt < 0 ? -1 : gapAt - bottom - 1, body, floor, sink: floor < 0 ? 0 : body - floor + 1 };
}

/** What the rebuild's renderer holds, as sprites on the picture (the view's smoothed place). */
function shownSprites(r: PixelRenderer): Shown[] {
  const out: Shown[] = [];
  for (const h of r.sprites) if (h.visible && h.surface && h.n !== undefined) out.push({ n: h.n, x: h.x, y: h.y, w: h.surface.width, h: h.surface.height, pixels: h.surface.pixels });
  return out;
}

/** How far the drawn Monty is from where the game put him (vertically, in pixels), over every sampled moment: the smoothing's lag. */
const lags = new Map<string, number>();
const lastTarget = { y: -1, still: 0 };
function sampleLag(r: PixelRenderer, view: C64View, cap: { sprites: readonly { n: number; y: number }[] }, alphas: readonly number[], fresh: boolean): void {
  const c = cap.sprites.find((q) => q.n === 0);
  if (!c) return;
  const target = c.y - 50;
  if (fresh) { lastTarget.still = target === lastTarget.y ? lastTarget.still + 1 : 0; lastTarget.y = target; }
  for (const a of alphas) {
    view.render(a);
    const h = r.sprites.find((q) => q.visible && q.n === 0);
    if (!h) continue;
    const key = `${lastTarget.still >= 3 ? 'standing' : 'moving'} drawn ${(h.y - target).toFixed(2)}`;
    lags.set(key, (lags.get(key) ?? 0) + 1);
  }
}

let standingSteps = 0, standingWrong = 0, firstWrong = '';
const recent: number[] = [];
const standing = new Map<string, number>();
const tally = { steps: 0, composite: 0, sameBottom: 0, sameGap: 0, rows: new Map<string, number>() };
let saved = 0;
const probe = new C64Machine();
probe.loadState(state);
const start = {
  room: Number(process.env.ROOM ?? probe.ram[0x402b] ?? 0), x: Number(process.env.X ?? probe.ram[0x5c3f] ?? 0x80), y: Number(process.env.Y ?? probe.ram[0x5c40] ?? 0x68),
};
for (const p of plannedRuns(planArg, start)) {
  let last: Uint8Array | null = null;
  const orig = startOriginal(state, p.room, p.x, p.y, { progress: p.progress, carry: p.carry, onFrame: (o) => { last = renderPixels(o); } });
  let now = orig.next(0);
  for (let i = 0; i < 20; i++) now = orig.next(0);
  const game = makeGame(now.snap.room);
  applyOriginal(game, now);
  const pic = makePicture(game, now, orig.o);
  const renderer = new PixelRenderer();
  const view = new C64View(renderer, pic);
  let warm = true, step = 0;
  recent.length = 0;
  for (const joy of standingPlan || process.env.STAND ? p.joys.map(() => 0) : p.joys) {
    if (now.snap.state === 0x13 && now.snap.step === 0xff) break; // (the ending's last step)
    if (now.ram[0x402a]) break; // the ending: its routine takes the machine for its own picture
    if ((now.snap.lives & 0x80) === 0) break; // game over likewise
    if ((now.snap.lives & 0x7f) <= 1) { orig.o.ram[0x4061] = 0x86; game.lives = 0x86; pic.assumeLives(0x86); }
    now = orig.next(joy);
    step++;
    const shown: Uint8Array | null = last;
    const cap = orig.o.capture;
    // the rebuild: its two phases, drawn by the view (the step's own frame, then the one that ends it at alpha 1)
    pic.frameA(game.lift.tick(game.rng));
    view.update({ fresh: false, frames: 2 });
    sampleLag(renderer, view, pic.capture, [0, 0.5, 1], false);
    pic.beginB(game.lift.tick(game.rng));
    game.logic(decodeStick(joy));
    pic.endB();
    view.update({ fresh: true, frames: 2 });
    sampleLag(renderer, view, pic.capture, [0, 0.5], true);
    view.render(1);
    if (warm) { warm = false; continue; }
    if (!shown) continue;
    if (process.env.SPRITES) console.log(`step ${step}: original ${cap.sprites.map((q) => `n${q.n} ${q.x},${q.y} c${q.colour}`).join(' | ')}`);
    const ours = renderer.picture();
    const fo = feet(capturedSprites(cap), decodePicture(orig.o.ram, cap).colour, cap.rows[3]?.bg[0] ?? 0);
    const fr = feet(shownSprites(renderer), decodePicture(pic.ram, pic.capture).colour, pic.capture.rows[3]?.bg[0] ?? 0);
    tally.steps++;
    const ys = capturedSprites(cap).find((q) => q.n === 0)?.y ?? -1;
    recent.push(ys); if (recent.length > 4) recent.shift();
    if (recent.length === 4 && recent.every((v) => v === ys) && fo && fr) {
      const k = `standing: original gap ${fo.gap} sink ${fo.sink}, ours gap ${fr.gap} sink ${fr.sink}`;
      standingSteps++;
      if (fo.bottom !== fr.bottom || fo.body !== fr.body || fo.floor !== fr.floor || fo.gap !== fr.gap) { standingWrong++; if (!firstWrong) firstWrong = `${p.label} step ${step}: original ${JSON.stringify(fo)}, ours ${JSON.stringify(fr)}`; }
      standing.set(k, (standing.get(k) ?? 0) + 1);
    }
    const same = ours.every((v, i) => v === shown[i]);
    if (same) tally.composite++;
    if (fo && fr && fo.bottom === fr.bottom) tally.sameBottom++;
    if (fo && fr && fo.gap === fr.gap) tally.sameGap++;
    const key = `original bottom ${fo?.bottom} gap ${fo?.gap} / ours bottom ${fr?.bottom} gap ${fr?.gap}`;
    tally.rows.set(key, (tally.rows.get(key) ?? 0) + 1);
    if (verbose) {
      let count = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
      ours.forEach((v, i) => { if (v !== shown[i]) { count++; x0 = Math.min(x0, i % W); x1 = Math.max(x1, i % W); y0 = Math.min(y0, Math.floor(i / W)); y1 = Math.max(y1, Math.floor(i / W)); } });
      console.log(`${p.label} step ${step}: ${key}${same ? '' : ` (${count} pixels differ in ${x0},${y0}-${x1},${y1})`}`);
    }
    if (outDir && process.env.CROP && fo && step === Number(process.env.CROP)) {
      fs.mkdirSync(outDir, { recursive: true });
      const m = capturedSprites(cap).find((q) => q.n === 0);
      const cx = Math.max(0, Math.min(W - 48, Math.round((m?.x ?? 0) - 12))), cy = Math.max(0, Math.min(H - 40, Math.round((m?.y ?? 0) - 4)));
      const crop = (px: Uint8Array): Uint8Array => { const o = new Uint8Array(48 * 40); for (let y = 0; y < 40; y++) for (let x = 0; x < 48; x++) o[y * 48 + x] = px[(cy + y) * W + cx + x] ?? 0; return o; };
      if (process.env.ASCII) {
        const sp = capturedSprites(cap), chars = decodePicture(orig.o.ram, cap).colour, bg = cap.rows[3]?.bg[0] ?? 0;
        const at = (n: number, x: number, y: number): boolean => { const q = sp.find((t) => t.n === n); if (!q) return false; const X = x - Math.round(q.x), Y = y - Math.round(q.y); return X >= 0 && Y >= 0 && X < q.w && Y < q.h && q.pixels[Y * q.w + X] !== TRANSPARENT; };
        for (let y = cy + 12; y < cy + 30; y++) console.log(`${String(y).padStart(3)} ` + Array.from({ length: 34 }, (_, i) => { const x = cx + 6 + i; return at(0, x, y) ? 'o' : at(1, x, y) ? 'x' : chars[y * W + x] !== bg ? '#' : '.'; }).join(''));
      }
      const name = `${process.env.CROPNAME ?? 'crop'}-room${p.room}`;
      indicesPng(path.join(outDir, `${name}-original.png`), crop(shown), 48, 40, 10);
      indicesPng(path.join(outDir, `${name}-ours.png`), crop(ours), 48, 40, 10);
    }
    if (outDir && !same && !process.env.CROP && saved < 20) {
      fs.mkdirSync(outDir, { recursive: true });
      const name = `${p.label.replace(/[^a-z0-9]+/gi, '-')}-step${step}`;
      indicesPng(path.join(outDir, `${name}-original.png`), shown, W, H);
      indicesPng(path.join(outDir, `${name}-ours.png`), ours, W, H);
      saved++;
    }
  }
}
console.log(`${planArg}: ${tally.steps} steps; composite identical ${tally.composite}, lowest sprite row identical ${tally.sameBottom}, gap identical ${tally.sameGap}`);
for (const [k, n] of [...tally.rows].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${n}x ${k}`);
if (process.env.LAG) for (const [k, n] of [...lags].sort()) console.log(`  ${n}x ${k}`);
for (const [k, n] of [...standing].sort()) console.log(`  ${n}x ${k}`);
if (standingPlan) {
  check(`Monty stood still on his feet in ${standingSteps} steps`, standingSteps > 0);
  check(`standing, the rows of his feet and the floor under them are the original's in all of them (${standingWrong} not${firstWrong ? `: ${firstWrong}` : ''})`, standingWrong === 0);
  finish();
}
