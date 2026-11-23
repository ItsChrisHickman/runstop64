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
import { SIB, SIBERIA_ROOMS } from '../src/siberia';
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
for (const [name, room, pieces] of [
  ['dining car', SIB.gravy, ['horizonDark', 'moon', 'star']], ['sleeper', SIB.sleeper, ['horizonDark', 'moon', 'star']], ['tender', SIB.coal, ['horizonDark', 'smoke', 'moon']],
  ['platform', ROOM.station, ['horizon', 'wires', 'moon', 'star']],
] as const) {
  const first = decorChars(WORLD, room);
  check(`${name}: the sky's pieces all fit in the room's characters (none dropped as the pool ran out)`, pieces.every((d) => (first[decorIndex(d)] ?? 0) > 0));
}
check('Siberia\'s cars have the calm night: the dark horizon (no white peaks) and no poles or wires; Moscow\'s platform keeps its own', [SIB.gravy, SIB.sleeper, SIB.coal].every((room) => {
  const first = decorChars(WORLD, room);
  return !first[decorIndex('wires')] && !first[decorIndex('horizon')];
}));
{
  const s = at(SIB.gravy, 8, 17);
  const g = s.g;
  const start = { mountains: [decorRow(g, 'horizonDark', 2, 0), decorRow(g, 'horizonDark', 2, 1)], pines: decorRow(g, 'horizonDark', 2, 2) };
  const mountains = () => [decorRow(g, 'horizonDark', 2, 0), decorRow(g, 'horizonDark', 2, 1)];
  run(s, 2 * 8);
  check('after 8 steps the mountains have crept (a pixel every fourth step) and so have the pines in front of them (every second)',
    mountains().join() !== start.mountains.join() && decorRow(g, 'horizonDark', 2, 2) !== start.pines);
  run(s, 2 * 24);
  check('after 32 steps the pines (16 pixels a round) are back and the mountains (8 of their 16) are not',
    decorRow(g, 'horizonDark', 2, 2) === start.pines && mountains().join() !== start.mountains.join());
  run(s, 2 * 32);
  check('after 64 steps the mountains are back as well: the slowest of all', mountains().join() === start.mountains.join());
}
{
  // the tender's smoke: 32 pixels a round, a pixel every step (the pace of the windows' scenery)
  const s = at(SIB.coal, 3, 17);
  const smoke0 = decorRow(s.g, 'smoke', 4, 0);
  run(s, 2 * 16);
  const half = decorRow(s.g, 'smoke', 4, 0);
  run(s, 2 * 16);
  check('the tender\'s smoke is half a round on at 16 steps and back at 32', half !== smoke0 && decorRow(s.g, 'smoke', 4, 0) === smoke0);
}
{
  // nothing it draws is solid: the sky's cells (rows 2-8) are decoration characters or empty, and a room tile only where the room's own map has one (the sleeper's pine, banks and
  // bunker; the tender's bunker, tipple and the hill)
  const bad: string[] = [];
  for (const [name, room] of [['dining car', SIB.gravy], ['sleeper', SIB.sleeper], ['tender', SIB.coal]] as const) {
    const s = at(room, 8, 17);
    const map = SIBERIA_ROOMS.find((r) => r.id === room)?.map ?? [];
    for (let row = 2; row <= 8; row++) for (let col = 0; col < 32; col++) {
      const c = cellAt(s.g, col, row);
      const tile = c >= 1 && c <= 8;
      const coin = SIBERIA_ROOMS.find((r) => r.id === room)?.coins?.some(([cc, cr]) => cc === col && cr === row) === true;
      if (!coin && tile !== ((map[row]?.[col] ?? '.') !== '.')) bad.push(`${name}: cell ${col},${row} is ${c}`);
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
  const poles = decorRow(aboard.g, 'wires', 4, 0);
  run(aboard, 8);
  check('and moves once he is (the horizon and its poles)', decorRow(aboard.g, 'horizon', 2, 2) !== ring && decorRow(aboard.g, 'wires', 4, 0) !== poles);
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
  const s = at(SIB.yeti, 24, 17);
  run(s, 60);
  check('a room that is not the train\'s has no character animation but the game\'s own', s.g.charAnims.length === 0);
  // (other regions animate characters of their own now: Japan's trains, Rio's grill and dancers; only Monty on the Run must have none)
  check('Monty on the Run has none, and every train room animates', MOTR.charAnims.length === 0 && [ROOM.station, SIB.gravy, SIB.sleeper, SIB.coal].every((r) => WORLD.charAnims.some((a) => a.room === r)));
}
// ---- the backdrop runs unbroken ----------------------------------------------------------------------------------
{
  // across each car's horizon band (rows 6-8; Siberia's calm night has no poles or wires above it) and the visible width (columns -2 to 33) no cell is empty: something is drawn in it (the backdrop,
  // or a tile or rope of the room that stands in front of it). The tender's horizon is only the stretch between its bunker and the tipple's leg (the boards and the legs stand in front elsewhere).
  for (const [name, room, from, to] of [['dining car', SIB.gravy, -2, 33], ['sleeper', SIB.sleeper, -2, 33], ['tender', SIB.coal, 4, 15]] as const) {
    const s = at(room, 8, 17);
    const empty: string[] = [];
    const bare: readonly (readonly [number, number])[] = [];
    for (let row = 6; row <= 8; row++) for (let col = from; col <= to; col++) {
      if (cellAt(s.g, col, row) === 0 && !bare.some(([c, r]) => c === col && r === row)) empty.push(`${col},${row}`);
    }
    check(`${name}: the sky band has no empty cell (${empty.join(' ') || 'none'})`, empty.length === 0);
  }
}
finish();
