import { applyMonty } from '../../shared/monty/physics';
import { montyOver } from './cells';
import type { Game } from './game';
import type { FlightSpec } from './montydata';

/**
 * Flight (a game's `flights`: Do Svidaniya Monty's parachute drop into the Andes, Monty on the Run's jetpack redeemed): in a flight room Monty hangs under an open canopy and flies as the jetpack
 * does, four ways with no walking and no jump, but slowly. Held down, he falls a pixel a frame (a quick dive); let go and the canopy lets him sink a pixel every other frame (a cell in 16 frames: a room's
 * height in 320, about six seconds). Sideways is his walking pace. Up he cannot go by himself: an updraft (a column of the room the data names) lifts him a pixel a frame while he is in it.
 * The room's solid tiles stop him as they do on foot, so he rests on a ledge, walks off its end and the canopy takes him again; leaving a room by its edges is as everywhere (the floor's gap, the
 * way on at the side). He is drawn in his rope pictures with the canopy over him (a sprite, `canopyPlace`).
 */
export const FLIGHT = { sink: 2 } as const;

/** The flight of a room, if it is one. */
export const flightOf = (g: Game): FlightSpec | undefined => g.data.flights.find((f) => f.room === g.roomId);

/** Whether Monty is in an updraft of the room now. */
export function inUpdraft(g: Game, spec: FlightSpec): boolean {
  return spec.updrafts.some((u) => montyOver(g, u.col, u.cols, u.top, u.bottom ?? 19));
}

/** One frame of his flight: the sink or the dive, the lift, the steering. */
export function flightMove(g: Game, spec: FlightSpec) {
  const input = g.input;
  g.flightTick = (g.flightTick + 1) & 0xff;
  g.montyAction = 0;
  g.falling = 0;
  g.onRope = 1;
  g.arcIdx = 0;
  g.isMoving = false;
  g.dirLeft = input.left;
  g.dirRight = input.right;
  const lifted = inUpdraft(g, spec) && !input.down;
  g.dirUp = lifted;
  g.dirDown = input.down || (!lifted && g.flightTick % FLIGHT.sink === 0);
  g.upSteps = g.downSteps = 1;
  const y = g.y;
  applyMonty(g, g);
  if (g.dirDown || lifted) g.flightResting = g.dirDown && !lifted && g.y === y;
  if (g.flightResting) g.onRope = 0; // resting on a ledge the canopy is folded and he stands on his feet (his pictures are the rope's while it is open)
}

/** The canopy's picture for the way he steers. */
export function canopyFrame(g: Game): number {
  const look = g.data.canopy;
  if (!look) return 0;
  return g.input.left && !g.input.right ? look.left : g.input.right && !g.input.left ? look.right : look.level;
}
