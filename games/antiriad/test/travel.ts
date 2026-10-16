/**
 * Travel by the map, in the armour and out of it: afterwards Tal (and the armour) must still do
 * what the joystick says.
 *
 * - Flying: up and down must still work. (A playtest found them dead after a travel: travel
 *   cleared the armour's direction but kept its vertical speed, and the armour only steers up
 *   and down from a matching pair.)
 * - Standing: the armour must not arrive standing in the air. (A playtest's armour bounced up
 *   and down for good, nothing working: travel had put it, still standing, where it had flown
 *   into a room; Tal stepped out there and fell, his own physics off in the stance he steps out
 *   in, through the floor and round the room, back into the armour with his jump still on,
 *   which shuts out the joystick for good.)
 * - On foot: he must still walk (travel had zeroed his walking speed).
 * - Saves holding those states are put right on loading (main.ts repairSave).
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/travel.ts
 */
import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
import type { Found } from '../../shared/native/pause';
import { Game } from '../src/game';
import { repairSave } from '../src/main';
import { antiriadMap, entryOf } from '../src/map';
import { V } from '../src/vars';

const load = (state: string) => {
  const m = new C64Machine();
  m.loadState(unpackState(new Uint8Array(fs.readFileSync(state))));
  m.collisionsPerLine = true;
  return new Game(m, true);
};
let g = load('games/antiriad/test/armour.state');
let found: Found = {};

const UP = 0x1f & ~1, DOWN = 0x1f & ~2, LEFT = 0x1f & ~4, NONE = 0x1f;
/** A frame, the map noting rooms as the front end does (main.ts), and `each` after it. */
let each = () => {};
const run = (joy: number, frames: number) => {
  for (let f = 0; f < frames; f++) {
    g.m.joy1 = 0x1f; g.m.joy2 = joy;
    g.tick();
    if (g.playing && !(g.ram[V.roomChange] & 0x80)) antiriadMap.observe(g, found, new Uint8Array(0));
    each();
  }
};
/** Hold `joy` until `done` (at most `max` frames). */
const until = (joy: number, done: () => boolean, max = 400) => { for (let f = 0; f < max && !done(); f++) run(joy, 1); return done(); };
const travel = (room: number) => {
  const at = entryOf(g, found, room);
  if (!at) throw new Error(`no way to travel to room ${room.toString(16)}`);
  g.travelTo = { room, ...at };
  run(NONE, 60);
};
const y = () => g.ram[0x0201];
const x = () => g.ram[0x0200] + ((g.ram[V.spriteXHigh] & 1) << 8);
const inSuit = () => !!(g.ram[V.inSuit] & 0x80);
let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

// ---- flying: travel mid-flight, then up and down ---------------------------------------------

run(NONE, 20);
check('in the armour, with the Gravity Displacer', inSuit() && !!(g.ram[0x0680] & 0x80));

// take off and climb until the armour has vertical speed
until(UP, () => g.ram[V.flySpeedY] > 0, 300);
check(`flying up, with vertical speed (${g.ram[V.flySpeedY]})`, g.ram[V.flySpeedY] > 0);

// travel back into this room (where the armour is now), mid-flight
const room = g.ram[V.room];
g.travelTo = { room, x: g.ram[0x0200], y: g.ram[0x0201] + 0x10, high: g.ram[V.spriteXHigh] & 1 };
run(NONE, 60);
check('arrived (the room drawn again, play going on)', g.ram[V.room] === room && !(g.ram[V.roomChange] & 0x80));

// up and down still steer the armour (it has momentum: thrust builds and reversing brakes first,
// so watch how high and low it gets while each is held)
const start = y();
let top = start, bottom = start;
for (let f = 0; f < 300; f++) { run(UP, 1); top = Math.min(top, y()); }
for (let f = 0; f < 300; f++) { run(DOWN, 1); bottom = Math.max(bottom, y()); }
check(`holding up after the travel lifts the armour (y ${start} -> up to ${top})`, top < start - 8);
check(`then holding down lowers it again (y down to ${bottom})`, bottom > top + 8);

// ---- standing: travel to where the armour flew into a room -----------------------------------

g = load('games/antiriad/test/armour.state');
found = {};
run(NONE, 20);
const home = g.ram[V.room];
// take off and fly up into the room above (the armour comes in at its bottom edge, in the air)
const ground = y();
until(UP, () => g.ram[V.room] !== home);
run(NONE, 30);
const away = g.ram[V.room], flownIn = entryOf(g, found, away);
check(`flew up into room ${away.toString(16)}, in the air at its bottom edge (${flownIn?.x},${flownIn?.y})`, away !== home && !!flownIn && flownIn.y > ground + 40);
// back home by the map (where the armour stood), and land: standing ($B2)
travel(home);
until(DOWN, () => g.ram[V.anim] === 0xb2, 300);
run(NONE, 20);
check('home again, landed: standing', g.ram[V.room] === home && g.ram[V.anim] === 0xb2);
// standing, travel to the room flown into
travel(away);
check(`arrived in room ${away.toString(16)}, in the air, flying (not standing in the air: anim ${g.ram[V.anim].toString(16)})`, g.ram[V.room] === away && inSuit() && g.ram[V.anim] !== 0xb2);
// left there (standing, it would step out), and on: never in the armour with Tal's jump on, nor
// Tal falling in the stance he steps out in (his physics are off in it: he'd fall for good)
let jumpInSuit = 0, fallingOut = 0;
each = () => {
  if (inSuit() && g.ram[V.jumping] & 0x80) jumpInSuit++;
  if (!inSuit() && g.ram[V.anim] === 0x88 && g.ram[V.jumping] & 0x80) fallingOut++;
};
run(LEFT, 30);
run(NONE, 800);
each = () => {};
check(`no frames in the armour with Tal's jump on (${jumpInSuit})`, !jumpInSuit);
check(`no frames of Tal falling stepped out (${fallingOut})`, !fallingOut);
// and the joystick still steers: up lifts the armour
const before = y();
until(UP, () => y() < before - 16, 200);
check(`up still lifts the armour (y ${before} -> ${y()})`, inSuit() && y() < before - 16);

// ---- on foot: travel, then walk -----------------------------------------------------------------

g = load('games/antiriad/test/original.state');
found = {};
each = () => { g.ram[V.life] = 0x1f; }; // (the first room's radiation off, for the check)
run(NONE, 20);
const walkFrom = x();
run(LEFT, 40);
check(`on foot, Tal walks (x ${walkFrom} -> ${x()})`, x() < walkFrom - 8);
travel(g.ram[V.room]);
run(NONE, 60);
const afterTravel = x();
run(LEFT, 40);
check(`after a travel on foot he still walks (x ${afterTravel} -> ${x()}, speed ${g.ram[V.speedX]})`, x() < afterTravel - 8);
each = () => {};

// ---- saves with those states, put right on loading -------------------------------------------

/** A save loaded as main.ts resumes one (through the repair), or not. */
const resume = (game: Game, repair: boolean) => {
  game.flushShapes();
  const m = new C64Machine();
  m.loadState(game.m.saveState());
  const r = new Game(m, true);
  if (repair) repairSave(r);
  return r;
};
/** Does the joystick do anything: up from here, against nothing pushed (the hero's height each frame). */
const heights = (game: Game, joy: number) => {
  g = resume(game, false);
  const t: number[] = [];
  for (let f = 0; f < 150; f++) { run(joy, 1); t.push(y()); }
  return t.join(',');
};
const lifts = (game: Game) => heights(game, UP) !== heights(game, NONE);

// in the armour with Tal's jump on (as he fell into it): the joystick is shut out, it bounces
const stuck = () => {
  const s = load('games/antiriad/test/armour.state');
  g = s; run(NONE, 20);
  s.ram[V.jumping] = 0x80; s.ram[V.jumpStep] = 0x13;
  s.ram[V.dir] = s.ram[V.dir + 1] = 2; s.ram[V.speedY] = s.ram[V.speedY + 1] = 4;
  return s;
};
check('a save in the armour with the jump on: as it is, up does nothing', !lifts(resume(stuck(), false)));
check('... put right on loading: up lifts the armour', lifts(resume(stuck(), true)));

// Tal stepped out of an armour standing in the air, falling (in the stance he steps out in, his
// jump on) and about to fall back into it
const fallen = () => {
  const s = load('games/antiriad/test/armour.state');
  g = s; run(NONE, 20);
  until(LEFT, () => !inSuit() && s.ram[V.anim] === 0x88 && !(s.ram[V.appearing] & 0x80), 300);
  // (as if all this were 40 pixels up: the armour standing in the air, Tal under it, falling)
  for (const at of [0x0201, 0x0203, 0x0207, 0x0209, V.suitY]) s.ram[at] = (s.ram[at] - 40) & 0xff;
  s.ram[V.jumping] = 0x80; s.ram[V.jumpStep] = 0x13; s.ram[V.dir] = s.ram[V.dir + 1] = 2;
  return s;
};
const outcome = (game: Game) => {
  g = game;
  let jumpIn = 0;
  each = () => { if (inSuit() && g.ram[V.jumping] & 0x80) jumpIn++; };
  run(NONE, 600);
  each = () => {};
  return jumpIn;
};
const asItIs = outcome(resume(fallen(), false));
check(`stepped out in the air: as it is, Tal falls back into the armour with his jump on (${asItIs} frames)`, asItIs > 0);
const repaired = resume(fallen(), true), afterRepair = outcome(repaired);
check(`... put right on loading: never in the armour with the jump on (${afterRepair} frames)`, afterRepair === 0);
check('... and up lifts the armour', lifts(repaired));

console.log(failures ? `${failures} failed` : 'all passed');
process.exit(failures ? 1 : 0);
