import { isNumbers, isRecord, readJson, getProp } from '../../shared/guards';
import type { Game } from './game';

/**
 * Saves: the whole game as it was at a room's start (before it's drawn), as
 * bytes: the fields as JSON, then the screen memory (the VIC's 16K, the cell
 * attributes, the cell table at $0400). Resuming draws the room from there,
 * exactly as the game did.
 */
const SKIP = new Set(['scr', 'sound', 'lo', 'roomStartSave']);

export function snapshot(g: Game): Uint8Array {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(g)) {
    if (SKIP.has(k) || typeof v === 'function') continue;
    fields[k] = plain(v);
  }
  const json = new TextEncoder().encode(JSON.stringify(fields));
  const out = new Uint8Array(4 + json.length + 0x4000 + 0x400 + 0x400);
  new DataView(out.buffer).setUint32(0, json.length, true);
  let o = 4;
  out.set(json, o); o += json.length;
  out.set(g.scr.bank, o); o += 0x4000;
  out.set(g.scr.attr, o); o += 0x400;
  out.set(g.lo, o);
  return out;
}

export function restore(g: Game, b: Uint8Array) {
  const n = new DataView(b.buffer, b.byteOffset).getUint32(0, true);
  const fields: unknown = readJson(new TextDecoder().decode(b.subarray(4, 4 + n)));
  if (!isRecord(fields)) throw new Error('not a Starquake save');
  for (const [k, v] of Object.entries(fields)) put(g, k, v);
  let o = 4 + n;
  g.scr.bank.set(b.subarray(o, o + 0x4000)); o += 0x4000;
  g.scr.attr.set(b.subarray(o, o + 0x400)); o += 0x400;
  g.lo.set(b.subarray(o, o + 0x400));
}

type NumberArray = Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | Float32Array | Float64Array;
const isNumberArray = (v: unknown): v is NumberArray =>
  v instanceof Uint8Array || v instanceof Uint16Array || v instanceof Uint32Array || v instanceof Int8Array ||
  v instanceof Int16Array || v instanceof Int32Array || v instanceof Float32Array || v instanceof Float64Array;

/** Typed arrays as plain arrays; objects and arrays deeply. */
function plain(v: unknown): unknown {
  if (isNumberArray(v)) return Array.from(v);
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
}

/**
 * Put a saved value back into the live object (keeping typed arrays and nested objects in place).
 * The game's fields are set by name, as they were saved (Reflect: the object's own keys).
 */
function put(target: object, k: string, v: unknown) {
  const cur = getProp(target, k);
  if (isNumberArray(cur)) {
    if (!isNumbers(v)) throw new Error(`Starquake save: ${k} isn't numbers`);
    cur.set(v);
  } else if (Array.isArray(cur) && Array.isArray(v) && cur.every((x) => typeof x === 'number')) cur.splice(0, cur.length, ...v);
  else if (cur && typeof cur === 'object' && v && typeof v === 'object' && !Array.isArray(cur)) {
    for (const [kk, vv] of Object.entries(v)) put(cur, kk, vv);
  } else Reflect.set(target, k, v);
}

/**
 * A save described for the save manager (ContinueFlow `describe`), from its fields: which half of
 * the planet BLOB is in (the map's pages), his lives, the core pieces still missing, the score.
 */
export function describeSave(b: Uint8Array): string[] {
  const n = new DataView(b.buffer, b.byteOffset).getUint32(0, true);
  const f: unknown = readJson(new TextDecoder().decode(b.subarray(4, 4 + n)));
  if (!isRecord(f)) return [];
  const digits = (v: unknown) => (isNumbers(v) ? Number(v.join('')) : 0);
  const room = typeof f.room === 'number' ? f.room : 0;
  const missing = typeof f.coreMissing === 'number' ? f.coreMissing : 0;
  return [room >> 8 ? 'THE DEPTHS' : 'THE SURFACE', `LIVES ${digits(f.lives)}`, `CORE ${missing} MISSING`, `SCORE ${digits(f.score)}`];
}
