/**
 * What the VIC shows of Auf Wiedersehen Monty: the memory it reads (screen RAM, colour RAM, the character set,
 * the sprite pictures) and how the original's raster interrupts chop a frame up, as a `FrameCapture`, the
 * shape c64kit draws every C64 picture from (`C64View` in the browser, `renderPixels` in the checks).
 *
 * The play IRQ ($6339, seven stages down the frame, re/README.md) does two things:
 *
 *   - the side columns' sprites 6 and 7 (the eagles, the pot, the pillar: pictures $CB, $CA, $C9) are put
 *     further down at lines 0, $63, $7D and $95, each time with other colours and a new picture, so the
 *     two sprites show five pictures a side; at $B2 every sprite is switched off;
 *   - at $C9 the picture goes from the extended colour mode of the play area (and the green band under it,
 *     which is a row of the mode's third background) to the plain text of the panel.
 *
 * c64kit's model captures a frame the same way, by raster line: a text row when the beam reaches it, a
 * sprite when the beam reaches its Y, with the registers as they are at that line. A register an IRQ writes
 * in line L is seen from line L + 1 on (the VIC's line has been captured when the interrupt is taken).
 * Nothing of the game is in this module: it is the picture's hardware.
 */
import type { FrameCapture } from 'c64kit';
import { DECOR_HEX } from './data/awm-data';
import { fromHex } from './data';

export const SCREEN_COLS = 40;
export const SCREEN_ROWS = 25;
/** Where the VIC finds things in the bank the game uses (bank 0). */
export const SCREEN_AT = 0x400;
export const CHARSET_AT = 0x3800;
export const SPRITE_BUFFERS = [0x0200, 0x3a00] as const;
/** The first raster line of the picture: text row 0 (a vertical scroll of 3: $D011 = $1B/$5B). */
const FIRST_LINE = 0x33;
const LINES = 312;

type Row = FrameCapture['rows'][number];
type Sprite = FrameCapture['sprites'][number];

/** The five hardware sprites of Monty (0 and 1, his outline) and the enemies (2-5) as the main loop puts them into the VIC ($5C81). */
export interface EntitySprites {
  /** The VIC's X register of sprites 0-5 and the ninth bits. */
  readonly x: readonly number[];
  readonly xHigh: readonly boolean[];
  /** The Y registers: the raster line the sprite starts on. */
  readonly y: readonly number[];
  readonly colour: readonly number[];
  /** Pointers into the bank (64 bytes a picture). */
  readonly pointer: readonly number[];
}

/** One placing of the side columns' two sprites by the IRQ. */
interface Decor {
  /** The raster line whose IRQ puts them here (the registers are seen below it). */
  readonly line: number;
  readonly y: number;
  readonly pointer: number;
  readonly colour: number;
  readonly mc1: number;
  readonly mc2: number;
  readonly expandY: boolean;
}

/** The IRQ's stages 0-3 ($6394, $63E8, $63F5, $642C). */
const DECOR: readonly Decor[] = [
  { line: 0x00, y: 0x3e, pointer: 0xcb, colour: 8, mc1: 9, mc2: 1, expandY: false },
  { line: 0x63, y: 0x68, pointer: 0xcb, colour: 8, mc1: 9, mc2: 1, expandY: false },
  { line: 0x7d, y: 0x81, pointer: 0xca, colour: 5, mc1: 8, mc2: 7, expandY: false },
  { line: 0x95, y: 0x97, pointer: 0xc9, colour: 1, mc1: 11, mc2: 15, expandY: true },
];
/**
 * The registers an IRQ stage writes are written in the line below its raster line (the interrupt's entry and
 * the stage's dispatch take about 70 cycles, a line is 63), when the VIC's capture of that line is already
 * made: they are seen from the line after that.
 */
const STAGE_DELAY = 1;
/** Stage 4 ($B2) switches every sprite off. */
const SPRITES_OFF = 0xb2;
/** Sprites 6 and 7: X registers ($1C, $3C) and the ninth bit of 7. */
const DECOR_X = [0x1c, 0x13c] as const;
/**
 * Stage 6 (the IRQ at $C9; its stabilising wait puts the writes at the end of line $C9 and in line $CA, and
 * the VIC's capture sees them from line $CA and line $CB): the character set register ($1F), the border green
 * for a line, then extended colour off. So the row at line $CB still has extended colour (the green band).
 */
const CHARSET_SWITCH = 0xca;
const ECM_OFF = 0xcb;
const GREEN_LINE = 0xca;
const GREEN = 5;
/** The background colours ($D021-$D024) the room entry sets ($5650). */
const BACKGROUNDS: [number, number, number, number] = [0, 2, 5, 1];
const SPRITE_HEIGHT = 21;

/** Which of the entity sprites 0-5 are multicolour ($D01C) and expanded sideways ($D01D), a bit each: play has neither. */
export interface EntityLook { readonly multicolour: number; readonly expandX: number }
const PLAIN: EntityLook = { multicolour: 0, expandX: 0 };

/** One entity record as $5C81 reads it: where, and the colour of its sprite. */
export interface EntityRecord { readonly x: number; readonly y: number; readonly colour: number }

/**
 * The VIC's registers of the entity sprites, as $5C81 sets them from the entity records: record k is sprite k + 1
 * (X = x + $38 with its ninth bit, Y = y + $32, its colour, the picture at `pointerBase` + k); sprite 0 is Monty's
 * picture itself (white) and sprite 1 his outline (black, a pixel down and right).
 */
export class EntityRegisters implements EntitySprites {
  readonly x = new Array<number>(6).fill(0);
  readonly xHigh = new Array<boolean>(6).fill(false);
  readonly y = new Array<number>(6).fill(0);
  readonly colour = new Array<number>(6).fill(0);
  readonly pointer = new Array<number>(6).fill(0);

  latch(records: readonly EntityRecord[], pointerBase: number): void {
    records.forEach((r, k) => {
      const sprite = k + 1;
      this.x[sprite] = (r.x + 0x38) & 0xff;
      this.xHigh[sprite] = r.x + 0x38 > 0xff;
      this.y[sprite] = (r.y + 0x32) & 0xff;
      this.colour[sprite] = r.colour & 15;
      this.pointer[sprite] = (pointerBase + k) & 0xff;
    });
    this.x[0] = this.x[1] ?? 0;
    this.xHigh[0] = this.xHigh[1] ?? false;
    this.y[0] = this.y[1] ?? 0;
    this.pointer[0] = this.pointer[1] ?? 0;
    this.colour[0] = 15;
    this.colour[1] = 0;
    this.x[1] = ((this.x[1] ?? 0) + 1) & 0xff;
    this.y[1] = ((this.y[1] ?? 0) + 1) & 0xff;
  }
}

/** Each byte of a picture rotated one bit ($58B8 left, $58C6 right). */
function rotate(glyph: Uint8Array, left: boolean): void {
  for (let i = 0; i < 8; i++) {
    const b = glyph[i] ?? 0;
    glyph[i] = left ? ((b << 1) | (b >> 7)) & 0xff : ((b >> 1) | (b << 7)) & 0xff;
  }
}

/** A picture scrolled a row, the row that leaves coming in at the other end ($589A up, $587E down). */
function scroll(glyph: Uint8Array, up: boolean): void {
  const old = Uint8Array.from(glyph);
  for (let i = 0; i < 8; i++) glyph[i] = old[up ? (i + 1) & 7 : (i + 7) & 7] ?? 0;
}

/** $5818, once a logic step: the pictures of a room's animated tiles ($D2-$DB: tile n is character n) turn or scroll in the character set. */
export function animateTiles(screen: Screen, names: readonly number[]): void {
  for (let tile = names.length - 1; tile >= 0; tile--) {
    const name = names[tile] ?? 0;
    if (name < 0xd2 || name >= 0xdc) continue;
    const glyph = screen.glyph(tile + 1);
    switch (name - 0xd2) {
      case 0: case 1: rotate(glyph, true); break;
      case 2: case 3: rotate(glyph, false); break;
      case 4: case 5: scroll(glyph, true); break;
      case 6: case 7: scroll(glyph, false); break;
      case 8: rotate(glyph, true); scroll(glyph, false); break;
      default: scroll(glyph, false); rotate(glyph, false); break;
    }
  }
}

export class Screen {
  /** The VIC's bank 0 (16K): screen at $0400, the characters at $3800, the sprite pictures at $0200, $3A00 (the entities') and $3240 (the side columns'). */
  readonly ram = new Uint8Array(0x4000);
  /** Colour RAM ($D800), 1000 cells. */
  readonly colour = new Uint8Array(SCREEN_COLS * SCREEN_ROWS);

  constructor() {
    this.ram.set(fromHex(DECOR_HEX), 0x3240);
  }

  /** The cell's screen code. */
  code(col: number, row: number): number {
    return this.ram[SCREEN_AT + row * SCREEN_COLS + col] ?? 0;
  }

  /** Put a screen code into a cell (and a colour when given). */
  put(col: number, row: number, code: number, colour?: number): void {
    const at = row * SCREEN_COLS + col;
    this.ram[SCREEN_AT + at] = code;
    if (colour !== undefined) this.colour[at] = colour;
  }

  /** The 8 bytes of a character in the set at $3800. */
  glyph(code: number): Uint8Array {
    return this.ram.subarray(CHARSET_AT + code * 8, CHARSET_AT + code * 8 + 8);
  }

  /**
   * The frame the VIC draws from all this: `entities` as the main loop left the sprite registers, `enabled` the
   * $D015 the first IRQ put there (the game's $4049: the entities show only once the main loop has run).
   */
  capture(entities: EntitySprites, enabled: number, look: EntityLook = PLAIN): FrameCapture {
    const rows: Row[] = [];
    const sprites: Sprite[] = [];
    const started = new Array<boolean>(8).fill(false);
    const lastY = new Array<number>(8).fill(0);
    let on = 0;
    let decor: Decor = DECOR[3] ?? fail('no decor stage');
    let ecm = true;
    let charset = 0x1e;
    for (let line = 0; line < LINES; line++) {
      if ((line - FIRST_LINE) % 8 === 0 && line >= FIRST_LINE && line < FIRST_LINE + 8 * SCREEN_ROWS) {
        const row = (line - FIRST_LINE) / 8;
        rows.push({
          codes: this.ram.slice(SCREEN_AT + row * SCREEN_COLS, SCREEN_AT + (row + 1) * SCREEN_COLS),
          colours: this.colour.slice(row * SCREEN_COLS, (row + 1) * SCREEN_COLS),
          d011: ecm ? 0x5b : 0x1b, d016: 8, d018: charset, bank: 0, bg: [...BACKGROUNDS], line,
        });
      }
      for (let n = 0; n < 8; n++) {
        const bit = 1 << n;
        if (!(on & bit)) continue;
        const height = n >= 6 && decor.expandY ? 2 * SPRITE_HEIGHT : SPRITE_HEIGHT;
        if (started[n]) {
          if (line >= (lastY[n] ?? 0) + height) started[n] = false;
          continue;
        }
        const y = n < 6 ? entities.y[n] ?? 0 : decor.y;
        if (line !== y) continue;
        started[n] = true;
        lastY[n] = line;
        const pointer = n < 6 ? entities.pointer[n] ?? 0 : decor.pointer;
        const x = n < 6 ? (entities.x[n] ?? 0) | (entities.xHigh[n] ? 0x100 : 0) : DECOR_X[n - 6] ?? 0;
        sprites.push({
          n, x, y: line, data: this.ram.slice(pointer * 64, pointer * 64 + 64),
          colour: n < 6 ? entities.colour[n] ?? 0 : decor.colour, multicolour: n >= 6 || (look.multicolour & (1 << n)) !== 0, expandX: n < 6 && (look.expandX & (1 << n)) !== 0, expandY: n >= 6 && decor.expandY,
          behind: false, mc1: decor.mc1, mc2: decor.mc2,
        });
      }
      // what the IRQ stage on this line does, seen from the next line
      const stage = DECOR.find((d) => d.line + STAGE_DELAY === line);
      if (stage) {
        decor = stage;
        if (stage.line === 0) { on = enabled; charset = 0x1e; ecm = true; }
      }
      if (line === SPRITES_OFF + STAGE_DELAY) on = 0;
      if (line === CHARSET_SWITCH) charset = 0x1f;
      if (line === ECM_OFF) ecm = false;
    }
    const borderLines = new Uint8Array(LINES);
    borderLines[GREEN_LINE] = GREEN;
    return { rows, sprites, border: 0, borderLines };
  }
}

function fail(message: string): never {
  throw new Error(message);
}
