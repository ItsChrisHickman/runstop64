/**
 * The .sid the extractor builds (tools/extract-awm-sid.mjs) against the original game: the same SID register
 * writes, frame by frame.
 *
 * - Music: each tune ($E409, A = 0-12) asked for in the original and played by the .sid (song 1-13): every
 *   write of the first frames, frame by frame.
 * - Effects: each sound number ($85A6, A = $40-$4C) asked for in the original (music stopped, as its effects
 *   mode has it) and in the .sid (song 14, the `sfx` glue).
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/sound.ts games/awm/build/play.state [games/awm/build/awm.sid] [frames]
 */
import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
import { parsePsid, SidTune } from '../../../packages/c64kit/src/sid/psid';
import { SOUND } from '../src/sound';

const [stateFile = '', sidFile = 'games/awm/build/awm.sid', framesArg = '1500'] = process.argv.slice(2);
const FRAMES = Number(framesArg);
const file = parsePsid(new Uint8Array(fs.readFileSync(sidFile)).buffer);
const state = unpackState(new Uint8Array(fs.readFileSync(stateFile)));

/** One string per frame: the writes in it. */
type Writes = string[];
const text = (reg: number, v: number): string => `${reg.toString(16)}=${v.toString(16)}`;

function original(setup: (o: C64Machine) => void, frames: number): Writes {
  const o = new C64Machine();
  o.loadState(state);
  setup(o);
  const out: Writes = [];
  for (let f = 0; f < frames; f++) {
    o.runFrame();
    out.push(o.sidWrites.map((w) => text(w.reg, w.value)).join(' '));
  }
  return out;
}

function sid(song: number, frames: number, setup?: (t: SidTune) => void): Writes {
  const t = new SidTune(file, 44100);
  let cur: string[] = [];
  const write = t.sid.write.bind(t.sid);
  t.sid.write = (reg: number, v: number) => { cur.push(text(reg, v)); write(reg, v); };
  t.start(song);
  cur = [];
  setup?.(t);
  cur = [];
  const out: Writes = [];
  for (let f = 0; f < frames; f++) {
    t.cpu.call(file.playAddress);
    out.push(cur.join(' '));
    cur = [];
  }
  return out;
}

/** The first frame at which the two differ, or -1. */
const firstDifference = (a: Writes, b: Writes): number => {
  for (let f = 0; f < Math.min(a.length, b.length); f++) if (a[f] !== b[f]) return f;
  return -1;
};
/** How many frames of `a` carry a write (the original's music has quiet frames: only the changes are written). */
const busy = (a: Writes): number => a.filter((w) => w !== '').length;

let failures = 0;
const report = (what: string, a: Writes, b: Writes): void => {
  const at = firstDifference(a, b);
  if (at >= 0) failures++;
  console.log(`${what}: ${busy(a)} frames with writes in the original, ${busy(b)} in the .sid; ${at < 0 ? `identical over ${a.length} frames` : `first difference at frame ${at}: original [${a[at]}] .sid [${b[at]}]`}`);
};

// ---- the tunes ---------------------------------------------------------------------------------
for (let track = 0; track < SOUND.tunes; track++) {
  const orig = original((o) => {
    const regs = { ...o.cpu };
    o.cpu.a = track;
    o.call(0xe409);
    Object.assign(o.cpu, regs);
  }, FRAMES);
  report(`tune ${track}`, orig, sid(track + 1, FRAMES));
}

// ---- the effects -------------------------------------------------------------------------------
const WARM = 8;
for (const number of SOUND.effects) {
  const orig = original((o) => {
    const regs = { ...o.cpu };
    o.ram[0x4066] = 1;
    o.call(0xe40c);
    for (const v of [0, 1, 2]) { o.cpu.a = v; o.call(0xc7e3); }
    Object.assign(o.cpu, regs);
    for (let f = 0; f < WARM; f++) o.runFrame();
    const after = { ...o.cpu };
    o.cpu.a = number;
    o.call(0x85a6);
    Object.assign(o.cpu, after);
  }, 200).slice(0);
  // (the original ran WARM quiet frames inside setup: its frames below start at the request)
  const port = sid(SOUND.effectsSong, 200, (t) => { for (let w = 0; w < WARM; w++) t.cpu.call(file.playAddress); t.cpu.call(SOUND.request, number); });
  report(`effect $${number.toString(16)}`, orig, port);
}
console.log(failures === 0 ? 'the .sid writes what the original writes' : `${failures} DIFFER`);
if (failures > 0) process.exit(1);
