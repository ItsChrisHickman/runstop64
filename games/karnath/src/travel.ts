import { call, wr, rd, type Gen } from '../../shared/native/cpu';
import * as engine from './gen/engine';

/**
 * Travel back to a room Pendragon has been in (the pause map), the game's own way.
 *
 * The castle is a set of long scrolling strips (levels, three rooms each), drawn from a
 * char map that the game edits in place (doors, objects): where he is is a handful of
 * pointers into that map and his position on it. The castle comes in four "modes"
 * ($3219), each with its own code blocks, graphics and parts of the map swapped in by
 * the game's own transitions: 0 the lower half, 1 the upper half ($2E33 in, $2EF6 out),
 * $FF the dungeons ($1199 in from room 2, and out), $FE Karn's abode ($12E1 from the
 * dungeons, and back). The swaps are exchanges, so the progress kept in the swapped
 * map goes with them.
 *
 * Going to a room: anything half done is finished as the game would (a spell in flight
 * ends as on a change of level, $2ECB; an open door shuts, $2B2C or $2A7E); the mode
 * changes by the game's own transitions, one step at a time (1 - 0 - $FF - $FE); then
 * he's put where he first came into the room (the pointers and his position, as they
 * were then: `LOCATION`), and the room is drawn and its level set up as a change of
 * level does ($2C21 draws from the map as it is now, so nothing taken comes back; the
 * level's code starts its creatures, $6A9F, or $6003 in the dungeons). Energy, the clock,
 * spells, pieces of the pentacle and everything in the map are left as they are.
 */

/** Where he is: the bytes saved on first coming into a room, and put back on going there. */
export const LOCATION: number[] = [
  0x3219, 0x3235, 0xb3e1, // mode, room, level type (which code runs it)
  0x7fe0, 0x7fe1, 0x7fe4, 0x7fe5, 0x7fe6, 0x7fe7, 0x7fe8, 0x7fe9, 0x7fea, 0x7feb, 0x7fed, 0x7fee, // the map pointers, fine scroll
  0x7ff2, 0x7ff3, 0x7ff4, 0x7ff7, 0x7ff8, 0x7ff9, 0x7ffa, 0x3238, // his sprite: x, y, frames
  0x25c1, 0x25c2, 0x25c3, 0x25c4, 0x25c5, 0x25c6, 0x25c7, 0x25c8, 0x25c9, 0x25ca, 0x25cb, 0x25cc, // facing, x along the strip, at an end
  ...Array.from({ length: 0x22 }, (_, i) => 0x25cd + i), // the frames of the way he's facing
  0x2378, 0x2379, 0x2393, 0x238f, 0x2390, 0x2370, 0x237c, // (frames' graphics; doors' places)
];

type Location = number[];

/**
 * His place along the strip, in pixels ($3214/$3215: the game counts it as he walks, and where a creature
 * starts is worked out from it, $3653), is not kept in a location: it follows from what is. His sprite's x
 * on the screen plus how far the view has scrolled (the blocks of 40 columns before the view's first one, its
 * column, less the fine scroll $7FEE) less 57: for every frame of play along the routes
 * (games/karnath/test/travel-creatures.ts). The strip's first block is where its level's map starts (the
 * lower floor from $70 a level every $0C pages, the upper floor from $94, the dungeons and the abode over
 * the first of the lower floor's).
 */
const STRIP_BASE = (mode: number, level: number) => (mode === 1 ? 0x94 + 0x0c * (level - 1) : mode === 0 ? 0x70 + 0x0c * (level - 1) : 0x70);
function stripX(mode: number, level: number, page: number, column: number, fine: number, spriteX: number) {
  const block = (page - 4 - STRIP_BASE(mode, level)) >> 2;
  return block * 320 + column * 8 - (fine & 7) + spriteX - 57;
}
/** His place along the strip from the memory as it is (his sprite's x with its high bit from the VIC). */
export function stripXNow(ram: Uint8Array, vic: Uint8Array) {
  return stripX(ram[0x3219], ram[0xb3e1], ram[0x7fe7], ram[0x7fe6], ram[0x7fee], vic[4] | ((vic[0x10] & 4) << 6));
}
/** His place along the strip for a location (the bytes of `location`, and his sprite's high bit last). */
function stripXAt(loc: Location) {
  const v = (a: number) => loc[LOCATION.indexOf(a)];
  return stripX(v(0x3219), v(0xb3e1), v(0x7fe7), v(0x7fe6), v(0x7fee), v(0x7ff4) | (loc[LOCATION.length] ? 256 : 0));
}
/** The bytes of his place along the strip. */
export const STRIP_X = [0x3214, 0x3215];
const putStripX = (ram: Uint8Array, x: number) => { ram[0x3214] = x & 0xff; ram[0x3215] = (x >> 8) & 0xff; };

/**
 * A save from before travel set his place along the strip (it left the one he had where he'd come from, so the
 * creatures a level started were placed off the screen): put it as the memory's own place says, where it is far from that.
 */
export function repairStripX(ram: Uint8Array, vic: Uint8Array) {
  if (ram[0x3235] < 1 || ram[0x3235] > 0x19 || ![0, 1, 0xfe, 0xff].includes(ram[0x3219])) return;
  const want = stripXNow(ram, vic);
  if (want >= 0 && Math.abs(want - (ram[0x3214] | (ram[0x3215] << 8))) > 48) putStripX(ram, want);
}

const settled = (ram: Uint8Array) =>
  ram[0x6ffd] === 0 && ram[0x6fff] !== 0x11 && ram[0x6fff] !== 0x12 && // not losing or winning
  ram[0x3216] === 0 && ram[0x2392] === 0 && ram[0x237d] === 0 && // no spell in flight, no door open
  ram[0x3235] >= 1 && ram[0x3235] <= 0x19 && [0, 1, 0xfe, 0xff].includes(ram[0x3219]);

/** Where he is now, if it's a clean place to come back to (else null). */
export function location(ram: Uint8Array, vic: Uint8Array): Location | null {
  if (!settled(ram)) return null;
  return LOCATION.map((a) => ram[a]).concat(vic[0x10] & 4);
}

const drain = (g: Gen) => { for (let r = g.next(); !r.done; r = g.next()) { /* (its frame waits pass at once) */ } };

/** One step between modes, by the game's own transition (it draws a room there, redrawn after). */
function step(ram: Uint8Array, from: number, to: number) {
  ram[0x237c] = 1;
  if (from === 0 && to === 1) drain(engine.r_2e33());
  else if (from === 1 && to === 0) drain(engine.r_2ef6());
  else if (from === 0 && to === 0xff) { ram[0x3235] = 2; drain(engine.r_1199()); }
  else if (from === 0xff && to === 0) { ram[0x3235] = 0x18; drain(engine.r_1199()); wr(0xd023, 8); wr(0xd022, 9); ram[0x3219] = 0; }
  else if (from === 0xff && to === 0xfe) { ram[0x3235] = 0x18; drain(engine.r_12e1()); }
  else if (from === 0xfe && to === 0xff) { ram[0x3235] = 0x19; drain(engine.r_12e1()); ram[0x3219] = 0xff; }
}
const PATH = [1, 0, 0xff, 0xfe];

/** Into another mode by the game's own transitions, one step at a time (the room drawn on the way is left to the caller). */
export function toMode(ram: Uint8Array, mode: number) {
  for (let i = PATH.indexOf(ram[0x3219]); i >= 0 && i !== PATH.indexOf(mode);) {
    const j = i + Math.sign(PATH.indexOf(mode) - i);
    step(ram, PATH[i], PATH[j]);
    i = j;
  }
}

/** Go to a place saved by `location` (in the main loop, between frames). False if it can't from here. */
export function go(ram: Uint8Array, to: Location): boolean {
  if (to.length !== LOCATION.length + 1) return false;
  // (a spell in flight or a door open: finished first, below; anything else unsettled: not now)
  if (ram[0x6ffd] !== 0 || ram[0x6fff] === 0x11 || ram[0x6fff] === 0x12) return false;
  const mode = to[0];
  if (!PATH.includes(mode) || !PATH.includes(ram[0x3219])) return false;
  if (ram[0x3216] === 1) engine.r_2ecb(); // the spell ends, as on a change of level
  if (ram[0x2392]) { engine.r_2b2c(); ram[0x2392] = 0; } // a door between rooms shuts behind him
  if (ram[0x237d]) engine.r_2a7e(); // a tower door shuts
  toMode(ram, mode);
  if (ram[0x3219] !== mode) return false; // (not reached: the transitions set it)
  LOCATION.forEach((a, i) => { ram[a] = to[i]; });
  putStripX(ram, stripXAt(to)); // (where he is along the strip: the creatures the level starts are placed from it)
  // drawn from the map as it is now, as a change of level does
  ram[0xfc] = (ram[0x7fe7] - 4) & 0xff; ram[0xfb] = ram[0x7fe6]; ram[0x2375] = ram[0x7fe6];
  ram[0x237c] = 1; // (where he stands is his own, not the bottom of the stairs)
  engine.r_2c21();
  ram[0x237c] = to[LOCATION.indexOf(0x237c)];
  ram[0x2392] = 0; ram[0x237d] = 0;
  for (let x = 0; x < 0x27; x++) ram[0x720 + x] = 0;
  engine.r_2f8e(); // the room's name
  // his sprite: where he was, the frame he's on
  wr(0xd004, ram[0x7ff4]); wr(0xd005, ram[0x3238]);
  wr(0xd010, (rd(0xd010) & ~4) | to[LOCATION.length]);
  engine.r_2772();
  ram[0x7ff9] = to[LOCATION.indexOf(0x7ff9)]; // (r_2772 moved it on)
  // the level's creatures start again, as on coming into it
  if (mode === 0xff || mode === 0xfe) call(0x6003); else engine.r_6a9f();
  engine.r_18b3(); // (screen and his sprite on)
  return true;
}
