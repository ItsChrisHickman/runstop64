/**
 * Playing Thing on a Spring headless, for the tools in re/ and the checks: the inputs, a frame
 * of play, where Thing is, and replaying a path of inputs from a state exactly as it was found.
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from '../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../shared/native/host';
import { port } from '../src/native';
import { place, type Place } from '../src/factory';
import { enter } from '../src/travel';

export const TITLE = 'games/thingonaspring/assets/toas-title.state';
export const title = () => unpackState(new Uint8Array(fs.readFileSync(TITLE)));

/** Joystick inputs (port bits, low = pressed): none, the directions, fire with each. */
export const INPUTS = [
  { name: 'none', joy: 0x1f }, { name: 'left', joy: 0x1b }, { name: 'right', joy: 0x17 }, { name: 'up', joy: 0x1e }, { name: 'down', joy: 0x1d },
  { name: 'fire', joy: 0x0f }, { name: 'fire+left', joy: 0x0b }, { name: 'fire+right', joy: 0x07 }, { name: 'fire+up', joy: 0x0e },
] as const;
type InputName = typeof INPUTS[number]['name'];
/** An input's joystick bits, by name. */
export const joyOf = (name: InputName) => INPUTS.find((i) => i.name === name)?.joy ?? 0x1f;
/** An input's place in INPUTS (as paths have them), by name. */
export const inputIndex = (name: InputName) => INPUTS.findIndex((i) => i.name === name);

/** Oil kept topped up, so playing never ends in losing. */
export const keep = (ram: Uint8Array) => { ram[0x8f] = 0xff; };

/** One frame with an input. */
export function step(g: NativeHost, joy: number, cheat = true) {
  g.m.joy1 = g.m.joy2 = joy;
  g.m.keys = [];
  g.tick();
  if (cheat) keep(g.m.ram);
}

/** In play, at the main loop's wait, between rooms' transitions (a state to keep and resume). */
export const settled = (g: NativeHost) => g.lastWait === port.mainLoopWait && g.m.ram[0x63] === 0 && g.m.ram[0x5d] === 0 && g.m.ram[0x1c] === 0;

/** A new game from the title (fire pressed as the title shows), up to its first settled frame. */
export function newGame(cheat = true) {
  const g = new NativeHost(port, title());
  for (let f = 0; f < 2000; f++) {
    step(g, f >= 30 && f < 34 ? 0x0f : 0x1f, cheat && f > 40);
    if (f > 40 && settled(g)) return g;
  }
  throw new Error('no game');
}

/**
 * A state taken where saves are (the main loop's wait, which comes about every 1.7 frames: its
 * delay is longer than a frame), settled in play, and the frame (counted from the game's start)
 * in which it was taken: resuming it, that frame's rest runs first, with that frame's input.
 */
export interface Snap { state: MachineState; frame: number }
/** Take a snap at each main loop wait (`frame()`: the frame being run). Returns the latest. */
export function snapper(g: NativeHost, frame: () => number) {
  let snap: Snap | null = null;
  g.onWait = (site) => {
    if (site !== port.mainLoopWait) return;
    const r = g.m.ram;
    if (r[0x63] || r[0x5d] || r[0x1c]) return;
    const s = g.save();
    if (s) snap = { state: s, frame: frame() };
  };
  return () => snap;
}
/** Resume a snap: the rest of its frame (with that frame's input), then the next frames are the caller's. */
export function resumeSnap(s: Snap, joy: number, cheat = true) {
  const g = NativeHost.resume(port, s.state);
  step(g, joy, cheat);
  return g;
}

/** Inputs, a frame each, from a path ([input, frames]...). */
export const frames = (path: [number, number][]) => path.flatMap(([i, n]) => Array<number>(n).fill(i));
/** A path from inputs a frame each. */
export function pathOf(inputs: number[]) {
  const p: [number, number][] = [];
  for (const i of inputs) if (p.length && p[p.length - 1][0] === i) p[p.length - 1][1]++; else p.push([i, 1]);
  return p;
}

/** Replay a path ([input, frames]...) from a new game; `each` sees every frame (after it). */
export function replay(path: [number, number][], each?: (g: NativeHost, frame: number) => void, cheat = true) {
  const g = newGame(cheat);
  let f = 0;
  for (const [i, n] of path) for (let k = 0; k < n; k++) { step(g, INPUTS[i].joy, cheat); each?.(g, f++); }
  return g;
}

export { place, type Place };

/** Every switch on (the lift runs, the tubes lift: the most the factory opens up). */
export const allOn = (ram: Uint8Array) => { for (let i = 0; i < 5; i++) ram[0x370 + i] = 1; };

/**
 * A start on every screen (levels I-IV, screens 1-9; not IV's 9th, past the goblin's room, where
 * nothing goes) at both ends, entered the game's own way (src/travel.ts: enter) one after
 * another in one game, from a new game, with every switch on: "0.5L" is level I's screen 5 at its
 * left end. Each is a snap at its first settled main loop wait (its frame 0: resume it with no input).
 */
export function makeStarts() {
  const out = new Map<string, Snap>();
  const g = newGame();
  allOn(g.m.ram);
  let f = 0;
  const latest = snapper(g, () => f);
  for (let level = 0; level < 4; level++) for (let screen = 1; screen <= 9; screen++) if (!(level === 3 && screen === 9)) for (const side of ['L', 'R'] as const) {
    let pending = true;
    const onWait = g.onWait;
    g.onWait = (site) => { if (pending && site === port.mainLoopWait) { pending = false; enter(g.m.ram, level, screen, side); } onWait?.(site); };
    const before = latest();
    const arrived = () => { const s = latest(); return !pending && s !== before && s?.state.ram[0x5e] === screen; };
    for (let k = 0; k < 200 && !arrived(); k++, f++) { step(g, 0x1f); allOn(g.m.ram); }
    g.onWait = onWait;
    const s = latest();
    if (!s) throw new Error(`no start at ${level}.${screen}${side}`);
    out.set(`${level}.${screen}${side}`, { state: s.state, frame: 0 });
  }
  return out;
}

/** Replay a path found from a start (its first frame is the start's own, resumed). */
export function replayFrom(start: Snap, path: [number, number][], each?: (g: NativeHost, frame: number) => void) {
  const inputs = frames(path);
  const g = resumeSnap(start, INPUTS[inputs[0]].joy);
  allOn(g.m.ram);
  for (let f = 1; f < inputs.length; f++) { step(g, INPUTS[inputs[f]].joy); allOn(g.m.ram); each?.(g, f); }
  return g;
}
