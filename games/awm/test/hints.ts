/**
 * Auf Wiedersehen Monty's ENHANCED item hints, headless. A room or creature that wants a thing used to take it without a word; now
 * the panel's bottom row says where a thing goes when it is picked up (FOR MONACO), what a room wants when he comes in without it
 * (WANTED HERE: and the thing's picture), and what a handover paid (DELIVERED: +1000), for four seconds, then the ticket count or
 * the SPACE: FLY prompt is back. ORIGINAL says nothing. Every room and creature that takes a thing is checked.
 * With an out-dir: the panel with each message.
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/hints.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { indicesPng, renderPixels } from '../../../tools/probe/render';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { TABLES } from '../src/data';
import { Game } from '../src/game';
import { HINT_STEPS, type Hint } from '../src/hints';
import { Picture } from '../src/picture';
import { COLS } from '../src/room';
import { State } from '../src/tiles';
import { placeName, WANTS } from '../src/wants';

const outDir = process.argv[2];

/** A game with the hints as the mode has them, and what it told. */
function started(room: number, hints: boolean): { g: Game; told: Hint[] } {
  const g = new Game(room);
  g.unlimitedCarry = () => hints;
  g.hints = () => hints;
  const told: Hint[] = [];
  g.onHint = (h) => told.push(h);
  return { g, told };
}
const show = (h: Hint | undefined): string => (h ? JSON.stringify(h) : 'nothing');
const same = (a: readonly Hint[], b: readonly Hint[]): boolean => JSON.stringify(a) === JSON.stringify(b);
const entryOf = (type: number): number => {
  const i = TABLES.items.findIndex((e) => e.type === type);
  if (i < 0) throw new Error(`no item of type ${type}`);
  return i;
};
/** Monty touching the list entry, as the pick-up does it. */
function touch(g: Game, i: number): void {
  const e = must(TABLES.items[i], 'no entry');
  if (g.world.room !== e.room) g.placeAt({ room: e.room, x: 0x40, y: 0x40, state: State.Free, step: 0 });
  g.monty.x = ((e.cell % COLS) * 8 - 2) & 0xff;
  g.monty.y = (Math.floor(e.cell / COLS) * 8 - 1) & 0xff;
  g.items.pickup(g);
}
/** Monty on the creature of a slot, showing a frame, and one step. */
function meet(g: Game, slot: number, frame: number): void {
  g.enemies.setFrame(slot, frame);
  g.monty.x = g.enemies.x(slot);
  g.monty.y = g.enemies.y(slot);
  g.step(0);
}
const names = WANTS.map((w) => `${w.room.toString(16)}:${placeName(w.room)}`).join(' ');

// ---- the names fit the panel's slot: 22 cells, "FOR " first
check(`every room that wants a thing has a name that fits (${names})`, WANTS.every((w) => placeName(w.room).length > 0 && `FOR ${placeName(w.room)}`.length <= 22));
check('room $1B reads as its country, not "THE"', placeName(0x1b) === 'AUSTRIA');

// ---- picking up a thing something wants: where it goes
for (const w of WANTS.filter((x) => TABLES.items.some((e) => e.type === x.type))) {
  const { g, told } = started(0, true);
  touch(g, entryOf(w.type));
  check(`picking up type ${w.type} says FOR ${placeName(w.room)} (${told.map(show)})`, same(told, [{ kind: 'for', room: w.room }]));
}
{
  const { g, told } = started(0, true);
  touch(g, must(TABLES.items.findIndex((e) => e.type === 0), 'a ticket'));
  check(`a plane ticket says nothing (${told.map(show)})`, told.length === 0);
  const o = started(0, false);
  touch(o.g, entryOf(0x0b));
  check('ORIGINAL: picking up a wanted thing says nothing', o.told.length === 0);
}

// ---- the four deliveries: wanted on coming in without it, delivered with it, never asked again once handed over
for (const d of [
  { room: 0x16, type: 0x0b, pay: 18 }, { room: 0x2c, type: 0x0c, pay: 1000 }, { room: 0x3e, type: 0x07, pay: 750 }, { room: 0x0b, type: 0x04, pay: 300 },
]) {
  const { g, told } = started(0x10, true);
  g.enterRoom(d.room);
  check(`room $${d.room.toString(16)} without it: WANTED HERE (${told.map(show)})`, same(told, [{ kind: 'wanted', type: d.type }]));
  told.length = 0;
  touch(g, entryOf(d.type));
  told.length = 0;
  g.enterRoom(d.room);
  check(`with it: DELIVERED +${d.pay} (${told.map(show)})`, same(told, [{ kind: 'delivered', pay: d.pay }]));
  told.length = 0;
  g.enterRoom(d.room);
  check(`and not asked again once handed over (${told.map(show)})`, told.length === 0);
  const o = started(0x10, false);
  o.g.enterRoom(d.room);
  check('ORIGINAL: the room says nothing', o.told.length === 0);
}

// ---- the creatures and scenes: room 5 takes $0A and gives $13, room $36 takes $13, the toll-keeper in room $49 takes 3, room $1B takes 5
{
  const { g, told } = started(0x10, true);
  g.enterRoom(5);
  check(`room 5 without the thing: WANTED HERE (${told.map(show)})`, same(told, [{ kind: 'wanted', type: 0x0a }]));
  told.length = 0;
  touch(g, entryOf(0x0a));
  g.enterRoom(5);
  check(`room 5 with it says nothing wanted (${told.map(show)})`, told.every((h) => h.kind !== 'wanted'));
  told.length = 0;
  const slot = [0, 1, 2, 3].find((s) => g.enemies.frame(s) === 0x59);
  meet(g, must(slot, 'the creature'), 0x59);
  check(`handed to room 5's creature: DELIVERED +6700, then FOR PIZZA (${told.map(show)})`, same(told, [{ kind: 'delivered', pay: 6700 }, { kind: 'for', room: 0x36 }]));
  told.length = 0;
  g.enterRoom(5);
  check(`room 5 is not asked of again (${told.map(show)})`, told.length === 0);
  g.enterRoom(0x36);
  check(`pizza room carrying $13: nothing wanted (${told.map(show)})`, told.length === 0);
  meet(g, 0, 0x56);
  check(`handed to the pizza room's creature: DELIVERED +600 (${told.map(show)})`, same(told, [{ kind: 'delivered', pay: 600 }]));
  told.length = 0;
  g.enterRoom(0x10);
  g.enterRoom(0x36);
  check(`and not asked again (${told.map(show)})`, told.length === 0);
}
{
  const { g, told } = started(0x10, true);
  g.enterRoom(0x36);
  check(`pizza room without $13: WANTED HERE (${told.map(show)})`, same(told, [{ kind: 'wanted', type: 0x13 }]));
}
{
  const { g, told } = started(0x10, true);
  g.enterRoom(0x49);
  check(`toll room without item 3: WANTED HERE (${told.map(show)})`, same(told, [{ kind: 'wanted', type: 3 }]));
  told.length = 0;
  g.items.give(3);
  meet(g, 0, 0x1c);
  check(`the toll: DELIVERED +5500 (${told.map(show)})`, same(told, [{ kind: 'delivered', pay: 5500 }]));
  told.length = 0;
  g.enterRoom(0x10);
  g.enterRoom(0x49);
  check(`paid once: not asked again (${told.map(show)})`, told.length === 0);
}
{
  const { g, told } = started(0x10, true);
  g.enterRoom(0x1b);
  check(`room $1B without item 5: WANTED HERE (${told.map(show)})`, same(told, [{ kind: 'wanted', type: 5 }]));
  told.length = 0;
  g.items.give(5);
  g.enterRoom(0x1b);
  check(`room $1B carrying it says nothing wanted (${told.map(show)})`, told.length === 0);
  g.enemies.setFrame(3, 0x80);
  g.monty.x = g.enemies.x(3);
  g.monty.y = g.enemies.y(3);
  g.step(0);
  check(`room $1B takes it: DELIVERED (${told.map(show)})`, same(told, [{ kind: 'delivered', pay: 0 }]));
}

// ---- the panel: the message, its time, then the count or the prompt
const slotText = (pic: Picture): string => Array.from({ length: 22 }, (_, c) => String.fromCharCode(((pic.screen.ram[0x400 + 24 * 40 + 12 + c] ?? 0) - 0x60) & 0x7f)).join('').replace(/[^ -~]/g, ' ').trimEnd();
const upper = (pic: Picture, c: number): number => pic.screen.ram[0x400 + 23 * 40 + c] ?? 0;
function shot(pic: Picture, name: string) {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  const px = renderPixels(pic);
  indicesPng(path.join(outDir, `${name}.png`), px, 320, 200);
}
{
  const { g } = started(0x10, true);
  g.items.tickets = 2;
  g.hints = () => true;
  const pic = new Picture(g);
  g.step(0);
  pic.endB();
  check(`the count is shown first (${slotText(pic)})`, slotText(pic) === 'AIR TICKETS X2');

  g.enterRoom(0x2c);
  g.step(0);
  pic.endB();
  check(`WANTED HERE: in the slot (${slotText(pic)})`, slotText(pic) === 'WANTED HERE:');
  check('and the thing\'s picture after it, two cells wide and two rows high', upper(pic, 25) === 0xe0 && upper(pic, 26) === 0xe2 && (pic.screen.ram[0x400 + 24 * 40 + 25] ?? 0) === 0xe1 && (pic.screen.ram[0x400 + 24 * 40 + 26] ?? 0) === 0xe3);
  shot(pic, 'wanted');
  for (let i = 0; i < HINT_STEPS - 3; i++) { g.step(0); pic.endB(); }
  check(`still there just before four seconds (${slotText(pic)})`, slotText(pic) === 'WANTED HERE:');
  for (let i = 0; i < 6; i++) { g.step(0); pic.endB(); }
  check(`then the count is back, the picture gone (${slotText(pic)})`, slotText(pic) === 'AIR TICKETS X2' && upper(pic, 25) === 0x80 && upper(pic, 26) === 0x80);
  shot(pic, 'count-back');

  // picking up: where it goes
  touch(g, entryOf(0x0c));
  g.step(0);
  pic.endB();
  check(`FOR MONACO after picking up the Mona Lisa (${slotText(pic)})`, slotText(pic) === 'FOR MONACO');
  shot(pic, 'for');
  // a handover is held for its while, the next message waits its turn
  g.items.give(0x0b);
  g.enterRoom(0x16);
  g.step(0);
  pic.endB();
  check(`DELIVERED: +18 (${slotText(pic)})`, slotText(pic) === 'DELIVERED: +18');
  shot(pic, 'delivered');
  touch(g, entryOf(0x07));
  g.step(0);
  pic.endB();
  check(`a message right after a handover waits (${slotText(pic)})`, slotText(pic) === 'DELIVERED: +18');
  for (let i = 0; i < 55; i++) { g.step(0); pic.endB(); }
  check(`and then comes (${slotText(pic)})`, slotText(pic) === 'FOR JUVENTUS');
  for (let i = 0; i < HINT_STEPS + 2; i++) { g.step(0); pic.endB(); }
  check(`and goes (${slotText(pic)})`, slotText(pic) === 'AIR TICKETS X2');
  // the prompt returns too
  g.items.tickets = 2;
  g.jumpBoards = () => true;
  g.placeAt({ room: 0, x: 0xb8, y: 0x68, state: State.Free, step: 0 });
  g.step(0);
  pic.endB();
  const plane = [0, 1, 2, 3].find((s) => g.enemies.frame(s) === 0xd0);
  if (plane !== undefined) {
    g.monty.x = g.enemies.x(plane);
    g.monty.y = g.enemies.y(plane);
    g.step(0);
    pic.endB();
    check(`at a plane the prompt is the slot's after the hints (${slotText(pic)})`, slotText(pic) === 'SPACE: FLY');
  }
}
{
  // ORIGINAL: the panel never says any of it
  const { g } = started(0x10, false);
  const pic = new Picture(g);
  g.enterRoom(0x2c);
  g.step(0);
  pic.endB();
  touch(g, entryOf(0x0c));
  g.step(0);
  pic.endB();
  check(`ORIGINAL: nothing on the panel (${slotText(pic)})`, slotText(pic) === '');
}

finish();
