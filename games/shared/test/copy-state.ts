import { getProp, isArray } from '../guards';

/**
 * The state of one object put into another of the same make (the route finders of the endings copy a game to search ahead of it):
 * what each field holds is copied, field by field, into the object's own parts. What both share (the tables a game reads its rooms
 * and graphics from: the same objects in both) and functions (the hooks a front end sets) stay as they are; `theirs` are
 * fields left alone (a game's sound log). A part the copy has none of (a field that is null there) is a copy of it.
 */
export function copyState(dst: object, src: object, theirs: ReadonlySet<string> = new Set()): void {
  copyInto(dst, src, theirs, new Set());
}

function copyInto(dst: object, src: object, theirs: ReadonlySet<string>, seen: Set<object>): void {
  seen.add(src);
  for (const key of Object.keys(src)) {
    if (theirs.has(key)) continue;
    const from = getProp(src, key), to = getProp(dst, key);
    if (typeof from === 'function' || from === to) continue;
    if (ArrayBuffer.isView(from) && ArrayBuffer.isView(to) && from.constructor === to.constructor && from.byteLength === to.byteLength) {
      new Uint8Array(to.buffer, to.byteOffset, to.byteLength).set(new Uint8Array(from.buffer, from.byteOffset, from.byteLength));
      continue;
    }
    if (typeof from === 'object' && from !== null && !ArrayBuffer.isView(from)) {
      if (seen.has(from)) continue;
      if (typeof to === 'object' && to !== null && !(isArray(from) && (!isArray(to) || from.length !== to.length))) { copyInto(to, from, theirs, seen); continue; }
      Reflect.set(dst, key, structuredClone(from));
      continue;
    }
    Reflect.set(dst, key, from);
  }
}
