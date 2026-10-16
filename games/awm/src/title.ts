/**
 * The title of Auf Wiedersehen Monty: the temple with its two pillars (the game's room $63), two moles that stand
 * on it and now and then walk in and out, the menu between the pillars (F1 music, F7 effects) and the credits scrolling
 * along the bottom in big letters. Fire starts a game.
 *
 * What the original's title does ($406E set-up, the loop at $418D, the interrupt chain at $42A3):
 *
 *   - set-up: the screen cleared, room $63 drawn, the four columns at each side of the room made from the room's
 *     edge columns (mirrored), the menu's ten characters put on row 14;
 *   - a loop of two phases a frame, as in play: phase A turns the menu's colours on, sets the sprite registers
 *     ($5C81), turns the animated tiles, looks at F1 and F7, counts the moles' wait down and builds their pictures;
 *     phase B swaps the sprite buffers, sets the registers, and (once the wait is over) takes a step of the first
 *     mole's walk-in with Monty's own routine; the second mole is the first mirrored ($EF - x, the other way round).
 *     After either the menu's lettering is drawn from the font into the characters it uses;
 *   - the interrupt chain, four stages a frame (line 0 the sprite registers and text mode; $68 the scroller steps and its
 *     sprites go to their places; $C0 the VIC's invalid ECM + bitmap mode, which draws the whole lower part black, the
 *     big sprites expanded and multicolour; $F8 the border opened).
 *
 * What the lower part shows is black: the bitmap mode the title switches on at line $C0 has extended colour on too (D011 =
 * $7B), one of the VIC-II's invalid modes, which draws nothing but black. c64kit's model used to draw the bitmap under it
 * (the sprite pictures and the sound data, since bank 3's memory at $C000 holds them), seen between the big letters; a real
 * C64 shows the letters over black.
 */
import type { FrameCapture } from 'c64kit';
import { NO_ROOM, RANDOM, SPECIAL, SPRITE_FRAMES, TABLES, WORLD_GRID, fromHex } from './data';
import { TITLE_FONT_HEX } from './data/title-data';
import { walkInStep } from './game';
import { menuText } from './flow';
import { Monty, type MontyHost } from './monty';
import { Random } from './rng';
import { COLS, drawCells, ROWS, type Room, unpackCells } from './room';
import { Scroller, SCROLLER_SPRITES, bigLetter } from './scroller';
import { animateTiles, CHARSET_AT, EntityRegisters, type EntityRecord, Screen, SCREEN_AT, SCREEN_COLS } from './screen';
import { putSpriteImage } from './sprites';
import { SoundLog } from './soundlog';
import { TITLE_ROOM } from './sound';
import { State } from './tiles';
import { World } from './world';

/** The key presses the title acts on: fire starts, F1 chooses the music, F7 the effects. */
export interface TitleKeys { readonly fire: boolean; readonly f1: boolean; readonly f7: boolean }

/** What a title keeps from one visit to the next (the original does not reset any of it): the sprites' buffers and the phase of the loop. */
export interface TitleCarry {
  /** $4007: the loop's toggle (set after a pass: 1 for phase A). */
  toggle: number;
  /** $4037: counts phase B's; its low bit says which sprite buffer is built into. */
  beat: number;
  /** $6701: the buffer the pictures are built into, and $5C80 the pointer the sprites show the other one by. */
  buildAt: number;
  pointerBase: number;
  /** The sprite buffer at $3A00 ($200 bytes) as the game left it (a fresh program's is clear). */
  buffer?: Uint8Array;
}

/** The frames the original's room draw takes before the loop's first pass; its interrupt chain steps the scroller in each. */
export const SETUP_FRAMES = 5;
/** After a game it is one more: the interrupt chain of play is running when the set-up starts, and the title's starts a frame later (measured, test/program.ts). */
export const SETUP_FRAMES_AFTER_GAME = 6;

/** A fresh program's: the file's own values. */
export const FRESH_CARRY: TitleCarry = { toggle: 0, beat: 0, buildAt: 0x0200, pointerBase: 0x08 };

const FIRST_COL = 4;
/** The second sprite buffer ($3A00, in the character set's memory). */
const SPRITE_BUFFER = 0x3a00;
/** The menu: ten characters from $2F on row 14 from column 15 ($063F: its colours are the cells' in colour RAM). */
const MENU_CHAR = 0x2f;
const MENU_ROW = 14;
const MENU_COL = 15;
const MENU_LENGTH = 10;
/** The mirrored columns at each side of the room ($4114). */
const SIDE_COLS = 4;
/** The moles' first wait ($4009, $400A): the first runs 3 x 4 passes of phase A with the 256-step carry between. */
const WAIT_LOW = 3;
const WAIT_HIGH = 4;
/** The first mole's start ($40B7-$40C6) and the second's colour. */
const MOLE_X = 0x40;
const MOLE_Y = 0x10;
const MOLE_COLOUR = 1;
/** The state the first mole waits in ($4F87 = 1: the loop leaves him alone) until the wait is over. */
const WAITING = 1;
/** Frame 1 is the picture he stands in. */
const STAND_FRAME = 1;
/** The beam: the picture's first line, the lines the interrupt chain's stages are at, and the registers' delay after them. */
const FIRST_LINE = 0x33;
const LINES = 312;
const MODE_SWITCH_ROW = 18;
/** The title's rows: ECM text with the character set at $3800 and the screen at $0400 (D018 = $1E). */
const TEXT_ROW = { d011: 0x5b, d016: 0x08, d018: 0x1e, bank: 0 } as const;
/** The lower rows: ECM and bitmap together (D011 = $7B), the bank 3 ($DD00 = 0) with D018 = $70. */
const INVALID_ROW = { d011: 0x7b, d016: 0x08, d018: 0x70, bank: 0xc000 } as const;
/** The big letters: colours of the sprites ($0F), the multicolour pair ($D025 = $0B, $D026 = $01). */
const BIG_COLOUR = 15;
const BIG_MC1 = 11;
const BIG_MC2 = 1;

const FONT = fromHex(TITLE_FONT_HEX);

/** Room $63 as the only room the title's Monty knows. */
const TITLE_ROOMS: readonly Room[] = (() => {
  const rooms: Room[] = [];
  rooms[TITLE_ROOM] = SPECIAL;
  return rooms;
})();

export class Title implements MontyHost {
  readonly screen = new Screen();
  /** The frame the VIC makes; `ram` is what it reads (the VIC's bank 0 is all of it the picture needs: the lower rows draw black). */
  capture: FrameCapture;
  get ram(): Uint8Array {
    return this.screen.ram;
  }
  /** $4066: 0 shows MUSIC ON, 1 EFFECTS ON (what the game then asks of its sound drivers, flow.ts). */
  soundFlag: number;

  readonly sound = new SoundLog();
  private readonly world = new World(TITLE_ROOMS, WORLD_GRID, NO_ROOM, TITLE_ROOM);
  private readonly mole = new Monty(this.world, new Random(RANDOM), TABLES.tileGfx, this);
  private readonly entities = new EntityRegisters();
  /** The second mole's record ($5C4C): the first one's, mirrored; copied at the end of phase B. */
  private second = { x: 0, y: 0, frame: 0, faceLeft: false };
  /** $4009, $400A: the wait before the moles first walk. */
  private waitLow = WAIT_LOW;
  private waitHigh = WAIT_HIGH;
  private first = true;

  constructor(private readonly scroller: Scroller, soundFlag: number, private readonly carry: TitleCarry = { ...FRESH_CARRY }, leadIn = SETUP_FRAMES) {
    this.soundFlag = soundFlag;
    scroller.restart();
    if (carry.buffer) this.screen.ram.set(carry.buffer, SPRITE_BUFFER);
    this.setUp();
    // (the original draws the room over several frames, with the interrupt chain running: the scroller has moved on by the first pass)
    for (let i = 0; i < leadIn; i++) scroller.step();
    this.capture = this.finish();
  }

  /** The state a visit leaves for the next. */
  get kept(): TitleCarry {
    return this.carry;
  }

  /** The first mole's picture ($5C46, $5C48): a new game does not set Monty's own until his first step, so it shows this. */
  get moleLook(): { frame: number; faceLeft: boolean } {
    return { frame: this.mole.frame, faceLeft: this.mole.faceLeft };
  }

  // ---- MontyHost: only the walk-in runs --------------------------------------------------------

  enterRoom(): void {
    throw new Error('the title\'s mole went through an exit');
  }

  scripted(): void {
    if (this.mole.state !== State.Intro) throw new Error(`the title's mole is in state $${this.mole.state.toString(16)}`);
    if (!walkInStep(this.mole)) return;
    this.mole.state = State.Free;
    this.mole.step = 0;
  }

  // ---- set-up ($406E) --------------------------------------------------------------------------

  private setUp(): void {
    const { screen, mole } = this;
    // ($5C1D: every cell blank, colour RAM white)
    screen.ram.fill(0, SCREEN_AT, SCREEN_AT + SCREEN_COLS * 25);
    screen.colour.fill(1);
    // (the 64 characters extended colour mode can show; the rest of the set's memory holds the sprite buffer at $3A00)
    screen.ram.set(TABLES.charset.subarray(0, 64 * 8), CHARSET_AT);
    // the moles ($40A6-$40C6)
    mole.x = MOLE_X;
    mole.y = MOLE_Y;
    mole.frame = STAND_FRAME;
    mole.faceLeft = false;
    mole.step = 0;
    mole.state = WAITING;
    // room $63 ($5581)
    const drawn = drawCells(SPECIAL, TABLES, unpackCells(SPECIAL), []);
    screen.ram.set(drawn.chars.subarray(0, 16 * 8), CHARSET_AT);
    for (let i = 0; i < COLS * ROWS; i++) {
      screen.put(FIRST_COL + (i % COLS), Math.floor(i / COLS), drawn.codes[i] ?? 0, drawn.colours[i] ?? 0);
    }
    // the sides ($4114): the room's four edge columns mirrored out into the four columns at each side
    for (let row = 0; row < ROWS; row++) {
      for (let i = 0; i < SIDE_COLS; i++) {
        const left = FIRST_COL + i, right = FIRST_COL + COLS - 1 - i;
        screen.put(FIRST_COL - 1 - i, row, screen.code(left, row), screen.colour[row * SCREEN_COLS + left]);
        screen.put(FIRST_COL + COLS + i, row, screen.code(right, row), screen.colour[row * SCREEN_COLS + right]);
      }
    }
    animateTiles(screen, SPECIAL.names);
    this.latch();
    // the menu's cells ($4179)
    for (let i = 0; i < MENU_LENGTH; i++) screen.put(MENU_COL + i, MENU_ROW, MENU_CHAR + i, 1);
  }

  // ---- the loop ($418D) ------------------------------------------------------------------------

  /**
   * One frame of the loop, with the keys as they are now. The first call goes straight into the first pass (the set-up's
   * own frame); the others read fire first, and fire starts the game ($4285): returns `'start'`, nothing else is done.
   */
  frame(keys: TitleKeys): 'start' | null {
    if (this.first) this.first = false;
    else if (keys.fire) {
      // (the rest of the frame runs the title's interrupts: the scroller steps once more before the game's chain takes over at the next frame's line 0)
      this.scroller.step();
      return 'start';
    }
    this.carry.toggle ^= 1;
    if (this.carry.toggle !== 0) this.phaseA(keys);
    else this.phaseB();
    this.drawMenu();
    this.scroller.step();
    this.capture = this.finish();
    return null;
  }

  /** $4199: the menu's colours turn on, the registers, the tiles, the keys, the wait, the moles' pictures. */
  private phaseA(keys: TitleKeys): void {
    const { screen, mole } = this;
    for (let i = 0; i < MENU_LENGTH; i++) {
      const at = MENU_ROW * SCREEN_COLS + MENU_COL + i;
      screen.colour[at] = ((screen.colour[at] ?? 0) + 1) & 15;
    }
    this.latch();
    animateTiles(screen, SPECIAL.names);
    if (keys.f1) this.soundFlag = 0;
    if (keys.f7) this.soundFlag = 1;
    if (mole.state === WAITING) {
      this.waitLow = (this.waitLow - 1) & 0xff;
      if (this.waitLow === 0) {
        this.waitHigh = (this.waitHigh - 1) & 0xff;
        if (this.waitHigh === 0) mole.state = State.Intro;
      }
    }
    putSpriteImage(screen.ram, this.carry.buildAt, SPRITE_FRAMES, mole.frame, !mole.faceLeft);
    putSpriteImage(screen.ram, this.carry.buildAt + 64, SPRITE_FRAMES, this.second.frame, !this.second.faceLeft);
  }

  /** $41EA: the buffers swapped, the registers, a step of the walk-in, the second mole made from the first. */
  private phaseB(): void {
    const { mole } = this;
    this.carry.beat = (this.carry.beat + 1) & 0xff;
    const odd = (this.carry.beat & 1) === 1;
    this.carry.buildAt = odd ? 0x0200 : 0x3a00;
    this.carry.pointerBase = odd ? 0xe8 : 0x08;
    this.latch();
    if (mole.state !== WAITING) {
      mole.state = State.Intro;
      mole.advance(0);
    }
    this.second = { x: (0xef - mole.x) & 0xff, y: mole.y, frame: mole.frame, faceLeft: !mole.faceLeft };
  }

  /** $5C81: the moles' records into the registers. */
  private latch(): void {
    const { mole } = this;
    const records: EntityRecord[] = [
      { x: mole.x, y: mole.y, colour: MOLE_COLOUR },
      { x: this.second.x, y: this.second.y, colour: MOLE_COLOUR },
    ];
    this.entities.latch(records, this.carry.pointerBase);
  }

  /** $4231: the menu's ten letters from the font into the characters under them. */
  private drawMenu(): void {
    const text = menuText(this.soundFlag);
    for (let i = 0; i < MENU_LENGTH; i++) {
      const at = ((text.charCodeAt(i) - 0x20) & 0x3f) * 8;
      this.screen.ram.set(FONT.subarray(at, at + 8), CHARSET_AT + (MENU_CHAR + i) * 8);
    }
  }

  // ---- the picture ------------------------------------------------------------------------------

  /** The frame as the VIC and the interrupt chain make it. */
  private finish(): FrameCapture {
    const { screen, entities } = this;
    const rows: FrameCapture['rows'] = [];
    for (let row = 0; row < 25; row++) {
      const mode = row >= MODE_SWITCH_ROW ? INVALID_ROW : TEXT_ROW;
      rows.push({
        codes: screen.ram.slice(SCREEN_AT + row * SCREEN_COLS, SCREEN_AT + (row + 1) * SCREEN_COLS),
        colours: screen.colour.slice(row * SCREEN_COLS, (row + 1) * SCREEN_COLS),
        ...mode, bg: [0, 0, 0, 0], line: FIRST_LINE + 8 * row,
      });
    }
    const sprites: FrameCapture['sprites'] = [];
    // the moles: sprites 0 and 1 are the first (the second a black outline), 2 the second mole
    for (const n of [0, 1, 2]) {
      const pointer = (entities.pointer[n] ?? 0) * 64;
      sprites.push({
        n, x: (entities.x[n] ?? 0) | (entities.xHigh[n] ? 0x100 : 0), y: entities.y[n] ?? 0, data: screen.ram.slice(pointer, pointer + 64),
        colour: n === 0 ? BIG_COLOUR : entities.colour[n] ?? 0, multicolour: false, expandX: false, expandY: false, behind: false, mc1: BIG_MC1, mc2: BIG_MC2,
      });
    }
    // the big letters, set by the first stage of the chain once the moles have been drawn
    const { x, y } = this.scroller.registers();
    for (let n = 0; n < SCROLLER_SPRITES; n++) {
      sprites.push({
        n, x: x[n] ?? 0, y: y[n] ?? 0, data: bigLetter(this.scroller.pointers[n] ?? 0), colour: BIG_COLOUR,
        multicolour: true, expandX: true, expandY: true, behind: false, mc1: BIG_MC1, mc2: BIG_MC2,
      });
    }
    sprites.sort((a, b) => a.y - b.y || a.n - b.n);
    return { rows, sprites, border: 0, borderLines: new Uint8Array(LINES) };
  }
}
