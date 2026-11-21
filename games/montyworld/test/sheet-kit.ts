/**
 * Preview sheets of a region's art, the same for every region (Andes, Rio): the tiles (each tiled 3 x 2, its class beside it), the
 * decorations, the creatures (all 8 frames, then the first four large), and the items and other sprites. Not a check. Each sheet is
 * written at 4x (the creatures' large one at 8x).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { NewCreature, NewDecor, NewItem, NewTile } from '../src/art/types';
import { Canvas, label } from './preview-kit';

const CLASS_NAME = ['NONE', 'SOLID', 'FLOOR', 'ROPE', 'DEADLY'] as const;

export interface RegionArt {
  readonly title: string;
  readonly tiles: Readonly<Record<string, NewTile>>;
  readonly decor: Readonly<Record<string, NewDecor>>;
  readonly creatures: Readonly<Record<string, NewCreature>>;
  /** 16 x 16 pictures in a 24 x 21 block (items) and full 24 x 21 sprite blocks, with the colour each is shown in. */
  readonly sprites: Readonly<Record<string, NewItem>>;
}

export function writeSheets(out: string, art: RegionArt) {
  fs.mkdirSync(out, { recursive: true });
  {
    const tiles = Object.entries(art.tiles);
    const per = Math.ceil(tiles.length / 2);
    const cv = new Canvas(330, 20 + per * 20);
    label(cv, `${art.title} TILES (3 X 2 EACH) AND THEIR CLASS`, 4, 4, 1);
    tiles.forEach(([name, t], i) => {
      const col = i < per ? 0 : 1, y = 14 + (i % per) * 20, x0 = col * 165;
      for (let k = 0; k < 6; k++) cv.glyph(t.chr, 0, x0 + 4 + (k % 3) * 8, y + Math.floor(k / 3) * 8, t.colour);
      label(cv, `${name} ${CLASS_NAME[t.cls]}`, x0 + 34, y + 5, 1);
    });
    cv.png(path.join(out, 'tiles.png'), 4);
  }
  {
    const cv = new Canvas(480, 330);
    let x = 4, y = 12, rowH = 0;
    label(cv, `${art.title} DECORATIONS`, 4, 3, 1);
    for (const [name, d] of Object.entries(art.decor)) {
      if (x + d.w * 8 > 476) { x = 4; y += rowH + 12; rowH = 0; }
      for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) {
        const n = r * d.w + c;
        cv.glyph(d.chr, n * 8, x + c * 8, y + r * 8, typeof d.colour === 'number' ? d.colour : d.colour[n] ?? 1);
      }
      label(cv, name, x, y + d.h * 8 + 2, 11);
      x += Math.max(d.w * 8, name.length * 4) + 10;
      rowH = Math.max(rowH, d.h * 8 + 6);
    }
    cv.png(path.join(out, 'decorations.png'), 4);
  }
  {
    const creatures = Object.entries(art.creatures);
    const cv = new Canvas(8 * 20 + 10, creatures.length * 26 + 50);
    label(cv, 'CREATURES: FRAMES 0-3 GOING BACK, 4-7 GOING ON', 4, 3, 1);
    creatures.forEach(([name, c], i) => {
      const y = 12 + i * 26;
      label(cv, `${name} ${c.copy ? 'COPY' : ''}`, 4, y, 11);
      for (let f = 0; f < 8; f++) cv.enemyFrame(c.frames, f * 32, 4 + f * 20 + (f >= 4 ? 6 : 0), y + 7, c.colour);
    });
    const y = 12 + creatures.length * 26;
    label(cv, 'SPRITES', 4, y, 11);
    Object.values(art.sprites).forEach((it, i) => cv.spriteBlock(it.block, 4 + (i % 6) * 26, y + 7 + Math.floor(i / 6) * 24, it.colour));
    cv.png(path.join(out, 'sprites.png'), 4);
  }
  {
    const creatures = Object.entries(art.creatures);
    const sprites = Object.values(art.sprites);
    const rows = Math.ceil(creatures.length / 2);
    const cv = new Canvas(2 * 4 * 17 + 4, rows * 18 + 6 + Math.ceil(sprites.length / 9) * 24);
    creatures.forEach(([, c], i) => {
      for (let f = 0; f < 4; f++) cv.enemyFrame(c.frames, f * 32, 1 + (i % 2) * 70 + f * 17, Math.floor(i / 2) * 18 + 1, c.colour);
    });
    sprites.forEach((it, k) => cv.spriteBlock(it.block, 1 + (k % 9) * 26, rows * 18 + 6 + Math.floor(k / 9) * 24, it.colour));
    cv.png(path.join(out, 'creatures-large.png'), 8);
  }
}
