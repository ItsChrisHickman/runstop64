import { X2_ORIGIN } from '../../shared/monty/body';
import { FRAME } from '../../shared/monty/frames';
import { PLAY_COL } from '../../shared/monty/screen';
import { pixelX, pixelY } from './cells';
import { standingCell } from './escalators';
import type { Game } from './game';
import type { CableCarSpec, CableStation } from './montydata';

/**
 * Cable cars (a game's `cableCars`: Do Svidaniya Monty's Sugarloaf): a ride he cannot leave, made as the escalators' are (gameMode 1: the stick does nothing, he is carried). Stepping onto a station's foot puts him in the
 * car waiting there; it crosses to the other station's foot in `frames` frames at a steady pace along the line between them, the other car coming the other way (they pass halfway), and he is set down standing on the
 * foot, where he must step off before it rides again. A car is two sprites, its roof behind him and its floor and rail in front; each station always has one at it.
 */

/** The ride under way (`from` the station index it began at, 0 the low one and 1 the high one: -1 none), the frame of it, where it began, and whether he is still standing on the foot he was set down on. */
export interface CableRide { from: number; t: number; x2: number; y: number; latch: boolean; /** The station the car he last rode (or the first) is at. */ at: number }

export const NO_CABLE: CableRide = { from: -1, t: 0, x2: 0, y: 0, latch: false, at: 0 };

const FOOT_WIDTH = 2;

export function cableInit(g: Game) {
  g.cable = { ...NO_CABLE };
}

/** The car of this room, if it has one. */
const carOf = (g: Game): CableCarSpec | undefined => g.data.cableCars.find((c) => c.room === g.roomId);

const station = (c: CableCarSpec, i: number): CableStation => (i === 0 ? c.low : c.high);
const footX2 = (s: CableStation) => (X2_ORIGIN + (s.col + PLAY_COL) * 4) & 0xff;

/** Whether he stands on the foot of a station (on its floor row, over one of its cells, on his feet). */
function footUnder(g: Game, c: CableCarSpec): number {
  for (const i of [0, 1]) {
    const s = station(c, i), cell = standingCell(g, s.row);
    if (cell !== null && cell + 1 >= s.col && cell < s.col + FOOT_WIDTH) return i;
  }
  return -1;
}

/** The sprite pixel (left, Monty's top) of a car standing at `at` stations along the line (0 the low foot, 1 the high). */
function carPlace(c: CableCarSpec, along: number): { x: number; y: number } {
  const x = pixelX(c.low.col) + along * (pixelX(c.high.col) - pixelX(c.low.col));
  const y = pixelY(c.low.row - 2) + along * (pixelY(c.high.row - 2) - pixelY(c.low.row - 2));
  return { x, y };
}

function showCar(g: Game, c: CableCarSpec, roof: number, floor: number, along: number) {
  const { x, y } = carPlace(c, along);
  for (const [n, ptr, dy] of [[roof, c.roof.ptr, c.roofDy], [floor, c.floor.ptr, c.floorDy]] as const) {
    g.sx[n] = Math.max(0, Math.min(255, Math.round((x + c.dx) / 2)));
    g.sy[n] = Math.max(0, Math.min(255, Math.round(y + dy)));
    g.sptr[n] = ptr;
    g.scol[n] = c.colour;
    g.enable |= 1 << n;
  }
}

/** The sprites the cars are on, as the collision check's mask (they are no part of what kills him or what he picks up). */
export function cableSprites(g: Game): number {
  const c = carOf(g);
  return c ? (1 << c.roof.sprite) | (1 << c.floor.sprite) | (1 << c.passing.roof) | (1 << c.passing.floor) : 0;
}

/** One frame (after Monty's move): start a ride from a foot, or carry him on, and draw the two cars. */
export function cableUpdate(g: Game) {
  const c = carOf(g);
  if (!c) return;
  const r = g.cable;
  if (r.from < 0) {
    const at = footUnder(g, c);
    if (at < 0) r.latch = false;
    else if (!r.latch) {
      const s = station(c, at);
      g.gameMode = 1;
      g.x2 = footX2(s);
      g.cable = { from: at, t: 0, x2: g.x2, y: g.y, latch: false, at };
      g.facing = at === 0 ? 0x01 : 0x81;
      g.frameIndex = at === 0 ? FRAME.walkRight : FRAME.walkLeft;
      g.sfx(g.data.sfx.liftAscend, true);
      return cableDraw(g, c);
    }
    return cableDraw(g, c);
  }
  r.t++;
  const k = Math.min(1, r.t / c.frames), dir = r.from === 0 ? 1 : -1;
  const a = station(c, 0), b = station(c, 1);
  g.x2 = (r.x2 + dir * Math.round(k * (footX2(b) - footX2(a)) * (r.from === 0 ? 1 : 1))) & 0xff;
  g.y = (r.y + dir * Math.round(k * (b.row - a.row) * 8)) & 0xff;
  if (r.t >= c.frames) {
    g.gameMode = 0;
    g.montyAction = 0;
    g.falling = 0;
    g.cable = { from: -1, t: 0, x2: 0, y: 0, latch: true, at: 1 - r.from };
    g.facing = r.from === 0 ? 0x01 : 0x81;
  }
  cableDraw(g, c);
}

/** The cars: the one he is in on the line, the other at the opposite place along it; at rest one at each station. */
function cableDraw(g: Game, c: CableCarSpec) {
  const r = g.cable;
  const along = r.from < 0 ? r.at : r.from === 0 ? Math.min(1, r.t / c.frames) : 1 - Math.min(1, r.t / c.frames);
  showCar(g, c, c.roof.sprite, c.floor.sprite, along);
  showCar(g, c, c.passing.roof, c.passing.floor, 1 - along);
}
