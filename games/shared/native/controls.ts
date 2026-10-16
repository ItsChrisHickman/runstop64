import { wr, type Gen } from './cpu';

/**
 * The "8-way controls" assist for the translated Pendragon games, done the games' own way.
 *
 * All three read the joystick as one of four directions: a diagonal counts as one of them
 * (up+right is up, down+left is down, down+right is right, up+left is left), so pushing
 * diagonally goes a different way depending on which diagonal it is. And the fire button
 * uses whichever way Pendragon already faces, so to strike behind him he must first walk
 * that way.
 *
 * With the assist on:
 * - a diagonal moves both ways: the game gets the sideways part (he walks, faces, scrolls and
 *   animates as ever), and every other frame (the pace of his own steps into or out of the
 *   picture) his own step for the other part runs too, keeping the way he faces. It runs at
 *   the point the game runs its player routine (the main loop's wait), as the game itself
 *   steps, onto floor: what's under his feet that way is looked up as his floor check looks it
 *   up and checked against its lists (`ahead`). Floor: the floor check (faced that way) and his
 *   own step routine move him; a wall stops him. A door, stairs or a corridor's corner that way
 *   (what the floor check acts on: it takes him through there and then, drawing the next place,
 *   which only the main loop can do) is left to the game: from there until he's somewhere
 *   else the diagonal is the stick straight that way, so he goes through as walking straight
 *   there does (then on as a diagonal, past any other till the stick changes). A jump
 *   carries on the same way (each game moves a jump into the picture with the same routine);
 * - fire with a direction turns him that way first (the game gets the direction alone for a
 *   frame: his own handling turns him), then strikes: diagonals strike sideways.
 *
 * Each game declares (`PendragonSteps`) where those routines and bytes are: the three games
 * share their engine, so `pendragonControls` builds the step from that.
 */
export interface ControlsSpec {
  /** Where the game keeps the way he faces, and its values. */
  facing: { addr: number; right: number; left: number; up: number; down: number };
  /** Whether his own movement would take the stick now (not in the middle of an action, a room change...), and whether he's jumping. */
  state(ram: Uint8Array): 'walk' | 'jump' | 'busy';
  /** One step up (into the picture) or down, the game's own way, the way he faces kept. */
  step(ram: Uint8Array, up: boolean, run: Runner): void;
  /** Frames between steps (the game's own pace into the picture). */
  every: number;
  /** What his floor check would find one step into the picture (up) or out of it, without running it: floor he walks on, a wall, or something it acts on (a door, stairs, a corner). */
  ahead(ram: Uint8Array, up: boolean): Ahead;
  /** The screen code it looks at there (for tests and notes). */
  tile(ram: Uint8Array, up: boolean): number;
  /** Where he is, as far as a door, the stairs or a corner change it (to tell when he has gone through). */
  place(ram: Uint8Array): string;
}

/** Under his feet one step that way: `open` floor, a `wall`, or something the game `acts` on (it takes him through, or starts something, there and then). */
export type Ahead = 'open' | 'wall' | 'acts';

/** Runs translated code between frames (the registers kept). */
export interface Runner {
  call(fn: () => void): void;
}

/** Joystick bits (active low in the port; here 1 = held): 1 up, 2 down, 4 left, 8 right, 16 fire. */
export const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;

export class EightWay {
  private count = 0;
  private fireWas = false;
  /** A door, stairs or a corner this diagonal (its way into or out of the picture, `v`) has met: straight through it from `from`, then `done`. */
  private through: { v: number; from: string; done: boolean } | null = null;
  /** What to do at the next main loop wait (set from the frame's input). */
  private plan: { step?: boolean } = {};

  constructor(readonly spec: ControlsSpec) {}

  /**
   * The frame's stick (held bits, 1 = held) as the game should get it, and what to do
   * before its frame (at the main loop's wait: `beforeFrame`).
   */
  input(ram: Uint8Array, held: number): number {
    this.plan = {};
    const v = held & (UP | DOWN), h = held & (LEFT | RIGHT), fire = !!(held & FIRE);
    const st = this.spec.state(ram);
    // fire with a direction: turn that way first (sideways, for a diagonal): a frame of the
    // direction alone, then the fire (it isn't new by then: the game strikes as it's held)
    if (fire && !this.fireWas && st === 'walk') {
      const want = h === LEFT || h === RIGHT ? h : v === UP || v === DOWN ? v : 0;
      const f = this.spec.facing, now = ram[f.addr];
      const wantFacing = want === RIGHT ? f.right : want === LEFT ? f.left : want === UP ? f.up : want === DOWN ? f.down : now;
      if (want && wantFacing !== now) { this.fireWas = true; this.count = 0; return want; }
    }
    this.fireWas = fire;
    if (!(v && h) || v === (UP | DOWN) || h === (LEFT | RIGHT) || (this.through && this.through.v !== v)) this.through = null;
    if (!(v && h) || v === (UP | DOWN) || h === (LEFT | RIGHT)) { this.count = 0; return held; }
    // at a door, stairs or a corner that way: straight there, the game's own way, until he's
    // somewhere else (it can take frames: Karnath's doors open while he faces them, then he
    // walks through; Blackwyche's stairs climb). Once through, the diagonal goes on as one, and
    // takes no other till the stick changes (Entombed's corridors: round one corner, not back
    // round the next)
    if (this.through && !this.through.done && this.through.from !== this.spec.place(ram)) this.through.done = true;
    if (!this.through && st === 'walk' && this.spec.ahead(ram, v === UP) === 'acts') this.through = { v, from: this.spec.place(ram), done: false };
    if (this.through && !this.through.done) { this.count = 0; return held & ~(LEFT | RIGHT); }
    // a diagonal: the game moves him sideways; his own step does the rest, at its pace
    if (st === 'jump' || (st === 'walk' && !fire)) {
      if (this.count % this.spec.every === this.spec.every - 1) this.plan.step = true;
      this.count++;
    }
    return held & ~(UP | DOWN);
  }

  /** At the main loop's wait (between frames, where the game runs extra player handling): the step. */
  beforeFrame(ram: Uint8Array, held: number, run: Runner) {
    if (this.plan.step) this.spec.step(ram, !!(held & UP), run);
    this.plan = {};
  }
}

/** Where a Pendragon game keeps what a step into the picture uses (each game's engine has the same routines at its own addresses). */
export interface PendragonSteps {
  /** The way he faces, and its values. */
  facing: { addr: number; right: number; left: number; up: number; down: number };
  /** The offsets from his sprite to the point under his feet the floor check looks at, and their values facing up and down (as his handling sets them). */
  offsets: [number, number];
  up: [number, number];
  down: [number, number];
  /** The floor check his handling's frame runs after it (works out which ways are open for the way he faces; doors, stairs). */
  floor: () => void | Gen;
  /** His steps into the picture and out of it (each checks its way is open). */
  stepUp(): void;
  stepDown(): void;
  /** His walking frame and anything else a step changes that walking sideways keeps (put back after). */
  keep: number[];
  /** His sprite's picture (64 bytes), put back too. */
  picture: number;
  /** Bytes that change when a door, the stairs or a corner take him somewhere else. */
  place: number[];
  /** After a step, as his handling does: a pixel more that way where the floor check found it so (flag), on his depth and his sprite's y. */
  extra?: { flag: number; y: number; spriteY: number };
  /** Jumping: its flag; the ways-blocked flags (up, down) and the jump's base height that a step in a jump moves, as the game's jump does. */
  jump?: { flag: number; blocked: [number, number]; base: number; gate?: [number, number] };
  /** Whether his handling takes the stick now (else nothing is done). */
  busy(ram: Uint8Array): boolean;
  /** His x and depth as the floor check reads them (in a jump, the jump's base height for the depth: `jump.base`). */
  x: number;
  y: number;
  /**
   * The floor check's own lists of screen codes (the character under his feet, at $0400 +
   * 40 * ((depth - offset) / 8) + (x - offset) / 8, as each engine works it out): the ones it lets
   * him walk on facing up or down (and does nothing else with), and the ones it acts on facing
   * up and facing down (doors, stairs, corners: their transitions draw the new place, which only
   * the main loop can do). Anything else stops him (a wall).
   */
  tiles: { open: number[]; up: number[]; down: number[] };
}

/** The screen code under his feet one step up or down, as the engine's floor check looks it up (the screen is at $0400 in all three). */
export function pendragonTile(ram: Uint8Array, d: PendragonSteps, up: boolean): number {
  const o = up ? d.up : d.down;
  const y = d.jump && ram[d.jump.flag] === 1 ? ram[d.jump.base] : ram[d.y];
  const row = ((y - o[1]) & 0xff) >> 3, col = ((ram[d.x] - o[0]) & 0xff) >> 3;
  return ram[0x0400 + row * 40 + col];
}

/** What calling a routine gave: a generator function's run (it returns at once unless it waits for a frame). */
const isGen = (v: unknown): v is Gen => typeof v === 'object' && v !== null && 'next' in v;

/** A ControlsSpec for a Pendragon game, from where its engine keeps things. */
export function pendragonControls(d: PendragonSteps): ControlsSpec {
  const tile = (ram: Uint8Array, up: boolean) => pendragonTile(ram, d, up);
  const ahead = (ram: Uint8Array, up: boolean): Ahead => {
    const c = tile(ram, up);
    return d.tiles.open.includes(c) ? 'open' : (up ? d.tiles.up : d.tiles.down).includes(c) ? 'acts' : 'wall';
  };
  return {
    facing: d.facing,
    every: 2,
    tile,
    ahead,
    place: (ram) => d.place.map((a) => ram[a]).join(),
    state(ram) { return d.busy(ram) ? 'busy' : d.jump && ram[d.jump.flag] === 1 ? 'jump' : 'walk'; },
    step(ram, up, run) {
      // onto floor only: a wall stops him (as the floor check would find), and what the floor
      // check acts on (a door, stairs, a corner) is the game's own straight step's (EightWay.input
      // hands it the stick that way), in the main loop, where the next place can be drawn
      if (ahead(ram, up) !== 'open') return;
      const j = d.jump, jumping = !!j && ram[j.flag] === 1;
      if (j?.gate && jumping && ram[j.gate[up ? 0 : 1]] === 1) return; // (as the jump's own steps)
      const keep = d.keep.map((a) => ram[a]), facing = ram[d.facing.addr], offs = d.offsets.map((a) => ram[a]);
      const picture = ram.slice(d.picture, d.picture + 64);
      // faced that way, as his handling does, the floor check finds the way open (on floor it only
      // clears the ways-blocked flags, which the step routine checks)
      ram[d.facing.addr] = up ? d.facing.up : d.facing.down;
      const o = up ? d.up : d.down;
      ram[d.offsets[0]] = o[0]; ram[d.offsets[1]] = o[1];
      run.call(() => { const it = d.floor(); if (isGen(it)) it.next(); });
      run.call(up ? d.stepUp : d.stepDown);
      const x = d.extra;
      if (x) run.call(() => { if (ram[x.flag] === 1) { ram[x.y] = (ram[x.y] + (up ? -1 : 1)) & 0xff; wr(x.spriteY, ram[x.y]); } });
      if (j && jumping && ram[j.blocked[up ? 0 : 1]] !== 1) ram[j.base] = (ram[j.base] + (up ? -1 : 1)) & 0xff;
      d.keep.forEach((a, i) => { ram[a] = keep[i]; });
      ram[d.facing.addr] = facing; ram[d.offsets[0]] = offs[0]; ram[d.offsets[1]] = offs[1];
      ram.set(picture, d.picture);
    },
  };
}
