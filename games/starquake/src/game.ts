import { newEnemy, type Enemy } from './enemies';
import { Rng } from './rng';

export interface CachedEnemies {
  enemies: Enemy[]; colour: number[]; ptr: number[]; x: number[]; y: number[]; enable: number; msb: number;
}
import { Screen, installSprites } from './screen';

/**
 * Starquake's state: what the original keeps in zero page and its tables,
 * in named fields (the original's address is noted on each). The game's
 * routines live in the other modules as functions of this state; their names
 * and comments give the original's address, so each can be checked against
 * the disassembly.
 */

/** An item in the world ($0890-$08E0: column, row, room, graphic; column 0 = not placed yet). */
export interface Item { col: number; row: number; roomLo: number; roomHi: number; graphic: number }
/** A thing shown in the room ($0923, $093D, $0957: graphic ($FF = free slot), column, row). */
export interface Shown { graphic: number; col: number; row: number }

/** A sparking cell pair ($0990, 9 bytes each). */
export interface Spark { on: number; period: number; onTime: number; bitmap: number; cell: number; timer: number; phase: number }

/** The hardware sprites as the game keeps them ($9B-$AC, $5FF8, $D027). */
export class Sprites {
  /** $9B + 2n: X (low 8 bits). */
  readonly x = new Uint8Array(8);
  /** $9C + 2n: Y. */
  readonly y = new Uint8Array(8);
  /** $AB: X bit 8 per sprite. */
  msb = 0;
  /** $AC: which are on. */
  enable = 0;
  /** $5FF8: graphics pointers. */
  readonly ptr = new Uint8Array(8);
  /** $D027: colours. */
  readonly colour = new Uint8Array(8);
}

export interface Sound {
  /** $21B3: ask for an effect on a voice (0-2). */
  effect(id: number, voice: number): void;
  /** $21B6: ask for an effect only if the voice is free. */
  effectIfFree(id: number, voice: number): void;
  /** $21B9: stop all three voices. */
  silence(): void;
}

export class Game {
  readonly scr: Screen;
  /** `bank`: the 16K the VIC shows (the front end passes its Vic's). */
  constructor(bank?: Uint8Array) {
    this.scr = new Screen(bank);
    installSprites(this.scr.bank); // (the original has them with its program: BLOB, the pad and the creatures are drawn from them)
  }
  /**
   * $0400-$07FF: rooms visited ($0400-$043F, a bit per room), rooms whose
   * bonus has been given out ($0440-$047F), and for each screen cell from
   * $0480 on, which shown thing (slot) is there.
   */
  readonly lo = new Uint8Array(0x400);
  readonly rng = new Rng();
  readonly sprites = new Sprites();
  sound: Sound = { effect() {}, effectIfFree() {}, silence() {} };

  // ---- the room ---------------------------------------------------------------------------
  /** $B9/$BA: the room (0-511). */
  room = 8;
  /** $27: the colour tiles marked "room colour" are drawn in. */
  colour = 0;
  /** $28-$2B: the room's four colours. */
  readonly roomColours = [0, 0, 0, 0];
  /** $90: flags of the tiles drawn (bit 1: some cells sparkle). */
  tileFlags = 0;
  /** $06: random ink for this tile's plain cells. */
  ink = 0;
  /** $032E: per map column, a flag that hides tile $2D (a barrier that's been broken). */
  readonly barrierGone = new Uint8Array(16);
  /** $8B: frames since the room was drawn, to 50 (the energy clock). */
  frames = 0;
  /** $3E: BLOB has hit something deadly (1: an enemy; 4: the scenery; $0F: a killer). */
  dead = 0;
  /** Whether a moment's grace is on (the front end's, main.ts; grace.ts): nothing kills BLOB or takes his energy. */
  graceActive: () => boolean = () => false;
  /** $93/$94: the room's bit in the visited and bonus tables. */
  visitBit = 0; visitByte = 0;

  // Objects the room's tiles mark (tile info, $48A3).
  /** $03F6: teleports, doors and lift tops: [type, column, row], `objectCount` ($69 ÷ 3) of them. */
  objects: { type: number; col: number; row: number }[] = [];
  objectCount = 0;
  /** $7C/$7D: the hover pad's parking place (row 0: none). */
  padCol = 0; padRow = 0;
  /** $7E/$7F: where BLOB arrives by teleport or door. */
  arriveRow = 0; arriveCol = 0;
  /** $D8: a random byte drawn for each security door. */
  doorRandom = 0;
  /** $0902/$0912: places items can be put in this room; count in $B8. Not cleared between rooms. */
  readonly spawnCol = new Uint8Array(16);
  readonly spawnRow = new Uint8Array(16);
  spawnCount = 0;
  /** $85-$88: the upright barrier's top cell (a key opens it). */
  barrierCell = 0;
  /** $0A3B: flat barriers BLOB can break by falling on them ($B4 = count × 7). */
  barriers: { cell: number; col: number }[] = [];
  /** $03E6-$03F5: where enemies are made (sprite x/2, y, and the cell): filled from slot 3 down; $51 = count. */
  readonly enemyPlaceX = new Uint8Array(4);
  readonly enemyPlaceY = new Uint8Array(4);
  readonly enemyPlaceCell = new Uint16Array(4);
  enemyPlaceCount = 0;

  /** $0990: sparking cells, 5, ring index $80 (×9). */
  readonly sparks: Spark[] = Array.from({ length: 5 }, () => ({ on: 0, period: 0, onTime: 0, bitmap: 0, cell: 0, timer: 0, phase: 0 }));
  sparkAt = 0;
  /** $8C/$8E, $FF: the sparkle flicker's place (it scans the room a third at a time). */
  sparkleCell = 0x348; sparkleCount = 6;

  // ---- items --------------------------------------------------------------------------------
  /** $0890-$08F3: the 20 items in the world (pieces of the core, keys, the access card...). */
  items: Item[] = Array.from({ length: 20 }, () => ({ col: 0, row: 0, roomLo: 0, roomHi: 0, graphic: 0 }));
  /** $0923/$093D/$0957: things shown in the room, slots 1-24. */
  shown: Shown[] = Array.from({ length: 25 }, () => ({ graphic: 0xff, col: 0, row: 0 }));
  /** $0C: the last slot used. */
  shownAt = 0;
  /** $D9-$DC: what BLOB carries ($80+: nothing). */
  readonly carried = [0x80, 0x80, 0x80, 0x80];
  /** $D7: what a Cheops pyramid offers. */
  cheopsOffer = 0;

  // ---- BLOB ---------------------------------------------------------------------------------
  /** $71/$72: BLOB's cell (his top left; he's 2 cells wide, 3 when between cells, and 2 tall). */
  col = 0; row = 0;
  /** $7A/$91: the cell above and left of BLOB's (the attribute and "what's here" tables are read from it). */
  cell = 0;
  /** $6A: quarter rows (2 pixels) down from his row (low 2 bits). */
  sub = 0;
  /** $70: riding a hover pad ($80) or on foot (0). */
  riding = 0;
  /** $76: the controls this frame (joystick bits, low = pressed: 1 up, 2 down, 4 left, 8 right, $10 fire). */
  input = 0xff;
  /** $79: the controls when a platform was last asked for; $95: when something was last picked up. */
  inputPlatform = 0; inputPickup = 0;
  /** $5C: frames to his next step's animation. */
  stepTimer = 0;
  /** $9A: frames falling (to 8: the speed). */
  falling = 0;
  /** $78: fall height ($72 on landing; past $80 he breaks through a barrier). */
  fallHeight = 0x72;
  /** $F8: in a lift tube. */
  inLift = 0;
  /** $C1: frames in the room (his sparkle on arrival). */
  arrived = 0;
  /** $6C: what he bumped into this frame (attribute bits, or $10/$20/$40/$80: leaving down/up/left/right). */
  bump = 0;
  /** $77: what's beside him (from the last sideways move). */
  beside = 0;
  /** $CA, $C9: between rows, between columns (this frame). */
  offRow = 0; offCol = 0;
  /** $56: the hover pad sprite's next X. */
  padX = 0;
  /** $33-$35: the exit (code, column, row) the room was entered by; $2F-$32 kept for a restart. */
  exit = 0; exitCol = 0x15; exitRow = 0x10;
  restart = { riding: 0, exit: 0, col: 0, row: 0 };
  /** Where BLOB leaves the room to, when he does (the original returns it in X and Y). */
  exitResult = { code: 0, col: 0, row: 0 };
  /** $19: sprite 4 is the hover pad (so enemies leave it alone). */
  padShown = 0;
  /** $09BD: platforms (and broken barriers), 14, added at ring index $8A, crumbled one a frame at $89. */
  readonly platforms = Array.from({ length: 14 }, () => ({ state: 0xff, cell: 0, saved: [0, 0] }));
  platformAdd = 0; platformTick = 0;

  // ---- enemies ----------------------------------------------------------------------------
  readonly enemies: Enemy[] = Array.from({ length: 4 }, newEnemy);
  /** $3D: enemies can touch BLOB (not while his fragments fly). */
  collide = 1;
  /** $036E-$03C8: free spots by the room's edges where enemies appear (30; old ones stay). */
  readonly spawnSpots = Array.from({ length: 30 }, () => ({ cell: 0, x: 0, y: 0 }));
  /** $1F + 1. */
  spawnSpotCount = 0;
  /** $0801/$0843: the last two rooms' enemies; $58-$5B their rooms; $57 the next to use ($00/$42). */
  readonly cache: (CachedEnemies | null)[] = [null, null];
  readonly cacheRoomLo = [0, 0];
  readonly cacheRoomHi = [0xff, 0xff];
  cacheAt = 0;

  // ---- the panel's bars -------------------------------------------------------------------
  /** $D3: energy; $D4: platforms; $D5: laser charge (each 0-$78). */
  energy = 0x78; platformsLeft = 0x78; charge = 0x78;
  /** $D6: bars to redraw (bit 0 energy, 1 platforms, 2 laser). */
  panelDirty = 0;
  /** $BB-$C0: the score's six digits. */
  readonly score = [0, 0, 0, 0, 0, 0];
  /** $CC: pixels the score's rolling digits have rolled; $54: how fast; $55: frames to the next roll. */
  scoreRoll = 0; scoreSpeed = 0; scoreTimer = 0;
  /** $D1, $D2: lives (tens, units). */
  lives = [0, 4];
  /** $E3: the lives digit's roll; $E2: steps still to roll; $E7: which way (1 up, $FF down). */
  livesRoll = 0; livesSteps = 0; livesDir = 0;

  // ---- the core -----------------------------------------------------------------------------
  /** $08F4: the core's nine places: a piece still missing (its graphic, $80+ once it's back) or a part that's there. */
  readonly core = new Uint8Array(9);
  /** $08FD: which core places the five missing pieces were taken from (at the start); then which items BLOB carries, $97 of them. */
  readonly coreSlots = new Uint8Array(5);
  carriedCount = 0;

  /** $1A: the core's pieces still missing (after a visit to the core). */
  coreMissing = 5;
  /** $F9: frames to the core's beat. */
  ambient = 0;
  /** The core is complete: the game is won. */
  won = false;
  /** A screen of its own is up (teleport, door, Cheops, the core): BLOB isn't in play (the original reuses his variables then). */
  inScreen = false;

  // ---- the machine around it ------------------------------------------------------------------
  /** The sprite registers as last written ($D000-$D015 at the frame wait). */
  readonly vic = { x: new Uint8Array(8), y: new Uint8Array(8), msb: 0, enable: 0 };
  /** The controls (joystick bits, low = pressed: 1 up, 2 down, 4 left, 8 right, $10 fire). */
  joy = 0x7f;
  /** A screen is waiting for keys: five letters (teleports, heroes) or 1-5 (a Cheops trade). (For touch play.) */
  asking: 'code' | 'trade' | null = null;
  /** Where the five letters' cursor is (column, row) while they're asked for. (For touch play: the letter picked is drawn there.) */
  codeAt: { col: number; row: number } | null = null;
  /** $C5: the key held now, as the C64's keyboard scan gives it (row × 8 + column; 64 = none). */
  key = 64;

  /** $ED: the laser: frames since the last shot (to $14: ready), bit 6 while one flies, bit 7 fired from the pad. */
  laser = 0x14;
  /**
   * The shot: the way BLOB faces ($39, $3A), its direction ($EA, $EC), its cell
   * ($EE), animation ($E8 from pointer $E6), and whether it has bounced ($38).
   */
  readonly shot = { faceX: 0, faceY: 0, dx: 0, dy: 0, cell: 0, anim: 0, base: 0, bounced: 0 };

  // ---- the panel --------------------------------------------------------------------------
  /** $CD: points still to be added to the score (they count up on the panel). */
  pendingScore = 0;

  /** $30B4 and friends: points to add. */
  addScore(n: number) {
    this.pendingScore = (this.pendingScore + n) & 0xff;
  }

  /** $4B5D: reset the room's sparks, platforms and the sparkle scan. */
  resetRoomLists() {
    for (const s of this.sparks) s.on = 0;
    this.sparkAt = 0;
    for (const p of this.platforms) p.state = 0xff;
    this.platformAdd = this.platformTick = 0;
    this.barriers = [];
    this.tileFlags = 0;
    this.sparkleCell = 0x348;
    this.sparkleCount = 6;
  }
}
