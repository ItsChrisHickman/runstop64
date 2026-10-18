import { getProp } from '../../shared/guards';
import { Game } from './game';

/**
 * A game put into the state of another (between frames, with no scripted sequence running): what goes on from it is
 * what would go on from the other. What belongs to whoever runs the game (its sound, the hook on a room loading, the
 * grace, the running sequence) stays as it is. The ending's montage puts its one game back to a new game's state before
 * each place (so a place plays the same whatever came before it), and the tests copy a game to search ahead of it.
 */
const THEIRS = new Set(['vic', 'mem', 'col', 'sound', 'assist', 'onRoomLoaded', 'graceActive', 'script']);

export function copyInto(dst: Game, src: Game): Game {
  for (const k of Object.keys(src)) {
    if (THEIRS.has(k)) continue;
    Reflect.set(dst, k, structuredClone(getProp(src, k)));
  }
  dst.script = null;
  dst.vic.bank.set(src.vic.bank);
  dst.vic.colour.set(src.vic.colour);
  for (const k of Object.keys(src.vic)) {
    if (k === 'bank' || k === 'colour') continue;
    Reflect.set(dst.vic, k, structuredClone(getProp(src.vic, k)));
  }
  return dst;
}

/** A copy of a game. */
export function copyGame(src: Game): Game {
  const g = copyInto(new Game(), src);
  g.assist = { ...src.assist };
  return g;
}
