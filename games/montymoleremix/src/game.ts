import { Vic } from 'c64kit';
import { CoalTally } from '../../montymole/src/coal-rules';
import { CrusherRule } from '../../montymole/src/crusher-rules';
import { imageAt, SPRITE_BYTES } from '../../montymole/src/data';
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { Enemy, EnemyState, ENEMY_COUNT, passEnemies } from '../../montymole/src/enemy-rules';
import { FloorRule } from '../../montymole/src/floor-rules';
import { GATES, type Gate } from '../../montymole/src/gates';
import { Random } from '../../montymole/src/random';
import { ROOM_COLS, ROOM_ROWS, type RoomData } from '../../montymole/src/room';
import { OBJECT_FRAMES } from '../../montymole/src/object';
import { bankImage, enemyBank, enemyCopyFlag, EVENT_SFX, jumpArc, SFX } from '../../montyotr/src/data';
import { afterLoss } from '../../shared/lives';
import { animateMonty } from '../../shared/monty/anim';
import { montyCol, montyRow, type MontyBody, type MontyInput, type MontyWorld } from '../../shared/monty/body';
import { dissolveDeath, wait, type DeathKind, type DissolveStage, type Seq } from '../../shared/monty/deaths';
import { applyMonty, decideMonty } from '../../shared/monty/physics';
import {
  animateTheme, drawHudData, drawHudFrame, nextRandom, PLAY_COL, PLAY_COLS, PLAY_ROW, PRNG_START, ROW, SCREEN, takeCoin,
  type Collectible, type Sound,
} from '../../shared/monty/screen';
import { cellRow, vicX, vicY, wantedMonty } from './coords';
import { CRUSHER_COLUMNS, CrusherPicture } from './crusher-picture';
import { isFerry, lookOfSet, type Look } from './kinds';
import { C64_OF, retile, type RemixRoom } from './retile';

/**
 * Wanted: Monty Mole Remix: Wanted's rules over Monty on the Run's Monty (docs/montymole-remix-plan.md). The room is Monty on the Run's
 * picture (the same VIC bank: characters 1-8 are the room's tiles, Monty and the creatures are sprites); the physics, the animation and
 * the deaths are the shared Monty's (games/shared/monty); the rules are Wanted's own (games/montymole/src/*-rules.ts: the creatures'
 * legs and relays, the coal and its gates, the crusher, the retractable floor), run on Wanted's data.
 *
 * Time: Monty and what the 50 Hz interrupt ran in Wanted (the crusher, the floor, the gates) go every frame, 50 a second; what Wanted
 * ran once a pass, 25 a second (the creatures, the coal), every other frame.
 *
 * Left for later stages (docs/montymole-remix-plan.md): the opening scene (a new game starts in room 0), room 16's scene (a short
 * lift here), the game over's fly-out and the ending, the front end.
 */

export const START_LIVES = 5;
/** The cell of the room grid every room is entered at: Wanted's rooms lead to one another by number, not by place (`exits`). */
export const HOME_ROW = 2, HOME_COL = 11;
/** The first of the room numbers that are not rooms of the game (the ending): no way into them yet. */
const FIRST_SCENE = 21;
/** Where room 0 takes him in (`$CDB8`: the scene leaves him there), and room 16's pit and where it lifts him (`$96D9`). */
const ROOM0_ARRIVAL = { x: 0x18, y: 0x27 } as const;
export const PIT_ROOM = 16, PIT_Y = 0x41, PIT_ARRIVAL = { x: 0xc0, y: 0xa1 } as const;
/** Frames on his feet after which a room's way in is a place to start again from (as Monty on the Run's). */
export const SAFE_FRAMES = 100;
/** Where Wanted puts him coming into a room from the left (x 2) and from the right (x $EE): the sprite's x2 for them. */
export const ARRIVE_LEFT_X2 = 0x1c + (2 >> 1), ARRIVE_RIGHT_X2 = 0x1c + (0xee >> 1);

/** The sprites of the room's creatures (records 0-5), the tool's, and Monty's. */
const CREATURE_SPRITE = [1, 2, 4, 5, 6, 7] as const;
const TOOL_SPRITE = 0;
const MONTY_SPRITE = 3;
/** The sprite bit of every creature, to read the collisions. */
const CREATURES_BITS = CREATURE_SPRITE.reduce((m, n) => m | (1 << n), 0);
/** Where each creature's eight frames are in the bank: pointers (a frame is 64 bytes). Monty on the Run keeps four slots at $30; two more are in its free space. */
const creaturePtr = (slot: number): number => (slot < 4 ? 0x30 + slot * 8 : 0xc8 + (slot - 4) * 8);
/** The tool's picture is Wanted's own, put in the sprite block Monty on the Run keeps its first item in (pointer $8E; its items are not used here). */
export const TOOL_PTR = 0x8e;
/** The coal's piece: Wanted's own picture of it in this room, one character (free in Monty on the Run's set). */
export const COAL_CHAR = 0x0a;
/** The crusher's picture is drawn with characters $10-$2F, as many different cells as it has on the screen at once. */
const CRUSHER_CHAR = 0x10, CRUSHER_CHARS = 0x20;

/** Where Monty came into a room. */
export interface Entry { room: number; x2: number; y: number; facing: number }

export interface Assists {
  /** Unlimited lives and continues (shared/lives.ts): a death takes no life. */
  lives: boolean;
  /** No death loops: a death before he has had a moment on his feet in the room starts him again where he last had one. */
  loops: boolean;
}

/** The kind of death an event is: a creature's touch, a crusher, the water. */
const DEATHS: Readonly<Record<number, DeathKind>> = { 2: 'noise', 4: 'crusher', 5: 'sink' };

export class RemixGame implements MontyBody, MontyWorld, DissolveStage {
  readonly vic = new Vic();
  readonly mem = this.vic.bank;
  readonly col = this.vic.colour;
  sound: Sound = { sfx() {}, song() {}, stop() {} };
  assist: Assists = { lives: false, loops: false };
  /** Whether a moment's grace is on (the front end's): he can't be killed. */
  graceActive: () => boolean = () => false;
  onRoomLoaded: (g: RemixGame) => void = () => {};

  // ---- frame / flow -------------------------------------------------------------
  frameToggle = 0;
  freeze = 1;
  gameMode = 0;
  actionCounter = 0;
  roomExit = 0;
  script: Seq | null = null;
  finished: 'gameover' | null = null;

  // ---- input --------------------------------------------------------------------
  input: MontyInput = { left: false, right: false, up: false, down: false, fire: false };
  inputFire = false;

  // ---- world --------------------------------------------------------------------
  /** Wanted's room number */
  roomId = 0;
  mapRow = HOME_ROW;
  exitCol = HOME_COL;
  roomFlags = 0;
  readonly tileProps = new Uint8Array(8);
  readonly roomColours = new Uint8Array(8);
  /** the room's 32 x 20 cells as they are now (retiled; the gates and the floor rewrite them): what Monty's physics reads */
  readonly cells = new Uint8Array(ROOM_COLS * ROOM_ROWS);
  room: RemixRoom = retile(roomData(0));

  // ---- Monty --------------------------------------------------------------------
  x2 = 0;
  y = 0;
  facing = 0x01;
  frameIndex = 0x54;
  stepGate = 0;
  savedX = 0;
  savedY = 0;
  montyAction = 0;
  falling = 0;
  arcIdx = 0;
  savedLeft = false;
  savedRight = false;
  onRope = 0;
  isMoving = false;
  dirLeft = false; dirRight = false; dirUp = false; dirDown = false;
  upSteps = 0; downSteps = 0;
  animTimer = 1;
  ticker = 0xff;
  stateCur = 0; statePrev = 0;

  // ---- score --------------------------------------------------------------------
  score = 0;
  lives = START_LIVES;
  hiScore = 0;

  // ---- sprites ------------------------------------------------------------------
  sptr = new Uint8Array(8);
  enable = 0;
  collisionStore = 0;
  /** the passes the creatures have made (25 a second) */
  passes = 0;
  /** the sprite bits the creatures and the tool have on now */
  private shown = 0;

  // ---- Wanted's things ----------------------------------------------------------
  readonly coal = new CoalTally();
  /** the coins on the screen (the coal's pieces still there, by piece number) */
  entities: Collectible[] = [];
  readonly creatures: Enemy[] = Array.from({ length: ENEMY_COUNT }, () => new Enemy());
  /** each creature's look: a Monty on the Run type or Wanted's own frames (null: it is never seen), fixed as the room is loaded */
  readonly creatureType: (Look | null)[] = new Array<Look | null>(ENEMY_COUNT).fill(null);
  readonly crusher = new CrusherRule();
  readonly floor = new FloorRule();
  /** where the floor's right piece starts (it shrinks back to there) */
  private floorStart = 0;
  /** the room's tool: where it lies and which, until it is taken; and whether he carries it */
  tool: { x: number; y: number; frame: number } | null = null;
  carrying = false;
  /** the tool's colour: the ink Wanted draws its place in */
  private toolColour = 1;
  /** the gates open now (by index of GATES), and the one opening: its next cell */
  readonly gateOpen = [false, false, false, false];
  private gateStep = -1;
  private gateWait = 0;
  /** the crusher's cells as drawn last (restored before it is drawn again), and the class of each (a ledge where its picture has a pixel on the cell's top row) */
  private crusherDrawn: number[] = [];
  /** the steps the crusher has made since the room was entered (the tests bring the faithful one to the same step) */
  crusherSteps = 0;
  readonly crusherProp = new Uint8Array(ROOM_COLS * ROOM_ROWS);
  /** the cells a creature that holds him up (a ferry) has a pixel in the top row of: a ledge for now (placeSprites) */
  readonly creatureProp = new Uint8Array(ROOM_COLS * ROOM_ROWS);
  /** its colour: the ink of the room's cell under its head at the bottom (a character has one colour: a cell it shares with the room's rock takes it too) */
  private crusherColour = 1;
  /** its picture as the original keeps it */
  readonly crusherPicture = new CrusherPicture();
  /** Wanted's generator (`$FD9B`): the crusher's waits, a chaser's aim */
  readonly wanted = new Random(0x2c5a);
  prng = Uint8Array.from(PRNG_START);

  /** the rooms loaded so far, and the way the last was entered by (0 up, 1 down, 2 left, 3 right, -1 a death or no way: the same room again) */
  roomLoads = 0;
  enteredBy = -1;

  /** where Monty came into this room (a death starts him again there) */
  entry: Entry = { room: 0, x2: 0, y: 0, facing: 0x01 };
  feetFrames = 0;
  /** The last way into a room he had SAFE_FRAMES on his feet after (ENHANCED's no death loops goes there after a death sooner than that). */
  safeEntry: Entry | null = null;

  constructor() {
    this.mem.set(bankImage);
    this.vic.screenOffset = SCREEN;
    this.vic.background = 0;
    this.vic.border = 0;
  }

  // ---- copying -----------------------------------------------------------------------

  /**
   * This game in the state of another (between frames, no sequence running): every field that changes as the game is played, so that a
   * search can try ahead on copies (test/bot.ts) and what goes on from the copy is what would go on from the original. What belongs to
   * whoever runs the game (its sound, its hooks, the assists) is left as it is. test/game.ts compares every field of the two.
   */
  copyFrom(o: RemixGame): void {
    this.frameToggle = o.frameToggle; this.freeze = o.freeze; this.gameMode = o.gameMode; this.actionCounter = o.actionCounter;
    this.roomExit = o.roomExit; this.finished = o.finished; this.script = null;
    this.input = { ...o.input }; // (a new object: the front end hands the game its own sticks, which are not ours to change)
    this.inputFire = o.inputFire;
    this.roomId = o.roomId; this.mapRow = o.mapRow; this.exitCol = o.exitCol; this.roomFlags = o.roomFlags;
    this.tileProps.set(o.tileProps); this.roomColours.set(o.roomColours); this.cells.set(o.cells);
    this.room = o.room;
    this.x2 = o.x2; this.y = o.y; this.facing = o.facing; this.frameIndex = o.frameIndex; this.stepGate = o.stepGate;
    this.savedX = o.savedX; this.savedY = o.savedY; this.montyAction = o.montyAction; this.falling = o.falling; this.arcIdx = o.arcIdx;
    this.savedLeft = o.savedLeft; this.savedRight = o.savedRight; this.onRope = o.onRope; this.isMoving = o.isMoving;
    this.dirLeft = o.dirLeft; this.dirRight = o.dirRight; this.dirUp = o.dirUp; this.dirDown = o.dirDown;
    this.upSteps = o.upSteps; this.downSteps = o.downSteps; this.animTimer = o.animTimer; this.ticker = o.ticker;
    this.stateCur = o.stateCur; this.statePrev = o.statePrev;
    this.score = o.score; this.lives = o.lives; this.hiScore = o.hiScore;
    this.sptr.set(o.sptr); this.enable = o.enable; this.collisionStore = o.collisionStore; this.passes = o.passes; this.shown = o.shown;
    o.coal.flags.forEach((f, i) => { this.coal.flags[i] = f; });
    this.entities.length = o.entities.length;
    o.entities.forEach((e, i) => { const mine = this.entities[i]; if (mine === undefined) this.entities[i] = { ...e }; else { mine.at = e.at; mine.phase = e.phase; mine.index = e.index; } });
    o.creatures.forEach((e, i) => {
      const mine = this.creatures[i];
      if (mine === undefined) return;
      mine.state = e.state; mine.colour = e.colour; mine.link = e.link; mine.dir = e.dir; mine.x = e.x; mine.y = e.y;
      mine.legs = e.legs; mine.counter = e.counter; mine.left = e.left; mine.step = e.step;
      for (let k = 0; k < 4; k++) mine.sets[k] = e.sets[k] ?? 0;
      mine.spare[0] = e.spare[0] ?? 0; mine.spare[1] = e.spare[1] ?? 0;
    });
    o.creatureType.forEach((t, i) => { this.creatureType[i] = t; });
    const c = this.crusher, oc = o.crusher;
    c.column = oc.column; c.y = oc.y; c.lowest = oc.lowest; c.wait = oc.wait; c.direction = oc.direction; c.highest = oc.highest;
    o.floor.b.forEach((b, i) => { this.floor.b[i] = b; });
    this.floorStart = o.floorStart;
    this.tool = o.tool === null ? null : { ...o.tool };
    this.carrying = o.carrying; this.toolColour = o.toolColour;
    o.gateOpen.forEach((b, i) => { this.gateOpen[i] = b; });
    this.gateStep = o.gateStep; this.gateWait = o.gateWait;
    this.crusherDrawn = o.crusherDrawn.slice();
    this.crusherSteps = o.crusherSteps; this.crusherProp.set(o.crusherProp); this.creatureProp.set(o.creatureProp); this.crusherColour = o.crusherColour;
    this.crusherPicture.copyFrom(o.crusherPicture);
    this.wanted.seed = o.wanted.seed;
    this.prng.set(o.prng);
    this.roomLoads = o.roomLoads; this.enteredBy = o.enteredBy;
    this.entry = { ...o.entry };
    this.feetFrames = o.feetFrames;
    this.safeEntry = o.safeEntry === null ? null : { ...o.safeEntry };
    // the picture
    const v = this.vic, ov = o.vic;
    v.bank.set(ov.bank); v.colour.set(ov.colour);
    ov.sprites.forEach((r, i) => { const mine = v.sprites[i]; if (mine !== undefined) { mine.x = r.x; mine.y = r.y; mine.ptr = r.ptr; mine.colour = r.colour; } });
    v.enable = ov.enable; v.multicolour = ov.multicolour; v.priority = ov.priority; v.expandX = ov.expandX; v.expandY = ov.expandY;
    v.mc1 = ov.mc1; v.mc2 = ov.mc2; v.border = ov.border; v.background = ov.background;
    v.charOffset = ov.charOffset; v.screenOffset = ov.screenOffset; v.bitmap = ov.bitmap; v.bitmapOffset = ov.bitmapOffset;
  }

  // ---- the room, as Monty's physics asks -----------------------------------------

  /** The collision class of the cell at a screen row and column (the gutters hold what the room's edge cells do). */
  flagAt(row: number, col: number): number {
    const r = row - PLAY_ROW;
    if (r < 0 || r >= ROOM_ROWS || col < 2 || col > 37) return 0;
    const c = Math.min(ROOM_COLS - 1, Math.max(0, col - PLAY_COL));
    const code = this.cells[r * ROOM_COLS + c] ?? 0;
    const room = code >= 1 && code <= 8 ? this.tileProps[code - 1] ?? 0 : 0;
    // (the crusher is a picture on the room: where it has a pixel on a cell's top row it holds him from above, as the original's picture does)
    return room !== 0 ? room : this.crusherProp[r * ROOM_COLS + c] || this.creatureProp[r * ROOM_COLS + c] || 0;
  }

  /** The room a way out leads to: Wanted's graph, from the room's four exits ($FF: none yet, or the way is one of the scenes). */
  roomAt(row: number, col: number): number {
    const dr = row - HOME_ROW, dc = col - HOME_COL;
    const exits = roomData(this.roomId).exits;
    const to = dr === -1 && dc === 0 ? exits.up : dr === 1 && dc === 0 ? exits.down : dr === 0 && dc === -1 ? exits.left : dr === 0 && dc === 1 ? exits.right : 0xff;
    return to >= FIRST_SCENE || to === 0xff || to === 0x2c ? 0xff : to;
  }

  private rowAddr(row: number): number { return SCREEN + Math.min(row & 0xff, 25) * ROW; }
  get montyChr(): number { return this.rowAddr(montyRow(this)) + montyCol(this); }
  private setCol(addr: number, v: number) { const i = addr - SCREEN; if (i >= 0 && i < 1024) this.col[i] = v & 15; }
  /** Monty on the Run's random byte (GenerateRandomNumber): the dissolve's noise. */
  random(): number { return nextRandom(this.prng); }

  // ---- game start ---------------------------------------------------------------

  /** A new game: room 0, as the opening scene leaves him (the scene itself is a later stage). */
  start(): void {
    this.mem.set(bankImage);
    this.mem.fill(0, SCREEN, SCREEN + 1024);
    this.col.fill(3);
    this.lives = START_LIVES;
    this.score = 0;
    this.coal.reset();
    this.gateOpen.fill(false);
    this.finished = null;
    this.actionCounter = 0;
    this.gameMode = 0;
    this.montyAction = 0;
    this.falling = 0;
    this.onRope = 0;
    this.carrying = false;
    this.enable = 0;
    this.script = null;
    this.feetFrames = 0;
    this.safeEntry = null;
    this.facing = 0x01;
    this.stepGate = 0;
    this.animTimer = 1;
    this.ticker = 0xff;
    this.roomId = 0;
    this.mapRow = HOME_ROW;
    this.exitCol = HOME_COL;
    this.x2 = 0x1c + (ROOM0_ARRIVAL.x >> 1);
    this.y = 0xf9 - ROOM0_ARRIVAL.y;
    drawHudFrame(this, this.score, this.hiScore, this.lives);
    this.roomExit = 1; // the main thread loads the first room
    this.freeze = 1;
  }

  /** `score` (Wanted's coal worth) and the high score. */
  addScore(points: number): void {
    this.score += points;
    if (this.score > this.hiScore) this.hiScore = this.score;
    drawHudData(this, this.score, this.hiScore, this.lives);
  }

  sfx(id: number, onlyWithoutMusic = false): void { this.sound.sfx(id, onlyWithoutMusic); }

  /**
   * A line of text under the room, in the score row's letters (the rows under the room are empty: Wanted's rooms have no names). ENHANCED's
   * coal count. A room's loading clears it, so the front end puts it back every frame; null: none.
   */
  note(text: string | null): void {
    const at = SCREEN + 23 * ROW + PLAY_COL;
    for (let i = 0; i < PLAY_COLS; i++) {
      const ch = text?.charCodeAt(i);
      this.mem[at + i] = ch === undefined ? 0 : ch === 32 ? 0x60 : (ch & 0x3f) | 0x40; // ($60: the score row's space; 0 is a glyph of Monty on the Run's, not shown in black)
      this.col[at + i - SCREEN] = ch === undefined ? 0 : 7;
    }
  }

  // ---- the frame -----------------------------------------------------------------

  /** One 50 Hz frame. `collisions` = sprite-sprite collision bits from the last drawn frame. */
  frame(collisions: number): void {
    this.frameToggle ^= 1;
    this.processSprites(collisions);
    if (!this.freeze) {
      this.moveMonty();
      this.noteFeet();
      this.interrupt();
      this.takeTool();
      this.touchCreature();
    }
    if ((this.actionCounter & 0x80) || !this.freeze) {
      if (this.frameToggle) {
        this.creaturesPass();
        this.collectCoal();
        this.flicker();
        animateTheme(this.mem, this.roomFlags);
      }
    }
    this.mainThread();
  }

  /** Monty's move: the shared physics and animation. */
  private moveMonty(): void {
    if (!this.gameMode) {
      decideMonty(this, this, { arc: jumpArc, canJump: true, onJump: () => { this.sfx(SFX.jump, true); } });
      applyMonty(this, this);
    }
    animateMonty(this);
    this.enable |= 0x08;
  }

  /** On his feet (standing or on a rope) a moment: this room's way in is somewhere he can start again from. */
  private noteFeet(): void {
    if (this.feetFrames >= SAFE_FRAMES || this.gameMode || this.actionCounter) return;
    if (this.falling || this.montyAction) return;
    if (++this.feetFrames === SAFE_FRAMES) this.safeEntry = { ...this.entry };
  }

  /** Whether this room's way in has proved somewhere to start again from (SAFE_FRAMES on his feet after it). */
  get entrySafe(): boolean { return this.feetFrames >= SAFE_FRAMES; }

  /** What Wanted's interrupt routine ran 50 times a second: the retractable floor, the gates, the crusher. */
  interrupt(): void {
    this.stepFloor();
    this.stepGates();
    this.stepCrusher();
  }

  // ---- sprites ---------------------------------------------------------------------

  private processSprites(collisions: number): void {
    this.collisionStore = collisions;
    const v = this.vic;
    const s = v.sprites[MONTY_SPRITE];
    if (s === undefined) throw new Error('the VIC has no sprite 3');
    if (!(this.actionCounter & 0x80)) {
      s.x = this.x2 * 2 | this.stepGate;
      s.y = (this.y + 1) & 0xff;
      this.sptr[MONTY_SPRITE] = this.frameIndex;
    }
    s.ptr = this.sptr[MONTY_SPRITE] ?? 0;
    s.colour = 0x0f;
    v.enable = this.enable | this.shown;
    v.expandX = v.expandY = v.multicolour = v.priority = 0;
    if (!(this.actionCounter & 0x80)) this.enable &= 0xf7;
  }

  // ---- room loading ------------------------------------------------------------------

  private setCell(col: number, row: number, code: number): void {
    this.cells[row * ROOM_COLS + col] = code;
    const at = SCREEN + (row + PLAY_ROW) * ROW + PLAY_COL + col;
    const colour = code >= 1 && code <= 8 ? this.roomColours[code - 1] ?? 0 : 0;
    const put = (a: number) => { this.mem[a] = code; this.col[a - SCREEN] = colour; };
    put(at);
    if (col === 0) { put(at - 1); put(at - 2); }
    if (col === ROOM_COLS - 1) { put(at + 1); put(at + 2); }
  }

  /** LoadRoom, as Monty on the Run's does it: the tiles into characters 1-8, the 32 x 20 cells, their colours, the gutters; then Wanted's things. */
  loadRoom(): void {
    const id = this.roomId;
    const data = roomData(id);
    this.room = retile(data);
    const room = this.room;
    this.col.fill(0, 0x78);
    for (let i = 0; i < 8; i++) {
      const slot = room.slots[i];
      this.mem.set(slot?.rows ?? new Uint8Array(8), 8 + i * 8);
      this.tileProps[i] = slot?.prop ?? 0;
      this.roomColours[i] = slot?.colour ?? 0;
    }
    for (let r = 0; r < ROOM_ROWS; r++) for (let c = 0; c < ROOM_COLS; c++) this.setCell(c, r, room.cells[r * ROOM_COLS + c] ?? 0);
    this.mem.fill(0, SCREEN + 23 * ROW, SCREEN + 25 * ROW); // (Wanted's rooms have no names: the rows under the room are empty)
    this.roomFlags = room.theme;
    // the coal: Wanted's piece in this room's picture (the castle's are not lumps), the pieces not yet taken
    this.mem.set(data.nugget, COAL_CHAR * 8);
    this.entities = [];
    for (const piece of room.coal) {
      if (!this.coal.isThere(piece.id)) continue;
      const at = SCREEN + (piece.row + PLAY_ROW) * ROW + PLAY_COL + piece.col;
      this.mem[at] = COAL_CHAR;
      this.entities.push({ at, phase: 0, index: piece.id });
    }
    // the creatures, the crusher, the floor, the tool: a new copy of the room's records (`$94C3`)
    data.enemies.forEach((rec, i) => this.creatures[i]?.fromBytes(rec));
    this.setupCreatures();
    this.crusher.enter(data);
    this.crusherSteps = 0;
    this.crusherDrawn = [];
    this.crusherProp.fill(0);
    if (this.crusher.present) {
      const tile = data.tiles[(data.map[cellRow(this.crusher.lowest - 4)]?.charCodeAt(this.crusher.column + 1) ?? 48) - 48];
      const ink = (tile?.attr ?? 7) & 7;
      this.crusherColour = ink === 0 ? 1 : C64_OF[ink] ?? 1;
    }
    this.crusherPicture.clear();
    this.floor.enter(data);
    this.floorStart = this.floor.b[4] ?? 0;
    this.tool = data.object.sprite !== 0 ? { x: data.object.x, y: data.object.y, frame: data.object.sprite } : null;
    if (this.tool !== null) this.drawTool(data, this.tool.frame);
    this.carrying = false;
    // the gates of this room that the coal has opened are open as it is drawn
    GATES.forEach((gate, i) => {
      if (gate.room !== id) return;
      this.gateOpen[i] = this.coal.taken >= gate.count;
      if (this.gateOpen[i]) this.clearGate(gate, gate.cells);
    });
    this.gateStep = -1;
    this.placeSprites();
  }

  /** Each creature's type and its frames in sprite memory (Monty on the Run's bank, unpacked as its SetupRoom does). */
  private setupCreatures(): void {
    this.creatures.forEach((e, slot) => {
      const order = e.dir < 2 ? [0, 1, 2, 3] : [2, 3, 0, 1];
      const look = order.map((k) => lookOfSet(e.sets[k] ?? 0)).find((t) => t !== null) ?? null;
      this.creatureType[slot] = look;
      if (look === null) return;
      const base = creaturePtr(slot) * 64;
      if ('type' in look) {
        const bank = enemyBank(look.type);
        for (let f = 0; f < 8; f++) {
          const src = bank.subarray(f * 32, f * 32 + 32);
          const dst = this.mem.subarray(base + f * 64, base + f * 64 + 64);
          dst.fill(0);
          for (let r = 0; r < 8; r++) {
            dst[r * 3] = src[r] ?? 0;
            dst[r * 3 + 1] = src[8 + r] ?? 0;
            dst[(8 + r) * 3] = src[16 + r] ?? 0;
            dst[(8 + r) * 3 + 1] = src[24 + r] ?? 0;
          }
        }
        if (enemyCopyFlag(look.type)) this.mem.copyWithin(base + 0x100, base, base + 0x100);
        return;
      }
      // Wanted's own frames: its four one way (directions 0 and 2) and four the other (1 and 3), 16 x 16 pixels a bit each
      const left = [e.sets[0] ?? 0, e.sets[2] ?? 0].find((a) => lookOfSet(a) !== null) ?? 0;
      const right = [e.sets[1] ?? 0, e.sets[3] ?? 0].find((a) => lookOfSet(a) !== null) ?? left;
      [left, right].forEach((set, half) => {
        for (let f = 0; f < 4; f++) {
          const src = imageAt(set + 32 * f);
          const dst = this.mem.subarray(base + (half * 4 + f) * 64, base + (half * 4 + f) * 64 + 64);
          dst.fill(0);
          for (let r = 0; r < 16; r++) {
            dst[r * 3] = src[r * 2] ?? 0;
            dst[r * 3 + 1] = src[r * 2 + 1] ?? 0;
          }
        }
      });
    });
  }

  // ---- the creatures ----------------------------------------------------------------

  /** A creature is seen: it is not gone, and the frames it is on are not blank. */
  private visible(slot: number): boolean {
    const e = this.creatures[slot];
    return e !== undefined && this.creatureType[slot] !== null && e.state !== EnemyState.none && lookOfSet(e.sets[e.dir] ?? 0) !== null;
  }

  /** `$8751`: every record once (25 a second). */
  private creaturesPass(): void {
    this.passes++;
    passEnemies(this.creatures, {
      target: wantedMonty(this.x2, this.stepGate, this.y),
      random: this.wanted,
      blocked: () => false, // (the data's creatures never chase: Wanted's chasers read the Spectrum's picture)
      moved: () => {},
    });
    this.placeSprites();
  }

  /** The creatures' and the tool's sprites at their places. */
  private placeSprites(): void {
    let shown = 0;
    this.creatureProp.fill(0);
    this.creatures.forEach((e, slot) => {
      const n = CREATURE_SPRITE[slot];
      if (n === undefined || !this.visible(slot)) return;
      this.holdFromCreature(e);
      const r = this.vic.sprites[n];
      if (r === undefined) return;
      r.x = vicX(e.x);
      r.y = vicY(e.y);
      r.ptr = creaturePtr(slot) + (e.dir === 1 || e.dir === 3 ? 4 : 0) + ((e.counter >> 1) & 3);
      r.colour = C64_OF[e.colour & 7] ?? 1;
      shown |= 1 << n;
    });
    if (this.tool !== null && !this.carrying) {
      const r = this.vic.sprites[TOOL_SPRITE];
      if (r !== undefined) {
        r.x = vicX(this.tool.x);
        r.y = vicY(this.tool.y);
        r.ptr = TOOL_PTR;
        r.colour = this.toolColour;
        shown |= 1 << TOOL_SPRITE;
      }
    }
    this.shown = shown;
  }

  /**
   * A ferry holds him up where its picture has a pixel on its top row (the original reads the bytes of the screen under his feet): the cells
   * of the row its top line starts, by the bytes the row's 16 pixels fall in at its x. Only where its top line is a cell row's first (all of the
   * ferries' are: the original's rooms are drawn that way), since the physics holds him on cells.
   */
  private holdFromCreature(e: Enemy): void {
    const set = e.sets[e.dir] ?? 0;
    if (!isFerry(set) || (e.y & 7) !== 7) return;
    const row = cellRow(e.y);
    if (row < 0 || row >= ROOM_ROWS) return;
    const img = imageAt(set + 32 * ((e.counter >> 1) & 3));
    const wide = (((img[0] ?? 0) << 8) | (img[1] ?? 0)) << 8 >> (e.x & 7);
    for (let k = 0; k < 3; k++) {
      const col = (e.x >> 3) + k;
      if (col < ROOM_COLS && ((wide >> (16 - 8 * k)) & 0xff) !== 0) this.creatureProp[row * ROOM_COLS + col] = 2;
    }
  }

  /** The world on its own for a frame (the creatures and what the interrupt runs, with no Monty: the bot's map of where things go). */
  tickWorld(): void {
    this.frameToggle ^= 1;
    this.interrupt();
    if (this.frameToggle) this.creaturesPass();
  }

  /** A touch with a creature: a death, or with the tool in hand the creature's (`$92DF`). */
  private touchCreature(): void {
    if (!(this.collisionStore & 0x08) || !(this.collisionStore & CREATURES_BITS)) return;
    if (this.carrying) { this.useTool(); return; }
    if (!this.actionCounter) this.actionCounter = 2;
  }

  /** The room's tool, Wanted's own picture of it (`$7A00 + 32 * (frame - 1)`, 16 x 16, one bit a pixel) as the 16 x 16 hires sprite the creatures are drawn as. */
  private drawTool(data: RoomData, frame: number): void {
    const from = imageAt(OBJECT_FRAMES + SPRITE_BYTES * (frame - 1));
    const base = TOOL_PTR * 64;
    this.mem.fill(0, base, base + 64);
    for (let r = 0; r < 16; r++) {
      this.mem[base + r * 3] = from[r * 2] ?? 0;
      this.mem[base + r * 3 + 1] = from[r * 2 + 1] ?? 0;
    }
    // its colour is the ink of the cell it lies in (white where that is black)
    const at = data.object;
    const tile = data.tiles[(data.map[cellRow(at.y)]?.charCodeAt(at.x >> 3) ?? 48) - 48];
    const ink = (tile?.attr ?? 7) & 7;
    this.toolColour = ink === 0 ? 1 : C64_OF[ink] ?? 1;
  }

  /** The tool is used up and the creature he is touching (the first within 15 pixels both ways) is gone. */
  private useTool(): void {
    this.carrying = false;
    this.sfx(SFX.item);
    const m = wantedMonty(this.x2, this.stepGate, this.y);
    const touched = this.creatures.find((e) => e.state !== EnemyState.none && (Math.abs(m.x - e.x) & 0xf0) === 0 && (Math.abs(m.y - e.y) & 0xf0) === 0);
    if (touched !== undefined) touched.state = EnemyState.none;
    this.placeSprites();
  }

  /** Standing on the tool takes it. */
  private takeTool(): void {
    if (this.tool === null || this.carrying) return;
    const m = wantedMonty(this.x2, this.stepGate, this.y);
    if (Math.abs(m.x - this.tool.x) >= 12 || Math.abs(m.y - this.tool.y) >= 12) return;
    this.carrying = true;
    this.tool = null;
    this.sfx(SFX.item);
    this.placeSprites();
  }

  // ---- the coal -----------------------------------------------------------------------

  /** `$95E8`, every pass: each piece's cell steps to the next colour (Wanted's paper goes one on, its ink is black): the piece flickers through them. */
  private flicker(): void {
    for (const e of this.entities) {
      e.phase = (e.phase + 1) & 7;
      this.setCol(e.at, C64_OF[e.phase] ?? 1);
    }
  }

  /** CollectCoin: the coal is Monty on the Run's coin; its worth is Wanted's. */
  private collectCoal(): void {
    const taken = takeCoin(this.mem, this.montyChr, this.entities, COAL_CHAR);
    if (taken?.item == null) return;
    const points = this.coal.take(taken.item.index);
    this.entities = this.entities.filter((e) => e !== taken.item);
    this.addScore(points);
    this.sfx(SFX.coin);
  }

  // ---- the gates -----------------------------------------------------------------------

  /** A gate's cells, from the top: its column and the rows it covers, `count` of them cleared (from the bottom). */
  private gateCells(gate: Gate): { col: number; rows: number[] } {
    const top = cellRow(gate.y);
    return { col: gate.column, rows: Array.from({ length: gate.cells }, (_, k) => top + k) };
  }

  private clearGate(gate: Gate, count: number): void {
    const { col, rows } = this.gateCells(gate);
    for (const row of rows.slice(rows.length - count)) this.setCell(col, row, 0);
  }

  /** A gate opens when its count is reached, wherever Monty is (the original's trap is gone): it clears from the bottom up. */
  private stepGates(): void {
    GATES.forEach((gate, i) => {
      if (gate.room !== this.roomId || this.gateOpen[i] || this.coal.taken < gate.count) return;
      this.gateOpen[i] = true;
      this.gateStep = 0;
      this.gateWait = 0;
      this.sfx(SFX.item);
    });
    if (this.gateStep < 0) return;
    const gate = GATES.find((g, i) => g.room === this.roomId && this.gateOpen[i]);
    if (gate === undefined) { this.gateStep = -1; return; }
    if (this.gateWait-- > 0) return;
    this.gateWait = 3;
    this.gateStep++;
    this.clearGate(gate, this.gateStep);
    if (this.gateStep >= gate.cells) this.gateStep = -1;
  }

  // ---- the retractable floor -------------------------------------------------------------

  /** The cells the floor's bar covers (at least half of a cell's eight columns), as codes: the room's platform tile where it is. */
  private stepFloor(): void {
    if (!this.floor.present || this.room.floorCode === 0) return;
    this.floor.advance(() => {});
    const b = this.floor.b;
    const left = [b[2] ?? 0, b[0] ?? 0], right = [b[4] ?? 0, this.floorStart];
    const row = cellRow(b[1] ?? 0);
    for (let col = 0; col < ROOM_COLS; col++) {
      const lo = col * 8, hi = lo + 8;
      const covered = Math.max(0, Math.min(hi, (left[1] ?? 0) + 1) - Math.max(lo, (left[0] ?? 0) + 1)) + Math.max(0, Math.min(hi, right[1] ?? 0) - Math.max(lo, right[0] ?? 0));
      const want = covered >= 4 ? this.room.floorCode : 0;
      const had = this.cells[row * ROOM_COLS + col] ?? 0;
      // the floor only owns the cells it makes: blank ones, and its own tile
      if (want !== had && (had === 0 || had === this.room.floorCode)) this.setCell(col, row, want);
    }
  }

  // ---- the crusher ------------------------------------------------------------------------

  private stepCrusher(): void {
    if (!this.crusher.present) return;
    this.crusherSteps++;
    const monty = wantedMonty(this.x2, this.stepGate, this.y);
    const step = this.crusher.advance({
      random: this.wanted,
      touches: () => this.crusherTouches(monty),
      draw: () => this.drawCrusher(),
    });
    if (step.thud) this.sfx(SFX.piledriverDescend, true);
    if (step.dead && !this.actionCounter) this.actionCounter = 4;
  }

  /** `$9148`: whether Monty is on the row under the crusher's base, in its three columns. */
  private crusherTouches(m: { x: number; y: number }): boolean {
    const c = this.crusher;
    const line = c.y - 9;
    return m.x + 16 > c.column * 8 && m.x < c.column * 8 + 24 && m.y >= line && m.y - 15 <= line;
  }

  /**
   * The crusher's picture over the room, as the original keeps it (`CrusherPicture`: the shaft it leaves going down, the head, the rows that
   * wipe the shaft going up) turned into characters: each cell it has written a row of is the room's cell with those rows put over it, in
   * the ink of the room's cell. The cells it was in are the room's again first.
   */
  private drawCrusher(): void {
    for (const at of this.crusherDrawn) {
      const r = (at / ROOM_COLS) | 0, c = at % ROOM_COLS;
      this.setCell(c, r, this.cells[at] ?? 0);
      this.crusherProp[at] = 0;
    }
    this.crusherDrawn = [];
    const cr = this.crusher;
    this.crusherPicture.put(cr.y, (cr.direction & 1) !== 0);
    const data = roomData(this.roomId);
    const chars = new Map<string, number>();
    const { first, last } = this.crusherPicture.rows;
    for (let row = first; row <= last; row++) {
      for (let i = 0; i < CRUSHER_COLUMNS; i++) {
        const col = cr.column + i;
        if (col >= ROOM_COLS) continue;
        const code = this.cells[row * ROOM_COLS + col] ?? 0;
        const under = code >= 1 && code <= 8 ? this.mem.subarray(code * 8, code * 8 + 8) : new Uint8Array(8);
        const rows = this.crusherPicture.cell(row, i, under);
        if (rows === null) continue;
        const key = rows.join(',');
        let char = chars.get(key);
        if (char === undefined) {
          if (chars.size >= CRUSHER_CHARS) throw new Error(`room ${data.id}: the crusher needs more than ${CRUSHER_CHARS} kinds of cell`);
          char = CRUSHER_CHAR + chars.size;
          chars.set(key, char);
          this.mem.set(rows, char * 8);
        }
        const at = SCREEN + (row + PLAY_ROW) * ROW + PLAY_COL + col;
        this.mem[at] = char;
        this.col[at - SCREEN] = this.crusherColour;
        this.crusherDrawn.push(row * ROOM_COLS + col);
        // holds him from above where it has a pixel on the cell's top row
        if ((rows[0] ?? 0) !== 0) this.crusherProp[row * ROOM_COLS + col] = 2;
      }
    }
  }

  // ---- the main thread: scripted sequences, events and room changes -----------------------------

  private mainThread(): void {
    if (this.script) {
      if (this.script.next().done) this.script = null;
      return;
    }
    this.dispatch();
    if (this.script) return;
    if (this.roomExit) {
      this.script = this.roomTransition();
      if (this.script.next().done) this.script = null;
    }
  }

  private *roomTransition(): Seq {
    this.freeze = 1;
    this.vic.enable = 0;
    this.enable = 0;
    this.shown = 0;
    const dr = this.mapRow - HOME_ROW, dc = this.exitCol - HOME_COL;
    this.enteredBy = dr < 0 ? 0 : dr > 0 ? 1 : dc < 0 ? 2 : dc > 0 ? 3 : -1;
    // (a way in at the side is where Wanted puts him, x 2 or $EE, not Monty on the Run's, a gutter's width further out: a ferry starts under him there)
    if (this.enteredBy === 3) { this.x2 = ARRIVE_LEFT_X2; this.stepGate = 0; } else if (this.enteredBy === 2) { this.x2 = ARRIVE_RIGHT_X2; this.stepGate = 0; }
    this.savedX = this.x2;
    this.savedY = this.y;
    this.roomLoads++;
    this.roomId = this.roomAfterExit();
    this.mapRow = HOME_ROW;
    this.exitCol = HOME_COL;
    this.loadRoom();
    // room 16's pit lifts him into room 17 (a short version of the scene: stage 6)
    if (this.roomId === PIT_ROOM && wantedMonty(this.x2, this.stepGate, this.y).y < PIT_Y) {
      this.roomId = 17;
      this.x2 = 0x1c + (PIT_ARRIVAL.x >> 1);
      this.y = 0xf9 - PIT_ARRIVAL.y;
      this.savedX = this.x2;
      this.savedY = this.y;
      this.montyAction = 0;
      this.falling = 0;
      this.loadRoom();
    }
    this.freeze = 0;
    this.gameMode = 0;
    this.actionCounter = 0;
    this.roomExit = 0;
    this.entry = { room: this.roomId, x2: this.savedX, y: this.savedY, facing: this.facing };
    this.feetFrames = 0;
    this.onRoomLoaded(this);
  }

  /** The room the exit (or a death: the same room) takes him to. */
  roomAfterExit(): number {
    const dr = this.mapRow - HOME_ROW, dc = this.exitCol - HOME_COL;
    if (dr === 0 && dc === 0) return this.roomId;
    const exits = roomData(this.roomId).exits;
    return dr < 0 ? exits.up : dr > 0 ? exits.down : dc < 0 ? exits.left : exits.right;
  }

  /** Monty.Dispatch: a pending event (2: a creature, 4: the crusher, 5: the water) becomes its sequence. */
  private dispatch(): void {
    const ac = this.actionCounter;
    if (!ac || ac & 0x80) return;
    if (this.graceActive()) { this.actionCounter = 0; return; }
    const kind = DEATHS[ac];
    if (kind === undefined) { this.actionCounter = 0; return; }
    this.freeze = 1;
    this.gameMode = 1;
    const ev = ac - 1;
    if (EVENT_SFX[ev]) this.sfx(EVENT_SFX[ev]);
    this.actionCounter = ev | 0x80;
    this.script = this.death(kind);
  }

  /** A death: his picture dissolves as Monty on the Run's does, then a life gone and the room again, or game over. */
  private *death(kind: DeathKind): Seq {
    yield* dissolveDeath(this, kind);
    this.lives = afterLoss(this.lives, this.assist.lives);
    drawHudData(this, this.score, this.hiScore, this.lives);
    if (this.lives > 0) {
      this.respawn();
      return;
    }
    yield* wait(0x80);
    this.finished = 'gameover';
  }

  /**
   * Back to where Monty came into the room, the creatures and the coal as the room had them. ENHANCED (no death loops): if he died before
   * he had a moment on his feet there, that way in may only lead into the same death again (a fall onto a creature's path): he starts
   * instead where he last came into a room and had that moment, so a life is lost once, not until the game is over.
   */
  respawn(): void {
    const safe = this.safeEntry;
    if (this.assist.loops && !this.entrySafe && safe !== null) {
      this.roomId = safe.room;
      this.entry = { ...safe };
    }
    this.x2 = this.entry.x2;
    this.y = this.entry.y;
    this.facing = this.entry.facing;
    this.savedX = this.x2;
    this.savedY = this.y;
    this.actionCounter = 0;
    this.montyAction = 0;
    this.falling = 0;
    this.roomExit = 1;
  }

  /** Send Monty to a room at a place (the pause map's travel): the next frame loads it. Nothing of a jump or a fall goes with him. */
  travelTo(room: number, x2: number, y: number, facing = 0x01): void {
    this.roomId = room;
    this.mapRow = HOME_ROW;
    this.exitCol = HOME_COL;
    this.x2 = x2;
    this.y = y;
    this.facing = facing;
    this.montyAction = 0;
    this.falling = 0;
    this.arcIdx = 0;
    this.onRope = 0;
    this.gameMode = 0;
    this.actionCounter = 0;
    this.roomExit = 1;
    this.freeze = 1;
    this.script = null;
  }

  /** Put Monty in a room at a place and let it load (the tests). */
  enterAt(room: number, x2: number, y: number, facing = 0x01): void {
    this.travelTo(room, x2, y, facing);
    for (let n = 0; n < 20 && (n === 0 || this.freeze || this.script); n++) this.frame(0);
  }
}

/** A room's data (Wanted's, from its tape). */
export function roomData(id: number): RoomData {
  const room = ROOMS[id];
  if (room === undefined) throw new Error(`Wanted has no room ${id}`);
  return room;
}
