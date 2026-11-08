/**
 * What ENHANCED's look needs of the game: the scenery (the screen without the sprites on it) and where the sprites are, each as a picture and a colour.
 *
 * The original draws every sprite into the screen over a copy of the room that has none (the picture buffer, `$D260`), so the scenery is that copy, with what the original
 * changes on the screen alone put back: the score and lives (rows 0, 1, 22 and 23), the conveyors' and the water's turning (`conveyors.ts`), and in the opening scene
 * everything it draws on the screen (the pot, the wife, the bird, the acorn and the corner picture are not in the buffer) but for Monty.
 *
 * Each sprite is one colour in ENHANCED, the ink of the cell under its middle (the colour the original shows most of it in), or bright white where that is also the cell's
 * paper; a thing of the room has its own colour byte (`Enemy.colour`: what it paints its cells with). The picture a thing shows is the frame of its set that the counter
 * says (`$8827`).
 */
import { CONVEYORS } from './conveyors';
import { imageAt, screenOffset, SPRITE_BASE, SPRITE_BYTES, SPRITE_FRAMES } from './data';
import { EnemyState } from './enemies';
import type { Game } from './game';
import { OPENING_ROOM } from './game';
import { firstColumn } from './sprite';
import { cellInk, cellPaper } from '../../shared/spectrum';

export const SPRITE_SIZE = 16;
/** Bright white, ENHANCED's colour for a sprite whose own would not show. */
const WHITE = 15;

/** A sprite to draw: which entity (0 Monty, 1 to 6 the room's things), where its top left is in the picture's pixels, the picture (its address in the original and its 32 bytes) and its colour. */
export interface SpritePlace {
  readonly entity: number;
  readonly x: number;
  readonly y: number;
  readonly address: number;
  readonly image: Uint8Array;
  readonly colour: number;
}

/** The ink a sprite at (x, y) is drawn in: that of the cell under its middle, unless it is the cell's paper too. */
function inkAt(g: Game, x: number, y: number): number {
  const attr = g.field.attrs[(23 - (((y - 8) & 0xff) >> 3)) * 32 + (((x + 8) & 0xff) >> 3)] ?? 0x47;
  const ink = cellInk(attr);
  return ink === cellPaper(attr) ? WHITE : ink;
}

/** The sprites there are now. */
export function spritePlaces(g: Game): SpritePlace[] {
  if (g.outcome !== 'playing') return [];
  const out: SpritePlace[] = [];
  const m = g.monty;
  if (m.frameAddr >= SPRITE_BASE || (m.frameAddr >= 0x849c && m.frameAddr < 0x869c)) {
    out.push({ entity: 0, x: m.x, y: 191 - m.y, address: m.frameAddr, image: imageAt(m.frameAddr), colour: inkAt(g, m.x, m.y) });
  }
  if (g.room === OPENING_ROOM) return out; // (the scene has no things: what moves in it is in the screen)
  g.enemies.list.forEach((e, i) => {
    if (e.state === EnemyState.none) return;
    const address = (e.sets[e.dir] ?? 0) + SPRITE_BYTES * ((e.counter >> 1) & 3);
    if (address < SPRITE_BASE || address + SPRITE_BYTES > SPRITE_BASE + SPRITE_FRAMES.length) return;
    out.push({ entity: 1 + i, x: e.x, y: 191 - e.y, address, image: imageAt(address), colour: cellInk(e.colour) === cellPaper(e.colour) ? WHITE : cellInk(e.colour) });
  });
  return out;
}

/** The scenery as a bitmap of 6144 bytes in `out`. */
export function sceneryBits(g: Game, out: Uint8Array): Uint8Array {
  const f = g.field;
  if (g.room === OPENING_ROOM) {
    out.set(f.screen);
    const m = g.monty;
    const column = firstColumn(m.x);
    for (let r = 0; r < SPRITE_SIZE; r++) {
      const at = screenOffset(m.y - r) + column;
      for (let c = 0; c < 3; c++) out[at + c] = f.picture[at + c] ?? 0;
    }
    return out;
  }
  out.set(f.picture);
  for (const [from, to] of [[0, 16], [176, 192]] as const) {
    for (let line = from; line < to; line++) {
      const at = screenOffset(191 - line);
      out.set(f.screen.subarray(at, at + 32), at);
    }
  }
  for (const run of CONVEYORS.get(g.room) ?? []) {
    for (let line = 0; line < 3; line++) {
      const at = screenOffset(run.y) + run.start + line * 256;
      out.set(f.screen.subarray(at, at + run.bytes), at);
    }
  }
  return out;
}
