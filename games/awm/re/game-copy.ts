import { getProp, isArray } from '../../shared/guards';
import { Game } from '../src/game';

/**
 * A game put into the state of another (between logic steps): what goes on from it is what would go on from the other. The
 * route finder copies a game to search ahead of it. What the game holds is plain data in a few small objects (Monty, the
 * enemies, the lift, the items, the counters), copied field by field into a game of the same room; the tables they share
 * (rooms, graphics) are the same objects in both and stay as they are, and so do functions (the hooks the front end sets).
 */
const THEIRS = new Set(['sound']);

function copyInto(dst: object, src: object, seen: Set<object>): void {
  seen.add(src);
  for (const key of Object.keys(src)) {
    if (THEIRS.has(key)) continue;
    const from = getProp(src, key), to = getProp(dst, key);
    if (typeof from === 'function' || from === to) continue;
    if (from instanceof Uint8Array && to instanceof Uint8Array && from.length === to.length) { to.set(from); continue; }
    if (typeof from === 'object' && from !== null && typeof to === 'object' && to !== null && !(from instanceof Uint8Array)) {
      if (seen.has(from)) continue;
      if (isArray(from) && (!isArray(to) || from.length !== to.length)) { Reflect.set(dst, key, structuredClone(from)); continue; }
      copyInto(to, from, seen);
      continue;
    }
    Reflect.set(dst, key, from);
  }
}

/** A copy of a game, made in its room (a fresh game of that room is what is copied into: the hooks are the fresh one's, but the grace and the safe start). */
export function copyGame(src: Game): Game {
  const g = new Game(src.world.room);
  copyInto(g, src, new Set());
  g.graceActive = src.graceActive;
  g.safeRespawn = src.safeRespawn;
  return g;
}
