/**
 * Siberia's map as a picture: the nine rooms as boxes on the exit grid (columns 4-7, rows 0-2, Moscow's station beside them), each with
 * its name, the joins drawn between them (a line with a letter: W walk, R rope both ways, U under the roof by a gangway), the
 * dead end marked, and the critical path in yellow. Not a check.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/siberia-map.ts <out-file.png>
 */
import { SIB, SIBERIA_SECTORS } from '../src/siberia';
import { Canvas, label } from './preview-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: siberia-map.ts <out-file.png>');

const CW = 84, CH = 46, GX = 26, GY = 22, X0 = 12, Y0 = 18;
const cv = new Canvas(X0 * 2 + 5 * CW + 4 * GX, Y0 * 2 + 3 * CH + 2 * GY);
label(cv, 'DO SVIDANIYA MONTY: SIBERIA (COLUMNS 4-7)', 4, 4, 1);

/** Where each room is: grid column (3 is Moscow's station, drawn as a stub) and row. */
const CELL: Readonly<Record<number, readonly [col: number, row: number]>> = {
  [SIB.yeti]: [4, 0], [SIB.pines]: [5, 0], [SIB.mine]: [6, 0], [SIB.shaft]: [7, 0],
  [SIB.gravy]: [4, 1], [SIB.sleeper]: [5, 1], [SIB.coal]: [6, 1], [SIB.lake]: [7, 1], [SIB.border]: [7, 2],
};
const px = (col: number, row: number) => ({ x: X0 + (col - 3) * (CW + GX), y: Y0 + row * (CH + GY) });
const box = (x: number, y: number, c: number) => { for (let i = 0; i < CW; i++) { cv.set(x + i, y, c); cv.set(x + i, y + CH - 1, c); } for (let j = 0; j < CH; j++) { cv.set(x, y + j, c); cv.set(x + CW - 1, y + j, c); } };
const line = (x0: number, y0: number, x1: number, y1: number, c: number) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) { cv.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c); cv.set(Math.round(x0 + ((x1 - x0) * i) / n) + 1, Math.round(y0 + ((y1 - y0) * i) / n), c); }
};

// Moscow's station, a stub
{ const p = px(3, 1); box(p.x, p.y, 2); label(cv, 'MOSCOW', p.x + 4, p.y + 6, 2); label(cv, 'SIBERIA YOU', p.x + 4, p.y + 16, 2); label(cv, 'LATER', p.x + 4, p.y + 24, 2); }

for (const [id, [col, row]] of Object.entries(CELL)) {
  const p = px(col, row);
  const sector = SIBERIA_SECTORS[Number(id) - SIB.gravy];
  const dead = Number(id) === SIB.yeti;
  box(p.x, p.y, dead ? 8 : 5);
  const words = (sector?.text ?? '').split(' ');
  let y = p.y + 6;
  let line_ = '';
  for (const w of words) {
    if ((line_ + ' ' + w).trim().length * 4 > CW - 8) { label(cv, line_.trim(), p.x + 4, y, 1); y += 8; line_ = ''; }
    line_ += ` ${w}`;
  }
  label(cv, line_.trim(), p.x + 4, y, 1);
  if (dead) label(cv, 'DEAD END', p.x + 4, p.y + CH - 9, 8);
}

/** A join between two cells: kind letter, whether it is on the critical path, and how far (pixels) its line is moved off the cells' middle (two joins of a pair do not overlap). */
const JOINS: readonly [from: number, to: number, kind: string, main: boolean, off: number][] = [
  [-1, SIB.gravy, 'W', true, 0], [SIB.gravy, SIB.sleeper, 'W', true, -9], [SIB.gravy, SIB.sleeper, 'U', false, 9],
  [SIB.sleeper, SIB.coal, 'W', true, -9], [SIB.sleeper, SIB.coal, 'U', true, 9], [SIB.sleeper, SIB.pines, 'R', true, 0],
  [SIB.coal, SIB.mine, 'R', false, 0],
  [SIB.pines, SIB.yeti, 'W', false, 0], [SIB.pines, SIB.mine, 'W', true, 0], [SIB.mine, SIB.shaft, 'W', true, 0], [SIB.shaft, SIB.lake, 'R', true, 0], [SIB.lake, SIB.border, 'R', true, 0],
];
for (const [from, to, kind, main, off] of JOINS) {
  const a = from < 0 ? px(3, 1) : px(...(CELL[from] ?? [0, 0]));
  const b = px(...(CELL[to] ?? [0, 0]));
  const c = main ? 7 : 12;
  const [ax, ay] = [a.x + CW / 2, a.y + CH / 2], [bx, by] = [b.x + CW / 2, b.y + CH / 2];
  const horizontal = Math.abs(ay - by) < 2;
  if (horizontal) line(a.x + (ax < bx ? CW : 0), ay + off, b.x + (ax < bx ? 0 : CW), by + off, c); else line(ax + off, a.y + (ay < by ? CH : 0), bx + off, b.y + (ay < by ? 0 : CH), c);
  label(cv, kind, (ax + bx) / 2 - 1 + (horizontal ? 0 : off), (ay + by) / 2 - 8 + (horizontal ? off : 8), c);
}
label(cv, 'W WALK ON THE ROOF  U UNDER THE ROOF (GANGWAY)  R ROPE', 4, cv.h - 12, 12);
label(cv, 'YELLOW: CRITICAL PATH', 4, cv.h - 6, 7);
cv.png(out, 3);
