import { readsFormat, type SaveCodec } from '../../shared/continue';
import { isArray, isNumber, isRecord, readJson, S } from '../../shared/guards';
import type { Game } from './game';
import { wear } from './items';
import { C5_START, c5Arrive, lastCellIndex } from './mechanisms';

/**
 * Monty's save: what's needed to carry on from the start of a room (taken as
 * Monty comes into it). Storing it, ENTER CONTINUE and CONTINUE? are the shared
 * ContinueFlow's (games/shared/continue.ts, games/shared/saves.ts); this is what goes into a save and
 * how a game is started again from one.
 */
export const MontySave = S.object({
  v: S.literal(1),
  roomId: S.number,
  x2: S.number, y: S.number, mapRow: S.number, exitCol: S.number, facing: S.number,
  lives: S.number, score: S.number,
  coins: S.numbers, items: S.numbers, exitGrid: S.numbers, c5FallStage: S.number,
  /** The C5 as it came into the room (saves from before this have only the stage). */
  c5: S.optional(S.object({ fallStage: S.number, speed: S.number, dir: S.number, bounce: S.number })),
  /** The special item whose costume he wears (a game with costumes: Do Svidaniya Monty's). */
  worn: S.optional(S.number),
});
export type MontySave = S.Infer<typeof MontySave>;

export function snapshot(g: Game): MontySave {
  return {
    v: 1,
    roomId: g.roomId,
    x2: g.x2, y: g.y, mapRow: g.mapRow, exitCol: g.exitCol, facing: g.facing,
    lives: g.lives, score: g.score,
    coins: [...g.coinCollected], items: [...g.siCollected], exitGrid: [...g.exitGrid], c5FallStage: g.c5Arrival.fallStage, c5: { ...g.c5Arrival },
    ...(g.worn === null ? {} : { worn: g.worn }),
  };
}

/** Start a game from a save (instead of a plain g.start()). */
export function restore(g: Game, data: MontySave) {
  g.start();
  g.lives = Math.max(1, data.lives);
  g.score = data.score;
  g.coinCollected.set(data.coins.slice(0, g.coinCollected.length));
  g.siCollected.set(data.items.slice(0, g.siCollected.length));
  // (the exit grid changes in one cell only, the C5 street's last, opened when the street is driven (mechanisms.ts); every other cell is the data's,
  // so a world's saves from when it had fewer regions, with shorter or emptier grids, load as they are)
  const street = g.data.c5;
  const driven = street ? data.exitGrid[lastCellIndex(g.data, street)] : undefined;
  if (street && driven !== undefined) g.exitGrid[lastCellIndex(g.data, street)] = driven;
  c5Arrive(g, data.c5 ?? { ...C5_START, fallStage: data.c5FallStage });
  wear(g, data.worn ?? null);
  // Saved in one of runstop64's rooms, carried on with them switched off (ORIGINAL): they aren't
  // there, so Monty carries on from the start room, where a new game starts him (g.start's
  // place), with everything else the save has.
  if (!g.data.isExtensionRoom(data.roomId) || g.assist.rooms) {
    g.x2 = data.x2;
    g.y = data.y;
    g.mapRow = data.mapRow;
    g.exitCol = data.exitCol;
    g.facing = data.facing;
  }
  g.drawHudData();
  g.roomExit = 1; // the first frame loads the saved room
}

/** A save read back (from JSON in storage), checked: null if it isn't one. */
export const parseSave = (v: unknown): MontySave | null => (MontySave(v) ? v : null);

/**
 * A game's save codec: saves as bytes, their JSON. `format` is the number its bytes are at (the envelope's: `{ v: 3, game,
 * format }`, games/shared/saves.ts); every Monty game's save has the same shape, each its own codec under its own name.
 */
export const montyCodec = (name: string, format = 1): SaveCodec<MontySave> => ({
  format,
  pack: (s) => Uint8Array.from(JSON.stringify(s), (c) => c.charCodeAt(0)),
  unpack: (b, found) => {
    readsFormat(name, found, format);
    const s = parseSave(readJson(String.fromCharCode(...b)));
    if (!s) throw new Error(`not a ${name} save`);
    return s;
  },
});

/** Monty on the Run's. */
export const CODEC = montyCodec('Monty');

type Visit = [number, { x2: number; y: number; mapRow: number; exitCol: number }];
const isVisit = (v: unknown): v is Visit => isArray(v) && v.length === 2 && isNumber(v[0]) && isRecord(v[1]) && isNumber(v[1].x2) && isNumber(v[1].y) && isNumber(v[1].mapRow) && isNumber(v[1].exitCol);

/**
 * Saves from before the shared front end (plain JSON under the same key, with the
 * rooms visited in it): into the shared flow's first form (the bytes in base64,
 * which games/shared/saves.ts then moves into its history), the rooms into what's
 * been found (montyotr.found.v1). Run before the front end reads them.
 */
export function migrateOldSave() {
  try {
    const raw = localStorage.getItem('montyotr.save.v1');
    if (!raw?.startsWith('{')) return;
    const old: unknown = readJson(raw);
    if (!isRecord(old)) return;
    const { visited: rooms, ...rest } = old; // (the rooms visited went into the map's progress; the save is the rest)
    const save = parseSave(rest);
    if (!save) return;
    const visited = Array.isArray(rooms) ? rooms.filter(isVisit) : [];
    let bin = '';
    for (const b of CODEC.pack(save)) bin += String.fromCharCode(b);
    localStorage.setItem('montyotr.save.v1', btoa(bin));
    if (!localStorage.getItem('montyotr.found.v1')) {
      const rooms = Object.fromEntries(visited.map(([id, e]) => [String(id), [e.x2, e.y, e.mapRow, e.exitCol]]));
      localStorage.setItem('montyotr.found.v1', JSON.stringify({ rooms }));
    }
  } catch { /* storage unavailable, or nothing to move */ }
}
