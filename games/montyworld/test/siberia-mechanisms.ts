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
import { CART, CRACKS, MINE_CART, SHAFT_CODE, SHAFT_LEDGES, SHAFT_STONE, SIB, SIBERIA_ICICLES, SIBERIA_ROOMS, SIBERIA_PULSES, TUNNELS, YETI } from '../src/siberia';
import { newGame } from '../../shared/monty/test/bot';
import { search } from './search';
import { at, cell, colOf, dead, diesAt, LEFT, RIGHT, rowText, run } from './mech-kit';
import { DRAGON } from '../src/china';
import { piecePlace, lapFrames } from '../../montyotr/src/dragons';
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
  check('a mountain in each of the dining car and the sleeper, each from the front of the train (the right, the way the scenery goes by in the other direction), never from behind; ice is only where the lake is', TUNNELS.length === 2 && TUNNELS.every((t) => (t.room === SIB.gravy || t.room === SIB.sleeper) && t.from === 'right') && CRACKS.every((c) => c.room === SIB.lake));
  const rooms = creatureRooms(SIBERIA_ROOMS);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in Siberia's nine rooms, none in more than two (${[...rooms.values()].map((v) => v.size).join(' ')})`, rooms.size >= 7 && rooms.size <= 12 && most <= 2);
  // Chris: no room after room of two walkers to jump over: the creatures move in varied ways (horizontal on a floor, up and down, a mechanism in place of a walker)
  const horizontal = SIBERIA_ROOMS.map((r) => (r.enemies ?? []).filter((e) => e.dir === 0 || e.dir === 1).length);
  const vertical = SIBERIA_ROOMS.map((r) => (r.enemies ?? []).filter((e) => e.dir === 3 || e.dir === 4).length);
  const bare = SIBERIA_ROOMS.filter((r) => (r.enemies ?? []).length === 0).length;
  check(`creatures vary: no two rooms in a row with two walkers (walkers a room ${horizontal.join(' ')}), up-and-down patrols in ${vertical.filter((n) => n > 0).length} rooms (${vertical.join(' ')}), ${bare} rooms with a mechanism or a big creature and no walker`,
    horizontal.every((n, i) => n < 2 || (horizontal[i + 1] ?? 0) < 2) && vertical.filter((n) => n > 0).length >= 4 && bare >= 1);
}

// ---- the tunnel mouths ---------------------------------------------------------------------------
{
  const mouth = must(TUNNELS[0], 'the dining car\'s mouth');
  const first = mouth.rest + (mouth.offset ?? 0); // frames until the edge flashes
  const TUNNELS_ROCK = must(mouth.picture?.[3]?.[10], 'a cell of the rock');
  const sweepFrom = first + mouth.warn;
  // standing on the roof at the left end: it reaches him a long way into the sweep; standing in the car, never
  const sweepTotal = (32 + mouth.cols) * mouth.step;
  {
    const s = at(SIB.gravy, 2, 9);
    const when = diesAt(s, NONE, sweepFrom + mouth.step * 40);
    const reach = sweepFrom + mouth.step * (32 - 4);
    check(`on the roof at the left end the mountain's portal kills him ${when - sweepFrom} frames into its sweep (it crosses the room, a cell every ${mouth.step} frames)`, when >= reach - mouth.step * 6 && when <= reach + mouth.step * 4);
  }
  {
    const s = at(SIB.gravy, 28, 9);
    const when = diesAt(s, NONE, sweepFrom + mouth.step * 12);
    check(`on the roof at the right end it comes in at once: death ${when - sweepFrom} frames into the sweep, and not before the edge has flashed for its ${mouth.warn} frames (${first}-${sweepFrom})`, when >= sweepFrom && when <= sweepFrom + mouth.step * 6);
  }
  // seen before it comes: the edge flashes, the portal's granite and the rock are on the screen, a long mass running off the screen's edge
  {
    const s = at(SIB.gravy, 2, 9);
    let flash = false, portal = false, mass = 0;
    const rows = (code: number) => Array.from({ length: 32 }, (_, c) => cell(s.g, c, mouth.top + 3) === code).filter(Boolean).length;
    for (let f = 0; f < sweepFrom + mouth.step * 20 && !dead(s.g); f++) {
      frame(s, NONE);
      if (f > first && f < sweepFrom && cell(s.g, 31, mouth.top + 3) === mouth.code) flash = true;
      if (f > sweepFrom + mouth.step * 8) { if (rows(mouth.code) > 0) portal = true; mass = Math.max(mass, rows(TUNNELS_ROCK)); }
    }
    check(`it is warned of (its edge flashes at the entry) and seen on the way: the granite portal at its leading edge and behind it a mass of rock, ${mass} cells of a row of 32 and on off the screen's edge`, flash && portal && mass >= 12);
  }
  // the hatch: down the rope (the roof's gap), under the roof, safe for the whole of two cycles; and the car's floor
  {
    const s = at(SIB.gravy, 12, 17);
    run(s, NONE, 2 * (sweepFrom + sweepTotal));
    check('in the car under the roof (the hatch\'s rope, the floor) nothing happens to him in two whole cycles', !dead(s.g));
  }
  // a mountain that is gone: the roof is clear again, and what it covered is as it was
  {
    const s = at(SIB.gravy, 12, 17);
    const before = Array.from({ length: 32 * 7 }, (_, i) => cell(s.g, i % 32, 2 + Math.floor(i / 32)));
    run(s, NONE, sweepFrom + sweepTotal + 5);
    const after = Array.from({ length: 32 * 7 }, (_, i) => cell(s.g, i % 32, 2 + Math.floor(i / 32)));
    check('and when it has gone by, the sky above the roof is exactly as it was', before.join() === after.join());
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

  // the mine cart: a float over the flooded working. How far a jump goes (from flat snow), and the gap the cart leaves at each dock
  const jump = at(SIB.border, 10, 17);
  const y0 = jump.g.y, x0 = jump.g.x2;
  let airborne = false, span = 0;
  for (let f = 0; f < 140; f++) {
    frame(jump, { ...RIGHT, fire: f === 0 });
    if (jump.g.y !== y0) airborne = true;
    else if (airborne) break;
    span = ((jump.g.x2 - x0 + 256) & 0xff) >> 2;
  }
  const travel = CART.span.to - CART.span.from + 1 - CART.w;
  const dockGap = CART.span.to - CART.span.from + 1 - CART.w;
  check(`a jump carries him ${span} cells; the working is ${CART.span.to - CART.span.from + 1} wide and the cart at one dock leaves ${dockGap} of it open: no way across without the cart (the cart travels ${travel} cells)`, dockGap > span + 1);
  const ride = at(SIB.mine, 17, 18, [], true);
  run(ride, LEFT, 24);
  const aboard = colOf(ride.g);
  run(ride, NONE, 150);
  check(`stepping onto the cart at the east dock (column ${aboard}) it carries him across: after its crossing he is at column ${colOf(ride.g)}, on the floor, alive`, aboard >= 13 && colOf(ride.g) <= CART.span.from + 4 && ride.g.y === standY(18) && !dead(ride.g));
  run(ride, LEFT, 60);
  check(`and he walks off at the far side into the lamp's pocket (column ${colOf(ride.g)}), the lamp his`, colOf(ride.g) <= 4 && ride.g.y === standY(18) && ride.g.siCollected[itemIndex(ride.g, SIB.mine, 0)] !== 0);
  const there = search(at(SIB.mine, 17, 18), (g) => g.roomId === SIB.mine && colOf(g) <= 4 && g.y === standY(18), [{ room: SIB.mine, col: 3, row: 16 }], 300000, 1.5);
  const back = search(at(SIB.mine, 3, 18), (g) => g.roomId === SIB.mine && colOf(g) >= 17 && g.y === standY(18), [{ room: SIB.mine, col: 19, row: 16 }], 300000, 1.5);
  check(`the bot finds the way there (${there ? there.nodes : 'none'} states) and the way back (${back ? back.nodes : 'none'}): the cart carries him both ways`, there !== null && back !== null);
  // and it is not on the way along the gantry: walking the gantry's whole length either way never touches it
  {
    const walk = at(SIB.mine, 11, 7, [], true);
    for (let f = 0; f < 140; f++) frame(walk, LEFT);
    for (let f = 0; f < 140; f++) frame(walk, RIGHT);
    check(`walking the gantry both ways he stays on it (y ${walk.g.y} of ${standY(7)})`, walk.g.y === standY(7) || walk.g.gameMode === 0);
  }
  check(`the cart is a float with a bouncing cycle (rests ${MINE_CART.bounce?.hold} cells' time at each end)`, MINE_CART.bounce !== undefined && MINE_CART.room === SIB.mine);
}

// ---- the yeti, the snow, the icicle ---------------------------------------------------------------------
{
  // the yeti is four sprites moving as one: its pieces keep their offsets from the first all the way round, and no two ever disagree about where the body is
  const lap = lapFrames(YETI);
  let steady = true, minY = 999, maxY = 0, minX = 999, maxX = 0;
  for (let t = 0; t < lap; t += 3) {
    const [x0, y0] = piecePlace(YETI, 0, t);
    YETI.pieces.forEach((piece, i) => {
      const [x, y] = piecePlace(YETI, i, t);
      if (!piece.rigid || Math.abs(x - x0 - piece.rigid[0]) > 0.01 || Math.abs(y - y0 - piece.rigid[1]) > 0.01) steady = false;
    });
    minY = Math.min(minY, y0); maxY = Math.max(maxY, y0); minX = Math.min(minX, x0); maxX = Math.max(maxX, x0);
  }
  check(`the yeti's four sprites keep their places as one body round the whole lap of ${lap} frames (it is 48 by 42, six cells by five: more than 2 by 2 of Monty's size)`, steady && YETI.pieces.length === 4);
  check(`its loop runs from the floor lane to the bridge lane (${((maxY - minY) / 8).toFixed(1)} rows apart) and across ${((maxX - minX) / 8).toFixed(1)} cells`, maxY - minY >= 8 * 6 && maxX - minX >= 8 * 8);
  // it kills what of Monty it touches: on the floor in front of it, not on the safe zones at the right
  const s = at(SIB.yeti, 14, 17);
  let died = -1;
  for (let f = 0; f < lap * 2 && died < 0; f++) { frame(s, NONE); if (dead(s.g)) died = f; }
  check(`it prowls through the floor lane: standing there for two laps he is caught (frame ${died})`, died >= 0);
  const safe = at(SIB.yeti, 29, 17);
  run(safe, NONE, lap * 2);
  check('and the right-hand safe zone, where he comes in, is never touched in two laps', !dead(safe.g));
  const enter = at(SIB.yeti, 28, 17);
  const up = search(enter, (g) => g.roomId === SIB.yeti && colOf(g) <= 7 && g.y === standY(9), undefined, 400000, 0);
  check(`the bot finds the way over the ice bridge to its left end (${up ? up.nodes + ' states' : 'none'})`, up !== null);
  // the sprites: the yeti uses four of the room's, not the item's (0), the icicle's (1), his (3) or the hat's (7)
  const used = YETI.pieces.map((p) => p.sprite);
  check(`it takes sprites ${used.join(', ')}: none that the pelmeni (0), the icicle (1), Monty (3) or his hat (7) need, and the room has no creatures to want any`, used.every((n) => ![0, 1, 3, 7].includes(n)) && SIBERIA_ROOMS.find((r) => r.id === SIB.yeti)?.enemies === undefined);
  check('the cave has one icicle (sprite 1)', SIBERIA_ICICLES.length === 1 && SIBERIA_ICICLES[0]?.room === SIB.yeti);
  const china = DRAGON.pieces.map((p) => p.sprite);
  check(`China's dragon is as it was: a chain of ${china.length}, none rigid`, DRAGON.pieces.every((p) => !p.rigid));
}
{
  // the snow slides off the boughs: harmless at rest, warned by the flakes trembling, then a lump falls down the three stretches and kills on the ground lane
  const fall = SIBERIA_PULSES.filter((p) => p.col === 10);
  const low = must(fall[2], 'the lowest stretch');
  const s = at(SIB.pines, 10, 17);
  let when = -1;
  for (let f = 0; f < 700 && when < 0; f++) { frame(s, NONE); if (dead(s.g)) when = f; }
  check(`standing under the bough he is struck by the falling lump (frame ${when}, the stretch's start at ${low.start} of a period of ${low.period})`, when >= low.start && when <= low.period + low.start + low.live);
  const free = at(SIB.pines, 25, 17);
  run(free, NONE, 600);
  check('and a place out from under the boughs is untouched', !dead(free.g));
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
  check('the tender\'s rope climbs up into the mine\'s gallery', reach(at(SIB.coal, 22, 10), { room: SIB.coal, col: 24, row: 0 }, (g) => g.roomId === SIB.mine, 300000) !== null);
  check('and the mine\'s gap lets him down it into the tender again', reach(at(SIB.mine, 21, 18), { room: SIB.mine, col: 24, row: 19 }, (g) => g.roomId === SIB.coal, 300000) !== null);
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
