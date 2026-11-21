/**
 * Jet Set Willy II's pause map (Chris: "why on earth does the map jump to a different area on Macaroni Ted? Your mapping is
 * extremely confused!"). The mansion is not a consistent grid, so the rooms are laid out by hand (src/cells.ts) so that the ways
 * Willy walks are neighbours in the direction he walks, and the few exits that cannot be (JOINS) are marked at both ends, always,
 * in one colour for the pair. Checked:
 *
 * - src/cells.ts: every room has a cell, no two rooms share one, and every exit of every room leads to the room beside it the
 *   way it goes or is one of JOINS (the count is reported; a ceiling keeps it from growing); every join's two ends are on edges
 *   of rooms no other pair uses, and the ends are the exit's own edge and the edge it comes out at;
 * - the walks: Macaroni Ted, Dumb Jetman and the Bathroom are in a row the way Willy walks them; walking out of a room by an exit
 *   that is not a join puts you on the room beside it, and a way back by the opposite exit leads to where you were from;
 * - the drawing (the pause screen through the front end, as the browser runs it): a line between two rooms side by side by an
 *   exit, none between two that no exit joins; both ends of every join marked in the pair's colour (dark while the room has not
 *   been in) whatever is picked; the pick changes nothing on the map; a room no play can enter (UNENTERABLE) not drawn until it
 *   has been in.
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/layout.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { CELLS, cellOf, ENDS, JOINS, MAP_SIZE, OPPOSITE, PAIRS, PAIR_COLOURS, STEP } from '../src/cells';
import { MANSION, UNENTERABLE } from '../src/mansion';
import { jsw2Map, markSize, roomSpot } from '../src/map';
import { run } from '../src/main';
import { COL, MAP_BOX } from '../../shared/native/pause';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';

// ---- the cells ----
const rooms = Object.keys(MANSION).map(Number);
const cells = new Set(rooms.map((n) => cellOf(n).join(',')));
check(`${rooms.length} rooms, each with a cell of its own (no two overlap)`, cells.size === rooms.length && Object.keys(CELLS).length === rooms.length);
check(`every room is inside the map's ${MAP_SIZE.w} x ${MAP_SIZE.h}`, rooms.every((n) => { const [x, y] = cellOf(n); return x >= 0 && y >= 0 && x < MAP_SIZE.w && y < MAP_SIZE.h; }));
const beside = (a: number, k: number, b: number) => cellOf(b)[0] === cellOf(a)[0] + STEP[k][0] && cellOf(b)[1] === cellOf(a)[1] + STEP[k][1];
const isJoin = (a: number, k: number, b: number) => JOINS.some((j) => j.from === a && j.way === k && j.to === b);
// (an exit to or from a room no play can enter is not drawn: it is neither beside nor a join)
const counted = (a: number, b: number) => !UNENTERABLE.includes(a) && !UNENTERABLE.includes(b);
let exits = 0, side = 0;
const lost: string[] = [];
for (const a of rooms) MANSION[a].exits.forEach((b, k) => {
  if (b === a || !counted(a, b)) return;
  exits++;
  if (!MANSION[b]) { lost.push(`${a} ${'LRUD'[k]} ${b}: no such room`); return; }
  if (beside(a, k, b)) { side++; if (isJoin(a, k, b)) lost.push(`${a} ${'LRUD'[k]} ${b}: beside its room and a join`); } else if (!isJoin(a, k, b)) lost.push(`${a} ${'LRUD'[k]} ${b}: neither beside nor a join`);
});
check(`all ${exits} exits are two rooms side by side the way they lead (${side}) or a join (${JOINS.length})${lost.length ? ': ' + lost.join('; ') : ''}`, lost.length === 0 && side + JOINS.length === exits);
check('every join is an exit of its room, not beside it, and its pair of ends are the edge it leaves by and the edge it comes out at', JOINS.every((j) => MANSION[j.from]?.exits[j.way] === j.to && j.from !== j.to && counted(j.from, j.to) && j.ends[0].room === j.from && j.ends[0].edge === j.way && j.ends[1].room === j.to && j.ends[1].edge === OPPOSITE[j.way]));
console.log(`joins: ${JOINS.length} exits in ${PAIRS} pairs of ends (the map before: 11 exits)`);
check(`joins are few (${JOINS.length} exits of ${exits})`, JOINS.length <= 10 && PAIRS <= PAIR_COLOURS.length);
// two pairs never mark one edge of a room, and the two ends of a pair are two edges
const edgeUse = new Map<string, number>();
for (const e of ENDS) edgeUse.set(`${e.room}.${e.edge}`, (edgeUse.get(`${e.room}.${e.edge}`) ?? 0) + 1);
check(`every end is on an edge of its own (${ENDS.length} ends of ${PAIRS} pairs)`, [...edgeUse.values()].every((n) => n === 1) && ENDS.length === PAIRS * 2);
// the walks: a way out that is not a join comes in beside the room; the way back (the opposite exit) leads to where it came from
const jumps: string[] = [];
for (const a of rooms) MANSION[a].exits.forEach((b, k) => {
  if (b === a || !counted(a, b) || isJoin(a, k, b)) return;
  const back = MANSION[b].exits[OPPOSITE[k]];
  if (back !== a && back !== b && counted(b, back)) jumps.push(`${a} ${'LRUD'[k]} ${b} but back ${back}`);
});
check(`no walk is a jump: every way out by an exit drawn beside its room, and the way back, leads back or nowhere${jumps.length ? ': ' + jumps.join('; ') : ''}`, jumps.length === 0);
check('the start: the bathroom (32), Dumb Jetman (64), Macaroni Ted (63), the top landing (33) in a row, the way Willy walks (and the east wall beside the bathroom)', beside(33, 1, 63) && beside(63, 1, 64) && beside(64, 1, 32) && beside(31, 0, 32) && cellOf(33)[1] === cellOf(32)[1]);
check('the megatree: 4 up leads to 9, which is drawn right above it, and 9 down leads back', MANSION[4].exits[2] === 9 && beside(4, 2, 9) && MANSION[9].exits[3] === 4 && beside(9, 3, 4));
check('the bathroom down is the drain (138): its join', isJoin(32, 3, 138) && isJoin(138, 2, 32));

// ---- the drawing ----
stubFetch(fs.readFileSync('games/jsw2/assets/jsw2-title.state'));
useMemoryStorage(new Map());
const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
await new Promise((r) => setTimeout(r, 50));
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
tick(80); input.keyDown('Space'); tick(3); input.keyUp('Space'); tick(100);
const seen = (ns: number[]) => { p.state.found.rooms.length = 0; p.state.found.rooms.push(...ns); };
const open = () => { if (!p.state.paused) { input.keyDown('KeyP'); tick(3); input.keyUp('KeyP'); tick(3); } };
const pixel = (x: number, y: number) => renderer.screen.pixels[y * 320 + x];
const inRoom = (x: number, y: number) => rooms.some((n) => { const s = roomSpot(n); return Math.abs(x - s.x) <= 2 && Math.abs(y - s.y) <= 2; });
/** The points along the line between two rooms' marks that are not on a mark. */
const along = (a: number, b: number) => {
  const s = roomSpot(a), t = roomSpot(b), n = Math.max(Math.abs(t.x - s.x), Math.abs(t.y - s.y));
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const x = Math.round(s.x + ((t.x - s.x) * i) / n), y = Math.round(s.y + ((t.y - s.y) * i) / n); if (!inRoom(x, y)) pts.push([x, y]); }
  return pts;
};
{
  seen(rooms);
  open();
  tick(2);
  const ram = p.machine?.ram;
  if (!ram) throw new Error('no machine');
  // the joins: both ends of every pair marked in its colour (on the edge of its room's mark), lit once the room has been in
  const size = markSize();
  /** The middle of a room's mark's edge, one pixel in (where the marker is). */
  const endAt = (room: number, edge: number): [number, number] => {
    const { x, y } = roomSpot(room), x0 = x - (size >> 1), y0 = y - (size >> 1);
    return edge === 0 ? [x0, y] : edge === 1 ? [x0 + size - 1, y] : edge === 2 ? [x, y0] : [x, y0 + size - 1];
  };
  const marked = ENDS.filter((e) => { const [x, y] = endAt(e.room, e.edge); return pixel(x, y) === PAIR_COLOURS[e.pair % PAIR_COLOURS.length]; });
  check(`both ends of every join are marked on their room's edge in the pair's colour (${marked.length} of ${ENDS.length}, ${PAIRS} pairs)`, marked.length === ENDS.length);
  const distinct = new Set(PAIR_COLOURS.slice(0, PAIRS));
  check('every pair has a colour of its own, none a room colour', distinct.size === PAIRS && PAIR_COLOURS.slice(0, PAIRS).every((c) => c !== COL.yellow && c !== COL.brown && c !== COL.white && c !== COL.cyan && c !== COL.dgrey));
  // the pick changes nothing on the map (the markers are there all the time, no line leaps from room to room)
  const drawn = (pick: number | null = null) => {
    renderer.screen.fillRect(MAP_BOX.x, MAP_BOX.y, MAP_BOX.w, MAP_BOX.h, COL.black);
    jsw2Map.draw(renderer.screen, MAP_BOX, ram, p.state.found, false, undefined, undefined, pick === null ? null : String(pick));
    return Uint8Array.from(renderer.screen.pixels);
  };
  const base = drawn();
  const moved = rooms.filter((n) => drawn(n).some((v, i) => v !== base[i]));
  check(`picking a room changes nothing on the map: no highlight leaps (${moved.length} of ${rooms.length} picks changed it)`, moved.length === 0);
  // a room no play can enter: not drawn until he has been in it
  seen(rooms.filter((n) => !UNENTERABLE.includes(n)));
  tick(2);
  for (const n of UNENTERABLE) {
    const { x, y } = roomSpot(n);
    check(`room ${n}, which no play can enter, is not drawn though he has been in every other room`, pixel(x, y) === COL.black);
  }
  seen(rooms);
  tick(2);
  // exits side by side: a line between the marks
  const gap = (a: number, b: number) => { const pts = along(a, b); return pts.length ? pts.every(([x, y]) => pixel(x, y) === COL.yellow) : false; };
  const joined = rooms.flatMap((a) => MANSION[a].exits.flatMap((b, k) => (b !== a && counted(a, b) && beside(a, k, b) ? [[a, b] as const] : [])));
  check(`every exit between rooms side by side is drawn as a line (${joined.filter(([a, b]) => gap(a, b)).length} of ${joined.length})`, joined.every(([a, b]) => gap(a, b)));
  // rooms side by side that no exit joins: no line
  const pairs = new Set(joined.map(([a, b]) => `${Math.min(a, b)},${Math.max(a, b)}`));
  const unjoined: [number, number][] = [];
  for (const a of rooms) for (const b of rooms) if (a < b && Math.abs(cellOf(a)[0] - cellOf(b)[0]) + Math.abs(cellOf(a)[1] - cellOf(b)[1]) === 1 && !pairs.has(`${a},${b}`)) unjoined.push([a, b]);
  const lined = unjoined.filter(([a, b]) => !along(a, b).every(([x, y]) => pixel(x, y) === COL.black));
  check(`rooms side by side that no exit joins have no line between them (${unjoined.length} such pairs; lines: ${lined.map(([a, b]) => a + '-' + b).join(' ')})`, lined.length === 0);
  // dark until the rooms have been in: with only the bathroom in, the markers on rooms not in are dark grey
  seen([32]);
  tick(2);
  const dark = ENDS.filter((e) => e.room !== 32 && e.room !== ram[0x13]).every((e) => { const [x, y] = endAt(e.room, e.edge); return pixel(x, y) === COL.dgrey; });
  check('a join end is dark while its room has not been in', dark);
}

// the heading: the room he's in, and while picking a room to go to, the picked room's name
{
  const ram = new Uint8Array(0x10000);
  const picked = Object.entries(MANSION).find(([, r]) => r.name)?.[0] ?? '';
  const name = MANSION[Number(picked)]?.name ?? '';
  check(`picking a room: the heading names it ("${jsw2Map.title(ram, undefined, picked)}", want "${name.slice(0, 26)}")`, picked !== '' && jsw2Map.title(ram, undefined, picked) === name.slice(0, 26));
}

finish();
