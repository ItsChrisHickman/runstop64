/**
 * The whole picture, the original and the rebuild side by side: the same joystick at every logic step, and
 * every frame the original shows, as the 320 x 200 picture (tools/probe's `renderPixels`: the characters, then
 * the sprites as the VIC orders them), against the frame the rebuild makes for the same moment of the main
 * loop's two phases (src/picture.ts; lockstep.ts's machinery runs the original and the plans: harness.ts).
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/picture.ts games/awm/build/play.state rand:600:7 [out-dir]
 *   ROOMS=0-19 nice -n 15 node tools/test.mjs games/awm/test/picture.ts games/awm/build/play.state sweep:300:1 [out-dir]
 *
 * The plans are the lockstep's (`sweep:N:seed`, `kinds:N:seed`, `deliver:N:seed`, `rand:N:seed`, scripted
 * `R:100,F:1`); ROOM=n or ROOMS=a-b limits the sweep and kinds plans, RUN=n or RUN=a-b plays only those runs (counted from 0) of the plan. Each frame the original shows is
 * either the same as the rebuild's, or torn (see `isTorn`), or a frame apart (it equals the rebuild's frame before or after), or
 * different. The original draws at 50 Hz and thinks at 25: the frames of a logic step are the drawing phase
 * ($5473) and the logic phase ($54AE); the frames of a room being drawn (the original takes about six, filling
 * the room in as it goes) are counted apart: the rebuild draws a room at once. The first frame of a run
 * that is not the same is saved (the original's, the rebuild's and where they differ) in `out-dir`.
 * The first logic step of a run is played but its drawing phase not compared: the sprite registers it shows
 * are those of the step before the snapshot, which the rebuild does not have.
 */
import fs from 'node:fs';
import path from 'node:path';
import { C64Machine, unpackState, type FrameCapture } from 'c64kit';
import { indicesPng, renderPixels } from '../../../tools/probe/render';
import { decodeStick } from '../src/input';
import { applyOriginal, makeGame, makePicture, plannedRuns, startOriginal, type Mark, type PlannedRun } from './harness';

const [stateFile, planArg = 'rand:600:1', outDir] = process.argv.slice(2);
if (!stateFile) throw new Error('usage: picture.ts <play.state> [plan] [out-dir]');
const state = unpackState(new Uint8Array(fs.readFileSync(stateFile)));
const W = 320, H = 200;
const verbose = !!process.env.VERBOSE;

/** A frame the original showed. */
interface Shown { readonly pixels: Uint8Array; readonly capture: FrameCapture; readonly marks: readonly Mark[]; readonly charset: Uint8Array }

function hashOf(pixels: Uint8Array): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < pixels.length; i++) h = Math.imul(h ^ (pixels[i] ?? 0), 0x01000193);
  return h >>> 0;
}

/** Where two pictures differ: how many pixels, and the box round them. */
function differences(a: Uint8Array, b: Uint8Array): { count: number; box: string; mask: Uint8Array } {
  const mask = new Uint8Array(W * H);
  let count = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let i = 0; i < W * H; i++) {
    if (a[i] === b[i]) continue;
    mask[i] = 2;
    count++;
    const x = i % W, y = Math.floor(i / W);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { count, box: count ? `${x0},${y0}-${x1},${y1}` : '', mask };
}

/** What differs in what the VIC was given: the first text row that has other codes or colours, and the sprites. */
function describe(a: FrameCapture, b: FrameCapture): string {
  const out: string[] = [];
  for (let r = 0; r < 25 && out.length < 2; r++) {
    const ra = a.rows[r], rb = b.rows[r];
    if (!ra || !rb) { out.push(`row ${r} ${ra ? '' : 'original '}${rb ? '' : 'rebuild '}missing`); continue; }
    for (let c = 0; c < 40; c++) {
      if (ra.codes[c] !== rb.codes[c]) { out.push(`row ${r} col ${c} code ${ra.codes[c]?.toString(16)} / ${rb.codes[c]?.toString(16)}`); break; }
      if ((ra.colours[c] ?? 0) !== (rb.colours[c] ?? 0)) { out.push(`row ${r} col ${c} colour ${ra.colours[c]} / ${rb.colours[c]}`); break; }
    }
    if (ra.d011 !== rb.d011 || ra.d018 !== rb.d018 || ra.d016 !== rb.d016 || ra.line !== rb.line) out.push(`row ${r} regs ${ra.d011.toString(16)},${ra.d016},${ra.d018.toString(16)},${ra.line} / ${rb.d011.toString(16)},${rb.d016},${rb.d018.toString(16)},${rb.line}`);
  }
  const key = (s: FrameCapture['sprites'][number]): string => `n${s.n} ${s.x},${s.y} c${s.colour} mc${+s.multicolour} ey${+s.expandY} bh${+s.behind} ${s.mc1},${s.mc2} ${Array.from(s.data.subarray(0, 63)).join('.')}`;
  const sa = a.sprites.map(key), sb = b.sprites.map(key);
  if (sa.length !== sb.length) out.push(`${sa.length} sprites / ${sb.length}`);
  for (let i = 0; i < Math.min(sa.length, sb.length) && out.length < 8; i++) {
    if (sa[i] !== sb[i]) out.push(`sprite ${i}: ${sa[i]?.slice(0, 40)} / ${sb[i]?.slice(0, 40)}`);
  }
  return out.join('; ');
}

interface Tally { same: number; torn: number; apart: number; different: number; transition: number }
const total: Tally = { same: 0, torn: 0, apart: 0, different: 0, transition: 0 };
let saved = 0;
const MAX_SAVED = Number(process.env.SAVE ?? 40);

/**
 * Whether the original's frame is a frame torn by its own logic: the beam draws the screen while the main loop writes
 * to it, so each pixel of the picture is as the screen was before the logic phase changed it (an item taken, a box
 * filled, a counter printed) or as after, the writes landing at different moments. Every pixel is one or the other,
 * and some pixel shows the earlier.
 */
function isTorn(shown: Uint8Array, before: Uint8Array, after: Uint8Array): boolean {
  let tornPixel = false;
  for (let i = 0; i < W * H; i++) {
    const old = shown[i] === before[i], now = shown[i] === after[i];
    if (!old && !now) { if (process.env.DEBUG) console.log(`  neither at ${i % W},${Math.floor(i / W)}: ${shown[i]} before ${before[i]} after ${after[i]}`); return false; }
    if (old && !now) tornPixel = true;
  }
  return tornPixel;
}

/** One run: returns its tally and a line about its first difference. */
function runPicture(p: PlannedRun): { tally: Tally; first: string; steps: number } {
  const frames: Shown[] = [];
  const orig = startOriginal(state, p.room, p.x, p.y, {
    progress: p.progress, carry: p.carry,
    onFrame: (o: C64Machine, marks) => frames.push({ pixels: renderPixels(o), capture: o.capture, marks: [...marks], charset: o.ram.slice(0x3800, 0x4000) }),
  });
  // (the room takes the original some frames to draw; its first logic steps run with the stick idle and are not compared)
  let now = orig.next(0);
  for (let i = 0; i < 20; i++) now = orig.next(0);
  const game = makeGame(now.snap.room);
  applyOriginal(game, now);
  const pic = makePicture(game, now, orig.o);

  const tally: Tally = { same: 0, torn: 0, apart: 0, different: 0, transition: 0 };
  const torn = new Set<number>();
  const hashesO: number[] = [], hashesR: number[] = [];
  const pairs: { o: number; r: number }[] = [];
  let first = '';
  let skipA = false, warm = true;
  let lastShown: Uint8Array | null = null, lastMade: Uint8Array | null = null;
  let step = 0;
  for (const joy of p.joys) {
    if (now.snap.state === 0x13 && now.snap.step === 0xff) break; // (the ending's last step: nothing to compare)
    frames.length = 0;
    now = orig.next(joy);
    step++;
    const shown = frames.slice();
    const last = shown[shown.length - 1];
    if (!last) throw new Error('the original showed no frame');
    const end = last.marks.findIndex((m) => m.at === 'end');
    const aAfter = last.marks.some((m, i) => i > end && m.at === 'draw');

    // the rebuild: the drawing phase (unless the last frame already held it), the logic phase, and the drawing phase that followed a room's drawing
    if (process.env.DEBUG && step >= 86 && step <= 89) console.log(`  step ${step}: original frames ${shown.map((f) => f.capture.sprites.filter((q) => q.n === 4).map((q) => `${q.x},${q.y}`).join('|') + '[' + f.marks.map((k) => k.at + '@' + k.line).join(' ') + ']').join('  ')}`);
    const made: Uint8Array[] = [];
    const madeCaps: FrameCapture[] = [];
    const frameA = (): void => { pic.frameA(game.lift.tick(game.rng)); made.push(renderPixels(pic)); madeCaps.push(pic.capture); };
    const hadA = !skipA;
    if (hadA) frameA();
    pic.beginB(game.lift.tick(game.rng));
    const beforeLogic = renderPixels(pic);
    game.logic(decodeStick(joy));
    pic.endB();
    made.push(renderPixels(pic)); madeCaps.push(pic.capture);
    if (process.env.DEBUG && step >= 86 && step <= 89) console.log(`  step ${step}: mine B ${pic.capture.sprites.filter((q) => q.n === 4).map((q) => `${q.x},${q.y}`).join('|')}`);
    if (aAfter) { frameA(); skipA = true; } else skipA = false;

    // which frames go with which: the drawing phase's, and the frame the logic ended in (the rebuild's last)
    const base = hashesO.length, baseR = hashesR.length;
    shown.forEach((s) => hashesO.push(hashOf(s.pixels)));
    made.forEach((m) => hashesR.push(hashOf(m)));
    const compared: { o: number; r: number }[] = [];
    if (hadA && !warm) compared.push({ o: 0, r: 0 });
    compared.push({ o: shown.length - 1, r: made.length - 1 });
    tally.transition += Math.max(0, shown.length - (hadA ? 2 : 1));
    for (const c of compared) {
      const s = shown[c.o], m = made[c.r];
      if (!s || !m) continue;
      pairs.push({ o: base + c.o, r: baseR + c.r });
      if (hashOf(s.pixels) === hashOf(m) && s.pixels.every((v, i) => v === m[i])) continue;
      if (c.r === (hadA ? 1 : 0) && isTorn(s.pixels, beforeLogic, m)) { torn.add(pairs.length - 1); continue; }
      if (process.env.DEBUG) { const bad: number[] = []; for (let g = 0; g < 256; g++) for (let b = 0; b < 8; b++) if (s.charset[g * 8 + b] !== pic.ram[0x3800 + g * 8 + b]) { bad.push(g); break; } console.log(`  glyphs differing at the end of this step: ${bad.join(',')}`); }
      if (process.env.DEBUG) console.log(`  step ${step} frame ${c.o}/${shown.length - 1} marks ${s.marks.map((k) => `${k.at}@${k.line}`).join(' ')} lift ${game.lift.phase},${game.lift.delay} ${describe(s.capture, madeCaps[c.r] ?? pic.capture).slice(0, 120)}`);
      if (first) continue;
      const d = differences(s.pixels, m);
      first = `step ${step} frame ${c.o}/${shown.length - 1}: ${d.count} pixels differ in ${d.box}; ${describe(s.capture, madeCaps[c.r] ?? pic.capture)}`;
      if (outDir && saved < MAX_SAVED) {
        fs.mkdirSync(outDir, { recursive: true });
        const name = `${p.label.replace(/[^a-z0-9]+/gi, '-')}-step${step}`;
        indicesPng(path.join(outDir, `${name}-original.png`), s.pixels, W, H);
        indicesPng(path.join(outDir, `${name}-rebuild.png`), m, W, H);
        indicesPng(path.join(outDir, `${name}-diff.png`), d.mask, W, H);
        saved++;
      }
    }
    warm = false;
    lastShown = shown[shown.length - 1]?.pixels ?? null;
    lastMade = made[made.length - 1] ?? null;
    if (now.ram[0x402a]) break; // the ending: its routine takes the machine for its own picture
    if ((now.snap.lives & 0x80) === 0) break; // game over: its routine takes the machine for its own picture
    if ((now.snap.lives & 0x7f) <= 1) { orig.o.ram[0x4061] = 0x86; game.lives = 0x86; pic.assumeLives(0x86); }
  }
  // STILL=n saves the rebuild's picture and the original's at the end of the run, for looking at
  if (outDir && process.env.STILL && lastShown && lastMade) {
    fs.mkdirSync(outDir, { recursive: true });
    const name = p.label.replace(/[^a-z0-9]+/gi, '-');
    indicesPng(path.join(outDir, `still-${name}-original.png`), lastShown, W, H);
    indicesPng(path.join(outDir, `still-${name}-rebuild.png`), lastMade, W, H);
  }
  // (a frame apart: the same as the rebuild's frame before or after, or the original's neighbour)
  for (const [i, { o, r }] of pairs.entries()) {
    if (torn.has(i)) { tally.torn++; continue; }
    const ho = hashesO[o], hr = hashesR[r];
    if (ho === hr) tally.same++;
    else if (ho === hashesR[r - 1] || ho === hashesR[r + 1] || hr === hashesO[o - 1] || hr === hashesO[o + 1]) tally.apart++;
    else tally.different++;
  }
  return { tally, first, steps: step };
}

// ---- main ------------------------------------------------------------------------------------

const probe = new C64Machine();
probe.loadState(state);
const start = { room: probe.ram[0x402b] ?? 0, x: probe.ram[0x5c3f] ?? 0x80, y: probe.ram[0x5c40] ?? 0x68 };
let runs = 0, clean = 0, steps = 0;
const [runFrom, runTo = runFrom] = (process.env.RUN ?? '').split('-').filter(Boolean).map(Number);
let index = -1;
for (const p of plannedRuns(planArg, start)) {
  index++;
  if (runFrom !== undefined && (index < runFrom || index > (runTo ?? runFrom))) continue;
  const r = runPicture(p);
  runs++; steps += r.steps;
  const { same, torn, apart, different, transition } = r.tally;
  total.same += same; total.torn += torn; total.apart += apart; total.different += different; total.transition += transition;
  if (torn === 0 && apart === 0 && different === 0) clean++;
  if (torn || apart || different || verbose) console.log(`${p.label}: ${same} same, ${torn} torn, ${apart} a frame apart, ${different} different (${transition} room-drawing frames not compared) in ${r.steps} steps${r.first ? `; first: ${r.first}` : ''}`);
}
const frames = total.same + total.torn + total.apart + total.different;
console.log(`${planArg}: ${clean} of ${runs} runs with every frame identical; of ${frames} frames compared in ${steps} steps: ${total.same} same, ${total.torn} torn by the original's own logic, ${total.apart} a frame apart, ${total.different} different; ${total.transition} frames of rooms being drawn not compared`);
if (total.apart || total.different) process.exit(1);
