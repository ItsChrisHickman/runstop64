/**
 * The preview sheets, from the real swap (`../figure.ts` with each game's own spec): for a game, each of his pictures above what it
 * becomes (4x; a line marks the original's feet, and the swapped figure is moved as the game would move it), and a few frames of the
 * game's own rooms with the swap composited in (from the frame the collector kept: the picture without sprite 2, with the figure drawn
 * again where the game draws it). Presentation only: nothing here touches a game.
 *   nice -n 15 node tools/test.mjs games/shared/pendragon/study/sheet.ts <data dir> <game> <out dir> [pose,pose,pose]
 */
import fs from 'node:fs';
import { Surface, decodeSprite } from 'c64kit';
import { TRANSPARENT } from '../../../../packages/c64kit/src/surface';
import type { SpriteCapture } from '../../../../packages/c64kit/src/c64/machine';
import { indicesPng } from '../../../../tools/probe/render';
import { blackwycheFigure } from '../../../blackwyche/src/figure';
import { entombedFigure } from '../../../entombed/src/figure';
import { karnathFigure } from '../../../karnath/src/figure';
import { must } from '../../test/must';
import { FigureSwap, type FigureSpec } from '../figure';
import { Canvas, mainColours, poseSurface, readPoses, type PoseRecord } from './draw';
import { DIRS, SETS, swapsFor } from './map';

const [dir = '', gameId = '', outDir = '', roomsArg = ''] = process.argv.slice(2);
const SPECS: Record<string, FigureSpec> = { karnath: karnathFigure, entombed: entombedFigure, blackwyche: blackwycheFigure };
const from = must(SETS[gameId], 'game');
const swap = new FigureSwap(must(SPECS[gameId], 'figure spec'));
const orig = new Map(readPoses(`${dir}/${gameId}.json`).map((p) => [p.room, p]));
const swaps = swapsFor(from);
fs.mkdirSync(outDir, { recursive: true });

const S = 3, W = 24 * S, H = 42 * S, GAP = 6, PAD = 3 * S;
const LABEL = 1;

/** A pose as the swap shows it: a picture, how far the sprite moves, and the colours it is drawn in (null: the swap leaves it). */
function swapped(p: PoseRecord): { surface: Surface; dx: number; dy: number } | null {
  const [colour, mc1, mc2] = mainColours(p);
  const cap: SpriteCapture = { n: 2, x: 0, y: 0, data: Uint8Array.from(Buffer.from(p.data, 'hex')), colour, multicolour: p.multicolour, expandX: p.expandX, expandY: p.expandY, behind: false, mc1, mc2 };
  swap.apply([cap], new Uint8Array(0x10000));
  if (cap.x === 0 && cap.y === 0 && Buffer.from(cap.data.subarray(0, 63)).toString('hex') === p.data && cap.colour === colour && cap.mc1 === mc1 && cap.mc2 === mc2) return null;
  const surface = new Surface(24, 42);
  decodeSprite(cap.data, cap.colour, cap.multicolour, cap.mc1, cap.mc2, false, true, surface);
  return { surface, dx: cap.x, dy: cap.y };
}
/** The picture's last row with a pixel (feet), 0..41 on the expanded sprite. */
function feet(s: Surface): number {
  for (let y = s.height - 1; y >= 0; y--) for (let x = 0; x < s.width; x++) if (s.pixels[y * s.width + x] !== TRANSPARENT) return y;
  return 0;
}

// ---- sheet 1: the poses, original over the swap, in a grid ----
interface Cell { tag: string; id: number; neu: boolean }
const cells: Cell[] = [];
const seenIds = new Set<number>();
const add = (tag: string, ids: readonly number[], neu = false) => ids.forEach((id) => { if (!seenIds.has(id)) { seenIds.add(id); cells.push({ tag, id, neu }); } });
for (const d of DIRS) {
  add(`STAND ${d}`, [from.stand[d]]);
  add(`WALK ${d}`, from.walk[d]);
}
if (from.jump) for (const d of DIRS) add(`JUMP ${d}`, must(from.jump, 'jump')[d]);
if (from.strike) for (const d of DIRS) add(`${must(from.strike, 'strike').what.split(' (')[0].toUpperCase().slice(0, 7)} ${d}`, must(from.strike, 'strike').frames[d], true);
const COLS = 14, CW = W + 2 * PAD + GAP, CH = 2 * (H + 2 * PAD + 14) + 30;
const sheet = new Canvas(COLS * CW + 10, Math.ceil(cells.length / COLS) * CH + 10);
cells.forEach((cell, i) => {
  const x = 6 + (i % COLS) * CW, y = 6 + Math.floor(i / COLS) * CH;
  const p = orig.get(cell.id), sw = p ? swapped(p) : null;
  const o = p ? poseSurface(p) : null;
  sheet.text(`${cell.tag}`, x, y, cell.neu ? 7 : LABEL, 1);
  sheet.text(`${gameId.slice(0, 3).toUpperCase()} ${cell.id}`, x, y + 8, LABEL, 1);
  const top = y + 18, lower = top + H + 2 * PAD + 30;
  if (o) sheet.blit(o, x + PAD, top + PAD, S);
  sheet.text(sw ? `${sw.dx >= 0 ? '+' : ''}${sw.dx} ${sw.dy >= 0 ? '+' : ''}${sw.dy}` : '=', x, lower - 10, cell.neu ? 7 : LABEL, 1);
  if (sw) sheet.blit(sw.surface, x + PAD + sw.dx * S, lower + PAD + sw.dy * S, S);
  if (o) {
    // the original's feet line over both
    const line = feet(o) * S + S;
    sheet.rect(x, top + PAD + line, W + 2 * PAD, 1, 9);
    sheet.rect(x, lower + PAD + line, W + 2 * PAD, 1, 9);
  }
});
indicesPng(`${outDir}/${gameId}-poses.png`, sheet.px, sheet.w, sheet.h, 1);

// ---- sheet 2: in the room ----
const picks = (roomsArg ? roomsArg.split(',').map(Number) : []).filter((n) => orig.has(n));
const CROP_W = 128, CROP_H = 96, Z = 5;
const roomSheet = new Canvas(2 * CROP_W * Z + 30, picks.length * (CROP_H * Z + 24) + 10);
picks.forEach((id, i) => {
  const bin = fs.readFileSync(`${dir}/${gameId}/room-${id}.bin`);
  const px = Uint8Array.from(bin.subarray(0, 64000));
  const v = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const sx = v.getUint16(64000) - 24, sy = v.getUint16(64002) - 50;
  const p = must(orig.get(id), 'original');
  const put = (s: Surface, buf: Uint8Array, ox: number, oy: number) => {
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      const c = s.pixels[y * s.width + x], X = sx + x + ox, Y = sy + y + oy;
      if (c !== TRANSPARENT && X >= 0 && Y >= 0 && X < 320 && Y < 200) buf[Y * 320 + X] = c;
    }
  };
  const left = px.slice(), right = px.slice();
  put(poseSurface(p), left, 0, 0);
  const sw = swapped(p);
  put(sw ? sw.surface : poseSurface(p), right, sw?.dx ?? 0, sw?.dy ?? 0);
  const cx = Math.max(0, Math.min(320 - CROP_W, sx + 12 - CROP_W / 2)), cy = Math.max(0, Math.min(200 - CROP_H, sy + 21 - CROP_H / 2));
  const y0 = 4 + i * (CROP_H * Z + 24);
  [left, right].forEach((buf, k) => {
    for (let y = 0; y < CROP_H * Z; y++) for (let x = 0; x < CROP_W * Z; x++) roomSheet.px[(y0 + 14 + y) * roomSheet.w + 10 + k * (CROP_W * Z + 10) + x] = buf[(cy + Math.floor(y / Z)) * 320 + cx + Math.floor(x / Z)];
  });
  const role = swaps.get(id)?.role ?? '';
  roomSheet.text(`${gameId.toUpperCase()} ${id} ${role.toUpperCase()}`, 10, y0, LABEL, 2);
  roomSheet.text(sw ? `SWAPPED ${sw.dx} ${sw.dy}` : 'AS DRAWN', 10 + CROP_W * Z + 10, y0, LABEL, 2);
});
if (picks.length) indicesPng(`${outDir}/${gameId}-rooms.png`, roomSheet.px, roomSheet.w, roomSheet.h, 1);
console.log(`${gameId}: ${cells.length} pictures, ${picks.length} room frames`);
