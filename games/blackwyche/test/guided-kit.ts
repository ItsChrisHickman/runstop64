/**
 * What the GUIDED check (guided.ts) plays with: a game in a place with things found as given, and that
 * game run through the front end (run(host)) with the keyboard, the frame loop and the render, as the
 * browser runs it, reading the status line's text back from the screen.
 */
import fs from 'node:fs';
import { Input, PixelRenderer, packState, unpackState, type MachineState } from 'c64kit';
import { NativeHost } from '../../shared/native/host';
import { screenText } from '../../shared/native/pause';
import { GAMES, setJoy } from '../../shared/native/test/games';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';
import { renderPng } from '../../../tools/probe/render';
import { run } from '../src/main';
import { go } from '../src/travel';
import { CABINS, HALLS } from '../src/ship';

export const game = must(GAMES.blackwyche, 'blackwyche in games.ts');
const title = fs.readFileSync(game.title);
stubFetch(title);

/** How he arrives in a cabin, a hall of part 2 or 3, and on a deck's part 0 (as the map notes them: re/routes.json played to C1.0.3, H1.2, H1.3 and the start). */
const CABIN_AT = [3, 3, 39, 0, 172, 39, 115, 109, 207, 113, 61, 19, 117, 2, 13, 1, 140, 255, 196, 0, 68, 68, 4, 3, 196, 117, 196, 0, 0, 0, 0, 0, 1, 0, 24, 6, 1, 12, 11, 10, 4, 9, 8, 7, 6, 5, 4, 3, 2, 1, 4, 41, 4, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 4, 41, 4, 10, 11, 12, 10, 12, 0];
const HALL2_AT = [1, 1, 39, 0, 127, 39, 112, 9, 104, 110, 113, 19, 137, 1, 30, 1, 237, 5, 176, 0, 60, 70, 1, 1, 176, 164, 237, 5, 0, 0, 0, 0, 1, 0, 16, 8, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 4, 39, 4, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 4, 39, 4, 4, 5, 6, 4, 6, 0];
const HALL3_AT = [2, 2, 39, 0, 130, 39, 118, 207, 44, 109, 175, 19, 66, 5, 30, 2, 115, 251, 127, 0, 0, 64, 2, 4, 127, 164, 115, 251, 0, 0, 0, 0, 1, 0, 24, 8, 2, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 4, 37, 4, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 4, 37, 4, 1, 2, 3, 1, 3, 0];
const DECK_AT = [4, 4, 39, 0, 112, 39, 112, 160, 0, 112, 0, 19, 117, 3, 34, 1, 144, 0, 144, 0, 0, 64, 3, 0, 144, 156, 144, 0, 0, 0, 0, 0, 1, 1, 16, 8, 2, 15, 16, 17, 18, 19, 20, 21, 22, 23, 18, 24, 25, 26, 18, 43, 18, 44, 44, 44, 44, 44, 44, 44, 44, 44, 44, 44, 18, 43, 18, 7, 8, 9, 7, 9, 0];

/** A new game, started from the title and played to the main loop's first wait. */
export function boot() {
  const g = new NativeHost(game.port, unpackState(new Uint8Array(title)));
  for (let f = 0; f < 40; f++) { setJoy(g.m, game, f < 34 && f > 30 ? 0x0f : 0x1f); g.tick(); }
  for (let f = 0; f < 400 && (g.lastWait !== game.mainLoopWait || f < 60); f++) { setJoy(g.m, game, 0x1f); g.tick(); }
  for (let f = 0; f < 30; f++) { setJoy(g.m, game, 0x1f); g.tick(); }
  return g;
}

/** Where: a room's number, or a deck's part 0 (`deck`), with what's found and how a hall is come into. */
export interface Where {
  room?: number;
  deck?: number;
  flags?: Record<number, number>;
  /** The side a hall is entered from ($342D: 1 going right off a deck's end, 2 going left). */
  side?: 1 | 2;
}

/** A new game's first frames, saved (one boot for all the games the checks start). */
let base: MachineState | null = null;
const newGame = () => {
  if (!base) base = must(boot().save(), 'a save of a new game');
  return NativeHost.resume(game.port, unpackState(packState(base)));
};

/** A save with the game's things found as given (as the game keeps them) and Pendragon there (src/travel.ts: the game's own way in). */
export function saveAt(at: Where): MachineState {
  const g = newGame();
  const r = g.m.ram;
  for (const [a, v] of Object.entries(at.flags ?? {})) r[Number(a)] = v;
  if (at.side) r[0x342d] = at.side;
  let to: number[] | null = null;
  if (at.deck !== undefined) to = [0, at.deck, 0, ...DECK_AT];
  else if (at.room !== undefined) {
    const cab = CABINS.find((c) => c.room === at.room), hall = HALLS.find((h) => h.room === at.room);
    if (cab) to = [1, cab.deck, cab.part, cab.door, cab.room, cab.picture, ...CABIN_AT];
    else if (hall) to = [2, hall.deck, hall.part, ...(hall.part === 2 ? HALL2_AT : HALL3_AT)];
  }
  if (to === null) throw new Error(`no such place: ${JSON.stringify(at)}`);
  const where = to;
  let done = false;
  g.onWait = (site) => { if (site === game.mainLoopWait && !done) { done = true; if (!go(r, where)) throw new Error('go refused'); } };
  const step = () => { setJoy(g.m, game, 0x1f); r[0x9d77] = 100; g.tick(); };
  for (let f = 0; f < 26; f++) step();
  let s = g.save();
  for (let f = 0; f < 200 && !s; f++) { step(); s = g.save(); }
  return must(s, 'a save');
}

/** The game's own line, as it stands in the first game's memory (SEARCHING FOR THE CAPTAINS SOUL). */
export const SEARCHING = 'SEARCHING FOR THE CAPTAINS SOUL';

/** The status line's text as the screen has it (the game's lettering read back, spaces folded). */
export const lineOf = (ram: Uint8Array) => screenText(ram, 22, 3, 32);

/** A launched game: the front end as the browser runs it. */
export class Session {
  readonly input = new Input(nowhere);
  readonly renderer = new PixelRenderer();
  readonly p = run({ renderer: this.renderer, input: this.input, canvas: nowhere });
  /** Each different status line seen, with the frame it first showed. */
  readonly trace: { at: number; text: string }[] = [];
  /** Frames the game's own "YOU HAVE ..." message was on while the line didn't say so (covered). */
  covered = 0;
  frames = 0;

  private constructor() { /* use launch() */ }

  static async launch(save: MachineState, enhanced = true) {
    const kept = new Map([['blackwyche.save.v1', Buffer.from(packState(save)).toString('base64')]]);
    if (!enhanced) kept.set('blackwyche.assist', JSON.stringify({ enhanced: false })); // (the switch as the page remembers it)
    useMemoryStorage(kept);
    const s = new Session();
    await new Promise((r) => setTimeout(r, 0));
    for (let i = 0; i < 900 && !s.p.state.playing; i++) s.tick();
    if (!s.p.state.playing) throw new Error('did not continue the save');
    s.trace.length = 0;
    return s;
  }

  get ram() { return must(this.p.machine, 'the machine').ram; }
  get vic() { return must(this.p.machine, 'the machine').vic; }
  line() { return lineOf(this.ram); }
  /** The sparkles drawn now (C64 pixels). */
  get sparkles() { return this.renderer.sparkles.markers; }

  /** Frames of the front end, one after the other (his energy kept up so nothing ends the game). */
  tick(n = 1) {
    for (let i = 0; i < n; i++) {
      this.input.poll(); this.p.tick(); this.p.render(0);
      this.frames++;
      const m = this.p.machine;
      if (!m) continue;
      m.ram[0x9d77] = 100; m.ram[0x3417] = 0;
      const text = lineOf(m.ram);
      if (this.trace[this.trace.length - 1]?.text !== text) this.trace.push({ at: this.frames, text });
      // (the game's own messages: a thing found ($3419), the sword not yet found ($1515): both say YOU HAVE ...)
      if ((m.ram[0x3419] !== 0 || m.ram[0x1515] !== 0) && !text.startsWith('YOU HAVE')) this.covered++;
    }
  }

  /** Tick until the line says `text` (folded spaces; true: it did, within `max` frames). */
  until(text: string, max = 700) {
    const want = text.replace(/\s+/g, ' ');
    for (let i = 0; i < max; i++) {
      if (this.line() === want) return true;
      this.tick();
    }
    return this.line() === want;
  }

  /** Tick until `done()` (true: it was, within `max` frames). */
  wait(done: () => boolean, max = 600) {
    for (let i = 0; i < max && !done(); i++) this.tick();
    return done();
  }

  /** Hold keys until `done()` (or `max` frames), one frame at a time, then let go. True if done. */
  walk(keys: string[], done: () => boolean, max = 600) {
    for (const k of keys) this.input.keyDown(k);
    let i = 0;
    for (; i < max && !done(); i++) this.tick();
    for (const k of keys) this.input.keyUp(k);
    this.tick();
    return done();
  }

  /** Hold one key for `n` frames, then let go (and `rest` frames more). */
  hold(key: string, n: number, rest = 0) {
    this.input.keyDown(key);
    this.tick(n);
    this.input.keyUp(key);
    this.tick(Math.max(1, rest));
  }

  /** Walk to a place (VIC coordinates: $341F, $3420) with the arrows, closing in a step at a time. */
  goTo(x: number, y: number, max = 900, near = 2) {
    for (let i = 0; i < max; i++) {
      const px = this.ram[0x341f], py = this.ram[0x3420];
      const keys: string[] = [];
      if (py < y - near) keys.push('ArrowDown'); else if (py > y + near) keys.push('ArrowUp');
      if (px < x - near) keys.push('ArrowRight'); else if (px > x + near) keys.push('ArrowLeft');
      if (!keys.length) return true;
      for (const k of keys) this.input.keyDown(k);
      this.tick();
      for (const k of keys) this.input.keyUp(k);
    }
    return false;
  }

  /** A swing of the sword (X held for a stroke, then a rest). */
  swing() { this.hold('KeyX', 14, 6); }

  /** A still of the picture as it shows now, the sparkles ringed. */
  shot(file: string) {
    this.tick(2); // (the picture is the frame the game last drew: our line, written after it, shows in the next)
    const m = must(this.p.machine, 'the machine');
    renderPng(m, file, this.sparkles.map((s): [number, number] => [s.x, s.y]));
  }
}
