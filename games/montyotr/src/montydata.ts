import type { Seq } from '../../shared/monty/deaths';
import type { RoomTables } from '../../shared/monty/rooms';
import type { Scene } from './ending-scenes';
import type { Game } from './game';

/**
 * A Monty game's data: everything the engine (Game, items, mechanisms, map, save, ending, title, main) reads about the game it
 * plays, as one value. Monty on the Run's is `MOTR` (motr.ts: the original's tables from data.ts, runstop64's rooms after
 * them); Do Svidaniya Monty's is `montyworld/src/data.ts`, rooms of its own on the same engine. A second game is a second
 * value, not a copy of the code: the engine names no room, item or cell but through the value it is given.
 *
 * The tables are in the original's formats (see `shared/monty/rooms.ts` for the ones a list of rooms builds). What belongs to one
 * game alone (Monty on the Run's C5 street, its jetpack rooms, its rising cloud, its ending's dock) is data of that game here
 * (`c5`, `jetpackRooms`, `risingCloud`, `completion`): null or empty where a game has none.
 */

/** The ENHANCED assists the engine knows (each game's `assists` says which it has). */
export type AssistId = 'lives' | 'cloud' | 'jetpack' | 'c5' | 'rooms' | 'respawn' | 'hints';

/** Original SFX numbers (Music.PlaySFX). */
export interface Sfx { warp: number; jump: number; piledriverDescend: number; jetpack: number; liftAscend: number; liftDescend: number; coin: number; item: number }

/**
 * The look and sound the Monty games on this engine share: the VIC bank (the charset and the sprites by pointer), the tile
 * library and its collision classes, the enemy graphics, the tables of the original's code (the jump, the jetpack's flame, the
 * greys), the sound effects and the music driver's entry points. Do Svidaniya Monty is made of Monty on the Run's parts, so it takes
 * these as they are (`MOTR_LOOK` in data.ts) and adds its own sprites and tiles as it grows.
 */
export interface MontyLook {
  /** VIC bank 1 ($4000-$7FFF) as the game loads it: charset at $4000, sprites by pointer. */
  bankImage: Uint8Array;
  /** 8 bytes a tile. */
  tileLibrary: Uint8Array;
  /** Collision class for a tile library index (original SetTileProperty). */
  tileProperty(tile: number): number;
  jumpArc: Uint8Array;
  enemyColours: Uint8Array;
  enemyDirFlags: Uint8Array;
  /** 32 packed bytes per enemy frame, 8 frames per type (see Game.setupEnemies). */
  enemyBank(type: number): Uint8Array;
  enemyCopyFlag(type: number): number;
  piledriverGlyphs: Uint8Array;
  teleporterColours: Uint8Array;
  flameMasks: Uint8Array;
  greyPulse: Uint8Array;
  cloudFrames: Uint8Array;
  gameOverPtrs: Uint8Array;
  sfx: Sfx;
  /** SFX per death/completion event (original event_sfx_tbl). */
  eventSfx: readonly number[];
  /**
   * Entry points inside the music driver (present in the HVSC .sid), and the .sid's address. `tuneFor`: the version of the tune a
   * room plays (a region's own: Do Svidaniya Monty's, `montyworld/src/music`), null for the .sid as it is; none for a game that has
   * one tune (Monty on the Run).
   */
  music: { init: number; stop: number; playSfx: number; sidUrl: string; tuneFor?: (roomId: number) => TuneVersion | null };
}

/** A version of the game's tune: made from the .sid's bytes by changing the data the music driver plays (never the driver). */
export interface TuneVersion {
  /** What it is called: the session starts the tune again only when the version changes. */
  id: string;
  make(original: Uint8Array): Uint8Array;
}

/** A condition on what Monty has done (`RoomEffect.when`). */
export type Condition =
  | { readonly taken: number }
  | { readonly notTaken: number }
  | { readonly kit: number }
  | { readonly noKit: number };

/**
 * An item's effect on a room (original ApplyItemRoomEffects: run on load and on pickup): when every condition holds in this
 * room, cells emptied, a creature sent away, tiles made passable, a creature woken.
 * `taken`/`notTaken`: special item n (si_spawn_tbl index) taken or not; `kit`/`noKit`: kit item n carried or not.
 */
export interface RoomEffect {
  room: number;
  when?: readonly Condition[];
  /** Screen cells emptied: row, column. */
  clear?: readonly (readonly [row: number, col: number])[];
  /** The creature in this slot is sent off the screen (if the room has one there). */
  removeEnemy?: number;
  /** Room char codes (1-8) minus one whose tile becomes passable. */
  openTiles?: readonly number[];
  /** A trap: taking item `item` the first time wakes the creature in `slot` (back on the screen at x), once. */
  wake?: { item: number; slot: number; x: number };
}

/** A lift in a room (original Lift): where it starts, its type (1 rises when ridden, 2 descends) and its speed/direction byte. */
export interface LiftSpec { room: number; x: number; y: number; type: 1 | 2; speedDir: number; sound: boolean }

/**
 * An escalator: a ride Monty cannot leave (as the lift and the crusher's head are). Stepping on its foot (a floor two cells wide,
 * at playfield cell `col`, `row`: the row of the floor he stands on) starts it; it carries him, at a fixed pace, `cols` cells
 * along (`dx` 1 right, -1 left) and `rows` cells down (`dy` 1) or up (-1) over `frames` frames, and sets him down on the
 * landing at its far end. The treads are the room's theme character (RoomSpec.theme); the slope is the room's own art.
 */
export interface EscalatorSpec { room: number; col: number; row: number; dx: 1 | -1; dy: 1 | -1; cols: number; rows: number; frames: number }

/**
 * An icicle: it hangs where it is drawn (a sprite, in the room at playfield cell `col`, `row`, the top of its 16 pixels) until
 * Monty's width is over its column, shivers for `warn` frames, falls 4 pixels a frame to the floor (playfield row `floor`),
 * breaks, and grows back; it kills like a crusher's head. A room has at most two (the sprites 1 and 2).
 */
export interface IcicleSpec { room: number; col: number; row: number; floor: number }

/** The sprite pointers (in the game's bank) of an icicle hanging, half grown, just growing back, and breaking. */
export interface IcicleSprites { full: number; half: number; small: number; shards: number }

/**
 * A costume: Monty's pictures with the thing worn drawn on. Taking special item `item` puts it on (in place of whatever he wore):
 * each sprite block of `blocks` (63 bytes) replaces his picture at its pointer in the bank. Kept in the save.
 */
export interface Costume {
  item: number;
  blocks: readonly { ptr: number; block: Uint8Array }[];
  /**
   * Something worn in a colour of its own (a fur hat): a sprite over Monty (sprite 7: a room's fourth creature is never in the way),
   * `colour` the colour it is drawn in and `frames` where it is for each of his pictures (by pointer): its own picture in the bank
   * and the offset, in pixels from Monty's sprite (dx even, as sprite x is in 2-pixel units).
   */
  over?: { colour: number; frames: ReadonlyMap<number, { ptr: number; dx: number; dy: number }> };
}

/**
 * What ENHANCED's item hints say (shared/monty/hints.ts): a line in the place's name row, in the game's lettering. `take`: when
 * special item `item` is picked up, what it is for. `wanted`: coming into `room` without the special item, what is wanted there.
 */
export interface ItemHints {
  take: readonly { item: number; text: string }[];
  wanted: readonly { room: number; item: number; text: string }[];
}

/** The stretch of the exit grid the pause screen's map shows while Monty is in it (a region): columns `from` to `to`. */
export interface MapRegion { from: number; to: number }

/** The C5 street of Monty on the Run: its rooms, the first and the last of them, and the exit grid cell of the last. */
export interface C5Street {
  rooms: readonly number[];
  /** The room the street begins in (by the tree), where a crash sends the C5 back to (ORIGINAL), in this exit grid column. */
  first: number;
  startCol: number;
  /** The room the street is driven out of at the bottom left; its cell leaves the grid with the drive. */
  last: number;
  lastCell: { row: number; col: number };
}

/** What a game's ending shows (shared/ending/show.ts): its places, its creatures, where to look for them, its title. */
export interface MontyEnding {
  title: string;
  scenes: readonly Scene[];
  cast: readonly { types: readonly number[]; name: string }[];
  /** The rooms a creature is looked for in, in order (where it first appears). */
  castRooms: readonly number[];
}

export interface MontyData extends RoomTables, MontyLook {
  /** The game's id: its saves, and what the ending credits are kept under. */
  id: string;

  // ---- the world ---------------------------------------------------------------------------------
  /** The exit grid: `rows` × `cols` cells, each a room id or $FF; wide for a world that runs west to east. */
  exitGrid: { image: Uint8Array; cols: number; rows: number };
  /** Cells that have a room only with the `rooms` assist on (runstop64's rooms of Monty on the Run): $FF everywhere else, all of them for a game with none. */
  extensionGrid: Uint8Array;
  isExtensionRoom(id: number): boolean;
  /** Where a new game starts Monty: the room's cell, his place (x2, y) and the way he faces ($01 right, $81 left). */
  start: { mapRow: number; exitCol: number; x2: number; y: number; facing: number };
  /** Rooms the pause screen's travel never goes to and no save is made in (the ending's). */
  untravellable: readonly number[];

  // ---- items -------------------------------------------------------------------------------------
  /** The kit Monty carries (freedom kit icons, by item): drawn on the title and the pause screen; empty for a game with none. */
  kit: readonly number[];
  /** Sprite pointers that mean something to the item pickup (HandleSICollision). */
  itemSprites: { treasure: number; extraLife: number; fatal: number; collectable(ptr: number): boolean; /** The colour an item is drawn in (Monty on the Run's are all white). */ colour(ptr: number): number };
  /** A special item that is the cheat: only there in cheat mode, and taking it turns cheat mode on. */
  cheatItem: number | null;
  /** Special items that don't count towards finishing a room (a trap, a fatal one, the cheat). */
  uncountedItems: readonly number[];
  /** The treasure that ends the game: the room it glows in once `item` is taken, and where. Null: no treasure. */
  treasure: { room: number; item: number; x: number; y: number } | null;
  roomEffects: readonly RoomEffect[];

  // ---- the game's own mechanisms -------------------------------------------------------------------
  /** The rooms where Monty has the jetpack (the jet pack item, kit 0, carried). */
  jetpackRooms: readonly number[];
  lifts: readonly LiftSpec[];
  escalators: readonly EscalatorSpec[];
  icicles: readonly IcicleSpec[];
  iceSprites: IcicleSprites;
  costumes: readonly Costume[];
  /** Crusher base tiles that flash like coins (a room's): the room, the screen row and columns. */
  flashingBases: { room: number; row: number; cols: readonly number[] } | null;
  /** The rising bollard on a Mole Crusher's shaft: its room, screen row and column. */
  bollard: { room: number; row: number; col: number } | null;
  /** The rising cloud (ENHANCED can ride it): its room, its sprite's x, its first screen column (three wide). */
  risingCloud: { room: number; x: number; col: number } | null;
  c5: C5Street | null;
  /** Completion.Begin: what the treasure plays (the dock, the boat): a sequence for the engine to run; null: nothing. */
  completion: ((g: Game) => Seq) | null;

  // ---- the front end -----------------------------------------------------------------------------
  /** The assists the game has (ENHANCED's switch and the pause screen list them, in this order after UNLIMITED LIVES). */
  assists: readonly AssistId[];
  /** ENHANCED's item hints (the assist `hints`); empty for a game with none. */
  hints: ItemHints;
  /** The regions the map shows one at a time (a world too wide for the box); none: the whole grid. */
  regions: readonly MapRegion[];
  /** The map: the special items that are the key ones, the cakes, and the colour of each sector. */
  progress: { keyItems: readonly number[]; cakes: readonly number[]; sectorColours: readonly number[]; /** What the cakes are called on the pause screen (Monty on the Run's cupcakes: CAKES; a game with a food of its own names it). */ foodName?: string };
  /** The title's own text: the scroller's stream. */
  title: { message: Uint8Array };
  /** The reward for winning; null: the game has none yet. */
  ending: MontyEnding | null;
}

/** A sector of a room: the index into the sector names, and the name. */
export function sectorIndex(data: MontyData, roomId: number): number {
  return data.sectorIdx[roomId] ?? 0;
}

export function sectorName(data: MontyData, roomId: number): { col: number; text: string } {
  const s = data.sectorNames[sectorIndex(data, roomId)];
  if (!s) throw new Error(`room $${roomId.toString(16)} has no sector name`);
  return s;
}

/** The exit grid cell of a room, if it is on the grid (not the extension's). */
export function cellOf(data: MontyData, room: number): { row: number; col: number } | null {
  const at = data.exitGrid.image.indexOf(room);
  return at < 0 ? null : { row: Math.floor(at / data.exitGrid.cols), col: at % data.exitGrid.cols };
}
