/**
 * The title, the original and the rebuild side by side: the original from a snapshot taken as its title starts
 * ($406E, `games/awm/build/t807.state`: games/awm/build/README.md), with the same keys held in each, and at every
 * frame the 320 x 200 picture (tools/probe's `renderPixels`) against the frame the rebuild's `Title` makes
 * (src/title.ts, a `FrameCapture` as `C64View` draws it).
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/title.ts games/awm/build/t807.state 400 [events] [out-dir]
 *
 * `events` are `key:from-to` joined by commas (frames counted from the title's first loop pass): `f7:100-103` holds F7,
 * `f1:200-203` F1, `fire:300-301` fire (which starts a game: the run ends there; what the original and the rebuild
 * start with is compared). An empty list is the title left alone. LEAD=n: the frames of the room being drawn before
 * the loop's first pass that the interrupt chain runs through (its scroller steps), as `SETUP_FRAMES`.
 *
 * Every frame must be the same as the original's, except those the original's own work tears (it draws part of
 * the frame before the loop's pass and part after: counted as torn when every differing pixel has the value it
 * had in the frame before). The first frame that differs is saved (the original's, the rebuild's, where they
 * differ) in `out-dir`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { C64Machine, unpackState } from 'c64kit';
import { indicesPng, renderPixels } from '../../../tools/probe/render';
import { Scroller } from '../src/scroller';
import { SETUP_FRAMES, Title, type TitleKeys } from '../src/title';

const [stateFile, framesArg = '400', eventsArg = '', outDir] = process.argv.slice(2);
if (!stateFile) throw new Error('usage: title.ts <t807.state> [frames] [events] [out-dir]');
const W = 320, H = 200;

/** The keys held at each frame, from the events. */
const events = eventsArg.split(',').filter(Boolean).map((e) => {
  const [key = '', range = '0'] = e.split(':');
  const [from = '0', to = from] = range.split('-');
  return { key, from: Number(from), to: Number(to) };
});
function held(frame: number): TitleKeys {
  const on = (key: string): boolean => events.some((e) => e.key === key && frame >= e.from && frame <= e.to);
  return { fire: on('fire'), f1: on('f1'), f7: on('f7') };
}

// ---- the original ----------------------------------------------------------------------------

const o = new C64Machine();
o.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
let loopTop = false;
const step = o.cpu.step.bind(o.cpu);
o.cpu.step = () => {
  if (o.cpu.pc === 0x418d) loopTop = true;
  return step();
};
const FIRE = 0x10;
function press(keys: TitleKeys): void {
  o.joy1 = o.joy2 = keys.fire ? 0x1f & ~FIRE : 0x1f;
  // (the keyboard matrix: F1 is row 0 column 4, F7 row 0 column 3)
  const down: [number, number][] = [];
  if (keys.f1) down.push([0, 4]);
  if (keys.f7) down.push([0, 3]);
  o.keys = down;
}

// run to the first pass of the loop: the frame it begins in
let lead = 0;
while (!loopTop) {
  if (!o.runFrame()) throw new Error('the CPU stopped');
  lead++;
  if (lead > 100) throw new Error('the title never reached its loop');
}
console.log(`the loop's first pass is in frame ${lead} after the snapshot (SETUP_FRAMES is ${SETUP_FRAMES})`);

// ---- the rebuild -----------------------------------------------------------------------------

const scroller = new Scroller();
const title = new Title(scroller, o.ram[0x4066] ?? 0, undefined, process.env.LEAD !== undefined ? Number(process.env.LEAD) : SETUP_FRAMES);

// ---- compare ---------------------------------------------------------------------------------

const frames = Number(framesArg);
let same = 0, torn = 0, different = 0, first = '', previous: Uint8Array | null = null, started = false;
let originalFrame = lead;
for (let f = 0; f < frames; f++) {
  const keys = held(f);
  const result = title.frame(keys);
  if (result === 'start') {
    // the original reads fire the same way and starts: the game it begins is the next frame's business
    press(keys);
    o.runFrame();
    started = true;
    console.log(`fire at frame ${f}: the original is in room $${(o.ram[0x402b] ?? 0).toString(16)} with lives $${(o.ram[0x4061] ?? 0).toString(16)}, Monty at ${o.ram[0x5c3f]},${o.ram[0x5c40]} state ${o.ram[0x4f87]}`);
    break;
  }
  // (the first pass is in the frame the loop was first reached in: that one has already run)
  if (f > 0) {
    press(keys);
    if (!o.runFrame()) throw new Error('the CPU stopped');
    originalFrame++;
  }
  // (the frame the loop was first reached in is the room's last: its first pass runs after the beam has gone past: not compared)
  if (f === 0) continue;
  const a = renderPixels(o), b = renderPixels(title);
  let count = 0;
  for (let i = 0; i < W * H; i++) if (a[i] !== b[i]) count++;
  if (count === 0) same++;
  else if (previous && a.every((v, i) => v === b[i] || v === previous?.[i])) torn++;
  else {
    different++;
    if (!first) {
      first = `frame ${f} (the original's ${originalFrame}): ${count} pixels differ`;
      if (outDir) {
        fs.mkdirSync(outDir, { recursive: true });
        indicesPng(path.join(outDir, `title-${f}-original.png`), a, W, H);
        indicesPng(path.join(outDir, `title-${f}-rebuild.png`), b, W, H);
        indicesPng(path.join(outDir, `title-${f}-diff.png`), a.map((v, i) => (v === b[i] ? 0 : 2)), W, H);
      }
    }
  }
  previous = a;
  if (outDir && process.env.STILLS && f % Number(process.env.STILLS) === 0) {
    fs.mkdirSync(outDir, { recursive: true });
    indicesPng(path.join(outDir, `still-${String(f).padStart(4, '0')}.png`), b, W, H);
  }
}
console.log(`title: ${frames} frames${started ? ' to the start' : ''}: ${same} same, ${torn} torn, ${different} different${first ? `; first: ${first}` : ''}`);
if (different > 0) process.exit(1);
