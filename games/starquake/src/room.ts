import { BLOCKS, CORE_ROOM, rom, romWord, ROOMS, TILE_INFO, TILE_PTRS } from './data';
import type { Game } from './game';
import { cellAt, Screen } from './screen';
import * as Items from './items';

/**
 * Drawing a room (the original's $0E7B and the tile drawer $4194): 4×3 big
 * blocks of 2×2 tiles, each tile up to 8×15 cells of bitmap with a colour
 * and an attribute per cell. The C64 screen is 40 columns, wider than the
 * room's 32, so the four columns either side show the neighbouring rooms'
 * edges (or, at the map's edges, a wall).
 */

/** $0E7B: clear the play area and draw the current room. */
export function drawRoom(g: Game) {
  clearPlayArea(g);
  let at = ROOMS + g.room * 12; // $78/$79
  roomColours(g);
  const mapRow = (g.room >> 4) & 31; // $100C

  // Left edge (columns 0-3): the room to the left's right-hand column, or a wall.
  if ((g.room & 15) === 0) {
    edgeColumn(g, rom(0x115f + mapRow + 0x20), 0);
  } else {
    let p = at - 12;
    for (let y = 6; y !== 0x18; y += 6) {
      p += 3;
      const b = BLOCKS + rom(p) * 4;
      drawTile(g, rom(b), 0, y + 3);
      drawTile(g, rom(b + 2), 0, y);
      p += 1;
    }
  }

  // The room: 3 rows of 4 big blocks from column 4, row 6.
  for (let y = 6; y !== 0x18; y += 6) {
    for (let x = 4; x !== 0x24; x += 8) {
      const b = BLOCKS + rom(at) * 4;
      drawTile(g, rom(b), x + 4, y + 3);
      drawTile(g, rom(b + 1), x, y + 3);
      drawTile(g, rom(b + 2), x + 4, y);
      drawTile(g, rom(b + 3), x, y);
      at += 1;
    }
  }

  // Right edge (columns 36-39): the next room's left-hand column, or a wall.
  if ((g.room & 15) === 15) {
    edgeColumn(g, rom(0x115f + mapRow), 0x24);
  } else {
    for (let y = 6; y !== 0x18; y += 6) {
      const b = BLOCKS + rom(at) * 4;
      drawTile(g, rom(b + 1), 0x24, y + 3);
      drawTile(g, rom(b + 3), 0x24, y);
      at += 4;
    }
  }

  // The original walks the room table with $78/$79, which are also BLOB's fall
  // height and the controls a platform was last asked with: the pointer's high
  // byte is left there, so holding down into a new room builds a platform at once.
  g.inputPlatform = (at >> 8) & 0xff;

  Items.markVisited(g);
  if (g.room === CORE_ROOM) {
    // The core: its own wall down the left, and the core's stand.
    for (let y = 6; y !== 0x15; y += 3) drawTile(g, 0x16, 0, y);
    drawTile(g, 0x16, 4, 0x12);
  } else {
    Items.placeForRoom(g);
  }
}

/** $1017: a column of six tiles from the wall table at $119F (the map's left and right edges). */
function edgeColumn(g: Game, from: number, x: number) {
  let y = 6;
  for (let i = 0; i < 6; i++) {
    drawTile(g, rom(0x119f + ((from + i) & 0xff)), x, y);
    y += 3;
  }
}

/**
 * $1037: the room's four colours, from the room number: each a different one
 * of the eight in $1148. This also seeds the random numbers for the drawing.
 */
function roomColours(g: Game) {
  const c = g.roomColours;
  c.fill(0);
  const r = g.rng;
  r.a = g.room & 0xff;
  r.b = g.room >> 8;
  for (let i = 3; i >= 0; i--) {
    // asl / (inc $68 on carry) / adc $67 with that carry: ×3 (+1)
    const shifted = r.a << 1;
    if (shifted > 0xff) r.b = (r.b + 1) & 0xff;
    const sum = (shifted & 0xff) + r.a + (shifted >> 8);
    r.a = sum & 0xff;
    if (sum > 0xff) r.b = (r.b + 1) & 0xff;
    let x = r.a;
    let colour: number;
    do {
      x = (x + 1) & 0xff;
      colour = rom(0x1148 + (x & 7));
    } while (colour === c[0] || colour === c[1] || colour === c[2] || colour === c[3]);
    c[i] = colour;
  }
}

/** $407B: blank the play area (rows 6 down) and reset the room's lists. */
export function clearPlayArea(g: Game) {
  g.sound.silence();
  g.objectCount = 0;
  g.padRow = 0;
  g.sprites.enable = 0;
  g.vic.enable = 0; // (and $D015 itself, at once)
  g.spawnCount = 0;
  g.frames = 0;
  g.dead = 0;
  g.enemyPlaceCount = 0;
  const s = g.scr;
  // The original clears $6780-$7EBF: rows 6-24 but for row 24's last 16 cells.
  s.bank.fill(0, 0x2780, 0x3ec0);
  s.attr.fill(0, 0xf0, 0x400);
  s.bank.fill(0, 0x1cf0, 0x1ff8);
  g.lo.fill(0, 0x80, 0x400);
  g.resetRoomLists();
  g.barrierCell = 0x7e; // $4BEA with what's left in X and Y: a harmless spot in the panel
  Items.drawCarried(g);
  g.laser = 0x14;
}

/**
 * $10B0: draw a tile, noting what its tile info says: a room colour to draw
 * in from now on, or an object (teleport, item place, enemy place...).
 */
export function drawTile(g: Game, tile: number, x: number, y: number) {
  if (tile === 0x2d && g.barrierGone[g.room & 15]) return;
  if (((tile - 0x5b) & 0x80) !== 0) {
    const info = rom(TILE_INFO + tile);
    if (info) {
      const kind = info >> 4;
      if (kind !== 0 && ((kind - 5) & 0x80) !== 0) g.colour = g.roomColours[kind - 1];
      else Items.tileObject(g, info, x, y);
    }
  }
  drawTileGraphics(g, tile, x, y);
}

/**
 * $4194: a tile's graphics. The definition is a header (rows, flags), a
 * column mask per row (bit 7 = leftmost), then 8 bytes per drawn cell; the
 * cells' colours are stored backwards before it. A colour of 0 takes a random
 * ink, $77 the room colour.
 */
export function drawTileGraphics(g: Game, tile: number, x: number, y: number): number {
  const s = g.scr;
  g.ink = randomInk(g);
  const p = romWord(TILE_PTRS + ((tile << 1) & 0xff));
  const header = rom(p);
  const rows = header & 15;
  const flags = header >> 4;
  g.tileFlags |= flags;
  let gfx = p + rows + 1;
  let attrAt = p - 1;
  let rowCell = cellAt(x, y);
  for (let r = 0; r < rows; r++) {
    let mask = rom(p + 1 + r);
    let c = 0;
    while (mask) {
      if (mask & 0x80) {
        const a = rom(attrAt--);
        const cell = (rowCell + c) & 0x3ff;
        let colour = a & 0x77;
        if (colour === 0) colour = g.ink;
        else if (colour === 0x77) colour = g.colour;
        s.bank[Screen.COLOURS + cell] = colour;
        s.attr[cell] = (a & 0x08) | flags | (a & 0x80 ? 4 : 0);
        const bm = Screen.bitmapAt(rowCell) + c * 8;
        for (let i = 0; i < 8; i++) s.bank[(bm + i) & 0x3fff] = rom(gfx++);
      }
      mask = (mask << 1) & 0xff;
      c++;
    }
    rowCell += 40;
  }
  // The carry the original is left with (its last ADC: the last row's bitmap address + $40), which some screens use.
  return ((((rowCell - 40) * 8) & 0xff) + 0x40) > 0xff ? 1 : 0;
}

/** $429A: a random ink (2-7) for a tile's plain cells. */
function randomInk(g: Game) {
  const v = g.rng.next() & 0x70;
  return ((v - 0x20) & 0x80) !== 0 ? v | 0x20 : v;
}
