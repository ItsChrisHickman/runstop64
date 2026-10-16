import { isRecord, readJson, S } from './guards';

/**
 * Where every game's saves are kept (the browser's localStorage), for the games (through
 * ContinueFlow and FrontEnd) and for the save manager outside them (games/saves.ts). One
 * typed, versioned module: everything read back is checked; nothing else touches these keys.
 *
 * Each game keeps a small history, so nothing is lost by accident:
 *
 * - `current`: the autosave the game continues from (written on entering each room);
 * - `previous`: the save as it stood when a new game began (the new game's saves go into
 *   `current`), with what had been found then (the map's progress). An accidental new game
 *   can be undone: the save manager swaps the two.
 *
 * A new game that never got past its first room isn't worth keeping over an older save:
 * starting another new game then replaces it rather than pushing the older save out.
 *
 * Keys (per game id): `<id>.save.v2` (current), `<id>.save.v2.previous`, and `<id>.found.v1`
 * (what has been found in the game being played, which FrontEnd keeps up to date). Saves from
 * before the history (`<id>.save.v1`, the bytes alone) become `current` on first read.
 *
 * Every save sits in an envelope that says what it is: the game (`game`), the format of its bytes
 * (`format`, a number its codec bumps whenever the bytes change; `unpack` is given it, so it can
 * read or migrate an older format and refuse a newer one instead of guessing) and, for a machine
 * save, which game image it was made on (`image`). A slot is stored as JSON with `v` (the
 * envelope's own version): 3 has `game`, `format` and `image`; 2, what every save made before the
 * envelope looks like, reads as `format` 1 of this game (the bytes were never changed), and is
 * written as 3 the next time it's written. The key names keep their `v2`: they are where players'
 * saves already are.
 */
export type Found = Record<string, unknown>;
// (Found is what is kept: a record of plain JSON. A game's map reads it into its own type, its
// `FoundCodec` in native/pause.ts, once when the front end starts; and the front end keeps that
// type as it is with JSON.stringify, so the kept record is the parsed one's own keys.)

export interface SaveBody {
  /** The format of `data`'s bytes (the game's codec: `SaveCodec.format`). */
  format: number;
  /** For a machine save: which game image it was made on (a hash of the image the game was loaded from). */
  image?: string;
  /** The save, as the game's codec packs it, in base64. */
  data: string;
  /** When it was made (ms since 1970); 0: before saves were dated. */
  at: number;
  /** What the game says about it (where, how it's doing): a few short lines. */
  summary: string[];
  /** Rooms entered since this game began (1: just started). */
  rooms: number;
}

/** A save as read back: its body in the envelope that says whose it is. */
export interface SaveSlot extends SaveBody {
  game: string;
}

/** The previous save also keeps what had been found by then (the current one's is the game's own). */
export interface PreviousSlot extends SaveSlot {
  found: Found;
}

export interface GameSaves {
  current: SaveSlot | null;
  previous: PreviousSlot | null;
}

/** The envelope's version (a slot's `v`); 2 is what was stored before it, read as format 1. */
const VERSION = 3;
const BEFORE_ENVELOPE = 2;
const CURRENT = (id: string) => `${id}.save.v2`;
const PREVIOUS = (id: string) => `${id}.save.v2.previous`;
const OLD = (id: string) => `${id}.save.v1`;
const FOUND = (id: string) => `${id}.found.v1`;

// ---- storage (it can be missing, full or blocked: reads give nothing, writes say they failed) ----

function get(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function set(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
function remove(key: string) {
  try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
}
function json(text: string | null): unknown {
  if (text === null) return null;
  try { return readJson(text); } catch { return null; }
}

// ---- checks of what's read back ----------------------------------------------------------------

const body = S.object({ data: S.string, at: S.number, summary: S.strings, rooms: S.number });
const envelope = S.object({ game: S.string, format: S.number, image: S.optional(S.string) });

/**
 * A slot of `game` as written by envelope version `version`, checked and in the current shape
 * (before the envelope, a slot is format 1 of this game); null if it isn't one.
 */
function slotAs(v: unknown, game: string, version: unknown): SaveSlot | null {
  if (!body(v)) return null;
  const { data, at, summary, rooms } = v;
  if (version === BEFORE_ENVELOPE) return { game, format: 1, data, at, summary, rooms };
  if (version !== VERSION || !envelope(v) || v.game !== game) return null;
  return { game, format: v.format, ...(v.image === undefined ? {} : { image: v.image }), data, at, summary, rooms };
}
/** A slot as stored under a game's key (its own `v` says which version wrote it). */
const slotOf = (v: unknown, game: string) => (isRecord(v) ? slotAs(v, game, v.v) : null);
function previousOf(v: unknown, game: string, version: unknown = isRecord(v) ? v.v : undefined): PreviousSlot | null {
  const slot = slotAs(v, game, version);
  if (!slot || !isRecord(v)) return null;
  return { ...slot, found: isRecord(v.found) ? v.found : {} };
}

// ---- reading and writing ---------------------------------------------------------------------------

/** A game's saves (moving a save from before the history into `current` first). */
export function readSaves(id: string): GameSaves {
  migrate(id);
  return { current: slotOf(json(get(CURRENT(id))), id), previous: previousOf(json(get(PREVIOUS(id))), id) };
}

/** The save from before the history (the bytes alone, in base64) becomes `current`, undated. */
function migrate(id: string) {
  const old = get(OLD(id));
  if (old === null) return;
  if (get(CURRENT(id)) === null && old.length > 0) {
    // (its time isn't known; its progress is described once the game has read it: ContinueFlow)
    if (!writeCurrent(id, { format: 1, data: old, at: 0, summary: [], rooms: 2 })) return; // (kept as it was)
  }
  remove(OLD(id));
}

export function writeCurrent(id: string, slot: SaveBody): boolean {
  return set(CURRENT(id), JSON.stringify({ v: VERSION, game: id, ...slot }));
}
function writePrevious(id: string, slot: SaveBody & { found: unknown }): boolean {
  return set(PREVIOUS(id), JSON.stringify({ v: VERSION, game: id, ...slot }));
}

/** What has been found in the game being played (the map's progress). */
export function readFound(id: string): Found {
  const v = json(get(FOUND(id)));
  return isRecord(v) ? v : {};
}
export function keepFound(id: string, found: unknown) {
  set(FOUND(id), JSON.stringify(found));
}

// ---- what happens to them -------------------------------------------------------------------------

/**
 * A new game begins (before anything of it is saved): the current save becomes the previous one,
 * with what had been found (`found`, as it stood), unless it's a game that never got past its
 * first room and there's an older save to keep. Either way there's no current save now.
 */
export function startNewGame(id: string, found: unknown) {
  const { current, previous } = readSaves(id);
  if (!current) return;
  if (current.rooms > 1 || !previous) {
    if (!writePrevious(id, { ...current, found })) return; // (storage full: the current save stays)
  }
  remove(CURRENT(id));
}

/**
 * Restore the previous save: it and the current one change places (so this can be undone the
 * same way), and so does what had been found with each.
 */
export function restorePrevious(id: string): boolean {
  const { current, previous } = readSaves(id);
  if (!previous) return false;
  const { found, ...slot } = previous;
  const nowFound = readFound(id);
  if (!writeCurrent(id, slot)) return false;
  if (current) writePrevious(id, { ...current, found: nowFound });
  else remove(PREVIOUS(id));
  keepFound(id, found);
  return true;
}

/** Delete one save for good (the save manager asks first). Deleting the current one starts the map afresh too. */
export function deleteSave(id: string, which: 'current' | 'previous') {
  if (which === 'previous') { remove(PREVIOUS(id)); return; }
  remove(CURRENT(id));
  remove(FOUND(id));
}

/**
 * A game's description of a save, tidied for the save manager: each part on one line with single
 * spaces (pause-screen lines pad with spaces to line up), empty parts dropped, at most six.
 */
export function tidySummary(parts: string[]): string[] {
  return parts.map((p) => p.trim().replace(/\s+/g, ' ').toUpperCase()).filter((p) => p.length > 0).slice(0, 6);
}

// ---- export (debug) -------------------------------------------------------------------------------

/**
 * A game's saves as one file, exactly as kept (current, previous, what's been found), for Chris to
 * send when he hits a bug: the info sheet's "Export save (debug)" (games/shell.ts). Read back by
 * `parseExport` (games/shared/test/load-save.ts, for tests). There's no import for players.
 */
export interface SavesExport {
  runstop64: 'saves';
  /** This module's save version (the slots' `v`); an export of an older one reads, as the current. */
  v: number;
  game: string;
  /** The app build it came from (when the site was built), if known. */
  build: string;
  /** When it was exported (ISO 8601). */
  exported: string;
  current: SaveSlot | null;
  previous: PreviousSlot | null;
  found: Found;
}

/** The export file of a game's saves as they are now: its name (`runstop64-<game>-<date>.json`) and its text. */
export function exportSaves(id: string, build: string, now = new Date()): { name: string; text: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const file: SavesExport = { runstop64: 'saves', v: VERSION, game: id, build, exported: now.toISOString(), ...readSaves(id), found: readFound(id) };
  return { name: `runstop64-${id}-${date}.json`, text: JSON.stringify(file, null, 1) };
}

/** An export file's JSON, checked: null if it isn't one (or is another version). Exports from before the envelope read as the current ones. */
export function parseExport(v: unknown): SavesExport | null {
  if (!isRecord(v) || v.runstop64 !== 'saves' || (v.v !== VERSION && v.v !== BEFORE_ENVELOPE)) return null;
  const { game, build, exported, current, previous, found } = v;
  if (!S.string(game) || !S.string(build) || !S.string(exported) || !isRecord(found)) return null;
  const now = current === null ? null : slotAs(current, game, v.v);
  const before = previous === null ? null : previousOf(previous, game, v.v);
  if ((current !== null && !now) || (previous !== null && !before)) return null;
  return { runstop64: 'saves', v: VERSION, game, build, exported, current: now, previous: before, found };
}

/** Put an export's saves in place of the game's own (tests only: a launch then continues from it). */
export function putSaves(e: SavesExport) {
  deleteSave(e.game, 'previous');
  deleteSave(e.game, 'current');
  if (e.current) writeCurrent(e.game, e.current);
  if (e.previous) writePrevious(e.game, e.previous);
  keepFound(e.game, e.found);
}

// ---- bytes as text ------------------------------------------------------------------------------

export function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}
