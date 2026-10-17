/**
 * Pictures of Moley Christmas in the looks Chris is choosing between, made from the committed data alone (never committed):
 * a room's tiles with their cell attributes, the HUD panel, and Monty and a few of the room's sprites put where they overlap
 * coloured tiles, so that the colour clash shows.
 *
 *   A  the Spectrum's colours with the clash (ORIGINAL): a sprite pixel takes the ink of the cell under it.
 *   B  the Spectrum's colours without the clash: each sprite keeps the colour the original gives it in its usual spot, drawn
 *      over the cells like a C64 sprite.
 *   C  no clash, C64 colours: B through the mapping in src/palette.ts.
 *
 * The sprites are composed the original's way (README: "Entities, sprites and drawing"): bitmap bytes
 * `buffer OR (b AND mask(buffer))` (room 5 ORs only), so a sprite shows only where the background has no ink beside it; the
 * pixels a sprite adds are then coloured as the look says. Each picture is 256 x 192 in a 320 x 200 surface with the border
 * colour, at 1x and 3x (nearest neighbour).
 *
 *   nice -n 15 node tools/test.mjs games/moley/re/looks.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { C64_PALETTE } from 'c64kit';
import { writePng } from '../../../tools/png';
import { ENDING_ROOM } from '../src/data';
import { SPECTRUM_PALETTE, SPECTRUM_TO_C64 } from '../src/palette';
import { PICTURE_HEIGHT as HEIGHT, PICTURE_WIDTH as WIDTH, cellInk as ink, cellPaper as paper, roomPicture, type Picture } from '../src/picture';
import { drawByte, spriteRows } from '../src/sprite';

const outDir = process.argv[2] ?? '/tmp/claude-0/-root/0f9120bc-8590-4340-8ed6-b1e28bd22f4e/scratchpad/moley-looks';

const SURFACE_W = 320, SURFACE_H = 200;
const BORDER = 0; // the original's border is black in play and on the card

/** One sprite frame put on the picture: the pixel it is drawn at, and where the original usually shows it (its own colour). */
interface Placement {
  readonly frame: number;
  readonly x: number;
  readonly y: number;
  readonly left: boolean;
  /** A spot where the original draws this sprite on plain ground: the ink of the cell there is the sprite's colour. */
  readonly home: { readonly x: number; readonly y: number };
}

/** A palette index for each of the picture's pixels, 256 x 192, in a look. */
type Look = 'A' | 'B' | 'C';

/** The colour the original gives a sprite in its usual spot: the ink most of its pixels fall on there. */
function homeColour(base: Picture, p: Placement): number {
  const rows = spriteRows(p.frame, p.home.x, p.left);
  const count = new Array<number>(16).fill(0);
  for (let row = 0; row < 16; row++) {
    for (let x = 0; x < 24; x++) {
      if (!(rows[row * 3 + (x >> 3)] & (0x80 >> (x & 7)))) continue;
      const cx = (p.home.x >> 3) * 8 + x, cy = p.home.y + row;
      if (cx < WIDTH && cy < HEIGHT) count[ink(base.attrs[(cy >> 3) * 32 + (cx >> 3)])]++;
    }
  }
  return count.indexOf(Math.max(...count));
}

/** The palette (0xRRGGBB, 16 entries) and the pixels of a room with its sprites, in a look. */
function compose(base: Picture, placements: readonly Placement[], orOnly: boolean, look: Look): { pixels: Uint8Array; palette: readonly number[] } {
  const bits = base.bits.slice();
  const spriteColour = new Int16Array(WIDTH * HEIGHT).fill(-1); // the colour a pixel added by a sprite is drawn in (looks B, C)
  for (const p of placements) {
    const rows = spriteRows(p.frame, p.x, p.left);
    const colour = homeColour(base, p);
    for (let row = 0; row < 16; row++) {
      const y = p.y + row;
      if (y < 0 || y >= HEIGHT) continue;
      for (let k = 0; k < 3; k++) {
        const col = (p.x >> 3) + k;
        if (col >= 32) continue;
        const before = bits[y * 32 + col];
        const after = drawByte(before, rows[row * 3 + k], orOnly);
        bits[y * 32 + col] = after;
        for (let b = 0; b < 8; b++) if ((after & ~before) & (0x80 >> b)) spriteColour[y * WIDTH + col * 8 + b] = colour;
      }
    }
  }
  const pixels = new Uint8Array(WIDTH * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const attr = base.attrs[(y >> 3) * 32 + (x >> 3)];
      const set = (bits[y * 32 + (x >> 3)] & (0x80 >> (x & 7))) !== 0;
      const own = spriteColour[y * WIDTH + x];
      // A: every set pixel, a sprite's too, takes the cell's ink. B and C: a sprite's pixels keep its colour.
      pixels[y * WIDTH + x] = set ? (look !== 'A' && own >= 0 ? own : ink(attr)) : paper(attr);
    }
  }
  const palette = look === 'C' ? SPECTRUM_TO_C64.map((c) => C64_PALETTE[c]) : SPECTRUM_PALETTE;
  return { pixels, palette };
}

/** The picture in the middle of the 320 x 200 surface in the border colour, each pixel `scale` times. */
function writeLook(file: string, pixels: Uint8Array, palette: readonly number[], border: number, scale: number): void {
  const w = SURFACE_W * scale, h = SURFACE_H * scale;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  const left = (SURFACE_W - WIDTH) / 2, top = (SURFACE_H - HEIGHT) / 2;
  for (let y = 0; y < h; y++) {
    const sy = Math.floor(y / scale) - top;
    for (let x = 0; x < w; x++) {
      const sx = Math.floor(x / scale) - left;
      const inside = sx >= 0 && sx < WIDTH && sy >= 0 && sy < HEIGHT;
      const c = palette[inside ? pixels[sy * WIDTH + sx] : border];
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = c >> 16; raw[o + 1] = (c >> 8) & 255; raw[o + 2] = c & 255;
    }
  }
  writePng(file, raw, w, h);
}

/** A sprite drawn at (x, y); `home` is its usual spot, where the original's own state has it (the entity table at `$8121`). */
function at(frame: number, x: number, y: number, left: boolean, home: { x: number; y: number } = { x, y }): Placement {
  return { frame, x, y, left, home };
}

/**
 * Where the sprites go in each picture: Monty and room sprites, each put where the clash shows. A sprite only shows where the
 * background has no ink beside it, so these are spots (found by trying every position) where much of what shows lies in cells
 * with a coloured ink: Monty in the yellow cassette's cells, the big green G, the yellow deck, the shop's green door.
 * Usual spots, from the entity table in play (`$8121`): room 0 Monty (4, 120), `$55` (172, 120), `$3A` (74, 40); room 2 Monty
 * (4, 152), `$40` (196, 112), `$6F` (184, 57); room 5 Monty (40, 112), the cars `$19` (58, 72) and `$35` (203, 96).
 */
const SCENES: readonly { readonly name: string; readonly room: number; readonly orOnly: boolean; readonly placements: readonly Placement[] }[] = [
  {
    name: 'room0', room: 0, orOnly: false,
    placements: [
      at(0, 28, 68, false, { x: 4, y: 120 }), // Monty in the yellow cassette's cells
      at(0x55, 136, 72, true, { x: 172, y: 120 }), // over the big green G
      at(0x3a, 216, 0, false, { x: 74, y: 40 }), // under the yellow cassette at the top right
    ],
  },
  {
    name: 'room2', room: 2, orOnly: false,
    placements: [
      at(1, 164, 112, false, { x: 4, y: 152 }), // Monty on the yellow deck
      at(0x40, 92, 12, true, { x: 196, y: 112 }), // over the cyan cassette
      at(0x6f, 98, 100, true, { x: 184, y: 57 }), // the reel over the green rail
    ],
  },
  {
    name: 'room5', room: 5, orOnly: true,
    placements: [
      at(0, 204, 10, false, { x: 40, y: 112 }), // Monty at the shop's green door
      at(0x19, 2, 122, true, { x: 58, y: 72 }), // a car at the yellow vehicle on the left
      at(0x35, 112, 96, true, { x: 203, y: 96 }), // a car in the road, no clash
    ],
  },
  { name: 'card', room: ENDING_ROOM, orOnly: false, placements: [] },
];

fs.mkdirSync(outDir, { recursive: true });
for (const scene of SCENES) {
  const base = roomPicture(scene.room);
  for (const look of ['A', 'B', 'C'] as const) {
    const { pixels, palette } = compose(base, scene.placements, scene.orOnly, look);
    const border = look === 'C' ? SPECTRUM_TO_C64[BORDER] : BORDER;
    for (const scale of [1, 3]) writeLook(path.join(outDir, `${scene.name}-${look}-${scale}x.png`), pixels, palette, border, scale);
  }
}
console.log(`looks in ${outDir}`);
