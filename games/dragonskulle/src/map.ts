import { isNumbers, isRecord, isString } from '../../shared/guards';
import { COL, type Box, type FoundCodec, type PauseMap } from '../../shared/native/pause';
import { go, location } from './travel';
import { CLOAK_FRAMES, FRAMES_A_SECOND, cloakLeft, hitsLeft, wizardsLeft } from './rules';

/**
 * Dragonskulle's map, for the pause screen: the island as the game keeps it, a grid of
 * screens (17 columns by 24 rows at $6E20; each cell the page of the picture drawn there, 0
 * for none), with the screens Pendragon has been on shown as he finds them, the one he's on
 * blinking. Rows that run on as one long scrolling place (the beach, the corridors: their
 * pictures join at the edges) are drawn joined. Travel: back to where he first came onto any
 * screen he's been on (travel.ts), the game's own way.
 */
export const COLUMNS = 17, ROWS = 24;
const TABLE = 0x6e20;
/** The cell he's in: column $20A8 of row $20A9. */
export const cellOf = (ram: Uint8Array) => ({ x: ram[0x20a8], y: ram[0x20a9] });
export const cellKey = (ram: Uint8Array) => `${ram[0x20a8]},${ram[0x20a9]}`;
const picture = (ram: Uint8Array, x: number, y: number) => (x >= 0 && x < COLUMNS && y >= 0 && y < ROWS ? ram[TABLE + y * COLUMNS + x] : 0);
/**
 * Pictures that are part of a scrolling row (they join their neighbours): the beach's ($76,
 * $70, $73) and the corridors' ends ($82 left, $7F right), stretches ($79, $7C, $88) and
 * doorways ($85, $A0). The others ($8B, $AC, $A6, $A9, $A3) are rooms of a screen each.
 */
const JOINS: Record<number, { left: boolean; right: boolean }> = {
  0x76: { left: false, right: true }, 0x70: { left: true, right: true }, 0x73: { left: true, right: false },
  0x82: { left: false, right: true }, 0x79: { left: true, right: true }, 0x7c: { left: true, right: true }, 0x7f: { left: true, right: false },
  0x88: { left: true, right: true }, 0x85: { left: true, right: true }, 0xa0: { left: true, right: true },
};
const joined = (ram: Uint8Array, x: number, y: number) => {
  const a = JOINS[picture(ram, x, y)], b = JOINS[picture(ram, x + 1, y)];
  return !!a && !!b && a.right && b.left;
};

/** What the map keeps of the player's progress: the screens been on, where he came onto each (to go back to), the last one, and the ways walked between them. */
export interface DragonskulleFound { cells: string[]; at: Record<string, number[]>; last: string | null; links: string[] }
const FOUND: FoundCodec<DragonskulleFound> = {
  empty: () => ({ cells: [], at: {}, last: null, links: [] }),
  parse: (kept) => {
    const f = isRecord(kept) ? kept : {};
    const at: Record<string, number[]> = {};
    if (isRecord(f.at)) for (const [k, v] of Object.entries(f.at)) if (isNumbers(v)) at[k] = v;
    return {
      cells: Array.isArray(f.cells) ? f.cells.filter(isString) : [],
      at,
      last: typeof f.last === 'string' ? f.last : null,
      links: Array.isArray(f.links) ? f.links.filter(isString) : [],
    };
  },
};

/**
 * Where the screens are drawn: the part of the island found so far (and where he is), as big as
 * fits (a screen twice as wide as it's high, as the screens are), the beach (row 0) at the bottom:
 * the rows go up into the island as he goes up through it.
 */
function layout(box: Box, cells: string[], here: string) {
  const xs: number[] = [], ys: number[] = [];
  for (const k of [...cells, here]) { const [x, y] = k.split(',').map(Number); xs.push(x); ys.push(y); }
  const x0 = Math.max(0, Math.min(...xs) - 1), x1 = Math.min(COLUMNS - 1, Math.max(...xs) + 1);
  const y0 = Math.max(0, Math.min(...ys) - 1), y1 = Math.min(ROWS - 1, Math.max(...ys) + 1);
  const cols = x1 - x0 + 1, rows = y1 - y0 + 1;
  const h = Math.max(4, Math.min(14, Math.floor(box.h / rows), Math.floor(box.w / cols / 2))), w = h * 2;
  const ox = box.x + Math.floor((box.w - w * cols) / 2), oy = box.y + Math.floor((box.h - h * rows) / 2);
  return { w, h, left: (x: number) => ox + (x - x0) * w, top: (y: number) => oy + (y1 - y) * h };
}

export const dragonskulleMap: PauseMap<Uint8Array, DragonskulleFound> = {
  found: FOUND,
  observe(ram, s, vic) {
    const key = cellKey(ram), { x, y } = cellOf(ram);
    if (!picture(ram, x, y)) return; // (not a screen: the title, a change of screen)
    if (!s.cells.includes(key)) s.cells.push(key);
    // Where he came onto a screen by a change of screen (off an edge, through a way up or
    // down), to come back to the same way: not where walking along a scrolling row took him
    // into the next stretch of it (the game works out a screen's block from the table only on
    // a change of screen), nor where a game starts.
    const [lx, ly] = (s.last ?? '').split(',').map(Number);
    const along = s.last !== null && ly === y && Math.abs(lx - x) === 1 && joined(ram, Math.min(lx, x), y);
    if (s.last !== null && s.last !== key && !along && !s.at[key]) { const at = location(ram, vic); if (at) s.at[key] = at; }
    // the ways he's walked between screens (next to each other on the island), drawn as links
    if (s.last !== null && s.last !== key && Math.abs(lx - x) + Math.abs(ly - y) === 1) {
      const link = [s.last, key].sort().join('|');
      if (!s.links.includes(link)) s.links.push(link);
    }
    if (s.last !== key && (s.last === null || along || s.at[key] || location(ram, vic))) s.last = key;
  },
  title: () => 'THE ISLAND OF THE SKULL',
  draw(sf, box, ram, s, blink) {
    const here = cellKey(ram), { w, h, left, top } = layout(box, s.cells, here), been = new Set(s.cells);
    for (const link of s.links) {
      const [[ax, ay], [bx, by]] = link.split('|').map((k) => k.split(',').map(Number));
      const cx = (x: number) => left(x) + (w >> 1), cy = (y: number) => top(y) + (h >> 1);
      sf.fillRect(Math.min(cx(ax), cx(bx)), Math.min(cy(ay), cy(by)), Math.abs(cx(bx) - cx(ax)) + 1, Math.abs(cy(by) - cy(ay)) + 1, COL.dgrey);
    }
    for (const k of s.cells) {
      const [x, y] = k.split(',').map(Number);
      const p = picture(ram, x, y);
      if (!p) continue;
      const room = !JOINS[p];
      const colour = k === here ? (blink ? COL.white : COL.yellow) : room ? COL.lblue : COL.grey;
      // a scrolling row's screens join their neighbours been on; a room is a box with a gap round it
      const jl = x > 0 && joined(ram, x - 1, y) && been.has(`${x - 1},${y}`), jr = joined(ram, x, y) && been.has(`${x + 1},${y}`);
      sf.fillRect(left(x) + (jl ? 0 : 2), top(y) + 2, w - (jl ? 0 : 2) - (jr ? 0 : 2), Math.max(1, h - 4), colour);
    }
  },
  info(ram, s, assist) {
    const lives = 5 - Math.floor(ram[0x1248] / 3), energy = Math.round((ram[0x123e] * 100) / 20);
    const left = cloakLeft(ram);
    const lines = [
      `LIVES     ${lives}`,
      `ENERGY ${String(energy).padStart(3)}%`,
      `SHOVEL  ${ram[0x342f] ? 'YES' : ' NO'}`,
      // (ENHANCED: how long the cloak has to run, to the second)
      assist?.enhanced && left !== null ? `CLOAK ${String(Math.ceil((left * CLOAK_FRAMES) / FRAMES_A_SECOND)).padStart(2)} SEC` : `CLOAK   ${ram[0x3430] ? 'YES' : ' NO'}`,
      `SCREENS ${String(s.cells.length).padStart(3)}`,
    ];
    // ENHANCED: what is still to do here at a bridge or a dragon (src/rules.ts)
    if (assist?.enhanced) {
      const wizards = wizardsLeft(ram), hits = hitsLeft(ram);
      if (wizards !== null) lines.push('BRIDGE', `KILL ${wizards} MORE`);
      else if (hits !== null) lines.push('DRAGON', `${hits} HITS LEFT`);
    }
    return lines;
  },
  legend: [{ colour: COL.lblue, text: 'ROOM' }, { colour: COL.grey, text: 'PASSAGE' }],
  // Places to go back to: the screens he's come onto (where he came onto them).
  places(box, ram, s) {
    const here = cellKey(ram), { w, h, left, top } = layout(box, s.cells, here);
    return Object.keys(s.at).map((k) => {
      const [x, y] = k.split(',').map(Number);
      return { id: k, x: left(x) + (w >> 1), y: top(y) + (h >> 1), here: k === here };
    });
  },
  go(id, ram, found) {
    const to = found.at[id];
    if (!to || !go(ram, to)) return false;
    found.last = id;
    return true;
  },
};
