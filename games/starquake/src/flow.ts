import * as Blob from './blob';
import { CORE_ROOM, rom, START } from './data';
import * as Enemies from './enemies';
import type { Game } from './game';
import * as Frame from './frame';
import * as Items from './items';
import * as Laser from './laser';
import * as Panel from './panel';
import * as Specials from './specials';
import { drawRoom } from './room';

/**
 * The original's main loop ($0C6E-$0E78), as a generator: each `yield` is
 * the original's wait for the next frame ($4C2D), so the port advances
 * exactly one of the original's frames per tick.
 */
export type Script = Generator<void, void, void>;

/** Parts tests can switch off (in the original too, by patching), to check the rest on its own. */
export interface Hooks {
  noEnemies?: boolean;
  noLaser?: boolean;
  noPickup?: boolean;
  /** Each room's start, before it's drawn (where saves are taken). */
  roomStart?(g: Game): void;
  /** ENHANCED's unlimited lives (shared/lives.ts): a death takes no life, and the panel's count stays as it is. */
  unlimitedLives?(): boolean;
}

/**
 * $0C23: a new game: the seeds for its random numbers, the panel, the items
 * scattered, BLOB in the first room.
 */
export function newGame(g: Game, seed: number) {
  const R = g.rng;
  R.a = seed & 0xff; R.b = (seed >> 8) & 0xff; R.c = (seed >> 16) & 0xff; R.d = (seed >> 24) & 0xff;
  R.s1 = R.both();
  R.s2 = R.both();
  setUp(g);
}

/** $0C3C-$0C6C: a new game's setup, once the seeds are drawn (and the title has been). */
export function setUp(g: Game) {
  g.exit = 0; g.exitCol = START.col; g.exitRow = START.row;
  g.cacheAt = 0; g.cacheRoomHi[0] = g.cacheRoomHi[1] = 0xff;
  Panel.drawFrame(g);
  g.sound.silence();
  g.barrierGone.fill(0);
  // $4312: the sprites
  g.riding = 0;
  const sp = g.sprites;
  sp.x.fill(0); sp.y.fill(0); sp.msb = 0;
  sp.colour.fill(0);
  Items.newGame(g); // (also the panel's numbers, $2FE6)
  g.room = START.room;
}

/** From a new game's (or a save's) room on: rooms, BLOB, until the game is over. */
export function* play(g: Game, hooks: Hooks): Script {
  for (;;) {
    const result = yield* rooms(g, hooks);
    if (result !== 'over') continue;
    if (!g.won) yield* finalScore(g);
    return;
  }
}

/**
 * $4E2D: the final count: a bonus worked out from the score's own digits
 * (through the random number generator), counted onto the score quickly.
 */
export function* finalScore(g: Game): Script {
  do yield* Specials.wait(g); while (g.scoreRoll);
  const R = g.rng, d = g.score;
  const rol2 = (v: number) => ((v << 2) | (v >> 7)) & 0xff;
  R.s2 = R.a = rol2(rom(0x4f53 + d[3]));
  R.b = rom(0x4f53 + d[1]);
  R.c = R.s1 = d[2];
  R.d = rol2(rom(0x4f53 + d[0]));
  let a = 0;
  for (let i = 0; i < 5; i++) a = R.both();
  const x = a >> 1;
  let v = x - ((rom(0x4f53 + d[4]) + d[5]) & 0xff);
  if (v & 0x80 || v < 0) v = (v + 0x64) & 0xff;
  g.pendingScore = v & 0xff;
  g.sprites.enable = !g.riding && g.padShown ? 0x10 : 0;
  do {
    for (let i = 0; i < 4; i++) Panel.countFast(g);
    Frame.scenery(g);
    g.sound.effect(0x10, 0);
    g.sound.effect(0x12, 1);
    g.frames = (g.frames + 1) & 0xff;
    yield;
  } while (g.scoreRoll || g.pendingScore);
}

/**
 * Travel (the pause map): BLOB leaves the room he's in as he would by an
 * exit, and comes into `room` the way he first did. Then play goes on.
 */
export function* travel(g: Game, hooks: Hooks, room: number, entry: { col: number; row: number }): Script {
  if (!hooks.noEnemies) Enemies.leave(g);
  g.laser &= 0x3f;
  g.riding = 0;
  g.room = room & 0x1ff;
  g.exit = 0; g.exitCol = entry.col; g.exitRow = entry.row;
  yield* play(g, hooks);
}

/**
 * $0C6E onwards: draw the room, then BLOB's frames until he leaves it or dies. `mid`: a game copied between frames (the ending's
 * route search copies a game to look ahead): the room is already drawn and BLOB in it, and what goes on is the rest of the frame
 * the copy was made in.
 */
export function* rooms(g: Game, hooks: Hooks, mid = false): Generator<void, 'over' | 'again', void> {
  if (!mid) g.sprites.ptr[0] = 0x45;
  for (;;) {
    if (mid) {
      mid = false;
      Panel.frame(g);
      Frame.scenery(g);
    } else {
      hooks.roomStart?.(g);
      drawRoom(g);
      if (g.room === CORE_ROOM) {
        // $0C80: the core's sequence; then out to the room on the left (or, complete, the end).
        g.inScreen = true;
        const complete = yield* Specials.core(g);
        g.inScreen = false;
        if (complete) { g.won = true; return 'over'; }
        g.room = (g.room - 1) & 0x1ff;
        g.exitCol = 0x23;
        g.sprites.ptr[0] = 0x45;
        continue;
      }
      g.restart = { riding: g.riding, exit: g.exit, col: g.exitCol, row: g.exitRow };
      Blob.place(g, g.exit, g.exitCol, g.exitRow);
      Blob.placePad(g);
      if (!hooks.noEnemies) Enemies.enter(g);
    }
    for (;;) {
      const r = Blob.tick(g, g.joy);
      g.exit = r.code; g.exitCol = r.col; g.exitRow = r.row;
      Blob.deadlyCheck(g);
      if (g.dead) return yield* death(g, hooks);
      const code = g.exit;
      const leave = (to: number) => { if (!hooks.noEnemies) Enemies.leave(g); g.room = to & 0x1ff; };
      if (code === 0x20) { leave(g.room - 16); break; }
      if (code === 0x10) { leave(g.room + 16); break; }
      if (code === 0x40) { leave(g.room - 1); break; }
      if (code === 0x80) { leave(g.room + 1); break; }
      if (code === 0x3f) { leave(g.room + (g.exitRow ? -1 : 1)); break; }
      if (code === 0x3d) {
        // a teleport: its screen, then the destination (the same room if the name wasn't known)
        if (!hooks.noEnemies) Enemies.leave(g);
        g.inScreen = true;
        const to = yield* Specials.teleport(g, Specials.teleportHere(g));
        g.inScreen = false;
        g.room = Specials.teleportRoom(to) & 0x1ff;
        g.sprites.ptr[0] = 0x45;
        break;
      }
      if (code === 0x30) {
        // a security door: through it (6 columns on) if access is granted; the room again either way
        if (!hooks.noEnemies) Enemies.leave(g);
        g.inScreen = true;
        const pass = yield* Specials.door(g);
        g.inScreen = false;
        if (pass) {
          let col = g.exitCol;
          if (g.exitRow) { col = (col - 6) & 0xff; if (!col) col = (col + 6) & 0xff; } else col = (col + 6) & 0xff;
          g.exitCol = col;
        }
        break;
      }
      let pickup = !hooks.noPickup;
      if (code === 0x3b) {
        // an upright barrier: the key opens it (and BLOB goes on at once); else this frame has no picking up
        if (Specials.openKeyBarrier(g)) continue;
        pickup = false;
      } else if (code === 0x3e) {
        Specials.breakBarrier(g);
        continue;
      }
      if (pickup) {
        const p = Items.touch(g);
        g.exitCol = g.col; g.exitRow = g.row;
        if (p === 0x19) {
          // a Cheops pyramid: its trade, then the room again
          if (!hooks.noEnemies) Enemies.leave(g);
          g.inScreen = true;
          yield* Specials.cheops(g);
          g.inScreen = false;
          g.sprites.ptr[0] = 0x45;
          break;
        }
      }
      if (!hooks.noLaser) Laser.tick(g);
      if (!hooks.noEnemies) Enemies.tick(g);
      yield* Frame.sync(g);
      if (!g.energy) {
        // $0DE9: out of energy: BLOB flashes, the panel's corner too, and he dies where he is.
        g.sprites.enable &= 0xf7;
        for (let n = 0x40; n > 0; n--) {
          const v = (g.scr.colour(0x3a) + 0x10) & 0xff;
          g.scr.setColour(0x3b, v); g.scr.setColour(0x3a, v); g.scr.setColour(0x39, v);
          for (let s = 0; s < 3; s++) g.sprites.colour[s] = (g.sprites.colour[s] + 1) & 15;
          if (!hooks.noEnemies) Enemies.tick(g);
          yield* Frame.sync(g);
          if (!(n & 3)) g.sound.effect(0x36, 1);
        }
        g.sound.effect(0x16, 1);
        return yield* death(g, hooks, true);
      }
      if (g.dead === 1) return yield* death(g, hooks, true);
      if (g.dead === 0x0f) return yield* death(g, hooks);
    }
  }
}

/**
 * $0E39: BLOB dies: his fragments fly, a life rolls away, then he's back
 * where he came into the room (or, killed by an enemy or out of energy,
 * where he was).
 */
function* death(g: Game, hooks: Hooks, here = false): Generator<void, 'over' | 'again', void> {
  if (here) g.restart = { riding: g.riding, exit: 0, col: g.col, row: g.row };
  Panel.died(g, hooks.unlimitedLives?.() === true);
  Enemies.fragments(g);
  for (let i = 0; i < 100; i++) {
    if (!hooks.noEnemies) Enemies.tick(g);
    yield* Frame.sync(g);
  }
  if (g.lives[1] === 0 && g.lives[0] === 0) return 'over';
  g.riding = g.restart.riding;
  g.exit = g.restart.exit; g.exitCol = g.restart.col; g.exitRow = g.restart.row;
  g.cacheAt = 0; g.cacheRoomHi[0] = g.cacheRoomHi[1] = 0xff;
  return 'again';
}
