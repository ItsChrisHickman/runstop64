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
import type { Game } from '../../montyotr/src/game';
import { montyMap } from '../../montyotr/src/map';
import { MOTR } from '../../montyotr/src/motr';
import { restore, snapshot } from '../../montyotr/src/save';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { WORLD } from '../src/data';
import { CODEC } from '../src/main';
import { ROOM } from '../src/moscow';
import { CART_COL, CART_FLOOR, CRACKS, SHAFT_CODE, SHAFT_LEDGES, SHAFT_STONE, SIB, SIBERIA_ROOMS, TUNNELS } from '../src/siberia';
import { newGame, search } from './bot';
import { at, cell, colOf, dead, diesAt, LEFT, RIGHT, rowText, run } from './mech-kit';
import { CHI } from '../src/china';
import { creatureRooms, itemIndex, standY } from './route';

// ---- the data ------------------------------------------------------------------------------------
{
  const cells = WORLD.exitGrid.image;
  const at = (row: number, col: number) => cells[row * WORLD.exitGrid.cols + col];
  check('Siberia is nine rooms, a block of four columns (4-7) by three rows beside Moscow\'s, room ids 9 to 17 (Moscow\'s 0-8 unchanged)',
    cells.filter((c) => c !== 0xff && c < CHI.wall).length === 18 && [at(0, 4), at(0, 5), at(0, 6), at(0, 7), at(1, 4), at(1, 5), at(1, 6), at(1, 7), at(2, 7)].join() === [SIB.yeti, SIB.pines, SIB.mine, SIB.shaft, SIB.gravy, SIB.sleeper, SIB.coal, SIB.lake, SIB.border].join()
    && at(1, 3) === ROOM.station);
  const coinsIn = (lo: number, hi: number) => Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => WORLD.coinTable[i * 3] ?? 0).filter((r) => r >= lo && r <= hi).length;
  const itemsIn = (lo: number, hi: number) => Array.from({ length: WORLD.specialItems.length / 4 }, (_, i) => WORLD.specialItems[i * 4] ?? 0).filter((r) => r >= lo && r <= hi).length;
  check('Moscow still has its 14 coins and 4 finds, in the same table places (first), and Siberia adds 13 coins and 4 finds (two pelmeni, the lamp, the ticket)',
    coinsIn(0, 8) === 14 && itemsIn(0, 8) === 4 && coinsIn(9, 17) === 13 && itemsIn(9, 17) === 4 && (WORLD.coinTable[13 * 3] ?? 99) <= 8 && (WORLD.coinTable[14 * 3] ?? 0) >= 9);
  check('4 key items and 4 snacks of Moscow\'s and Siberia\'s count on the pause screen (China\'s follow them in the lists)', WORLD.progress.keyItems.length >= 4 && WORLD.progress.cakes.length >= 4);
  check('no room has more than two mouths, and ice is only where the lake is', TUNNELS.filter((t) => t.room === SIB.sleeper).length === 2 && TUNNELS.every((t) => t.room === SIB.gravy || t.room === SIB.sleeper) && CRACKS.every((c) => c.room === SIB.lake));
  const rooms = creatureRooms(SIBERIA_ROOMS);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in Siberia's nine rooms, none in more than two (${[...rooms.values()].map((v) => v.size).join(' ')})`, rooms.size >= 8 && rooms.size <= 12 && most <= 2);
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
    run(s, LEFT, 40); // (off the left end, onto the island's rock: not on to the second patch, which would break under him in the 200 frames after)
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
  check('without the lamp the ledges are not there (their cells are the dim dots of a ledge felt in the dark, not the timber; the stone in the pit is water)', SHAFT_LEDGES.every(([row, col]) => cell(bare.g, col, row) !== SHAFT_CODE && cell(bare.g, col, row) !== 0) && SHAFT_STONE.every(([row, col]) => cell(bare.g, col, row) !== SHAFT_CODE));
  const lit = at(SIB.shaft, 2, 18, [LAMP]);
  check('with it they are (placed on loading the room: a game carried on after the lamp has them), in the room\'s timber character', [...SHAFT_LEDGES, ...SHAFT_STONE].every(([row, col]) => cell(lit.g, col, row) === SHAFT_CODE));
  // the gate is proved shut by the jump's height (a search of every state he can reach in the room has more than three million: it does not finish):
  // his jump rises `rise` pixels, the wall's top is six rows (48 pixels) over the rock step the way in has, so with no ledge he cannot be over it
  const arc = WORLD.jumpArc;
  let rise = 0;
  for (let i = 0; i < arc.length && arc[i] !== 0xff; i++) rise += arc[i] ?? 0;
  const over = (g: Game) => g.roomId === SIB.shaft && colOf(g) >= 14 && g.y === standY(11);
  check(`no way over the wall without the lamp: a jump rises ${rise} pixels, and from the rock step (floor 17) to the wall's top (floor 11) is ${(17 - 11) * 8}`, rise < (17 - 11) * 8 && rise >= 8 * 2);
  const stats = { exhausted: false };
  const without = search(bare, over, undefined, 150000, 0, stats);
  check('and the bot, given 150000 states, finds none (a pointer, not the proof)', without === null);
  const with_ = search(lit, over, undefined, 400000, 0);
  check('and with it the bot finds the way up the ledges to the wall\'s top', with_ !== null);
  // the pick up in the mine puts them in the shaft on the next load: the data's effect
  const effect = WORLD.roomEffects.find((e) => e.room === SIB.shaft);
  check('the room effect is the data\'s: taken lamp places the ledges (a place effect)', effect?.place !== undefined);

  // the barrier
  const gate = (ticket: boolean) => {
    const s = at(SIB.border, 24, 17, ticket ? [[SIB.coal, 0]] : []);
    run(s, RIGHT, 140);
    return s.g.roomId === SIB.border ? colOf(s.g) : 99; // (99: he has walked out east, onto the wall's foot)
  };
  const shut = gate(false), open = gate(true);
  check(`without the ticket the barrier stops him (column ${shut}); with it he walks through and out east into China (${open === 99 ? 'room ' + CHI.wall : 'column ' + open})`, shut <= 27 && open === 99);

  // the cart: hangs off the west end of the high shelf; walk onto it, it carries him down to the gallery, the stick does nothing
  const s = at(SIB.mine, CART_COL + 4, CART_FLOOR, [], true);
  let began = -1, ended = -1;
  for (let f = 0; f < 600; f++) {
    frame(s, began < 0 ? LEFT : ended < 0 ? { ...NONE, right: true, fire: f % 9 === 0 } : NONE);
    if (began < 0 && s.g.gameMode === 1) began = f;
    if (began >= 0 && ended < 0 && s.g.gameMode === 0) ended = f;
    if (ended >= 0 && f > ended + 60) break;
  }
  check(`the cart takes him down from the shelf's end (a ride of ${ended - began} frames he cannot leave, the stick held against it) and he stands on the gallery's floor (row 18: y ${s.g.y} of ${standY(18)}, column ${colOf(s.g)}), alive`, began >= 0 && ended > began && s.g.y === standY(18) && !dead(s.g));
  // and it is not on the way along the gantry (M's west way in to the rope): walking the gantry's whole length either way never takes it
  {
    const walk = at(SIB.mine, 11, 7, [], true);
    let grabbed = false;
    for (let f = 0; f < 140; f++) { frame(walk, LEFT); if (walk.g.gameMode === 1) grabbed = true; }
    for (let f = 0; f < 140; f++) { frame(walk, RIGHT); if (walk.g.gameMode === 1) grabbed = true; }
    check(`walking the gantry both ways he is never taken by the cart (still on the gantry: y ${walk.g.y} of ${standY(7)})`, !grabbed && walk.g.y === standY(7));
  }
}

// ---- the joins: loops, the way back, no trap -----------------------------------------------------------
{
  const reach = (from: State, aim: { room: number; col: number; row: number }, goal: (g: Game) => boolean, limit = 400000) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], limit, 1.5);
  // the cars' interiors are a lane of their own under the roof: from inside the dining car, through the gangway, into the sleeper's corridor and on into the tender's pocket
  check('under the roof: from inside the dining car through the gangway into the sleeper', reach(at(SIB.gravy, 26, 17), { room: SIB.gravy, col: 31, row: 16 }, (g) => g.roomId === SIB.sleeper && g.y === standY(17)) !== null);
  check('and from the sleeper\'s corridor through the next gangway into the tender\'s pocket', reach(at(SIB.sleeper, 26, 17), { room: SIB.sleeper, col: 31, row: 16 }, (g) => g.roomId === SIB.coal && g.y === standY(17)) !== null);
  check('and back west the same way (the tender to the sleeper to the dining car)',
    reach(at(SIB.coal, 3, 17), { room: SIB.coal, col: 0, row: 16 }, (g) => g.roomId === SIB.sleeper) !== null && reach(at(SIB.sleeper, 3, 17), { room: SIB.sleeper, col: 0, row: 16 }, (g) => g.roomId === SIB.gravy) !== null);
  // the loop: tender to the mine by the rope through its floor and back
  check('the tender\'s rope climbs up into the mine\'s gallery', reach(at(SIB.coal, 7, 11), { room: SIB.coal, col: 8, row: 0 }, (g) => g.roomId === SIB.mine, 300000) !== null);
  check('and the mine\'s gap lets him down it into the tender again', reach(at(SIB.mine, 6, 18), { room: SIB.mine, col: 8, row: 19 }, (g) => g.roomId === SIB.coal, 300000) !== null);
  // the roof's way back west to Moscow's station
  {
    const s = at(SIB.gravy, 6, 9);
    run(s, LEFT, 80);
    check(`the dining car's roof walks west back to Moscow's station (room ${s.g.roomId})`, s.g.roomId === ROOM.station);
  }
  // no trap: from the village without the ticket he can climb back to the lake and up through the shaft's floor into the shaft
  check('from the village, with no ticket, he can climb back up to the lake and into the shaft (the drop is a rope both ways)',
    reach(at(SIB.border, 5, 17), { room: SIB.lake, col: 28, row: 0 }, (g) => g.roomId === SIB.shaft, 600000) !== null);
  // the barrier: four rows high (32 pixels), more than a jump rises, so without the ticket he cannot pass it; with it he does
  {
    const arc = WORLD.jumpArc;
    let rise = 0;
    for (let i = 0; i < arc.length && arc[i] !== 0xff; i++) rise += arc[i] ?? 0;
    const past = (g: Game) => g.roomId === SIB.border && colOf(g) >= 28;
    check(`the barrier is four rows (${4 * 8} pixels) and a jump rises ${rise}: without the ticket there is no way over it; the bot finds none within 150000 states either`, rise < 4 * 8 && search(at(SIB.border, 24, 17), past, undefined, 150000, 0) === null);
    check('and with the ticket he gets through', search(at(SIB.border, 22, 17, [[SIB.coal, 0]]), past, undefined, 200000, 0) !== null);
  }
}

// ---- hints, the map, the save ---------------------------------------------------------------------
{
  const wants = at(SIB.shaft, 2, 18, [], true);
  run(wants, NONE, 120);
  check(`ENHANCED: coming into the shaft without the lamp says so ("${rowText(wants.g)}")`, rowText(wants.g) === 'TOO DARK TO SEE THE LEDGES');
  const village = at(SIB.border, 8, 17, [], true);
  run(village, NONE, 120);
  check(`ENHANCED: the village without the ticket says so ("${rowText(village.g)}")`, rowText(village.g) === 'THE INSPECTOR CHECKS TICKETS');
  const plain = at(SIB.shaft, 2, 18, [], false);
  run(plain, NONE, 120);
  check('ORIGINAL says nothing', rowText(plain.g) === 'SHAFT OF DARKNESS');
  const take = at(SIB.mine, 3, 18, [], true);
  for (let f = 0; f < 30 && !take.g.siCollected[itemIndex(take.g, SIB.mine, 0)]; f++) frame(take, NONE);
  run(take, NONE, 3);
  check(`ENHANCED: taking the lamp says what it is for ("${rowText(take.g)}")`, rowText(take.g) === 'LAMP LIGHT SHOWS THE LEDGES' && take.g.siCollected[itemIndex(take.g, SIB.mine, 0)] !== 0);

  const s = newGame(WORLD, true);
  const info = montyMap.info(s.g, { rooms: {} });
  check(`the pause screen counts the snacks and the items over every region (${info.join(' | ')})`, info[3] === 'SNACKS 0/23' && info[2] === 'ITEMS  0/19');
  enterRoom(s.g, SIB.lake, 0x40, standY(12));
  const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { 16: [0x40, 0xb2, 1, 7], 17: [0x40, 0xb2, 2, 7] } });
  check('in Siberia the map shows its region (four columns), the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));
  check('Monty on the Run is as it was (no tunnels, no ice)', MOTR.tunnels.length === 0 && MOTR.cracks.length === 0);

  // a save made on coming into each of Siberia's rooms (the lamp taken, so the shaft's ledges have to be placed on loading) carries on
  {
    const spots = [[SIB.gravy, 2, 9], [SIB.sleeper, 2, 9], [SIB.coal, 2, 9], [SIB.pines, 22, 17], [SIB.yeti, 26, 17], [SIB.mine, 2, 7], [SIB.shaft, 2, 18], [SIB.lake, 27, 12], [SIB.border, 8, 17]] as const;
    const carried = spots.filter(([room, col, floor]) => {
      const a = newGame(WORLD, false);
      a.g.siCollected[itemIndex(a.g, SIB.mine, 0)] = 0x81;
      enterRoom(a.g, room, 0x0c + (col + 4) * 4, standY(floor));
      for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
      const b = newGame(WORLD, false);
      restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
      run(b, NONE, 4);
      b.g.enemies = [];
      b.g.enable &= 0x0f;
      b.g.vic.enable &= 0x0f;
      run(b, NONE, 120);
      return b.g.roomId === room && !dead(b.g) && b.g.siCollected[itemIndex(b.g, SIB.mine, 0)] !== 0;
    }).length;
    check(`a save made on coming into each of Siberia's nine rooms packs, unpacks and carries on in the same room, alive (${carried} of ${spots.length})`, carried === spots.length);
  }

  // a save from before Siberia: Moscow-only arrays and a grid of Moscow's rooms alone carry on in the new game
  const g1 = newGame(WORLD, true).g;
  g1.siCollected[0] = 0x81; g1.siCollected[1] = 0x81; g1.coinCollected[0] = 0xff;
  const old = snapshot(g1);
  const shortGrid = Array.from(WORLD.exitGrid.image, (c) => (c >= SIB.gravy ? 0xff : c));
  const oldSave = { ...old, coins: old.coins.slice(0, 14), items: old.items.slice(0, 4), exitGrid: shortGrid, roomId: ROOM.station, worn: itemIndex(g1, ROOM.platform, 1) };
  const g2 = newGame(WORLD, true).g;
  restore(g2, CODEC.unpack(CODEC.pack(oldSave), CODEC.format));
  check('an old save (Moscow\'s arrays, Moscow\'s grid) loads: the finds and the hat are as saved, and Siberia is on the grid', g2.siCollected[0] === 0x81 && g2.coinCollected[0] === 0xff && g2.worn === oldSave.worn && g2.exitGrid[1 * WORLD.exitGrid.cols + 4] === SIB.gravy && g2.siCollected.length === WORLD.specialItems.length / 4);
}

finish();
