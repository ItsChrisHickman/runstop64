import { Vic } from 'c64kit';
import {
  bankImage, coinTable, CORRECT_KIT, decorRooms, decorTypes, enemyBank, enemyColours, enemyCopyFlag, enemyDirFlags,
  enemyRecords, EVENT_SFX, exitGridImage, extensionGrid, greyPulse, isExtensionRoom, MUSIC, PLAY_COLS, PLAY_ROWS, roomDef, roomMeta, sectorName,
  specialItems, tileLibrary, tileProperty,
} from './data';
import { montyDraw } from './monty';
import * as Mech from './mechanisms';
import * as Items from './items';
import * as Scripts from './scripts';

/**
 * The game's state and frame loop — a port of the original's zero page,
 * GameFrameUpdate (run from the raster IRQ every frame) and RoomLoop (the
 * main thread). Field names follow the reconstruction's zero-page labels.
 *
 * Memory model: `mem` is VIC bank 1 ($4000-$7FFF): charset at 0, screen RAM
 * at SCREEN ($4800), sprite data by pointer. `col` is colour RAM ($D800).
 */
export const SCREEN = 0x800;
/** Frames on his feet in a room (2 seconds) after which its way in is a place to start again from (ENHANCED's respawn). */
export const SAFE_FRAMES = 100;
export const ROW = 40;

export interface Input { left: boolean; right: boolean; up: boolean; down: boolean; fire: boolean }

export interface Sound {
  /** `musicOff` effects only play when music is off, as in the original. */
  sfx(id: number, musicOff: boolean): void;
  song(n: number): void; // original Music.Init(n)
  stop(): void;
}

/** ENHANCED's changes to how the game plays (QOL.md). */
export interface Assists {
  /** Monty stands on the rising cloud and rides it to the top. */
  cloud: boolean;
  /** Only Monty himself is hit in the jetpack rooms: his jetpack touching an enemy doesn't count. */
  jetpack: boolean;
  /**
   * The C5 street: a crash starts Monty again in the room he crashed in, as he came into it, not
   * back at the tree; and fire held past the top of a hop holds it there a while (mechanisms.ts
   * C5_HOLD), a tap being the original's hop.
   */
  c5: boolean;
  /**
   * runstop64's rooms (data/runstop64-rooms.ts): the exit grid's empty cells right of the start
   * room and below it have rooms, so walking right from the start goes on into them.
   */
  rooms: boolean;
  /**
   * A death never sends Monty back into the same death: one before he's had a moment on his feet
   * since coming into the room (he came in falling into it, or onto an enemy's path) starts him
   * again where he last came into a room and had that moment, not at this room's way in
   * (Game.respawn).
   */
  respawn: boolean;
}

/** Where Monty came into a room (the room's cell, his place, the way he faced): where a death starts him again. */
export interface Entry { mapRow: number; exitCol: number; x2: number; y: number; facing: number }

/**
 * Decor.CalculateRoom's characters: each decoration type in a room takes the next characters from $9B
 * up (w × h of them) the first time it's placed; a type that doesn't fit in the pool (to $FF) isn't
 * drawn, as in the original. By type: its first character, or 0.
 */
function decorChars(roomId: number) {
  const first = new Int16Array(decorTypes.length).fill(0);
  let alloc = 0x9b;
  for (let i = 0; i + 3 < decorRooms.length; i += 4) {
    if (decorRooms[i] !== roomId) continue;
    const type = decorRooms[i + 3], t = decorTypes[type];
    if (!t || first[type]) continue;
    if (alloc + t.w * t.h > 0xff) continue; // pool exhausted: the original skips it too
    first[type] = alloc;
    alloc += t.w * t.h;
  }
  return first;
}

export interface Enemy {
  x: number; y: number; colour: number; type: number; flags: number; range: number; step: number; speed: number;
}

export class Game {
  readonly vic = new Vic();
  readonly mem = this.vic.bank;
  readonly col = this.vic.colour;
  sound: Sound = { sfx() {}, song() {}, stop() {} };
  /** ENHANCED's assists (off by default so the original stays the original). */
  assist: Assists = { cloud: false, jetpack: false, c5: false, rooms: false, respawn: false };
  /** Optional hook for QOL features (map, warp) to learn where rooms are entered. */
  onRoomLoaded: (g: Game) => void = () => {};

  // ---- frame / flow -------------------------------------------------------------
  frameToggle = 0;
  freeze = 1;
  gameMode = 0;
  actionCounter = 0;
  roomExit = 0;
  dissolvePending = 0;
  completionActive = 0;
  gameOverActive = 0;
  cheatMode = 0;
  /** Whether a moment's grace is on (the front end's, main.ts): he can't be killed. */
  graceActive: () => boolean = () => false;
  /** A running scripted sequence (death, completion, game over): advanced once per frame. */
  script: Generator<void, void, void> | null = null;
  /** Set when a scripted sequence finishes the game (back to title). */
  finished: 'gameover' | 'won' | null = null;
  /** Monty reached the boat (the game-over fly-out then plays as the finale). */
  won = false;
  /**
   * The ending under way (Completion.Begin, scripts.ts `completion`): until Monty walks aboard
   * (`aboard`), the pause screen may open and travel may take him away from it (`leaveEnding`); and
   * the multicolours as they were before it set its own (the game's own code never leaves the ending:
   * these are what leaving it puts back).
   */
  ending: { aboard: boolean; mc1: number; mc2: number } | null = null;

  // ---- input --------------------------------------------------------------------
  input: Input = { left: false, right: false, up: false, down: false, fire: false };
  inputFire = false;

  // ---- world --------------------------------------------------------------------
  roomId = 0;
  mapRow = 2;
  exitCol = 0x15;
  readonly exitGrid = Uint8Array.from(exitGridImage);
  tileProps = new Uint8Array(8); // collision class for room chars 1-8
  roomTiles = new Uint8Array(8);
  roomColours = new Uint8Array(8);
  roomFlags = 0; // theme animation (room_metadata_tbl)

  // ---- Monty --------------------------------------------------------------------
  x2 = 0x86;
  y = 0xb0;
  facing = 0x81; // player_facing: $01 right, $81 left
  frameIndex = 0x50;
  stepGate = 0; // sprite_xmsb
  savedX = 0;
  savedY = 0;
  montyAction = 0;
  falling = 0; // monty_jumping_flag2
  arcIdx = 0;
  savedLeft = false;
  savedRight = false;
  onRope = 0; // monty_tile_state
  isMoving = false;
  dirLeft = false; dirRight = false; dirUp = false; dirDown = false;
  upSteps = 0; downSteps = 0;
  animTimer = 1;
  ticker = 0xff;
  stateCur = 0; statePrev = 0;
  showJetpack = 0;
  jetpackActive = 0;

  // ---- score --------------------------------------------------------------------
  score = 0;
  lives = 5;
  hiScore = 0;

  // ---- sprites (shadow registers, flushed each frame like ProcessSprites) ---------
  sx = new Uint8Array(8); sy = new Uint8Array(8); sptr = new Uint8Array(8); scol = new Uint8Array(8);
  enable = 0; expandX = 0; expandY = 0; multicolour = 0; priority = 0;
  collisionStore = 0;

  // ---- enemies ------------------------------------------------------------------
  enemies: Enemy[] = [];
  enemyParity = new Uint8Array(4);
  enemyAnim = new Uint8Array(4);

  // ---- coins / items ------------------------------------------------------------
  coinCollected = new Uint8Array(coinTable.length / 3);
  /** In-room collectibles: screen offset, colour phase, master index (-1 = no coin, e.g. room $1F bases). */
  entities: { at: number; phase: number; index: number }[] = [];
  siCollected = new Uint8Array(specialItems.length / 4);
  siActiveIdx = -1;
  /** room_item_active[0..4]: jet pack, rope, passport, gas mask, rum — the kit always carries all five. */
  readonly roomItemActive = [1, 1, 1, 1, 1];
  readonly kit = CORRECT_KIT;
  colourCycle = 0;
  cloudTick = 0;

  // ---- mechanisms ---------------------------------------------------------------
  pd = { roomFlag: 0, state: 0, delay: 1, index: 0xff, position: 0, travel: [0, 0], spriteY: [0, 0], ride: 0 };
  lift = { type: 0, x: 0, y: 0, speedDir: 0, riding: 0, speed: 0 };
  tele = { active: 0, repeat: 0, scr: 0, colH: 0, base: 0, cur: 0, anim: 0, events: 0 };
  c5 = { active: 0, speed: 0, dir: 1, anim: 0, bounce: 0, fall: 0, fallStage: 0, rate: 1 };
  /** The C5 as it came into this room (with savedX, savedY: where a death in the room starts again). */
  c5Arrival: Mech.C5State = { ...Mech.C5_START };
  prng = new Uint8Array([0x5a, 0xa5, 0x3c, 0xc3]);
  /** Where Monty came into this room, and how many frames he's been on his feet since (on a floor, a rope or the C5's road). */
  entry: Entry = { mapRow: 2, exitCol: 0x15, x2: 0x86, y: 0xb0, facing: 0x81 };
  feetFrames = 0;
  /** The last room entry he had SAFE_FRAMES on his feet after (ENHANCED's respawn goes there after a death sooner than that). */
  safeEntry: Entry | null = null;

  constructor() {
    this.mem.set(bankImage);
    this.vic.screenOffset = SCREEN;
    this.vic.background = 0;
    this.vic.border = 0;
  }

  // ---- helpers ------------------------------------------------------------------

  /** Original GenerateRandomNumber: four-byte state; returns one byte. */
  random() {
    const r = (Math.random() * 256) | 0;
    for (let i = 0; i < 4; i++) this.prng[i] = (this.prng[i] + 0x29 + (r >> i)) & 0xff;
    return this.prng[r & 3];
  }

  pulseGreyscale() {
    this.colourCycle = (this.colourCycle + 1) & 0xff;
    return greyPulse[(this.colourCycle >> 1) & 7];
  }

  /** Screen RAM address (bank offset) of a row, like GetScreenRowAddress (row clamped to 25). */
  rowAddr(row: number) {
    return SCREEN + Math.min(row & 0xff, 25) * ROW;
  }

  chr(addr: number) { return this.mem[addr & 0x3fff]; }
  setChr(addr: number, v: number) { this.mem[addr & 0x3fff] = v & 0xff; }
  setCol(addr: number, v: number) { const i = addr - SCREEN; if (i >= 0 && i < 1024) this.col[i] = v & 15; }

  /** Collision class of a screen char (original GetTileFlag). */
  tileFlag(code: number) {
    return code >= 1 && code <= 8 ? this.tileProps[code - 1] : 0;
  }

  get montyRow() { return ((this.y - 0x32) & 0xff) >> 3; }
  get montyCol() { return ((this.x2 - 0x0c) & 0xff) >> 2; }
  /** ComputeMontyTilePointer: screen address of Monty's top-left char. */
  get montyChr() { return this.rowAddr(this.montyRow) + this.montyCol; }

  roomAt(row: number, col: number) {
    if (row < 0 || row > 5 || col < 0 || col > 22) return 0xff;
    const id = this.exitGrid[row * 23 + col];
    return id === 0xff && this.extensionOpen ? extensionGrid[row * 23 + col] : id;
  }

  /**
   * runstop64's rooms are on the grid: with the assist on, and while Monty is in one of them
   * (switched to ORIGINAL there, their ways stay open until he's back in the original's rooms).
   */
  get extensionOpen() {
    return this.assist.rooms || isExtensionRoom(this.roomId);
  }

  sfx(id: number, onlyWithoutMusic = false) { this.sound.sfx(id, onlyWithoutMusic); }

  addScore(points: number) {
    this.score += points;
    if (this.score > this.hiScore) this.hiScore = this.score;
    this.drawHudData();
  }

  // ---- game start ---------------------------------------------------------------

  start() {
    this.mem.set(bankImage);
    this.mem.fill(0, SCREEN, SCREEN + 1024);
    this.col.fill(3);
    this.lives = 5;
    this.score = 0;
    this.coinCollected.fill(0);
    this.siCollected.fill(0);
    this.exitGrid.set(exitGridImage);
    this.x2 = 0x86;
    this.y = 0xb0;
    this.facing = 0x81;
    this.mapRow = 2;
    this.exitCol = 0x15;
    this.cheatMode = 0;
    this.completionActive = 0;
    this.ending = null;
    this.gameOverActive = 0;
    this.finished = null;
    this.won = false;
    this.actionCounter = 0;
    this.gameMode = 0;
    this.dissolvePending = 0;
    this.montyAction = 0;
    this.falling = 0;
    this.onRope = 0;
    this.enable = this.expandX = this.expandY = this.multicolour = this.priority = 0;
    this.lift.riding = 0;
    this.pd.ride = 0;
    this.c5 = { active: 0, speed: 0, dir: 1, anim: 0, bounce: 0, fall: 0, fallStage: 0, rate: 1 };
    this.c5Arrival = { ...Mech.C5_START };
    this.feetFrames = 0;
    this.safeEntry = null;
    this.drawHudFrame();
    this.roomExit = 1; // RoomLoop loads the first room
    this.freeze = 1;
    this.script = null;
  }

  // ---- HUD (original HUD.Init / HUD.Update) --------------------------------------

  drawHudFrame() {
    const text = 'SCORE:           00 HI-SCORE:      ';
    for (let i = 0; i < 36; i++) {
      this.mem[SCREEN + 2 + i] = text.charCodeAt(i) === 32 ? 0x60 : (text.charCodeAt(i) & 0x3f) | 0x40;
      this.col[2 + i] = 1;
      this.col[ROW + 2 + i] = 1;
    }
    for (let x = 15; x >= 0; x--) {
      if (x < 13) this.mem[SCREEN + ROW + 2 + x] = 0x64;
      this.mem[SCREEN + ROW + 0x16 + x] = 0x64;
    }
    const icon = [0x3d, 0x3e, 0x3f, 0x40];
    [0, 1, ROW, ROW + 1].forEach((o, i) => {
      this.mem[SCREEN + 0x10 + o] = icon[i];
      this.col[0x10 + o] = 8;
    });
    this.col[0x13] = 8;
    this.col[0x14] = 8;
    this.drawHudData();
  }

  drawHudData() {
    const s = String(this.score % 100000).padStart(5, '0');
    const h = String(this.hiScore % 100000).padStart(5, '0');
    for (let i = 0; i < 5; i++) {
      this.mem[SCREEN + 0x0a + i] = (s.charCodeAt(i) & 0x3f) | 0x40;
      this.mem[SCREEN + 0x21 + i] = (h.charCodeAt(i) & 0x3f) | 0x40;
    }
    this.mem[SCREEN + 0x14] = ((Math.min(9, Math.max(0, this.lives)) + 0x30) & 0x3f) | 0x70;
  }

  // ---- the frame: original GameFrameUpdate ----------------------------------------

  /**
   * The sprites the collision check leaves out (VicView.collisions' `ignore`): with the jetpack
   * assist, the jetpack (sprite 2). In the original, its touching an enemy kills Monty: the
   * jetpack and Monty always overlap, so the hardware's bits can't tell it from Monty's own touch.
   */
  get uncounted() {
    return this.assist.jetpack && this.showJetpack && !this.c5.active ? 0x04 : 0;
  }

  /** One 50 Hz frame. `collisions` = sprite-sprite collision bits from the last drawn frame. */
  frame(collisions: number) {
    this.frameToggle ^= 1;
    this.processSprites(collisions);
    if (!this.freeze) {
      montyDraw(this);
      this.noteFeet();
      Mech.piledriverAnimate(this);
      Mech.liftSpriteUpdate(this);
      Mech.liftMovementUpdate(this);
      Mech.liftCheckContact(this);
      Mech.piledriverUpdateRide(this);
      Items.updateRisingCloud(this);
      if (this.assist.cloud) Items.cloudAssist(this);
      Items.handleCollision(this);
      Mech.piledriverCheckTiles(this);
      Items.placeTreasure(this);
      Mech.piledriverCheckContact(this);
    }
    if ((this.actionCounter & 0x80) || !this.freeze) {
      if (this.frameToggle) {
        if (!this.gameOverActive) {
          Mech.teleporterAnimate(this);
          this.enemiesTick();
          Mech.teleporterCheckContact(this);
          Items.collectCoin(this);
        } else {
          this.vic.mc1 = this.pulseGreyscale();
          Scripts.rotatePrizeChars(this);
        }
        Items.animateCharacters(this);
        this.animateThemeChar();
      }
    }
    if (this.completionActive) {
      if (this.frameToggle) Scripts.rotatePrizeChars(this);
      this.enemiesTick();
      // AnimateFlag: the Union Jack waves through pointers $A0-$A3.
      this.colourCycle = (this.colourCycle + 1) & 0xff;
      this.sptr[0] = 0xa0 + ((this.colourCycle & 0x18) >> 3);
    }
    this.mainThread();
  }

  /** The original RoomLoop: scripted sequences, event dispatch and room transitions. */
  private mainThread() {
    if (this.script) {
      if (this.script.next().done) this.script = null;
      return;
    }
    this.dispatch();
    if (this.script) return;
    if (this.roomExit) {
      // The original's RoomLoop reacts to room_exit straight away (it freezes
      // the game before the next frame), so start the transition now. Leaving
      // it a frame let Monty keep moving in the old room from his new
      // position: off the bottom edge after climbing out the top, for example.
      this.script = this.roomTransition();
      if (this.script.next().done) this.script = null;
    }
  }

  private *roomTransition(): Generator<void, void, void> {
    this.freeze = 1;
    this.vic.enable = 0;
    this.enable = 0;
    this.multicolour = 0;
    this.savedX = this.x2;
    this.savedY = this.y;
    this.c5Arrival = Mech.c5State(this);
    this.roomId = this.roomAt(this.mapRow, this.exitCol);
    this.loadRoom();
    if (this.dissolvePending) {
      this.enable |= 0x08;
      yield* Scripts.playDissolve(this);
    }
    this.freeze = 0;
    this.gameMode = 0;
    this.actionCounter = 0;
    this.dissolvePending = 0;
    this.roomExit = 0;
    this.scol[3] = 0x0f;
    if (this.showJetpack) this.montyAction = 0;
    this.entry = { mapRow: this.mapRow, exitCol: this.exitCol, x2: this.savedX, y: this.savedY, facing: this.facing };
    this.feetFrames = 0;
    this.onRoomLoaded(this);
  }

  /** On his feet (standing, on a rope, or in the C5) a moment: this room's way in is somewhere he can start again from. */
  private noteFeet() {
    if (this.feetFrames >= SAFE_FRAMES || this.gameMode || this.actionCounter) return;
    if (!this.c5.active && (this.falling || this.montyAction)) return;
    if (++this.feetFrames === SAFE_FRAMES) this.safeEntry = { ...this.entry };
  }
  /** Whether this room's way in has proved somewhere to start again from (SAFE_FRAMES on his feet after it). */
  get entrySafe() { return this.feetFrames >= SAFE_FRAMES; }

  /** Monty.Dispatch: turn a pending event (action_counter 1-7) into its sequence. */
  private dispatch() {
    const ac = this.actionCounter;
    if (!ac || ac & 0x80) return;
    // A moment's grace after a resume (games/shared/grace.ts): what would kill him (every event but the treasure's, 6) doesn't.
    if (ac !== 6 && this.graceActive()) { this.actionCounter = 0; return; }
    if (ac !== 3 && ac !== 6 && this.cheatMode & 0x80) return;
    this.freeze = 1;
    this.gameMode = 1;
    const ev = ac - 1;
    if (EVENT_SFX[ev]) this.sfx(EVENT_SFX[ev]);
    this.actionCounter = ev | 0x80;
    this.script = Scripts.eventScript(this, ev);
  }

  // ---- sprites: original ProcessSprites -------------------------------------------

  private processSprites(collisions: number) {
    this.collisionStore = collisions;
    if (this.c5.active) {
      Mech.c5SetupSprites(this);
    } else if (!this.completionActive && !(this.actionCounter & 0x80)) {
      this.sx[3] = this.x2;
      this.sy[3] = (this.y + 1) & 0xff;
      this.sptr[3] = this.frameIndex;
      if (this.showJetpack) {
        this.sptr[2] = this.jetpackActive + 0x76 + (this.facing & 0x80 ? 0 : 2);
        this.sy[2] = (this.y + 2) & 0xff;
        this.sx[2] = this.facing & 0x80 ? (this.x2 + 5) & 0xff : (this.x2 - 9) & 0xff;
        this.enable |= 0x0c;
        this.multicolour |= 0x04;
      }
    }
    // Flush shadows to the VIC. X is stored halved; the low bit comes from the
    // step-gate parity (Monty, jetpack) or each enemy's own parity.
    const v = this.vic;
    for (let n = 0; n < 8; n++) {
      const r = v.sprites[n];
      let x = this.sx[n] * 2;
      if (!this.completionActive && (n === 3 || (n === 2 && (this.c5.active || this.showJetpack)))) x |= this.stepGate;
      if (n >= 4) x |= this.enemyParity[n - 4];
      r.x = x;
      r.y = this.sy[n];
      r.ptr = this.sptr[n];
      r.colour = this.scol[n];
    }
    v.enable = this.enable;
    v.expandX = this.expandX;
    v.expandY = this.expandY;
    v.multicolour = this.multicolour;
    v.priority = this.priority;
    if (!this.completionActive) {
      if (!this.lift.type && !this.gameOverActive) this.multicolour &= 0xf0;
      if (!(this.actionCounter & 0x80)) this.enable &= 0xf1;
    }
  }

  // ---- room loading: original LoadRoom ---------------------------------------------

  loadRoom() {
    const id = this.roomId;
    const def = roomDef(id);
    this.roomTiles.set(def.tiles);
    this.roomColours.set(def.colours);
    // BlankPlayfield: colour RAM from row 3 down.
    this.col.fill(0, 0x78);
    // DrawRoomPlayfield: 32×20 at (4,3).
    for (let r = 0; r < PLAY_ROWS; r++) {
      for (let c = 0; c < PLAY_COLS; c++) this.mem[SCREEN + (r + 3) * ROW + 4 + c] = def.cells[r * PLAY_COLS + c];
    }
    // CreatePlayfieldBorder: mirror edge tiles into the gutters.
    for (let r = 3; r < 23; r++) {
      const a = SCREEN + r * ROW;
      this.mem[a + 2] = this.mem[a + 3] = this.mem[a + 4];
      this.mem[a + 36] = this.mem[a + 37] = this.mem[a + 35];
    }
    // SetupTileGraphics: room tiles into chars 1-8, collision classes.
    for (let i = 0; i < 8; i++) {
      this.mem.set(tileLibrary.subarray(def.tiles[i] * 8, def.tiles[i] * 8 + 8), 8 + i * 8);
      this.tileProps[i] = tileProperty(def.tiles[i]);
    }
    this.displaySectorName();
    this.roomEntitiesInit();
    Mech.teleporterDisplay(this);
    Mech.liftInit(this);
    this.roomFlags = roomMeta[id] ?? 0;
    this.initDeathFlag();
    Mech.piledriverInitState(this);
    this.initRoom1F();
    this.showJetpack = 0;
    if (id >= 0x1d && id < 0x21 && this.roomItemActive[0]) {
      this.showJetpack = 1;
      this.scol[2] = 2;
      this.vic.mc1 = 7;
    }
    this.setupEnemies();
    Items.applyRoomEffects(this);
    this.decorate();
    this.populateColourRam();
    Mech.piledriverRoomInit(this);
    Items.spawnForRoom(this);
  }

  /** DisplaySectorName: row 24, white, first letter of each word in the upper-case font. */
  private displaySectorName() {
    this.mem.fill(0, SCREEN + 24 * ROW, SCREEN + 25 * ROW);
    const { col, text } = sectorName(this.roomId);
    let wordStart = true;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i) & 0x3f;
      if (c >= 0x1a) wordStart = true;
      const code = wordStart ? c | 0x40 : c | 0x80;
      if (c < 0x1a) wordStart = false;
      this.mem[SCREEN + 24 * ROW + 4 + col + i] = code;
      this.col[24 * ROW + 4 + col + i] = 1;
    }
  }

  /** RoomEntitiesInit: coins (char $34) for this room. */
  private roomEntitiesInit() {
    this.entities = [];
    for (let i = 0; i * 3 < coinTable.length; i++) {
      if (coinTable[i * 3] !== this.roomId || this.coinCollected[i]) continue;
      const at = this.rowAddr(coinTable[i * 3 + 2] + 3) + coinTable[i * 3 + 1] + 4;
      this.mem[at] = 0x34;
      this.entities.push({ at, phase: 0, index: i });
    }
  }

  /** InitRoomDeathFlag: the C5 rooms (Mech.isC5Room; the original's "$31 and up" was its last rooms, runstop64's come after them). */
  private initDeathFlag() {
    const c5 = this.c5;
    c5.active = 0;
    this.expandX = 0;
    c5.fall = 0;
    const id = this.roomId;
    if (!Mech.isC5Room(id)) return;
    c5.active = 1;
    c5.rate = 1;
    this.sy[1] = 0;
    if (this.x2 === 0x9b) {
      this.y = 0x7a;
      this.x2 = 0x8f;
    }
    if (id === 0x33) {
      this.sx[1] = 0x14;
      this.sy[1] = c5.fallStage ? 0xb2 : 0x8a;
    }
    if (id === 0x24) {
      this.sx[1] = 0x94;
      this.sy[1] = c5.fallStage === 2 ? 0xda : 0xb2;
    }
    this.scol[1] = 0x0b;
    this.sptr[1] = 0xb5;
    this.expandX = 0x02;
  }

  /** InitRoom1FEntities: piledriver base tiles in room $1F (they flash like coins). */
  private initRoom1F() {
    if (this.roomId !== 0x1f) return;
    for (const c of [8, 10, 12]) {
      const at = SCREEN + 0x11 * ROW + c;
      this.mem[at] = 0x63;
      this.entities.push({ at: SCREEN + 0x200 + 0xb0 + (c - 8), phase: 0, index: -1 });
    }
  }

  /** SetupRoom: up to 4 enemies; their graphics unpacked into sprite RAM at $4C00 + slot*$200. */
  private setupEnemies() {
    this.enemies = [];
    const rec = enemyRecords(this.roomId);
    for (let i = 0; i + 6 < rec.length && rec[i] !== 0xff && this.enemies.length < 4; i += 7) {
      const flags = enemyDirFlags[rec[i + 3]] ?? 0;
      this.enemies.push({
        colour: enemyColours[rec[i] & 15],
        x: ((rec[i + 1] >> 1) + 0x1c) & 0xff,
        y: (0xf9 - rec[i + 2]) & 0xff,
        flags,
        type: rec[i + 4],
        speed: rec[i + 5],
        range: rec[i + 6],
        step: flags & 0x80 ? rec[i + 6] : 0,
      });
    }
    this.enemyParity.fill(0);
    this.enemies.forEach((e, slot) => {
      const bank = enemyBank(e.type);
      const base = 0x0c00 + slot * 0x200;
      for (let f = 0; f < 8; f++) {
        const src = bank.subarray(f * 32, f * 32 + 32);
        const dst = this.mem.subarray(base + f * 64, base + f * 64 + 64);
        dst.fill(0);
        for (let r = 0; r < 8; r++) {
          dst[r * 3] = src[r];
          dst[r * 3 + 1] = src[8 + r];
          dst[(8 + r) * 3] = src[16 + r];
          dst[(8 + r) * 3 + 1] = src[24 + r];
        }
      }
      if (enemyCopyFlag(e.type)) this.mem.copyWithin(base + 0x100, base, base + 0x100);
    });
  }

  /** Decor.CalculateRoom: decorations allocate chars from $9B up and draw w×h blocks. */
  private decorate() {
    const first = decorChars(this.roomId);
    for (let i = 0; i + 3 < decorRooms.length; i += 4) {
      if (decorRooms[i] !== this.roomId) continue;
      const type = decorRooms[i + 3];
      const t = decorTypes[type];
      if (!t || !first[type]) continue;
      this.mem.set(t.chr, first[type] * 8);
      let tile = first[type];
      let at = this.rowAddr(decorRooms[i + 2]) + decorRooms[i + 1];
      let stream = 0;
      for (let r = 0; r < t.h; r++) {
        for (let c = 0; c < t.w; c++) {
          this.mem[at + c] = tile++;
          this.setCol(at + c, typeof t.colour === 'number' ? t.colour : t.colour[stream++]);
        }
        at += ROW;
      }
    }
  }

  /** PopulateColourRam: chars 1-8 take the room's colours (cols 2-37, rows 3-22). */
  private populateColourRam() {
    for (let r = 3; r < 23; r++) {
      for (let c = 2; c < 38; c++) {
        const code = this.mem[SCREEN + r * ROW + c];
        if (code >= 1 && code <= 8) this.col[r * ROW + c] = this.roomColours[code - 1];
      }
    }
  }

  // ---- enemies: original Enemies.Tick ----------------------------------------------

  enemiesTick() {
    for (let slot = this.enemies.length - 1; slot >= 0; slot--) {
      const e = this.enemies[slot];
      if (e.x === 0xff) continue;
      if (e.flags & 1) {
        if (!(e.flags & 0x80)) {
          e.step = (e.step + 1) & 0xff;
          if (e.step === e.range) e.flags ^= 0x80;
          else e.y = (e.y + e.speed) & 0xff;
        } else {
          e.step = (e.step - 1) & 0xff;
          if (e.step === 0) e.flags ^= 0x80;
          else e.y = (e.y - e.speed) & 0xff;
        }
      } else if (!(e.flags & 0x80)) {
        e.step = (e.step + 1) & 0xff;
        if (e.step === e.range) e.flags ^= 0x80;
        else for (let n = e.speed; n > 0; n--) if (!(this.enemyParity[slot] ^= 1)) e.x = (e.x + 1) & 0xff;
      } else {
        e.step = (e.step - 1) & 0xff;
        if (e.step === 0) e.flags ^= 0x80;
        else for (let n = e.speed; n > 0; n--) if ((this.enemyParity[slot] ^= 1)) e.x = (e.x - 1) & 0xff;
      }
      this.enemyAnim[slot] = (this.enemyAnim[slot] + 1) & 0xff;
      const frame = (e.flags & 0x80 ? 0 : 4) + ((this.enemyAnim[slot] & 6) >> 1);
      const n = 4 + slot;
      this.sx[n] = e.x;
      this.sy[n] = e.y;
      this.scol[n] = e.colour;
      this.sptr[n] = 0x30 + slot * 8 + frame;
      this.enable |= 1 << n;
    }
  }

  // ---- theme char animation (water and lava) ----------------------------------------

  private animateThemeChar() {
    const f = this.roomFlags;
    if (!f) return;
    const g = this.mem.subarray(8 + (f & 7) * 8, 16 + (f & 7) * 8);
    if (f & 0x80) {
      const first = g[0];
      g.copyWithin(0, 1);
      g[7] = first;
    } else if (f & 0x40) {
      const last = g[7];
      g.copyWithin(1, 0, 7);
      g[0] = last;
    } else if (f & 0x20) {
      for (let i = 0; i < 3; i++) g[i] = ((g[i] << 1) | (g[i] >> 7)) & 0xff;
    } else if (f & 0x10) {
      for (let i = 0; i < 3; i++) g[i] = ((g[i] >> 1) | (g[i] << 7)) & 0xff;
    }
  }

  // ---- life lost (original Death.LifeLost) -------------------------------------------

  /** Returns true if the game is over (no lives left). */
  lifeLost(): boolean {
    this.lives--;
    this.drawHudData();
    if (this.lives > 0) {
      this.respawn();
      return false;
    }
    return true;
  }

  /**
   * Back to where Monty came into the room (as the original). ENHANCED (assist respawn): if he
   * died before he'd had a moment on his feet there (SAFE_FRAMES), that way in may only lead into
   * the same death again (a fall into the sewage, an enemy whose path crosses it): he starts
   * instead where he last came into a room and had that moment (the room before, usually), so a
   * life is lost once, not until the game is over.
   */
  respawn() {
    const safe = this.safeEntry;
    if (this.assist.respawn && !this.entrySafe && !this.c5.active && safe) {
      this.mapRow = safe.mapRow;
      this.exitCol = safe.exitCol;
      this.savedX = safe.x2;
      this.savedY = safe.y;
      this.facing = safe.facing;
    }
    this.x2 = this.savedX;
    this.y = this.savedY;
    this.actionCounter = 0;
    this.montyAction = 0;
    this.roomExit = 1;
  }

  /** Whether the ending is under way and Monty not yet aboard: the pause screen and travel may take him away. */
  get endingLeavable() { return !!this.completionActive && !!this.ending && !this.ending.aboard && !!this.script; }

  /**
   * Away from the ending before he's aboard (travel; ENHANCED or not, as travel is): what
   * Completion.Begin set undone, as it stood in play before (and as RoomLoop's transition and
   * LoadRoom set it again for the room he's taken to): the sequence stopped, no event pending, the
   * boat's and the flag's sprites off, not expanded, in front of the characters, hi-res, the
   * multicolours back. The treasure is still there, so coming back to it plays the ending again.
   * (The music is the front end's: main.ts.)
   */
  leaveEnding() {
    const e = this.ending;
    if (!e) return;
    this.script = null;
    this.completionActive = 0;
    this.ending = null;
    this.actionCounter = 0;
    this.gameMode = 0;
    this.enable = this.vic.enable = 0;
    this.multicolour = 0;
    this.expandX = this.expandY = 0;
    this.priority = 0;
    this.vic.mc1 = e.mc1;
    this.vic.mc2 = e.mc2;
  }

  /** Room the player is in, plus the music entry points (for the shell). */
  static readonly MUSIC = MUSIC;
  static readonly items = specialItems;
}
