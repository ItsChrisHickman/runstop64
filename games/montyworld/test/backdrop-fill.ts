/**
 * No full-screen fill behind the play (LESSONS.md, Chris 2026-11-26: "get rid of backgrounds that were basically painted across the screen"; "Those were not
 * backgrounds, I was talking about full screen fill backgrounds, not small things in the background that make the room more interesting").
 *
 * FILL: in every room, below the top band (the horizon's rows, where sky and distance belong), the cells drawn with a backdrop character that are not solid
 * or a climb, blank, flat colour (every pixel set), a coin, or the sea he swims in; of those, the ones whose piece (character and colour) repeats at least
 * `REPEAT` times in the room are a tiled pattern's. The largest 4-connected area of them made of at most `FEW` pieces and running down at least `MIN_ROWS`
 * rows is the room's fill: a wall of foliage, a rock or brick texture, sky stripes or zigzags running down behind the floors. A picture (St Basil's, NEON
 * STREET's neon, a train, the Lapa arches) is many pieces each used a few times, so it is not fill; a strip (a sea under the flight) does not run down.
 * Calibrated: every room of Monty on the Run's (9 at the most) and the rooms Chris praised (NEON STREET, BULLET POINT and all of Japan, SEEING RED, the train
 * rooms, THE SUMMIT: 45 at the most, THE GRAVY TRAIN's carriage) are under `MAX_FILL`; three rooms whose big repeated area is one thing the eye reads are
 * `KEPT` (MOUNT FUJI's mountainside, HOUSE OF COLOUR's houses and hill, RIO OR BUST's bay).
 *
 * CEILING: an outdoor room (every room not `UNDER_A_ROOF`: caves, mines, halls, interiors, the rainforest's canopy; nor the flight) has nothing along its
 * top: in its playfield's top two rows (the sides left out), under `MAX_EARTH` of the pixels brown or orange ("having brown at the top makes it look like a
 * ceiling") and under `MAX_ROOFED` of the cells solid ("there's no reason for the WILLOW PATTERN to have a ceiling").
 *
 * `PENDING` lists the rooms that fail today, per region, and what the fill is: the work list. A pending room that passes is a failure too (take it off).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/backdrop-fill.ts [--room <rooms>] [<out-dir>]
 *
 * With an out-dir: each region's rooms as a sheet (`<out-dir>/<region>/before.png`, three across in room order) and the same with each room's fill and
 * (where it fails) its ceiling rows outlined in white (`fill.png`), Monty on the Run's the same (`<out-dir>/motr/`), and the numbers per room on the console.
 */
import fs from 'node:fs';
import path from 'node:path';
import { sectorName, type MontyData } from '../../montyotr/src/montydata';
import { MOTR } from '../../montyotr/src/motr';
import { check, finish } from '../../shared/test/check';
import { COIN_CHAR, PLAY_COL, PLAY_COLS, PLAY_ROW, PLAY_ROWS, ROW, SCREEN } from '../../shared/monty/screen';
import { AND } from '../src/andes';
import { CHI } from '../src/china';
import { WORLD } from '../src/data';
import { JP } from '../src/japan';
import { ROOM } from '../src/moscow';
import { PAC } from '../src/pacific';
import type { RegionName } from '../src/regions';
import { RIO_ROOM } from '../src/rio';
import { SIB } from '../src/siberia';
import { FLY } from '../src/sky';
import { inRoom, roomsOf } from './climb-kit';
import { REGION_ROOMS, SCOPE } from './scope';
import { contactSheet, shot, W } from './shots-kit';

/** The top band's rows (playfield rows 0 to BAND - 1): the horizon, where sky and distant scenery may run across. */
const BAND = 6;
/** A piece used this many times below the band is a tiled pattern's. */
const REPEAT = 6;
/** A fill is made of at most this many pieces (a picture is made of many). */
const FEW = 6;
/** The largest fill a room may have, in cells: over the most in Monty on the Run's rooms and the rooms Chris praised (45: THE GRAVY TRAIN's carriage). */
const MAX_FILL = 60;
/** A fill runs down behind the play: at least this many rows. A strip (a sea under the flight, a band of sky stripes) is not full-screen. */
const MIN_ROWS = 4;
/** The share of the top two rows' pixels in earth colours an outdoor room may have. */
const MAX_EARTH = 0.2;
/** The share of the top two rows' cells that may be solid in an outdoor room (WILLOW PATTERN's lattice across its top: "no reason for the WILLOW PATTERN to have a ceiling"). */
const MAX_ROOFED = 0.75;
/** The columns either side left out of the ceiling's measure: a cliff or a wall at the room's side runs up to the top without being a ceiling. */
const SIDE = 4;
/** Orange and brown: earth and rock (the greys are left out: a stone wall's battlements and storm clouds are grey too). */
const EARTH = new Set([8, 9]);

/** Rooms under a roof or underground: a top of rock or earth is their ceiling. */
const UNDER_A_ROOF: ReadonlySet<number> = new Set<number>([
  ROOM.gum, ROOM.hall, ROOM.platform, SIB.yeti, SIB.mine, CHI.tower, JP.parlour, JP.hall, PAC.cave, RIO_ROOM.steak,
  // under the rainforest's canopy: its leaves along the top are the forest's roof
  AND.canopy, AND.kapok, AND.boat, AND.roots, AND.sandbar, AND.cloud, AND.vine, AND.ends,
]);
/** The flight from Hilo: the sky all round, its weather along the top. */
const IN_THE_AIR: ReadonlySet<number> = new Set<number>(Object.values(FLY));

/** Rooms whose large repeated area is one thing the eye reads (a landmark, houses, the bay), not wallpaper: what it is. Chris praised these as they are. */
const KEPT: Readonly<Record<number, string>> = {
  [JP.fuji]: 'the mountain itself, its snowcap and slopes',
  [RIO_ROOM.colour]: 'the houses and the green hillside between them',
  [RIO_ROOM.bust]: 'the bay under Sugarloaf and the Redeemer',
};

/** The rooms that fail today, by region, and what the fill is (the work list). */
const PENDING: Readonly<Record<RegionName, Readonly<Record<number, string>>>> = {
  moscow: {},
  sky: {},
  siberia: {
    [SIB.taiga]: 'a snow-dotted texture tiled across the hillside behind the pines',
  },
  china: {},
  japan: {},
  pacific: {},
  andes: {},
  rio: {},
};

interface Verdict { fill: number; pieces: number; cells: ReadonlySet<number>; earth: number; roofed: number; rows: number; cols: number; total: number }

/** A room's fill (its largest tiled area below the band) and the earth along its top. */
function judge(room: number, data: MontyData = WORLD): { v: Verdict; px: Uint8Array } | null {
  const s = inRoom(data, room);
  if (!s) return null;
  const g = s.g;
  const at = (c: number, r: number) => (r + PLAY_ROW) * ROW + c + PLAY_COL;
  const blank = (chr: number) => { for (let i = 0; i < 8; i++) if ((g.mem[chr * 8 + i] ?? 0) !== 0) return false; return true; };
  /** A character of one flat colour (every pixel set): no pattern (Monty on the Run's sea, a wall's face). */
  const flat = (chr: number) => { for (let i = 0; i < 8; i++) if ((g.mem[chr * 8 + i] ?? 0) !== 0xff) return false; return true; };
  const surface = data.swimSurfaces.find((w) => w.room === room);
  const sea = data.swimRooms.includes(room) ? (surface ? Math.floor((surface.y + 4 - 0x32) / 8) - PLAY_ROW : 0) : PLAY_ROWS;
  /** The piece a cell shows (character and colour), or -1 where it is no backdrop's: empty, blank, a coin, anything solid, a floor, a climb or a hazard (the koi's pond), the sea he swims in. A room tile of class NONE (a wall seen behind) counts as a decoration does. */
  const piece = (c: number, r: number): number => {
    const chr = g.mem[SCREEN + at(c, r)] ?? 0;
    const f = g.flagAt(PLAY_ROW + r, PLAY_COL + c);
    if (r >= sea || chr === 0 || chr === COIN_CHAR || f !== 0 || blank(chr) || flat(chr)) return -1;
    return chr | ((g.col[at(c, r)] ?? 0) & 15) << 8;
  };
  const count = new Map<number, number>();
  for (let r = BAND; r < PLAY_ROWS; r++) for (let c = 0; c < PLAY_COLS; c++) { const k = piece(c, r); if (k >= 0) count.set(k, (count.get(k) ?? 0) + 1); }
  const tiled = (c: number, r: number) => { const k = piece(c, r); return k >= 0 && (count.get(k) ?? 0) >= REPEAT; };
  const seen = new Set<number>();
  let best: Verdict = { fill: 0, pieces: 0, cells: new Set(), earth: 0, roofed: 0, rows: 0, cols: 0, total: 0 };
  let total = 0;
  for (let r = BAND; r < PLAY_ROWS; r++) for (let c = 0; c < PLAY_COLS; c++) {
    if (seen.has(r * PLAY_COLS + c) || !tiled(c, r)) continue;
    const cells = new Set<number>([r * PLAY_COLS + c]), keys = new Set<number>(), stack = [r * PLAY_COLS + c];
    seen.add(r * PLAY_COLS + c);
    for (let p = stack.pop(); p !== undefined; p = stack.pop()) {
      const x = p % PLAY_COLS, y = Math.floor(p / PLAY_COLS);
      keys.add(piece(x, y));
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
        const n = ny * PLAY_COLS + nx;
        if (nx < 0 || nx >= PLAY_COLS || ny < BAND || ny >= PLAY_ROWS || seen.has(n) || !tiled(nx, ny)) continue;
        seen.add(n); cells.add(n); stack.push(n);
      }
    }
    if (keys.size > FEW) continue;
    const height = new Set([...cells].map((n) => Math.floor(n / PLAY_COLS))).size;
    if (height < MIN_ROWS) continue;
    if (cells.size >= 12) total += cells.size;
    const ys = [...cells].map((n) => Math.floor(n / PLAY_COLS)), xs = [...cells].map((n) => n % PLAY_COLS);
    if (cells.size > best.fill) best = { fill: cells.size, pieces: keys.size, cells, earth: 0, roofed: 0, rows: Math.max(...ys) - Math.min(...ys) + 1, cols: Math.max(...xs) - Math.min(...xs) + 1, total: 0 };
  }
  let roofed = 0;
  for (let r = 0; r < 2; r++) for (let c = SIDE; c < PLAY_COLS - SIDE; c++) { const f = g.flagAt(PLAY_ROW + r, PLAY_COL + c); if (f === 1) roofed++; }
  const px = shot(g);
  let earth = 0;
  for (let y = PLAY_ROW * 8; y < (PLAY_ROW + 2) * 8; y++) for (let x = (PLAY_COL + SIDE) * 8; x < (PLAY_COL + PLAY_COLS - SIDE) * 8; x++) if (EARTH.has((px[y * W + x] ?? 0) & 15)) earth++;
  return { v: { ...best, total, roofed: roofed / (2 * (PLAY_COLS - 2 * SIDE)), earth: earth / (2 * 8 * (PLAY_COLS - 2 * SIDE) * 8) }, px };
}

/** The picture with the fill's cells and (where it counts) the ceiling rows outlined in white. */
function marked(px: Uint8Array, v: Verdict, ceiling: boolean): Uint8Array {
  const out = px.slice();
  const box = (c: number, r: number) => {
    const x0 = (c + PLAY_COL) * 8, y0 = (r + PLAY_ROW) * 8;
    for (let i = 0; i < 8; i++) { out[y0 * W + x0 + i] = 1; out[(y0 + 7) * W + x0 + i] = 1; out[(y0 + i) * W + x0] = 1; out[(y0 + i) * W + x0 + 7] = 1; }
  };
  for (const n of v.cells) box(n % PLAY_COLS, Math.floor(n / PLAY_COLS));
  if (ceiling) for (let c = SIDE; c < PLAY_COLS - SIDE; c++) { box(c, 0); box(c, 1); }
  return out;
}

const out = process.argv[2];
if (out !== undefined) {
  const pics: Uint8Array[] = [], marks: Uint8Array[] = [];
  for (const room of roomsOf(MOTR)) {
    const j = judge(room, MOTR);
    if (!j) continue;
    console.log(`motr ${room} ${sectorName(MOTR, room).text.trim()}: fill ${j.v.fill}/${j.v.pieces} ${j.v.cols}x${j.v.rows} total ${j.v.total} earth ${Math.round(j.v.earth * 100)}%`);
    pics.push(j.px); marks.push(marked(j.px, j.v, false));
  }
  fs.mkdirSync(path.join(out, 'motr'), { recursive: true });
  contactSheet(path.join(out, 'motr'), 'before.png', pics);
  contactSheet(path.join(out, 'motr'), 'fill.png', marks);
}
for (const region of REGION_ROOMS) {
  const pics: Uint8Array[] = [], marks: Uint8Array[] = [];
  const pending = PENDING[region.name];
  for (const spec of [...region.specs].sort((a, b) => a.id - b.id)) {
    const room = spec.id;
    if (!SCOPE.has(room)) continue;
    const j = judge(room);
    if (!j) continue;
    const { v, px } = j;
    const name = sectorName(WORLD, room).text.trim();
    const outdoor = !UNDER_A_ROOF.has(room) && !IN_THE_AIR.has(room);
    const filled = v.fill > MAX_FILL && KEPT[room] === undefined, ceiling = outdoor && (v.earth > MAX_EARTH || v.roofed > MAX_ROOFED);
    const why = [filled ? `fill of ${v.fill} cells in ${v.pieces} pieces` : '', ceiling ? `a ceiling: ${v.earth > MAX_EARTH ? `earth along the top (${Math.round(v.earth * 100)}%)` : `solid along the top (${Math.round(v.roofed * 100)}%)`}` : ''].filter(Boolean).join(', ');
    if (out !== undefined) {
      console.log(`${region.name} ${room} ${name}: fill ${v.fill}/${v.pieces} ${v.cols}x${v.rows} total ${v.total} earth ${Math.round(v.earth * 100)}%${outdoor ? '' : ' (roof)'}${why ? '  FAILS' : ''}`);
      pics.push(px); marks.push(marked(px, v, ceiling));
    }
    const listed = pending[room];
    if (listed !== undefined) check(`${region.name} ${name} (${room}) is pending (${listed}) and still fails: else take it off PENDING`, why !== '', true);
    else check(`${region.name} ${name} (${room}): no full-screen fill below the horizon, no ceiling outdoors${why ? ` (${why})` : ''}`, why === '', true);
  }
  if (out !== undefined && pics.length) {
    const dir = path.join(out, region.name);
    fs.mkdirSync(dir, { recursive: true });
    contactSheet(dir, 'before.png', pics);
    contactSheet(dir, 'fill.png', marks);
  }
}
finish();
