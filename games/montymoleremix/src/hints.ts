/**
 * ENHANCED's help: the coal count and the sparkles, read from the game's own state (`RemixGame`), never written to it (the count is put in
 * the row under the room, which is empty, by `RemixGame.note`).
 *
 * - **Coal to the next gate** (`coalCount`): the gates open when 16, 32, 48 and 64 pieces are taken (here wherever he is: the original's trap is
 *   gone), so the text says how many are left to the next one; once all four have counted there is nothing to say.
 * - **Sparkles** (`hintsOf`, c64kit's stardust over the picture): on the room's tool while it lies there and he carries none: the tool is what
 *   lets one touch of a creature kill the creature, not Monty.
 */
import { nextGate } from '../../montymole/src/gates';
import { vicX, vicY } from './coords';
import type { RemixGame } from './game';

/** A place to sparkle: the middle of the thing, in the picture's own pixels (the 320 x 200 surface). */
export interface Hint { readonly x: number; readonly y: number }

/** How many pieces are left to the next gate, or null when there is no next gate. */
export function piecesToGate(g: RemixGame): number | null {
  const gate = nextGate(g.coal.taken);
  return gate === null ? null : gate.count - g.coal.taken;
}

/** The count's text (the game's letters), or null for none. */
export function coalCount(g: RemixGame): string | null {
  const left = piecesToGate(g);
  return left === null ? null : `COAL TO GATE: ${left}`;
}

/** Where a sprite's top left is on the surface, from the VIC's registers: the VIC's x is 24 on, its y 50 down. */
const SURFACE_X = 24, SURFACE_Y = 50;

/** The sparkles for the game as it is. */
export function hintsOf(g: RemixGame): Hint[] {
  if (g.tool === null || g.carrying) return [];
  return [{ x: vicX(g.tool.x) + 8 - SURFACE_X, y: vicY(g.tool.y) + 8 - SURFACE_Y }];
}
