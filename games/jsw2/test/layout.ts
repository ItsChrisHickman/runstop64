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
 *   by an exit, none between two that no exit joins, a dotted connector along every link, lit when both rooms have been in.
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/layout.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { layout, STEP, type Exits } from '../re/layout';
import { LINKS, MANSION, MANSION_SIZE } from '../src/mansion';
import { jsw2Map, roomSpot } from '../src/map';
import { run } from '../src/main';
import { COL } from '../../shared/native/pause';
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
for (const a of rooms) MANSION[a].exits.forEach((b, k) => {
  if (b === a) return;
  exits++;
  if (!MANSION[b]) { lost.push(`${a} ${'LRUD'[k]} ${b}: no such room`); return; }
  if (beside(a, k, b)) { side++; if (isLink(a, k, b)) lost.push(`${a} ${'LRUD'[k]} ${b}: beside its room and a link`); } else if (!isLink(a, k, b)) lost.push(`${a} ${'LRUD'[k]} ${b}: neither beside nor a link`);
});
check(`all ${exits} exits are two rooms side by side the way they lead (${side}) or a link (${LINKS.length})${lost.length ? ': ' + lost.join('; ') : ''}`, lost.length === 0 && side + LINKS.length === exits);
check('every link is an exit of its room', LINKS.every(([a, k, b]) => MANSION[a]?.exits[k] === b && a !== b));
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
  // links: dotted, lit (both rooms in); between rooms that are side by side (the other way round from the exit: two rooms joined
  // on both sides, one way round beside it) the line of the exit that is there
  let dotted = 0;
  const bad: string[] = [];
  const line = (a: number, b: number) => { const pts = along(a, b); return pts.length > 0 && pts.every(([x, y]) => pixel(x, y) === COL.yellow); };
  for (const [a, , b] of LINKS) {
    const pts = along(a, b), lit = pts.filter(([x, y]) => pixel(x, y) === COL.lblue).length;
    const next = Math.abs(MANSION[a].x - MANSION[b].x) + Math.abs(MANSION[a].y - MANSION[b].y) === 1;
    if ((pts.length > 0 && lit * 3 >= pts.length) || (next && line(a, b))) dotted++; else bad.push(`${a}-${b} (${lit} of ${pts.length})`);
  }
  check(`every link is drawn as a lit connector when both rooms have been in (${dotted} of ${LINKS.length}${bad.length ? ': ' + bad.join(', ') : ''})`, dotted === LINKS.length);
  // exits side by side: a line between the marks
  const gap = (a: number, b: number) => { const pts = along(a, b); return pts.length ? pts.every(([x, y]) => pixel(x, y) === COL.yellow) : false; };
  const joined = rooms.flatMap((a) => MANSION[a].exits.flatMap((b, k) => (b !== a && beside(a, k, b) ? [[a, b] as const] : [])));
  check(`every exit between rooms side by side is drawn as a line (${joined.filter(([a, b]) => gap(a, b)).length} of ${joined.length})`, joined.every(([a, b]) => gap(a, b)));
  // rooms side by side that no exit joins: no line
  const pairs = new Set(joined.map(([a, b]) => `${Math.min(a, b)},${Math.max(a, b)}`));
  const unjoined: [number, number][] = [];
  for (const a of rooms) for (const b of rooms) if (a < b && Math.abs(MANSION[a].x - MANSION[b].x) + Math.abs(MANSION[a].y - MANSION[b].y) === 1 && !pairs.has(`${a},${b}`)) unjoined.push([a, b]);
  check(`rooms side by side that no exit joins have no line between them (${unjoined.length} such pairs)`, unjoined.every(([a, b]) => along(a, b).every(([x, y]) => pixel(x, y) === COL.black)));
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
