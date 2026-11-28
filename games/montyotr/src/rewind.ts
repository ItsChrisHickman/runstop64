import type { Game } from './game';
import { wear } from './items';

/**
 * A death puts back what Monty took in the room he died in (ours, both modes, with the safe respawn: Chris, 2026-11-27, "getting
 * an item and dying shouldn't count"): the coins, the finds (items, snacks, what a lever or an escape set), the score they gave
 * and the costume, as they were when he came into the room. The room then loads again as it does for any death, so it is as he
 * found it, and the save taken as it loads (session.ts `onRoomLoaded`) is of that, never of a find the death gave back. What is
 * only seen, not taken (a cameo that plays once in the game), stays seen.
 */
export interface TakenAtEntry {
  readonly coins: Uint8Array;
  readonly items: Uint8Array;
  readonly score: number;
  readonly hiScore: number;
  readonly worn: number | null;
}

/** What he has taken so far, as it stands. */
export function takenNow(g: Game): TakenAtEntry {
  return { coins: g.coinCollected.slice(), items: g.siCollected.slice(), score: g.score, hiScore: g.hiScore, worn: g.worn };
}

/** A room has loaded with him in it: what he had then is what a death in it puts back. */
export function noteEntry(g: Game) {
  g.takenAtEntry = takenNow(g);
}

/** A death in the room: back to what he had when he came in (a cameo seen stays seen). */
export function rewindTaken(g: Game) {
  const was = g.takenAtEntry;
  const seen = g.data.cameos.flatMap((c) => (c.once === undefined ? [] : [[c.once, g.siCollected[c.once] ?? 0] as const]));
  g.coinCollected.set(was.coins);
  g.siCollected.set(was.items);
  for (const [i, v] of seen) g.siCollected[i] = v;
  g.score = was.score;
  g.hiScore = was.hiScore;
  if (g.worn !== was.worn) wear(g, was.worn);
}
