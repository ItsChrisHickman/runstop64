/**
 * The preview sheets: for a game, each of his pictures beside the Dragonskulle picture it would become (4x), and a few frames of the
 * game's own rooms with the swap composited in (from the frame the collector kept: the picture without sprite 2, drawn again with
 * the Dragonskulle picture at the same place, its feet on the original's feet line). Presentation only: nothing here touches a game.
 *   nice -n 15 node tools/test.mjs games/shared/pendragon/study/sheet.ts <data dir> <game> <out dir> [pose,pose,pose]
 */
import fs from 'node:fs';
import { Surface } from 'c64kit';
import { TRANSPARENT } from '../../../../packages/c64kit/src/surface';
import { indicesPng } from '../../../../tools/probe/render';
import { Canvas, poseSurface, readPoses, type PoseRecord } from './draw';
import { DIRS, DRAGONSKULLE, SETS, swapsFor } from './map';
import { must } from '../../test/must';

const [dir = '', gameId = '', outDir = '', roomsArg = ''] = process.argv.slice(2);
const from = must(SETS[gameId], 'game');
const orig = new Map(readPoses(`${dir}/${gameId}.json`).map((p) => [p.room, p]));
const ds = new Map(readPoses(`${dir}/dragonskulle.json`).map((p) => [p.room, p]));
const swaps = swapsFor(from);
fs.mkdirSync(outDir, { recursive: true });

const S = 4, W = 24 * S, H = 42 * S, GAP = 6;
const LABEL = 1;

/** The pose in its own game's colours; the Dragonskulle pose in his. */
const shown = (p: PoseRecord | undefined) => (p ? poseSurface(p) : null);
/** The picture's last row with a pixel (feet), 0..41 on the expanded sprite. */
function feet(s: Surface): number {
  for (let y = s.height - 1; y >= 0; y--) for (let x = 0; x < s.width; x++) if (s.pixels[y * s.width + x] !== TRANSPARENT) return y;
  return 0;
}
/** The pose numbers that appear in a game's pictures, for the sheet's rows. */
function frame(cv: Canvas, p: PoseRecord | undefined, x: number, y: number, tag: string, c = LABEL) {
  const s = shown(p);
  if (s) cv.blit(s, x, y + 12, S);
  cv.text(tag, x, y, c, 2);
}

// ---- sheet 1: the poses, original over Dragonskulle ----
interface Row { label: string; pairs: { o: number; d: number; neu: boolean; tag: string }[] }
const rows: Row[] = [];
for (const d of DIRS) {
  rows.push({ label: `STAND ${d}`, pairs: [{ o: from.stand[d], d: DRAGONSKULLE.stand[d], neu: false, tag: String(from.stand[d]) }] });
  rows.push({ label: `WALK ${d} (ONE ROUND)`, pairs: from.walk[d].map((o) => ({ o, d: must(swaps.get(o), `swap of ${o}`).ds, neu: false, tag: String(o) })) });
}
if (from.jump) for (const d of DIRS) rows.push({ label: `JUMP ${d}`, pairs: from.jump[d].map((o) => ({ o, d: must(swaps.get(o), 'jump swap').ds, neu: false, tag: String(o) })) });
if (from.strike) for (const d of DIRS) rows.push({ label: `${from.strike.what.split(' (')[0].toUpperCase()} ${d}: NEW FRAME NEEDED (STAND-IN: DRAGONSKULLE'S ${DRAGONSKULLE.strike?.what.split(' (')[0].toUpperCase()})`, pairs: from.strike.frames[d].map((o) => ({ o, d: must(swaps.get(o), 'strike swap').ds, neu: true, tag: String(o) })) });
const wide = Math.max(...rows.map((r) => r.pairs.length));
const sheet = new Canvas(wide * (W + GAP) + 10, rows.length * (2 * (H + 16) + 30) + 10);
rows.forEach((row, ri) => {
  const y = 6 + ri * (2 * (H + 16) + 30);
  sheet.text(row.label, 6, y, row.pairs.some((p) => p.neu) ? 7 : LABEL, 2);
  row.pairs.forEach((pr, i) => {
    const x = 6 + i * (W + GAP);
    frame(sheet, orig.get(pr.o), x, y + 18, `${gameId.slice(0, 3).toUpperCase()} ${pr.tag}`);
    frame(sheet, ds.get(pr.d), x, y + 18 + H + 16, `DS ${pr.d}`, pr.neu ? 7 : LABEL);
  });
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
  const o = must(shown(orig.get(id)), 'original');
  const sw = swaps.get(id), target = sw ? ds.get(sw.ds) : undefined;
  const put = (s: Surface, buf: Uint8Array, dy: number) => {
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      const c = s.pixels[y * s.width + x], X = sx + x, Y = sy + y + dy;
      if (c !== TRANSPARENT && X >= 0 && Y >= 0 && X < 320 && Y < 200) buf[Y * 320 + X] = c;
    }
  };
  const left = px.slice(), right = px.slice();
  put(o, left, 0);
  const n = target ? poseSurface(target) : null;
  if (n) put(n, right, feet(o) - feet(n));
  const cx = Math.max(0, Math.min(320 - CROP_W, sx + 12 - CROP_W / 2)), cy = Math.max(0, Math.min(200 - CROP_H, sy + 21 - CROP_H / 2));
  const y0 = 4 + i * (CROP_H * Z + 24);
  [left, right].forEach((buf, k) => {
    for (let y = 0; y < CROP_H * Z; y++) for (let x = 0; x < CROP_W * Z; x++) roomSheet.px[(y0 + 14 + y) * roomSheet.w + 10 + k * (CROP_W * Z + 10) + x] = buf[(cy + Math.floor(y / Z)) * 320 + cx + Math.floor(x / Z)];
  });
  roomSheet.text(`${gameId.toUpperCase()} ${id} ${sw ? sw.role.toUpperCase() : ''}`, 10, y0, LABEL, 2);
  roomSheet.text(n ? `DRAGONSKULLE ${sw?.ds}${sw?.newFrame ? ' (STAND-IN, NEW FRAME NEEDED)' : ''}` : 'NO COUNTERPART', 10 + CROP_W * Z + 10, y0, sw?.newFrame ? 7 : LABEL, 2);
});
if (picks.length) indicesPng(`${outDir}/${gameId}-rooms.png`, roomSheet.px, roomSheet.w, roomSheet.h, 1);
console.log(`${gameId}: ${rows.length} rows, ${picks.length} room frames`);
