/**
 * The rebuilt picture (src/display.ts) against the screen of the original, for a lockstep run (test/lockstep-core.ts).
 *
 * Two comparisons, both on the Spectrum's own memory (the bitmap $4000-$57FF and the attributes $5800-$5AFF, 6912 bytes):
 * - every pass: when the original reaches the start of a pass its drawing of the last one is finished, and the rebuilt game's
 *   picture after the same pass must equal it exactly (`same` or `different`);
 * - every frame the original shows (the screen at the end of each 50 Hz frame; the original draws in place, no double buffer):
 *   the frames of one pass lie between the picture before it and the picture after it. Each is `new` (the rebuilt picture after
 *   the pass), `old` (the one before: the original had not drawn yet in that frame), `torn` (every byte one or the other, the
 *   drawing caught half done), or `different`. Frames of a pass in which a room was entered or Monty died are `transition`:
 *   the original shows its own pictures between (the death pictures, the room being drawn) and `shots` are compared apart.
 */
import { Display, BITMAP_BYTES, rowOffset, type Shot } from '../src/display';
import { BLANK_FRAME, SPRITE_COUNT } from '../src/data';
import type { Game } from '../src/game';
import { spriteImage, spritePixel } from '../src/look';
import { cellInk, PANEL_TOP } from '../src/picture';
import type { Hooks, Run } from './lockstep-core';

const SCREEN = 0x4000;
const SCREEN_BYTES = BITMAP_BYTES + 768;
/** The routines that start a transition: the death routines (`$9592`, `$95C8`), entering a room (`$854A`), time out (`$A2D1`). */
const TRANSITIONS = [0x9592, 0x95c8, 0x854a, 0xa2d1] as const;
/** Where the original keeps what the display keeps (re/README.md). */
/** The sprite frames the original's interrupt table overwrites (`$D000-$D100`). */
const UNUSED_FRAMES = [0x80, 0x88] as const;
const COUNTERS = 0x8a9c, TILE_SET = 0xd800, TILE_SET_BYTES = 250 * 8, BUFFER = 0xe000, PANEL_ATTRS = 0x5a40;

export interface FrameCounts { new: number; old: number; torn: number; different: number; transition: number }

export class PictureTally {
  passes = 0;
  /** passes not compared because an entity showed one of the frames the original's interrupt table sits on */
  skipped = 0;
  /** passes whose picture was not the original's, and the first few, described */
  differentPasses = 0;
  readonly first: string[] = [];
  readonly frames: FrameCounts = { new: 0, old: 0, torn: 0, different: 0, transition: 0 };
  /** differences by place: the HUD or the play area, and what covers it */
  readonly where = new Map<string, number>();
  /** the death and time-out pictures */
  shots = 0;
  shotsEqual = 0;
  windowsExact = 0;
  /** passes in which Monty died or time ran out */
  windows = 0;
  readonly oddShots: string[] = [];
  readonly oddFrames: string[] = [];
}

function screenOf(mem: Uint8Array): Uint8Array {
  return mem.slice(SCREEN, SCREEN + SCREEN_BYTES);
}

/** Where two screens differ, in words: the first few cells. */
function describe(a: Uint8Array, b: Uint8Array): string {
  const cells = new Set<string>();
  for (let i = 0; i < BITMAP_BYTES; i++) {
    if (a[i] === b[i]) continue;
    const third = i >> 11, line = (i >> 8) & 7, row = ((i >> 5) & 7) + third * 8, col = i & 31;
    cells.add(`bitmap r${row} c${col} line ${line} original ${a[i].toString(16)} rebuilt ${b[i].toString(16)}`);
    if (cells.size >= 3) break;
  }
  for (let i = BITMAP_BYTES; i < SCREEN_BYTES && cells.size < 4; i++) {
    if (a[i] !== b[i]) cells.add(`attribute r${(i - BITMAP_BYTES) >> 5} c${i & 31} original ${a[i].toString(16)} rebuilt ${b[i].toString(16)}`);
  }
  return [...cells].join('; ');
}

/** The bytes of a frame that are neither the byte before nor the byte after. */
function neither(shown: Uint8Array, before: Uint8Array, after: Uint8Array): string {
  const out: string[] = [];
  for (let i = 0; i < shown.length && out.length < 4; i++) {
    if (shown[i] === before[i] || shown[i] === after[i]) continue;
    const where = i < BITMAP_BYTES ? `bitmap r${((i >> 5) & 7) + (i >> 11) * 8} c${i & 31} line ${(i >> 8) & 7}` : `attribute r${(i - BITMAP_BYTES) >> 5} c${i & 31}`;
    out.push(`${where} before ${before[i].toString(16)} shown ${shown[i].toString(16)} after ${after[i].toString(16)}`);
  }
  return out.join('; ');
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Every byte of the frame is the byte before the pass or the byte after it. An item's attribute is the one thing that passes through a
 * third value: its ink goes on one (`$8655`) before it is taken (`$869F`) or, if not taken, stays at that.
 */
function tornBetween(shown: Uint8Array, before: Uint8Array, after: Uint8Array, between: readonly Uint8Array[]): boolean {
  for (let i = 0; i < shown.length; i++) {
    if (shown[i] === before[i] || shown[i] === after[i] || between.some((b) => b[i] === shown[i])) continue;
    if (i >= BITMAP_BYTES && before[i] < 8 && shown[i] === ((before[i] + 1) & 7)) continue;
    return false;
  }
  return true;
}

/** The display as the rebuilt game has it, as the same 6912 bytes. */
export function displayScreen(d: Display): Uint8Array {
  const out = new Uint8Array(SCREEN_BYTES);
  out.set(d.bits, 0);
  out.set(d.attributes(), BITMAP_BYTES);
  return out;
}

/** A shot as the same 6912 bytes. */
function shotScreen(s: Shot): Uint8Array {
  const out = new Uint8Array(SCREEN_BYTES);
  out.set(s.bits, 0);
  out.set(s.attrs, BITMAP_BYTES);
  return out;
}

/** Put the original's screen state into the display (the start of a run). */
export function syncDisplay(d: Display, mem: Uint8Array): void {
  d.bits.set(mem.subarray(SCREEN, SCREEN + BITMAP_BYTES));
  d.panelAttrs.set(mem.subarray(PANEL_ATTRS, PANEL_ATTRS + 192));
  d.buffer.set(mem.subarray(BUFFER, BUFFER + BITMAP_BYTES));
  d.counters.set(mem.subarray(COUNTERS, COUNTERS + 576));
  d.tileSet.set(mem.subarray(TILE_SET, TILE_SET + TILE_SET_BYTES));
  d.highShown = d.game.highScore;
}

/**
 * The colour the original shows sprites in: for each room and picture, the ink of the cell under every pixel the sprite adds to the
 * screen (a set pixel of its picture that the original's screen shows and the scenery alone, `Display.plain`, does not).
 */
export class SpriteInks {
  readonly counts: number[][][] = Array.from({ length: 6 }, () => Array.from({ length: SPRITE_COUNT }, () => new Array<number>(16).fill(0)));

  add(game: Game, display: Display, mem: Uint8Array): void {
    const plain = display.plain();
    for (const e of game.entities) {
      if (e.frame === BLANK_FRAME || e.frame >= SPRITE_COUNT) continue;
      const image = spriteImage(e.frame, (e.flags & 0x80) !== 0);
      for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 16; c++) {
          if (!spritePixel(image, c, r)) continue;
          const x = e.x + c, y = (e.y & 0x7f) + r;
          if (x > 255 || y >= PANEL_TOP) continue;
          const at = rowOffset(y) + (x >> 3), bit = 0x80 >> (x & 7);
          if ((mem[SCREEN + at] & bit) === 0 || (plain[at] & bit) !== 0) continue;
          this.counts[game.room][e.frame][cellInk(mem[SCREEN + BITMAP_BYTES + (y >> 3) * 32 + (x >> 3)])]++;
        }
      }
    }
  }

  /** How many pixels were counted, and how many of them were in `ink`. */
  share(ink: number): { total: number; of: number } {
    let total = 0, of = 0;
    for (const room of this.counts) for (const h of room) { total += h.reduce((a, b) => a + b, 0); of += h[ink]; }
    return { total, of };
  }

  /** Each picture seen, with its most common ink over all rooms and the pixels counted: [picture, ink, pixels]. */
  dominant(): [number, number, number][] {
    const out: [number, number, number][] = [];
    for (let f = 0; f < SPRITE_COUNT; f++) {
      const h = new Array<number>(16).fill(0);
      for (const room of this.counts) room[f].forEach((n, ink) => { h[ink] += n; });
      const total = h.reduce((a, b) => a + b, 0);
      if (total === 0) continue;
      out.push([f, h.indexOf(Math.max(...h)), total]);
    }
    return out;
  }
}

/** Attach to a run: compares every pass and every frame. */
export function watchPicture(run: Run, tally: PictureTally, label: string, inks?: SpriteInks): { display: () => Display | null } {
  let display: Display | null = null;
  let before: Uint8Array | null = null;
  let frames: Uint8Array[] = [];
  let transition = false;
  /** the pictures the pass passes through when an item is taken (its cell goes and the score moves on, before the sprites are drawn) */
  let middles: Uint8Array[] = [];
  const hooks: Hooks = run.hooks;
  const pcs = new Uint8Array(65536);
  for (const pc of TRANSITIONS) pcs[pc] = 1;
  hooks.pcs = pcs;
  hooks.pc = () => { transition = true; };
  hooks.start = (mem) => {
    display = new Display(run.game);
    syncDisplay(display, mem);
    const taken = display.itemTaken.bind(display);
    const shown = display;
    shown.itemTaken = (cell) => {
      taken(cell);
      shown.hud();
      const mid = displayScreen(shown);
      middles.push(mid);
      // (the score is printed as four blanks and then its digits: a frame can fall between)
      const blank = mid.slice();
      for (let line = 0; line < 8; line++) blank.fill(0, rowOffset(19 * 8 + line) + 7, rowOffset(19 * 8 + line) + 11);
      middles.push(blank);
    };
    // (a run that starts from a changed state, lives or gauge or score put somewhere else, has a panel that says the old one: the
    // original draws it when it changes, which it has not yet; put the panel right in both)
    display.hud();
    for (let y = PANEL_TOP; y < 192; y++) mem.set(display.bits.subarray(rowOffset(y), rowOffset(y) + 32), SCREEN + rowOffset(y));
    before = displayScreen(display);
  };
  hooks.frame = (mem) => {
    if (display !== null) frames.push(screenOf(mem));
  };
  hooks.passEnd = (outcome, mem) => {
    const d = display;
    if (d === null || before === null) return;
    if (outcome !== 'playing') { // (the ending and game over draw their own screens: stage 5)
      frames = [];
      middles = [];
      transition = false;
      return;
    }
    const after = displayScreen(d);
    const original = screenOf(mem);
    if (run.game.entities.some((e) => e.frame >= UNUSED_FRAMES[0] && e.frame <= UNUSED_FRAMES[1])) {
      // (frames $80-$88 are where the original keeps its interrupt table, so it draws that: no play shows them, the shaken states do)
      tally.skipped++;
      syncDisplay(d, mem);
      d.takeShots();
      before = original;
      frames = [];
      middles = [];
      transition = false;
      return;
    }
    tally.passes++;
    inks?.add(run.game, d, mem);
    // the frames of this pass (the first pass of a run has none of its own before the state was taken)
    for (const f of frames) {
      if (transition) tally.frames.transition++;
      else if (sameBytes(f, after)) tally.frames.new++;
      else if (sameBytes(f, before)) tally.frames.old++;
      else if (tornBetween(f, before, after, middles)) tally.frames.torn++;
      else {
        tally.frames.different++;
        if (tally.oddFrames.length < 6) tally.oddFrames.push(`${label} pass ${run.passes} room ${run.game.room}: ${neither(f, before, after)}`);
      }
    }
    if (!sameBytes(original, after)) {
      tally.differentPasses++;
      const text = describe(original, after);
      const key = text.split(' ')[0] + (text.includes('attribute') ? ' attr' : '');
      tally.where.set(key, (tally.where.get(key) ?? 0) + 1);
      if (tally.first.length < 6) tally.first.push(`${label} pass ${run.passes} room ${run.game.room}: ${text}`);
      // (carry on from the original's picture, so each count is of a cause)
      syncDisplay(d, mem);
    }
    const shots = d.takeShots();
    if (shots.length > 0) {
      // the frames the original should have shown, one per frame, and where in the pass's frames they best fit
      const expected: Uint8Array[] = shots.flatMap((shot) => Array.from({ length: shot.frames }, () => shotScreen(shot)));
      // (the longest run of the expected frames found in order among the frames: the original's frames in between are the death's sound
      // before them, and a frame the beam caught as a picture was drawn, a mix of it and the one before or after, stands for either)
      const screens = shots.map(shotScreen);
      const owner: number[] = shots.flatMap((shot, k) => Array.from({ length: shot.frames }, () => k));
      const may = frames.map((f) => {
        const ids = new Set<number>();
        screens.forEach((sc, k) => { if (sameBytes(f, sc)) ids.add(k); });
        if (ids.size === 0) {
          for (let k = 0; k + 1 < screens.length; k++) if (tornBetween(f, screens[k], screens[k + 1], [])) { ids.add(k); ids.add(k + 1); break; }
        }
        return ids;
      });
      const table: number[][] = Array.from({ length: expected.length + 1 }, () => new Array<number>(frames.length + 1).fill(0));
      for (let i = 1; i <= expected.length; i++) {
        for (let j = 1; j <= frames.length; j++) table[i][j] = may[j - 1].has(owner[i - 1]) ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1]);
      }
      const best = table[expected.length][frames.length];
      if (process.env.SHOTS && best < expected.length) console.log(`${label} pass ${run.passes}: ${best} of ${expected.length}: ${frames.map((f) => { const j = shots.findIndex((sh) => sameBytes(f, shotScreen(sh))); return j < 0 ? '?' : j >= 56 ? String.fromCharCode(97 + (j - 56)) : String(j % 10); }).join('')}`);
      tally.shots += expected.length;
      tally.shotsEqual += best;
      tally.windows++;
      if (best === expected.length) tally.windowsExact++;
      else if (tally.oddShots.length < 6) tally.oddShots.push(`${label} pass ${run.passes}: ${best} of ${expected.length} frames of ${shots.length} pictures`);
    }
    before = sameBytes(original, after) ? after : original;
    frames = [];
    middles = [];
    transition = false;
  };
  return { display: () => display };
}
