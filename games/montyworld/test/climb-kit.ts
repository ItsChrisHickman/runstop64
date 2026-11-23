/**
 * Probing every climb (a rope, vine or ladder: a column of class-3 cells) of a game's rooms on its own physics: from the floor under a
 * climb's foot, Monty put at every place his box touches the rope and holding up must go up; from a floor line with the climb through an
 * opening in it, put at every place his box touches the rope and holding down must go down (Chris on Moscow, 2026-11-22).
 */
import { enterRoom } from '../../montyotr/src/ending';
import type { Game } from '../../montyotr/src/game';
import type { MontyData } from '../../montyotr/src/montydata';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { PLAY_COL, PLAY_COLS, PLAY_ROW, PLAY_ROWS } from '../../shared/monty/screen';
import { newGame } from '../../shared/monty/test/bot';

/** The collision class of a playfield cell (0 empty, 1 solid, 2 floor, 3 rope, 4 hazard). */
const flag = (g: Game, col: number, row: number) => (col < 0 || col >= PLAY_COLS || row < 0 || row >= PLAY_ROWS ? 0 : g.flagAt(PLAY_ROW + row, PLAY_COL + col));
const solid = (g: Game, col: number, row: number) => { const f = flag(g, col, row); return f === 1 || f === 2; };

/** A climb: a column of rope cells, top to bottom (playfield cells). */
export interface Climb { room: number; col: number; top: number; bottom: number }

/** The rooms of a game's exit grid. */
export function roomsOf(data: MontyData): number[] {
  return [...new Set(Array.from(data.exitGrid.image).filter((r) => r !== 0xff))].sort((a, b) => a - b);
}

/** The climbs in the room Monty is in. */
export function climbsIn(g: Game): Climb[] {
  const out: Climb[] = [];
  for (let col = 0; col < PLAY_COLS; col++) {
    for (let row = 0; row < PLAY_ROWS; row++) {
      if (flag(g, col, row) !== 3 || flag(g, col, row - 1) === 3) continue;
      let bottom = row;
      while (flag(g, col, bottom + 1) === 3) bottom++;
      out.push({ room: g.roomId, col, top: row, bottom });
    }
  }
  return out;
}

/** A game with Monty in a room, no creatures, no death (the grace). */
export function inRoom(data: MontyData, room: number): State | null {
  const s = newGame(data, false);
  s.g.graceActive = () => true;
  const ok = enterRoom(s.g, room, 0x30, 0x32 + 8 * 8);
  s.g.enemies = [];
  s.g.enable &= 0x0f;
  s.g.vic.enable &= 0x0f;
  return ok ? s : null;
}

const X0 = 0x0c;
/** The x2 of a playfield column's left edge. */
const x2Of = (col: number) => X0 + (col + PLAY_COL) * 4;
/** The y a standing Monty has on a floor row. */
const yOf = (floor: number) => 0x32 + (floor - 2 + PLAY_ROW) * 8;

/**
 * Put Monty on a spot, still, and hold up or down for a while: whether he went a couple of rows that way (or left the room by it; `mustLeave`: whether he left it). A climb that
 * starts is not stopped by the top's own walls (Monty on the Run's ropes end at ledges and ceilings too).
 */
function climbs(s: State, climb: Climb, x2: number, y: number, way: 'up' | 'down', mustLeave = false): boolean {
  const g = s.g;
  if (g.roomId !== climb.room) { enterRoom(g, climb.room, 0x30, 0x32 + 8 * 8); g.enemies = []; g.enable &= 0x0f; g.vic.enable &= 0x0f; } // (a climb that went out of the room: back in it)
  g.x2 = x2; g.y = y; g.falling = 0; g.montyAction = 0; g.onRope = 0; g.arcIdx = 0; g.gameMode = 0; g.actionCounter = 0;
  frame(s, NONE);
  const y0 = g.y;
  for (let i = 0; i < (mustLeave ? 260 : 60); i++) {
    frame(s, { ...NONE, [way]: true });
    if (g.roomId !== climb.room) return true;
    if (!mustLeave && (way === 'up' ? y0 - g.y >= 16 : g.y - y0 >= 16)) return true;
  }
  return false;
}

export interface Fail { climb: Climb; kind: 'up' | 'down'; floor: number; x2s: number[] }

/** (The game looks for a rope in the two columns at his left, `updateRope`: a rope under the third of an unaligned box is not touched.)
 * Where a standing Monty has his box on a floor row at an x2 (2 columns when aligned, 3 between): whether it is clear of walls and has floor under it. */
function boxAt(g: Game, x2: number, floor: number): { c0: number; c1: number; clear: boolean; floor: boolean } {
  const c0 = ((x2 - X0) >> 2) - PLAY_COL, cols = ((x2 - X0) & 3) === 0 ? 2 : 3;
  let clear = true, hasFloor = false;
  for (let c = c0; c < c0 + cols; c++) {
    if (solid(g, c, floor - 2) || solid(g, c, floor - 1)) clear = false;
    if (solid(g, c, floor)) hasFloor = true;
  }
  return { c0, c1: c0 + cols - 1, clear, floor: hasFloor };
}

/** The free cells either side of a rope in a floor's opening (a floor row, the cells beside it solid within 8), and the floor row. */
export interface Opening { climb: Climb; floor: number; left: number; right: number }

export interface RoomClimbs { climbs: Climb[]; fails: Fail[]; openings: Opening[] }

export function probeRoom(s: State): RoomClimbs {
  const g = s.g;
  const out: RoomClimbs = { climbs: climbsIn(g), fails: [], openings: [] };
  for (const climb of out.climbs) {
    const { col, top, bottom } = climb;
    // up from the foot: standing on the floor under its bottom cell, from every place the box touches the rope
    const foot = bottom + 1;
    if (foot < PLAY_ROWS && solid(g, col, foot) && bottom - top >= 2) {
      const bad: number[] = [];
      for (let x2 = x2Of(col - 3); x2 <= x2Of(col + 1); x2++) {
        const b = boxAt(g, x2, foot);
        if (!b.clear || !b.floor || b.c0 > col || b.c0 + 1 < col || x2 < 0x16 || x2 > 0x99) continue;
        // (a rope that goes on into the room above must take him out of this one: through the opening in its ceiling, from wherever he is on it)
        const above = top === 0 && g.roomAt(g.mapRow - 1, g.exitCol) !== 0xff;
        if (!climbs(s, climb, x2, yOf(foot), 'up', above)) bad.push(x2);
      }
      if (bad.length) out.fails.push({ climb, kind: 'up', floor: foot, x2s: bad });
    }
    // down from a floor above: any floor line along the rope with the rope in an opening of it (at its top, or a floor it passes through)
    for (let floor = Math.max(top, 2); floor <= Math.min(bottom - 2, PLAY_ROWS - 1); floor++) { // (a floor line at the room's top has no room for him on it; the rope goes on for two rows under a floor it is let through)
      let left = 0, right = 0;
      while (left < 8 && !solid(g, col - 1 - left, floor)) left++;
      while (right < 8 && !solid(g, col + 1 + right, floor)) right++;
      // (a hole in a floor: floor either side, within 8 cells, and none under the rope's own cell; the floor under it is what he stands on above)
      if (left >= 8 || right >= 8 || solid(g, col, floor) || col - 1 - left < 0 || col + 1 + right >= PLAY_COLS) continue;
      // (and he can stand on it: the floor's ends have air above them, they are not the faces of walls or steps)
      if (solid(g, col - 1 - left, floor - 1) || solid(g, col + 1 + right, floor - 1)) continue;
      out.openings.push({ climb, floor, left, right });
      const bad: number[] = [];
      for (let x2 = x2Of(col - 3); x2 <= x2Of(col + 1); x2++) {
        const b = boxAt(g, x2, floor);
        if (!b.clear || b.c0 > col || b.c0 + 1 < col || x2 < 0x16 || x2 > 0x99) continue;
        if (!climbs(s, climb, x2, yOf(floor), 'down')) bad.push(x2);
      }
      if (bad.length) out.fails.push({ climb, kind: 'down', floor, x2s: bad });
    }
  }
  return out;
}

export function probe(data: MontyData): { room: number; found: RoomClimbs }[] {
  const out: { room: number; found: RoomClimbs }[] = [];
  for (const room of roomsOf(data)) {
    const s = inRoom(data, room);
    if (!s) continue;
    out.push({ room, found: probeRoom(s) });
  }
  return out;
}
