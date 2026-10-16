import raw from './data/motr.json';
import { hexBytes } from 'c64kit';
import { ROOMS as EXT_ROOMS, SECTORS as EXT_SECTORS, type ExtRoom, type Sign } from './data/runstop64-rooms';

/**
 * Original Monty on the Run data (see tools/extract-motr.mjs), decoded into
 * friendly shapes. Room IDs, coordinates and tables match the original game.
 */

export const ROOM_COUNT = raw.rooms;
export const tileLibrary = hexBytes(raw.tileLibrary); // 121 × 8 bytes
/** VIC bank 1 ($4000-$7FFF) as the game loads it: charset at $4000, sprites by pointer. */
export const bankImage = hexBytes(raw.bank);
export const jumpArc = hexBytes(raw.jumpArc);
const roomDefs = hexBytes(raw.roomDefs);
const enemyCopyFlags = hexBytes(raw.enemyCopyFlags);
export const enemyColours = hexBytes(raw.enemyColours);
export const enemyDirFlags = hexBytes(raw.enemyDirFlags);
export const exitGridImage = hexBytes(raw.exitGrid);
export const fkLayout = hexBytes(raw.fkLayout);
export interface DecorType { w: number; h: number; chr: Uint8Array; colour: number | Uint8Array }
const originalDecorTypes: DecorType[] = raw.decorTypes.map((t) => ({
  w: t.w,
  h: t.h,
  chr: hexBytes(t.chr),
  colour: typeof t.colour === 'number' ? t.colour : hexBytes(t.colour),
}));
export const piledriverGlyphs = hexBytes(raw.piledriverGlyphs);
export const teleporterColours = hexBytes(raw.teleporterColours);
export const flameMasks = hexBytes(raw.flameMasks);
export const greyPulse = hexBytes(raw.greyPulse);
export const cloudFrames = hexBytes(raw.cloudFrames);
export const arrestedText = hexBytes(raw.arrestedText);
export const gameOverPtrs = hexBytes(raw.gameOverPtrs);
export const BANNER_TEXT = raw.bannerText;

export const PLAY_COLS = 32;
export const PLAY_ROWS = 20;

export interface RoomDef {
  id: number;
  tiles: number[]; // tile library index for room char codes 1-8
  colours: number[]; // C64 colour for room char codes 1-8
  cells: Uint8Array; // 32 × 20 char codes
}

export function roomDef(id: number): RoomDef {
  const ext = extRoom(id);
  if (ext) return extRoomDef(ext);
  const def = roomDefs.subarray(id * 16, id * 16 + 16);
  const cells = new Uint8Array(PLAY_COLS * PLAY_ROWS);
  // RLE: high nibble = run length - 1, low nibble = char code.
  let n = 0;
  for (const b of hexBytes(raw.tilemaps[id])) {
    for (let i = 0; i <= b >> 4 && n < cells.length; i++) cells[n++] = b & 0x0f;
  }
  return { id, tiles: [...def.subarray(0, 8)], colours: [...def.subarray(8, 16)], cells };
}

export function sectorIndex(roomId: number) {
  return sectorIdx[roomId] ?? 0;
}

export function sectorName(roomId: number): { col: number; text: string } {
  return sectorNames[sectorIndex(roomId)];
}

/** Collision class for a tile library index (original SetTileProperty). */
export function tileProperty(tile: number): number {
  if ((tile >= 0x47 && tile < 0x4e) || tile < 0x27) return 1;
  if (tile < 0x47) return 2;
  if (tile < 0x56) return 4;
  if (tile < 0x77) return 3;
  return 0;
}

export function enemyRecords(roomId: number): Uint8Array {
  const ext = extRoom(roomId);
  return ext ? extEnemyRecords(ext) : hexBytes(raw.enemies[roomId]);
}

/** 32 packed bytes per enemy frame, 8 frames per type (see Enemies.load). */
export function enemyBank(type: number): Uint8Array {
  return hexBytes(raw.enemyBanks[type - 8]);
}

export function enemyCopyFlag(type: number) {
  return enemyCopyFlags[type - 8];
}

/** Freedom kit item names, by original index. */
export const FK_NAMES = [
  'COMPASS', 'JET PACK', 'DISGUISE', 'ROPE', 'GENERATOR', 'LASER GUN', 'WATCH', 'LADDER', 'HAND GRENADE', 'GUN',
  'FLOPPY DISK', 'PASSPORT', 'GAS MASK', 'TELESCOPE', 'TANK', 'BARREL OF RUM', 'AXE', 'KIT BAG', 'MAP', 'HAMMER', 'TORCH',
];
/** The five items that actually get Monty to France (jet pack, rope, passport, gas mask, rum). */
export const CORRECT_KIT = [1, 3, 11, 12, 15];

/** The cupcake's frame base in si_spawn_tbl (sprite pointer $91). */
export const CUPCAKE_FRAME = 3;
/** Special item names, by si_spawn_tbl index. */
export const ITEM_NAMES = [
  'CUPCAKE', 'VASE', 'CUPCAKE', 'FLY SPRAY', 'CUPCAKE', 'JOYSTICK', 'CUPCAKE', 'CUPCAKE', 'JERRY CAN', 'CUPCAKE',
  'KEY', 'FIRST AID KIT', 'MILK JUG', 'TEDDY BEAR', 'CUPCAKE', 'CUPCAKE', 'SMOKE STACK', 'CUPCAKE', 'CUPCAKE', 'CAKE',
];

/** Original SFX numbers (Music.PlaySFX). */
export const SFX = {
  warp: 0, jump: 1, piledriverDescend: 2, jetpack: 3, liftAscend: 4, liftDescend: 5, coin: 7, item: 8,
} as const;
/** SFX per death/completion event (original event_sfx_tbl). */
export const EVENT_SFX = [9, 10, 14, 12, 13, 0, 14];

/** Entry points inside the original music driver (present in the HVSC .sid). */
export const MUSIC = { init: 0x9554, stop: 0x957d, playSfx: 0x9591 } as const;

// ---- runstop64's rooms (data/runstop64-rooms.ts), merged in ------------------------------------
//
// Every table above that's keyed by room id takes runstop64's rooms after the original's own
// entries, in the original's formats; the original's rooms ($00-$33) read exactly what they
// did. The new rooms' ids ($34 on) are on no cell of the original's exit grid, so nothing of
// the original reaches them: only `extensionGrid` does (Game.roomAt, with the assist on).

const extById = new Map(EXT_ROOMS.map((r) => [r.id, r]));
const extRoom = (id: number) => extById.get(id);
/** One of runstop64's rooms (not the original's). */
export const isExtensionRoom = (id: number) => extById.has(id);

/** The exit grid's cells for runstop64's rooms ($FF elsewhere: the original's cells and the empty ones). */
export const extensionGrid = new Uint8Array(exitGridImage.length).fill(0xff);
for (const r of EXT_ROOMS) {
  if (exitGridImage[r.row * 23 + r.col] !== 0xff) throw new Error(`runstop64 room $${r.id.toString(16)}: its cell is the original's`);
  extensionGrid[r.row * 23 + r.col] = r.id;
}

const MAP_CODES = '.12345678';
function extRoomDef(r: ExtRoom): RoomDef {
  if (r.map.length !== PLAY_ROWS || r.map.some((l) => l.length !== PLAY_COLS)) throw new Error(`runstop64 room $${r.id.toString(16)}: its map isn't ${PLAY_COLS} × ${PLAY_ROWS}`);
  const cells = Uint8Array.from(r.map.join(''), (c) => {
    const code = MAP_CODES.indexOf(c);
    if (code < 0) throw new Error(`runstop64 room $${r.id.toString(16)}: '${c}' in its map`);
    return code;
  });
  return { id: r.id, tiles: [...r.tiles], colours: [...r.colours], cells };
}

/** The enemy records (7 bytes each, $FF after them), as SetupRoom reads the original's. */
function extEnemyRecords(r: ExtRoom): Uint8Array {
  const out: number[] = [];
  for (const e of r.enemies ?? []) {
    const sx = e.col * 4 + 0x0c, sy = e.row * 8 + 0x32; // the sprite's x (halved) and y at that screen cell
    out.push(e.colour, (sx - 0x1c) * 2, 0xf9 - sy, e.dir, e.type, e.speed, e.range);
  }
  out.push(0xff);
  return Uint8Array.from(out);
}

/** A table of the original's with runstop64's entries after it. */
const merged = (original: Uint8Array, entries: (r: ExtRoom) => number[][]) =>
  Uint8Array.from([...original, ...EXT_ROOMS.flatMap((r) => entries(r).flat())]);
/** A table indexed by room id, runstop64's rooms' entries put in at their ids (past the original's 52 rooms: bytes no room read). */
function byRoom(original: Uint8Array, value: (r: ExtRoom) => number) {
  const out = new Uint8Array(Math.max(original.length, ...EXT_ROOMS.map((r) => r.id + 1)));
  out.set(original.subarray(0, ROOM_COUNT));
  for (const r of EXT_ROOMS) out[r.id] = value(r);
  return out;
}

/** Signs: the game's capitals (screen codes $40-$7F of its charset) cut out of a board, its ends rounded, as MPL ST. is. */
function signType(sign: Sign): DecorType {
  const text = ` ${sign.text} `;
  const chr = new Uint8Array(text.length * 8);
  for (let i = 0; i < text.length; i++) {
    const code = (text.charCodeAt(i) & 0x3f) | 0x40;
    for (let y = 0; y < 8; y++) chr[i * 8 + y] = ~bankImage[code * 8 + y] & 0xff;
  }
  const last = (text.length - 1) * 8;
  chr[0] &= 0x7f; chr[7] &= 0x7f; chr[last] &= 0xfe; chr[last + 7] &= 0xfe;
  return { w: text.length, h: 1, chr, colour: sign.colour };
}

const signs: Sign[] = [];
const signIndex = (s: Sign) => {
  const at = signs.findIndex((t) => t.text === s.text && t.colour === s.colour);
  return originalDecorTypes.length + (at >= 0 ? at : signs.push(s) - 1);
};

/**
 * si_spawn_tbl: 4 bytes an item (room, sprite x halved, sprite y, frame base: pointer - $8E). The
 * original's 20, then a piece of cake (the original's cupcake: frame base 3, pointer $91, 200
 * points) in each of runstop64's rooms that has one (`cake`).
 */
export const specialItems = merged(hexBytes(raw.specialItems), (r) => (r.cake ? [[r.id, r.cake[0] * 4 + 0x0c, r.cake[1] * 8 + 0x32, CUPCAKE_FRAME]] : []));
export const coinTable = merged(hexBytes(raw.coins), (r) => (r.coins ?? []).map(([c, row]) => [r.id, c, row]));
export const decorRooms = merged(hexBytes(raw.decorRooms), (r) => (r.decor ?? []).map((d) => [r.id, d.col, d.row, typeof d.type === 'number' ? d.type : signIndex(d.type)]));
export const decorTypes: DecorType[] = [...originalDecorTypes, ...signs.map(signType)];
export const piledriverCfg = merged(hexBytes(raw.piledrivers), (r) => (r.crushers ?? []).map((p) => [r.id, p.col, p.row, p.height, p.chr]));
const tele = EXT_ROOMS.flatMap((r) => (r.teleporter ? [{ id: r.id, t: r.teleporter }] : []));
export const teleporterCfg = Uint8Array.from([...hexBytes(raw.teleporters), ...tele.flatMap(({ id, t }) => [id, t.col, t.row, t.height, t.colour])]);
export const teleporterDests = Uint8Array.from([...hexBytes(raw.teleporterDests), ...tele.flatMap(({ t }) => [t.to.x2, t.to.y, t.to.exitCol, t.to.mapRow])]);
/** runstop64's warps (by the room they're in): the special items their destination's way in has taken (ExtRoom teleporter.found). */
export const warpFound = new Map(tele.map(({ id, t }) => [id, t.found ?? []]));
export const roomMeta = byRoom(hexBytes(raw.roomMeta), (r) => r.theme ?? 0);
const sectorNames: readonly { col: number; text: string }[] = [...raw.sectorNames, ...EXT_SECTORS];
const sectorIdx = byRoom(hexBytes(raw.sectorIdx), (r) => raw.sectorNames.length + r.sector);
