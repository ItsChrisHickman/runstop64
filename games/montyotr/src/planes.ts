import { applyMonty } from '../../shared/monty/physics';
import type { Game } from './game';
import type { CellBox, PlaneLeg, PlaneLook } from './montydata';
import { inBox } from './cameos';
import { surgeOn } from './swim';

/**
 * A flight in a plane (a game's `planes`: Do Svidaniya Monty's yellow mail biplane, Hilo to the Andes; docs/dosvidaniya-flight.md). Each leg is a room: in it Monty sits in the plane (sprite 2 over him, no
 * part of the collision check, as the parachute's canopy is) and flies it with Monty on the Run's jetpack feel: up held, he climbs a pixel a frame; down held, he dives a pixel a frame; let go, the plane sinks a
 * pixel every other frame; sideways at his walking pace. He stays in the leg's box (he never leaves it by an edge). A gust (`currents` with a `dy`) carries him as a surge carries a swimmer. The scenery goes
 * by (the room's `charAnims`), the birds come on the leg's clock (`rollers`), and so does what is drawn in characters (`tunnels`, `pulses`): the leg is the same each time he flies it, and a death starts it
 * again as he came in.
 *
 * When the leg's `frames` are flown, he flies on into the room east of it where he is (the joins are seamless), or he bails out (`then.kind` 'bail'): the room's pursuer surges at his tail and clips it
 * (the find `lost` is taken: the villain wins the round), the plane tumbles away on sprite 1 and he drops under the canopy, out of the picture's bottom into the cell `to` at its top. All of it is plain
 * numbers on the game (`planeTime`, `planeBail`, `planeTilt`, `planeFrom`), so a copy of the game goes on as the game would.
 */

/** How fast the plane sinks when he lets go (a pixel every this many frames). */
export const PLANE = { sink: 2 } as const;

/** The leg of the room, if it is one. */
export const planeOf = (g: Game): PlaneLeg | undefined => g.data.planes.find((p) => p.room === g.roomId);

/** The sprite y range and x2 range of a box of playfield cells (his top left in them). */
function limits(box: CellBox) {
  return { top: 0x32 + (box.row0 + 3) * 8, bottom: 0x32 + (box.row1 + 3) * 8, left: 0x0c + (box.col0 + 4) * 4, right: 0x0c + (box.col1 + 4) * 4 };
}

/** A room is loaded: the leg's clock from nought, no bail-out. */
export function planeInit(g: Game) {
  g.planeTime = 0;
  g.planeBail = -1;
  g.planeTilt = 0;
  g.planeFrom = 0;
  g.planeTouch = 0;
}

/**
 * The plane waiting in the room (`boardings`): touched with the item it needs, it takes off with him into the flight's first leg, where he is on the screen; touched without it, its hint (once a touch,
 * not every frame he stays against it) and nothing more.
 */
export function boardUpdate(g: Game) {
  const board = g.data.boardings.find((b) => b.room === g.roomId);
  if (!board || g.actionCounter || g.roomExit) return;
  if (!inBox(g, board.box)) { g.planeTouch = 0; return; }
  if (g.siCollected[board.needs]) {
    g.mapRow = board.goes.mapRow;
    g.exitCol = board.goes.exitCol;
    // (inside the leg's box: boarded in a jump he may be above it)
    const leg = g.data.planes.find((p) => p.room === g.roomAt(board.goes.mapRow, board.goes.exitCol));
    if (leg) {
      const box = limits(leg.box);
      g.x2 = Math.min(box.right, Math.max(box.left, g.x2));
      g.y = Math.min(box.bottom, Math.max(box.top, g.y));
    }
    g.roomExit = 1;
    return;
  }
  if (!g.planeTouch) g.noteWanted(board.hint);
  g.planeTouch = 1;
}

/** One frame of his flying (in place of walking: monty.ts): the stick, a gust, the box. */
export function planeMove(g: Game, leg: PlaneLeg) {
  const input = g.input, gust = surgeOn(g), box = limits(leg.box);
  g.montyAction = 0;
  g.falling = 0;
  g.onRope = 0;
  g.arcIdx = 0;
  g.isMoving = false;
  const up = gust?.dy === -1 || (input.up && gust?.dy !== 1), down = gust?.dy === 1 || (input.down && !input.up && gust?.dy !== -1);
  const sideways = gust && gust.dx !== 0 ? gust.dx : input.left && !input.right ? -1 : input.right && !input.left ? 1 : 0;
  g.planeTilt = up ? -1 : down ? 1 : 0;
  g.dirUp = up && g.y > box.top;
  g.dirDown = (down || (!up && g.planeTime % PLANE.sink === 0)) && g.y < box.bottom;
  g.dirLeft = sideways < 0 && g.x2 > box.left;
  g.dirRight = sideways > 0 && g.x2 < box.right;
  g.upSteps = g.downSteps = 1;
  if (up) g.sfx(g.data.sfx.jetpack, true);
  applyMonty(g, g);
  g.facing = 0x01; // (the plane always flies east: steering back slows it, it does not turn)
}

/** After his frame is chosen: in the plane he sits in the cockpit. */
export function planePose(g: Game) {
  const look = g.data.planeLook;
  if (look && !g.gameMode && planeOf(g)) g.frameIndex = look.seat;
}

/** The frames of a bail-out: the surge at his tail, the clip's jolt, then the drop. */
const JOLT = 16;

/** One frame of the leg (after the room's other things): the clock, and at its end the way on or the bail-out. */
export function planeUpdate(g: Game) {
  const leg = planeOf(g);
  if (!leg || g.actionCounter || g.roomExit) return;
  if (g.planeBail >= 0) return bailFrame(g, leg);
  g.planeTime++;
  if (g.planeTime < leg.frames) return;
  if (leg.then.kind === 'east') {
    if (g.roomAt(g.mapRow, g.exitCol + 1) === 0xff) return;
    g.exitCol++;
    g.roomExit = 1;
    return;
  }
  g.planeBail = 0;
  g.gameMode = 1;
}

/** The bail-out, `planeBail` frames in: the pursuer flies at his tail, clips it (the round is the villain's), the wreck tumbles away, and he sinks under the canopy out of the picture's bottom. */
function bailFrame(g: Game, leg: PlaneLeg) {
  const then = leg.then;
  if (then.kind !== 'bail') return;
  const t = ++g.planeBail;
  const look = g.data.planeLook;
  const viktor = 4 + then.viktor, man = g.enemies[then.viktor];
  const tail = g.x2 - 8;
  // the pursuer: from where he is (or from off the picture's left) along to Monty's tail, then up and away east
  if (man) {
    if (t === 1) g.planeFrom = g.enable & (1 << viktor) ? g.sx[viktor] ?? 0 : 0;
    const at = Math.min(1, t / then.surge);
    const x = t <= then.surge ? Math.round(g.planeFrom + (tail - g.planeFrom) * at) : tail + (t - then.surge) * 2;
    const y = t <= then.surge ? (g.y + 1) & 0xff : Math.max(0, g.y + 1 - (t - then.surge) * 2);
    g.sx[viktor] = Math.max(0, Math.min(0xff, x)); g.sy[viktor] = y & 0xff;
    g.sptr[viktor] = 0x30 + then.viktor * 8 + 4 + ((t >> 2) & 3);
    g.scol[viktor] = man.colour;
    g.enable = x < 0xd0 && y > 0x20 ? g.enable | (1 << viktor) : g.enable & ~(1 << viktor) & 0xff;
  }
  if (t === then.surge) { // the clip: his tail is gone, the round is the villain's
    g.siCollected[then.lost] = 0x81;
    g.sfx(g.data.eventSfx[0] ?? g.data.sfx.item);
  }
  // after the jolt he is out of the plane: under the canopy he sinks a pixel every other frame, the wreck tumbles down and away (planeShow draws them)
  if (t > then.surge + JOLT && t % 2 === 0) g.y = (g.y + 1) & 0xff;
  if (look && t > then.surge + JOLT) {
    const k = t - then.surge - JOLT;
    g.sx[1] = Math.min(0xff, g.x2 + look.dx + k);
    g.sy[1] = Math.min(0xff, g.y + 1 + look.dy + Math.floor((k * k) / 24));
    g.sptr[1] = look.wreck;
    g.scol[1] = look.colour;
    g.enable = g.sy[1] < 0xf8 ? g.enable | 0x02 : g.enable & 0xfd;
  }
  if (t >= then.surge + JOLT + then.drop) {
    g.mapRow = then.to.mapRow;
    g.exitCol = then.to.exitCol;
    g.y = 0x4c;
    g.gameMode = 0;
    g.roomExit = 1;
  }
}

/** Sprite 2 over Monty this frame (game.ts processSprites): the plane as he tilts it, the plane jolting at the clip, or, once he is out, the canopy. False when there is none to show. */
export function planeShow(g: Game): boolean {
  const look: PlaneLook | null = g.data.planeLook;
  const leg = planeOf(g);
  if (!look || !leg) return false;
  const bail = leg.then.kind === 'bail' ? leg.then : null;
  const out = bail !== null && g.planeBail > bail.surge + JOLT;
  if (out) {
    const canopy = g.data.canopy;
    if (!canopy) return false;
    g.sx[2] = g.sx[3]; g.sy[2] = (g.sy[3] - 19) & 0xff; g.sptr[2] = canopy.level; g.scol[2] = canopy.colour;
    return true;
  }
  const jolt = bail !== null && g.planeBail >= bail.surge ? ((g.planeBail >> 1) & 1) * 2 - 1 : 0;
  g.sx[2] = (g.sx[3] + look.dx + jolt) & 0xff;
  g.sy[2] = (g.sy[3] + look.dy) & 0xff;
  g.sptr[2] = g.planeTilt < 0 ? look.climb : g.planeTilt > 0 ? look.dive : look.level;
  g.scol[2] = look.colour;
  return true;
}
