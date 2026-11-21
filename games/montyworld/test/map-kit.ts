/**
 * A region's map as a picture (siberia-map.ts, china-map.ts): its rooms as boxes on the exit grid, each with its name, the joins between them drawn as lines with
 * a letter (what kind, and what it wants), the dead ends marked, and the critical path in yellow; the neighbour the region is entered from drawn as a stub.
 * Not a check.
 */
import type { Sector } from '../../shared/monty/rooms';
import { Canvas, label } from './preview-kit';

const CW = 84, CH = 46, GX = 26, GY = 22, X0 = 12, Y0 = 18;

/** A join between two cells: kind (a letter and what it wants), whether it is on the critical path, and how far (pixels) its line is moved off the cells' middle (two joins of a pair do not overlap). `from` -1 is the stub. */
export type MapJoin = readonly [from: number, to: number, kind: string, main: boolean, off: number];

export interface RegionMap {
  title: string;
  /** The grid column of the region's first column, the columns it has and its rows. */
  firstCol: number; cols: number; rows: number;
  /** Where each room is (grid column, row), its first sector's id and the list of sectors. */
  cells: Readonly<Record<number, readonly [col: number, row: number]>>;
  firstSector: number;
  sectors: readonly Sector[];
  /** The neighbour the region is entered from: drawn at the column before the first, with its name. */
  stub: { row: number; words: readonly string[] };
  deadEnds: readonly number[];
  joins: readonly MapJoin[];
  legend: string;
}

export function drawRegionMap(out: string, m: RegionMap) {
  const cv = new Canvas(X0 * 2 + (m.cols + 1) * CW + m.cols * GX, Y0 * 2 + m.rows * CH + (m.rows - 1) * GY);
  label(cv, m.title, 4, 4, 1);
  const px = (col: number, row: number) => ({ x: X0 + (col - (m.firstCol - 1)) * (CW + GX), y: Y0 + row * (CH + GY) });
  const box = (x: number, y: number, c: number) => { for (let i = 0; i < CW; i++) { cv.set(x + i, y, c); cv.set(x + i, y + CH - 1, c); } for (let j = 0; j < CH; j++) { cv.set(x, y + j, c); cv.set(x + CW - 1, y + j, c); } };
  const line = (x0: number, y0: number, x1: number, y1: number, c: number) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) { cv.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c); cv.set(Math.round(x0 + ((x1 - x0) * i) / n) + 1, Math.round(y0 + ((y1 - y0) * i) / n), c); }
  };
  const stub = px(m.firstCol - 1, m.stub.row);
  box(stub.x, stub.y, 2);
  m.stub.words.forEach((w, i) => label(cv, w, stub.x + 4, stub.y + 6 + i * 8, 2));
  for (const [id, [col, row]] of Object.entries(m.cells)) {
    const p = px(col, row);
    const sector = m.sectors[Number(id) - m.firstSector];
    const dead = m.deadEnds.includes(Number(id));
    box(p.x, p.y, dead ? 8 : 5);
    let y = p.y + 6, text = '';
    for (const w of (sector?.text ?? '').split(' ')) {
      if ((text + ' ' + w).trim().length * 4 > CW - 8) { label(cv, text.trim(), p.x + 4, y, 1); y += 8; text = ''; }
      text += ` ${w}`;
    }
    label(cv, text.trim(), p.x + 4, y, 1);
    if (dead) label(cv, 'DEAD END', p.x + 4, p.y + CH - 9, 8);
  }
  for (const [from, to, kind, main, off] of m.joins) {
    const a = from < 0 ? stub : px(...(m.cells[from] ?? [0, 0]));
    const b = px(...(m.cells[to] ?? [0, 0]));
    const c = main ? 7 : 12;
    const [ax, ay] = [a.x + CW / 2, a.y + CH / 2], [bx, by] = [b.x + CW / 2, b.y + CH / 2];
    const horizontal = Math.abs(ay - by) < 2;
    if (horizontal) line(a.x + (ax < bx ? CW : 0), ay + off, b.x + (ax < bx ? 0 : CW), by + off, c); else line(ax + off, a.y + (ay < by ? CH : 0), bx + off, b.y + (ay < by ? 0 : CH), c);
    label(cv, kind, (ax + bx) / 2 - 1 + (horizontal ? 0 : off), (ay + by) / 2 - 8 + (horizontal ? off : 8), c);
  }
  label(cv, m.legend, 4, cv.h - 12, 12);
  label(cv, 'YELLOW: CRITICAL PATH', 4, cv.h - 6, 7);
  cv.png(out, 3);
}
