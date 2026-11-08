/**
 * A Wanted room put on Monty on the Run's engine, for the prototype: a Game of montyotr's (its Monty, physics, sprites, coin
 * collection) with the room's tiles, codes and colours written where its own room loader writes them (Game.loadRoom). The real
 * remix will load rooms through a shared room record instead (docs/montymole-remix-plan.md, phase 1); nothing of montyotr is changed here.
 */
import { PixelRenderer, VicView } from 'c64kit';
import { enterRoom } from '../../montyotr/src/ending';
import { Game, ROW, SCREEN, type Input } from '../../montyotr/src/game';
import { ROOM_COLS, ROOM_ROWS } from '../../montymole/src/room';
import { roleAt, type RemixRoom } from '../src/retile';

export const PLAY_COL = 4; // the playfield's first screen column
export const PLAY_ROW = 3; // and row

export const NONE: Input = { left: false, right: false, up: false, down: false, fire: false };

/** The coin's character in Monty on the Run's charset (Items.collectCoin). */
const COIN = 0x34;

/** A game of Monty on the Run, empty of everything of its own, in a Wanted room, Monty at (col, row) (his top left cell). */
export function stage(room: RemixRoom, at: { col: number; row: number }, facing = 0x01): Game {
  const g = new Game();
  g.start();
  enterRoom(g, 0x00, 0x40, 0x80, facing);
  // the room's eight tiles, as Game.loadRoom puts them in characters 1-8
  for (let i = 0; i < 8; i++) {
    const slot = room.slots[i];
    g.mem.set(slot?.rows ?? new Uint8Array(8), 8 + i * 8);
    g.tileProps[i] = slot?.prop ?? 0;
    g.roomColours[i] = slot?.colour ?? 0;
  }
  // the 32 x 20 playfield, its colours, and the border CreatePlayfieldBorder mirrors into the gutters
  for (let r = 0; r < ROOM_ROWS; r++) {
    for (let c = 0; c < ROOM_COLS; c++) {
      const code = room.cells[r * ROOM_COLS + c] ?? 0;
      g.mem[SCREEN + (r + PLAY_ROW) * ROW + PLAY_COL + c] = code;
    }
    const a = SCREEN + (r + PLAY_ROW) * ROW;
    g.mem[a + 2] = g.mem[a + 3] = g.mem[a + 4];
    g.mem[a + 36] = g.mem[a + 37] = g.mem[a + 35];
    for (let c = 2; c < 38; c++) {
      const code = g.mem[a + c];
      g.col[(r + PLAY_ROW) * ROW + c] = code >= 1 && code <= 8 ? g.roomColours[code - 1] : 0;
    }
  }
  // the coal, as Monty on the Run's coins (flashing characters Monty takes by touching)
  g.entities = [];
  for (const k of room.coal) {
    const cell = SCREEN + (k.row + PLAY_ROW) * ROW + PLAY_COL + k.col;
    g.mem[cell] = COIN;
    g.entities.push({ at: cell, phase: 0, index: -1 });
  }
  g.mem.fill(0, SCREEN + 24 * ROW, SCREEN + 25 * ROW); // (Wanted's rooms have no names: the name row is empty)
  // nothing else of the room it was made in
  g.enemies = [];
  g.enable = 0;
  g.roomFlags = 0;
  g.pd.roomFlag = 0;
  g.lift.type = 0;
  g.siActiveIdx = -1;
  g.x2 = g.savedX = 0x0c + (PLAY_COL + at.col) * 4;
  g.y = g.savedY = 0x32 + (PLAY_ROW + at.row) * 8;
  g.facing = facing;
  g.montyAction = 0;
  g.falling = 0;
  g.frame(0);
  return g;
}

/** A place Monty can stand: his 2 x 2 cells free, something to hold him under them. Nearest to a column first. */
export function standingSpot(room: RemixRoom, nearCol: number, nearRow: number): { col: number; row: number } | null {
  const free = (c: number, r: number) => {
    const role = roleAt(room, c, r);
    return role === null || role === 'decor';
  };
  const holds = (c: number, r: number) => {
    const role = roleAt(room, c, r);
    return role === 'solid' || role === 'platform';
  };
  let best: { col: number; row: number } | null = null;
  let bestD = Infinity;
  for (let r = 0; r < ROOM_ROWS - 2; r++) {
    for (let c = 1; c < ROOM_COLS - 3; c++) {
      if (!(free(c, r) && free(c + 1, r) && free(c, r + 1) && free(c + 1, r + 1))) continue;
      if (!(holds(c, r + 2) && holds(c + 1, r + 2))) continue;
      const d = Math.abs(c - nearCol) + Math.abs(r - nearRow) * 3;
      if (d < bestD) { bestD = d; best = { col: c, row: r }; }
    }
  }
  return best;
}

/** One frame of play with a stick held. */
export function step(g: Game, stick: Input): void {
  g.input = stick;
  g.inputFire = stick.fire;
  g.frame(0);
}

/** The 320 x 200 picture (C64 colour indexes) of a game as the renderer shows it. */
export function picture(g: Game): Uint8Array {
  const r = new PixelRenderer();
  const v = new VicView(r, g.vic);
  v.update();
  v.render(0);
  return r.picture();
}

/** The last cell of the ledge a spot is on, going right: the last column under his feet that holds. */
export function ledgeEnd(room: RemixRoom, spot: { col: number; row: number }): number {
  let c = spot.col;
  const holds = (col: number) => {
    const role = roleAt(room, col, spot.row + 2);
    return role === 'solid' || role === 'platform';
  };
  while (c + 1 < ROOM_COLS && holds(c + 1)) c++;
  return c;
}
