/**
 * The whole flow, the original and the rebuild side by side: the title, fire, a game in room $48, the last life lost
 * (or the ending's flag set), GAME OVER, the title again with the high score the game made, and a second game that
 * prints it. The original runs from the title's snapshot (`games/awm/build/t807.state`); every frame of every stretch
 * both are in is compared, as a 320 x 200 picture (`renderPixels`), and the sound drivers' requests are compared as a
 * list (what the program asked for, in order).
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/program.ts games/awm/build/t807.state [over|ending] [out-dir]
 *
 * Not compared (the rebuild goes straight on where the original takes frames): the title's set-up, a room being drawn at the
 * start of a game, the frame the closing screen starts in and the one its words change in, the frames of the title's set-up
 * after it; the letters' own colours are masked (closing.test: they follow the music driver's cycles).
 */
import fs from 'node:fs';
import path from 'node:path';
import { C64Machine, unpackState, type FrameCapture } from 'c64kit';
import { indicesPng, renderPixels } from '../../../tools/probe/render';
import { WORD_FRAMES } from '../src/closing';
import { withoutRemovedItems } from './harness';
import { Stick } from '../src/input';
import { NO_CONTROLS, Program, type Controls } from '../src/program';
import { callText } from '../src/soundlog';

const [stateFile, modeArg = 'over', outDir] = process.argv.slice(2);
if (!stateFile) throw new Error('usage: program.ts <t807.state> [over|ending] [out-dir]');
const W = 320, H = 200;

// ---- the original -------------------------------------------------------------------------

const o = new C64Machine();
o.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
const hit = new Set<number>();
const originalSounds: string[] = [];
let lastPc = 0;
const step = o.cpu.step.bind(o.cpu);
o.cpu.step = () => {
  const pc = o.cpu.pc;
  hit.add(pc);
  // ($694F places a room's items: the original's list with the shield taken, as ours has it, whenever it does)
  if (pc === 0x694f) withoutRemovedItems(o.ram);
  if (lastPc !== 0xe4b8) {
    // (the music's own end-of-tune stop, $E4B8, comes from the interrupt: not the game's)
    if (pc === 0x85a6) originalSounds.push(`e${o.cpu.a.toString(16)}`);
    else if (pc === 0xe409) originalSounds.push(`t${o.cpu.a.toString(16)}`);
    else if (pc === 0xe40c) originalSounds.push('s');
    else if (pc === 0xc7e3) originalSounds.push(`v${o.cpu.a.toString(16)}`);
  }
  lastPc = pc;
  return step();
};
const TITLE_LOOP = 0x418d, PLAY_LOOP = 0x5469, CLOSING = 0x3540;

function press(c: Controls): void {
  o.joy1 = o.joy2 = 0x1f & ~c.stick;
  const down: [number, number][] = [];
  if (c.f1) down.push([0, 4]);
  if (c.f7) down.push([0, 3]);
  o.keys = down;
}
/** Runs original frames under `c` until one reaches `pc`; returns how many it took. */
function runTo(pc: number, c: Controls = NO_CONTROLS, limit = 200): number {
  hit.clear();
  press(c);
  for (let n = 1; n <= limit; n++) {
    if (!o.runFrame()) throw new Error('the CPU stopped');
    if (hit.has(pc)) return n;
  }
  throw new Error(`the original never reached $${pc.toString(16)} in ${limit} frames`);
}

// ---- the rebuild and the comparing ----------------------------------------------------------

const program = new Program();
program.takeSound(); // (the title's own tune request: the snapshot is already past it)
const rebuildSounds: string[] = [];
/** What the program is in (a function: TypeScript would hold on to what it narrowed the property to). */
const now = (): string => program.kind;
const takeSounds = (): void => { rebuildSounds.push(...program.takeSound().map(callText)); };

function masked(capture: FrameCapture): FrameCapture {
  return { ...capture, sprites: capture.sprites.map((s) => (s.n < 4 && s.y >= 100 && s.y < 121 && program.kind === 'closing' ? { ...s, colour: 0 } : s)) };
}

const tally = { same: 0, different: 0 };
const differing = new Map<string, number[]>();
const firsts: string[] = [];
const compare = (label: string): void => {
  const a = renderPixels({ ram: o.ram, capture: masked(o.capture) });
  const b = renderPixels({ ram: program.ram, capture: masked(program.capture) });
  let count = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let i = 0; i < W * H; i++) if (a[i] !== b[i]) { count++; x0 = Math.min(x0, i % W); x1 = Math.max(x1, i % W); y0 = Math.min(y0, Math.floor(i / W)); y1 = Math.max(y1, Math.floor(i / W)); }
  if (count === 0) { tally.same++; return; }
  tally.different++;
  { const [stretch = "", n = "0"] = label.split(" "); differing.set(stretch, [...(differing.get(stretch) ?? []), Number(n)]); }
  if (process.env.DEBUG && firsts.length < 4) {
    const key = (s: FrameCapture['sprites'][number]): string => `n${s.n} ${s.x},${s.y} c${s.colour} ${Array.from(s.data.subarray(0, 63), (v) => v.toString(16).padStart(2, '0')).join('')}`;
    console.log(`${label}: original sprites ${o.capture.sprites.filter((s) => s.n < 6).map(key).join(' | ')}\n  rebuild sprites ${program.capture.sprites.filter((s) => s.n < 6).map(key).join(' | ')}`);
  }
  if (firsts.length < 6 && !firsts.some((f) => f.startsWith(label.split(' ')[0] ?? ''))) {
    firsts.push(`${label}: ${count} pixels differ (x ${x0}-${x1}, y ${y0}-${y1})`);
    if (outDir) {
      fs.mkdirSync(outDir, { recursive: true });
      const name = label.replace(/[^a-z0-9]+/gi, '-');
      indicesPng(path.join(outDir, `${name}-original.png`), a, W, H);
      indicesPng(path.join(outDir, `${name}-rebuild.png`), b, W, H);
      indicesPng(path.join(outDir, `${name}-diff.png`), a.map((v, i) => (v === b[i] ? 0 : 2)), W, H);
    }
  }
};
const still = (name: string): void => {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  indicesPng(path.join(outDir, `still-${name}.png`), renderPixels({ ram: program.ram, capture: masked(program.capture) }), W, H);
};

/** `frames` frames of both, each compared, under the controls `plan(n)` gives. */
function together(label: string, frames: number, plan: (n: number) => Controls, skip = 0): void {
  for (let n = 0; n < frames; n++) {
    const c = plan(n);
    press(c);
    if (!o.runFrame()) throw new Error('the CPU stopped');
    program.frame(c);
    takeSounds();
    if (n >= skip) compare(`${label} ${n}`);
  }
}

// ---- the run ---------------------------------------------------------------------------------

// 1. the title: from its first pass (that frame is the room's last: its pass has run after the beam; not compared)
const lead = runTo(TITLE_LOOP);
console.log(`the original's title loop starts ${lead} frames in`);
program.frame(NO_CONTROLS);
takeSounds();
together('title', 99, (n) => ({ stick: 0, f1: false, f7: n >= 30 && n < 34, fly: false }));
still('1-title');

// 2. fire: the original reads it at the top of the next frame and sets up the game; its first pass of the main loop is some frames on
const fire: Controls = { stick: Stick.Fire, f1: false, f7: false, fly: false };
press(fire);
const fired = o.runFrame();
if (!fired) throw new Error('the CPU stopped');
program.frame(fire);
takeSounds();
if (program.kind !== 'play') throw new Error(`fire did not start a game (${program.kind})`);
const roomFrames = runTo(PLAY_LOOP);
console.log(`the original's first pass of play is ${roomFrames} frames after the fire frame`);
console.log(`pass 0: original ${hit.has(0x5473) ? 'A' : hit.has(0x54ae) ? 'B' : '?'} toggle ${o.ram[0x4007]}; rebuild next is ${program.picture?.nextIsA ? 'A' : 'B'}`);
const first = program.game;
if (!first) throw new Error('no game');
together('play', 80, () => NO_CONTROLS);
still('2-play');

console.log(`play stretch: ${tally.same} same, ${tally.different} different ${firsts.join('; ')}`);
// 3. the end: the last life lost at the next step (or the ending's flag), with a score to make the high score of
const digits = [4, 3, 2, 1, 0];
o.ram.set(digits, 0x404a);
digits.forEach((d, i) => { first.score.digits[i] = d; });
program.picture?.assumeCounters();
if (modeArg === 'ending') {
  o.ram[0x402a] = 1;
  first.ended = true;
} else {
  o.ram[0x4048] = 1;
  o.ram[0x4061] = 0x80;
  first.monty.dead = 1;
  first.lives = 0x80;
  program.picture?.assumeLives(0x7f);
}
// (the closing routine starts in the frame the logic step ends in: the rebuild's too)
hit.delete(CLOSING);
let closedAt = -1;
for (let n = 0; n < 10 && closedAt < 0; n++) {
  press(NO_CONTROLS);
  o.runFrame();
  program.frame(NO_CONTROLS);
  takeSounds();
  if (hit.has(CLOSING) !== (now() === "closing")) throw new Error(`the original ${hit.has(CLOSING) ? "ended" : "went on"} and the rebuild ${now()} in frame ${n} after the poke`);
  if (now() === "closing") closedAt = n;
  else compare(`last ${n}`);
}
if (closedAt < 0) throw new Error('the game did not end');
console.log(`the game ended ${closedAt + 1} frames after the poke`);
// (the words change when the original's busy loop has made its 131072 iterations, which takes it 221 to 225 frames depending on what
// the interrupts do, the music driver's cycles: a frame is compared where both show the same word and the original does not change it in it)
let originalWord = 0, transitional = 0;
for (let f = 1; f < 2 * WORD_FRAMES; f++) {
  press(NO_CONTROLS);
  o.runFrame();
  program.frame(NO_CONTROLS);
  takeSounds();
  const word = o.ram[0x7f8] === 0x0c ? 1 : 0;
  const changing = word !== originalWord || word !== (f >= WORD_FRAMES ? 1 : 0);
  originalWord = word;
  if (changing) transitional++;
  else compare(`closing ${f}`);
  if (f === 100) still('3-gameover');
}
console.log(`closing screen: ${transitional} frames round the word change not compared`);

// 4. the title again: the original draws it for some frames, the rebuild is there at once; the high score is the score
const back = runTo(TITLE_LOOP);
console.log(`the original's title loop starts ${back} frames after the last frame of the closing screen`);
program.frame(NO_CONTROLS);
takeSounds();
if (now() !== "title") throw new Error(`the closing screen did not end in the title (${now()})`);
const highOk = program.high.join(',') === digits.join(',') && [0, 1, 2, 3, 4].every((i) => o.ram[0x4067 + i] === digits[i]);
console.log(`high score: original ${Array.from(o.ram.subarray(0x4067, 0x406c)).join(',')}, rebuild ${program.high.join(',')}`);
// (its first frame: the original's first pass runs late in the frame after the set-up, so that frame is a mixture of two)
together('title2', 60, (n) => ({ stick: 0, f1: n >= 10 && n < 13, f7: false, fly: false }), 1);
still('4-title-again');

// 5. a second game: the panel prints the high score
press(fire);
o.runFrame();
program.frame(fire);
takeSounds();
runTo(PLAY_LOOP);
together('play2', 40, () => NO_CONTROLS);
still('5-play-again');

for (const [stretch, frames] of differing) console.log(`  ${stretch}: ${frames.length} frames differ: ${frames.slice(0, 12).join(',')}${frames.length > 12 ? ',...' : ''}`);
const soundOk = originalSounds.join(',') === rebuildSounds.join(',');
console.log(`pictures (${modeArg}): ${tally.same + tally.different} frames compared, ${tally.same} same, ${tally.different} different${firsts.length ? `; first: ${firsts.join('; ')}` : ''}`);
console.log(`sound requests: ${soundOk ? 'identical' : `different\n original ${originalSounds.join(',')}\n rebuild  ${rebuildSounds.join(',')}`} (${originalSounds.length})`);
if (tally.different > 0 || !soundOk || !highOk) process.exit(1);
