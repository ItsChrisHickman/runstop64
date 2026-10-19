import { copyState } from '../../shared/test/copy-state';
import { Game } from '../src/game';

/**
 * A game put into the state of another (between logic steps): what goes on from it is what would go on from the other. The
 * route finder copies a game to search ahead of it (games/shared/test/copy-state.ts: the game's small objects, Monty, the
 * enemies, the lift, the items and the counters, field by field into a fresh game of the same room).
 */
export function copyGame(src: Game): Game {
  const g = new Game(src.world.room);
  // (the sound log is nobody's here; the grace and the safe start are the rules the search runs by)
  copyState(g, src, new Set(['sound']));
  g.graceActive = src.graceActive;
  g.safeRespawn = src.safeRespawn;
  return g;
}
