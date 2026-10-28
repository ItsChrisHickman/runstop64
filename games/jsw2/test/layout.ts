/**
 * Jet Set Willy II's pause map (Chris: "sometimes there are no connections between things and sometimes if I go down one
 * floor I appear two levels down on the map"). The mansion is not a consistent grid, so the map is laid out by constraints
 * (re/layout.ts) and what cannot be drawn side by side is drawn as a connector. Checked:
 *
 * - the layout on small mansions: a consistent grid is all side by side; a room whose left and right lead to the same
 *   room cannot be both, and that exit is a link; rooms never share a place, even where the exits ask for it;
 * - src/mansion.ts, the generated map: every room has a place, no two rooms share one, and every exit of every room is
 *   either two rooms side by side the way it leads or one of LINKS (and every link is such an exit, not beside its room);
 *   the examples from the report (the megatree: 4 up leads to 9, which is above it) are right;
 * - the drawing (the pause screen through the front end, as the browser runs it): a line between two rooms side by side
 *   by an exit, none between two that no exit joins; every link a short stub on its room's edge the way the exit leads (lit when
 *   both rooms have been in), and its dotted line from room to room only while the map's pick is on one of its two rooms (the
 *   other room lit); a room no play can enter (UNENTERABLE) not drawn until it has been in.
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/layout.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { cost, layout, STEP, type Exits } from '../re/layout';
import { exactMinimum, improve, lowerBound } from '../re/search';
import { LINKS, MANSION, MANSION_SIZE, UNENTERABLE } from '../src/mansion';
import { jsw2Map, markSize, roomSpot } from '../src/map';
import { run } from '../src/main';
import { COL, MAP_BOX } from '../../shared/native/pause';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';

// ---- the layout itself ----
const mansion = (rows: [number, Exits][]) => new Map<number, Exits>(rows);
const noOverlap = (at: Map<number, readonly [number, number]>) => new Set([...at.values()].map(([x, y]) => `${x},${y}`)).size === at.size;
{
  // a 3 x 2 grid: 1 2 3 over 4 5 6
  const grid = mansion([[1, [1, 2, 1, 4]], [2, [1, 3, 2, 5]], [3, [2, 3, 3, 6]], [4, [4, 5, 1, 4]], [5, [4, 6, 2, 5]], [6, [5, 6, 3, 6]]]);
  const l = layout(grid);
  check(`a consistent grid: all side by side, no links (${l.links.length}), ${l.size.w} x ${l.size.h}`, l.links.length === 0 && l.size.w === 3 && l.size.h === 2 && noOverlap(l.at));
  // two rooms each the other's left and right: one of the exits cannot be drawn
  const ring = mansion([[1, [2, 2, 1, 1]], [2, [1, 1, 2, 2]]]);
  const r = layout(ring);
  check(`two rooms joined on both sides: one side by side, the other a link (${r.links.length})`, r.links.length === 2 && noOverlap(r.at));
  // 1's right is 2, 3's right is 2 too: two rooms cannot both be left of 2
  const clash = mansion([[1, [1, 2, 1, 1]], [2, [1, 2, 2, 2]], [3, [3, 2, 3, 3]]]);
  const c = layout(clash);
  check(`the loops that cannot be drawn give a lower bound: the ring costs at least 6 (${lowerBound(ring, () => 1).bound}), exactly ${exactMinimum(ring, () => 1).cost}`, lowerBound(ring, () => 1).bound === 6 && exactMinimum(ring, () => 1).cost === 6 && lowerBound(grid, () => 1).bound === 0);
  const better = improve(ring, r.at, () => 1, { seed: 1, steps: 2000, maxW: 4, maxH: 4, held: () => false });
  check(`annealing never makes a layout dearer (the ring: ${better.cost} for ${cost(ring, r.links)}), and keeps rooms apart`, better.cost <= cost(ring, r.links) && noOverlap(better.at) && better.at.size === 2);
  check(`two rooms both asking to be left of a third: they do not share a place (${c.links.length} link)`, noOverlap(c.at) && c.links.length >= 1 && c.at.size === 3);
}

// ---- the generated map ----
const rooms = Object.keys(MANSION).map(Number);
const cells = new Set(rooms.map((n) => `${MANSION[n].x},${MANSION[n].y}`));
check(`${rooms.length} rooms, each on a place of its own (no two overlap)`, cells.size === rooms.length);
check(`every room is inside the map's ${MANSION_SIZE.w} x ${MANSION_SIZE.h}`, rooms.every((n) => MANSION[n].x >= 0 && MANSION[n].y >= 0 && MANSION[n].x < MANSION_SIZE.w && MANSION[n].y < MANSION_SIZE.h));
const beside = (a: number, k: number, b: number) => MANSION[b].x === MANSION[a].x + STEP[k][0] && MANSION[b].y === MANSION[a].y + STEP[k][1];
const isLink = (a: number, k: number, b: number) => LINKS.some(([x, y, z]) => x === a && y === k && z === b);
let exits = 0, side = 0;
const lost: string[] = [];
// (an exit to or from a room no play can enter is not drawn: it is neither beside nor a link)
const counted = (a: number, b: number) => !UNENTERABLE.includes(a) && !UNENTERABLE.includes(b);
for (const a of rooms) MANSION[a].exits.forEach((b, k) => {
  if (b === a || !counted(a, b)) return;
  exits++;
  if (!MANSION[b]) { lost.push(`${a} ${'LRUD'[k]} ${b}: no such room`); return; }
  if (beside(a, k, b)) { side++; if (isLink(a, k, b)) lost.push(`${a} ${'LRUD'[k]} ${b}: beside its room and a link`); } else if (!isLink(a, k, b)) lost.push(`${a} ${'LRUD'[k]} ${b}: neither beside nor a link`);
});
check(`all ${exits} exits are two rooms side by side the way they lead (${side}) or a link (${LINKS.length})${lost.length ? ': ' + lost.join('; ') : ''}`, lost.length === 0 && side + LINKS.length === exits);
check('every link is an exit of its room', LINKS.every(([a, k, b]) => MANSION[a]?.exits[k] === b && a !== b && counted(a, b)));
const first = new Set([32, ...MANSION[32].exits]);
const quiet = (n: number, to: number) => (UNENTERABLE.includes(to) ? n : to);
const exitsOf = new Map<number, Exits>(rooms.filter((n) => !UNENTERABLE.includes(n)).map((n): [number, Exits] => { const [l, r, u, d] = MANSION[n].exits; return [n, [quiet(n, l), quiet(n, r), quiet(n, u), quiet(n, d)]]; }));
const startWeight = (a: number, b: number) => (first.has(a) && first.has(b) ? 6 : 1);
const bound = lowerBound(exitsOf, startWeight, 20).bound;
check(`links cost no less than the loops allow (${cost(exitsOf, LINKS, startWeight)} against a bound of ${bound})`, cost(exitsOf, LINKS, startWeight) >= bound);
check(`links are rare (${LINKS.length} of ${exits} exits)`, LINKS.length <= exits / 20);
check('the megatree: 4 up leads to 9, which is drawn right above it (it was eight rows off), and 9 down leads back', MANSION[4].exits[2] === 9 && beside(4, 2, 9) && MANSION[9].exits[3] === 4 && beside(9, 3, 4));
check('the start: the bathroom (32) down is the drain (138), side by side', beside(32, 3, 138) && beside(138, 2, 32));

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
  // links: a stub on the room's edge the way the exit leads, lit (both rooms in); no line from room to room while nothing is picked
  const size = markSize(), stubAt = (a: number, k: number): [number, number][] => {
    const { x, y } = roomSpot(a), x0 = x - (size >> 1), y0 = y - (size >> 1);
    return [0, 1, 2].map((i): [number, number] => (k === 0 ? [x0 - 1 - i, y] : k === 1 ? [x0 + size + i, y] : k === 2 ? [x, y0 - 1 - i] : [x, y0 + size + i]));
  };
  const stubs = LINKS.filter(([a, k]) => stubAt(a, k).slice(0, 2).every(([x, y]) => pixel(x, y) === COL.lblue));
  check(`every link is a short stub on its room's edge, lit when both rooms have been in (${stubs.length} of ${LINKS.length})`, stubs.length === LINKS.length);
  // (the pick is on the room he is in, the bathroom, which is where the link of 31 ends: that line is drawn)
  const ram = p.machine?.ram;
  if (!ram) throw new Error('no machine');
  const segment = (a: number, b: number) => {
    const s = roomSpot(a), t = roomSpot(b), n = Math.max(Math.abs(t.x - s.x), Math.abs(t.y - s.y));
    return Array.from({ length: n + 1 }, (_, i): string => `${Math.round(s.x + ((t.x - s.x) * i) / n)},${Math.round(s.y + ((t.y - s.y) * i) / n)}`);
  };
  const onStub = new Set(LINKS.flatMap(([a, k]) => stubAt(a, k).map(([x, y]) => `${x},${y}`)));
  const lit = LINKS.filter(([a, , b]) => a === ram[0x13] || b === ram[0x13]);
  // what may be blue besides: the picked room's links' lines, and the room at the other end of each, lit
  const pickedLines = new Set([...onStub, ...lit.flatMap(([a, , b]) => segment(a, b).concat([a, b].flatMap((r) => { const { x, y } = roomSpot(r); return [-2, -1, 0, 1, 2].flatMap((i) => [-2, -1, 0, 1, 2].map((j) => `${x + i},${y + j}`)); })))]);
  const blueIn = (shot: ArrayLike<number>) => {
    const out: string[] = [];
    for (let y = MAP_BOX.y; y < MAP_BOX.y + MAP_BOX.h; y++) for (let x = MAP_BOX.x; x < MAP_BOX.x + MAP_BOX.w; x++) if ((shot[y * 320 + x] === COL.lblue || shot[y * 320 + x] === COL.blue) && !onStub.has(`${x},${y}`) && !pickedLines.has(`${x},${y}`)) out.push(`${x},${y}`);
    return out;
  };
  const still = blueIn(renderer.screen.pixels);
  check(`nothing picked: no blue anywhere on the map but the stubs (${still.length} other pixels ${still.slice(0, 6).join(' ')})`, still.length === 0);
  // the map's pick on a room with a link, or on a link's destination: that link's dotted line, the other room lit, no other line
  const drawPicked = (pick: number | null) => {
    renderer.screen.fillRect(MAP_BOX.x, MAP_BOX.y, MAP_BOX.w, MAP_BOX.h, COL.black);
    jsw2Map.draw(renderer.screen, MAP_BOX, ram, p.state.found, false, undefined, undefined, pick === null ? null : String(pick));
    return Uint8Array.from(renderer.screen.pixels);
  };
  const base = drawPicked(null);
  const wrong: string[] = [];
  let drawn = 0;
  for (const n of rooms) {
    const touching = LINKS.filter(([a, , b]) => a === n || b === n);
    const shot = drawPicked(n);
    const changed: string[] = [];
    for (let y = MAP_BOX.y; y < MAP_BOX.y + MAP_BOX.h; y++) for (let x = MAP_BOX.x; x < MAP_BOX.x + MAP_BOX.w; x++) if (shot[y * 320 + x] !== base[y * 320 + x]) changed.push(`${x},${y}`);
    // only the pixels of this room's links' lines (and the room at the other end of each, lit) may differ
    const allowed = new Set(touching.flatMap(([a, , b]) => segment(a, b).concat([a, b].flatMap((r) => { const { x, y } = roomSpot(r); return [-2, -1, 0, 1, 2].flatMap((i) => [-2, -1, 0, 1, 2].map((j) => `${x + i},${y + j}`)); }))));
    const stray = changed.filter((c) => !allowed.has(c));
    if (stray.length) wrong.push(`picked ${n}: ${stray.length} stray pixels`);
    for (const [a, , b] of touching) {
      const other = a === n ? b : a, { x, y } = roomSpot(other);
      drawn++;
      if (shot[y * 320 + x] !== COL.lblue || !segment(a, b).some((c) => changed.includes(c) && c !== `${x},${y}`)) wrong.push(`picked ${n}: link ${a}-${b} not drawn or ${other} not lit`);
    }
    if (!touching.length && changed.length) wrong.push(`picked ${n} (no link): ${changed.length} pixels changed`);
  }
  check(`picking a room with a link, or a link's destination, draws that link's dotted line and lights the other room, and nothing else (${drawn} of ${LINKS.length * 2} picks${wrong.length ? ': ' + wrong.slice(0, 4).join('; ') : ''})`, wrong.length === 0 && drawn === LINKS.length * 2);
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
  for (const a of rooms) for (const b of rooms) if (a < b && Math.abs(MANSION[a].x - MANSION[b].x) + Math.abs(MANSION[a].y - MANSION[b].y) === 1 && !pairs.has(`${a},${b}`)) unjoined.push([a, b]);
  check(`rooms side by side that no exit joins have no line between them (${unjoined.length} such pairs; lines: ${unjoined.filter(([a, b]) => !along(a, b).every(([x, y]) => pixel(x, y) === COL.black || pickedLines.has(`${x},${y}`))).map(([a, b]) => a + '-' + b + ':' + along(a, b).map(([x, y]) => pixel(x, y)).join('/')).slice(0, 4).join(' ')})`, unjoined.every(([a, b]) => along(a, b).every(([x, y]) => pixel(x, y) === COL.black || pickedLines.has(`${x},${y}`))));
  // dark until the rooms have been in
  seen([32]);
  tick(2);
  const [la, , lb] = LINKS[0];
  check(`a connector is dark while its rooms have not been in (${LINKS[0].join(' ')}): none lit`, along(la, lb).every(([x, y]) => pixel(x, y) !== COL.lblue));
}

// the heading: the room he's in, and while picking a room to go to, the picked room's name
{
  const ram = new Uint8Array(0x10000);
  const picked = Object.entries(MANSION).find(([, r]) => r.name)?.[0] ?? '';
  const name = MANSION[Number(picked)]?.name ?? '';
  check(`picking a room: the heading names it ("${jsw2Map.title(ram, undefined, picked)}", want "${name.slice(0, 26)}")`, picked !== '' && jsw2Map.title(ram, undefined, picked) === name.slice(0, 26));
}

finish();
