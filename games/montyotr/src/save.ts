import type { SaveCodec } from '../../shared/continue';
import { isNumber, isNumbers, isRecord } from '../../shared/guards';
import { isExtensionRoom } from './data';
import type { Game } from './game';
import { C5_START, c5Arrive, type C5State } from './mechanisms';

/**
 * Monty's save: what's needed to carry on from the start of a room (taken as
 * Monty comes into it). Storing it, ENTER CONTINUE and CONTINUE? are the shared
 * ContinueFlow's (games/shared/continue.ts, games/shared/saves.ts); this is what goes into a save and
 * how a game is started again from one.
 */
export interface MontySave {
  v: 1;
  roomId: number;
  x2: number; y: number; mapRow: number; exitCol: number; facing: number;
  lives: number; score: number;
  coins: number[]; items: number[]; exitGrid: number[]; c5FallStage: number;
  /** The C5 as it came into the room (saves from before this have only the stage). */
  c5?: C5State;
}

export function snapshot(g: Game): MontySave {
  return {
    v: 1,
    roomId: g.roomId,
    x2: g.x2, y: g.y, mapRow: g.mapRow, exitCol: g.exitCol, facing: g.facing,
    lives: g.lives, score: g.score,
    coins: [...g.coinCollected], items: [...g.siCollected], exitGrid: [...g.exitGrid], c5FallStage: g.c5Arrival.fallStage, c5: { ...g.c5Arrival },
  };
}

/** Start a game from a save (instead of a plain g.start()). */
export function restore(g: Game, data: MontySave) {
  g.start();
  g.lives = Math.max(1, data.lives);
  g.score = data.score;
  g.coinCollected.set(data.coins.slice(0, g.coinCollected.length));
  g.siCollected.set(data.items.slice(0, g.siCollected.length));
  g.exitGrid.set(data.exitGrid.slice(0, g.exitGrid.length));
  c5Arrive(g, data.c5 ?? { ...C5_START, fallStage: data.c5FallStage });
  // Saved in one of runstop64's rooms, carried on with them switched off (ORIGINAL): they aren't
  // there, so Monty carries on from the start room, where a new game starts him (g.start's
  // place), with everything else the save has.
  if (!isExtensionRoom(data.roomId) || g.assist.rooms) {
    g.x2 = data.x2;
    g.y = data.y;
    g.mapRow = data.mapRow;
    g.exitCol = data.exitCol;
    g.facing = data.facing;
  }
  g.drawHudData();
  g.roomExit = 1; // the first frame loads the saved room
}

const isC5State = (v: unknown): v is C5State => isRecord(v) && isNumber(v.fallStage) && isNumber(v.speed) && isNumber(v.dir) && isNumber(v.bounce);

/** A save read back (from JSON in storage), checked: null if it isn't one. */
export function parseSave(v: unknown): MontySave | null {
  if (!isRecord(v) || v.v !== 1) return null;
  const { roomId, x2, y, mapRow, exitCol, facing, lives, score, coins, items, exitGrid, c5FallStage, c5 } = v;
  if (!isNumber(roomId) || !isNumber(x2) || !isNumber(y) || !isNumber(mapRow) || !isNumber(exitCol) || !isNumber(facing)) return null;
  if (!isNumber(lives) || !isNumber(score) || !isNumbers(coins) || !isNumbers(items) || !isNumbers(exitGrid) || !isNumber(c5FallStage)) return null;
  if (c5 !== undefined && !isC5State(c5)) return null;
  return { v: 1, roomId, x2, y, mapRow, exitCol, facing, lives, score, coins, items, exitGrid, c5FallStage, ...(c5 ? { c5 } : {}) };
}

/** Saves as bytes: their JSON. */
export const CODEC: SaveCodec<MontySave> = {
  pack: (s) => Uint8Array.from(JSON.stringify(s), (c) => c.charCodeAt(0)),
  unpack: (b) => {
    const s = parseSave(JSON.parse(String.fromCharCode(...b)));
    if (!s) throw new Error('not a Monty save');
    return s;
  },
};

type Visit = [number, { x2: number; y: number; mapRow: number; exitCol: number }];
const isVisit = (v: unknown): v is Visit => Array.isArray(v) && v.length === 2 && isNumber(v[0]) && isRecord(v[1]) && isNumber(v[1].x2) && isNumber(v[1].y) && isNumber(v[1].mapRow) && isNumber(v[1].exitCol);

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
    const old: unknown = JSON.parse(raw);
    const save = parseSave(old);
    if (!save) return;
    const visited = isRecord(old) && Array.isArray(old.visited) ? old.visited.filter(isVisit) : [];
    let bin = '';
    for (const b of CODEC.pack(save)) bin += String.fromCharCode(b);
    localStorage.setItem('montyotr.save.v1', btoa(bin));
    if (!localStorage.getItem('montyotr.found.v1')) {
      const rooms = Object.fromEntries(visited.map(([id, e]) => [String(id), [e.x2, e.y, e.mapRow, e.exitCol]]));
      localStorage.setItem('montyotr.found.v1', JSON.stringify({ rooms }));
    }
  } catch { /* storage unavailable, or nothing to move */ }
}
