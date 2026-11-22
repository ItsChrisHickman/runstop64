import { applyMonty } from '../../shared/monty/physics';
import type { Game } from './game';

/**
 * Swimming (a game's `swimRooms`: Do Svidaniya Monty's reefs, which the snorkel opens): in a room of open water Monty moves as the jetpack flies, four ways with no
 * walking, but slower and buoyant. Sideways is his walking pace (about a pixel a frame); up or down, held, a pixel every other frame (the jetpack's thrust is a pixel
 * a frame); let go and the sea lifts him a pixel every sixth frame. He is on his own in the water (no jump, no fall), drawn in his rope pictures climbing and his walk across.
 * The edges of the room let him out as they do on land, and the room's rock and floor stop him as walls do.
 */
export const SWIM = { stroke: 2, float: 6 } as const;

export function swimMove(g: Game) {
  const input = g.input;
  g.swimTick = (g.swimTick + 1) & 0xff;
  g.montyAction = 0;
  g.falling = 0;
  g.onRope = 1;
  g.arcIdx = 0;
  g.isMoving = false;
  g.dirLeft = input.left;
  g.dirRight = input.right;
  const stroke = g.swimTick % SWIM.stroke === 0;
  g.dirUp = input.up ? stroke : !input.down && g.swimTick % SWIM.float === 0;
  g.dirDown = input.down && !input.up && stroke;
  g.upSteps = g.downSteps = 1;
  applyMonty(g, g);
}
