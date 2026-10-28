/**
 * Where Pendragon can stand and walk in a strip of the castle, worked out from the strip's map as the game starts with it
 * (re/README.md, "Reach"). The game's own floor check ($27BA) is the rule: of the screen's cells, the one in front of his feet,
 * the way he faces, must be floor ($16 $17 $18 $4F) for him to step that way; and the way up takes him one step right
 * as well, the way down one left ($1FEA, $20C3: the castle is drawn from a corner). A door ($55 going right, $53 going
 * left) opens when he walks into it low enough on the screen ($2880, $28C9: his height from $9A, or $7A on the upper floor) and
 * leaves a floor two rows deep through it ($2AC9). Everything else the cells hold is a wall to the check, and the stairs ($6D, $CF),
 * the tower door ($67) and the sign down ($A5-$A7) are what he walks into to be taken elsewhere.
 *
 * The model is a plan, not a proof: test/reach.ts walks the game by it and says how often the game disagreed.
 */
import { STRIPS, type Strip } from '../src/strips';

/** A strip, in pixels along it (to its 120 columns) and down the screen (to the floor's front, 158). */
export const W = 960, H = 159;
/** The ways he steps: left, right, up, down; the way up goes one right, the way down one left. */
export const LEFT = 0, RIGHT = 1, UP = 2, DOWN = 3;
export const DX = [-1, 1, 1, -1] as const, DY = [0, 0, -1, 1] as const;
const FLOOR: ReadonlySet<number> = new Set([0x16, 0x17, 0x18, 0x4f]);
/** The pieces of the pentacle in the map are walked into and taken: floor to the check ($167C). */
const PIECE: ReadonlySet<number> = new Set([0xd4, 0xd5]);
/** What a floor patch through a door is made of: the bottom row of the picture $2AC9 draws (the game's table at $2B08). */
const DOOR_FLOOR = [0x17, 0x17, 0x16, 0x4f] as const;
const DOOR_RIGHT = 0x55, DOOR_LEFT = 0x53;

/** The ways to another place, and what stands for each in the map ($B8: the dungeons' far door to Karn's abode). */
export type Kind = 'U' | 'D' | 'T' | 'S' | 'R' | 'L' | 'B';
const KIND: ReadonlyMap<number, Kind> = new Map([[0x6d, 'U'], [0xcf, 'D'], [0x67, 'T'], [0xa5, 'S'], [0xa6, 'S'], [0xa7, 'S'], [0xb8, 'B']]);
/** The step each is taken by. */
export const TAKEN: Readonly<Record<Kind, number>> = { U: UP, D: UP, T: UP, S: DOWN, R: RIGHT, L: LEFT, B: UP };

/** A way to another place: its kind, its row and its cells' columns, and the standing places (as indexes `y * W + x`) from which the next step is into it. */
export interface Cluster { kind: Kind; row: number; from: number; to: number; states: number[] }
/** A part of a strip he can walk about in (by the model), and the cells (of 8 columns) it reaches. */
export interface Region { size: number; cells: Set<number>; clusters: Cluster[] }

export interface Floor {
  strip: Strip;
  /** The cell in front of his feet for a step, at a place. */
  probe(step: number, x: number, y: number): [number, number];
  free(step: number, x: number, y: number): boolean;
  /** Which region each place is in (-1: none). */
  region: Int32Array;
  regions: Region[];
}

/** A strip's characters ($400 a block of 40 columns by 25 rows). */
const cellAt = (ram: Uint8Array, strip: Strip, col: number, row: number) =>
  col < 0 || col >= 120 || row < 0 || row > 24 ? 0 : ram[(strip.base + 4 * Math.floor(col / 40)) * 256 + row * 40 + (col % 40)];

/** The strip's regions: its places joined by steps, the doors opened as walking into them finds them. */
export function floorOf(ram: Uint8Array, strip: Strip): Floor {
  const doorFrom = strip.mode === 1 ? 0x7a : 0x9a; // ($2880: his height, on the upper floor and elsewhere)
  const patch = new Map<number, number>();
  const char = (col: number, row: number) => patch.get(row * 120 + col) ?? cellAt(ram, strip, col, row);
  const probe = (step: number, x: number, y: number): [number, number] => {
    if (step === LEFT) return [Math.floor(x / 8), Math.floor((y - 8) / 8)];
    if (step === RIGHT) return [Math.floor((x + 8) / 8), Math.floor((y - 8) / 8)];
    if (step === UP) return [Math.floor((x + 8) / 8), Math.floor((y - 16) / 8)];
    return [Math.floor(x / 8), Math.floor((y - 6) / 8)];
  };
  const found = new Set<string>();
  const free = (step: number, x: number, y: number) => {
    const [c, r] = probe(step, x, y);
    if (patch.has(r * 120 + c)) return step < 2 && y >= doorFrom;
    const v = char(c, r);
    if (FLOOR.has(v) || PIECE.has(v)) return true;
    if ((step === RIGHT && v === DOOR_RIGHT) || (step === LEFT && v === DOOR_LEFT)) {
      if (y < doorFrom) return false;
      found.add(`${step},${c},${r}`);
      return true;
    }
    return false;
  };
  const opened = new Set<string>();
  let region = new Int32Array(0);
  let regions: Region[] = [];
  for (let round = 0; round < 40; round++) {
    found.clear();
    region = new Int32Array(W * H).fill(-1);
    regions = [];
    for (let first = 0; first < W * H; first++) {
      if (region[first] !== -1) continue;
      const sx = first % W, sy = (first / W) | 0;
      if (![LEFT, RIGHT, UP, DOWN].some((s) => free(s, sx, sy))) { region[first] = -2; continue; }
      const id = regions.length;
      const here: Region = { size: 0, cells: new Set(), clusters: [] };
      regions.push(here);
      const ways = new Map<string, Way>();
      const stack = [first];
      region[first] = id;
      for (let p = stack.pop(); p !== undefined; p = stack.pop()) {
        const x = p % W, y = (p / W) | 0;
        here.size++;
        here.cells.add(Math.min(119, Math.floor((x + 12) / 8)) >> 3);
        for (let step = 0; step < 4; step++) {
          const open = free(step, x, y);
          if (open && step < 2) {
            // a door in front of him: walking through it counts a room on (or back)
            const [c, r] = probe(step, x, y);
            if (opened.has(`${step},${c},${r}`)) addWay(ways, step === RIGHT ? 'R' : 'L', r, c, p);
          }
          const nx = x + DX[step], ny = y + DY[step];
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          if (open && (step === UP || step === DOWN)) {
            // the stairs, the tower door, the sign down: his next step finds them
            const [c, r] = probe(step, nx, ny);
            const kind = KIND.get(char(c, r));
            if (kind && TAKEN[kind] === step && !free(step, nx, ny)) addWay(ways, kind, r, c, p);
          }
          if (!open) continue;
          const q = ny * W + nx;
          if (region[q] !== -1) continue;
          region[q] = id;
          stack.push(q);
        }
      }
      here.clusters = clusters(ways);
    }
    let added = false;
    for (const key of found) {
      if (opened.has(key)) continue;
      opened.add(key);
      const [step, c, r] = key.split(',').map(Number);
      const from = step === RIGHT ? c - 1 : c - 2;
      DOOR_FLOOR.forEach((v, j) => patch.set(r * 120 + from + j, v));
      added = true;
    }
    if (!added) break;
  }
  return { strip, probe, free, region, regions };
}

/** One cell of a way, and the places from which the next step is into it. */
interface Way { kind: Kind; row: number; col: number; states: number[] }
const addWay = (ways: Map<string, Way>, kind: Kind, row: number, col: number, state: number) => {
  const key = `${kind},${row},${col}`;
  const way = ways.get(key) ?? { kind, row, col, states: [] };
  way.states.push(state);
  ways.set(key, way);
};

/** The ways, the cells of one kind in a row next to each other made one. */
function clusters(ways: Map<string, Way>): Cluster[] {
  const cells = [...ways.values()];
  cells.sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.row - b.row || a.col - b.col));
  const out: Cluster[] = [];
  for (const cell of cells) {
    const last = out[out.length - 1];
    if (last && last.kind === cell.kind && last.row === cell.row && cell.col <= last.to + 1) { last.to = cell.col; last.states.push(...cell.states); }
    else out.push({ kind: cell.kind, row: cell.row, from: cell.col, to: cell.col, states: [...cell.states] });
  }
  return out;
}

/** How many steps from each place to the nearest of `targets`, inside one floor (-1: none): a search backwards from them. */
export function distances(floor: Floor, targets: readonly number[]): Int32Array {
  const dist = new Int32Array(W * H).fill(-1);
  let frontier = [...targets];
  for (const t of frontier) dist[t] = 0;
  while (frontier.length) {
    const next: number[] = [];
    for (const q of frontier) {
      const x = q % W, y = (q / W) | 0;
      for (let step = 0; step < 4; step++) {
        const px = x - DX[step], py = y - DY[step];
        if (px < 0 || px >= W || py < 0 || py >= H) continue;
        const p = py * W + px;
        if (dist[p] >= 0 || !floor.free(step, px, py)) continue;
        dist[p] = dist[q] + 1;
        next.push(p);
      }
    }
    frontier = next;
  }
  return dist;
}

/** The floors of the castle (the two floors, the dungeons, Karn's abode); `memory(mode)` is the game's memory with that mode's maps in place (the floors swap them: src/travel.ts `toMode`). */
export function floors(memory: (mode: number) => Uint8Array): Floor[] {
  return STRIPS.map((s) => floorOf(memory(s.mode), s));
}
