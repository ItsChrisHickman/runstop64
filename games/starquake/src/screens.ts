import { BitmapFont, KIT_GLYPHS } from 'c64kit';
import { rom } from './data';
import type { Game } from './game';
import * as Items from './items';
import { drawTileGraphics } from './room';
import { cellAt, Screen } from './screen';

/**
 * The game's text screens (the intro, game over): text in the game's own
 * lettering ($39B1), framed in tiles ($3A53).
 */

/** $39B1: where a character's 8 bytes are. */
function glyphAt(c: number) {
  if (c === 0x20) return 0xc9cc;
  if (c === 0x2d) return 0xc9cc + 8;
  if (c === 0x2e) return 0xc9cc + 0x10;
  if (c === 0x25) return 0xc9cc + 0x18;
  if (c === 0x3a) return 0xc9cc + 0x78;
  if (c < 0x3a) return 0xc9cc + (((c - 0x2c) * 8) & 0xff);
  return 0xca44 + (((c - 0x40) * 8) & 0xff);
}

/** The game's lettering as a font (for the port's own panels), topped up with the kit's. */
export function gameFont() {
  const f = new BitmapFont();
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -.%:') {
    const at = glyphAt(ch.charCodeAt(0));
    f.glyphs.set(ch.charCodeAt(0), Uint8Array.from({ length: 8 }, (_, i) => rom(at + i)));
  }
  return f.addDrawn(KIT_GLYPHS);
}

/** $3988: a line of text: colour byte for its cells, column, row, letters (0 ends it). */
export function printText(g: Game, colour: number, col: number, row: number, text: string) {
  let cell = cellAt(col, row);
  for (const ch of text) {
    const at = glyphAt(ch.charCodeAt(0));
    const bm = Screen.bitmapAt(cell);
    for (let i = 0; i < 8; i++) g.scr.bank[(bm + i) & 0x3fff] = rom(at + i);
    g.scr.setColour(cell, colour);
    cell++;
  }
}

/** $3966: a block of lines at an address: [colour, column, row, text..., 0] until a 0. */
export function printBlock(g: Game, at: number) {
  for (;;) {
    const colour = rom(at);
    if (!colour) return;
    const col = rom(at + 1), row = rom(at + 2);
    let text = '';
    at += 3;
    while (rom(at)) text += String.fromCharCode(rom(at++));
    at++;
    printText(g, colour, col, row, text);
  }
}

/** $3AAC: a blank screen (the panel too). */
export function clear(g: Game) {
  g.scr.bank.fill(0, 0x2000, 0x3f40);
  g.scr.bank.fill(0, 0x1c00, 0x1fe8);
  g.scr.attr.fill(0);
  g.sprites.enable = 0;
  g.vic.enable = 0;
}

/** $3A53: a text block in a frame of tiles drawn in `colour`. */
export function framed(g: Game, at: number, colour: number) {
  g.colour = colour;
  printBlock(g, at);
  const tile = (t: number, x: number, y: number) => drawTileGraphics(g, t, x, y);
  tile(0x62, 0x26, 0);
  tile(0x5e, 0, 0);
  let x = 0;
  for (let i = 9; i > 0; i--) {
    x += 2;
    tile(0x5c, x, 0);
    tile(0x5c, x, 0x16);
    x += 2;
  }
  tile(0x61, 0x26, 0x16);
  tile(0x60, 0, 0x16);
  let y = 0x16;
  for (let i = 5; i > 0; i--) {
    y -= 4;
    tile(0x5d, 0, y);
    tile(0x5d, 0x26, y);
  }
}

/** $344C: the intro ("touch down imminent..."), without the crack's line. */
export function intro(g: Game) {
  clear(g);
  framed(g, 0x3afa, 0x10);
}

/**
 * $3464: game over: the score, the adventure score (rooms seen), and the core
 * with the pieces replaced.
 */
export function gameOver(g: Game): { score: string; adventure: string } {
  clear(g);
  // the core's nine places, from column 9, row 2 ($281E)
  for (let i = 8; i >= 0; i--) Items.drawThing(g, g.core[i], rom(0x2f22 + i) + 9, rom(0x2f2b + i) + 2, true);
  const score = g.score.join('');
  let seen = 0;
  for (let i = 0; i < 0x40; i++) for (let b = g.lo[i]; b; b >>= 1) seen += b & 1;
  const pct = adventure(seen);
  printText(g, 0x70, 0x1a, 6, score);
  printText(g, 0xe0, 0x1c, 9, pct);
  const replaced = 9 - g.core.filter((c) => !(c & 0x80)).length;
  printText(g, 0x70, 0x14, 0x10, String.fromCharCode(0x30 + Math.max(0, replaced)));
  framed(g, 0x3c73, 0x20);
  return { score, adventure: pct };
}

/** $3487-$34C8: the adventure score: rooms seen ×50/256, as a percentage (512 rooms: 100%). */
function adventure(seen: number) {
  // ×2, ×16, ×32 summed in 16 bits, the high byte being the percentage
  let lo = 0, hi = 0;
  let a = seen & 0xff, h = seen >> 8;
  for (const shifts of [1, 3, 1]) {
    for (let i = 0; i < shifts; i++) { h = ((h << 1) | (a >> 7)) & 0xff; a = (a << 1) & 0xff; }
    const s = lo + a;
    lo = s & 0xff;
    hi = (hi + h + (s >> 8)) & 0xff;
  }
  if (hi === 0x64) return '100%';
  return ` ${hi >= 10 ? Math.floor(hi / 10) : ' '}${hi % 10}%`;
}
