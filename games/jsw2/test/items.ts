/**
 * Jet Set Willy II's items on the pause map (src/items.ts, src/map.ts):
 *
 * - where the game keeps what is left in each room: every item room (re/items.json), all its items
 *   collected by the game's own collection (Willy put on each item's cell), checking the live bytes
 *   ($8104/$8105), the BCD count ($8131/$8132) and, after leaving the room, the game's table
 *   ($0A00 + 2 * room, $0B00 for rooms from 128), bit by bit; 178 items in all;
 * - the pause screen through the front end (as the browser runs it): ITEMS n/178 and NEED 160 in the
 *   side panel, a dot in a visited room that still has items which goes when the last is taken, no dot
 *   in a room never visited, and from 160 on GO TO BED and the Masters Bedroom blinking.
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/items.ts [out-dir for the PNGs]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { unpackState, type MachineState } from '../../../packages/c64kit/src/c64/machine';
import { indicesPng } from '../../../tools/probe/render';
import { NativeHost } from '../../shared/native/host';
import { isNumber, isRecord, readJson, isArray } from '../../shared/guards';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';
import { COL } from '../../shared/native/pause';
import { run } from '../src/main';
import { BEDROOM, itemBits, itemsFound, itemsLeft, NEED, TOTAL } from '../src/items';
import { ITEM_COUNTS } from '../src/itemcounts';
import { jsw2Map, roomSpot } from '../src/map';
import { port } from '../src/native';
import { check, finish } from '../../shared/test/check';

const titleBytes = fs.readFileSync('games/jsw2/assets/jsw2-title.state');
stubFetch(titleBytes);

/** re/items.json read back through checks: room -> item cells (row, column). */
function readItems(): Record<number, [number, number][]> {
  const raw: unknown = readJson(fs.readFileSync('games/jsw2/re/items.json', 'utf8'));
  const out: Record<number, [number, number][]> = {};
  if (!isRecord(raw)) throw new Error('items.json');
  for (const [room, v] of Object.entries(raw)) {
    if (!isRecord(v) || !isArray(v.cells)) throw new Error('items.json room');
    out[Number(room)] = v.cells.map((c): [number, number] => {
      if (!isArray(c) || !isNumber(c[0]) || !isNumber(c[1])) throw new Error('items.json cell');
      return [c[0], c[1]];
    });
  }
  return out;
}
const ITEMS = readItems();
const itemRooms = Object.keys(ITEMS).map(Number).filter((n) => ITEMS[n].length > 0);

// ---- the game's own count: the same 178 as the audit ----
check(`${itemRooms.length} item rooms, ${TOTAL} items (src/itemcounts.ts agrees with re/items.json in every room)`,
  itemRooms.length === 80 && TOTAL === 178 && itemRooms.every((n) => ITEM_COUNTS[n] === ITEMS[n].length) && Object.keys(ITEM_COUNTS).length === itemRooms.length);

// ---- every item of every room, collected by the game ----
const IDLE = 0x1f, FIRE = 0x1f & ~16;
const frame = (g: NativeHost, joy: number) => { g.m.joy1 = IDLE; g.m.joy2 = joy; g.tick(); g.m.ram[0x8096] = 0xff; };
const g0 = new NativeHost(port, unpackState(new Uint8Array(titleBytes)));
const kept: { state: MachineState | null } = { state: null }; // (taken by the wait hook)
g0.onWait = () => { kept.state = g0.save(); };
for (const j of [...Array<number>(80).fill(IDLE), ...Array<number>(3).fill(FIRE), ...Array<number>(200).fill(IDLE)]) frame(g0, j);
const base = must(kept.state, 'a game in play');

/** A game that doesn't lose a life (the death routine, $51C7: some items are beside a guardian). */
function careless(g: NativeHost) { g.onSkip = () => true; return g; }
/** Into room `n` the way travel does (the way down from a copy of the start): its items all there. */
function enter(n: number) {
  const g = careless(NativeHost.resume(port, base));
  g.m.ram[0x816c] = n; g.m.ram[0x8063] = 0xa2;
  for (let f = 0; f < 12 && g.m.ram[0x13] !== n; f++) frame(g, IDLE);
  for (let f = 0; f < 3; f++) frame(g, IDLE);
  return g;
}
/**
 * Willy put on an item's cell for a frame. The game finds the character cell under him a cell up and left
 * of where he is drawn (x - 24 and y - 50 are sprite coordinates): he's put 8 pixels either way off it.
 * Items in the top rows are only taken while he rises (his head: $8292), so those are tried after, and
 * other places near the cell for items a wall or floor is in the way of.
 */
type Try = { dx: number; dy: number; rise: boolean };
const TRIES: Try[] = [
  { dx: -8, dy: -8, rise: false },
  ...[-8, -16, 0, 8, -24, 16].flatMap((dy) => [-8, -16, 0, 8, 16].map((dx): Try => ({ dx, dy, rise: false }))),
  ...[8, 12, 4, 16, 0].flatMap((dy) => [-8, 0, 8].map((dx): Try => ({ dx, dy, rise: true }))),
];
function pin(r: Uint8Array, [row, col]: [number, number], { dx, dy, rise }: Try) {
  const x = col * 8 + 24 + dx, y = row * 8 + 50 + dy;
  r[0x8062] = r[0x82c0] = r[0x82d9] = x & 255; r[0x82da] = r[0x82c8] = x >> 8;
  r[0x8072] = (r[0x8072] & 0xfe) | (x >> 8); r[0x8063] = y; r[0x82e4] = 0; r[0x82d7] = 0;
  r[0x8292] = rise ? 1 : 0;
}
/**
 * Willy held on the item's cell until the game takes it (its count goes up) or he's out of the room.
 * True if it was taken.
 */
function take(g: NativeHost, n: number, cell: [number, number], t: Try): boolean {
  const r = g.m.ram, was = itemsFound(r);
  for (let f = 0; f < 25 && itemsFound(r) === was && r[0x13] === n; f++) { pin(r, cell, t); frame(g, IDLE); }
  return itemsFound(r) > was && r[0x13] === n;
}
/** An item taken: which, and the way Willy was put on it. */
type Way = { item: number; t: Try };
/**
 * The next item of a room taken, from the room as it starts (a try that leaves the room or misses is
 * undone by starting again, the items before it taken the way that worked): the first item left that
 * can be taken alone (two a cell apart can be one before the other), the game and the way, or null.
 */
function takeNext(n: number, cells: [number, number][], ways: Way[]): { g: NativeHost; way: Way } | null {
  for (let item = 0; item < cells.length; item++) {
    if (ways.some((w) => w.item === item)) continue;
    for (const t of TRIES) {
      const g = enter(n);
      if (!ways.every((w) => take(g, n, cells[w.item], w.t))) continue;
      const before = itemBits(g.m.ram, n);
      if (take(g, n, cells[item], t) && (before & ~itemBits(g.m.ram, n)) === 1 << item) return { g, way: { item, t } };
    }
  }
  return null;
}
let taken = 0;
const bad: string[] = [];
for (const n of itemRooms) {
  const cells = ITEMS[n], ways: Way[] = [];
  let g = enter(n), r = g.m.ram;
  if (r[0x13] !== n) { bad.push(`room ${n} not entered`); continue; }
  if (itemsLeft(r, n) !== cells.length || itemsFound(r) !== 0) bad.push(`room ${n} starts with ${itemsLeft(r, n)} of ${cells.length}`);
  for (let i = 0; i < cells.length; i++) {
    const before = itemBits(r, n), next = takeNext(n, cells, ways);
    if (!next) { bad.push(`room ${n}: ${cells.length - i} items left, none can be taken`); break; }
    ways.push(next.way); g = next.g; r = g.m.ram;
    // (bit i for item i: only that one cleared; and the room's count of what's left goes down by one)
    if ((before & ~itemBits(r, n)) !== 1 << next.way.item) bad.push(`room ${n} item ${next.way.item}: bits cleared ${(before & ~itemBits(r, n)).toString(16)}`);
    if (itemsLeft(r, n) !== cells.length - 1 - i) bad.push(`room ${n} item ${next.way.item}: ${itemsLeft(r, n)} left`);
  }
  if (itemsFound(r) !== cells.length) bad.push(`room ${n}: count ${itemsFound(r)} of ${cells.length}`);
  taken += itemsFound(r);
  // out of the room (the Bridge has none): the game puts the bits in its table
  const live = itemBits(r, n);
  r[0x816c] = 2; r[0x8063] = 0xa2; r[0x8292] = 0; r[0x8293] = 0; r[0x82e4] = 0; r[0x82d7] = 0;
  for (let f = 0; f < 60 && r[0x13] !== 2; f++) { r[0x8063] = 0xa2; frame(g, IDLE); }
  const slot = n < 128 ? [0x0a01 + 2 * n, 0x0a00 + 2 * n] : [0x0b00 + 2 * (n - 128), 0x0b01 + 2 * (n - 128)];
  if (r[0x13] !== 2 || itemBits(r, n) !== live || (r[slot[0]] | (r[slot[1]] << 8)) !== live || itemsLeft(r, n) !== 0) bad.push(`room ${n}: table ${itemBits(r, n).toString(16)} vs ${live.toString(16)} (room now ${r[0x13]})`);
}
console.log(bad.join('\n'));
check(`every item of every room taken by the game, bit i for item i, the table kept on leaving (${taken} items, ${bad.length} problems)`, bad.length === 0 && taken === TOTAL);

// ---- the pause screen, through the front end ----
const store = useMemoryStorage();
const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
await new Promise((r) => setTimeout(r, 50));
const ram = () => must(p.machine, 'the machine').ram;
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(3); input.keyUp(code); tick(3); };
const room = () => ram()[0x13];
const outDir = process.argv[2];
function shot(name: string) {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  indicesPng(path.join(outDir, `${name}.png`), renderer.screen.pixels, 320, 200);
  console.log(`wrote ${path.join(outDir, `${name}.png`)}`);
}
/** The pause screen open, or closed (P toggles). */
const setPause = (on: boolean) => { for (let i = 0; i < 3 && p.state.paused !== on; i++) tap('KeyP'); tick(2); };
/** Into a room by the way down (as above), in play. */
function goTo(n: number) {
  ram()[0x816c] = n; ram()[0x8292] = 0; ram()[0x8293] = 0;
  for (let i = 0; i < 60 && room() !== n; i++) { ram()[0x8063] = 0xa2; tick(); }
  tick(20);
}
/** The picture's colours in the mark's middle 2x2 and a pixel in its corner (the square's own colour). */
const dot = (n: number) => { const s = roomSpot(n), px = renderer.screen.pixels; return px[(s.y - 1) * 320 + s.x - 1] === COL.cyan && px[s.y * 320 + s.x] === COL.cyan; };
/** The panel's lines, read back from the screen is overkill: the map's own text, as the pause screen draws it. */
const panel = () => jsw2Map.info(ram(), p.state.found);

tick(80); tap('Space'); tick(230);
check('a new game, in play', p.state.playing && room() === 32);
check(`new game: ${panel().join(' | ')}`, itemsFound(ram()) === 0 && panel()[1] === 'ITEMS     0' && panel()[2] === '   OF 178' && panel()[3] === 'NEED    160');

// room 3 (Under the Mega Tree) has one item, at row 0 column 23; room 4 has three
goTo(3);
setPause(true);
check('room 3, visited, item still there: its dot is on the map', dot(3));
shot('items-before');
setPause(false);
const r3 = ITEMS[3][0];
// (the item is in the top row: taken as he rises, the way the audit above found)
let got = false;
for (let f = 0; f < 60 && !got; f++) { pin(ram(), r3, { dx: -8, dy: 8, rise: true }); tick(); got = itemsFound(ram()) === 1; }
check(`Willy took it in play (count ${itemsFound(ram())})`, got);
setPause(true);
check(`pause: ${panel().join(' | ')}`, panel()[1] === 'ITEMS     1' && panel()[2] === '   OF 178' && itemsLeft(ram(), 3) === 0);
check('room 3, last item taken: its dot is gone', !dot(3));

// out of the room, one with three items visited, none taken: its dot; a room never visited: none
setPause(false);
goTo(2);
goTo(4);
goTo(2);
setPause(true);
const unseen = itemRooms.find((n) => !Array.isArray(p.state.found.rooms) || !p.state.found.rooms.includes(n));
check(`room 4, left with three items: dot (${dot(4)}); room 3, none left: none (${!dot(3)}) (from the game's table)`, dot(4) && !dot(3));
check(`room ${unseen}, never visited, has items: no dot`, unseen !== undefined && !dot(unseen));
shot('items-visited');
setPause(false);

// 160 items: GO TO BED, and the Masters Bedroom (never visited) blinks
ram()[0x8131] = 0x01; ram()[0x8132] = 0x60;
setPause(true);
check(`160 items: ${panel().join(' | ')}`, itemsFound(ram()) === NEED && panel()[3] === 'GO TO BED');
const seen = new Set<number>(), spot = roomSpot(BEDROOM);
for (let i = 0; i < 60; i++) { tick(); seen.add(renderer.screen.pixels[spot.y * 320 + spot.x]); }
check(`the Masters Bedroom blinks (colours drawn: ${[...seen].join(', ')})`, seen.has(COL.white) && seen.size === 2);
shot('items-160');
ram()[0x8131] = 0x01; ram()[0x8132] = 0x59;
tick(2);
const quiet = new Set<number>();
for (let i = 0; i < 60; i++) { tick(); quiet.add(renderer.screen.pixels[spot.y * 320 + spot.x]); }
check(`159 items: NEED 160 and the Masters Bedroom does not blink (${[...quiet].join(', ')})`, panel()[3] === 'NEED    160' && quiet.size === 1);
void store;

finish();
