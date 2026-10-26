import { hexBytes, TRANSPARENT, type Surface } from 'c64kit';
import raw from './data/motr.json';
import { CORRECT_KIT } from './data';
import { ROW, SCREEN, type Game } from './game';

/**
 * The title screen, as the original's attract screen (InitAttractScreen and
 * the two raster interrupts it runs, AttractFrameUpdate): the big scroller
 * along the top ("MONTY", "ON", "THE RUN !", then the credits), the MONTY
 * High Scores box rolling through the table of 50 (whose factory names are
 * the credits and pictures: WRITTEN BY TONY AND JASON OF MICRO PROJECTS, the
 * Monty silhouettes, MPL), and the purple table of the freedom kit. Ported from
 * the reconstruction's code, with its data.
 *
 * Changes (QOL.md): no freedom kit carousel and nothing to pick (the original's
 * turned under the table, with the picked items above it and an item number on
 * it): the kit, as in play the five that work, stands still under the table as
 * MONTY'S FREEDOM KIT, and the rows above the table are left for ENTER CONTINUE.
 * And the scroller has one more passage: the credits the original's leave out.
 * And no name entry: after a game the original put a score good enough into the
 * table (CONGRATULATIONS !!, PLEASE ENTER YOUR NAME); here a game ends on CONTINUE?
 * (main.ts), so the table is the original's as it ships, rolling as attract mode.
 *
 * Memory: the screen and charset are the Game's (the VIC bank). No sprites.
 */
const T = raw.title;
const ATTRACT_CHR = hexBytes(T.chr);
const BITMASK = hexBytes(T.bitmask);
const NYBBLE = hexBytes(T.nybbleMask);
const ROW_TEMPLATE = hexBytes(T.rowTemplate);
const BAND_COLOURS = hexBytes(T.bandColours);
const SCORE_ROWS = hexBytes(T.scoreRows);
const KIT_MARKS = hexBytes(T.kitMarks);

/** The table: its top in row 21, its pillars in rows 22-24 (columns 7-8 and 31-32). */
export const TABLE_ROW = 21;
/** MONTY'S FREEDOM KIT, in the title's lettering (screen codes $40-$7F; the charset's apostrophe is $68). */
const KIT_LABEL = [..."MONTY'S FREEDOM KIT"].map((c) => (c === "'" ? 0x68 : (c.charCodeAt(0) & 0x3f) | 0x40));
/** Where the kit goes, under the table between the pillars: the label in row 22, the five icons (2x2 characters, 4 columns apart: a carousel step) in rows 23-24. */
export const KIT_LABEL_ROW = 22, KIT_LABEL_COL = 11, KIT_ICON_ROW = 23, KIT_COL = 11;
/** The label in the colour of the original's MONTY FREEDOM KIT. (light blue); the icons white, as the carousel's. */
const KIT_LABEL_COLOUR = 0x0e, KIT_ICON_COLOUR = 1;

/**
 * Our passage for the scroller (in its own control codes, before "GOOD LUCK!"): the
 * credits the original's scroller and table leave out.
 */
const CREDITS: (string | number[])[] = [
  [0xfe, 1], 'ORIGINAL GAME BY ', [0xfe, 7], 'PETER HARRAP. ',
  [0xfe, 1], 'GRAPHICS BY ', [0xfe, 13], 'MARK RODGERS. ',
  [0xfe, 1], 'MUSIC BY ', [0xfe, 14], 'ROB HUBBARD. ',
  [0xfe, 1], 'A TRIBUTE: ', [0xfe, 10], 'RUNSTOP64.          ',
];

/** The scroller's stream: the original's, with our credits before its last passage. */
export const MESSAGE = (() => {
  const original = [...hexBytes(T.message)];
  // its last passage: "<pause 128> <white> <speed 1> <leftwards> !KCUL DOOG ... <restart>"
  const last = original.findIndex((b, i) => b === 0xf9 && original[i + 1] === 128);
  const ours = CREDITS.flatMap((c) => (typeof c === 'string' ? [...c].map((ch) => ch.charCodeAt(0)) : c));
  return Uint8Array.from([...original.slice(0, last), ...ours, ...original.slice(last)]);
})();

/** The table as the original ships it: 50 scores (5 digits), the overflow, 50 names (16). */
const TABLE = hexBytes(T.scores);
const NAMES = 0xff; // name N at NAMES + N*16

const at = (row: number, col: number) => SCREEN + row * ROW + col;

/** The title's stick: up rolls the table faster, fire starts a game. */
interface TitleInput { up: boolean; fire: boolean }

interface TitleSound {
  /** Music.Init(n), or Music.Stop in sound-effects mode (the original's InitialiseMusic for song 0). */
  song(n: number): void;
  /** The player's choice: Hubbard's music, or effects. */
  musicOn(): boolean;
  stop(): void;
}


export class Title {
  /** The high-score table, as the original ships it. */
  readonly table = TABLE;
  /** The fine scroll of the scroller's rows ($D016 bits 0-2, rows 0-4; 38 columns there). */
  get phase() { return this.sPhase; }

  // the scroller ($DA-$E9)
  private sPtr = 0; private sBit = 0; private sDir = 0; private sColour = 0; private pixL = 0; private pixR = 0;
  private sSpeed = 0; private sPhase = 0; private colDone = 0; private pause = 0; private rowsUp = 0; private rowsDown = 0;
  // the table's roll ($D9, $EE, $EF)
  private scrollIdx = 0; private timer = 0;
  // the kit shown
  private readonly contents: number[];
  private readonly message: Uint8Array;

  /** `kit` and `message` default to ours (the five that work, our credits in the scroller); tests give the original's. */
  constructor(private readonly g: Game, private readonly sound: TitleSound, opts: { kit?: number[]; message?: Uint8Array } = {}) {
    this.contents = [...(opts.kit ?? CORRECT_KIT)];
    this.message = opts.message ?? MESSAGE;
  }

  /** InitAttractScreen: the screen drawn, the music started. */
  start() {
    const g = this.g;
    Object.assign(this, { sPtr: 0, sBit: 0, sDir: 0, sColour: 0, pixL: 0, pixR: 0, sSpeed: 0, sPhase: 0, colDone: 0, pause: 0, rowsUp: 0, rowsDown: 0 });
    Object.assign(this, { scrollIdx: 0, timer: 0 });
    this.initialiseMusic();
    // InitialiseGraphicsMode
    g.vic.border = g.vic.background = 0;
    g.vic.enable = 0;
    this.updateChrs();
    this.initKit();
    this.drawBorder();
  }

  /**
   * One frame (50 Hz): the raster interrupts' work (the scroller; the original's other turned
   * the carousel, gone here), then the main loop's turns. Returns 'start' when fire starts the game.
   */
  frame(input: TitleInput): 'start' | null {
    this.scrollerUpdate();
    // AttractScreenPoll: the original's loop turns about three times a frame (its keyboard
    // scan takes most of the time), counting down to the table's next row; the row waits
    // for the next frame.
    for (let turn = 0; turn < 3; turn++) {
      const reload = input.up ? 0x20 : 0x44; // (up: the table rolls faster)
      this.timer = (this.timer - 1) & 0xff;
      if (!this.timer) {
        this.timer = reload;
        this.displayScores();
        break;
      }
      if (input.fire) return 'start';
    }
    return input.fire ? 'start' : null;
  }

  private initialiseMusic() {
    if (this.sound.musicOn()) this.sound.song(0);
    else this.sound.stop();
  }

  // ---- the charset and the frame of the table (Attract.UpdateChrs, HiScore.DrawBorder) ---------------------------

  private updateChrs() {
    const m = this.g.mem;
    m.set(ATTRACT_CHR.subarray(0, 0xb8), 0xb0);
    m.set(ATTRACT_CHR.subarray(0xb8, 0xb8 + 0x100), 0x640);
    m.set(ATTRACT_CHR.subarray(0xb8 + 0x100, 0xb8 + 0x1c0), 0x740);
  }

  private drawBorder() {
    const m = this.g.mem, col = this.g.col;
    m[at(9, 5)] = 0x16; m[at(9, 34)] = 0x17; m[at(16, 5)] = 0x18; m[at(16, 34)] = 0x19;
    for (let x = 0; x < 28; x++) {
      m[at(9, 6 + x)] = 0x1a + (x & 1);
      m[at(16, 6 + x)] = 0x1c + (x & 1);
    }
    for (let x = 0; x < 6; x++) {
      m[at(10 + x, 5)] = 0x1e + (x & 1);
      m[at(10 + x, 34)] = 0x20 + (x & 1);
    }
    // the band over it: MONTY High Scores, between two moles
    for (let x = 19; x >= 0; x--) {
      m[at(6, 10 + x)] = 0xc8 + x;
      m[at(7, 10 + x)] = 0xc8 + x + 0x14;
      col[at(6, 10 + x) - SCREEN] = col[at(7, 10 + x) - SCREEN] = BAND_COLOURS[x];
    }
  }

  // ---- the scroller (Scroller.ScrollerUpdate and the rest) ---------------------------------------------------

  private scrollerUpdate() {
    if (this.pause) { this.pause--; return; }
    if (this.rowsUp) { this.scrollUp(); return; }
    if (this.rowsDown) { this.scrollDown(); return; }
    this.colDone = 0;
    if (this.sDir & 0x80) this.advanceLeft(); else this.advanceRight();
    if (this.sSpeed && !this.colDone) return;
    if (!(this.sDir & 0x80)) {
      this.sBit = (this.sBit + 2) & 0xff;
      if (this.sBit !== 8) { this.renderSlice(); return; }
      this.sBit = 0;
    } else {
      this.sBit = (this.sBit - 2) & 0xff;
      if (this.sBit !== 0xfe) { this.renderSlice(); return; }
      this.sBit = 6;
    }
    this.nextByte();
  }

  /** ScrollAdvanceRight: the phase steps down; past a whole character the six rows move left one. */
  private advanceRight() {
    const y = (this.sPhase - this.sSpeed) & 0xff;
    this.sPhase = y & 7;
    if (!(y & 8)) return;
    const m = this.g.mem, col = this.g.col;
    for (let r = 0; r < 6; r++) col[r * ROW + 39] = this.sColour;
    for (let x = 0; x < 0xf0; x++) { m[SCREEN + x] = m[SCREEN + x + 1]; col[x] = col[x + 1]; }
    for (let r = 0; r < 5; r++) m[at(r, 39)] = 0;
    this.colDone = 1;
  }

  /** ScrollAdvanceLeft: the other way (the colour still goes into column 39, as the original's does). */
  private advanceLeft() {
    const y = this.sPhase + this.sSpeed;
    this.sPhase = y & 7;
    if (!(y & 8)) return;
    const m = this.g.mem, col = this.g.col;
    for (let r = 0; r < 6; r++) col[r * ROW + 39] = this.sColour;
    for (let x = 0xef; x >= 0; x--) { m[SCREEN + x + 1] = m[SCREEN + x]; col[x + 1] = col[x]; }
    for (let r = 0; r < 6; r++) m[at(r, 0)] = 0;
    this.colDone = 1;
  }

  private scrollUp() {
    this.rowsUp--;
    const m = this.g.mem;
    for (let x = 0; x < 40; x++) for (let r = 0; r < 5; r++) m[at(r, x)] = m[at(r + 1, x)];
  }

  private scrollDown() {
    this.rowsDown--;
    const m = this.g.mem;
    for (let x = 39; x >= 0; x--) for (let r = 5; r > 0; r--) m[at(r, x)] = m[at(r - 1, x)];
  }

  private msg(i: number) { return this.message[i] ?? 0xff; }

  /** ScrollNextByte: the next character, after any control codes. */
  private nextByte() {
    for (;;) {
      this.sPtr++;
      const b = this.msg(this.sPtr), op = this.msg(this.sPtr + 1);
      if (b === 0xfe) this.sColour = op;
      else if (b === 0xfd) {
        this.sDir = op;
        if (op & 0x80) { this.sBit = 6; this.pixL = 0; this.pixR = 1; } else { this.sBit = 0; this.pixL = 0x4e; this.pixR = 0x4f; }
      } else if (b === 0xfc) this.sSpeed = op;
      else if (b === 0xfb) { this.rowsUp = 9; continue; }
      else if (b === 0xfa) { this.rowsDown = 9; continue; }
      else if (b === 0xf9) this.pause = op;
      else {
        if (b === 0xff) this.sPtr = 0; // back to the start (its first character drawn now)
        break;
      }
      this.sPtr++; // (the operand)
    }
    this.renderSlice();
  }

  /** ScrollRenderSlice: two columns of the character's pixels, each a quarter of a character cell. */
  private renderSlice() {
    const m = this.g.mem;
    const glyph = ((this.msg(this.sPtr) & 0x3f) | 0x40) * 8;
    for (let y = 7; y >= 0; y--) {
      if (m[glyph + y] & BITMASK[this.sBit]) this.plot(this.pixL, y + 2);
      if (m[glyph + y] & BITMASK[this.sBit + 1]) this.plot(this.pixR, y + 2);
    }
  }

  /** ScrollPlotPixel: the quarter (col, row) lit in its character ($F0-$FF are the sixteen quarter patterns). */
  private plot(col: number, row: number) {
    const a = at(row >> 1, col >> 1);
    this.g.mem[a] = (this.g.mem[a] & 0x0f) | NYBBLE[((row & 1) << 1) | (col & 1)];
  }

  // ---- the high-score table ----------------------------------------------------------------------------------

  /** DisplayScores: the box rolls up a row, the next entry (or a blank, 50-55) comes in at the bottom. */
  private displayScores() {
    this.scrollScoresUp();
    this.loadNextScore(this.scrollIdx);
    this.scrollIdx = this.scrollIdx + 1 === 0x38 ? 0 : this.scrollIdx + 1;
  }

  /** ScrollScoresUp: rows 11-15 of the box up a row (characters and colours). */
  private scrollScoresUp() {
    const m = this.g.mem, col = this.g.col, base = 10 * ROW + 6;
    for (let x = 0; x < 28; x++) {
      for (let r = 0; r < 5; r++) {
        m[SCREEN + base + x + SCORE_ROWS[r]] = m[SCREEN + base + x + SCORE_ROWS[r + 1]];
        col[base + x + SCORE_ROWS[r]] = col[base + x + SCORE_ROWS[r + 1]];
      }
    }
  }

  /** LoadNextScore: rank, score and name into row 15, all one random colour. */
  private loadNextScore(i: number) {
    const m = this.g.mem, col = this.g.col;
    if (i >= 50) { m.fill(0, at(15, 6), at(15, 6) + 28); return; }
    const row = ROW_TEMPLATE.slice();
    row[1] = 0x30 + Math.floor((i + 1) / 10);
    row[2] = 0x30 + ((i + 1) % 10);
    row.set(this.table.subarray(i * 5, i * 5 + 5), 5);
    for (let y = 0; y < 16; y++) { const c = this.table[NAMES + i * 16 + y]; row[11 + y] = c === 0x22 ? 0x2a : c; }
    let colour = 0;
    while (!colour) colour = this.g.random() & 0x0f;
    for (let x = 0; x < 28; x++) { m[at(15, 6) + x] = row[x] | 0x40; col[at(15, 6) + x - SCREEN] = colour; }
  }

  // ---- the screen's lower part: the table, and the kit under it (FreedomKit.InitCarousel, without the carousel) ----

  /**
   * InitCarousel's drawing, less the carousel: the screen cleared, the purple table and its
   * pillars as the original draws them (with no item number on it), and the freedom kit under
   * it, standing still between the pillars: MONTY'S FREEDOM KIT in the title's lettering and
   * light blue, and the five icons as the carousel drew them (the original's icon graphics,
   * white), a carousel step (32 pixels) apart. Above the table, where the original showed
   * MONTY FREEDOM KIT. and the picked icons, is left empty: ENTER CONTINUE goes there (main.ts).
   */
  private initKit() {
    const g = this.g, m = g.mem, col = g.col;
    this.sBit = 6; this.sDir = 0; this.sPtr = 0; // (as InitCarousel leaves the scroller)
    // ClearScreen
    m.fill(0, SCREEN, SCREEN + 1024);
    col.fill(3, 0, 1024);
    // the table (row 21) and the pillars at its ends (rows 22-24)
    for (let x = 0; x < 26; x++) { m[at(TABLE_ROW, 7) + x] = 0x2a; col[at(TABLE_ROW, 7) + x - SCREEN] = 4; }
    m[at(TABLE_ROW, 7)] = 0x28;
    m[at(TABLE_ROW, 32)] = 0x29;
    for (let x = 5; x >= 0; x--) {
      const y = KIT_MARKS[x];
      m[at(TABLE_ROW + 1, 7) + y] = m[at(TABLE_ROW + 1, 31) + y] = 0x22 + x;
      col[at(TABLE_ROW + 1, 7) + y - SCREEN] = col[at(TABLE_ROW + 1, 31) + y - SCREEN] = 4;
    }
    // the kit's icons into characters 2-21 (each pushing the last along, ShiftCharsetChars): item i's are 2+4i to 5+4i
    for (const item of this.contents) {
      m.copyWithin(0x10, 0x30, 0xb0);
      m.set(m.slice(0x3800 + item * 32, 0x3800 + item * 32 + 32), 0x90);
    }
    // under the table: the label, then the icons (top left, top right / bottom left, bottom right)
    KIT_LABEL.forEach((c, x) => { m[at(KIT_LABEL_ROW, KIT_LABEL_COL) + x] = c; col[at(KIT_LABEL_ROW, KIT_LABEL_COL) + x - SCREEN] = KIT_LABEL_COLOUR; });
    for (let i = 0; i < 5; i++) {
      const c = KIT_COL + i * 4, ch = 2 + i * 4;
      [[0, 0, ch], [0, 1, ch + 1], [1, 0, ch + 2], [1, 1, ch + 3]].forEach(([dy, dx, code]) => {
        m[at(KIT_ICON_ROW + dy, c + dx)] = code;
        col[at(KIT_ICON_ROW + dy, c + dx) - SCREEN] = KIT_ICON_COLOUR;
      });
    }
  }
}

/**
 * The scroller's smooth scroll, as the VIC shows it: rows 0-4 (above the raster split
 * at line 90) moved right by the phase, in 38-column mode (the border covers the
 * first 7 and last 9 pixels). Call after the picture is drawn into the screen.
 */
export function fineScroll(s: Surface, phase: number, border: number) {
  const p = s.pixels;
  for (let y = 0; y < 40; y++) {
    const o = y * s.width;
    if (phase) { p.copyWithin(o + phase, o, o + s.width - phase); p.fill(TRANSPARENT, o, o + phase); }
    p.fill(border, o, o + 7);
    p.fill(border, o + s.width - 9, o + s.width);
  }
  s.version++;
}

/** The table's top score (the HUD's HI-SCORE, as HUD.Init reads it). */
export function topScore(table: Uint8Array) {
  return Number(String.fromCharCode(...table.subarray(0, 5))) || 0;
}
