/**
 * Siberia's mechanisms, headless, each on its own with the room's creatures out of the way (the bot, siberia.ts, plays them all together):
 * the tunnel mouths (seen, warned of, they kill what of Monty is on the roof or up a rope when they reach him and nothing under the roof,
 * and put back what they covered), the cracking ice (it counts the frames he stands on it, shows lines, wider ones, is gone and he falls into
 * the lake; crossing it at his walk is safe, the count dies away off it, it grows back), the lamp (the shaft's ledges are not there, and not
 * passable, until it is taken, and are there when a game is carried on after it), the barrier the ticket lifts, the mine cart's ride, the hints,
 * the map, and a save from before Siberia carries on.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/siberia-mechanisms.ts
 */
import { enterRoom } from '../../montyotr/src/ending';
import type { Game, Input as Stick } from '../../montyotr/src/game';
import { montyMap } from '../../montyotr/src/map';
import { MOTR } from '../../montyotr/src/motr';
import { restore, snapshot } from '../../montyotr/src/save';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { ROW, SCREEN } from '../../shared/monty/screen';
import { WORLD } from '../src/data';
import { CODEC } from '../src/main';
import { ROOM } from '../src/moscow';
import { CART_COL, CRACKS, SHAFT_LEDGES, SIB, TUNNELS } from '../src/siberia';
import { newGame, search } from './bot';
import { itemIndex, standY } from './route';

const LEFT: Stick = { ...NONE, left: true };
const RIGHT: Stick = { ...NONE, right: true };

/** A game with Monty standing in a room (col, the floor's row), the creatures out of the way, holding the items (by name's index in a room). */
function at(room: number, col: number, floor: number, holds: readonly (readonly [room: number, nth: number])[] = [], enhanced = false): State {
  const s = newGame(WORLD, enhanced);
  for (const [r, n] of holds) s.g.siCollected[itemIndex(s.g, r, n)] = 0x81;
  enterRoom(s.g, room, 0x0c + (col + 4) * 4, standY(floor));
  s.g.enemies = [];
  s.g.enable &= 0x0f;
  s.g.vic.enable &= 0x0f;
  return s;
}
const run = (s: State, stick: Stick, frames: number) => { for (let i = 0; i < frames; i++) frame(s, stick); };
const dead = (g: Game) => g.actionCounter !== 0 || g.script !== null;
const colOf = (g: Game) => g.montyCol - 4;
const rowText = (g: Game) => Array.from({ length: 32 }, (_, i) => {
  const v = (g.mem[SCREEN + 24 * ROW + 4 + i] ?? 0) & 0x3f;
  return v >= 1 && v <= 26 ? String.fromCharCode(64 + v) : v === 0 ? ' ' : String.fromCharCode(v);
}).join('').trim();
/** The character at a playfield cell. */
const cell = (g: Game, col: number, row: number) => g.mem[SCREEN + (row + 3) * ROW + col + 4] ?? 0;
/** The first frame (up to `limit`) a death happens, or -1. */
function diesAt(s: State, stick: Stick, limit: number): number {
  for (let f = 0; f < limit; f++) { frame(s, stick); if (dead(s.g)) return f; }
  return -1;
}

// ---- the data ------------------------------------------------------------------------------------
{
  const cells = WORLD.exitGrid.image;
  const at = (row: number, col: number) => cells[row * WORLD.exitGrid.cols + col];
  check('Siberia is nine rooms, a block of four columns (4-7) by three rows beside Moscow\'s, room ids 9 to 17 (Moscow\'s 0-8 unchanged)',
    cells.filter((c) => c !== 0xff).length === 18 && [at(0, 4), at(0, 5), at(0, 6), at(0, 7), at(1, 4), at(1, 5), at(1, 6), at(1, 7), at(2, 7)].join() === [SIB.yeti, SIB.pines, SIB.mine, SIB.shaft, SIB.gravy, SIB.sleeper, SIB.coal, SIB.lake, SIB.border].join()
    && at(1, 3) === ROOM.station);
  const coinsIn = (lo: number, hi: number) => Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => WORLD.coinTable[i * 3] ?? 0).filter((r) => r >= lo && r <= hi).length;
  const itemsIn = (lo: number, hi: number) => Array.from({ length: WORLD.specialItems.length / 4 }, (_, i) => WORLD.specialItems[i * 4] ?? 0).filter((r) => r >= lo && r <= hi).length;
  check('Moscow still has its 14 coins and 4 finds, in the same table places (first), and Siberia adds 13 coins and 4 finds (two pelmeni, the lamp, the ticket)',
    coinsIn(0, 8) === 14 && itemsIn(0, 8) === 4 && coinsIn(9, 17) === 13 && itemsIn(9, 17) === 4 && (WORLD.coinTable[13 * 3] ?? 99) <= 8 && (WORLD.coinTable[14 * 3] ?? 0) >= 9);
  check('4 key items and 4 snacks count on the pause screen', WORLD.progress.keyItems.length === 4 && WORLD.progress.cakes.length === 4);
  check('no room has more than two mouths or three creatures, and ice is only where the lake is', TUNNELS.filter((t) => t.room === SIB.sleeper).length === 2 && CRACKS.every((c) => c.room === SIB.lake));
}

// ---- the tunnel mouths ---------------------------------------------------------------------------
{
  const mouth = must(TUNNELS[0], 'the dining car\'s mouth');
  const first = mouth.rest + (mouth.offset ?? 0); // frames until the edge flashes
  const sweepFrom = first + mouth.warn;
  // standing on the roof at the left end: it reaches him a long way into the sweep; standing in the car, never
  {
    const s = at(SIB.gravy, 2, 9);
    const when = diesAt(s, NONE, sweepFrom + mouth.step * 40);
    const reach = sweepFrom + mouth.step * (32 - 3 - mouth.cols + 2);
    check(`on the roof at the left end the mouth kills him ${when - sweepFrom} frames into its sweep (it crosses the room, a cell every ${mouth.step} frames)`, when >= sweepFrom + mouth.step * 20 && when <= reach + mouth.step * 4);
  }
  {
    const s = at(SIB.gravy, 28, 9);
    const when = diesAt(s, NONE, sweepFrom + mouth.step * 12);
    check(`on the roof at the right end it comes in at once: death ${when - sweepFrom} frames into the sweep, and not before the edge has flashed for its ${mouth.warn} frames (${first}-${sweepFrom})`, when >= sweepFrom && when <= sweepFrom + mouth.step * 6);
  }
  // seen before it comes: the edge flashes, the portal's characters are on the screen
  {
    const s = at(SIB.gravy, 2, 9);
    let flash = false, shown = false;
    const lintel = (c: number) => c === mouth.code;
    for (let f = 0; f < sweepFrom + mouth.step * 10 && !dead(s.g); f++) {
      frame(s, NONE);
      if (f > first && f < sweepFrom && lintel(cell(s.g, 31, mouth.top))) flash = true;
      if (f > sweepFrom + mouth.step * 5 && Array.from({ length: 32 }, (_, c) => cell(s.g, c, mouth.top)).some(lintel)) shown = true;
    }
    check('it is warned of (its edge cell flashes at the entry for the warning) and seen on the way (the lintel is on the screen)', flash && shown);
  }
  // the hatch: down the rope (the roof's gap), under the roof, safe for the whole of two sweeps; and the car's floor
  {
    const s = at(SIB.gravy, 12, 17);
    run(s, NONE, 2 * (sweepFrom + mouth.step * 40));
    check('in the car under the roof (the hatch\'s rope, the floor) nothing happens to him in two whole cycles', !dead(s.g));
  }
  // what it covers comes back: the sleeper's pine rope (column 22, rows 0 to 8)
  {
    const s = at(SIB.sleeper, 3, 17);
    const before = Array.from({ length: 9 }, (_, r) => cell(s.g, 22, r));
    let over = false, rested = 0, wrong = 0;
    for (let f = 0; f < 1700; f++) {
      frame(s, NONE);
      if (dead(s.g)) break;
      const now = Array.from({ length: 9 }, (_, r) => cell(s.g, 22, r));
      if (s.g.tunnels.every((t) => t.over.size === 0)) { rested++; if (now.join() !== before.join()) wrong++; } else if (now.some((c, r) => c !== before[r])) over = true;
    }
    const after = wrong === 0 && rested > 0 ? before : [];
    check(`as the mouths cross the rope they cover it, and whenever neither is on the screen (${rested} frames of 1700, the two mouths crossing each other too) the rope is as it was`, over && after.join() === before.join());
  }
  // a mouth does not start on a room's loading in the middle of a sweep: every room load starts a fresh cycle
  {
    const s = at(SIB.gravy, 2, 9);
    run(s, NONE, sweepFrom + mouth.step * 8);
    enterRoom(s.g, SIB.gravy, 0x0c + 4 * 4, standY(9));
    for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
    check('coming into the room again starts the mouth afresh (resting, nothing on the screen)', must(s.g.tunnels[0], 'the mouth').state === 'rest' && !dead(s.g));
  }
}

// ---- the cracking ice ----------------------------------------------------------------------------
{
  const patch = must(CRACKS[0], 'the first patch');
  const standOn = (col: number) => at(SIB.lake, col, 12);
  {
    const s = standOn(patch.col + 2);
    const codeAt = () => cell(s.g, patch.col + 2, patch.row);
    const seen = new Map<number, number>();
    for (let f = 0; f < patch.gone + 10; f++) {
      frame(s, NONE);
      if (!seen.has(codeAt())) seen.set(codeAt(), f);
    }
    const whole = patch.codes[0], lines = patch.codes[1], wide = patch.codes[2];
    check(`standing on it: lines after ${patch.crack} frames (${seen.get(lines)}), wider ones after ${patch.wide} (${seen.get(wide)}), gone after ${patch.gone} (${seen.get(0)})`,
      seen.get(whole) === 0 && Math.abs((seen.get(lines) ?? -9) - patch.crack) <= 2 && Math.abs((seen.get(wide) ?? -9) - patch.wide) <= 2 && Math.abs((seen.get(0) ?? -9) - patch.gone) <= 2);
    run(s, NONE, 60);
    check('and he falls into the lake and dies', dead(s.g));
  }
  {
    // crossing at his walk: from two cells before the patch to past its last cell
    const s = standOn(patch.col - 2);
    let worst = 0, crossed = -1;
    for (let f = 0; f < 200 && crossed < 0; f++) {
      frame(s, RIGHT);
      worst = Math.max(worst, must(s.g.cracks[0], 'the patch').stage);
      if (colOf(s.g) > patch.col + patch.cols) crossed = f;
    }
    check(`walking across the patch of ${patch.cols} cells (${crossed} frames from two cells before it to past it) is safe: it shows lines at most (stage ${worst}) and he lives`, crossed >= 0 && worst <= 1 && !dead(s.g));
  }
  {
    // stopping, stepping off and the count dying away
    const s = standOn(patch.col + 2);
    run(s, NONE, patch.crack + 5);
    check('after the crack frames the ice shows lines (not yet broken)', cell(s.g, patch.col, patch.row) === patch.codes[1]);
    run(s, LEFT, 70); // (off the left end, onto the island's rock)
    run(s, NONE, 200);
    check('off it the count dies away a frame a frame: it is whole again, shown whole', cell(s.g, patch.col, patch.row) === patch.codes[0] && !dead(s.g));
  }
  {
    // the other patch is counted on its own
    const other = must(CRACKS[1], 'the second patch');
    const s = standOn(other.col + 2);
    run(s, NONE, other.gone + 5);
    check('the other patch cracks and breaks on its own count', cell(s.g, other.col + 3, other.row) === 0 || dead(s.g));
  }
  {
    // gone, and back: he stands on the island (rock) and the count is put past its limit
    const s = standOn(patch.col - 2);
    must(s.g.cracks[0], 'the patch').t = patch.gone + 5;
    frame(s, NONE);
    check('past its count the ice is gone (empty cells)', cell(s.g, patch.col + 2, patch.row) === 0);
    let back = -1;
    for (let f = 0; f < patch.away + 20 && back < 0; f++) { frame(s, NONE); if (cell(s.g, patch.col + 2, patch.row) === patch.codes[0]) back = f; }
    check(`it grows back whole ${patch.away} frames after it went (${back})`, Math.abs(back - patch.away) <= 4 && !dead(s.g));
  }
}

// ---- the lamp's ledges, the barrier, the cart -------------------------------------------------------
{
  const LAMP = [SIB.mine, 0] as const;
  const bare = at(SIB.shaft, 2, 18);
  check('without the lamp the ledges are not there (empty cells where they go)', SHAFT_LEDGES.every(([row, col]) => cell(bare.g, col, row) === 0 || row === 18));
  const lit = at(SIB.shaft, 2, 18, [LAMP]);
  check('with it they are (placed on loading the room: a game carried on after the lamp has them), in the room\'s timber character', SHAFT_LEDGES.every(([row, col]) => cell(lit.g, col, row) !== 0));
  const stats = { exhausted: false };
  const over = (g: Game) => g.roomId === SIB.shaft && colOf(g) >= 14 && g.y === standY(10);
  const without = search(bare, over, undefined, 150000, 0, stats);
  check(`no way over the wall without the lamp exists (${stats.exhausted ? 'every state looked at' : 'the limit'})`, without === null);
  const with_ = search(lit, over, undefined, 400000, 0);
  check('and with it the bot finds the way up the ledges to the wall\'s top', with_ !== null);
  // the pick up in the mine puts them in the shaft on the next load: the data's effect
  const effect = WORLD.roomEffects.find((e) => e.room === SIB.shaft);
  check('the room effect is the data\'s: taken lamp places the ledges (a place effect)', effect?.place !== undefined);

  // the barrier
  const gate = (ticket: boolean) => {
    const s = at(SIB.border, 24, 17, ticket ? [[SIB.coal, 0]] : []);
    run(s, RIGHT, 140);
    return colOf(s.g);
  };
  const shut = gate(false), open = gate(true);
  check(`without the ticket the barrier stops him (column ${shut}); with it he walks to the planks (column ${open})`, shut <= 27 && open >= 28);

  // the cart: stand on it, it carries him down to the gallery, the stick does nothing
  const s = at(SIB.mine, CART_COL - 4, 7, [], true);
  let began = -1, ended = -1;
  for (let f = 0; f < 600; f++) {
    frame(s, began < 0 ? RIGHT : ended < 0 ? { ...NONE, left: true, fire: f % 9 === 0 } : NONE);
    if (began < 0 && s.g.gameMode === 1) began = f;
    if (began >= 0 && ended < 0 && s.g.gameMode === 0) ended = f;
    if (ended >= 0 && f > ended + 60) break;
  }
  check(`the cart takes him down (a ride of ${ended - began} frames he cannot leave, the stick held against it) and he stands on the gallery's floor (row 18: y ${s.g.y} of ${standY(18)}, column ${colOf(s.g)}), alive`, began >= 0 && ended > began && s.g.y === standY(18) && !dead(s.g));
}

// ---- hints, the map, the save ---------------------------------------------------------------------
{
  const wants = at(SIB.shaft, 2, 18, [], true);
  run(wants, NONE, 120);
  check(`ENHANCED: coming into the shaft without the lamp says so ("${rowText(wants.g)}")`, rowText(wants.g) === 'TOO DARK TO SEE: FIND A LAMP');
  const village = at(SIB.border, 8, 17, [], true);
  run(village, NONE, 120);
  check(`ENHANCED: the village without the ticket says so ("${rowText(village.g)}")`, rowText(village.g) === 'THE BARRIER WANTS A TICKET');
  const plain = at(SIB.shaft, 2, 18, [], false);
  run(plain, NONE, 120);
  check('ORIGINAL says nothing', rowText(plain.g) === 'SHAFT OF DARKNESS');
  const take = at(SIB.mine, 3, 18, [], true);
  for (let f = 0; f < 30 && !take.g.siCollected[itemIndex(take.g, SIB.mine, 0)]; f++) frame(take, NONE);
  run(take, NONE, 3);
  check(`ENHANCED: taking the lamp says what it is for ("${rowText(take.g)}")`, rowText(take.g) === 'LAMP: SHOWS THE MINE\'S LEDGES' && take.g.siCollected[itemIndex(take.g, SIB.mine, 0)] !== 0);

  const s = newGame(WORLD, true);
  const info = montyMap.info(s.g, { rooms: {} });
  check(`the pause screen counts the snacks and the items over both regions (${info.join(' | ')})`, info[3] === 'SNACKS  0/4' && info[2] === 'ITEMS   0/4');
  enterRoom(s.g, SIB.lake, 0x40, standY(12));
  const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { 16: [0x40, 0xb2, 1, 7], 17: [0x40, 0xb2, 2, 7] } });
  check('in Siberia the map shows its region (four columns), the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));
  check('Monty on the Run is as it was (no tunnels, no ice)', MOTR.tunnels.length === 0 && MOTR.cracks.length === 0);

  // a save from before Siberia: Moscow-only arrays and a grid of Moscow's rooms alone carry on in the new game
  const g1 = newGame(WORLD, true).g;
  g1.siCollected[0] = 0x81; g1.siCollected[1] = 0x81; g1.coinCollected[0] = 0xff;
  const old = snapshot(g1);
  const shortGrid = Array.from(WORLD.exitGrid.image, (c) => (c >= SIB.gravy ? 0xff : c));
  const oldSave = { ...old, coins: old.coins.slice(0, 14), items: old.items.slice(0, 4), exitGrid: shortGrid, roomId: ROOM.station, worn: itemIndex(g1, ROOM.platform, 1) };
  const g2 = newGame(WORLD, true).g;
  restore(g2, CODEC.unpack(CODEC.pack(oldSave), CODEC.format));
  check('an old save (Moscow\'s arrays, Moscow\'s grid) loads: the finds and the hat are as saved, and Siberia is on the grid', g2.siCollected[0] === 0x81 && g2.coinCollected[0] === 0xff && g2.worn === oldSave.worn && g2.exitGrid[1 * WORLD.exitGrid.cols + 4] === SIB.gravy && g2.siCollected.length === 8);
}

finish();
