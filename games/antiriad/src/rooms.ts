import type { Game } from './game';
import { V } from './vars';

/**
 * Drawing a room (the original's $852C and the routines it calls). A room is 4
 * rows of 8 blocks of 4x4 characters, drawn in screen columns 4-35; the last
 * column of blocks of the room to the left and the first of the room to the
 * right are drawn beside it (columns 0-3 and 36-39), so the edges match where
 * the hero walks through. Each room brings its own characters into the
 * character set (and so do those neighbours, for their columns), and each
 * character its colour.
 */
const ROOM_LAYOUTS = 0x0b00; // 32 bytes per room
export const BLOCKS = 0x1400; // 16 bytes per block
export const EXIT_TABLE = 0xf25a; // 4 per room: right, left, down, up
const ROW_ADDRESSES = 0xf128; // the screen address of each text row
const ROOM_CHARSET = 0x7800;
const CHAR_COLOURS = 0x0561; // a colour for each character of the room's set
const SOURCE_GRAPHICS = 0x2400, SOURCE_COLOURS = 0x3c00, GRAPHICS_SETS = 0x3f00, ROOM_GRAPHICS_SET = 0xf761;
const ROOM_MULTICOLOUR = 0xf71c;

/** The screen address of a text row (and, $9800 on, its colour RAM). */
export const rowAt = (g: Game, row: number) => g.word(ROW_ADDRESSES + row * 2);

/** $8D5E: clear the playfield's screen and colours (rows 0-15, and the panel's first rows). */
export function clearPlayfield(g: Game) {
  const { ram } = g, col = g.m.colour;
  for (let x = 0; x < 256; x++) {
    ram[0x4000 + x] = 0; col[x] = 0;
    ram[0x4100 + x] = 0; col[0x100 + x] = 0;
    ram[0x4180 + x] = 0; col[0x180 + x] = 0;
  }
}

/** $8D37: clear text rows 16-24 (screen and colours). */
export function clearPanelRows(g: Game) {
  for (let row = 0x18; row >= 0x10; row--) {
    const at = rowAt(g, row);
    for (let c = 0; c < 40; c++) { g.ram[at + c] = 0; g.m.colour[at - 0x4000 + c] = 0; }
  }
}

/** $8989: draw one block (16 characters) at block column `col`, block row `row`. */
function drawBlock(g: Game, block: number, col: number, row: number) {
  const src = BLOCKS + block * 16, at = rowAt(g, row * 4) + col * 4;
  for (let i = 0; i < 16; i++) g.ram[at + (i >> 2) * 40 + (i & 3)] = g.ram[src + i];
}

/** $852C: draw room `$5B` and set it up (its characters, colours, sprites and animations). */
export function drawRoom(g: Game) {
  const { ram } = g;
  ram[0x0215] = 0; g.w(0xd015, 0); ram[0x0246] = 0; g.w(0xd417, 0);
  clearPlayfield(g);
  const room = ram[V.room];
  // the room's 4 x 8 blocks, at block columns 1-8
  for (let row = 0; row < 4; row++) for (let col = 1; col < 9; col++) drawBlock(g, ram[ROOM_LAYOUTS + room * 32 + row * 8 + col - 1], col, row);
  // the neighbours' edge columns: the left room's last, the right room's first
  const left = ram[EXIT_TABLE + room * 4 + 1], right = ram[EXIT_TABLE + room * 4];
  if (!(left & 0x80)) { loadGraphicsSet(g, left); drawColumn(g, left, 7, 0); }
  if (!(right & 0x80)) { loadGraphicsSet(g, right); drawColumn(g, right, 0, 9); }
  loadGraphicsSet(g, room);
  colourRoom(g);
  g.roomSetUp();
}

/** $85C8: one column of a room's blocks (`from`) drawn at block column `col`. */
function drawColumn(g: Game, room: number, from: number, col: number) {
  for (let row = 0; row < 4; row++) drawBlock(g, g.ram[ROOM_LAYOUTS + room * 32 + from + row * 8], col, row);
}

/**
 * $85E8: copy a room's characters into the character set ($7800) and their
 * colours into the colour table, from the ranges its graphics set lists.
 */
function loadGraphicsSet(g: Game, room: number) {
  const { ram } = g;
  const list = g.word(GRAPHICS_SETS + ram[ROOM_GRAPHICS_SET + room] * 2);
  let count = ram[list], at = list;
  while (count) {
    const first = ram[at + 1], last = ram[at + 2];
    const n = (last - first + 1) & 0xff;
    const from = ((ram[at + 3] | (ram[at + 4] << 8)) + first) & 0xffff;
    at += 4;
    for (let i = 0; i < n; i++) ram[CHAR_COLOURS + first + i] = ram[(SOURCE_COLOURS + from + i) & 0xffff];
    const dst = ROOM_CHARSET + first * 8, src = SOURCE_GRAPHICS + from * 8;
    for (let i = 0; i < n * 8; i++) ram[(dst + i) & 0xffff] = ram[(src + i) & 0xffff];
    count = (count - 1) & 0xff;
  }
}

/** $869C: the room's multicolour setting, and each character's colour into colour RAM. */
function colourRoom(g: Game) {
  const { ram } = g;
  const mc = ram[ROOM_MULTICOLOUR + ram[V.room]];
  ram[V.d016Play] = mc;
  if (mc) { ram[V.mc1Play] = mc & 15; ram[V.mc2Play] = mc >> 4; ram[V.d016Play] = 0x10; }
  for (let row = 15; row >= 0; row--) {
    const at = rowAt(g, row);
    for (let c = 39; c >= 0; c--) {
      const code = ram[at + c];
      g.m.colour[at - 0x4000 + c] = code ? ram[CHAR_COLOURS + code] & 15 : 0;
    }
  }
}

/**
 * How long the original takes to draw the room just drawn (rooms are drawn by the main
 * program, between interrupts), in its cycles: from what it had to do, fitted to the
 * original's own timings room by room (to within 6,000 cycles).
 */
export function drawCycles(g: Game) {
  const { ram } = g;
  const room = ram[V.room];
  const set = (r: number) => {
    const list = g.word(GRAPHICS_SETS + ram[ROOM_GRAPHICS_SET + r] * 2);
    let n = 0;
    for (let i = 0; i < ram[list]; i++) n += (ram[list + 2 + i * 4] - ram[list + 1 + i * 4] + 1) & 0xff;
    return n;
  };
  const left = ram[EXIT_TABLE + room * 4 + 1], right = ram[EXIT_TABLE + room * 4];
  let chars = set(room), blocks = 32, cells = 0;
  if (!(left & 0x80)) { chars += set(left); blocks += 4; }
  if (!(right & 0x80)) { chars += set(right); blocks += 4; }
  for (let i = 0; i < 640; i++) if (ram[0x4000 + i]) cells++;
  return 619 + 212.3 * chars + 7.4 * cells + 2086 * blocks;
}
