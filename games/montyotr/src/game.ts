import { Vic } from 'c64kit';
import { sectorName, type LiftSpec, type MontyData } from './montydata';
import { afterLoss } from '../../shared/lives';
import { animateTheme, COIN_CHAR, coinOverBackdrop, drawHudData, drawHudFrame, nextRandom, PLAY_COLS, PLAY_ROWS, PRNG_START, ROW, SCREEN, type Collectible, type Sound } from '../../shared/monty/screen';
import type { MontyBody, MontyInput, MontyWorld } from '../../shared/monty/body';
import { montyDraw } from './monty';
import * as Mech from './mechanisms';
import * as Items from './items';
import * as Scripts from './scripts';
import { animateTreads, escalatorInit, escalatorUpdate, NO_RIDE, type EscalatorRide } from './escalators';
import { crackInit, crackUpdate, type CrackState } from './cracks';
import { dragonInit, dragonSprites, dragonUpdate, type DragonState } from './dragons';
import { pulseInit, pulseUpdate, type PulseState } from './pulses';
import { lavaInit, lavaUpdate, type LavaState } from './lava';
import { currentsTick } from './swim';
import { canopyFrame, flightOf } from './flight';
import { boardUpdate, planeInit, planeOf, planeShow, planeUpdate } from './planes';
import { drawTally, rounds, tallyKey } from './tally';
import { rollerInit, rollerSprites, rollerUpdate, type RollerState } from './rollers';
import { vineInit, vineUpdate, type VineState } from './vines';
import { cableInit, cableSprites, cableUpdate, NO_CABLE, type CableRide } from './cablecars';
import { floatInit, floatUpdate, type FloatState } from './floats';
import { skewerInit, skewerSprites, skewerUpdate, type SkewerState } from './skewers';
import { pursuerDue, pursuerInit, pursuerSprites, pursuerUpdate, settlePendingFinds, type PursuerState } from './pursuers';
import { leverInit, leverUpdate } from './levers';
import { cameoDue, cameoInit, cameoSprites, cameoUpdate, creatureBlocks, type CameoState } from './cameos';
import { icicleInit, icicleUpdate, type IcicleState } from './icicles';
import { tunnelInit, tunnelUpdate, type TunnelState } from './tunnels';
import { animateChars, charAnimInit, type LiveAnim } from './charanim';
import { coverable, decorChars, decorPool } from './decor-chars';
import { lineOf, noHint, say, step as stepHint, type HintState } from '../../shared/monty/hints';
import { NAME_FRAMES } from '../../shared/monty/hints';
import { playDissolve } from '../../shared/monty/deaths';
import { nameCodes } from '../../shared/monty/lettering';

/**
 * The game's state and frame loop — a port of the original's zero page,
 * GameFrameUpdate (run from the raster IRQ every frame) and RoomLoop (the
 * main thread). Field names follow the reconstruction's zero-page labels.
 *
 * Memory model: `mem` is VIC bank 1 ($4000-$7FFF): charset at 0, screen RAM
 * at SCREEN ($4800), sprite data by pointer. `col` is colour RAM ($D800).
 */
export { ROW, SCREEN } from '../../shared/monty/screen';
/** feetFrames stops counting here (2 seconds): it is part of the golden trace. */
const FEET_CAP = 100;

export type { MontyInput as Input } from '../../shared/monty/body';

export type { Sound };

/** Our changes to how the game plays (QOL.md). */
export interface Assists {
  /** Unlimited lives and continues (shared/lives.ts): a death takes no life. */
  lives: boolean;
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
  /** Item hints (shared/monty/hints.ts): a thing picked up says what it is for, a room that wants one says so. A game with none has no hints to give. */
  hints?: boolean;
}

/** Where Monty came into a room (the room's cell, his place, the way he faced): where a death starts him again. */
export interface Entry { mapRow: number; exitCol: number; x2: number; y: number; facing: number }

export interface Enemy {
  x: number; y: number; colour: number; type: number; flags: number; range: number; step: number; speed: number;
  /** Moved and drawn by a mechanism of its own (pursuers.ts: the agent), not by its patrol. */
  driven?: boolean;
}

export class Game implements MontyBody, MontyWorld {
  readonly vic = new Vic();
  readonly mem = this.vic.bank;
  readonly col = this.vic.colour;
  sound: Sound = { sfx() {}, song() {}, stop() {} };
  /** Our assists (off here, the original's rules, as the tests that compare with the original have them; the front end turns them on). */
  assist: Assists = { lives: false, cloud: false, jetpack: false, c5: false, rooms: false, respawn: false };
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
  /** A death has put him back (both modes): the front end starts a moment's grace. */
  onRestart: () => void = () => {};
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
  input: MontyInput = { left: false, right: false, up: false, down: false, fire: false };
  inputFire = false;

  // ---- world --------------------------------------------------------------------
  roomId = 0;
  mapRow: number;
  exitCol: number;
  readonly exitGrid: Uint8Array;
  tileProps = new Uint8Array(8); // collision class for room chars 1-8
  roomTiles = new Uint8Array(8);
  roomColours = new Uint8Array(8);
  roomFlags = 0; // theme animation (room_metadata_tbl)

  // ---- Monty --------------------------------------------------------------------
  x2: number;
  y: number;
  facing: number; // player_facing: $01 right, $81 left
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
  readonly coinCollected: Uint8Array;
  /** In-room collectibles: screen offset, colour phase, master index (-1 = no coin, e.g. room $1F bases). */
  entities: Collectible[] = [];
  /** The room's backdrop under its pickups and the cells that clear (the decorations of a `backdrop` type): per screen cell its character and colour, 0 where there is none. */
  private readonly backChr = new Uint8Array(1024);
  private readonly backCol = new Uint8Array(1024);
  /** The characters a coin over a backdrop is drawn as (the coin's picture with the backdrop's in it): not a decoration's, so nothing drawn over empty cells covers them. */
  private readonly coinGlyphs = new Set<number>();
  readonly siCollected: Uint8Array;
  siActiveIdx = -1;
  /** A room with a second special item (a game's own: Moscow's platform has a pirozhok and the ushanka) shows it on sprite 1; its index, or -1. */
  siSecondIdx = -1;
  /** room_item_active[0..4]: jet pack, rope, passport, gas mask, rum — the kit always carries all five. */
  readonly roomItemActive = [1, 1, 1, 1, 1];
  colourCycle = 0;
  cloudTick = 0;

  // ---- mechanisms ---------------------------------------------------------------
  pd = { roomFlag: 0, state: 0, delay: 1, index: 0xff, position: 0, travel: [0, 0], spriteY: [0, 0], ride: 0 };
  /** A room whose crushers wait for its lever (levers.ts): held, the two shafts dropping as one head, the lever just pulled (mechanisms.ts). Apart from `pd`, which is Monty on the Run's own. */
  hold: { held: number; both: number; pull: number; warn: number; inks: number[] } = { held: 0, both: 0, pull: 0, warn: 0, inks: [] };
  lift = { type: 0, x: 0, y: 0, speedDir: 0, riding: 0, speed: 0 };
  /** The picture the room's lift has of its own (a mine cart), kept at the room's loading so a frame looks nothing up (mechanisms.ts). */
  liftLook: LiftSpec['look'] = undefined;
  tele = { active: 0, repeat: 0, scr: 0, colH: 0, base: 0, cur: 0, anim: 0, events: 0 };
  /** The escalator ride under way (escalators.ts). */
  esc: EscalatorRide = { ...NO_RIDE };
  /** The treads' turning (escalators.ts): the steps taken so far. */
  treadTick = 0;
  /** This room's animated characters (charanim.ts) and the steps taken. */
  charAnims: LiveAnim[] = [];
  charTick = 0;
  /** This room's icicles (icicles.ts). */
  ice: IcicleState[] = [];
  /** This room's tunnel mouths (tunnels.ts) and cracking ice (cracks.ts). */
  tunnels: TunnelState[] = [];
  /** What the tunnel mouths drew over, by screen cell (tunnels.ts). */
  tunnelUnder = new Map<number, readonly [chr: number, colour: number]>();
  cracks: CrackState[] = [];
  /** This room's timed strikes (pulses.ts) and dragons (dragons.ts). */
  pulses: PulseState[] = [];
  /** This room's rising lava (lava.ts) and the strokes swum so far (swim.ts). */
  lavas: LavaState[] = [];
  swimTick = 0;
  /** The frames since this room was loaded, for its surges (swim.ts `currents`). */
  currentTime = 0;
  dragons: DragonState[] = [];
  /** This room's rolling boulders (rollers.ts) and swinging vines (vines.ts), and the flight's frames so far and whether he rests on something (flight.ts). */
  rollers: RollerState[] = [];
  vines: VineState[] = [];
  /** This room's cable car (cablecars.ts), floats (floats.ts) and swinging skewers (skewers.ts). */
  cable: CableRide = { ...NO_CABLE };
  floats: FloatState[] = [];
  skewers: SkewerState[] = [];
  /** This room's pursuer (pursuers.ts) and whether he is touching its lever (levers.ts). */
  pursuers: PursuerState[] = [];
  /** Escapes made in this room that count only once he leaves it alive (pursuers.ts `settlePendingFinds`). */
  pendingFinds: number[] = [];
  leverLatch = false;
  /** This room's cameos (cameos.ts). */
  cameos: CameoState[] = [];
  flightTick = 0;
  flightResting = false;
  /** A plane's leg (planes.ts): the frames flown, the bail-out's frames (-1: none), the way he tilts it (-1 climbing, 1 diving), where the pursuer's surge began. */
  planeTime = 0;
  planeBail = -1;
  planeTilt = 0;
  planeFrom = 0;
  /** Touching a plane he cannot board yet (planes.ts `boardUpdate`): its hint is said once a touch. */
  planeTouch = 0;
  /** The special item whose costume Monty wears (the data's `costumes`), or null: kept in the save. */
  worn: number | null = null;
  /** The line in the name row, and for how long (our hints). */
  hint: HintState = noHint();
  c5 = { active: 0, speed: 0, dir: 1, anim: 0, bounce: 0, fall: 0, fallStage: 0, rate: 1 };
  /** The C5 as it came into this room (with savedX, savedY: where a death in the room starts again). */
  c5Arrival: Mech.C5State = { ...Mech.C5_START };
  prng = Uint8Array.from(PRNG_START);
  /** Where Monty came into this room, and how many frames he's been on his feet since (on a floor, a rope or the C5's road). */
  entry: Entry;
  feetFrames = 0;

  constructor(readonly data: MontyData) {
    const { start } = data;
    this.mapRow = start.mapRow;
    this.exitCol = start.exitCol;
    this.x2 = start.x2;
    this.y = start.y;
    this.facing = start.facing;
    this.entry = { ...start };
    this.exitGrid = Uint8Array.from(data.exitGrid.image);
    this.coinCollected = new Uint8Array(data.coinTable.length / 3);
    this.siCollected = new Uint8Array(data.specialItems.length / 4);
    this.mem.set(data.bankImage);
    this.vic.screenOffset = SCREEN;
    this.vic.background = 0;
    this.vic.border = 0;
  }

  // ---- helpers ------------------------------------------------------------------

  /** Original GenerateRandomNumber: four-byte state; returns one byte. */
  random() {
    return nextRandom(this.prng);
  }

  pulseGreyscale() {
    this.colourCycle = (this.colourCycle + 1) & 0xff;
    return this.data.greyPulse[(this.colourCycle >> 1) & 7];
  }

  /** Screen RAM address (bank offset) of a row, like GetScreenRowAddress (row clamped to 25). */
  rowAddr(row: number) {
    return SCREEN + Math.min(row & 0xff, 25) * ROW;
  }

  chr(addr: number) { return this.mem[addr & 0x3fff]; }
  setChr(addr: number, v: number) { this.mem[addr & 0x3fff] = v & 0xff; }
  setCol(addr: number, v: number) { const i = addr - SCREEN; if (i >= 0 && i < 1024) this.col[i] = v & 15; }
  /** Room character `code` (1-8 of the room's palette; 0 empties the cell) on the screen cell `at` (its index in the screen), in the palette's colour: the one way a mechanism writes a cell of the room. */
  setRoomChar(at: number, code: number) {
    if (!code) { this.clearCell(at); return; }
    this.mem[SCREEN + at] = code;
    this.col[at] = this.roomColours[code - 1] ?? 1;
  }
  /** A cell that something took or cleared (a coin, a gate, cracked ice) shows what the room has behind it: its backdrop or tile, or nothing where it has none (false). `at` is the cell's index in the screen. */
  clearCell(at: number): boolean {
    const back = this.backChr[at] ?? 0;
    this.mem[SCREEN + at] = back;
    if (back) this.col[at] = this.backCol[at] ?? 0;
    return back !== 0;
  }
  /** A character a thing drawn over the room (a vine, the lava) may cover: empty or a decoration's, not a coin's picture. */
  mayCover(chr: number): boolean { return coverable(chr) && !this.coinGlyphs.has(chr); }

  /** Collision class of a screen char (original GetTileFlag). */
  tileFlag(code: number) {
    return code >= 1 && code <= 8 ? this.tileProps[code - 1] : 0;
  }

  /** The collision class of the cell at a screen row and column (the shared Monty's view of the room). */
  flagAt(row: number, col: number) {
    return this.tileFlag(this.chr(this.rowAddr(row) + col));
  }

  get montyRow() { return ((this.y - 0x32) & 0xff) >> 3; }
  get montyCol() { return ((this.x2 - 0x0c) & 0xff) >> 2; }
  /** ComputeMontyTilePointer: screen address of Monty's top-left char. */
  get montyChr() { return this.rowAddr(this.montyRow) + this.montyCol; }

  roomAt(row: number, col: number) {
    const { cols, rows } = this.data.exitGrid;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return 0xff;
    const id = this.exitGrid[row * cols + col];
    return id === 0xff && this.extensionOpen ? this.data.extensionGrid[row * cols + col] : id;
  }

  /**
   * runstop64's rooms are on the grid: with the assist on, and while Monty is in one of them
   * (switched to ORIGINAL there, their ways stay open until he's back in the original's rooms).
   */
  get extensionOpen() {
    return this.assist.rooms || this.data.isExtensionRoom(this.roomId);
  }

  sfx(id: number, onlyWithoutMusic = false) { this.sound.sfx(id, onlyWithoutMusic); }

  addScore(points: number) {
    this.score += points;
    if (this.score > this.hiScore) this.hiScore = this.score;
    this.drawHudData();
  }

  // ---- game start ---------------------------------------------------------------

  start() {
    const { start } = this.data;
    this.mem.set(this.data.bankImage);
    this.mem.fill(0, SCREEN, SCREEN + 1024);
    this.col.fill(3);
    this.lives = 5;
    this.score = 0;
    this.coinCollected.fill(0);
    this.siCollected.fill(0);
    this.pendingFinds = [];
    this.exitGrid.set(this.data.exitGrid.image);
    this.x2 = start.x2;
    this.y = start.y;
    this.facing = start.facing;
    this.mapRow = start.mapRow;
    this.exitCol = start.exitCol;
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
    this.esc = { ...NO_RIDE };
    this.ice = [];
    this.tunnels = [];
    this.cracks = [];
    this.pulses = [];
    this.lavas = [];
    this.dragons = [];
    this.rollers = [];
    this.vines = [];
    this.cable = { ...NO_CABLE };
    this.floats = [];
    this.skewers = [];
    this.pursuers = [];
    this.cameos = [];
    planeInit(this);
    this.leverLatch = false;
    this.worn = null;
    this.hint = noHint();
    this.c5 = { active: 0, speed: 0, dir: 1, anim: 0, bounce: 0, fall: 0, fallStage: 0, rate: 1 };
    this.c5Arrival = { ...Mech.C5_START };
    this.feetFrames = 0;
    this.drawHudFrame();
    this.roomExit = 1; // RoomLoop loads the first room
    this.freeze = 1;
    this.script = null;
  }

  // ---- HUD (original HUD.Init / HUD.Update) --------------------------------------

  drawHudFrame() {
    this.hudLives = this.livesShown;
    const tally = this.data.tally;
    drawHudFrame(this, this.score, this.hiScore, this.hudLives && !tally ? this.lives : null);
    if (tally) this.drawTally();
  }

  drawHudData() {
    this.hudLives = this.livesShown;
    const tally = this.data.tally;
    drawHudData(this, this.score, this.hiScore, this.hudLives && !tally ? this.lives : null);
    if (tally) this.drawTally();
  }

  /** The Spy vs Spy tally where Monty on the Run has the lives (tally.ts): its stars as the finds have them, the lives under them in HARD. */
  private drawTally() {
    const tally = this.data.tally;
    if (tally) drawTally(this, tally, rounds(this.data, this.siCollected), this.hudLives ? this.lives : null, this.villainDue);
  }

  /** Whether the tally's villain is due (lit), and who has won each round, as last drawn. */
  private villainDue = false;
  private tallyShown = -1;

  /** Whether the score row shows the lives: in HARD (EASY's unlimited lives have none to count: shared/lives.ts). */
  get livesShown() { return !this.assist.lives; }
  /** Whether the score row was last drawn with the lives (the switch can change on the pause screen: drawn again then). */
  private hudLives = true;

  // ---- the frame: original GameFrameUpdate ----------------------------------------

  /**
   * The sprites the collision check leaves out (VicView.collisions' `ignore`): with the jetpack
   * assist, the jetpack (sprite 2). In the original, its touching an enemy kills Monty: the
   * jetpack and Monty always overlap, so the hardware's bits can't tell it from Monty's own touch.
   */
  get uncounted() {
    return (this.assist.jetpack && this.showJetpack && !this.c5.active ? 0x04 : 0) | (this.hatPlaced ? 0x80 : 0) | dragonSprites(this) | rollerSprites(this) | cableSprites(this) | skewerSprites(this) | pursuerSprites(this) | cameoSprites(this) | (this.canopyShown || this.planeShown ? 0x04 : 0) | (this.planeBail >= 0 ? 0xff : 0);
  }

  /** Whether the parachute's canopy is over Monty this frame (flight.ts), on sprite 2. */
  canopyShown = false;
  /** Whether a plane (or, bailing out of it, the canopy) is over Monty this frame (planes.ts), on sprite 2. */
  planeShown = false;

  /** Whether a worn costume's overlay sprite (sprite 7) is on Monty this frame (it is no part of his collision box). */
  hatPlaced = false;

  /** The worn costume's overlay sprite, placed over Monty's picture (sprite 7), or taken off: false when there is none to show. */
  private placeOverlay(): boolean {
    const over = this.data.costumes.find((c) => c.item === this.worn)?.over;
    const at = over && !this.completionActive && !this.c5.active && !(this.actionCounter & 0x80) && this.enable & 0x08 ? over.frames.get(this.frameIndex) : undefined;
    if (!over || !at) return false;
    this.sx[7] = (this.sx[3] + at.dx / 2) & 0xff;
    this.sy[7] = (this.sy[3] + at.dy) & 0xff;
    this.sptr[7] = at.ptr;
    this.scol[7] = over.colour;
    return true;
  }

  /** One 50 Hz frame. `collisions` = sprite-sprite collision bits from the last drawn frame. */
  frame(collisions: number) {
    if (this.hudLives !== this.livesShown) this.drawHudData();
    if (this.data.tally) {
      // (the tally drawn again when a round is settled or the villain's face lights or goes dark)
      const due = !this.freeze && (pursuerDue(this) || cameoDue(this)); // (encounterState's `due`, without its list)
      const key = tallyKey(this.data.tally, this.siCollected, due);
      if (key !== this.tallyShown) { this.villainDue = due; this.tallyShown = key; this.drawTally(); }
    }
    this.frameToggle ^= 1;
    this.processSprites(collisions);
    if (!this.freeze) {
      montyDraw(this);
      this.noteFeet();
      Mech.piledriverAnimate(this);
      Mech.liftSpriteUpdate(this);
      Mech.liftMovementUpdate(this);
      Mech.liftCheckContact(this);
      escalatorUpdate(this);
      icicleUpdate(this);
      tunnelUpdate(this);
      crackUpdate(this);
      pulseUpdate(this);
      currentsTick(this);
      lavaUpdate(this);
      dragonUpdate(this);
      rollerUpdate(this);
      vineUpdate(this);
      floatUpdate(this);
      cableUpdate(this);
      skewerUpdate(this);
      pursuerUpdate(this);
      leverUpdate(this);
      cameoUpdate(this);
      planeUpdate(this);
      boardUpdate(this);
      Mech.piledriverUpdateRide(this);
      Items.updateRisingCloud(this);
      Items.secondItemUpdate(this);
      if (this.assist.cloud) Items.cloudAssist(this);
      Items.handleCollision(this);
      Mech.piledriverCheckTiles(this);
      Items.placeTreasure(this);
      Mech.piledriverCheckContact(this);
      if (stepHint(this.hint)) this.drawNameRow();
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
    const next = this.roomAt(this.mapRow, this.exitCol);
    settlePendingFinds(this, next);
    this.roomId = next;
    this.loadRoom();
    if (this.dissolvePending) {
      this.enable |= 0x08;
      yield* playDissolve(this);
    }
    this.freeze = 0;
    this.gameMode = 0;
    this.actionCounter = 0;
    this.dissolvePending = 0;
    this.roomExit = 0;
    this.scol[3] = 0x0f;
    if (this.showJetpack) this.montyAction = 0;
    if (this.montyAction && this.savedY === 0xda && this.data.ropeHoldRooms?.includes(this.roomId) && this.onRopeHere()) { this.montyAction = 0; this.arcIdx = 0; this.inputFire = false; }
    this.entry = { mapRow: this.mapRow, exitCol: this.exitCol, x2: this.savedX, y: this.savedY, facing: this.facing };
    this.feetFrames = 0;
    this.onRoomLoaded(this);
  }

  /** Whether a rope is in any of the cells his body overlaps (as the move's own rope check looks). */
  onRopeHere(): boolean {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) if (this.flagAt(this.montyRow + r, this.montyCol + c) === 3) return true;
    return false;
  }

  /** On his feet (standing, on a rope, or in the C5): counted. */
  private noteFeet() {
    if (this.gameMode || this.actionCounter) return;
    if (!this.c5.active && (this.falling || this.montyAction)) return;
    if (this.feetFrames < FEET_CAP) this.feetFrames++;
  }

  /**
   * Whether Monty put at (x2, y) in this room would stand: his cells clear of walls, a floor (or, on a rope, the rope) under
   * his feet and no water or lava there. A place the room's own tiles say is safe, not where a mechanism has put something.
   */
  standsSafely(x2: number, y: number): boolean {
    if (((y - 0x32) & 7) !== 0 || x2 < 0x16 || x2 > 0x99) return false;
    const row = ((y - 0x32) & 0xff) >> 3, col = ((x2 - 0x0c) & 0xff) >> 2;
    const cols = ((x2 - 0x0c) & 3) === 0 ? 2 : 3;
    let rope = false;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < cols; c++) {
        const f = this.flagAt(row + r, col + c);
        if (f === 1) return false;
        if (f === 3) rope = true;
      }
    }
    let floor = false;
    for (let c = 0; c < cols; c++) {
      const f = this.flagAt(row + 2, col + c);
      if (f === 4) return false;
      if (f === 1 || f === 2) floor = true;
    }
    return floor || rope;
  }

  /** The place in this room to start again from: exactly where and how he came in, else (that way in is deadly) the nearest place he can stand. */
  private restartSpot(): Entry {
    const here = this.entry;
    // (in a flight or a plane he does not stand: the way he came in, in the air, is where he starts again)
    if (flightOf(this) || planeOf(this) || this.standsSafely(here.x2, here.y)) return { mapRow: this.mapRow, exitCol: this.exitCol, x2: here.x2, y: here.y, facing: here.facing };
    let best: Entry | null = null;
    let bestD = Infinity;
    for (let y = 0x32 + 3 * 8; y <= 0xda; y += 8) {
      for (let x2 = 0x16; x2 <= 0x99; x2++) {
        const d = ((x2 - here.x2) * 2) ** 2 + (y - here.y) ** 2;
        if (d < bestD && this.standsSafely(x2, y)) { bestD = d; best = { mapRow: this.mapRow, exitCol: this.exitCol, x2, y, facing: here.facing }; }
      }
    }
    return best ?? { mapRow: this.mapRow, exitCol: this.exitCol, x2: this.entry.x2, y: this.entry.y, facing: this.entry.facing };
  }

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
    const eventSfx = this.data.eventSfx[ev];
    if (eventSfx) this.sfx(eventSfx);
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
    this.canopyShown = false;
    const look = this.data.canopy;
    if (look && !this.completionActive && !(this.actionCounter & 0x80) && !this.flightResting && flightOf(this)) {
      this.sx[2] = this.sx[3];
      this.sy[2] = (this.sy[3] - 19) & 0xff;
      this.sptr[2] = canopyFrame(this);
      this.scol[2] = look.colour;
      this.enable |= 0x04;
      this.canopyShown = true;
    }
    this.planeShown = !this.completionActive && !(this.actionCounter & 0x80) && planeShow(this);
    if (this.planeShown) this.enable |= 0x04;
    this.hatPlaced = this.placeOverlay();
    // Flush shadows to the VIC. X is stored halved; the low bit comes from the
    // step-gate parity (Monty, jetpack) or each enemy's own parity.
    const v = this.vic;
    for (let n = 0; n < 8; n++) {
      const r = v.sprites[n];
      let x = this.sx[n] * 2;
      if (!this.completionActive && (n === 3 || (n === 2 && (this.c5.active || this.showJetpack || this.canopyShown || this.planeShown)))) x |= this.stepGate;
      if (n === 7 && this.hatPlaced) x |= this.stepGate;
      else if (n >= 4) x |= this.enemyParity[n - 4];
      r.x = x;
      r.y = this.sy[n];
      r.ptr = this.sptr[n];
      r.colour = this.scol[n];
    }
    v.enable = this.hatPlaced ? this.enable | 0x80 : this.enable;
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
    const data = this.data;
    const def = data.roomDef(id);
    this.backChr.fill(0);
    this.backCol.fill(0);
    this.coinGlyphs.clear();
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
      this.mem.set(data.tileLibrary.subarray(def.tiles[i] * 8, def.tiles[i] * 8 + 8), 8 + i * 8);
      this.tileProps[i] = data.tileProperty(def.tiles[i]);
    }
    this.displaySectorName();
    this.roomEntitiesInit();
    Mech.teleporterDisplay(this);
    Mech.liftInit(this);
    escalatorInit(this);
    icicleInit(this);
    tunnelInit(this);
    crackInit(this);
    pulseInit(this);
    this.currentTime = 0;
    lavaInit(this);
    dragonInit(this);
    this.placeRoomBlocks();
    rollerInit(this);
    vineInit(this);
    floatInit(this);
    cableInit(this);
    skewerInit(this);
    leverInit(this);
    planeInit(this);
    this.roomFlags = data.roomMeta[id] ?? 0;
    this.initDeathFlag();
    Mech.piledriverInitState(this);
    this.initFlashingBases();
    this.showJetpack = 0;
    if (data.jetpackRooms.includes(id) && this.roomItemActive[0]) {
      this.showJetpack = 1;
      this.scol[2] = 2;
      this.vic.mc1 = 7;
    }
    this.setupEnemies();
    pursuerInit(this);
    cameoInit(this, this.lastRoom);
    Items.applyRoomEffects(this, 'before');
    this.decorate();
    Items.applyRoomEffects(this, 'after');
    this.drawCoinsOverBackdrop();
    charAnimInit(this);
    this.populateColourRam();
    Mech.piledriverRoomInit(this);
    Items.spawnForRoom(this);
    this.hint = noHint();
    this.hintWanted();
    this.arrive(id);
  }

  /** The room last loaded (-1: none yet), for the arrival banners. */
  private lastRoom = -1;

  /** The data's arrival banner for coming into room `id` from the one before, if there is one: shown in the name row (both modes; it replaces a hint the room would give at once). */
  private arrive(id: number) {
    const came = this.lastRoom;
    this.lastRoom = id;
    if (came < 0 || this.hint.text !== null) return; // (a hint the room already gives wins the row)
    const banner = this.data.arrivals.find((a) => a.rooms.includes(id) && !a.rooms.includes(came) && (a.from === undefined || a.from.includes(came)));
    if (!banner) return;
    say(this.hint, banner.text, 0);
    this.drawNameRow();
  }

  /** The sprite blocks the data's `roomBlocks` give this room (the others' put back as the bank has them). */
  private placeRoomBlocks() {
    const sets = this.data.roomBlocks;
    if (!sets.length) return;
    for (const set of sets) for (const { ptr } of set.blocks) this.mem.set(this.data.bankImage.subarray(ptr * 64, ptr * 64 + 64), ptr * 64);
    for (const set of sets) if (set.rooms.includes(this.roomId)) for (const { ptr, block } of set.blocks) this.mem.set(block, ptr * 64);
  }

  /** The name row: the hint if one is on show, else the place's name. */
  private drawNameRow() {
    const line = lineOf(this.hint);
    if (line === null) this.displaySectorName();
    else this.displayLine(0, line);
  }

  /** Our hint on coming into a room that wants a thing he does not have (once the name has had its moment). */
  private hintWanted() {
    if (!this.assist.hints) return;
    const want = this.data.hints.wanted.find((w) => w.room === this.roomId && !this.siCollected[w.item]);
    if (want) say(this.hint, want.text, NAME_FRAMES);
  }

  /** Our hint on touching a thing that wants what he does not have (a plane without the parachute: planes.ts). */
  noteWanted(text: string) {
    if (!this.assist.hints) return;
    say(this.hint, text);
    this.drawNameRow();
  }

  /** Our hint on taking a special item: what it is for. */
  noteTaken(item: number) {
    if (!this.assist.hints) return;
    const hint = this.data.hints.take.find((h) => h.item === item);
    if (hint) {
      say(this.hint, hint.text);
      this.drawNameRow();
    }
  }

  /** DisplaySectorName: row 24, white, first letter of each word in the upper-case font. */
  private displaySectorName() {
    const { col, text } = sectorName(this.data, this.roomId);
    this.displayLine(col, text);
  }

  private displayLine(col: number, text: string) {
    this.mem.fill(0, SCREEN + 24 * ROW, SCREEN + 25 * ROW);
    nameCodes(text).forEach((code, i) => {
      this.mem[SCREEN + 24 * ROW + 4 + col + i] = code;
      this.col[24 * ROW + 4 + col + i] = 1;
    });
  }

  /** RoomEntitiesInit: coins (char $34) for this room. */
  private roomEntitiesInit() {
    this.entities = [];
    const coinTable = this.data.coinTable;
    for (let i = 0; i * 3 < coinTable.length; i++) {
      if (coinTable[i * 3] !== this.roomId || this.coinCollected[i]) continue;
      const at = this.rowAddr(coinTable[i * 3 + 2] + 3) + coinTable[i * 3 + 1] + 4;
      const under = this.mem[at] ?? 0;
      if (under >= 1 && under <= 8) { // a coin over one of the room's tiles (a back wall painted as a tile): the tile is what is behind it, as a backdrop's character is
        this.backChr[at - SCREEN] = under;
        this.backCol[at - SCREEN] = (this.roomColours[under - 1] ?? 0) & 15;
      }
      this.mem[at] = 0x34;
      this.entities.push({ at, phase: 0, index: i });
    }
  }

  /** InitRoomDeathFlag: the C5 rooms (the street's `rooms`; the original's "$31 and up" was its last rooms, runstop64's come after them). */
  private initDeathFlag() {
    const c5 = this.c5;
    c5.active = 0;
    this.expandX = 0;
    c5.fall = 0;
    const id = this.roomId;
    const street = this.data.c5;
    if (!street || !street.rooms.includes(id)) return;
    c5.active = 1;
    c5.rate = 1;
    this.sy[1] = 0;
    if (this.x2 === 0x9b) {
      this.y = 0x7a;
      this.x2 = 0x8f;
    }
    if (id === street.last) {
      this.sx[1] = 0x14;
      this.sy[1] = c5.fallStage ? 0xb2 : 0x8a;
    }
    if (id === street.first) {
      this.sx[1] = 0x94;
      this.sy[1] = c5.fallStage === 2 ? 0xda : 0xb2;
    }
    this.scol[1] = 0x0b;
    this.sptr[1] = 0xb5;
    this.expandX = 0x02;
  }

  /** InitRoom1FEntities: piledriver base tiles in a room (they flash like coins). */
  private initFlashingBases() {
    const bases = this.data.flashingBases;
    if (!bases || this.roomId !== bases.room) return;
    for (const c of bases.cols) {
      const at = SCREEN + bases.row * ROW + c;
      this.mem[at] = 0x63;
      this.entities.push({ at, phase: 0, index: -1 });
    }
  }

  /** SetupRoom: up to 4 enemies; their graphics unpacked into sprite RAM at $4C00 + slot*$200. */
  private setupEnemies() {
    this.enemies = [];
    const { enemyRecords, enemyDirFlags, enemyColours, enemyBank, enemyCopyFlag } = this.data;
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
      creatureBlocks(bank).forEach((block, f) => this.mem.set(block, base + f * 64));
      if (enemyCopyFlag(e.type)) this.mem.copyWithin(base + 0x100, base, base + 0x100);
    });
  }

  /** Decor.CalculateRoom: decorations allocate chars from $9B up and draw w×h blocks. */
  private decorate() {
    const { decorRooms, decorTypes } = this.data;
    const first = decorChars(this.data, this.roomId);
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
          const chr = tile++;
          const colour = typeof t.colour === 'number' ? t.colour : t.colour[stream++];
          if (t.backdrop) {
            this.backChr[at + c - SCREEN] = chr;
            this.backCol[at + c - SCREEN] = (colour ?? 0) & 15;
            if (this.mem[at + c] === COIN_CHAR) continue; // a coin keeps its cell (drawn over the backdrop by drawCoinsOverBackdrop)
          }
          this.mem[at + c] = chr;
          this.setCol(at + c, colour);
        }
        at += ROW;
      }
    }
  }

  /** A coin on a backdrop (or a room tile) is drawn as the coin's picture over the backdrop's (a character of its own, from the free ones above the decorations'), not on a black cell. */
  private drawCoinsOverBackdrop() {
    let next = decorPool(this.data, this.roomId).end;
    const made = new Map<number, number>();
    for (const e of this.entities) {
      const back = this.backChr[e.at - SCREEN] ?? 0;
      if (!back || this.mem[e.at] !== COIN_CHAR) continue;
      let glyph = made.get(back);
      if (glyph === undefined) {
        if (next > 0xff) continue; // (no character left: the plain coin, as before)
        glyph = next++;
        this.mem.set(coinOverBackdrop(this.mem.subarray(COIN_CHAR * 8, COIN_CHAR * 8 + 8), this.mem.subarray(back * 8, back * 8 + 8)), glyph * 8);
        made.set(back, glyph);
        this.coinGlyphs.add(glyph);
      }
      this.mem[e.at] = glyph;
      e.chr = glyph;
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
      if (e.x === 0xff || e.driven) continue;
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
    animateTheme(this.mem, this.roomFlags);
    animateTreads(this);
    animateChars(this);
  }

  // ---- life lost (original Death.LifeLost) -------------------------------------------

  /** Returns true if the game is over (no lives left). */
  lifeLost(atEntry = false): boolean {
    this.lives = afterLoss(this.lives, this.assist.lives);
    this.drawHudData();
    if (this.lives > 0) {
      this.respawn(atEntry);
      return false;
    }
    return true;
  }

  /**
   * Back to where Monty came into the room (as the original). Ours (assist respawn): in the room he died in, exactly where
   * and how he came in; if that way in is deadly (it drops into danger) the nearest place in the room he can stand; and a
   * moment's grace (`onRestart`). Never in another room.
   */
  respawn(atEntry = false) {
    if (this.assist.respawn) {
      // (a C5 crash puts him back on the road at the room's way in, the C5 stopped there: mechanisms.ts c5Restart)
      if (!atEntry && !this.c5.active && !this.showJetpack) {
        const at = this.restartSpot();
        this.savedX = at.x2;
        this.savedY = at.y;
        this.facing = at.facing;
      }
      this.onRestart();
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
   * Away from the ending before he's aboard (travel; ours or not, as travel is): what
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
}
