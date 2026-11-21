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
import { WHEEL_FRAMES } from '../src/art/siberia-tiles';
import { WORLD } from '../src/data';
import { decorIndex } from '../src/layout';
import { ROOM } from '../src/moscow';
import { SIB } from '../src/siberia';
import { newGame } from './bot';
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
  const rail = cellAt(s.g, 20, 19), wheel = cellAt(s.g, 4, 18);
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

// ---- elsewhere nothing moves, and Monty on the Run has no animation -------------------------------------------
{
  const s = at(SIB.pines, 8, 17);
  run(s, 60);
  check('a room that is not the train\'s has no character animation but the game\'s own', s.g.charAnims.length === 0);
  check('Monty on the Run has none', MOTR.charAnims.length === 0 && WORLD.charAnims.every((a) => new Set<number>([ROOM.station, SIB.gravy, SIB.sleeper, SIB.coal]).has(a.room)));
}
finish();
