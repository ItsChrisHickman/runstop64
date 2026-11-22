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
  /** Screen cells filled with the room's character `code` (1-8): the ledges a lamp shows. */
  place?: { code: number; cells: readonly (readonly [row: number, col: number])[] };
  /** A trap: taking item `item` the first time wakes the creature in `slot` (back on the screen at x), once. */
  wake?: { item: number; slot: number; x: number };
}

/** A lift in a room (original Lift): where it starts, its type (1 rises when ridden, 2 descends) and its speed/direction byte. */
export interface LiftSpec {
  room: number; x: number; y: number; type: 1 | 2; speedDir: number; sound: boolean;
  /** A picture of its own (a mine cart: two hires sprites, the upper and the lower, in a colour) in place of Monty on the Run's lift. */
  look?: { top: number; bottom: number; colour: number };
}

/**
 * An escalator: a ride Monty cannot leave (as the lift and the crusher's head are). Stepping on its foot (a floor two cells wide,
 * at playfield cell `col`, `row`: the row of the floor he stands on) starts it; it carries him, at a fixed pace, `cols` cells
 * along (`dx` 1 right, -1 left) and `rows` cells down (`dy` 1) or up (-1) over `frames` frames, and sets him down on the
 * landing at its far end (cell `col + dx * cols`, row `row + dy * rows`). The slope is the room's own art; its treads turn by
 * `treads`: room characters (1-8) and, for each place of the steps, the pictures (8 bytes each) they take in turn.
 *
 * Walking onto the landing's far side, against the way it goes (the cells a step or two before the landing, on its row), the
 * treads carry him back: he walks in place as they push him on to the landing and a cell beyond it.
 */
export interface EscalatorSpec {
  room: number; col: number; row: number; dx: 1 | -1; dy: 1 | -1; cols: number; rows: number; frames: number;
  treads?: { chars: readonly number[]; frames: readonly Uint8Array[] };
}

/**
 * An icicle: it hangs where it is drawn (a sprite, in the room at playfield cell `col`, `row`, the top of its 16 pixels) until
 * Monty's width is over its column, shivers for `warn` frames, falls 4 pixels a frame to the floor (playfield row `floor`),
 * breaks, and grows back; it kills like a crusher's head. A room has at most two (the sprites 1 and 2).
 */
export interface IcicleSpec { room: number; col: number; row: number; floor: number }

/**
 * A tunnel mouth (tunnels.ts): a portal of the room's tile `code` (1-8, a passable one), `cols` wide, from playfield row `top` to
 * `bottom`, which comes in at the `from` end after `rest` frames (the first `offset` later) and a `warn` of a flashing edge,
 * and sweeps the room a cell every `step` frames. Death to what of Monty is in it. A room has several (a pause apart).
 */
export interface TunnelSpec {
  room: number; from: 'left' | 'right'; code: number; cols: number; top: number; bottom: number; step: number; rest: number; warn: number; offset?: number;
  /** How many cells thick its rock is at the top and the sides (default 1): a thick wall reads as a hill with a tunnel through it, not a doorway. */
  wall?: number;
  /**
   * A picture of its own instead of the portal (a train): `rows` rows of `cols` room characters (1-8; 0 leaves the cell as the room has it), the first row at `top`, as it
   * sweeps in the direction it goes (its nose at the leading end).
   */
  picture?: readonly (readonly number[])[];
  /** It runs only between these playfield columns (inclusive), coming in at one end of them and gone at the other: a car over a one-lane bridge, in place of the whole room's width. */
  span?: { readonly from: number; readonly to: number };
}

/**
 * Cracking ice (cracks.ts): `cols` cells on playfield row `row` from `col`, shown as the room's tiles `codes` (whole, lines, wide;
 * 1-8) and gone after standing on it for `crack`, `wide` and `gone` frames, back whole `away` frames after it went.
 */
export interface CrackSpec { room: number; col: number; cols: number; row: number; codes: readonly [number, number, number]; crack: number; wide: number; gone: number; away: number }

/**
 * A character an animation moves: a room's own (its code 1-8), or one of a decoration's (the cell `cell` of its type `decor`, counted
 * row by row, the decoration being in the room: its characters are the room's own for as long as it is there).
 */
export type CharRef = number | { readonly decor: number; readonly cell: number };

/**
 * Characters that change picture as a room runs (charanim.ts), every `every` steps (a step is every other frame):
 * - `scroll`: each ring of `rings` is a strip of characters side by side whose picture slides `px` pixels left (`dx` -1) or right (1) a time,
 *   what leaves one end coming in at the other: landscape going by a window, the sleepers under a train;
 * - `cycle`: `chars` take the next of `frames` in turn (`chars.length * 8` bytes each): a wheel's spokes.
 * `fromCol`: it runs only while Monty is at that playfield column or beyond (a train that pulls out when he is aboard); none: always.
 */
export type CharAnim =
  | { readonly kind: 'scroll'; readonly room: number; readonly rings: readonly (readonly CharRef[])[]; readonly dx: 1 | -1; readonly px: number; readonly every: number; readonly fromCol?: number }
  | { readonly kind: 'cycle'; readonly room: number; readonly chars: readonly CharRef[]; readonly frames: readonly Uint8Array[]; readonly every: number; readonly fromCol?: number };

/**
 * Timed strikes (pulses.ts): the cells `cols` wide and `rows` tall at playfield cell `col`, `row` are harmless at rest (the room's character `idle`, 0 for
 * empty), flicker with `warn` for `warn` frames (the warning: a lit fuse, an arm twitching) from `start` frames into each `period` of the room's, are deadly
 * for `live` frames (shown as `live`: a bang, an arm reaching down), then show `spent` (a scrap; 0 empty) until the period comes round. Codes are the room's
 * characters 1-8. A string of firecrackers is a row of these started one after another.
 */
export interface PulseSpec {
  room: number; col: number; row: number; cols: number; rows: number;
  period: number; start: number; warn: number; live: number;
  /** Frames into its period it is at when the room loads (a row of doors that open one after another), default 0. */
  offset?: number;
  idle: number; warnCode: number; liveCode: number; spent: number;
}

/**
 * A dragon (dragons.ts): pieces on sprites of their own that follow one closed path through the room, `speed` pixels a frame, each `gap` pixels of the path
 * behind the one in front, the first leading. `path`: the corners of the path as playfield cells (the top left of the first piece's picture, fractions
 * allowed), made smooth. A piece is shown on the VIC sprite `sprite` in `colour` as the pictures `frames` (sprite pointers: the pictures of going left, then those of going right, as many each; the head's two are its mouth open and shut); each is a 24 by 21 hires block.
 * Anything of Monty it touches is death.
 */
export interface DragonSpec {
  room: number; path: readonly (readonly [col: number, row: number])[]; speed: number; gap: number;
  pieces: readonly { sprite: number; frames: readonly number[]; colour: number }[];
}

/**
 * Rising lava (lava.ts; the Pacific's volcano): from `col`, `cols` wide, the lava starts with its top at playfield row `baseRow` when Monty comes into the room and rises a row every
 * `stepFrames` frames to row `topRow`, holds there for `holdFrames`, drains a row every `drainFrames` back to `baseRow` and rises again. It fills the cells down to the floor of the room that are empty
 * (or hold a decoration), as the room's character `code` (its crest, on the top row, as `crest`: both passable ones, the death is the lava's own) and kills what of Monty is in it (event 1, as a crusher's head).
 */
export interface LavaSpec {
  room: number; col: number; cols: number; baseRow: number; topRow: number; stepFrames: number; holdFrames: number; drainFrames: number; code: number; crest: number;
}

/**
 * A flight room (flight.ts; the Andes' parachute drop): Monty is under a canopy there and flies as the jetpack does, but slowly: he sinks a pixel every other frame (down held, a pixel every frame),
 * steers sideways at his walking pace, and cannot rise by himself. Each updraft (`cols` wide from playfield column `col`, from row `top` down to `bottom`, default the room's last) lifts him
 * a pixel a frame while he is in it. A solid tile stops him as it does on foot (he rests on a ledge and steps off it); the canopy is the sprite `canopy` shows, its pictures `frames` (left, level, right).
 */
export interface FlightSpec {
  room: number;
  updrafts: readonly { readonly col: number; readonly cols: number; readonly top: number; readonly bottom?: number }[];
}

/** The pointers (in the bank) and colour of the canopy over Monty in a flight room: leaning left, level, leaning right. */
export interface CanopyLook { left: number; level: number; right: number; colour: number }

/**
 * A rolling boulder (rollers.ts; Machu Picchu's terraces): a sprite on the VIC sprite `sprite` (one the room does not use) that rolls along `path` (playfield cells: the top left of its 16 by 16 picture, fractions
 * allowed; straight lines between the points, a fall is a vertical line) at `speed` pixels a frame, every `every` frames, the first `start` frames into the room's time. It is gone when it reaches the path's end
 * until it comes round again. It shows `frames` (four pictures, one a turn of 8 pixels) in `colour`, and kills what of Monty it touches.
 */
export interface RollerSpec {
  room: number; sprite: number; path: readonly (readonly [col: number, row: number])[]; speed: number; every: number; start: number; frames: readonly number[]; colour: number;
}

/**
 * A swinging vine (vines.ts; the Amazon's canopy): `length` cells of rope (the room's character `code`, a rope tile) hanging from playfield cell `col`, `top`, swinging like a pendulum: its tip is `amplitude` cells
 * to either side at the ends of a swing of `period` frames, `phase` frames into it when the room loads. Monty takes hold of it as of any rope and is carried with it while he hangs on, letting go by jumping.
 */
export interface VineSpec { room: number; col: number; top: number; length: number; period: number; amplitude: number; phase: number; code: number }

/**
 * Sugarloaf's cable car (cablecars.ts): two cars on one cable between two stations of a room. Standing on the foot of a station (`col`, two cells wide, on its floor `row`: the car's door, at the cable's end of the
 * platform) puts Monty aboard the car waiting there; it climbs or descends the cable `frames` frames, the other car passing it the other way, and sets him down on the other station's foot, where he must step off
 * (walking back onto a foot rides back). The car is two sprites over his box, a hires 24 by 21 block each: its roof behind him (`roof`, on a VIC sprite not used by the room) and its floor and rail in front
 * (`floor`), placed from Monty's place by `dx` (from his left edge) and `roofDy`, `floorDy` (from his top); the other car takes the two sprites `passing`.
 */
export interface CableStation { col: number; row: number }
export interface CableCarSpec {
  room: number; low: CableStation; high: CableStation; frames: number;
  roof: { ptr: number; sprite: number }; floor: { ptr: number; sprite: number }; passing: { roof: number; floor: number }; colour: number;
  /** The car's pictures sit this many pixels left of Monty's left edge and this far above his top (the roof) or his floor (the floor sprite's top). */
  dx: number; roofDy: number; floorDy: number;
}

/**
 * Floats (floats.ts; the carnival's parade): a platform `w` cells wide with a painted piece over it (the decoration `decor`, `w` by `h` cells, drawn in the room's characters) that crosses a room from one end of a
 * span to the other a cell every `step` frames: `dir` 1 goes right, -1 left. Its deck is a row of the room's solid-from-above tile `deck` (a code 1-8) at playfield row `row`, the piece standing on it. A float
 * enters at the span's start and leaves at its end (it is cut off there) and comes round again `every` cells of its travel later (at least the span and its width; the room's floats of one lane are specs with different `offset`s, a count of
 * cells into the cycle at the room's loading). He stands on a deck and is carried with it.
 */
export interface FloatSpec {
  room: number; row: number; span: { from: number; to: number }; dir: 1 | -1; step: number; every: number; w: number; offset: number; deck: number; decor: number; h: number;
  /** Where the room lists the decoration (playfield cell): the float draws it itself, so the static one is cleared when the room loads. */
  home: readonly [col: number, row: number];
}

/**
 * The gaucho's swinging skewer (skewers.ts): a sprite that follows the creature in slot `slot` of the room (its hand), swinging through the `poses` (each: the sprite pointer facing left and facing right and where its block is
 * from the creature's top left) once every `cycle` frames, `offset` frames into it when the room loads. The poses that `deadly` names (indexes) kill what of Monty they touch (event 1: the box test of the dragon and the boulders).
 */
export interface SkewerSpec {
  room: number; slot: number; sprite: number; cycle: number; offset: number; colour: number;
  poses: readonly { left: { ptr: number; dx: number; dy: number; w: number; h: number }; right: { ptr: number; dx: number; dy: number; w: number; h: number }; deadly: boolean }[];
}

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

/** The stretch of the exit grid the pause screen's map shows while Monty is in it (a region): columns `from` to `to`, and the rows `rows` (all of them if it has none: a region of a few rows on a tall grid names its own). */
export interface MapRegion { from: number; to: number; rows?: { from: number; to: number } }

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
  /** The lines under the last place's credits (the port's, `PORT_CREDITS`, unless the game gives its own: a new game is not a port). */
  closing?: readonly string[];
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
  tunnels: readonly TunnelSpec[];
  cracks: readonly CrackSpec[];
  /** Characters that scroll or cycle as the room runs (a train's window and the ground under it); none in Monty on the Run. */
  charAnims: readonly CharAnim[];
  pulses: readonly PulseSpec[];
  /** Rooms of open water (swim.ts: Monty swims as the jetpack flies, slower and buoyant); none in Monty on the Run. */
  swimRooms: readonly number[];
  risingLava: readonly LavaSpec[];
  dragons: readonly DragonSpec[];
  /** Rooms where Monty flies under a canopy (flight.ts), with the canopy's look; none in Monty on the Run (its jetpack rooms are `jetpackRooms`). */
  flights: readonly FlightSpec[];
  canopy: CanopyLook | null;
  rollers: readonly RollerSpec[];
  vines: readonly VineSpec[];
  cableCars: readonly CableCarSpec[];
  floats: readonly FloatSpec[];
  skewers: readonly SkewerSpec[];
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
  progress: { keyItems: readonly number[]; cakes: readonly number[]; sectorColours: readonly number[]; /** What the cakes are called on the pause screen (Monty on the Run's cupcakes: CAKES; Do Svidaniya Monty's pirozhki and every region's food: SNACKS). */ foodName?: string };
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
