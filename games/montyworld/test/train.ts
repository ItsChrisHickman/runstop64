/**
 * The train moves (train.ts, the engine's `charAnims`): in a car's room the landscape in each window slides along and wraps (a ring of
 * characters, a pixel a step), the sleepers under the car slide faster, the wheels turn through their pictures; the platform's car stands
 * until he is aboard (inside the door) and rolls from there; the rooms beside it (the roof, the tender) as well; a room without
 * animation changes nothing, and Monty on the Run has none.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/train.ts
 */
import { decorChars } from '../../montyotr/src/decor-chars';
import { enterRoom } from '../../montyotr/src/ending';
import type { Game } from '../../montyotr/src/game';
import { MOTR } from '../../montyotr/src/motr';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WINDOW_SCENERY } from '../src/art/siberia-decor';
import { WHEEL_FRAMES } from '../src/art/siberia-decor';
import { WORLD } from '../src/data';
import { decorIndex } from '../src/layout';
import { ROOM } from '../src/moscow';
import { SIB } from '../src/siberia';
import { newGame } from '../../shared/monty/test/bot';
import { standY } from './route';

/** A game with Monty standing in a room, the creatures out of the way. */
function at(room: number, col: number, floor: number): State {
  const s = newGame(WORLD, false);
  enterRoom(s.g, room, 0x0c + (col + 4) * 4, standY(floor));
  s.g.enemies = [];
  s.g.enable &= 0x0f;
  s.g.vic.enable &= 0x0f;
  return s;
}
const run = (s: State, frames: number) => { for (let i = 0; i < frames; i++) frame(s, NONE); };
/** A character's 8 bytes as text. */
const chr = (g: Game, n: number) => Array.from(g.mem.subarray(n * 8, n * 8 + 8)).join(',');
/** The characters of a ring of the window's scenery, in the room. */
const windowRing = (g: Game, ring: number) => {
  const first = decorChars(g.data, g.roomId)[decorIndex('trainWindow')] ?? 0;
  return (WINDOW_SCENERY[ring] ?? []).map((cell) => first + cell);
};
const ringText = (g: Game, ring: number) => windowRing(g, ring).map((n) => chr(g, n)).join('|');
/** The character a playfield cell shows. */
const cellAt = (g: Game, col: number, row: number) => g.mem[0x800 + (row + 3) * 40 + col + 4] ?? 0;

// ---- the dining car, the sleeper, the tender -------------------------------------------------------------
for (const [name, room, windows] of [['dining car', SIB.gravy, true], ['sleeper', SIB.sleeper, true], ['tender', SIB.coal, false]] as const) {
  const s = at(room, 8, 17);
  const rail = cellAt(s.g, room === SIB.coal ? 10 : 20, 19), wheel = cellAt(s.g, 4, 18);
  const rail0 = chr(s.g, rail), wheel0 = chr(s.g, wheel), ring0 = windows ? [ringText(s.g, 0), ringText(s.g, 1)] : [];
  const seen = { rail: new Set<string>([rail0]), wheel: new Set<string>([wheel0]), ring: new Set<string>(windows ? [ring0.join('/')] : []) };
  for (let i = 0; i < 60; i++) {
    run(s, 2);
    seen.rail.add(chr(s.g, rail));
    seen.wheel.add(chr(s.g, wheel));
    if (windows) seen.ring.add([ringText(s.g, 0), ringText(s.g, 1)].join('/'));
  }
  check(`${name}: the sleepers slide under the car (the rail character takes ${seen.rail.size} pictures in 60 steps: two pixels a step round a period of eight)`, seen.rail.size === 4);
  check(`${name}: the wheels turn (${seen.wheel.size} pictures)`, seen.wheel.size === WHEEL_FRAMES.length);
  if (windows) check(`${name}: the landscape in the windows goes by and comes round (${seen.ring.size} pictures in 60 steps)`, seen.ring.size > 8);
}

// the landscape wraps: 24 steps of a pixel bring a ring of three characters back to where it was
{
  const s = at(SIB.gravy, 8, 17);
  const start = [ringText(s.g, 0), ringText(s.g, 1)];
  run(s, 2 * 24);
  check('the landscape comes round after the 24 pixels of its ring (nothing lost at the edges)', ringText(s.g, 0) === start[0] && ringText(s.g, 1) === start[1]);
  const moved = at(SIB.gravy, 8, 17);
  run(moved, 2 * 5);
  check('and in between it is not where it was', ringText(moved.g, 0) !== start[0]);
}

// ---- the platform's car stands until he is aboard ---------------------------------------------------------
{
  const s = at(ROOM.station, 16, 17);
  const rail = cellAt(s.g, 24, 19), still = chr(s.g, rail), ring = ringText(s.g, 0);
  run(s, 120);
  check('the train stands at the platform while he is on it (the sleepers, the windows, nothing moves)', chr(s.g, rail) === still && ringText(s.g, 0) === ring);
  const aboard = at(ROOM.station, 24, 17);
  run(aboard, 14);
  check('aboard (inside the door) it rolls: the sleepers and the windows move', chr(aboard.g, rail) !== still && ringText(aboard.g, 0) !== ring);
}

// ---- the sky above the train (art/siberia-sky.ts) ---------------------------------------------------------------
/** A decoration's characters in a room as text, one per cell of its row `row` (w characters a row). */
const decorRow = (g: Game, name: Parameters<typeof decorIndex>[0], w: number, row: number) => {
  const first = decorChars(g.data, g.roomId)[decorIndex(name)] ?? 0;
  return Array.from({ length: w }, (_, i) => chr(g, first + row * w + i)).join('|');
};
for (const [name, room] of [['dining car', SIB.gravy], ['sleeper', SIB.sleeper], ['tender', SIB.coal], ['platform', ROOM.station]] as const) {
  const first = decorChars(WORLD, room);
  check(`${name}: the sky's pieces all fit in the room's characters (none dropped as the pool ran out)`, (['horizon', 'wires', 'moon', 'star'] as const).every((d) => (first[decorIndex(d)] ?? 0) > 0));
}
{
  const s = at(SIB.gravy, 8, 17);
  const g = s.g;
  const start = { mountains: [decorRow(g, 'horizon', 2, 0), decorRow(g, 'horizon', 2, 1)], pines: decorRow(g, 'horizon', 2, 2), poles: decorRow(g, 'wires', 4, 0), smoke: decorRow(g, 'smoke', 4, 0) };
  const mountains = () => [decorRow(g, 'horizon', 2, 0), decorRow(g, 'horizon', 2, 1)];
  run(s, 2 * 8);
  check('after 8 steps the mountains have crept (a pixel every fourth step) and so have the pines in front of them (every second)',
    mountains().join() !== start.mountains.join() && decorRow(g, 'horizon', 2, 2) !== start.pines);
  run(s, 2 * 24);
  check('after 32 steps the pines (16 pixels a round) are back and the mountains (8 of their 16) are not',
    decorRow(g, 'horizon', 2, 2) === start.pines && mountains().join() !== start.mountains.join());
  check('the poles and the smoke (32 pixels a round, a pixel every step: the pace of the windows\' scenery) are back too', decorRow(g, 'wires', 4, 0) === start.poles && decorRow(g, 'smoke', 4, 0) === start.smoke);
  run(s, 2 * 32);
  check('after 64 steps the mountains are back as well: the slowest of all', mountains().join() === start.mountains.join());
  const mid = at(SIB.gravy, 8, 17);
  run(mid, 2 * 16);
  check('the poles are half a round on at 16 steps, the smoke too', decorRow(mid.g, 'wires', 4, 0) !== start.poles && decorRow(mid.g, 'smoke', 4, 0) !== start.smoke);
}
{
  // nothing it draws is solid: the sky's cells are the decoration characters (from $9B), never a room tile (1-8), but where the room has tiles of its own: the sleeper's pine
  // (columns 22-23) and the banks of its cutting, the tender's rope (column 24) and the mine's shelf over it
  const bad: string[] = [];
  const own = (room: number, col: number, row: number): boolean => room === SIB.sleeper
    ? col === 22 || col === 23 || ((col < 6 || col > 25) && row >= 3 + ((col < 6 ? col : 31 - col) >> 1))
    : room === SIB.coal && (col === 24 || (row <= 1 && ((col >= 19 && col <= 22) || (col >= 26 && col <= 29))));
  for (const [name, room] of [['dining car', SIB.gravy], ['sleeper', SIB.sleeper], ['tender', SIB.coal]] as const) {
    const s = at(room, 8, 17);
    for (let row = 2; row <= 8; row++) for (let col = 0; col < 32; col++) {
      const c = cellAt(s.g, col, row);
      const tile = c >= 1 && c <= 8;
      if (tile !== own(room, col, row)) bad.push(`${name}: cell ${col},${row} is ${c}`);
    }
  }
  check(`the sky's cells are never a room tile but where the room has tiles of its own (${bad.slice(0, 4).join('; ') || 'none wrong'})`, bad.length === 0);
}
{
  const s = at(ROOM.station, 16, 17);
  const ring = decorRow(s.g, 'horizon', 2, 2);
  run(s, 120);
  check('the platform\'s sky stands still with the train until he is aboard', decorRow(s.g, 'horizon', 2, 2) === ring);
  const aboard = at(ROOM.station, 24, 17);
  run(aboard, 8);
  check('and moves once he is', decorRow(aboard.g, 'horizon', 2, 2) !== ring);
}

// ---- the scenery runs from the moment he is in the room -----------------------------------------------------
{
  // he walks in from the station's roof (half off the playfield's edge as the room loads) and stands still: the sleepers, the wheels and the windows go by at once
  const s = at(ROOM.station, 26, 9);
  for (let f = 0; f < 300 && s.g.roomId === ROOM.station; f++) frame(s, { ...NONE, right: true });
  for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
  const rail = cellAt(s.g, 20, 19), ring = ringText(s.g, 0), at0 = chr(s.g, rail);
  run(s, 6);
  check(`coming into the dining car (room ${s.g.roomId}) and standing still, the sleepers and the windows move at once`, s.g.roomId === SIB.gravy && chr(s.g, rail) !== at0 && ringText(s.g, 0) !== ring);
  check('no animation of the train rooms waits for him: only the platform\'s car has a column to run from', WORLD.charAnims.filter((a) => a.room !== ROOM.station).every((a) => a.fromCol === undefined));
}

// ---- elsewhere nothing moves, and Monty on the Run has no animation -------------------------------------------
{
  const s = at(SIB.pines, 8, 17);
  run(s, 60);
  check('a room that is not the train\'s has no character animation but the game\'s own', s.g.charAnims.length === 0);
  check('Monty on the Run has none', MOTR.charAnims.length === 0 && WORLD.charAnims.every((a) => new Set<number>([ROOM.station, SIB.gravy, SIB.sleeper, SIB.coal]).has(a.room)));
}
finish();
