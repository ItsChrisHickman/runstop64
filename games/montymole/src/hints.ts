/**
 * ENHANCED's help: the coal count and the sparkles, read from the game's own state (`Game`), never written to it.
 *
 * - **Coal to the next gate** (`coalCount`): the gates open when exactly 16, 32, 48 and 64 pieces are taken (gates.ts), so the text says how many are left to the next
 *   one, in the game's own letters; once all four have counted there is nothing to say and nothing is shown.
 * - **Sparkles** (`hintsOf`, c64kit's stardust over the picture, as Moley Christmas's hints.ts): on the coal that opens a gate and on the tool a room lies about with.
 *   A gate opens only if the piece that makes its count is taken in the gate's own room (elsewhere the gate is marked done and stays shut for good), so the opener is
 *   marked only in that room and only when that piece is the one needed (the count says one is left): the pieces of any other room are not marked then, because taking
 *   one there would shut the gate for good. Every room's object is a tool (a carried one lets one touch of a creature kill the creature, not Monty), marked
 *   while it lies there and he carries none.
 */
import { nextGate } from './gates';
import { ROOMS } from './data/rooms-data';
import { STILL_THERE } from './coal';
import { ENDING_ROOM, OPENING_ROOM, type Game } from './game';
import { Flag } from './monty';

/** What a sparkle marks. */
export type HintKind = 'opener' | 'tool';

/** A place to sparkle: the middle of the thing, in the Spectrum's picture (256 x 192) pixels. */
export interface Hint {
  readonly kind: HintKind;
  readonly x: number;
  readonly y: number;
}

/** Whether the game is in a room with things in it (not the opening scene, the ending or a game over). */
function inRoom(game: Game): boolean {
  return game.outcome === 'playing' && game.room !== OPENING_ROOM && game.room < ENDING_ROOM;
}

/** How many pieces are left to the next gate, or null when there is no next gate or the game is not in a room. */
export function piecesToGate(game: Game): number | null {
  if (!inRoom(game)) return null;
  const gate = nextGate(game.coal.taken);
  return gate === null ? null : gate.count - game.coal.taken;
}

/** The count's text (the game's font has letters, digits and the colon), or null for none. */
export function coalCount(game: Game): string | null {
  const left = piecesToGate(game);
  return left === null ? null : `COAL TO GATE: ${left}`;
}

/** The sparkles for the game as it is after a pass. */
export function hintsOf(game: Game): Hint[] {
  if (!inRoom(game)) return [];
  const out: Hint[] = [];
  const gate = nextGate(game.coal.taken);
  if (gate !== null && gate.room === game.room && gate.count - game.coal.taken === 1) {
    for (const piece of ROOMS[game.room]?.coal ?? []) {
      if ((piece.col === 0 && piece.row === 0) || ((game.coal.flags[piece.id] ?? 0) & STILL_THERE) === 0) continue;
      out.push({ kind: 'opener', x: piece.col * 8 + 4, y: piece.row * 8 + 4 });
    }
  }
  const o = game.object;
  if (o.frame !== 0 && (game.monty.flags & Flag.tool) === 0) out.push({ kind: 'tool', x: o.x + 8, y: 191 - o.y + 8 });
  return out;
}
