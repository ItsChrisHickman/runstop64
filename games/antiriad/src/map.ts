import { COL, type Box, type Found, type PauseMap } from '../../shared/native/pause';
import { cellCount } from './cells';
import { EXITS, ROOMS } from './data';
import type { Game } from './game';
import { emptyLetsOut } from './hero';
import { isPlus } from './plus';
import { V } from './vars';

/**
 * The map for the pause screen: the 69 rooms laid out by their exits (15
 * across, 14 down: the grid C64-Wiki's map uses, columns A-O, levels 1-14, so the
 * power centre is H1). Rooms appear as Tal visits them; where the armour stands
 * and where its parts were found are marked. Places to go back to: the rooms
 * visited, arriving where he first came in (in the armour or out of it, as he
 * is now). Rooms seen but not to be travelled to as he is now (in the armour: the
 * rooms it has never been in; out of it: those he has only flown through) are
 * drawn dark, so it's plain which can be picked; while he's dying or dead, or the
 * game is over, they all are (Game.canTravel).
 */
export interface Entry { x: number; y: number; high: number }

// what's been found, kept as plain JSON (checked as it's read back)
const isEntry = (v: unknown): v is Entry =>
  typeof v === 'object' && v !== null && 'x' in v && 'y' in v && 'high' in v && typeof v.x === 'number' && typeof v.y === 'number' && typeof v.high === 'number';
const isEntries = (v: unknown): v is Record<string, Entry> => typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every(isEntry);

/** The rooms seen. */
export function roomsSeen(f: Found): number[] {
  const v = f.rooms;
  if (Array.isArray(v) && v.every((n): n is number => typeof n === 'number')) return v;
  const rooms: number[] = [];
  f.rooms = rooms;
  return rooms;
}

/** Where Tal came into each room on foot (`entry`), or the armour did (`suitEntry`). */
export function entriesOf(f: Found, inArmour: boolean): Record<string, Entry> {
  const key = inArmour ? 'suitEntry' : 'entry', v = f[key];
  if (isEntries(v)) return v;
  const e: Record<string, Entry> = {};
  f[key] = e;
  return e;
}

/** Each room's place on the grid (by its exits from the power centre). */
export const GRID: { x: number; y: number }[] = (() => {
  const at: { x: number; y: number }[] = [];
  at[0] = { x: 7, y: 0 };
  const way = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const queue = [0];
  for (let i = 0; i < queue.length; i++) {
    const r = queue[i];
    EXITS[r].forEach((to, i) => {
      if (to < 0 || to >= ROOMS || at[to]) return;
      at[to] = { x: at[r].x + way[i][0], y: at[r].y + way[i][1] };
      queue.push(to);
    });
  }
  return at;
})();
const W = 15, H = 14;

/** A room's name on the grid, as C64-Wiki's map gives it (H1: the power centre). */
export const roomName = (room: number) => (GRID[room] ? `${String.fromCharCode(65 + GRID[room].x)}${GRID[room].y + 1}` : '?');

function layout(box: Box) {
  const cw = Math.floor(box.w / W), ch = Math.floor(box.h / H);
  const ox = box.x + Math.floor((box.w - cw * W) / 2), oy = box.y + Math.floor((box.h - ch * H) / 2);
  return { cw, ch, at: (room: number) => ({ x: ox + GRID[room].x * cw, y: oy + GRID[room].y * ch }) };
}

/** A room's square on the map drawn in `box` (its top left corner). */
export const roomAt = (box: Box, room: number) => layout(box).at(room);

const inSuit = (g: Game) => !!(g.ram[V.inSuit] & 0x80);
const entries = (g: Game, f: Found) => entriesOf(f, inSuit(g));
/**
 * The places to travel to now: none while Tal can't travel (dying, dead, the game over: Game.canTravel).
 * In New Game+ the armour goes anywhere he's been (plus.ts): where it came in, else where he did.
 */
function goable(g: Game, f: Found): Record<string, Entry> {
  if (!g.canTravel) return {};
  return g.plus && inSuit(g) ? { ...entriesOf(f, false), ...entriesOf(f, true) } : entries(g, f);
}

export const antiriadMap: PauseMap<Game> = {
  observe(g, found) {
    const rooms = roomsSeen(found), room = g.ram[V.room];
    if (!rooms.includes(room)) rooms.push(room);
    // where Tal (or the armour) came into the room
    const e = entries(g, found), key = String(room);
    if (!e[key]) e[key] = { x: g.ram[0x0200], y: g.ram[0x0201], high: g.ram[V.spriteXHigh] & 1 };
  },
  title: (g) => placeOf(g.ram),
  draw(s, box, g, found, blink) {
    const { cw, ch, at } = layout(box);
    const seen = new Set(roomsSeen(found)), canGo = goable(g, found);
    const here = g.ram[V.room], armour = inSuit(g) ? -1 : g.ram[V.suitRoom];
    for (let r = 0; r < ROOMS; r++) {
      if (!GRID[r]) continue;
      const p = at(r);
      // the ways between rooms seen
      if (seen.has(r)) {
        const [right, , down] = EXITS[r];
        if (right >= 0 && seen.has(right) && GRID[right]?.x === GRID[r].x + 1) s.fillRect(p.x + cw - 1, p.y + (ch >> 1), 1, 1, COL.dgrey);
        if (down >= 0 && seen.has(down) && GRID[down]) s.fillRect(p.x + (cw >> 1) - 1, p.y + ch - 1, 2, 1, COL.dgrey);
      }
      if (r === here) { s.fillRect(p.x, p.y, cw - 1, ch - 1, blink ? COL.white : COL.yellow); continue; }
      if (!seen.has(r)) { s.fillRect(p.x + (cw >> 1), p.y + (ch >> 1), 1, 1, COL.dgrey); continue; }
      // (dark: not a place to travel to as he is now)
      const open = !!canGo[String(r)];
      s.fillRect(p.x, p.y, cw - 1, ch - 1, r < 0x0a ? (open ? COL.red : COL.brown) : open ? COL.grey : COL.dgrey);
      if (r === armour) s.fillRect(p.x + 2, p.y + 2, cw - 5, ch - 5, COL.cyan);
    }
  },
  legend: [{ colour: COL.cyan, text: 'ARMOUR' }, { colour: COL.red, text: 'RADIATION' }, { colour: COL.dgrey, text: 'NO TRAVEL' }],
  info: (g) => [...infoOf(g.ram), ...cellsLine(g), ...emptyHint(g)],
  places(box, g, found) {
    const { cw, ch, at } = layout(box);
    const e = goable(g, found), here = g.ram[V.room];
    return Object.keys(e).map(Number).filter((r) => GRID[r]).map((r) => { const p = at(r); return { id: String(r), x: p.x + (cw >> 1), y: p.y + (ch >> 1), here: r === here }; });
  },
  // the front end hands the place to the game, which goes there between frames (Game.travel)
  go: (id, g, found) => !!goable(g, found)[id],
};

/** Where Tal (or the armour, as he is now) first came into a room. */
export const entryOf = (g: Game, found: Found, room: number) => goable(g, found)[String(room)];

/** Where Tal is (the map's heading). */
const placeOf = (ram: Uint8Array) => `ROOM ${roomName(ram[V.room])}`;
/** How Tal is doing (the pause screen's side panel): the armour's parts found, his life, the armour's energy. */
function infoOf(ram: Uint8Array) {
  const parts = [0, 1, 2, 3].filter((i) => ram[0x067e + i] & 0x80).length;
  return [...(isPlus(ram) ? ['NEW GAME+'] : []), `PARTS     ${parts}`, `LIFE    ${String(Math.round((ram[V.life] * 100) / 31)).padStart(3)}`, `ARMOUR  ${String(Math.round((Math.min(ram[V.suitEnergy], 31) * 100) / 31)).padStart(3)}`];
}
/** ENHANCED: the recharge cells Tal carries, once he has one (cells.ts); ORIGINAL carries one, unshown as ever. */
const cellsLine = (g: Game) => (g.enhanced && cellCount(g.ram) ? [`CELLS     ${cellCount(g.ram)}`] : []);

/**
 * In an armour out of energy, how to get out (the side panel, under ARMOUR 0; 11 letters a line,
 * two lines, so the legend under it keeps clear of the options).
 * The game itself only says "SUIT INOPERATIVE RECHARGE CELL DEPLETED" (hero.ts `settleEmpty`).
 */
function emptyHint(g: Game) {
  const { ram } = g;
  if (!inSuit(g) || ram[V.suitEnergy]) return [];
  // (ENHANCED, with a cell: the better way out of it; one line, so the side panel's legend keeps clear of the options)
  if (g.enhanced && cellCount(ram)) return ['C: REFUEL'];
  // (ORIGINAL: the interlock holds him in the first ten rooms; elsewhere it lands only facing out)
  if (!emptyLetsOut(g) && ram[V.room] < 0x0a) return ['NO WAY OUT', 'IN ORIGINAL'];
  if (emptyLetsOut(g) || ram[V.anim] === 0xb2) return ['STEP OUT:', 'LEFT/RIGHT'];
  // (held backwards it slows, turns to face out, lands, and he steps out)
  return ['STEP OUT:', 'BACKWARDS'];
}

/** A save (its machine's RAM) described for the save manager (ContinueFlow `describe`): as the pause screen says it. */
export const describeSave = (ram: Uint8Array) => [placeOf(ram), ...infoOf(ram)];
