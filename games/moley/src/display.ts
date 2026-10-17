/**
 * The picture the way the original makes it: the Spectrum's screen memory (a 256 x 192 bitmap in the ULA's layout and one attribute
 * byte for each 8 x 8 cell), changed by the same steps as the original's routines, so that what is on it after each pass is what
 * the original has on its screen (test/picture.ts compares them).
 *
 * What the original does, and so this does (re/README.md, "Entities, sprites and drawing"):
 * - entering a room (`$854A`) clears the play area, draws every tile of the map, and puts the full gauge up;
 * - each pass (`$87C4`) the 3 x 3 cells round each of the 8 entities are drawn from the map into a copy of the bitmap (`buffer`), the
 *   sprites are drawn into that copy with `copy OR (sprite AND mask(copy))` (room 5: OR only), the cells that are covered are
 *   copied to the screen, and the cells that were covered the pass before and are not now are drawn from the map on the screen
 *   (`counters`: 2 when covered, 1 for a pass after, then 0). Nothing else on the screen is touched, so a cell the map and the
 *   screen disagree about (room 2 rewrites its map) shows what it showed until something covers it;
 * - the two conveyor tiles turn one row each pass, in the tile set itself (so a room entered later draws them as they are then);
 * - the HUD is redrawn when it changes: faces (`$8740`), gauge (`$876D`), the item box (`$878A`), score and high score (`$9F68`).
 *   Here the HUD is made from the game's state every time, which is the same picture;
 * - dying (`$9592`) shows Monty's three death pictures and then none, a frame each (the last for 26); running out of gauge
 *   (`$9246`) first cycles the ink of the dial's cells for 56 frames. These are `shots`, for the front end to show in turn.
 * Not here: the credits page, game over and the ending (stage 5).
 *
 * Not modelled (re/README.md): an entity whose 3 x 3 cells run off the 18 rows, where the original's counter table runs into the code after it.
 */
import { BLANK_FRAME, GAUGE_FRAMES, GLYPHS, MAP_COLUMNS, PANEL_ATTRS, PANEL_BITMAP, ROOM_ROWS, ROOM_SIZE, SPRITE_FRAMES, TILES } from './data';
import type { Game, Observer } from './game';
import type { Death } from './stage';
import { cellInk, cellPaper, PANEL_TOP, PICTURE_HEIGHT, PICTURE_WIDTH } from './picture';
import { drawByte, spriteRows } from './sprite';

export const BITMAP_BYTES = 6144;
const ATTR_CELLS = 768;
/** Monty's three death pictures (`$9592`). */
const DEATH_FRAMES = [0xb0, 0xb1, 0xb2] as const;
/**
 * How long each death picture shows: a draw and a HALT take two frames (measured: test/picture.ts), and the last, empty one stays for
 * the 25 HALTs that follow its draw (`$95BA`).
 */
const DEATH_HOLD = 2, DEATH_LAST_HOLD = 25;
/** The death's sound (`$A06B`, 44 ms) holds the screen for three frames (measured: test/flow.ts) before the first picture. */
const SOUND_FRAMES = 3;
/** The time-out noise (`$A04E`, 1139 toggles, 265 ms) holds the screen for 13 frames. */
const NOISE_FRAMES = 13;
/** The dial's cells that flash when time runs out (`$A2D1`): 6 rows of 8 from row 18, column 24, 56 steps. */
const DIAL_ROW = 18, DIAL_COLUMN = 24, DIAL_STEPS = 56;
/** The gauge's two pictures sit at columns 26 and 28 of cell row 20, the item box at column 19 and the faces from column 1 every 3 in row 21. */
const GAUGE_COLUMN = 26, GAUGE_ROW = 20, POCKET_COLUMN = 19, FACE_COLUMN = 1, FACE_STRIDE = 3, HUD_ROW = 21, FACE_SLOTS = 5;
/** The score is printed from row 19, column 7; the high score from column 18. */
const SCORE_ROW = 19, SCORE_COLUMN = 7, HIGH_COLUMN = 18, SCORE_WEIGHTS = [1000, 100, 10, 1] as const;
const FIRST_FACE_FRAME = 0;
const CONVEYORS = [{ tile: 0x55 }, { tile: 0x7b }] as const;
const ROOM_FIVE = 5;

/** The ULA's address (from $4000) of the first byte of pixel row `y`. */
export function rowOffset(y: number): number {
  return ((y & 0xc0) << 5) | ((y & 7) << 8) | ((y & 0x38) << 2);
}

/** The offset of the top line of cell number `cell` (row * 32 + column). */
export function cellOffset(cell: number): number {
  return rowOffset((cell >> 5) << 3) + (cell & 31);
}

/** A picture to show for a number of frames: the bitmap and the attributes as they were. */
export interface Shot {
  readonly bits: Uint8Array;
  readonly attrs: Uint8Array;
  /** the same without the sprites (`Display.plain`), and the sprites, for the look that draws them over the cells */
  readonly plain: Uint8Array;
  readonly sprites: readonly SpritePlace[];
  readonly frames: number;
}

/** One entity as it is drawn: where, which picture, which way it faces. */
export interface SpritePlace {
  /** which entity (0 is Monty) */
  readonly entity: number;
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly facingLeft: boolean;
}

export class Display implements Observer {
  /** the screen's bitmap in the ULA's layout, and the attributes of all 24 rows (rows 0-17 follow the game's `attrs` when read) */
  readonly bits = new Uint8Array(BITMAP_BYTES);
  readonly panelAttrs = PANEL_ATTRS.slice();
  /** the copy the sprites are drawn into, and how recently each cell was covered */
  readonly buffer = new Uint8Array(BITMAP_BYTES);
  readonly counters = new Uint8Array(ROOM_SIZE);
  /** the room tile set, which the conveyors turn (the original turns it in its own memory) */
  readonly tileSet = TILES.slice();
  /** pictures to show before the pass's own: dying, running out of time (the front end takes them with `takeShots`) */
  private shots: Shot[] = [];
  private gaugeLevel = 7;
  /** the high score the panel shows now (it is printed when it changes) */
  highShown = 0;
  /** how many times a room has been entered (a front end or a test can see that a pass entered one) */
  entries = 0;

  constructor(readonly game: Game) {
    game.observer = this;
    this.newGame();
    this.roomEntered();
  }

  /** The pictures of a death or of time running out, in the order to show them; the list is emptied. */
  takeShots(): Shot[] {
    const out = this.shots;
    this.shots = [];
    return out;
  }

  // ---- the moments (Observer) ------------------------------------------------------------------------

  newGame(): void {
    this.bits.fill(0);
    for (let y = PANEL_TOP; y < PICTURE_HEIGHT; y++) {
      for (let col = 0; col < 32; col++) this.bits[rowOffset(y) + col] = PANEL_BITMAP[((y & 7) << 8) + (((y >> 3) & 7) << 5) + col];
    }
    this.panelAttrs.set(PANEL_ATTRS);
    this.highShown = 0;
    this.gaugeLevel = 7;
    this.shots = [];
  }

  roomEntered(): void {
    const game = this.game;
    this.entries++;
    if (game.room >= ROOM_COUNT_PLAY) return; // (the card: stage 5)
    for (let y = 0; y < PANEL_TOP; y++) this.bits.fill(0, rowOffset(y), rowOffset(y) + 32);
    for (let cell = 0; cell < ROOM_SIZE; cell++) this.drawTile(this.bits, cell, game.tiles.memory[game.tiles.base + cell]);
    // (the full gauge goes up with the room; the pass that follows would draw it anyway, but GAME OVER follows a room entered with no pass)
    this.gaugeLevel = 7;
    this.blit(GAUGE_FRAMES, this.gaugeLevel * 64, GAUGE_ROW, GAUGE_COLUMN);
    this.blit(GAUGE_FRAMES, this.gaugeLevel * 64 + 32, GAUGE_ROW, GAUGE_COLUMN + 2);
  }

  pocketShown(): void {
    this.blit(SPRITE_FRAMES, this.game.pocket * 32, HUD_ROW, POCKET_COLUMN);
  }

  timedOut(): void {
    for (let step = 0; step < DIAL_STEPS; step++) {
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 8; col++) {
          const at = (DIAL_ROW - ROOM_ROWS + row) * MAP_COLUMNS + DIAL_COLUMN + col;
          this.panelAttrs[at] = ((this.panelAttrs[at] + 1) & 0xc7);
        }
      }
      this.hud();
      // (the last stays for the frames the death's sound takes before the death pictures start)
      this.shots.push(this.snapshot(step === DIAL_STEPS - 1 ? 1 + SOUND_FRAMES : 1));
    }
  }

  died(kind: Death): void {
    if (kind !== 'normal') {
      // (the face goes, then the time-out noise plays over the screen as it is, 265 ms: `$95C8`)
      this.hud();
      this.shots.push(this.snapshot(NOISE_FRAMES));
      return;
    }
    const monty = this.game.monty;
    // (the death's sound plays first over the screen as it was, unless running out of time has just shown the dial: its last step holds it)
    if (this.shots.length === 0) this.shots.push(this.snapshot(SOUND_FRAMES));
    this.hud(); // (the face goes first, before the first picture is drawn)
    for (const frame of DEATH_FRAMES) {
      monty.frame = frame;
      this.draw();
      this.shots.push(this.snapshot(DEATH_HOLD));
    }
    monty.frame = BLANK_FRAME;
    this.draw();
    this.shots.push(this.snapshot(DEATH_LAST_HOLD));
  }

  redraw(first: number, count: number): void {
    for (let cell = first; cell < first + count && cell < ROOM_SIZE; cell++) this.counters[cell] = 1;
  }

  itemTaken(cell: number): void {
    const at = cellOffset(cell);
    for (let line = 0; line < 8; line++) this.bits[at + (line << 8)] = 0;
  }

  drawn(): void {
    this.draw();
    if (this.game.room !== ROOM_FIVE) this.turnConveyors();
  }

  // ---- drawing -------------------------------------------------------------------------------------------

  /** The screen as it is, nothing else drawn on it: no sprites (a room just entered, before the first pass), for `frames` frames. */
  still(frames: number): Shot {
    const bits = this.bits.slice();
    return { bits, attrs: this.attributes(), plain: bits, sprites: [], frames };
  }

  /** The screen as it is with its sprites, for `frames` frames (a death picture, a pass held while a sound plays). */
  snapshot(frames: number): Shot {
    return { bits: this.bits.slice(), attrs: this.attributes(), plain: this.plain(), sprites: this.sprites(), frames };
  }

  /**
   * The screen as it would be with no sprite on it: the cells the last draw covered (their counter is 1) are drawn from the map
   * again, the rest is the screen. The look without colour clash is made on this.
   */
  plain(): Uint8Array {
    const out = this.bits.slice();
    const game = this.game;
    for (let cell = 0; cell < ROOM_SIZE; cell++) {
      if (this.counters[cell] === 1) this.drawTile(out, cell, game.tiles.memory[game.tiles.base + cell]);
    }
    return out;
  }

  /** The entities that show something, in drawing order from the back (Monty is entity 0 and in front), with their colours. */
  sprites(): SpritePlace[] {
    const game = this.game;
    const out: SpritePlace[] = [];
    for (let i = game.entities.length - 1; i >= 0; i--) {
      const e = game.entities[i];
      if (e.frame === BLANK_FRAME) continue;
      out.push({ entity: i, x: e.x, y: e.y, frame: e.frame, facingLeft: (e.flags & 0x80) !== 0 });
    }
    return out;
  }

  /** The tile `tile` of the map, drawn on the cell `cell` of `dst` (tile 0: an empty cell). */
  private drawTile(dst: Uint8Array, cell: number, tile: number): void {
    const at = cellOffset(cell);
    const from = (tile - 1) * 8;
    for (let line = 0; line < 8; line++) dst[at + (line << 8)] = tile === 0 || from + 8 > this.tileSet.length ? 0 : this.tileSet[from + line];
  }

  /** A tile drawn at the address `at` (a cell's top line) of `dst`, the lines 256 bytes apart. */
  private drawTileAt(dst: Uint8Array, at: number, tile: number): void {
    const from = (tile - 1) * 8;
    for (let line = 0; line < 8; line++) dst[(at + (line << 8)) & 0x1fff] = tile === 0 || from + 8 > this.tileSet.length ? 0 : this.tileSet[from + line];
  }

  /** `$87C4`: redraw what the entities cover, draw them, and show it. */
  private draw(): void {
    this.hud();
    const game = this.game;
    const map = game.tiles.memory, base = game.tiles.base;
    for (const e of game.entities) {
      const first = ((e.y & 0x7f) >> 3) * MAP_COLUMNS + (e.x >> 3);
      // the cells are walked as the original walks them: the map and the counters by cell number, the copy by its address (`HL`), which
      // runs on into the next row when the third column is past 31 (and into the next pixel line, from the last row of a third)
      let rowStart = cellOffset(first & 0x3ff);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const cell = first + r * MAP_COLUMNS + c;
          if (cell >= ROOM_SIZE) continue;
          this.counters[cell] = 2;
          this.drawTileAt(this.buffer, rowStart + c, map[base + cell]);
        }
        const low = (rowStart & 0xff) + 0x20;
        rowStart = (rowStart & 0xff00) + (low & 0xff) + (low > 0xff ? 0x800 : 0);
      }
    }
    const orOnly = game.room === ROOM_FIVE;
    for (const e of game.entities) this.drawSprite(e.frame, e.x, e.y, (e.flags & 0x80) !== 0, orOnly);
    for (let cell = 0; cell < ROOM_SIZE; cell++) {
      const was = this.counters[cell];
      if (was === 0) continue;
      this.counters[cell] = was - 1;
      if (was === 2) {
        const at = cellOffset(cell);
        for (let line = 0; line < 8; line++) this.bits[at + (line << 8)] = this.buffer[at + (line << 8)];
      } else this.drawTile(this.bits, cell, map[base + cell]);
    }
  }

  /** `$8931`: a sprite into the copy. */
  private drawSprite(frame: number, x: number, y: number, facingLeft: boolean, orOnly: boolean): void {
    const rows = spriteRows(frame, x, facingLeft);
    const column = x >> 3, top = y & 0x7f;
    for (let r = 0; r < 16; r++) {
      const line = rowOffset(top + r);
      // (the three bytes are reached with `INC C`: past column 31 they run on into the next row of the third, as the original does)
      for (let k = 0; k < 3; k++) {
        const at = (line & 0xff00) | (((line & 0xff) + column + k) & 0xff);
        this.buffer[at] = drawByte(this.buffer[at], rows[r * 3 + k], orOnly);
      }
    }
  }

  /** The conveyors: row 0 of each tile turns right and row 2 left, one pixel (`$8279`). */
  private turnConveyors(): void {
    for (const { tile } of CONVEYORS) {
      const at = (tile - 1) * 8;
      const a = this.tileSet[at], b = this.tileSet[at + 2];
      this.tileSet[at] = ((a >> 1) | (a << 7)) & 0xff;
      this.tileSet[at + 2] = ((b << 1) | (b >> 7)) & 0xff;
    }
  }

  // ---- the HUD ---------------------------------------------------------------------------------------------

  /** A 16 x 16 picture of 32 bytes (a column of 16 bytes, then the next) at a cell of the panel. */
  private blit(source: Uint8Array, from: number, row: number, column: number): void {
    for (let c = 0; c < 2; c++) {
      for (let line = 0; line < 16; line++) this.bits[rowOffset(row * 8 + line) + column + c] = source[from + c * 16 + line];
    }
  }

  private glyph(code: number, row: number, column: number): void {
    const glyph = GLYPHS.get(code);
    for (let line = 0; line < 8; line++) this.bits[rowOffset(row * 8 + line) + column] = glyph === undefined ? 0 : glyph[line];
  }

  /** The score as `$9F68` prints it: four places, leading zeros left out, the last place always. */
  private number(value: number, row: number, column: number): void {
    for (let i = 0; i < 4; i++) this.glyph(0x20, row, column + i);
    let rest = value >>> 0, at = column, printed = false;
    SCORE_WEIGHTS.forEach((weight, i) => {
      const count = Math.floor(rest / weight);
      rest -= count * weight;
      if (printed || count > 0 || i === SCORE_WEIGHTS.length - 1) {
        this.glyph(0x30 + count, row, at++);
        printed = true;
      }
    });
  }

  /** The panel from the game's state: faces, gauge, item box, score, high score. */
  hud(): void {
    const game = this.game;
    if (game.lives >= 0) {
      for (let slot = 0; slot < FACE_SLOTS; slot++) this.blit(SPRITE_FRAMES, (slot < game.lives ? FIRST_FACE_FRAME : BLANK_FRAME) * 32, HUD_ROW, FACE_COLUMN + slot * FACE_STRIDE);
    }
    const value = game.gauge.value;
    if ((value & 0x80) === 0) this.gaugeLevel = value >> 4;
    else this.gaugeLevel = 0;
    this.blit(GAUGE_FRAMES, this.gaugeLevel * 64, GAUGE_ROW, GAUGE_COLUMN);
    this.blit(GAUGE_FRAMES, this.gaugeLevel * 64 + 32, GAUGE_ROW, GAUGE_COLUMN + 2);
    this.blit(SPRITE_FRAMES, game.pocket * 32, HUD_ROW, POCKET_COLUMN);
    this.number(game.score, SCORE_ROW, SCORE_COLUMN);
    if (game.highScore !== this.highShown) {
      this.number(game.highScore, SCORE_ROW, HIGH_COLUMN);
      this.highShown = game.highScore;
    }
  }

  // ---- reading the picture -----------------------------------------------------------------------------------

  /** The attributes of all 24 rows as the ULA has them. */
  attributes(): Uint8Array {
    const out = new Uint8Array(ATTR_CELLS);
    out.set(this.game.attrs.subarray(0, ROOM_SIZE), 0);
    out.set(this.panelAttrs, ROOM_SIZE);
    return out;
  }

  /** The picture as colour indexes 0-15 (`bright * 8 + colour`), 256 x 192, the way the ULA shows it (`flash`: the flashing cells inverted). */
  pixels(out: Uint8Array = new Uint8Array(PICTURE_WIDTH * PICTURE_HEIGHT), flash = false): Uint8Array {
    return pixelsOf(this.bits, this.attributes(), out, flash);
  }
}

const ROOM_COUNT_PLAY = 6;

/** A bitmap and its attributes as colour indexes. */
export function pixelsOf(bits: Uint8Array, attrs: Uint8Array, out: Uint8Array, flash: boolean): Uint8Array {
  for (let y = 0; y < PICTURE_HEIGHT; y++) {
    const row = rowOffset(y), attrRow = (y >> 3) * 32;
    for (let col = 0; col < 32; col++) {
      const b = bits[row + col], attr = attrs[attrRow + col];
      let ink = cellInk(attr), paper = cellPaper(attr);
      if (flash && (attr & 0x80) !== 0) [ink, paper] = [paper, ink];
      for (let k = 0; k < 8; k++) out[y * PICTURE_WIDTH + col * 8 + k] = (b & (0x80 >> k)) !== 0 ? ink : paper;
    }
  }
  return out;
}
