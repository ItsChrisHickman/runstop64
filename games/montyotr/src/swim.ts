import { applyMonty } from '../../shared/monty/physics';
import { montyOver } from './cells';
import type { Game } from './game';
import type { CurrentSpec } from './montydata';

/**
 * Swimming (a game's `swimRooms`: Do Svidaniya Monty's reefs, which the snorkel opens): in a room of open water Monty moves as the jetpack flies, four ways with no
 * walking, but slower and buoyant. Sideways is his walking pace (about a pixel a frame); up or down, held, a pixel every other frame (the jetpack's thrust is a pixel
 * a frame); let go and the sea lifts him a pixel every sixth frame. He is on his own in the water (no jump, no fall), drawn in his rope pictures climbing and his walk across.
 * The edges of the room let him out as they do on land, and the room's rock and floor stop him as walls do.
 */
export const SWIM = { stroke: 2, float: 6 } as const;

/**
 * The sea's surface (the sprite's y): neither the lift nor a stroke takes him above it, so a swim room is never left upward by swimming (he came in by a dive, and arriving from above never bounces him
 * straight back). Only up a rope that hangs through the surface from the room above (Lahaina's mooring rope, the road's pool, Hana's cove: Hawaii's island hopping) does a stroke up carry him on out, onto
 * the rope there, as a climb.
 */
const FLOAT_CEILING = 0x54;
/** Where he floats up to in this room: its sea's surface (`swimSurfaces`), or the default ceiling of a room that is water to the top. */
const surfaceOf = (g: Game): number => g.data.swimSurfaces.find((s) => s.room === g.roomId)?.y ?? FLOAT_CEILING;

export function swimMove(g: Game) {
  const gate = g.data.swimGate;
  if (gate !== null && !g.siCollected[gate]) { // without the snorkel the deep water drowns him
    if (!g.actionCounter) g.actionCounter = 1;
    return;
  }
  const input = g.input;
  g.swimTick = (g.swimTick + 1) & 0xff;
  g.montyAction = 0;
  g.falling = 0;
  g.onRope = 1;
  g.arcIdx = 0;
  g.isMoving = false;
  const surge = surgeOn(g);
  g.dirLeft = surge ? surge.dx < 0 : input.left;
  g.dirRight = surge ? surge.dx > 0 : input.right;
  const stroke = g.swimTick % SWIM.stroke === 0;
  const surface = surfaceOf(g);
  const over = g.y < surface && !g.onRopeHere(); // in the air over the sea (he came in from above): he drops into it
  g.dirUp = !over && (input.up ? stroke : !input.down && g.swimTick % SWIM.float === 0) && (g.y > surface || (input.up && g.onRopeHere()));
  g.dirDown = over || (input.down && !input.up && stroke);
  g.upSteps = 1;
  g.downSteps = over ? 2 : 1;
  const facing = g.facing;
  applyMonty(g, g);
  // he faces the way his own stick takes him; a surge carrying him (or a stick held both ways, or none) keeps his facing (the move sets it from the way he is carried)
  g.facing = input.left && !input.right ? 0x81 : input.right && !input.left ? 0x01 : facing;
}

/** Whether a surge runs at `t` frames into the room's time. */
export const surgeRuns = (c: CurrentSpec, t: number): boolean => (t % c.period) >= c.start && (t % c.period) < c.start + c.length;

/** The surge of the room that carries him now, if one does (it runs and he is in its box). */
export function surgeOn(g: Game): CurrentSpec | undefined {
  return g.data.currents.find((c) => c.room === g.roomId && surgeRuns(c, g.currentTime) && montyOver(g, c.col, c.cols, c.top, c.bottom));
}

/** The room's time for its surges: a frame on (after Monty's move, as a pulse's), in a room that has one. */
export function currentsTick(g: Game) {
  if (g.data.currents.some((c) => c.room === g.roomId)) g.currentTime++;
}

/** After his frame is chosen: in a swim room whose game has swimming pictures he is drawn as a swimmer, a stroke every 8 frames while he moves and the glide when he lets go. */
export function swimPose(g: Game) {
  const pictures = g.data.swimPictures;
  if (!pictures || g.gameMode || !g.data.swimRooms.includes(g.roomId)) return;
  const set = g.facing & 0x80 ? pictures.left : pictures.right;
  const moving = g.input.left || g.input.right || g.input.up || g.input.down;
  g.frameIndex = set[moving ? (g.swimTick >> 3) % set.length : 0] ?? g.frameIndex;
}
