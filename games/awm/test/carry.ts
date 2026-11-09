/**
 * Auf Wiedersehen Monty's ENHANCED carry anything, headless (c64kit stood in by games/shared/test/kit.ts). ORIGINAL: four hands, a
 * fifth thing is refused (the ticket and the Mona Lisa's three-and-one). ENHANCED: a pickup is never refused; plane tickets are a
 * count on the panel (the game's lettering, in the row right of the money) and a flight spends one; the four boxes show the
 * four things picked up last; a room that wants a thing finds it beyond the boxes (a delivery, and Travel's); the saves keep it
 * (format 4) and the old ones (format 3) read; the pause screen's CARRYING page lists everything and turns with < > or a tap.
 * With an out-dir: the panel with tickets and the page.
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/carry.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { indicesPng, renderPixels } from '../../../tools/probe/render';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { readJson } from '../../shared/guards';
import { MAP_BOX } from '../../shared/native/pause';
import { TRANSPARENT } from '../../../packages/c64kit/src/surface';
import { TABLES } from '../src/data';
import { isPlane } from '../src/enemies';
import { Game } from '../src/game';
import { TICKET, type Items } from '../src/items';
import { run } from '../src/main';
import { awmMap } from '../src/map';
import { drawTickets } from '../src/panel';
import { COLS } from '../src/room';
import { CODEC, parseSave, restore, snapshot } from '../src/save';
import { State } from '../src/tiles';

useMemoryStorage();
const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
const program = p.program;
const game = (): Game => must(program.game, 'no game');
const picture = () => must(program.picture, 'no picture');

const outDir = process.argv[2];
function shot(name: string) {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  const px = renderPixels(program);
  const over = renderer.screen.pixels;
  for (let i = 0; i < px.length; i++) if (over[i] !== TRANSPARENT) px[i] = over[i];
  indicesPng(path.join(outDir, `${name}.png`), px, 320, 200);
}

/** The first list entry holding an item of this type (a room, a cell). */
const entryOf = (type: number): number => {
  const i = TABLES.items.findIndex((e) => e.type === type);
  if (i < 0) throw new Error(`no item of type ${type}`);
  return i;
};

/** Monty touching list entry `i` in its room, as the game's own pick-up does it. */
function touch(g: Game, i: number): void {
  const e = must(TABLES.items[i], 'no entry');
  if (g.world.room !== e.room) g.placeAt({ room: e.room, x: 0x40, y: 0x40, state: State.Free, step: 0 });
  g.monty.x = ((e.cell % COLS) * 8 - 2) & 0xff;
  g.monty.y = (Math.floor(e.cell / COLS) * 8 - 1) & 0xff;
  g.items.pickup(g);
}

const held = (items: Items) => items.list().flatMap((c) => (c.type === TICKET ? [] : [c.type]));
/** Types of the carried things as the game's panel has them, boxes first. */
const boxes = (items: Items) => items.carried.filter((t) => t !== 0xff);

const GIFTS = [3, 4, 5, 7] as const; // four things to carry that are no ticket
const TICKETS = TABLES.items.flatMap((e, i) => (e.type === TICKET ? [i] : []));

// ---- the rules, on games of their own ---------------------------------------------------------------------------
{
  // ORIGINAL: the boxes are four; three tickets and a thing fill them, and the Mona Lisa's turn comes up refused
  const g = new Game(0);
  for (const t of GIFTS) touch(g, entryOf(t));
  check(`ORIGINAL: four hands are filled (${g.items.carried})`, boxes(g.items).length === 4);
  const fifth = must(TICKETS[0], 'a ticket entry');
  touch(g, fifth);
  check('ORIGINAL: a fifth thing is refused: the hands are as they were, it stays where it lies', g.items.carried.join() === GIFTS.join() && !g.items.collected[fifth] && g.items.tickets === 0 && g.items.pack.length === 0);
  check('ORIGINAL: a ticket takes a hand (one empty, a ticket goes in it)', (() => {
    const h = new Game(0);
    touch(h, must(TICKETS[0], 'a ticket'));
    return h.items.carried[0] === TICKET && h.items.tickets === 0;
  })());
}
{
  // ENHANCED: never refused; a ticket is a count and takes no hand
  const g = new Game(0);
  g.unlimitedCarry = () => true;
  for (const t of GIFTS) touch(g, entryOf(t));
  const [t1, t2, t3] = TICKETS;
  for (const t of [t1, t2, t3]) touch(g, must(t, 'a ticket'));
  check(`ENHANCED: three tickets after four things: counted (${g.items.tickets}), the hands as they were (${g.items.carried})`, g.items.tickets === 3 && g.items.carried.join() === GIFTS.join());
  check('ENHANCED: and they are gone from where they lay', [t1, t2, t3].every((t) => g.items.collected[must(t, 'a ticket')]));
  touch(g, entryOf(0x0b));
  check(`ENHANCED: a fifth thing is taken (${held(g.items)})`, g.items.collected[entryOf(0x0b)] && held(g.items).length === 5);
  check(`the boxes show the four last picked up (${g.items.carried}), the first waits in the pack (${g.items.pack.map((h) => h.type)})`,
    g.items.carried.join() === '11,4,5,7' && g.items.pack.length === 1 && g.items.pack[0]?.type === 3);
  touch(g, entryOf(0x0c));
  check(`and a sixth: the next oldest goes to the pack (${g.items.carried} / ${g.items.pack.map((h) => h.type)})`, g.items.carried.join() === '11,12,5,7' && g.items.pack.length === 2);
  check('the list has everything, latest first, the tickets counted last', JSON.stringify(g.items.list().map((c) => [c.type, c.count])) === JSON.stringify([[12, 1], [11, 1], [7, 1], [5, 1], [4, 1], [3, 1], [0, 3]]));

  // handing a thing over from a box brings the latest of the pack into the empty box
  const events: string[] = [];
  g.items.onBox = (e) => events.push(`${e.hand}:${e.type}`);
  check('a thing in a box is handed over', g.items.take(5));
  check(`the box is filled from the pack, the latest first (${g.items.carried}; ${events})`, g.items.carried.join() === '11,12,4,7' && events.join() === '2:4' && g.items.pack.length === 1);
  check('a thing in the pack is handed over (and no box changes)', g.items.take(3) && g.items.pack.length === 0 && g.items.carried.join() === '11,12,4,7');
  check('a thing he does not have is not', !g.items.take(3));
  check('a ticket is spent from the count', g.items.take(TICKET) && g.items.tickets === 2);
}
{
  // a room that wants a thing finds it beyond the boxes: the delivery of room $16 wants type 11
  const room16 = (unlimited: boolean, wantedFirst: boolean) => {
    const g = new Game(0x10);
    g.unlimitedCarry = () => unlimited;
    if (wantedFirst) g.items.give(0x0b);
    for (const t of GIFTS) g.items.give(t);
    if (!wantedFirst) g.items.give(0x0b);
    g.enterRoom(0x16);
    return g;
  };
  // (what he picked up first is the one in the pack, beyond the four boxes)
  const e = room16(true, true);
  check(`ENHANCED: the delivery wanted by room $16 is handed over from the pack (progress ${e.progress}, ${held(e.items)} left)`, e.progress === 1 && !held(e.items).includes(0x0b) && e.items.pack.length === 0 && [...boxes(e.items)].sort().join() === '3,4,5,7');
  // (the same thing picked up last is in a box and is handed over too)
  const l = room16(true, false);
  check('ENHANCED: and from a box when it was picked up last', l.progress === 1 && !held(l.items).includes(0x0b) && l.items.pack.length === 0 && [...boxes(l.items)].sort().join() === '3,4,5,7');
  const o = room16(false, false);
  check(`ORIGINAL: the fifth was never carried, so room $16 has nothing to take (progress ${o.progress})`, o.progress === 0 && !held(o.items).includes(0x0b) && boxes(o.items).join() === '3,4,5,7');
  const first = new Game(0x10);
  first.items.give(0x0b);
  first.enterRoom(0x16);
  check('ORIGINAL: a delivery from a hand is as ever', first.progress === 1 && boxes(first.items).length === 0);
}
{
  // a flight spends one ticket of the count
  const g = new Game(0);
  g.unlimitedCarry = () => true;
  touch(g, must(TICKETS[0], 'a ticket'));
  touch(g, must(TICKETS[1], 'a ticket'));
  g.placeAt({ room: 0, x: 0xb8, y: 0x68, state: State.Free, step: 0 });
  check(`two tickets counted, no hand taken (${g.items.tickets}, ${g.items.carried})`, g.items.tickets === 2 && g.items.carried.every((t) => t === 0xff));
  let boarded = false;
  for (let n = 0; n < 400 && !boarded; n++) {
    const slot = [0, 1, 2, 3].find((s) => isPlane(g.enemies.frame(s)));
    if (slot !== undefined) { g.monty.x = g.enemies.x(slot); g.monty.y = g.enemies.y(slot); }
    g.step(0, true);
    boarded = g.boarded !== null;
  }
  check(`the key at a plane boards him and spends one (${g.items.tickets} left)`, boarded && g.items.tickets === 1);
  const h = new Game(0);
  h.unlimitedCarry = () => true;
  h.placeAt({ room: 0, x: 0xb8, y: 0x68, state: State.Free, step: 0 });
  let again = false;
  for (let n = 0; n < 200 && !again; n++) {
    const slot = [0, 1, 2, 3].find((s) => isPlane(h.enemies.frame(s)));
    if (slot !== undefined) { h.monty.x = h.enemies.x(slot); h.monty.y = h.enemies.y(slot); }
    h.step(0, true);
    again = h.boarded !== null;
  }
  check('with no ticket the key does nothing', !again);
}

// ---- the saves ---------------------------------------------------------------------------------------------------
{
  const g = new Game(0);
  g.unlimitedCarry = () => true;
  for (const t of GIFTS) touch(g, entryOf(t));
  touch(g, entryOf(0x0b));
  touch(g, must(TICKETS[0], 'a ticket'));
  touch(g, must(TICKETS[2], 'a ticket'));
  const hands = g.items.carried.map((type, i) => (type === 0xff ? null : { type, colours: [i, i, i, i] }));
  const save = snapshot(g, hands);
  check('format 4: the save keeps the tickets, the pack and when each box was filled', save.v === 4 && save.tickets === 2 && save.pack.length === 1 && save.stamps.join() === g.items.stamps.join());
  const read = CODEC.unpack(CODEC.pack(save), 4);
  check('the save round-trips through the codec', CODEC.format === 4 && JSON.stringify(read) === JSON.stringify(save));
  const back = restore(read);
  check(`a game put back from it carries the same (${JSON.stringify(back.items.list())})`, JSON.stringify(back.items.list()) === JSON.stringify(g.items.list()) && back.items.tickets === 2 && back.items.carried.join() === g.items.carried.join());
  back.unlimitedCarry = () => true;
  touch(back, entryOf(0x0c));
  check('and goes on from there (the next pick-up evicts the oldest as it would have)', back.items.carried.join() === '11,12,5,7' || back.items.carried.includes(0x0c));

  // a format 3 save (the four boxes only), as players have
  const { tickets: _t, pack: _p, stamps: _s, ...body } = save;
  const old = { ...body, v: 3, carried: [3, TICKET, 0xff, 7] };
  const migrated = CODEC.unpack(Uint8Array.from(JSON.stringify(old), (c) => c.charCodeAt(0)), 3);
  check('a format 3 save reads as format 4 with nothing more carried', migrated.v === 4 && migrated.tickets === 0 && migrated.pack.length === 0 && migrated.stamps.join() === '0,0,0,0' && migrated.carried.join() === old.carried.join());
  check('and it is a save', parseSave(readJson(JSON.stringify(migrated))) !== null);
  const loaded = restore(migrated);
  loaded.unlimitedCarry = () => true;
  check('a ticket in a hand (a game played before) is spent from the hand', loaded.items.take(TICKET) && loaded.items.carried.join() === '3,255,255,7' && loaded.items.tickets === 0);
  check('a format 4 body is not read as format 3, nor a format 3 body as 4', (() => {
    try { CODEC.unpack(CODEC.pack(save), 3); return false; } catch { /* refused */ }
    try { CODEC.unpack(Uint8Array.from(JSON.stringify(old), (c) => c.charCodeAt(0)), 4); return false; } catch { return true; }
  })());
}

// ---- in the browser's front end: the assist, the panel, the page --------------------------------------------------
tick(120);
tap('Space');
tick(60);
{
  check('ENHANCED (the default): CARRY ANYTHING is on', p.frontEnd.enhanced && p.frontEnd.assist.carry === true);
  const g = game();
  const rowCodes = (r: number, c: number, n: number) => Array.from({ length: n }, (_, i) => picture().screen.ram[0x400 + r * 40 + c + i] ?? 0);
  const blank = rowCodes(24, 12, 16);
  check('no tickets: nothing is drawn on the panel for them', blank.every((c) => c === 0x80));
  for (const t of GIFTS) touch(g, entryOf(t));
  touch(g, must(TICKETS[0], 'a ticket'));
  touch(g, must(TICKETS[1], 'a ticket'));
  touch(g, must(TICKETS[2], 'a ticket'));
  touch(g, entryOf(0x0b));
  g.placeAt({ room: 0, x: 0xb8, y: 0x68, state: State.Free, step: 0 });
  tick(6);
  const letters = (r: number, c: number, n: number) => rowCodes(r, c, n).map((x) => String.fromCharCode((x - 0x60) & 0x7f)).join('');
  check(`the panel counts the tickets in the game's lettering (${letters(24, 12, 16)})`, letters(24, 12, 16).trim() === 'AIR TICKETS X3');
  check(`the boxes show the last four picked up (${picture().hands.map((h) => h?.type)})`, picture().hands.map((h) => h?.type).join() === '11,4,5,7');
  shot('panel-tickets');
  // a flight spends one: the count on the panel goes down
  input.keyDown('KeyC'); tick(1); input.keyUp('KeyC');
  tick(3);
  check(`a flight: one ticket spent, the panel says X2 (${letters(24, 12, 16)})`, program.flying && g.items.tickets === 2 && letters(24, 12, 16).trim() === 'AIR TICKETS X2');
  let n = 0;
  while (n++ < 4000 && game().flying) tick();
  tick(60);
  // the pause screen's CARRYING page
  /** A picture of the pause screen, and whether it holds still (the world's map blinks and shimmers, the page does not). */
  const hash = () => renderer.screen.pixels.reduce((a, v) => (a * 31 + v) | 0, 7);
  const still = () => { tick(1); const a = hash(); tick(13); return a === hash(); };
  tap('KeyP');
  tick(3);
  check(`the pause screen has the world and the CARRYING page (${awmMap.pages(program).list})`, awmMap.pages(program).list.join() === '0,1');
  check('the world first, and it moves', awmMap.title(program, 0) === 'THE WORLD' && !still());
  tap('Period');
  tick(2);
  check(`> turns to the page (${awmMap.title(program, 1)}), which holds still`, awmMap.title(program, 1) === 'CARRYING' && still());
  shot('carrying');
  check('it has no places to pick and no legend', awmMap.places(MAP_BOX, program, p.state.found, 1).length === 0 && typeof awmMap.legend === 'function' && awmMap.legend(program, {}, 1).length === 0);
  // touch: a tap on the right end of the heading turns the page on (round to the world), and on the left end back
  input.touch = true;
  tick(2);
  input.point(205, 8); tick(3);
  check("touch: a tap on the heading's right end turns round to the world", !still());
  input.point(8, 8); tick(3);
  input.touch = false;
  check('touch: and on its left end back to the page', still());
  shot('carrying-touch');
  tap('KeyP');
  tick(4);
  // ORIGINAL: no page, no count; four hands
  tap('KeyP'); tick(3); tap('KeyE'); tap('KeyP'); tick(3);
  check('E: ORIGINAL, no carrying anything', !p.frontEnd.enhanced && p.frontEnd.assist.carry === false);
  tap('KeyP'); tick(3);
  check(`ORIGINAL: the pause screen has only the world (${awmMap.pages(program).list})`, awmMap.pages(program).list.join() === '0' && awmMap.title(program, 1) === 'THE WORLD');
  tap('KeyP'); tick(3);
  const h = game();
  h.items.carried.fill(0xff);
  h.items.stamps.fill(0);
  h.items.pack.length = 0;
  h.items.tickets = 0;
  for (const i of [3, 4, 5, 6]) touch(h, must(TICKETS[i], 'a ticket'));
  touch(h, must(TICKETS[7], 'a ticket'));
  check(`ORIGINAL in the front end's game: a fifth is refused (${h.items.carried}, ${h.items.tickets} counted)`, h.items.carried.every((t) => t === TICKET) && h.items.tickets === 0 && h.items.pack.length === 0);
}
{
  // the panel's count is drawn and cleared on its own (no stray cells)
  const screenOf = picture().screen;
  const word = () => Array.from({ length: 16 }, (_, c) => String.fromCharCode(((screenOf.ram[0x400 + 24 * 40 + 12 + c] ?? 0) - 0x60) & 0x7f)).join('').trim();
  drawTickets(screenOf, 12);
  check(`twelve: ${word()}`, word() === 'AIR TICKETS X12');
  drawTickets(screenOf, 0);
  check('and none again: the cells are blank', word() === '');
}

finish();
