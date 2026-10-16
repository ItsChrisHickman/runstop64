import { C64Machine, PAL_FRAME_CYCLES } from 'c64kit';
import { cellsFrame, CELLS, writeCells } from './cells';
import { backgroundHits, sound1, spriteHits } from './collisions';
import { Core } from './core';
import { memoryImage } from './data';
import { fades } from './fades';
import type { FeelEvent } from './feel';
import { heroPhysics, hover, joystick, powerCentre, takeOff } from './hero';
import * as Panel from './panel';
import { isPlus, plusFrame } from './plus';
import { drawCycles, drawRoom, EXIT_TABLE } from './rooms';
import { armourHere, charAnims, dropBomb, roomCharAnims, roomSprites, stopFades } from './setup';
import { animateSprites, followScripts, moveSprites, resetMove, restartHeroAnim } from './sprites';
import { clearScreen, fire, titleSequence, titleText } from './title';
import { V } from './vars';

/**
 * While a room is drawn: the interrupts' time a frame besides the music's, with the panel off and
 * on, as measured on the original's own room changes (see drawing(); with these, 124 of the 136
 * room changes tried take as many frames as the original's, the rest one more or less).
 */
const BUSY = -400, BUSY_PANEL = 500;
/**
 * ... and while the panel's message scrolls, the $32 interrupt's scroller takes the original
 * this much more a frame (measured: 2,650-3,050 cycles a frame without one, 4,100 with), so
 * a room takes it a frame or two longer to draw then (test/transitions.ts ... message).
 */
const BUSY_MESSAGE = 1400;

/**
 * The Sacred Armour of Antiriad, ported: the original's main program ($8009)
 * and its interrupt handlers, on c64kit's model of the C64's chips. The game's
 * state is in memory at the original's addresses (vars.ts); the routines are
 * TypeScript, written from the original's code (re/README.md).
 *
 * Time works as on the C64: each tick is one PAL frame of the raster beam. The
 * VIC-II interrupts at lines $FA (the playfield set up, and a frame of the
 * game's logic), $32 (the panel's message and score) and $B2 (the panel), and
 * on sprite collisions; CIA 1's two timers drive the music. The main program
 * (rooms, character animations, the shot, energy) runs a pass each frame after
 * the $FA interrupt, as it would between them on the C64; where it waits, it
 * yields.
 *
 * The music driver ($AFC5-$B499) is Richard Joseph's player, kept as the
 * original's code: it runs on the 6502 core when its timers fire, as the SID
 * files the other games play do.
 */
export class Game extends Core {
  /** The main program, from $8009. */
  private main: Generator<void, void, void>;
  /** Writes to sprite shapes from the interrupt, for the next frame's start (fades.ts). */
  readonly shapeWrites: number[] = [];
  /** Frames run (ticks). */
  frames = 0;
  /** The music driver's 6502 time this frame (and the last). */
  musicCycles = 0;
  lastMusicCycles = 0;
  /** The main program's pass after the $FA handler, due at the next frame's start. */
  private passDue = false;
  /** Q restarts the game (the original's key, checked by the interrupt). */
  private restartAsked = false;
  /** The credits page's text (row, column, colour, letters), with our keys. */
  titleText: number[];
  /** For the front end: true while the title sequence is up. */
  get onTitle() { return !!(this.ram[V.titleMode] & 0x80); }
  /** Interrupts enabled (the original runs from $8009 with them off until the title sets them up: SEI ... CLI). */
  interrupts = false;
  /** New Game+ (plus.ts): after the ending, the armour's for good. */
  get plus() { return isPlus(this.ram); }
  /** Playing: the main loop is running (not the title, not the ending). */
  playing = false;
  /** Called each time a room has been set up (for autosave and the map). */
  onRoom: (g: Game) => void = () => {};
  /** For checks against the original (test/logic.ts): just before and after each frame of the game's logic. */
  beforeLogic: () => void = () => {};
  afterLogic: () => void = () => {};

  constructor(m = new C64Machine(), resume = false) {
    super(m);
    this.interrupts = resume;
    if (!resume) {
      m.ram.set(memoryImage());
      this.powerOn();
    }
    m.cpu.p |= 0x04; // (the 6502 never takes interrupts: the port's handler does)
    m.collisionsPerLine = true; // (as the VIC-II finds them: the game learns of them by interrupt)
    this.titleText = titleText(this);
    if (!resume) this.ourKeys();
    writeCells(m.ram); // (the cell message's words: in a save from before them too)
    this.main = resume ? this.mainLoop() : this.program();
  }

  /** The machine as the KERNAL leaves it when the loader starts the game. */
  private powerOn() {
    const { m } = this;
    m.vic[0x11] = 0x1b; m.vic[0x16] = 0x08; m.vic[0x18] = 0x15; m.vic[0x20] = 0x0e; m.vic[0x21] = 0x06;
    m.ram[0] = 0x2f; m.ram[1] = 0x37; // (the processor port, as after a reset)
    m.colour.fill(0x0e);
    m.cia2.pra = 0x97;
    m.cia1.pra = 0x7f;
    Object.assign(m.cia1, { latch: 0x4025, ta: 0x4025, cra: 0x11, mask: 0x01 });
    m.cpu.sp = 0xff;
  }

  // ---- one frame ------------------------------------------------------------------------------

  /** One PAL frame. */
  tick() {
    const m = this.m;
    m.sidWrites = [];
    // The main program runs between interrupts: a pass after each handler returns, as on the C64
    // (where it loops all the time, but everything it does waits on what the interrupts do).
    // A frame is over when the machine has a new picture (the music's 6502 code can end one too).
    // The $FA handler's frame of logic takes the original most of a frame's bottom border and
    // usually some of the next frame's top: its main loop goes on after that, at the next frame's start.
    this.frames++;
    this.flushShapes();
    this.lastMusicCycles = this.musicCycles;
    this.musicCycles = 0;
    if (this.passDue) { this.passDue = false; this.step(); }
    const picture = m.capture;
    while (m.capture === picture) {
      m.advance(PAL_FRAME_CYCLES - m.cycleInFrame || 1, () => {
        const bottom = this.irq();
        if (bottom) this.passDue = true; else if (!this.passDue) this.step();
      });
    }
    plusFrame(this);
    cellsFrame(this);
    return true;
  }

  /** The interrupt's writes to sprite shapes, done (at a frame's start, or before a save). */
  flushShapes() {
    for (const w of this.shapeWrites) this.ram[w & 0xffff] = w >>> 16;
    this.shapeWrites.length = 0;
  }

  /** A pass of the main program (to its next wait). */
  private step() {
    if (this.restartAsked) { this.restartAsked = false; this.restart(); }
    this.ram[V.randomish]++;
    if (this.main.next().done) this.main = this.program();
  }

  /** $8BAB: back to the start (Q, or fire after the game is over). */
  restart() {
    clearScreen(this);
    stopFades(this);
    this.playing = false;
    this.main = this.program();
  }

  // ---- the main program -------------------------------------------------------------------------

  /** $8009 */
  private *program(): Generator<void, void, void> {
    const { ram } = this;
    this.playing = false;
    this.interrupts = false;
    this.w(0xdd02, this.r(0xdd02) | 3);
    this.w(0xdd00, (this.r(0xdd00) & 0xfc) | 2);
    ram[0] = 7; ram[1] = 5;
    this.w(0xdc0e, this.r(0xdc0e) & 0xfe);
    this.init();
    this.soundInit();
    yield* titleSequence(this, this.titleText);
    this.init();
    this.start();
    Panel.drawPanel(this);
    yield* this.mainLoop();
  }

  /** $8053: the main loop, a pass a frame. */
  private *mainLoop(): Generator<void, void, void> {
    this.playing = true;
    for (;;) {
      if (this.travelTo) { const to = this.travelTo; this.travelTo = null; yield* this.travel(to); }
      yield* this.roomChange();
      charAnims(this);
      this.throwStone();
      this.backgroundHits();
      yield* this.backToArmour();
      Panel.panelLights(this);
      Panel.bars(this);
      this.energy();
      if (this.won()) { yield* this.ending(); return; }
      yield;
    }
  }

  /** $8D77: the game's variables to their start. */
  private init() {
    const { ram } = this;
    ram.fill(0, 0x0200, 0x0211);
    for (let r = 0; r < 0x11; r++) this.w(0xd000 + r, 0);
    ram[V.spriteEnable] = 0; this.w(0xd015, 0);
    for (let x = 7; x >= 0; x--) {
      ram[V.dir + x] = ram[V.move + x] = ram[V.anim + x] = ram[V.animDelay + x] = ram[0x0250 + x] = 0;
      ram[V.dying + x] = ram[V.appearing + x] = ram[0x066a + x] = 0;
      ram[V.animPos + x] = ram[V.speedX + x] = ram[V.speedY + x] = 2;
      for (const at of [0x7740, 0x7748, 0x7750, 0x7758, 0x7760]) ram[at + x] = ram[0x75b0 + x];
    }
    for (let x = 4; x >= 0; x--) ram[0x0682 + x] = ram[0x0687 + x] = ram[0x068c + x] = 0;
    for (let x = 3; x >= 0; x--) ram[0x067a + x] = ram[0x067e + x] = 0;
    for (let x = 8; x >= 0; x--) ram[0x0661 + x] = 0;
    this.w(0xd020, 0); this.w(0xd021, 0);
    for (const at of [0x6b, 0xac, 0x7e, 0x6d, 0x6e, 0xab, 0x54, 0x6f, 0x70, 0x75, 0x76, 0xb1, 0x66, 0x7b, 0xa0, 0x48, 0x49, 0x8d, 0x46, 0x8f, 0x91, 0x92, 0x88, 0x89, 0x8a, 0xa7, 0x4f, 0x50, 0x52]) ram[at] = 0;
    ram[0x0697] = ram[0x0698] = ram[0x0699] = 0;
    ram[CELLS] = 0;
    ram[V.life] = 0x1f;
    ram[V.d018Play] = 0x0e;
    ram[V.digitRoll] = 7;
  }

  /** $8E43: Tal appears in one of two rooms (which depends on how long the title ran). */
  private start() {
    const { ram } = this;
    const x = ram[V.randomish] & 1;
    ram[V.room] = ram[0xc5db + x];
    ram[0x0200] = ram[0x0202] = ram[0xc5dd + x];
    this.w(0xd000, ram[0x0200]); this.w(0xd002, ram[0x0200]);
    ram[0x0201] = ram[0xc5df + x];
    ram[0x0203] = (ram[0x0201] + 0x15) & 0xff;
    this.w(0xd001, ram[0x0201]); this.w(0xd003, ram[0x0203]);
    ram[V.spriteXHigh] &= 0xfc;
    ram[V.anim] = ram[V.appearing] = 0x88;
    ram[V.anim + 1] = ram[V.appearing + 1] = 0x89;
    this.w(0xd025, 8); this.w(0xd026, 9);
    ram[V.suitRoom] = 0x3f; ram[V.suitX] = 0x80; ram[V.suitY] = 0x40; ram[V.suitXHigh] = 0;
    ram[V.appearStep] = ram[V.appearTimer] = ram[V.appearStep + 1] = ram[V.appearTimer + 1] = 0;
    drawRoom(this);
  }

  /** The rest of a room's setting up, after it's drawn ($85AF on). */
  roomSetUp() {
    stopFades(this);
    roomSprites(this);
    armourHere(this);
    roomCharAnims(this);
    charAnims(this);
    animateSprites(this);
    followScripts(this);
    this.onRoom(this);
  }

  /**
   * The original draws a room in the main program, which takes it 5 to 14 frames: meanwhile the
   * playfield is dark and nothing moves (the interrupt skips the game's frame while $6B is set).
   * The port draws it at once, then keeps it dark and still for as long.
   */
  private *drawing(): Generator<void, void, void> {
    const { ram } = this, col = this.m.colour;
    let cycles = drawCycles(this);
    const colours = col.slice(0, 640), sprites = ram[V.spriteEnable];
    col.fill(0, 0, 640); ram[V.spriteEnable] = 0; this.w(0xd015, 0);
    // each frame, the time the interrupts leave the main program (the music's varies; the panel's
    // handlers take more once it's on): as measured on the original's own room changes
    for (;;) {
      const message = ram[V.panelOn] & 0x80 && ram[V.message] & 0x80 ? BUSY_MESSAGE : 0;
      cycles -= PAL_FRAME_CYCLES - this.lastMusicCycles - (ram[V.panelOn] & 0x80 ? BUSY_PANEL : BUSY) - message;
      if (cycles <= 0) break;
      const frame = this.frames;
      while (this.frames === frame) yield;
    }
    col.set(colours, 0); ram[V.spriteEnable] = sprites;
  }

  /** $84DB: leaving the room by an edge: the room that way. */
  private *roomChange(): Generator<void, void, void> {
    const { ram } = this;
    if (ram[V.roomChange] & 0x80) {
      const to = ram[EXIT_TABLE + ram[V.room] * 4 + (ram[V.roomChange] & 3)];
      if (!(to & 0x80)) ram[V.room] = to;
      drawRoom(this);
      yield* this.drawing();
      this.lastRooms();
      ram[V.roomChange] = 0;
    }
  }

  /** $84F0: into one of the last two rooms: without the Particle Negator the armour's energy is gone. */
  private lastRooms() {
    const { ram } = this;
    if (ram[V.room] >= 2) return;
    ram[V.request + 1] = 0x9b;
    if (!(ram[0x067f] & 0x80)) { ram[V.suitEnergy] = 0; this.say(0x8b); }
  }

  /**
   * ENHANCED (added for runstop64; hero.ts, QOL.md): fire only attacks and a button of its own
   * jumps (off, the original's one button: standing it throws, walking it jumps); and an armour
   * out of energy sets down and lets Tal out (off, the original's: it bounces on the floor until
   * turned to face out, and in the first ten rooms never lets him out).
   */
  enhanced = false;
  /** Whether a moment's grace is on (the front end's, main.ts; grace.ts): nothing hurts Tal or the armour, and the radiation and the armour's drain wait. */
  graceActive: () => boolean = () => false;
  /** ENHANCED: C was pressed (main.ts): fill the armour from a stored recharge cell (cells.ts). */
  cellAsked = false;
  /** What Tal and the creatures felt since the front end last collected it (feel.ts; presentation only). */
  feel: FeelEvent[] = [];
  /** The jump button (with `enhanced`): 1 held, 2 pressed since the joystick was last read. */
  jumpButton = 0;

  /** A room picked on the pause map to go back to (where Tal, or the armour, first came in). */
  travelTo: { room: number; x: number; y: number; high: number } | null = null;

  /**
   * Can Tal be taken back to a room from the map now (the map offers none when not)? Not while
   * he's dying, lying dead or coming back to life ($A6, $A8, $AA) or out of life (dying next
   * frame, $A31E), nor once the game is over: the game's own teleporter takes him only standing
   * ($A643), and travel, which makes him appear, would cut a death short. It did: he arrived with
   * no life, so died again at once (a death cost two or three rejuvenations), and travel from the
   * last one undid the game over, Tal up and about with "YOU HAVE DIED" scrolling round for good
   * and nothing to end the game: the fire that ends it ($92C9) is for him lying dead (walking or
   * standing it throws or jumps, in the armour it's the Pulsar Beam), and he never died again.
   */
  get canTravel() {
    const { ram } = this;
    return !(ram[V.gameOver] & 0x80) && (!!(ram[V.inSuit] & 0x80) || (!!ram[V.life] && ![0xa6, 0xa8, 0xaa].includes(ram[V.anim])));
  }

  /**
   * Going back to a room from the map (added for runstop64), the game's own way: as through a
   * teleporter ($A352) out of the armour (Tal appears there), as by an edge in it (into the last
   * two rooms too: without the Particle Negator the armour's energy goes); the room takes as long
   * to draw as it always does.
   */
  private *travel(t: { room: number; x: number; y: number; high: number }): Generator<void, void, void> {
    const { ram } = this;
    if (!this.canTravel || ram[V.roomChange] & 0x80 || (ram[V.dying] | ram[V.appearing]) & 0x80 || ram[V.jumping] & 0x80) return;
    ram[V.roomChange] = 0x80;
    ram[V.room] = t.room;
    ram[0x0200] = ram[0x0202] = t.x;
    ram[0x0201] = t.y; ram[0x0203] = (t.y + 0x15) & 0xff;
    ram[V.spriteXHigh] = (ram[V.spriteXHigh] & 0xfc) | (t.high ? 3 : 0);
    // Arrive at rest: no direction ...
    ram[V.dir] = ram[V.dir + 1] = 0;
    if (ram[V.inSuit] & 0x80) {
      // ... and in the armour no speed. They go together: the armour only steers up and down
      // when its vertical speed is 0 or matches a direction bit, so clearing the direction
      // mid-flight but keeping the speed left up and down dead for good. (Out of it, Tal's
      // speeds are his walking pace, which nothing else sets again: keep them.)
      ram[V.flySpeedX] = ram[V.flySpeedY] = 0;
      ram[V.speedX] = ram[V.speedX + 1] = ram[V.speedY] = ram[V.speedY + 1] = 0;
      // The armour arrives flying, as it comes into a room by an edge (the game's only way):
      // standing ($B2) is only ever on a floor where it landed, and the place it came in by is
      // often in the air. Standing there, Tal could step out into the air and fall for good
      // (his physics are off in the stance he steps out in), back into it with his jump on,
      // which shuts out the joystick. So standing, it takes off first, as up does ($941D).
      // (Without the Gravity Displacer it has never flown: it only goes back where it stood.)
      if (ram[V.anim] === 0xb2 && ram[0x0680] & 0x80) takeOff(this);
    }
    drawRoom(this);
    if (!(ram[V.inSuit] & 0x80)) {
      ram[V.anim] = ram[V.appearing] = 0x88; ram[V.anim + 1] = ram[V.appearing + 1] = 0x89;
      ram[V.appearTimer] = ram[V.appearTimer + 1] = ram[V.appearStep] = ram[V.appearStep + 1] = 0;
      ram[V.request] = 0x96; ram[V.request + 1] = 0x97;
    }
    yield* this.drawing();
    if (ram[V.inSuit] & 0x80) this.lastRooms();
    ram[V.roomChange] = 0;
  }

  /** $A3B3: a stone thrown (the throw's animation reached its frame): sprite 2 flies. */
  private throwStone() {
    const { ram } = this;
    if (ram[V.anim + 2] & 0x80 || !(ram[V.shot] & 0x80)) return;
    ram[V.spriteXHigh] = (ram[V.spriteXHigh] & 0xfb) | ((ram[V.spriteXHigh] << 2) & 4);
    const a = ram[V.anim];
    let x: number, way: number;
    if (a === 0xb8) { x = ram[0x0200] - 0x10; way = 4; if (x < 0) ram[V.spriteXHigh] &= 0xfb; }
    else if (a === 0xba) { x = ram[0x0200] + 0x10; way = 8; if (x > 0xff) ram[V.spriteXHigh] |= 4; }
    else return;
    ram[0x0204] = x & 0xff;
    ram[0x73] = way;
    ram[0x0205] = ram[0x0201];
    ram[V.move + 2] = 0x81;
    ram[V.anim + 2] = 0xbc;
    resetMove(this, 2);
    ram[V.animDelay + 2] = 0; ram[V.animPos + 2] = 2;
    const script = this.word(0xc683 + ((0x81 << 1) & 0xff));
    for (let i = 0; i < 5; i++) ram[script + i * 4] = (ram[script + i * 4] & 3) | way;
  }

  /** When the original would be done with the collisions latched (a cycle count), and what it latched. */
  private bgDoneAt = -1;
  private bgLatched = 0;

  /** $A44C, taking the original's time: the collisions stay latched (later ones dropped) until it's done. */
  private backgroundHits() {
    const { ram } = this, now = this.m.cpu.cycles;
    if (this.bgDoneAt >= 0) {
      if (now < this.bgDoneAt) return;
      if (ram[V.bgCollisions] === this.bgLatched) ram[V.bgCollisions] = 0;
      this.bgDoneAt = -1;
    }
    if (!ram[V.bgCollisions]) return;
    const latched = ram[V.bgCollisions];
    const busy = backgroundHits(this);
    if (ram[V.bgCollisions] || busy <= 100) return; // (done at once, or it left them set)
    ram[V.bgCollisions] = this.bgLatched = latched;
    this.bgDoneAt = now + busy;
  }

  /** $A352: through a teleporter: back to the armour's room, Tal appearing where he left it. */
  private *backToArmour(): Generator<void, void, void> {
    const { ram } = this;
    if (!(ram[V.teleport] & 0x80) || ram[V.dying] & 0x80) return;
    ram[V.roomChange] = 0x80;
    ram[V.room] = ram[V.suitRoom];
    drawRoom(this);
    yield* this.drawing();
    ram[0x0200] = ram[0x0202] = ram[V.suitX];
    ram[0x0201] = ram[V.suitY];
    ram[0x0203] = (ram[V.suitY] + 0x15) & 0xff;
    ram[V.spriteXHigh] &= 0xfc;
    ram[V.spriteXHigh] |= (ram[V.spriteXHigh] >> 3) & 3;
    ram[V.appearing] = 0x88; ram[V.appearing + 1] = 0x89;
    ram[V.request] = 0x96; ram[V.request + 1] = 0x97;
    ram[V.appearTimer] = ram[V.appearTimer + 1] = ram[V.appearStep] = ram[V.appearStep + 1] = 0;
    ram[V.teleport] = 0; ram[V.roomChange] = 0;
  }

  /** $8AA2: energy: in the armour Tal heals and the armour drains; out of it the radiation hurts. */
  private energy() {
    const { ram } = this;
    if (ram[0x91]) return;
    if (ram[V.inSuit] & 0x80) {
      ram[0x91] = 0x64;
      if (ram[V.life] < 0x1f) ram[V.life]++;
      if (ram[V.room] || this.graceActive()) return;
      const v = (ram[V.suitEnergy] - 2) & 0xff;
      ram[V.suitEnergy] = v & 0x80 ? 0 : v;
      return;
    }
    if (!this.graceActive()) {
      const v = (ram[V.life] - ram[0x75]) & 0xff;
      ram[V.life] = v & 0x80 ? 0 : v;
    }
    ram[0x91] = 0x32;
  }

  /** $8AD9: the power centre destroyed (and its message over): the end. */
  private won() {
    const { ram } = this;
    return !(ram[V.timer69] | ram[V.message]) && !!(ram[0xb1] & 0x80);
  }

  /** $8AE3: the ending: the screen dissolves, flashing, then the last message, until fire. */
  private *ending(): Generator<void, void, void> {
    const { ram } = this;
    this.playing = false;
    ram[V.request] = 0xa8; ram[V.request + 1] = 0xa9; ram[V.request + 2] = 0xaa;
    let mask = 0x0800;
    for (let step = 8; step >= 0; step--) {
      for (let i = 0; i < 0x800; i++) ram[0x7800 + i] &= ram[mask + (i & 0x3f)];
      mask += 0x40;
      this.w(0xd011, this.r(0xd011) ^ 3);
      const b = (this.r(0xd020) ^ 1) & 15;
      this.w(0xd020, b); this.w(0xd021, b);
      ram[V.timer68] = 0x0a;
      while (ram[V.timer68]) yield;
    }
    this.say(0x95);
    // $8B6B
    ram[V.anim] = 0xb0; ram[V.anim + 1] = 0xb1;
    restartHeroAnim(this);
    ram[V.flySpeedX] = ram[V.flySpeedY] = ram[V.hover] = ram[V.hoverTimer] = 0;
    ram[V.speedY] = ram[V.speedY + 1] = 0;
    this.w(0xd020, 0); this.w(0xd021, 0);
    this.w(0xd011, (this.r(0xd011) & 0xf8) | 3);
    while (!fire(this)) yield;
    this.restart();
  }

  // ---- interrupts -----------------------------------------------------------------------------

  /** $AE41: the interrupt handler. */
  private irq() {
    const { ram } = this;
    if (!this.interrupts) return false;
    let bottom = false;
    if (this.r(0xd01a) & this.r(0xd019) & 1) bottom = this.raster();
    if (this.r(0xd01a) & this.r(0xd019) & 2) { if (!ram[V.bgCollisions]) ram[V.bgCollisions] = this.r(0xd01f); this.w(0xd019, 2); }
    if (this.r(0xd01a) & this.r(0xd019) & 4) { if (!ram[V.spriteCollisions]) ram[V.spriteCollisions] = this.r(0xd01e); this.w(0xd019, 4); }
    const icr = this.r(0xdc0d);
    if (icr & 0x80) {
      ram[0xa1] = icr;
      if (icr & 2) this.call6502(0xafc5); // the music's sequencer
      if (ram[0xa1] & 1) this.call6502(0xb47d); // ... and its sounds
    }
    this.r(0xd01e); this.r(0xd01f);
    return bottom;
  }

  /** $AE92: the raster interrupt, by line (true for the bottom one). */
  private raster() {
    const { ram } = this;
    const line = this.r(0xd012);
    if (this.r(0xd011) & 0x80 || line >= 0xfa) { this.bottom(); return true; }
    if (line < 0xb2) {
      // $32: the top of the playfield
      // (the original asks for line $B2, but its handler reaches the panel's registers after
      // text row 16 has started, a line later: the port, which takes no time, asks for $B3)
      this.w(0xd012, 0xb3); this.w(0xd019, 1);
      Panel.scrollMessage(this);
      Panel.rollScore(this);
      return false;
    }
    // $B2: the panel
    this.w(0xd012, 0xfa); this.w(0xd01a, 3); this.w(0xd019, 3);
    if (!(ram[V.titleMode] & 0x80)) { this.w(0xd018, 0x0c); this.w(0xd022, 0x0b); this.w(0xd023, 0x0e); }
    Panel.powerUp(this);
    Panel.panelSprites(this);
    this.w(0xd016, ((this.r(0xd016) & 0xef) | ram[V.d016Panel]) & 0x18);
    this.r(0xd01e); this.r(0xd01f);
    this.countDown(V.frameCount);
    Panel.nextMessage(this);
    Panel.partGlow(this);
    Panel.partNews(this);
    return false;
  }

  /** $AEFD: line $FA: the playfield's registers for the next frame, then a frame of the game. */
  private bottom() {
    const { ram } = this;
    this.w(0xd011, this.r(0xd011) & 0x7f);
    this.w(0xd012, 0x32); this.w(0xd01a, 7); this.w(0xd019, 7);
    this.w(0xd018, ram[V.d018Play]);
    this.w(0xd01b, 0);
    this.w(0xd022, ram[V.mc1Play]); this.w(0xd023, ram[V.mc2Play]);
    this.w(0xd016, ((this.r(0xd016) & 0xef) | ram[V.d016Play]) & 0x18);
    this.spritesOut();
    if (ram[V.irqBusy] & 0x80) return;
    ram[V.irqBusy] = 0x80;
    if (!(ram[V.roomChange] & 0x80)) {
      this.beforeLogic();
      this.timers();
      joystick(this);
      followScripts(this);
      heroPhysics(this);
      moveSprites(this);
      animateSprites(this);
      fades(this);
      spriteHits(this);
      this.dying();
      hover(this);
      powerCentre(this);
      this.quitKey();
      this.afterLogic();
    }
    ram[V.irqBusy] = 0;
  }

  /** $AE0C: the sprite registers from their shadows. */
  private spritesOut() {
    const { ram } = this;
    for (let r = 0x10; r >= 0; r--) this.w(0xd000 + r, ram[0x0200 + r]);
    for (let x = 7; x >= 0; x--) {
      ram[0x43f8 + x] = ram[V.frame + x];
      this.w(0xd027 + x, ram[V.spriteColour + x]);
    }
    this.w(0xd015, ram[V.spriteEnable]);
    this.w(0xd017, ram[V.spriteExpandY]);
    this.w(0xd01c, ram[V.spriteMulti]);
    this.w(0xd01d, ram[V.spriteExpandX]);
  }

  /** $AF86: timers counted down each frame. */
  private timers() {
    for (let x = 7; x >= 0; x--) this.countDown(0x0248 + x);
    for (const at of [0x93, 0x8c, 0x87, 0x8f, 0x91, 0x40, 0x68, 0x69]) this.countDown(at);
  }

  /** $8B9B: Q restarts (as the original; the front end maps a key to it). */
  private quitKey() {
    if (this.ram[V.titleMode] & 0x80) return;
    this.w(0xdc00, 0x7f);
    if (this.r(0xdc01) === 0xbf) this.restartAsked = true;
  }

  /** $A260: dying and coming back (the rejuvenations), out of the armour. */
  private dying() {
    const { ram } = this;
    if (ram[V.titleMode] & 0x80) return;
    const a = ram[V.anim];
    if (a === 0xa8) this.rejuvenate();
    else if (a === 0xaa) this.rejuvenated();
    else this.dies();
  }

  /** $A273: life flows back in. */
  private rejuvenate() {
    const { ram } = this;
    ram[V.dir] = ram[V.dir + 1] = 0;
    if (ram[0x0203] !== ram[0x0201]) {
      ram[0x0201] = ram[0x0203];
      ram[V.request] = 0xa1;
      ram[0x90] = 0xc8;
      const x = ram[0x0202] + 0x18;
      ram[0x0202] = x & 0xff;
      if (x > 0xff) { ram[V.spriteXHigh] |= 2; this.w(0xd010, ram[V.spriteXHigh]); }
    }
    if (ram[V.gameOver] & 0x80) return;
    if (ram[0x90]) { ram[0x90]--; return; }
    if (ram[V.life] >= 0x1f) {
      this.say((ram[V.deaths] + 0x8b) & 0xff);
      this.w(0xd025, 8);
      ram[V.anim] = 0xaa; ram[V.anim + 1] = 0xab;
      restartHeroAnim(this);
      return;
    }
    if (ram[V.playing + 1] !== 0xa3) { ram[V.request] = 0xa3; ram[V.request + 1] = 0xa4; ram[V.request + 2] = 0xa5; }
    ram[V.life]++;
    this.w(0xd025, (this.r(0xd025) + 1) & 15);
  }

  /** $A2EC: up again. */
  private rejuvenated() {
    const { ram } = this;
    if (ram[0x0203] !== ram[0x0201]) return;
    ram[0x0201] = (ram[0x0203] - 0x15) & 0xff;
    const x = ram[0x0202] - 0x18;
    ram[0x0202] = x & 0xff;
    if (x < 0) {
      ram[V.spriteXHigh] &= 0xfd;
      const d = ram[V.dir] & 0x0c;
      ram[V.dir] = ram[V.dir + 1] = ram[V.jumping] = d;
      ram[0x0203] = ((((ram[0x0203] - 0x32) & 0xff) | 7) + 0x2e) & 0xff;
      ram[0x0201] = (ram[0x0203] - 0x15) & 0xff;
    }
  }

  /** $A31E: out of life: Tal falls (the fifth time, the game is over). */
  private dies() {
    const { ram } = this;
    if (ram[V.anim] === 0xa6 || (ram[V.jumping] | ram[V.inSuit] | ram[V.gameOver]) & 0x80 || ram[V.life]) return;
    ram[V.anim] = 0xa6; ram[V.anim + 1] = 0xa7;
    restartHeroAnim(this);
    if (++ram[V.deaths] < 5) return;
    ram[V.gameOver] = 0x90;
    this.say(0x90);
    ram[V.timer68] = 0xc8;
  }

  /**
   * The original's words for its keys, for ours (added for runstop64): the credits page's
   * "PRESS FIRE TO PLAY", and the end messages' "PRESS FIRE TO PLAY AGAIN" (the new messages go
   * where the original's code was, which the port doesn't need).
   */
  private ourKeys() {
    const t = this.titleText, old = [...'PRESS FIRE TO PLAY'].map((c) => c.charCodeAt(0));
    for (let i = 0; i + old.length <= t.length; i++) {
      if (old.some((c, k) => t[i + k] !== c)) continue;
      const now = [...'SPACE OR FIRE TO PLAY'].map((c) => c.charCodeAt(0));
      t.splice(i - 2, old.length + 2, 9, t[i - 1], ...now);
      break;
    }
    let free = 0x8000;
    for (const n of [16, 21]) {
      const at = this.word(0xc1aa + n * 2);
      let text = '';
      for (let i = at; this.ram[i]; i++) text += String.fromCharCode(this.ram[i]);
      const now = text.replace('PRESS FIRE TO PLAY AGAIN', 'PRESS SPACE OR FIRE TO PLAY AGAIN');
      for (let i = 0; i < now.length; i++) this.ram[free + i] = now.charCodeAt(i);
      this.ram[free + now.length] = 0;
      this.ram[0xc1aa + n * 2] = free & 0xff; this.ram[0xc1aa + n * 2 + 1] = free >> 8;
      free += now.length + 1;
    }
  }

  // ---- helpers used across modules ---------------------------------------------------------------

  /** $8EBE: a message for the panel. */
  say(n: number) { Panel.say(this, n); }
  /** $A82E */
  sound1(s: number) { sound1(this, s); }
  /** $884F */
  dropBomb() { dropBomb(this); }
  /** $B43F: the music driver's start (on the 6502). */
  soundInit() { this.call6502(0xb43f, false); }

  /**
   * Run a routine of the music driver on the 6502, with interrupts enabled as the original's
   * handler enables them (CLI) before calling it: one arriving meanwhile (a collision, a raster
   * line, the other timer) is handled by the port's handler there and then, as it would be.
   */
  private call6502(addr: number, interruptible = true) {
    const cpu = this.m.cpu, irq = cpu.irq;
    cpu.irq = () => {
      if (cpu.p & 0x04) return false;
      const { a, x, y, p, pc, sp } = cpu;
      cpu.p |= 0x04;
      this.irq();
      Object.assign(cpu, { a, x, y, p, pc, sp });
      return true;
    };
    if (interruptible) cpu.p &= ~0x04;
    const start = cpu.cycles;
    try { this.m.call(addr); } finally { cpu.irq = irq; cpu.p |= 0x04; this.musicCycles += cpu.cycles - start; }
  }
}
