/**
 * ENHANCED's help: the coal count and the sparkles, read from the game's own state (`RemixGame`), never written to it (the count is put in
 * the row under the room, which is empty, by `RemixGame.note`).
 *
 * - **Coal to the next gate** (`coalCount`): the gates open when 16, 32, 48 and 64 pieces are taken (here wherever he is: the original's trap is
 *   gone), so the text says how many are left to the next one; once all four have counted there is nothing to say.
 * - **Sparkles** (`hintsOf`, c64kit's stardust over the picture): on the room's tool while it lies there and he carries none: the tool is what
 *   lets one touch of a creature kill the creature, not Monty. Once he carries it the sparkle is on the creature the tool is for (`TOOL_TARGET`),
 *   following it, until the tool is spent.
 */
import { nextGate } from '../../montymole/src/gates';
import { vicX, vicY } from './coords';
import { CREATURE_SPRITE, type RemixGame } from './game';

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

/**
 * The creature (record slot 0-5) each room's tool is for, by room id: the one that bars the room's way, which the tool takes. Found by the
 * passability bot, not by eye (`nice -n 15 node tools/test.mjs games/montymoleremix/test/tool-target.ts derive`; checked by `... check lo hi`, slow
 * set): for each goal of the room (every exit, every piece of coal) the bot searches without the tool and, where it does not meet the goal, with
 * the tool taken first; the creature that route destroys is the one. Rooms with a tool and no entry have no goal that needs it.
 *
 * - room 7 (slot 1) opens three goals (coal 16, 17 and the way up; slot 0 only coal 19)
 * - room 11 (slot 0, the fish at the top left, not the candle (slot 1) that walks below it): the way up
 * - room 17 (slot 0): the way right
 * - room 18 (slot 5): the way up
 */
export const TOOL_TARGET: Readonly<Record<number, number>> = { 7: 1, 11: 0, 17: 0, 18: 5 };

/** The middle of the opaque pixels of a hires sprite the VIC shows (24 x 21 bits at its pointer), on the surface; null where it is not shown or empty. */
function spriteMiddle(g: RemixGame, n: number): Hint | null {
  const r = g.vic.sprites[n];
  if (r === undefined || (g.vic.enable & (1 << n)) === 0) return null;
  const at = (r.ptr & 0xff) * 64;
  let x0 = 24, x1 = -1, y0 = 21, y1 = -1;
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 24; x++) {
      if (((g.mem[at + y * 3 + (x >> 3)] ?? 0) & (0x80 >> (x & 7))) === 0) continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  }
  if (x1 < 0) return null;
  return { x: Math.round((r.x >= 504 ? r.x - 504 : r.x) - SURFACE_X + (x0 + x1 + 1) / 2), y: Math.round(r.y - SURFACE_Y + (y0 + y1 + 1) / 2) };
}

/**
 * The sparkles for the game as it is: on the tool while it lies there; once he carries it, on the creature it is for (`TOOL_TARGET`: the one
 * that bars the room's way) while that one is alive and shown, wherever it goes; none once the tool is spent or where the room has no target.
 */
export function hintsOf(g: RemixGame): Hint[] {
  if (g.tool !== null && !g.carrying) return [{ x: vicX(g.tool.x) + 8 - SURFACE_X, y: vicY(g.tool.y) + 8 - SURFACE_Y }];
  const slot = TOOL_TARGET[g.roomId];
  const sprite = slot === undefined ? undefined : CREATURE_SPRITE[slot];
  if (!g.carrying || sprite === undefined) return [];
  const at = spriteMiddle(g, sprite);
  return at === null ? [] : [at];
}
