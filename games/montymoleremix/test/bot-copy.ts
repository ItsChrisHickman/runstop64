import { getProp, isArray } from '../../shared/guards';
import type { RemixGame } from '../src/game';
import { RemixGame as Game } from '../src/game';
import type { Play } from './harness';

/**
 * A game put into the state of another (between frames, no scripted sequence running), for a search that tries ahead on copies: every
 * field of the source is copied into the same field of the target, arrays and typed arrays in place, objects field by field. What
 * belongs to whoever runs the game (its sound, the hooks, the running sequence) stays as it is; the room's tiles (`room`: never
 * changed, only replaced when a room is loaded) are shared.
 */
const THEIRS = new Set(['sound', 'onRoomLoaded', 'graceActive', 'script']);
const SHARED = new Set(['room']);

type Typed = Uint8Array | Int8Array | Int16Array;
const isTyped = (v: unknown): v is Typed => v instanceof Uint8Array || v instanceof Int8Array || v instanceof Int16Array;

function copyOf(dst: unknown, src: unknown): unknown {
  if (typeof src === 'function') return dst;
  if (typeof src !== 'object' || src === null) return src;
  if (isTyped(src)) {
    if (isTyped(dst) && dst.length === src.length && dst.constructor === src.constructor) { dst.set(src); return dst; }
    return src.slice();
  }
  if (isArray(src)) {
    const out: unknown[] = isArray(dst) ? dst : [];
    out.length = src.length;
    src.forEach((v, i) => { out[i] = copyOf(out[i], v); });
    return out;
  }
  const same = typeof dst === 'object' && dst !== null && dst.constructor === src.constructor;
  if (!same && src.constructor !== Object) throw new Error('a class instance with no counterpart to copy into');
  const target: object = same && dst !== null && typeof dst === 'object' ? dst : {};
  for (const k of Object.keys(src)) Reflect.set(target, k, copyOf(getProp(target, k), getProp(src, k)));
  return target;
}

/** `dst` in the state of `src`. */
export function copyInto(dst: RemixGame, src: RemixGame): RemixGame {
  for (const k of Object.keys(src)) {
    if (THEIRS.has(k)) continue;
    if (SHARED.has(k)) { Reflect.set(dst, k, getProp(src, k)); continue; }
    Reflect.set(dst, k, copyOf(getProp(dst, k), getProp(src, k)));
  }
  dst.script = null;
  return dst;
}

/** A copy of a play (a game and its last frame's collisions): `RemixGame.copyFrom`, which is quick (`copyInto` above is the slow way that checks it, test/game.ts). */
export function copyPlay(src: Play, into?: Play): Play {
  const g = into?.g ?? new Game();
  g.copyFrom(src.g);
  g.assist = src.g.assist;
  g.graceActive = src.g.graceActive;
  if (into !== undefined) { into.col = src.col; return into; }
  return { g, col: src.col };
}
