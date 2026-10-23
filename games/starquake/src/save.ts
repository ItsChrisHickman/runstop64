import { readsFormat, type SaveCodec } from '../../shared/continue';
import { readJson, S } from '../../shared/guards';
import type { Enemy } from './enemies';
import type { Game } from './game';
import { installSprites } from './screen';

/**
 * Saves: the whole game as it was at a room's start (before it's drawn): the fields below, then the
 * screen memory (the VIC's 16K, the cell attributes, the cell table at $0400). Resuming draws the room
 * from there, exactly as the game did.
 *
 * `StarquakeFields` lists what is kept of `Game`, each field once, as the schema both the type and the
 * check come from. A field added to `Game` has to be listed here or in `NOT_SAVED` (the type checker
 * says so, `COMPLETE`). Every field is optional on reading: a save made when the game had fewer fields
 * leaves the others as a new game has them, as saves always did.
 *
 * The bytes (format 1): the length of the fields' JSON (4 bytes, little-endian), the JSON, the screen
 * memory. They are what the game's earlier, reflective save wrote, field for field, in the same order.
 */
const n = S.optional(S.number);
const list = S.optional(S.numbers);
const enemy: S.Schema<Enemy> = S.object({
  state: S.number, timer: S.number, move: S.number, kind: S.number, anim: S.number, dx: S.number, dy: S.number, pause: S.number, speed: S.number, cell: S.number, base: S.number,
});
const sprites = S.object({ x: S.numbers, y: S.numbers, msb: S.number, enable: S.number, ptr: S.numbers, colour: S.numbers });
const cachedEnemies = S.object({ enemies: S.array(enemy), colour: S.numbers, ptr: S.numbers, x: S.numbers, y: S.numbers, enable: S.number, msb: S.number });

const StarquakeFields = S.object({
  rng: S.optional(S.object({ a: S.number, b: S.number, c: S.number, d: S.number, s1: S.number, s2: S.number })),
  sprites: S.optional(sprites),
  room: n, colour: n,
  roomColours: list,
  tileFlags: n, ink: n,
  barrierGone: list,
  frames: n, dead: n, visitBit: n, visitByte: n,
  objects: S.optional(S.array(S.object({ type: S.number, col: S.number, row: S.number }))),
  objectCount: n, padCol: n, padRow: n, arriveRow: n, arriveCol: n, doorRandom: n,
  spawnCol: list, spawnRow: list,
  spawnCount: n, barrierCell: n,
  barriers: S.optional(S.array(S.object({ cell: S.number, col: S.number }))),
  enemyPlaceX: list, enemyPlaceY: list, enemyPlaceCell: list,
  enemyPlaceCount: n,
  sparks: S.optional(S.array(S.object({ on: S.number, period: S.number, onTime: S.number, bitmap: S.number, cell: S.number, timer: S.number, phase: S.number }))),
  sparkAt: n, sparkleCell: n, sparkleCount: n,
  items: S.optional(S.array(S.object({ col: S.number, row: S.number, roomLo: S.number, roomHi: S.number, graphic: S.number }))),
  shown: S.optional(S.array(S.object({ graphic: S.number, col: S.number, row: S.number }))),
  shownAt: n,
  carried: list,
  cheopsOffer: n,
  col: n, row: n, cell: n, sub: n, riding: n, input: n, inputPlatform: n, inputPickup: n, stepTimer: n, falling: n, fallHeight: n, inLift: n, arrived: n, bump: n, beside: n, offRow: n, offCol: n, padX: n,
  exit: n, exitCol: n, exitRow: n,
  restart: S.optional(S.object({ riding: S.number, exit: S.number, col: S.number, row: S.number })),
  exitResult: S.optional(S.object({ code: S.number, col: S.number, row: S.number })),
  padShown: n,
  platforms: S.optional(S.array(S.object({ state: S.number, cell: S.number, saved: S.tuple(S.number, S.number) }))),
  platformAdd: n, platformTick: n,
  enemies: S.optional(S.array(enemy)),
  collide: n,
  spawnSpots: S.optional(S.array(S.object({ cell: S.number, x: S.number, y: S.number }))),
  spawnSpotCount: n,
  cache: S.optional(S.array(S.nullable(cachedEnemies))),
  cacheRoomLo: list, cacheRoomHi: list,
  cacheAt: n, energy: n, platformsLeft: n, charge: n, panelDirty: n,
  score: list,
  scoreRoll: n, scoreSpeed: n, scoreTimer: n,
  lives: list,
  livesRoll: n, livesSteps: n, livesDir: n,
  core: list, coreSlots: list,
  carriedCount: n, coreMissing: n, ambient: n,
  won: S.optional(S.boolean), inScreen: S.optional(S.boolean),
  vic: S.optional(S.object({ x: S.numbers, y: S.numbers, msb: S.number, enable: S.number })),
  joy: n,
  asking: S.optional(S.nullable(S.union(S.literal('code'), S.literal('trade')))),
  codeAt: S.optional(S.nullable(S.object({ col: S.number, row: S.number }))),
  key: n, laser: n,
  shot: S.optional(S.object({ faceX: S.number, faceY: S.number, dx: S.number, dy: S.number, cell: S.number, anim: S.number, base: S.number, bounced: S.number })),
  pendingScore: n,
});
export type StarquakeFields = S.Infer<typeof StarquakeFields>;

/** What is kept of a game: its fields, and the screen memory they draw (the VIC's 16K, the cell attributes, the cell table). */
export interface StarquakeSave {
  fields: StarquakeFields;
  bank: Uint8Array;
  attr: Uint8Array;
  lo: Uint8Array;
}

/** The parts of `Game` not kept: the screen (kept apart, above), the sound, the grace check the front end sets, and the methods. */
type NotSaved = 'scr' | 'lo' | 'sound' | 'graceActive' | 'addScore' | 'resetRoomLists';
/** Compile-time check: every field of `Game` is in `StarquakeFields` or `NotSaved`, and the other way round. */
type Mutual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const COMPLETE: Mutual<Exclude<keyof Game, NotSaved>, keyof StarquakeFields> = true;
void COMPLETE;

const copy = <T extends object>(items: readonly T[]): T[] => items.map((item) => ({ ...item }));

/** The game as it is: every field copied (the save must not change as the game goes on). */
export function snapshot(g: Game): StarquakeSave {
  const { rng: r, sprites: sp, vic: v, restart: re, exitResult: ex, shot: sh } = g;
  const fields: Required<StarquakeFields> = {
    rng: { a: r.a, b: r.b, c: r.c, d: r.d, s1: r.s1, s2: r.s2 },
    sprites: { x: [...sp.x], y: [...sp.y], msb: sp.msb, enable: sp.enable, ptr: [...sp.ptr], colour: [...sp.colour] },
    room: g.room, colour: g.colour,
    roomColours: [...g.roomColours],
    tileFlags: g.tileFlags, ink: g.ink,
    barrierGone: [...g.barrierGone],
    frames: g.frames, dead: g.dead, visitBit: g.visitBit, visitByte: g.visitByte,
    objects: copy(g.objects),
    objectCount: g.objectCount, padCol: g.padCol, padRow: g.padRow, arriveRow: g.arriveRow, arriveCol: g.arriveCol, doorRandom: g.doorRandom,
    spawnCol: [...g.spawnCol], spawnRow: [...g.spawnRow],
    spawnCount: g.spawnCount, barrierCell: g.barrierCell,
    barriers: copy(g.barriers),
    enemyPlaceX: [...g.enemyPlaceX], enemyPlaceY: [...g.enemyPlaceY], enemyPlaceCell: [...g.enemyPlaceCell],
    enemyPlaceCount: g.enemyPlaceCount,
    sparks: copy(g.sparks),
    sparkAt: g.sparkAt, sparkleCell: g.sparkleCell, sparkleCount: g.sparkleCount,
    items: copy(g.items),
    shown: copy(g.shown),
    shownAt: g.shownAt,
    carried: [...g.carried],
    cheopsOffer: g.cheopsOffer,
    col: g.col, row: g.row, cell: g.cell, sub: g.sub, riding: g.riding, input: g.input, inputPlatform: g.inputPlatform, inputPickup: g.inputPickup,
    stepTimer: g.stepTimer, falling: g.falling, fallHeight: g.fallHeight, inLift: g.inLift, arrived: g.arrived, bump: g.bump, beside: g.beside,
    offRow: g.offRow, offCol: g.offCol, padX: g.padX,
    exit: g.exit, exitCol: g.exitCol, exitRow: g.exitRow,
    restart: { riding: re.riding, exit: re.exit, col: re.col, row: re.row },
    exitResult: { code: ex.code, col: ex.col, row: ex.row },
    padShown: g.padShown,
    platforms: g.platforms.map((p) => ({ state: p.state, cell: p.cell, saved: [p.saved[0], p.saved[1]] })),
    platformAdd: g.platformAdd, platformTick: g.platformTick,
    enemies: copy(g.enemies),
    collide: g.collide,
    spawnSpots: copy(g.spawnSpots),
    spawnSpotCount: g.spawnSpotCount,
    cache: g.cache.map((c) => (c ? { enemies: copy(c.enemies), colour: [...c.colour], ptr: [...c.ptr], x: [...c.x], y: [...c.y], enable: c.enable, msb: c.msb } : null)),
    cacheRoomLo: [...g.cacheRoomLo], cacheRoomHi: [...g.cacheRoomHi],
    cacheAt: g.cacheAt, energy: g.energy, platformsLeft: g.platformsLeft, charge: g.charge, panelDirty: g.panelDirty,
    score: [...g.score],
    scoreRoll: g.scoreRoll, scoreSpeed: g.scoreSpeed, scoreTimer: g.scoreTimer,
    lives: [...g.lives],
    livesRoll: g.livesRoll, livesSteps: g.livesSteps, livesDir: g.livesDir,
    core: [...g.core], coreSlots: [...g.coreSlots],
    carriedCount: g.carriedCount, coreMissing: g.coreMissing, ambient: g.ambient,
    won: g.won, inScreen: g.inScreen,
    vic: { x: [...v.x], y: [...v.y], msb: v.msb, enable: v.enable },
    joy: g.joy,
    asking: g.asking,
    codeAt: g.codeAt ? { col: g.codeAt.col, row: g.codeAt.row } : null,
    key: g.key, laser: g.laser,
    shot: { faceX: sh.faceX, faceY: sh.faceY, dx: sh.dx, dy: sh.dy, cell: sh.cell, anim: sh.anim, base: sh.base, bounced: sh.bounced },
    pendingScore: g.pendingScore,
  };
  return { fields, bank: g.scr.bank.slice(), attr: g.scr.attr.slice(), lo: g.lo.slice() };
}

// ---- putting a save back ---------------------------------------------------------------------------

/** The fields that are plain numbers on `Game` and in the save under the same name. */
const NUMBERS = [
  'room', 'colour', 'tileFlags', 'ink', 'frames', 'dead', 'visitBit', 'visitByte', 'objectCount', 'padCol', 'padRow', 'arriveRow', 'arriveCol', 'doorRandom',
  'spawnCount', 'barrierCell', 'enemyPlaceCount', 'sparkAt', 'sparkleCell', 'sparkleCount', 'shownAt', 'cheopsOffer',
  'col', 'row', 'cell', 'sub', 'riding', 'input', 'inputPlatform', 'inputPickup', 'stepTimer', 'falling', 'fallHeight', 'inLift', 'arrived', 'bump', 'beside',
  'offRow', 'offCol', 'padX', 'exit', 'exitCol', 'exitRow', 'padShown', 'platformAdd', 'platformTick', 'collide', 'spawnSpotCount',
  'cacheAt', 'energy', 'platformsLeft', 'charge', 'panelDirty', 'scoreRoll', 'scoreSpeed', 'scoreTimer', 'livesRoll', 'livesSteps', 'livesDir',
  'carriedCount', 'coreMissing', 'ambient', 'joy', 'key', 'laser', 'pendingScore',
] as const;

/** The contents of an array or typed array replaced by `from` (the array itself stays, others hold it); nothing if the save has none. */
function replace<T>(to: { length: number; set(from: T[]): void } | T[], from: T[] | undefined) {
  if (!from) return;
  if (Array.isArray(to)) to.splice(0, to.length, ...from);
  else to.set(from);
}

/** The keys of `from` copied onto `to` (a nested record of numbers: the game's `restart`, `shot`...). */
function assign<T extends object, K extends keyof T>(to: T, from: Pick<T, K> | undefined, keys: readonly K[]) {
  if (from) for (const k of keys) to[k] = from[k];
}

/** Put a save back into the game (a new game's fields stay for any the save does not have). */
export function restore(g: Game, save: StarquakeSave) {
  const f = save.fields;
  for (const k of NUMBERS) {
    const v = f[k];
    if (v !== undefined) g[k] = v;
  }
  if (f.won !== undefined) g.won = f.won;
  if (f.inScreen !== undefined) g.inScreen = f.inScreen;
  if (f.asking !== undefined) g.asking = f.asking;
  if (f.codeAt !== undefined) g.codeAt = f.codeAt && { col: f.codeAt.col, row: f.codeAt.row };
  assign(g.rng, f.rng, ['a', 'b', 'c', 'd', 's1', 's2']);
  if (f.sprites) {
    replace(g.sprites.x, f.sprites.x); replace(g.sprites.y, f.sprites.y); replace(g.sprites.ptr, f.sprites.ptr); replace(g.sprites.colour, f.sprites.colour);
    g.sprites.msb = f.sprites.msb; g.sprites.enable = f.sprites.enable;
  }
  if (f.vic) {
    replace(g.vic.x, f.vic.x); replace(g.vic.y, f.vic.y);
    g.vic.msb = f.vic.msb; g.vic.enable = f.vic.enable;
  }
  assign(g.restart, f.restart, ['riding', 'exit', 'col', 'row']);
  assign(g.exitResult, f.exitResult, ['code', 'col', 'row']);
  assign(g.shot, f.shot, ['faceX', 'faceY', 'dx', 'dy', 'cell', 'anim', 'base', 'bounced']);
  replace(g.roomColours, f.roomColours); replace(g.barrierGone, f.barrierGone); replace(g.spawnCol, f.spawnCol); replace(g.spawnRow, f.spawnRow);
  replace(g.enemyPlaceX, f.enemyPlaceX); replace(g.enemyPlaceY, f.enemyPlaceY); replace(g.enemyPlaceCell, f.enemyPlaceCell);
  replace(g.carried, f.carried); replace(g.cacheRoomLo, f.cacheRoomLo); replace(g.cacheRoomHi, f.cacheRoomHi);
  replace(g.score, f.score); replace(g.lives, f.lives); replace(g.core, f.core); replace(g.coreSlots, f.coreSlots);
  replace(g.objects, f.objects); replace(g.barriers, f.barriers); replace(g.sparks, f.sparks); replace(g.items, f.items); replace(g.shown, f.shown);
  replace(g.platforms, f.platforms); replace(g.enemies, f.enemies); replace(g.spawnSpots, f.spawnSpots); replace(g.cache, f.cache);
  g.scr.bank.set(save.bank);
  installSprites(g.scr.bank); // (a save made before the pictures were installed has them empty)
  g.scr.attr.set(save.attr);
  g.lo.set(save.lo);
}

// ---- as bytes --------------------------------------------------------------------------------------------

const BANK = 0x4000, ATTR = 0x400, LO = 0x400;

/** Saves as bytes (format 1): the fields' JSON with its length in front, then the screen memory. */
export const CODEC: SaveCodec<StarquakeSave> = {
  format: 1,
  pack(s) {
    const json = new TextEncoder().encode(JSON.stringify(s.fields));
    const out = new Uint8Array(4 + json.length + BANK + ATTR + LO);
    new DataView(out.buffer).setUint32(0, json.length, true);
    out.set(json, 4);
    out.set(s.bank, 4 + json.length);
    out.set(s.attr, 4 + json.length + BANK);
    out.set(s.lo, 4 + json.length + BANK + ATTR);
    return out;
  },
  unpack(b, format) {
    readsFormat('Starquake', format, 1);
    if (b.length < 4) throw new Error('not a Starquake save');
    const n = new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(0, true);
    if (b.length !== 4 + n + BANK + ATTR + LO) throw new Error(`Starquake save: ${b.length} bytes, expected ${4 + n + BANK + ATTR + LO}`);
    const fields = readJson(new TextDecoder().decode(b.subarray(4, 4 + n)));
    if (!StarquakeFields(fields)) throw new Error('not a Starquake save');
    const at = 4 + n;
    return { fields, bank: b.slice(at, at + BANK), attr: b.slice(at + BANK, at + BANK + ATTR), lo: b.slice(at + BANK + ATTR, at + BANK + ATTR + LO) };
  },
};

/**
 * A save described for the save manager (ContinueFlow `describe`), from its fields: which half of
 * the planet BLOB is in (the map's pages), his lives, the core pieces still missing, the score.
 */
export function describeSave({ fields }: StarquakeSave): string[] {
  const digits = (v: number[] | undefined) => (v ? Number(v.join('')) : 0);
  const room = fields.room ?? 0;
  return [room >> 8 ? 'THE DEPTHS' : 'THE SURFACE', `LIVES ${digits(fields.lives)}`, `CORE ${fields.coreMissing ?? 0} MISSING`, `SCORE ${digits(fields.score)}`];
}
