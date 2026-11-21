/**
 * Drawing for previews of art made for Monty Mole: World Tour: a 40 x 25 character screen as Monty on the Run draws it (the
 * charset at 0 of a 16K bank, the screen at $0800, a colour per cell, black behind), with hires sprites over it. Tools only: the
 * game's own drawing is the engine's.
 */
import { indicesPng } from '../../../tools/probe/render';
import {
  bankImage, coinTable, decorRooms, decorTypes, enemyBank, enemyColours, enemyRecords, roomDef, sectorName, tileLibrary,
} from '../../montyotr/src/data';
import { COIN_CHAR, drawHudFrame, PLAY_COL, PLAY_COLS, PLAY_ROW, PLAY_ROWS, ROW, SCREEN } from '../../shared/monty/screen';

export const W = 320, H = 200;

/** A picture of palette indices, 320 x 200 by default. */
export class Canvas {
  readonly px: Uint8Array;
  constructor(readonly w = W, readonly h = H) { this.px = new Uint8Array(w * h); }
  set(x: number, y: number, c: number) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c; }
  /** 8 bytes of a character at a pixel position, ink `c`. */
  glyph(bytes: ArrayLike<number>, at: number, x: number, y: number, c: number) {
    for (let r = 0; r < 8; r++) for (let b = 0; b < 8; b++) if ((bytes[at + r] ?? 0) & (0x80 >> b)) this.set(x + b, y + r, c);
  }
  /** A 16 x 16 hires sprite in the enemy bank's packed frame (32 bytes: top left, top right, bottom left, bottom right). */
  enemyFrame(frame: ArrayLike<number>, at: number, x: number, y: number, c: number) {
    for (let r = 0; r < 16; r++) for (let col = 0; col < 16; col++) {
      if ((frame[at + (r >> 3) * 16 + (col >> 3) * 8 + (r & 7)] ?? 0) & (0x80 >> (col & 7))) this.set(x + col, y + r, c);
    }
  }
  /** A 24 x 21 hires sprite block (63 bytes, 3 a row). */
  spriteBlock(block: ArrayLike<number>, x: number, y: number, c: number) {
    for (let r = 0; r < 21; r++) for (let col = 0; col < 24; col++) {
      if ((block[r * 3 + (col >> 3)] ?? 0) & (0x80 >> (col & 7))) this.set(x + col, y + r, c);
    }
  }
  png(file: string, scale: number) { indicesPng(file, this.px, this.w, this.h, scale); }
}

/** The 40 x 25 screen: memory and colour RAM as the game keeps them. */
export class Screen {
  readonly mem = new Uint8Array(0x4000);
  readonly col = new Uint8Array(1024);
  constructor() { this.mem.set(bankImage.subarray(0, 0x800)); }
  at(col: number, row: number) { return SCREEN + row * ROW + col; }
  put(col: number, row: number, code: number, colour: number) { this.mem[this.at(col, row)] = code; this.col[row * ROW + col] = colour; }
  /** The room's tiles (library indexes, or the 8 bytes themselves) into characters 1-8 (SetupTileGraphics). */
  tiles(tiles: readonly (Uint8Array | number)[]) {
    tiles.forEach((t, i) => this.mem.set(typeof t === 'number' ? tileLibrary.subarray(t * 8, t * 8 + 8) : t, 8 + i * 8));
  }
  /** The playfield's cell codes ('.' empty, '1'-'8'), with the room's colours, mirrored into the gutters as the game does. */
  playfield(map: readonly string[], colours: readonly number[]) {
    for (let r = 0; r < PLAY_ROWS; r++) for (let c = 0; c < PLAY_COLS; c++) {
      const code = '.12345678'.indexOf(map[r]?.[c] ?? '.');
      this.put(PLAY_COL + c, PLAY_ROW + r, Math.max(code, 0), code > 0 ? colours[code - 1] ?? 1 : 0);
    }
    for (let r = PLAY_ROW; r < PLAY_ROW + PLAY_ROWS; r++) {
      for (const [to, from] of [[2, 4], [3, 4], [36, 35], [37, 35]] as const) this.put(to, r, this.mem[this.at(from, r)] ?? 0, this.col[r * ROW + from] ?? 0);
    }
  }
  /** A decoration at a screen cell, its characters taken from `next` up (as Decor.CalculateRoom). Returns the next free character. */
  decor(chr: Uint8Array, w: number, h: number, colour: number | Uint8Array, col: number, row: number, next: number) {
    this.mem.set(chr, next * 8);
    let code = next, stream = 0;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) this.put(col + c, row + r, code++, typeof colour === 'number' ? colour : colour[stream++] ?? 1);
    return code;
  }
  /** The score row's frame and data, as the game's, and the place's name in its lettering under the playfield. */
  hud(score: number, lives: number, name: string, nameCol: number) {
    drawHudFrame({ mem: this.mem, col: this.col }, score, 12000, lives);
    let wordStart = true;
    for (let i = 0; i < name.length; i++) {
      const c = name.charCodeAt(i) & 0x3f;
      if (c >= 0x1a) wordStart = true;
      this.put(4 + nameCol + i, 24, wordStart ? c | 0x40 : c | 0x80, 1);
      if (c < 0x1a) wordStart = false;
    }
  }
  /** Every cell to the canvas (the charset at 0; code 0 is blank). */
  draw(cv: Canvas, ox = 0, oy = 0) {
    for (let r = 0; r < 25; r++) for (let c = 0; c < 40; c++) {
      const code = this.mem[this.at(c, r)] ?? 0;
      cv.glyph(this.mem, code * 8, ox + c * 8, oy + r * 8, this.col[r * ROW + c] ?? 1);
    }
  }
}

/**
 * One of Monty on the Run's own rooms as the game draws it (its tiles and colours, decorations, coins and creatures at their
 * first frame), onto `cv` with its top left at ox, oy: for judging new art next to the original's.
 */
export function drawMotrRoom(cv: Canvas, id: number, ox = 0, oy = 0) {
  const def = roomDef(id);
  const s = new Screen();
  s.tiles(def.tiles);
  const rows: string[] = [];
  for (let r = 0; r < PLAY_ROWS; r++) rows.push(Array.from(def.cells.subarray(r * PLAY_COLS, (r + 1) * PLAY_COLS), (c) => '.12345678'[c] ?? '.').join(''));
  s.playfield(rows, def.colours);
  const first = new Map<number, number>();
  let next = 0x9b;
  for (let i = 0; i + 3 < decorRooms.length; i += 4) {
    if (decorRooms[i] !== id) continue;
    const type = decorRooms[i + 3] ?? 0, t = decorTypes[type];
    if (t === undefined) continue;
    const at = first.get(type);
    const col = decorRooms[i + 1] ?? 0, row = decorRooms[i + 2] ?? 0;
    if (at === undefined) {
      if (next + t.w * t.h > 0xff) continue;
      first.set(type, next);
      next = s.decor(t.chr, t.w, t.h, t.colour, col, row, next);
    } else {
      for (let r = 0; r < t.h; r++) for (let c = 0; c < t.w; c++) s.put(col + c, row + r, at + r * t.w + c, typeof t.colour === 'number' ? t.colour : t.colour[r * t.w + c] ?? 1);
    }
  }
  for (let i = 0; i * 3 < coinTable.length; i++) if (coinTable[i * 3] === id) s.put((coinTable[i * 3 + 1] ?? 0) + 4, (coinTable[i * 3 + 2] ?? 0) + 3, COIN_CHAR, 7);
  s.hud(1200, 5, sectorName(id).text, sectorName(id).col);
  s.draw(cv, ox, oy);
  const rec = enemyRecords(id);
  for (let i = 0; i + 6 < rec.length && rec[i] !== 0xff; i += 7) {
    const x = (((rec[i + 1] ?? 0) >> 1) + 0x1c) & 0xff, y = (0xf9 - (rec[i + 2] ?? 0)) & 0xff;
    cv.enemyFrame(enemyBank(rec[i + 4] ?? 8), 0, ox + x * 2 - 24, oy + y - 50, enemyColours[(rec[i] ?? 0) & 15] ?? 1);
  }
}

/** A tiny 3 x 5 label font for the sheets' captions (previews only). */
const FONT: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
  '5': '111100111001111', '6': '111100111101111', '7': '111001001001001', '8': '111101111101111', '9': '111101111001111',
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101111011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101010010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', ' ': '000000000000000', '-': '000000111000000', ':': '000010000010000', '.': '000000000000010',
};
export function label(cv: Canvas, text: string, x: number, y: number, c = 1) {
  [...text.toUpperCase()].forEach((ch, i) => {
    const g = FONT[ch] ?? FONT[' '] ?? '';
    for (let k = 0; k < 15; k++) if (g[k] === '1') cv.set(x + i * 4 + (k % 3), y + Math.floor(k / 3), c);
  });
}
