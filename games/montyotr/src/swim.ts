import { applyMonty } from '../../shared/monty/physics';
import type { Game } from './game';

/**
 * Swimming (a game's `swimRooms`: Do Svidaniya Monty's reefs, which the snorkel opens): in a room of open water Monty moves as the jetpack flies, four ways with no
 * walking, but slower and buoyant. Sideways is his walking pace (about a pixel a frame); up or down, held, a pixel every other frame (the jetpack's thrust is a pixel
 * a frame); let go and the sea lifts him a pixel every sixth frame. He is on his own in the water (no jump, no fall), drawn in his rope pictures climbing and his walk across.
 * The edges of the room let him out as they do on land, and the room's rock and floor stop him as walls do.
 */
export const SWIM = { stroke: 2, float: 6 } as const;

/** The sea's lift stops short of the room's top (the sprite's y): only a stroke up carries him out through a ceiling gap, so arriving from above never bounces him straight back. */
const FLOAT_CEILING = 0x54;

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
  g.dirUp = input.up ? stroke : !input.down && g.swimTick % SWIM.float === 0 && g.y > FLOAT_CEILING;
  g.dirDown = input.down && !input.up && stroke;
  g.upSteps = g.downSteps = 1;
  applyMonty(g, g);
}

/** After his frame is chosen: in a swim room whose game has swimming pictures he is drawn as a swimmer, a stroke every 8 frames while he moves and the glide when he lets go. */
export function swimPose(g: Game) {
  const pictures = g.data.swimPictures;
  if (!pictures || g.gameMode || !g.data.swimRooms.includes(g.roomId)) return;
  const set = g.facing & 0x80 ? pictures.left : pictures.right;
  const moving = g.input.left || g.input.right || g.input.up || g.input.down;
  g.frameIndex = set[moving ? (g.swimTick >> 3) % set.length : 0] ?? g.frameIndex;
}
