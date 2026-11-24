/**
 * A Monty game's state written out and read back, for the legs kit (legs.ts): the state at the start of each leg is kept so a run that is
 * about a few rooms starts its first leg there instead of replaying the region. The same fields `copyGame` copies (game-copy.ts), in the
 * structured clone algorithm's bytes (node:v8), so a state read back is the state a copy would be.
 *
 * The states are a cache, not a record: they live outside the repo (`os.tmpdir()/runstop64-leg-states`, shared by every worktree), each with
 * the fingerprints of what made it (attribute.ts `Prints`), and one whose fingerprints no longer match is not used (the leg is reached by replaying
 * the recorded routes before it instead). `--record` and every complete run write them.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import v8 from 'node:v8';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { Game } from '../../../montyotr/src/game';
import { copyGame } from '../../../montyotr/src/game-copy';
import type { State } from '../../../montyotr/test/play';
import { getProp, isArray, isArrayOf, isNumber, isNumbers, isRecord, isRecordOf, isString } from '../../guards';

/** What belongs to the game's data and the VIC (the bank and colour RAM go with the VIC), and what is runner-owned: not written. */
const NOT_STATE = new Set(['data', 'vic', 'mem', 'col']);

/** The fields of an object the structured clone can write (a function, the runner's hooks, is not state). */
function fieldsOf(obj: object, skip: ReadonlySet<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (skip.has(k)) continue;
    const v = getProp(obj, k);
    if (typeof v === 'function') continue;
    try { v8.serialize(v); } catch { continue; } // (an object holding a hook: the runner's, as `copyInto` leaves them)
    out[k] = v;
  }
  return out;
}

/** A state's bytes. */
export function freeze(s: State): Uint8Array {
  return v8.serialize({ game: fieldsOf(s.g, NOT_STATE), vic: fieldsOf(s.g.vic, new Set()), col: s.col });
}

/** A state from its bytes, on a game of `data`. */
export function thaw(data: Game['data'], bytes: Uint8Array): State {
  const v = v8.deserialize(bytes);
  if (!isRecord(v) || !isRecord(v.game) || !isRecord(v.vic) || !isNumber(v.col)) throw new Error('not a written Monty state');
  const src = new Game(data);
  for (const [k, value] of Object.entries(v.game)) Reflect.set(src, k, value);
  for (const [k, value] of Object.entries(v.vic)) Reflect.set(src.vic, k, value);
  // (copyGame puts it into a fresh game the way a copy is made: the bank and colour RAM into the VIC's own, the runner's parts left)
  return { g: copyGame(src), col: v.col };
}

/**
 * A state's fingerprint: the same fields `freeze` writes, hashed in a canonical form (typed arrays as their bytes, lists item by item, objects by sorted
 * key). Not `digest(freeze(s))`: the structured clone's bytes for one value differ with how V8 happens to hold it (an empty list written dense or sparse
 * after the engine has run a while), so the same state could hash two ways.
 */
export function statePrint(s: State): string {
  const h = crypto.createHash('sha1');
  const seen = new Map<object, number>();
  const walk = (v: unknown): void => {
    if (v === null || v === undefined || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') { h.update(`${typeof v}:${String(v)};`); return; }
    if (typeof v === 'string') { h.update(`s${v.length}:`); h.update(v); return; }
    if (typeof v !== 'object') return; // (a function: not state, as `freeze` leaves it)
    const at = seen.get(v);
    if (at !== undefined) { h.update(`@${at};`); return; }
    seen.set(v, seen.size);
    if (ArrayBuffer.isView(v)) { h.update(`b${v.constructor.name}${v.byteLength}:`); h.update(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)); return; }
    if (isArray(v)) { h.update(`[${v.length}:`); for (const x of v) walk(x); h.update(']'); return; }
    if (v instanceof Map) { h.update(`M${v.size}:`); for (const [k, x] of v) { walk(k); walk(x); } return; }
    if (v instanceof Set) { h.update(`S${v.size}:`); for (const x of v) walk(x); return; }
    h.update('{');
    for (const k of Object.keys(v).sort()) { h.update(`${k}=`); walk(getProp(v, k)); }
    h.update('}');
  };
  walk({ game: fieldsOf(s.g, NOT_STATE), vic: fieldsOf(s.g.vic, new Set()), col: s.col });
  return h.digest('hex').slice(0, 16);
}

/** A short hash of bytes or text. */
export function digest(data: Uint8Array | string): string {
  return crypto.createHash('sha1').update(data).digest('hex').slice(0, 16);
}

/** The state at a leg's start, kept: the leg, the state's hash (`statePrint`) and bytes, and what the leg then did (the rooms its route went through, the route's hash). */
export interface KeptState { leg: string; hash: string; rooms: number[]; route: string; bytes: Uint8Array }
/** A region's kept states in a mode: the fingerprints they were made with, one a leg (and one after the last). */
export interface KeptStates { rest: string; rooms: Readonly<Record<string, string>>; states: readonly KeptState[] }

const isKept = (v: unknown): v is KeptState => isRecord(v) && isString(v.leg) && isString(v.hash) && isNumbers(v.rooms) && isString(v.route) && v.bytes instanceof Uint8Array;

const dir = () => path.join(os.tmpdir(), 'runstop64-leg-states');
const fileOf = (game: string, region: string, mode: string) => path.join(dir(), `${game}-${region}-${mode}.bin`);

/** The kept states of a region in a mode (none if there are none). */
export function readKept(game: string, region: string, mode: string): KeptStates | null {
  const file = fileOf(game, region, mode);
  if (!fs.existsSync(file)) return null;
  try {
    const v = v8.deserialize(zlib.gunzipSync(fs.readFileSync(file)));
    if (!isRecord(v) || !isString(v.rest) || !isRecordOf(v.rooms, isString) || !isArrayOf(v.states, isKept)) return null;
    return { rest: v.rest, rooms: v.rooms, states: v.states };
  } catch { return null; } // (a cache: one that cannot be read is rebuilt)
}

/** Keep a region's states (written aside and moved into place: another run may be reading). */
export function writeKept(game: string, region: string, mode: string, kept: KeptStates): void {
  fs.mkdirSync(dir(), { recursive: true });
  const file = fileOf(game, region, mode), tmp = `${file}.${process.pid}`;
  fs.writeFileSync(tmp, zlib.gzipSync(v8.serialize(kept)));
  fs.renameSync(tmp, file);
}
