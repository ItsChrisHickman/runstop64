import { BLOCKS, CORE_ROOM, rom, ROOM_COUNT, ROOMS, TILE_INFO } from './data';
import type { Game } from './game';

/**
 * What the pause map says about the planet (the goal, and what each place is), read from the game's own data and state:
 * the rooms' tiles (a security door is a tile whose info says so, $48A3), the teleports' table ($112A, their names $3E8F),
 * and the items in the world ($0890: where each lies, what it is). Nothing here writes to the game.
 *
 * What the game is: the planet's core is missing nine pieces. Four of its places are filled with their own piece
 * (graphics 0-8) lying about the planet; five want something else (each a different thing from the table at $2F0A: a
 * symbol, or one of the nine strange objects), so the five pieces of the same number in the world are decoys. BLOB carries four things at a
 * time, up to the core (room 199), where each piece he has is put in its place. Security doors and Cheops pyramids
 * check what he carries: each symbol they show must be matched by the same symbol, one by the wild symbol ($0E), or
 * all by the access card ($0F). A pyramid then trades the first thing he carries for one of five. Teleports take a
 * five letter name, the destination's, which a booth shows when BLOB is in it.
 */

/** The access card and the key, as items ($0F and $10), the pyramid ($19). */
export const GRAPHIC = { card: 0x0f, key: 0x10, pyramid: 0x19 } as const;
/** The core has nine places. */
export const CORE_PIECES = 9;

/** A tile's object type (tile info's high nibble | $30, $48A3), or 0: kinds 1-4 are colours, a tile at or past $5B has no info. */
function tileType(tile: number): number {
  if (((tile - 0x5b) & 0x80) === 0) return 0;
  const info = rom(TILE_INFO + tile);
  if (!info) return 0;
  const kind = info >> 4;
  return kind !== 0 && ((kind - 5) & 0x80) !== 0 ? 0 : kind | 0x30;
}

/** Whether a room's own blocks hold a security door (type $30). Read once. */
const DOORS: boolean[] = [];
export function hasDoor(room: number): boolean {
  const known = DOORS[room];
  if (known !== undefined) return known;
  let door = false;
  for (let b = 0; b < 12; b++) {
    const block = BLOCKS + rom(ROOMS + room * 12 + b) * 4;
    for (let t = 0; t < 4; t++) if (tileType(rom(block + t)) === 0x30) door = true;
  }
  return (DOORS[room] = door);
}

/** How many places of the core are filled (a piece put back has bit 7 set, $08F4). */
export const piecesPlaced = (g: Game) => g.core.filter((c) => c & 0x80).length;

/** What the core still wants: the graphics of its empty places. */
const wanted = (g: Game) => new Set(g.core.filter((c) => !(c & 0x80)));

/** An item as the world has it: the room it lies in and what it is (a carried one has no room). */
const lying = (g: Game) => g.items.filter((it) => !(it.graphic & 0x80)).map((it) => ({ room: it.roomLo | (it.roomHi << 8), graphic: it.graphic }));

/** Rooms where something the core wants lies, whether BLOB has been there or not (a copy of a wanted thing counts). */
export function pieceRooms(g: Game): Set<number> {
  const w = wanted(g);
  return new Set(lying(g).filter((it) => w.has(it.graphic)).map((it) => it.room));
}

/** Rooms where the access card or the key lies. */
export function passRooms(g: Game): Set<number> {
  return new Set(lying(g).filter((it) => it.graphic === GRAPHIC.card || it.graphic === GRAPHIC.key).map((it) => it.room));
}

/** The things the room has lying about that help: what the status line adds. */
export function lyingHere(g: Game, room: number): { piece: boolean; card: boolean; key: boolean } {
  const w = wanted(g);
  const here = lying(g).filter((it) => it.room === room);
  return { piece: here.some((it) => w.has(it.graphic)), card: here.some((it) => it.graphic === GRAPHIC.card), key: here.some((it) => it.graphic === GRAPHIC.key) };
}

/** The 15 teleports: their rooms ($112A/$1139) and names ($3E8F, 9 bytes each, 5 letters). */
export const TELEPORT_ROOMS: readonly number[] = Array.from({ length: 15 }, (_, i) => rom(0x112a + i) | (rom(0x1139 + i) << 8));
export const teleportName = (t: number) => String.fromCharCode(...Array.from({ length: 5 }, (_, i) => rom(0x3e8f + t * 9 + i)));
/** Which teleport a room has, or -1. */
export const teleportIn = (room: number) => TELEPORT_ROOMS.indexOf(room);

/** What the game asks of the player at a door and at a pyramid: how many symbols, matched by the same or by the card. */
export const DOOR_SYMBOLS = 3;
export const PYRAMID_SYMBOLS = 2;

/** Whether the pyramid is among the things this room shows now ($0923: a shown thing with graphic $19). */
export const pyramidShown = (g: Game) => g.shown.some((s) => s.graphic === GRAPHIC.pyramid);

/** Whether a room has any of these. */
export interface RoomKinds { core: boolean; teleport: number; door: boolean; pyramid: boolean }
export function kindsOf(room: number, pyramids: readonly number[]): RoomKinds {
  return { core: room === CORE_ROOM, teleport: teleportIn(room), door: hasDoor(room), pyramid: pyramids.includes(room) };
}

/** All rooms with a door (for tests). */
export const doorRooms = () => Array.from({ length: ROOM_COUNT }, (_, r) => r).filter(hasDoor);
