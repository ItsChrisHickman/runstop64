/**
 * Which room a line of a region's source is about: the room-scoped tests' map from text to rooms, used twice (one owner):
 * - `affected.ts` turns the lines a `git diff` changed into the rooms to test;
 * - `legs.ts` fingerprints each room (the text about it) and the rest (everything else) to know when a recorded leg state still holds.
 *
 * A region file declares its rooms' ids as a table (`export const SIB = { gravy: 9, ... } as const`) and its rooms and mechanisms as object
 * literals that name their room (`{ id: SIB.gravy, ... }` for a room, `{ room: SIB.lake, ... }` for a mechanism's entry). A line belongs to the
 * innermost such literal round it; a line in none (a palette, a constant, a helper) is about the region as a whole.
 */
import fs from 'node:fs';
import path from 'node:path';
import { digest } from './states';

/** The room ids a region file's tables give, by `TABLE.key` (from every region file: a file may name another's rooms). */
export function roomTables(texts: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const text of texts) {
    for (const m of text.matchAll(/export const ([A-Z][A-Z0-9_]*) = \{([^{}]*)\}/g)) {
      const [, table, body] = m;
      if (table === undefined || body === undefined) continue;
      const pairs = [...body.matchAll(/(\w+)\s*:\s*(0x[0-9a-fA-F]+|\d+)\s*(?=,|$)/g)];
      for (const [, key, value] of pairs) if (key !== undefined && value !== undefined) out.set(`${table}.${key}`, Number(value));
    }
  }
  return out;
}

/** The offsets of a source's braces as matched pairs, strings, template literals and comments skipped. */
function braces(text: string): { open: number; close: number }[] {
  const out: { open: number; close: number }[] = [];
  const stack: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && text[i + 1] === '*') { const end = text.indexOf('*/', i + 2); i = end < 0 ? text.length : end + 1; continue; }
    if (c === '"' || c === "'" || c === '`') {
      for (i++; i < text.length && text[i] !== c; i++) if (text[i] === '\\') i++;
      continue;
    }
    if (c === '{') stack.push(i);
    else if (c === '}') { const open = stack.pop(); if (open !== undefined) out.push({ open, close: i }); }
  }
  return out;
}

/** A region file read for rooms: the room of each line (1-based; null: about the region as a whole), and each room's text and the rest. */
export interface Attributed {
  /** The room a line is about, by line number (1-based). */
  roomOf(line: number): number | null;
  /** The text about each room (its literals, in order). */
  readonly rooms: ReadonlyMap<number, string>;
  /** The text about no room in particular (the file with the rooms' literals cut out). */
  readonly rest: string;
}

/** Read a region file for rooms, the ids resolved through `tables` (`roomTables` of every region file). */
export function attribute(text: string, tables: ReadonlyMap<string, number>): Attributed {
  const pairs = braces(text).sort((a, b) => a.open - b.open);
  /** The innermost pair round an offset. */
  const around = (at: number) => {
    let best: { open: number; close: number } | undefined;
    for (const p of pairs) if (p.open < at && at < p.close && (!best || p.open > best.open)) best = p;
    return best;
  };
  const tagged = new Map<number, number>(); // a pair's open offset -> its room
  for (const m of text.matchAll(/(?<![\w.])(id|room)\s*:\s*([A-Z][A-Z0-9_]*\.\w+|\d+)\b/g)) {
    const value = m[2];
    if (value === undefined || m.index === undefined) continue;
    const id = /^\d+$/.test(value) ? Number(value) : tables.get(value);
    const pair = around(m.index);
    if (id !== undefined && pair && !tagged.has(pair.open)) tagged.set(pair.open, id);
  }
  // the room of each offset: the innermost tagged pair round it
  const roomAt = new Int32Array(text.length).fill(-1);
  const spans = pairs.filter((p) => tagged.has(p.open)); // (sorted by open: an inner pair is written after its outer one)
  for (const p of spans) roomAt.fill(tagged.get(p.open) ?? -1, p.open, p.close + 1);
  const lineStart: number[] = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStart.push(i + 1);
  // a file-private declaration only one room uses (a room's coins or picture written out above it: `const LAPA_COINS = ...`, used in
  // `{ id: RIO_ROOM.lap, coins: LAPA_COINS }`) is that room's too; a helper two rooms use, or one the file exports, stays the region's
  const decls: { name: string; from: number; to: number }[] = [];
  for (const m of text.matchAll(/^(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm)) if (m[1] !== undefined && m.index !== undefined) decls.push({ name: m[1], from: m.index, to: text.length });
  const tops = [...text.matchAll(/^\S/gm)].flatMap((m) => (m.index === undefined ? [] : [m.index]));
  for (const d of decls) d.to = tops.find((t) => t > d.from && !/^[)\]}]/.test(text.slice(t, t + 1))) ?? text.length;
  for (let pass = 0; pass < 3; pass++) {
    for (const d of decls) {
      if ((roomAt[d.from] ?? -1) >= 0) continue;
      const users = new Set<number>();
      let used = false;
      for (const m of text.matchAll(new RegExp(`(?<![\\w$.])${d.name.replace(/\$/g, '\\$')}(?![\\w$])`, 'g'))) {
        if (m.index === undefined || (m.index >= d.from && m.index < d.to)) continue;
        used = true;
        users.add(roomAt[m.index] ?? -1);
      }
      const [only] = users;
      if (used && users.size === 1 && only !== undefined && only >= 0) for (let i = d.from; i < d.to; i++) if ((roomAt[i] ?? -1) < 0) roomAt[i] = only;
    }
  }
  const rooms = new Map<number, string>();
  let rest = '';
  for (let i = 0; i < text.length;) {
    const r = roomAt[i] ?? -1;
    let j = i;
    while (j < text.length && (roomAt[j] ?? -1) === r) j++;
    if (r < 0) rest += text.slice(i, j);
    else rooms.set(r, (rooms.get(r) ?? '') + text.slice(i, j) + '\n');
    i = j;
  }
  return {
    roomOf(line) {
      const from = lineStart[line - 1];
      if (from === undefined) return null;
      const to = lineStart[line] ?? text.length;
      // a line is about a room if any of its text is (a line that opens a room's literal is that room's)
      let found: number | null = null;
      for (let i = from; i < to; i++) { const r = roomAt[i] ?? -1; if (r >= 0 && text[i]?.trim()) { found = r; break; } }
      return found;
    },
    rooms, rest,
  };
}

/** What a game's states depend on, as fingerprints: each room's own text, and the rest (the engine, the game's other sources, its tables' layout). */
export interface Prints {
  /** Everything that is not one room's: a change here changes every state. */
  readonly rest: string;
  /** A room's fingerprint (its text in the region files). */
  room(id: number): string;
}

/** The sources a game's states depend on: the engine's (files or folders, tests left out), its region files (read room by room), and anything else to hold (the tables' layout). */
export interface PrintSources { readonly engine: readonly string[]; readonly regions: readonly string[]; readonly also: string }

/** The `.ts` files of files and folders (a folder's test folders left out), sorted. */
export function sourceFiles(paths: readonly string[]): string[] {
  const out: string[] = [];
  for (const p of paths) {
    if (p.endsWith('.ts')) { out.push(p); continue; }
    for (const f of fs.readdirSync(p, { recursive: true })) if (f.endsWith('.ts') && !/(^|\/)test\//.test(f)) out.push(path.join(p, f));
  }
  return [...new Set(out)].sort();
}

/** The fingerprints of a game's sources as they are on disk now. */
export function fingerprints(src: PrintSources): Prints {
  const regionTexts = src.regions.map((f) => fs.readFileSync(f, 'utf8'));
  const tables = roomTables(regionTexts);
  const read = regionTexts.map((t) => attribute(t, tables));
  const engine = sourceFiles(src.engine).filter((f) => !src.regions.includes(f)).map((f) => `${f}\n${fs.readFileSync(f, 'utf8')}`);
  const rest = digest([...engine, ...read.map((a) => a.rest), src.also].join('\n\u0000'));
  const rooms = new Map<number, string>();
  return {
    rest,
    room(id) {
      const known = rooms.get(id);
      if (known !== undefined) return known;
      const print = digest(read.map((a) => a.rooms.get(id) ?? '').join('\n\u0000'));
      rooms.set(id, print);
      return print;
    },
  };
}
