/**
 * The flow (src/flow.ts) against the original running, frame by frame, the AWM way: every frame the original showed is compared with the
 * frame the flow shows at the same moment and is `same`, `apart` (it is the flow's frame before or after: the original did it a frame
 * early or late), `torn` (every byte is the byte of the flow's frame before, this or after: the original draws in place), a
 * `transition` (the original is drawing a new screen over several frames, so a byte is the old screen's, cleared, or the new one's;
 * once the new screen is whole it must stay so), or `different`.
 *
 * Two parts, because the flow is driven by inputs and the original's random numbers (the Z80's R register) are read as it runs:
 * 1. the original runs from a state with a script of keys, and every frame's screen, every R byte it read and the moments it passed
 *    through are recorded (`Recorder`);
 * 2. the flow runs with the same keys at the same frames, taking the R bytes in the order they were read (`Queue`), and its frames are
 *    laid beside the recorded ones (`compare`).
 * The flow can start at the credits page, or in the pass in which the last delivery is made or the last life is lost: the rebuilt game is
 * put in the state it had at the start of that pass (the lockstep test proved it equal to the original's) and the display in the
 * original's, and the flow takes the pass from there.
 */
import { ROOM_SIZE, roomAttrs } from '../src/data';
import { PANEL_TOP, roomPicture } from '../src/picture';
import { Display, rowOffset } from '../src/display';
import { type FlowInput, type FlowStep, MoleyFlow } from '../src/flow';
import { Game, type GameSnapshot } from '../src/game';
import { bitsOf, KEYBOARD_KEYS } from '../src/input';
import type { Random } from '../src/random';
import { press, type Spectrum } from '../../../tools/zx/spectrum';
import { displayScreen, syncDisplay } from './picture-core';
import { A, type Driver, PASS_START, Run, Tally } from './lockstep-core';

export type Pic = Uint8Array;
const SCREEN = 0x4000, SCREEN_BYTES = 6912, BITMAP = 6144;
/** The three places the original reads the R register (`LD A,R`): the room scripts, the items' colours, the card's twinkle. */
const R_PCS: readonly number[] = [0x9ece, 0x861a, 0x835c];

/** The original's random bytes, in the order it read them. */
export class Queue implements Random {
  at = 0;
  /** bytes asked for beyond those the original read */
  over = 0;
  constructor(readonly values: number[]) {}
  byte(): number {
    const v = this.values[this.at++];
    if (v === undefined) { this.over++; return 0; }
    return v;
  }
}

export const screenOf = (mem: Uint8Array): Pic => mem.slice(SCREEN, SCREEN + SCREEN_BYTES);

export interface Moment { readonly frame: number; readonly pc: number }

/** Records the original: the screen at the end of each frame, the R bytes read, and the moments (an address reached). */
export class Recorder {
  /** screens[i] is the end of frame `first + i` */
  readonly screens: Pic[] = [];
  first = 0;
  /** every R byte read since the recorder was made, and where each pass began (frame, index in `reads`) */
  readonly reads: number[] = [];
  readonly passes: { frame: number; reads: number }[] = [];
  readonly moments: Moment[] = [];
  private waiting = false;

  constructor(readonly m: Spectrum, watch: readonly number[] = [], private readonly keep = 400) {
    // (every frame the machine runs from now on is kept, however it is run)
    const runFrame = m.runFrame.bind(m);
    m.runFrame = () => {
      const f = m.frame;
      runFrame();
      this.add(f, screenOf(m.mem));
    };
    const before = m.onStep;
    const watched = new Set(watch);
    m.onStep = (pc) => {
      before?.(pc);
      if (this.waiting) { this.reads.push(m.cpu.regs[7]); this.waiting = false; }
      if (R_PCS.includes(pc)) this.waiting = true;
      if (pc === PASS_START) this.passes.push({ frame: m.frame, reads: this.reads.length });
      if (watched.has(pc)) this.moments.push({ frame: m.frame, pc });
    };
  }

  /** Keep a screen (the end of frame `frame`); only the last `keep` or so are kept. */
  private add(frame: number, pic: Pic): void {
    if (this.screens.length === 0) this.first = frame;
    this.screens.push(pic);
    if (this.screens.length > this.keep) { this.screens.splice(0, 100); this.first += 100; }
  }

  at(frame: number): Pic | undefined { return this.screens[frame - this.first]; }
  get last(): number { return this.first + this.screens.length - 1; }

  /** Drop what came before `frame`. */
  dropBefore(frame: number): void {
    const n = Math.max(0, Math.min(this.screens.length, frame - this.first));
    this.screens.splice(0, n);
    this.first += n;
  }

  /** The moments with this address, by frame. */
  frames(pc: number): number[] { return this.moments.filter((x) => x.pc === pc).map((x) => x.frame); }

  /** Run `count` frames with the keys the script names at each frame (by the frame about to run). */
  record(count: number, script: Script): void {
    for (let i = 0; i < count; i++) {
      const f = this.m.frame;
      this.m.releaseAll();
      for (const key of script(f)) press(this.m, key, true);
      this.m.runFrame();
    }
  }
}

/** The keys held at a frame, by name (`SPACE`, `Z`...). */
export type Script = (frame: number) => readonly string[];
export const noKeys: Script = () => [];

/** Keys held for frames `from` to `to` (exclusive). */
export function holding(key: string, from: number, to: number): Script {
  return (f) => (f >= from && f < to ? [key] : []);
}
export function either(...scripts: Script[]): Script {
  return (f) => scripts.flatMap((s) => s(f));
}

function inputOf(names: readonly string[]): FlowInput {
  return { keys: bitsOf(KEYBOARD_KEYS, (k) => names.includes(k)), any: names.length > 0 };
}

// ---- the flow's frames -----------------------------------------------------------------------------------------------

export type Kind = 'still' | 'redraw' | 'pass';
export interface Span {
  readonly start: number;
  readonly step: FlowStep;
  readonly pic: Pic;
  /** the display without the sprites, for a pass */
  readonly plain: Pic | null;
  /** the room the game is in at the step */
  readonly room: number;
  /** the old screen as the original left it (`FlowStep.before`) */
  readonly from: Pic | null;
  readonly kind: Kind;
}

function picOfShot(shot: { bits: Uint8Array; attrs: Uint8Array }): Pic {
  const pic = new Uint8Array(SCREEN_BYTES);
  pic.set(shot.bits, 0);
  pic.set(shot.attrs, BITMAP);
  return pic;
}

/** The picture of a step: the shot, or the display as it is. */
function picOfStep(step: FlowStep, flow: MoleyFlow): { pic: Pic; plain: Pic | null } {
  if (step.shot !== null) return { pic: picOfShot(step.shot), plain: null };
  const d = flow.display;
  const plain = displayScreen(d);
  plain.set(d.plain(), 0);
  return { pic: displayScreen(d), plain };
}

/**
 * Run the flow from frame `from` to frame `last`: each step is asked for at the frame the previous one ran out, with the keys the script
 * holds then (`first`: the keys of the first step if it is a pass made before the script's frames).
 */
export function drive(flow: MoleyFlow, from: number, last: number, script: Script, first?: FlowInput): Span[] {
  const spans: Span[] = [];
  let cursor = from;
  while (cursor <= last) {
    const input = spans.length === 0 && first !== undefined ? first : inputOf(script(cursor));
    const step = flow.step(input);
    const { pic, plain } = picOfStep(step, flow);
    spans.push({ start: cursor, step, pic, plain, room: flow.game.room, from: step.before === null ? null : picOfShot(step.before), kind: step.redraw ? 'redraw' : step.shot === null ? 'pass' : 'still' });
    cursor += step.frames;
  }
  return spans;
}

// ---- comparing ------------------------------------------------------------------------------------------------------

const same = (a: Pic, b: Pic): boolean => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

/** The first byte of `shown` that is not the byte of one of `of` (or, `cleared`, zero), or -1. */
function strayByte(shown: Pic, of: readonly Pic[], cleared: boolean): number {
  for (let i = 0; i < shown.length; i++) {
    const v = shown[i];
    if (cleared && v === 0) continue;
    if (!of.some((p) => p[i] === v)) return i;
  }
  return -1;
}

function place(i: number): string {
  return i < BITMAP ? `bitmap third ${i >> 11} line ${(i >> 8) & 7} row ${(i >> 5) & 7} column ${i & 31}` : `attribute row ${(i - BITMAP) >> 5} column ${i & 31}`;
}

function firstDifference(a: Pic, b: Pic): string {
  if (process.env.ALLDIFF) { const l: string[] = []; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) l.push(`${place(i)} ${a[i].toString(16)}/${b[i].toString(16)}`); return `${l.length} bytes: ${l.slice(0, 14).join("; ")}`; }
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    return `${place(i)}: original ${a[i].toString(16)} flow ${b[i].toString(16)}`;
  }
  return 'none';
}

export class Counts {
  same = 0;
  apart = 0;
  torn = 0;
  transition = 0;
  different = 0;
  /** frames compared by phase */
  readonly byPhase = new Map<string, number>();
  /** where frames were a frame apart or torn: "phase kind" and the count */
  readonly where = new Map<string, number>();
  readonly odd: string[] = [];

  add(other: Counts): void {
    this.same += other.same; this.apart += other.apart; this.torn += other.torn; this.transition += other.transition; this.different += other.different;
    for (const [k, n] of other.byPhase) this.byPhase.set(k, (this.byPhase.get(k) ?? 0) + n);
    for (const [k, n] of other.where) this.where.set(k, (this.where.get(k) ?? 0) + n);
    this.odd.push(...other.odd);
  }

  get total(): number { return this.same + this.apart + this.torn + this.transition + this.different; }
}

/**
 * What the original has on the screen while a game starts, before the room and the HUD are drawn: the panel as it is copied in
 * (`$81CF`) and the tiles of room 0 with the attributes from the room's table (`$854A`; the items' colours come later).
 */
function startPieces(): Pic[] {
  // (room 0's tiles and the panel as the data have them, the attributes as the room's table has them)
  const picture = roomPicture(0);
  const pic = new Uint8Array(SCREEN_BYTES);
  for (let y = 0; y < 192; y++) pic.set(picture.bits.subarray(y * 32, y * 32 + 32), rowOffset(y));
  pic.set(picture.attrs, BITMAP);
  return [pic];
}

/** The screen of a span with its room as the room's table draws it (tiles, and the attributes before the items are coloured), under the same panel. */
function tableOf(span: Span): Pic | null {
  if (span.room > 5 || (span.step.phase !== 'play' && span.step.phase !== 'over')) return null;
  const pic = span.pic.slice();
  const picture = roomPicture(span.room);
  for (let y = 0; y < PANEL_TOP; y++) pic.set(picture.bits.subarray(y * 32, y * 32 + 32), rowOffset(y));
  pic.set(roomAttrs(span.room).subarray(0, ROOM_SIZE), BITMAP);
  return pic;
}

/** Lay the flow's spans beside the recorded frames. */
export function compare(rec: Recorder, spans: readonly Span[], label: string, skipBefore = 0): Counts {
  const counts = new Counts();
  const flat: { pic: Pic; plain: Pic | null; span: Span }[] = [];
  const from = spans.length > 0 ? spans[0].start : 0;
  for (const span of spans) for (let j = 0; j < span.step.frames; j++) flat[span.start + j - from] = { pic: span.pic, plain: span.plain, span };
  const old = rec.at(from - 1);
  const starting = startPieces();
  let previous: Pic | undefined = old;
  for (const span of spans) {
    let settled = false;
    const last = previous;
    previous = span.pic;
    for (let j = 0; j < span.step.frames; j++) {
      const f = span.start + j;
      const shown = rec.at(f);
      if (shown === undefined) return counts;
      if (f < skipBefore) continue;
      const here = flat[f - from];
      const before = j === 0 ? last : flat[f - 1 - from]?.pic ?? old;
      const after = flat[f + 1 - from]?.pic;
      counts.byPhase.set(span.step.phase, (counts.byPhase.get(span.step.phase) ?? 0) + 1);
      const note = (what: string, stray = -1): void => {
        counts.different++;
        if (counts.odd.length < 8) counts.odd.push(`${label} frame ${f} (${span.step.phase}, step at ${span.start}, ${span.kind}): ${what}: ${stray >= 0 && !process.env.ALLDIFF ? `${place(stray)} is ${shown[stray].toString(16)}, flow ${here.pic[stray].toString(16)}, before ${before?.[stray]?.toString(16)}` : firstDifference(shown, here.pic)}`);
      };
      if (span.kind === 'redraw') {
        // (a new screen drawn in place: the old screen, cleared, or the new one, until it is whole, and then it stays)
        if (same(shown, here.pic)) { counts.same++; settled = true; continue; }
        if (settled) { note('the new screen came apart'); continue; }
        const pieces: Pic[] = [here.pic];
        if (before !== undefined) pieces.push(before);
        const previous = rec.at(span.start - 1);
        if (previous !== undefined) pieces.push(previous);
        if (here.plain !== null) pieces.push(here.plain);
        if (span.from !== null) pieces.push(span.from);
        if (last !== undefined) pieces.push(last);
        if (span.step.phase === 'play' && span.step.shot !== null) pieces.push(...starting);
        const table = tableOf(span);
        if (table !== null) pieces.push(table);
        const stray = strayByte(shown, pieces, true);
        if (stray < 0) counts.transition++; else note('not the old, cleared or new screen', stray);
        continue;
      }
      // (a pass's second frame shows the picture before: the draw had not landed)
      const old1 = span.kind === 'pass' ? last : undefined;
      if (same(shown, here.pic)) counts.same++;
      else if ((before !== undefined && same(shown, before)) || (after !== undefined && same(shown, after)) || (old1 !== undefined && same(shown, old1))) { counts.apart++; if (process.env.APART && span.kind === "still" && span.step.phase === "play") counts.odd.push(`apart ${label} frame ${f} step at ${span.start} frames ${span.step.frames} j ${j} (${same(shown, before ?? shown) ? "before" : same(shown, after ?? shown) ? "after" : "old"})`); counts.where.set(`apart ${span.step.phase} ${span.kind}`, (counts.where.get(`apart ${span.step.phase} ${span.kind}`) ?? 0) + 1); }
      else {
        const pieces = [here.pic];
        if (before !== undefined) pieces.push(before);
        if (after !== undefined) pieces.push(after);
        if (old1 !== undefined) pieces.push(old1);
        if (here.plain !== null) pieces.push(here.plain);
        const stray = strayByte(shown, pieces, false);
        if (stray < 0) {
          counts.torn++; counts.where.set(`torn ${span.step.phase} ${span.kind}`, (counts.where.get(`torn ${span.step.phase} ${span.kind}`) ?? 0) + 1);
          if (process.env.TORN && counts.odd.length < 12) {
            const diffs: string[] = [];
            for (let i = 0; i < shown.length && diffs.length < 6; i++) if (shown[i] !== here.pic[i]) diffs.push(`${place(i)} shown ${shown[i].toString(16)} flow ${here.pic[i].toString(16)} before ${before?.[i]?.toString(16)} after ${after?.[i]?.toString(16)}`);
            counts.odd.push(`torn ${label} frame ${f} (${span.step.phase}): ${diffs.join('; ')}`);
          }
        } else note('neither this frame nor its neighbours', stray);
      }
    }
  }
  return counts;
}

// ---- a flow that takes up a pass --------------------------------------------------------------------------------------

/** What the lockstep run keeps of the start of a pass: the rebuilt game, and the original's memory for the display. */
export interface Saved {
  readonly snapshot: GameSnapshot;
  readonly mem: Uint8Array;
}

export function save(run: Run, mem: Uint8Array): Saved {
  return { snapshot: run.game.snapshot(), mem: mem.slice() };
}

/** A flow in play, at the start of the pass `saved` was kept at, with the random bytes the original read from then on. */
export function resumed(saved: Saved, bytes: number[]): { flow: MoleyFlow; queue: Queue } {
  const queue = new Queue(bytes);
  const game = new Game(queue, false);
  game.restore(saved.snapshot);
  const display = new Display(game);
  syncDisplay(display, saved.mem);
  return { flow: new MoleyFlow(queue, { game, display }), queue };
}

// ---- playing the original to the end of a game ---------------------------------------------------------------------------

/** The addresses the scenarios look for: the card, GAME OVER, the restart, the credits page unpacked, its wait over, a pass, a room entered. */
const MOMENTS = [0x82da, 0x8292, 0x81bc, 0xa0da, 0xa0fb, 0x822f, 0x854a];

/** Monty put at a place with a full gauge (or `gauge`) and `lives` lives. */
export const atStart = (x: number, y: number, lives = 5, gauge = 0x7f) => (mem: Uint8Array): void => {
  mem[A.x] = x; mem[A.y] = y; mem[A.state] = 0; mem[A.phase] = 0; mem[A.gauge] = gauge; mem[A.lives] = lives;
};

/** A player that presses nothing. */
export const idle: Driver = { choose() { /* no key */ } };

/** The original played to the pass in which the game ends. */
export interface End {
  readonly run: Run;
  readonly rec: Recorder;
  /** the rebuilt game and the original's memory at the start of the last pass */
  readonly saved: Saved;
  /** the frame the last pass began at, and the frame after the last the original ran while it was played */
  readonly p0: number;
  readonly end: number;
  readonly outcome: 'ended' | 'over';
  readonly tally: Tally;
}

/** Play the original (a bot, in lockstep with the rebuilt game) to the pass in which it ends or the last life goes; null if it does not. */
export function reach(label: string, state: string, prepare: (mem: Uint8Array) => void, driver: Driver, limit: number): End | null {
  const tally = new Tally();
  const run = new Run(tally, state, label, false, prepare);
  const rec = new Recorder(run.m, MOMENTS);
  let saved: Saved | null = null;
  run.hooks.start = (mem) => {
    // (a run that starts with the lives put somewhere else has a panel that says the old number: put it right in the original's screen,
    // as the original would have drawn it)
    const display = new Display(run.game);
    syncDisplay(display, mem);
    display.hud();
    run.game.observer = null;
    for (let y = PANEL_TOP; y < 192; y++) mem.set(display.bits.subarray(rowOffset(y), rowOffset(y) + 32), SCREEN + rowOffset(y));
    saved = save(run, mem);
  };
  run.hooks.passEnd = (outcome, mem) => { if (outcome === 'playing') saved = save(run, mem); };
  run.play(driver, limit);
  const last = rec.passes[rec.passes.length - 1];
  if ((run.last !== 'ended' && run.last !== 'over') || saved === null || last === undefined) return null;
  rec.dropBefore(last.frame - 1);
  return { run, rec, saved, p0: last.frame, end: run.m.frame, outcome: run.last, tally };
}

/** After the last pass: run the original on with a script for `frames` frames, and the flow beside it from that pass. */
export function follow(e: End, script: Script, frames: number): { spans: Span[]; queue: Queue } {
  e.rec.record(frames, script);
  const start = e.rec.passes.find((p) => p.frame === e.p0);
  const { flow, queue } = resumed(e.saved, e.rec.reads.slice(start?.reads ?? 0));
  return { spans: drive(flow, e.p0, e.rec.last, script, { keys: e.run.passKeys, any: false }), queue };
}
