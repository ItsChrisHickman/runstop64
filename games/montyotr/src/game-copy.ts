import { getProp } from '../../shared/guards';
import { Game } from './game';

/**
 * A game put into the state of another (between frames, with no scripted sequence running): what goes on from it is
 * what would go on from the other. What belongs to whoever runs the game (its sound, the hook on a room loading, the
 * grace, what stirs its random numbers, the running sequence) stays as it is. The ending's montage puts its one game back to a new game's state before
 * each place (so a place plays the same whatever came before it), and the tests copy a game to search ahead of it.
 */
const THEIRS = new Set(['data', 'vic', 'mem', 'col', 'sound', 'assist', 'onRoomLoaded', 'graceActive', 'entropy', 'onRestart', 'script']);

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
  const g = copyInto(new Game(src.data), src);
  g.assist = { ...src.assist };
  return g;
}

/**
 * A game put away by a search to go on from later: its fields as they are (taken over, not cloned: the game it was frozen
 * from must not be played again), each one the parent's own object where the two are the same. Measured 2026-11-27 on a
 * 200,000-node search: a live copy per node was about 29 KB (20 KB the VIC bank and colour RAM, the parent's bytes in 300 of
 * 300 steps), and typed arrays live outside the heap limit, so a search could grow past `--max-old-space-size` into the box's
 * memory cap. The field names are one list shared down the line (`keys`), the values a plain array beside it.
 */
export interface FrozenGame {
  readonly data: Game['data'];
  readonly keys: readonly string[];
  readonly own: readonly unknown[];
  readonly vicKeys: readonly string[];
  readonly vic: readonly unknown[];
  readonly bank: Uint8Array;
  readonly colour: Uint8Array;
  readonly assist: Game['assist'];
}

/** Whether two byte arrays hold the same bytes. */
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Whether two values of a game's plain data (numbers, strings, arrays, byte arrays, plain objects) are the same. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (a instanceof Uint8Array && b instanceof Uint8Array) return sameBytes(a, b);
  if (ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) return false; // (other typed arrays: not shared, kept as they are)
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!sameValue(getProp(a, k), getProp(b, k))) return false;
  return true;
}

const sameKeys = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((k, i) => k === b[i]);

/** The values of `obj`'s `keys`, each one `like`'s object where the two are the same (`like` read by the same keys). */
function valuesOf(obj: object, keys: readonly string[], like: readonly unknown[] | undefined): unknown[] {
  return keys.map((k, i) => {
    const v = getProp(obj, k);
    return like && sameValue(like[i], v) ? like[i] : v;
  });
}

/** `g` put away (see FrozenGame), sharing with `like` (its parent) whatever is the same. `g` is not to be played again. */
export function freezeGame(g: Game, like?: FrozenGame): FrozenGame {
  const ownNow = Object.keys(g).filter((k) => !THEIRS.has(k)), vicNow = Object.keys(g.vic).filter((k) => k !== 'bank' && k !== 'colour');
  const keys = like && sameKeys(like.keys, ownNow) ? like.keys : ownNow;
  const vicKeys = like && sameKeys(like.vicKeys, vicNow) ? like.vicKeys : vicNow;
  const own = valuesOf(g, keys, keys === like?.keys ? like.own : undefined);
  const vic = valuesOf(g.vic, vicKeys, vicKeys === like?.vicKeys ? like.vic : undefined);
  const bank = like && sameBytes(like.bank, g.vic.bank) ? like.bank : g.vic.bank;
  const colour = like && sameBytes(like.colour, g.vic.colour) ? like.colour : g.vic.colour;
  return { data: g.data, keys, own, vicKeys, vic, bank, colour, assist: { ...g.assist } };
}

/** Whether a game frozen as `f` can be thawed into again: its bank and colour RAM are not the frozen game's. */
export const reusable = (g: Game, f: FrozenGame): boolean => f.bank !== g.vic.bank && f.colour !== g.vic.colour;

/** A live game from a frozen one (a copy: the frozen game can be thawed again), in `into` if given (a game no longer needed, so a search makes no garbage of typed arrays: they live outside the heap limit and the collector is slow to free them). */
export function thawGame(f: FrozenGame, into?: Game): Game {
  const g = into ?? new Game(f.data);
  f.keys.forEach((k, i) => Reflect.set(g, k, structuredClone(f.own[i])));
  g.script = null;
  g.vic.bank.set(f.bank);
  g.vic.colour.set(f.colour);
  f.vicKeys.forEach((k, i) => Reflect.set(g.vic, k, structuredClone(f.vic[i])));
  g.assist = { ...f.assist };
  return g;
}
