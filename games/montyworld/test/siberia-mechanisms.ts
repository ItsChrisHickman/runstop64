/**
 * Siberia's mechanisms and its puzzle, headless, each on its own with the room's creatures out of the way unless a check says otherwise (the bot, siberia.ts, plays them all
 * together): the data (six rooms, retired ids, coins with reasons), the mountains (seen, warned of, deadly on the roof and up the pine, never under the roof), the sleeper's roof
 * run (a run straight to the pine is caught, one shelter in the closet and it is made), the train's two lanes (sealed from each other in the sleeper, joined only by the dining
 * car's hatches; the roof ends at the bunker; the inspector keeps the corridor until the ticket), the yeti's loop (never where he comes in), the mine cart, the river's cracking
 * ice, the joins both ways (no trap), the hints, the map and the saves.
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
import { CART, CLOSET, CRACKS, GANGWAYS, INSPECTOR_SLOT, MINE_CART, MINE_LADDER, MINE_ROPE, PINE, RIVER, SIB, SIBERIA_ICICLES, SIBERIA_ROOMS, TUNNELS, YETI } from '../src/siberia';
import { newGame } from '../../shared/monty/test/bot';
import { search } from './search';
import { at, cell, colOf, dead, diesAt, LEFT, RIGHT, UP, rowText, run } from './mech-kit';
import { piecePlace, lapFrames } from '../../montyotr/src/dragons';
import { CHI } from '../src/china';
import { creatureRooms, itemIndex, standY } from './route';

const DOWN = { ...NONE, down: true };
/** The roof's walkway row. */
const CAR_ROOF = 9;
/** The ticket, by the room it lies in. */
const TICKET = [SIB.yeti, 0] as const;
const roomOf = (id: number) => must(SIBERIA_ROOMS.find((r) => r.id === id), `room ${id}`);
/** The collision class of a room's tile at a playfield cell (0 for an empty cell). */
const classAt = (id: number, col: number, row: number) => {
  const r = roomOf(id), ch = r.map[row]?.[col] ?? '.';
  return ch === '.' ? 0 : WORLD.tileProperty(r.tiles[Number(ch) - 1] ?? 0);
};
/** How high his jump rises, in pixels. */
const RISE = (() => { let rise = 0; for (let i = 0; i < WORLD.jumpArc.length && WORLD.jumpArc[i] !== 0xff; i++) rise += WORLD.jumpArc[i] ?? 0; return rise; })();

// ---- the data ------------------------------------------------------------------------------------
{
  const cells = WORLD.exitGrid.image;
  const grid = (row: number, col: number) => cells[row * WORLD.exitGrid.cols + col];
  const block = [grid(0, 4), grid(0, 5), grid(0, 6), grid(0, 7), grid(1, 4), grid(1, 5), grid(1, 6), grid(1, 7), grid(2, 4), grid(2, 5), grid(2, 6), grid(2, 7)];
  check('Siberia is six rooms at columns 4-7 beside Moscow\'s: the cave over the sleeper, the train and the mine in row 1, the river under the mine; ids 9, 10, 11, 13, 14 and 17 (12, 15 and 16 retired: nothing has them), Moscow\'s 0-8 and China\'s 18 on where they were',
    block.join() === [0xff, SIB.yeti, 0xff, 0xff, SIB.gravy, SIB.sleeper, SIB.coal, SIB.mine, 0xff, 0xff, 0xff, SIB.border].join() && grid(1, 3) === ROOM.station && grid(2, 8) === CHI.wall
    && ![12, 15, 16].some((id) => cells.includes(id)) && SIBERIA_ROOMS.length === 6);
  const coinsIn = (lo: number, hi: number) => Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => WORLD.coinTable[i * 3] ?? 0).filter((r) => r >= lo && r <= hi).length;
  const itemsIn = (lo: number, hi: number) => Array.from({ length: WORLD.specialItems.length / 4 }, (_, i) => WORLD.specialItems[i * 4] ?? 0).filter((r) => r >= lo && r <= hi).length;
  check('Moscow still has its 14 coins and 4 finds, first in the tables; Siberia adds 8 coins and 2 finds (the pelmeni and the ticket)',
    coinsIn(0, 8) === 14 && itemsIn(0, 8) === 4 && coinsIn(9, 17) === 8 && itemsIn(9, 17) === 2 && (WORLD.coinTable[13 * 3] ?? 99) <= 8 && (WORLD.coinTable[14 * 3] ?? 0) >= 9);
  const perRoom = SIBERIA_ROOMS.map((r) => (r.coins ?? []).length);
  check(`no room has more than three coins, about one a room as Monty on the Run's (${perRoom.join(' ')})`, perRoom.every((n) => n <= 3) && perRoom.reduce((a, b) => a + b, 0) === 8);
  check('the ticket is a key item and the pelmeni a snack on the pause screen; the lamp is gone', WORLD.progress.keyItems.includes(itemIndex(newGame(WORLD, false).g, SIB.yeti, 0)) && WORLD.progress.cakes.includes(itemIndex(newGame(WORLD, false).g, SIB.gravy, 0)));
  check('a mountain in each of the dining car and the sleeper, from the front of the train (the right), never from behind; the ice is only on the river', TUNNELS.length === 2 && TUNNELS.every((t) => (t.room === SIB.gravy || t.room === SIB.sleeper) && t.from === 'right') && CRACKS.every((c) => c.room === SIB.border && c.row === 17));
  const rooms = creatureRooms(SIBERIA_ROOMS);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in Siberia's rooms (and the yeti), none in more than two (${[...rooms.values()].map((v) => v.size).join(' ')})`, rooms.size >= 5 && most <= 2);
  check('no room has more than three creatures (the ushanka is worn through Siberia: a fourth would be a phantom)', SIBERIA_ROOMS.every((r) => (r.enemies ?? []).length <= 3));
  const vertical = SIBERIA_ROOMS.map((r) => (r.enemies ?? []).filter((e) => e.dir === 3 || e.dir === 4).length);
  check(`creatures vary: up-and-down patrols in ${vertical.filter((n) => n > 0).length} of the six rooms (${vertical.join(' ')}), and one room with a big creature and no other`, vertical.filter((n) => n > 0).length >= 4 && SIBERIA_ROOMS.filter((r) => (r.enemies ?? []).length === 0).length === 1);
}

// ---- the layout: no decoration over a solid, floor or rope cell, no coin or find in one or under a decoration -------------------------------------------------------------
{
  const bad: string[] = [];
  for (const r of SIBERIA_ROOMS) {
    const covered = new Set<string>();
    for (const d of r.decor ?? []) {
      const t = typeof d.type === 'number' ? WORLD.decorTypes[d.type] : undefined;
      if (!t) continue;
      for (let rr = 0; rr < t.h; rr++) for (let cc = 0; cc < t.w; cc++) {
        const col = d.col - 4 + cc, row = d.row - 3 + rr;
        if (col < 0 || col > 31 || row < 0 || row > 19) continue;
        if (classAt(r.id, col, row) !== 0) bad.push(`${r.id}: a decoration (type ${d.type}) over a tile at ${col},${row}`);
        covered.add(col + ',' + row);
      }
    }
    for (const [col, row] of r.coins ?? []) if (classAt(r.id, col, row) !== 0 || covered.has(col + ',' + row)) bad.push(`${r.id}: coin ${col},${row} in a tile or under a decoration`);
    if (r.item) {
      const col = r.item.col - 4, row = r.item.row - 3;
      for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) if (covered.has(col + dc + ',' + (row + dr))) bad.push(`${r.id}: ${r.item.name} under a decoration`);
    }
  }
  check(`no decoration over a solid, floor or rope cell and no coin or find in one or under a decoration (${bad.slice(0, 5).join('; ') || 'none wrong'})`, bad.length === 0);
}

// ---- the mountains --------------------------------------------------------------------------------
{
  const mouth = must(TUNNELS[0], 'the dining car\'s mouth');
  const first = mouth.rest + (mouth.offset ?? 0); // frames until the edge flashes
  const rockCode = must(mouth.picture?.[3]?.[10], 'a cell of the rock');
  const sweepFrom = first + mouth.warn;
  const sweepTotal = (32 + mouth.cols) * mouth.step;
  {
    const s = at(SIB.gravy, 2, 9);
    const when = diesAt(s, NONE, sweepFrom + mouth.step * 40);
    const reach = sweepFrom + mouth.step * (32 - 4);
    check(`dining car: on the roof at the left end the mountain's portal kills him ${when - sweepFrom} frames into its sweep (a cell every ${mouth.step} frames)`, when >= reach - mouth.step * 6 && when <= reach + mouth.step * 4);
  }
  {
    const s = at(SIB.gravy, 28, 9);
    const when = diesAt(s, NONE, sweepFrom + mouth.step * 12);
    check(`on the roof at the right end it comes in at once: death ${when - sweepFrom} frames into the sweep, and not before the edge has flashed for its ${mouth.warn} frames`, when >= sweepFrom && when <= sweepFrom + mouth.step * 6);
  }
  {
    const s = at(SIB.gravy, 2, 9);
    let flash = false, portal = false, mass = 0;
    const rows = (code: number) => Array.from({ length: 32 }, (_, c) => cell(s.g, c, mouth.top + 3) === code).filter(Boolean).length;
    for (let f = 0; f < sweepFrom + mouth.step * 20 && !dead(s.g); f++) {
      frame(s, NONE);
      if (f > first && f < sweepFrom && cell(s.g, 31, mouth.top + 3) === mouth.code) flash = true;
      if (f > sweepFrom + mouth.step * 8) { if (rows(mouth.code) > 0) portal = true; mass = Math.max(mass, rows(rockCode)); }
    }
    check(`it is warned of (its edge flashes at the entry) and seen on the way: the granite portal and behind it a mass of rock, ${mass} cells of a row and on off the screen's edge`, flash && portal && mass >= 12);
  }
  {
    const s = at(SIB.gravy, 12, 17);
    run(s, NONE, 2 * (sweepFrom + sweepTotal));
    check('in the car under the roof nothing happens to him in two whole cycles', !dead(s.g));
    const ladder = at(SIB.gravy, 12, 9);
    run(ladder, DOWN, 18); // two rungs down the first hatch: where its coin is
    const y = ladder.g.y;
    run(ladder, NONE, sweepFrom + sweepTotal);
    check(`two rungs down the hatch's ladder (y ${y}, the coin's place) he waits out a whole sweep`, !dead(ladder.g) && ladder.g.onRope !== 0 && y > standY(9));
  }
  {
    const s = at(SIB.gravy, 12, 17);
    const before = Array.from({ length: 32 * 7 }, (_, i) => cell(s.g, i % 32, 2 + Math.floor(i / 32)));
    run(s, NONE, sweepFrom + sweepTotal + 5);
    const after = Array.from({ length: 32 * 7 }, (_, i) => cell(s.g, i % 32, 2 + Math.floor(i / 32)));
    check('and when it has gone by, the sky above the roof is exactly as it was', before.join() === after.join());
  }
  {
    // what it covers comes back: the sleeper's pine (rows 0 to 8)
    const s = at(SIB.sleeper, 3, 17);
    const col = PINE.cols[0];
    const before = Array.from({ length: 9 }, (_, r) => cell(s.g, col, r));
    let over = false, rested = 0, wrong = 0;
    for (let f = 0; f < 1700; f++) {
      frame(s, NONE);
      if (dead(s.g)) break;
      const now = Array.from({ length: 9 }, (_, r) => cell(s.g, col, r));
      if (s.g.tunnels.every((t) => t.over.size === 0)) { rested++; if (now.join() !== before.join()) wrong++; } else if (now.some((c, r) => c !== before[r])) over = true;
    }
    check(`the mountain covers the pine as it crosses it, and whenever it is off the screen (${rested} frames of 1700) the pine is as it was`, over && wrong === 0 && rested > 0);
  }
  {
    const s = at(SIB.gravy, 2, 9);
    run(s, NONE, sweepFrom + mouth.step * 8);
    enterRoom(s.g, SIB.gravy, 0x0c + 4 * 4, standY(9));
    for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
    check('coming into the room again starts the mountain afresh (resting, nothing on the screen)', must(s.g.tunnels[0], 'the mouth').state === 'rest' && !dead(s.g));
  }
}

// ---- the set piece: the sleeper's roof run ------------------------------------------------------------
{
  const mouth = must(TUNNELS[1], 'the sleeper\'s mountain');
  {
    // straight from the west end of the roof (where the dining car's roof brings him) to the pine and up it, as fast as he goes
    const s = at(SIB.sleeper, 0, 9);
    let f = 0;
    for (; f < 400 && colOf(s.g) < PINE.cols[0] && !dead(s.g); f++) frame(s, RIGHT);
    const there = f;
    for (; f < 800 && s.g.roomId === SIB.sleeper && !dead(s.g); f++) frame(s, UP);
    check(`a run straight along the sleeper's roof to the pine is caught: he is at its foot ${there} frames in and the mountain has him at frame ${f}`, dead(s.g) && s.g.roomId === SIB.sleeper);
  }
  {
    // one shelter: down into the closet, out as soon as the mountain's tail is past it, along to the pine and up
    const s = at(SIB.sleeper, 0, 9);
    let f = 0;
    for (; f < 400 && colOf(s.g) < CLOSET.hatch - 1; f++) frame(s, RIGHT);
    for (; f < 500 && s.g.y < standY(CLOSET.floor); f++) frame(s, DOWN);
    const inside = s.g.y === standY(CLOSET.floor) && !dead(s.g);
    const t = must(s.g.tunnels[0], 'the mountain');
    for (; f < 1400 && !dead(s.g) && !(t.state === 'sweep' && t.left + mouth.cols <= CLOSET.left); f++) frame(s, NONE);
    for (; f < 1600 && s.g.y > standY(9) && !dead(s.g); f++) frame(s, UP);
    for (; f < 1800 && colOf(s.g) < PINE.cols[0] && !dead(s.g); f++) frame(s, RIGHT);
    for (; f < 2000 && s.g.roomId === SIB.sleeper && !dead(s.g); f++) frame(s, UP);
    // the frames to spare: the next sweep is at column `left`, a cell every `step` frames from the pine
    const spare = t.state === 'sweep' ? (t.left - PINE.cols[1]) * mouth.step + (mouth.step - (t.t % mouth.step)) : 999;
    check(`one shelter in the closet (he is in it ${inside ? 'at once' : 'never'}), out as the tail goes by, and up the pine: he is in the yeti's cave at frame ${f} with ${spare} frames to spare before the next mountain is at the pine`,
      inside && s.g.roomId === SIB.yeti && !dead(s.g) && spare >= 20 && spare <= 140);
  }
  {
    const s = at(SIB.sleeper, CLOSET.hatch - 1, CLOSET.floor);
    run(s, NONE, 2 * 800);
    check('in the closet nothing reaches him through two whole cycles', !dead(s.g));
  }
}

// ---- the puzzle: the train's two lanes ---------------------------------------------------------------
{
  // the roof ends at the tender's coal: walking east along the sleeper's roof he stops at the bunker, and nothing of the tender is his that way
  const s = at(SIB.sleeper, 22, 9);
  run(s, RIGHT, 120);
  check(`the sleeper's roof ends at the tender's coal bunker: walking east he stops at column ${colOf(s.g)}`, s.g.roomId === SIB.sleeper && colOf(s.g) <= 28);
  // the roof and the corridor are sealed from each other in the sleeper: the only climbs under its roof are the closet's, walled and floored solid; from the corridor's floor (17)
  // to the roof's walkway (9) is far more than a jump
  const sleeper = roomOf(SIB.sleeper);
  const ropes: string[] = [];
  for (let row = 10; row <= 16; row++) for (let col = 0; col < 32; col++) if (classAt(SIB.sleeper, col, row) === 3) ropes.push(`${col},${row}`);
  const walled = [CLOSET.left, CLOSET.right].every((c) => [9, 10, 11, 12, 13].every((row) => classAt(SIB.sleeper, c, row) === 1))
    && Array.from({ length: CLOSET.right - CLOSET.left + 1 }, (_, i) => CLOSET.left + i).every((c) => classAt(SIB.sleeper, c, CLOSET.floor) === 1);
  check(`in the sleeper the roof and the corridor never meet: the only climbs below the roof are the closet's (${ropes.join(' ')}), which is walled and floored solid, and a jump rises ${RISE} pixels of the ${(17 - 9) * 8} between them`,
    ropes.every((p) => { const [c = -1, r = -1] = p.split(',').map(Number); return c === CLOSET.hatch && r < CLOSET.floor; }) && walled && RISE < (17 - 9) * 8 - 21 && sleeper.map.length === 20);
  {
    // a pointer, not the proof: with the dining car and the cave taken off his exit grid (so the way round by the dining car's hatches is not there), the bot finds no way from the
    // closet or the pine's foot down into the corridor
    const sealed = (col: number, floor: number) => {
      const s = at(SIB.sleeper, col, floor);
      s.g.exitGrid[1 * WORLD.exitGrid.cols + 4] = 0xff;
      s.g.exitGrid[0 * WORLD.exitGrid.cols + 5] = 0xff;
      return search(s, (g) => g.roomId === SIB.sleeper && g.y === standY(17), undefined, 150000, 0) === null;
    };
    check('with the dining car off the grid, the bot finds no way from the closet or the pine\'s foot down into the sleeper\'s corridor', sealed(CLOSET.hatch - 1, CLOSET.floor) && sealed(PINE.cols[0] - 1, CAR_ROOF));
  }
  // the inspector keeps the corridor: shut without the ticket, open with it, and he is gone
  for (const w of GANGWAYS) {
    const side = w.cols[0] <= 1 ? 0 : 31;
    const out = (st: State) => { run(st, side === 0 ? LEFT : RIGHT, 160); return st.g.roomId !== w.room; };
    check(`room ${w.room}: the gangway at its ${side === 0 ? 'west' : 'east'} end is shut without the ticket and open with it`, !out(at(w.room, side === 0 ? 4 : 27, 17)) && out(at(w.room, side === 0 ? 4 : 27, 17, [TICKET])));
  }
  {
    const s = at(SIB.sleeper, 24, 17, [], false, true);
    must(s.g.enemies[0], 'the provodnitsa').x = 0xff;
    run(s, RIGHT, 200);
    check(`the inspector stands in his gangway: walking into it he stops at column ${colOf(s.g)} and lives (he only bars the way)`, !dead(s.g) && s.g.roomId === SIB.sleeper && colOf(s.g) >= 27);
    const t = at(SIB.sleeper, 24, 17, [TICKET], false, true);
    check('with the ticket he has stepped out of the gangway', must(t.g.enemies[INSPECTOR_SLOT], 'the inspector').x === 0xff);
  }
  // the dining car's gangway is open without the ticket, both ways, and its hatches join its roof and its inside
  {
    const east = at(SIB.gravy, 27, 17);
    run(east, RIGHT, 80);
    const west = at(SIB.sleeper, 4, 17);
    run(west, LEFT, 80);
    check('the dining car\'s gangway into the sleeper\'s corridor is open, without the ticket, both ways', east.g.roomId === SIB.sleeper && west.g.roomId === SIB.gravy);
    const reach = (from: State, goal: (g: Game) => boolean, aim: { room: number; col: number; row: number }) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], 200000, 1.5) !== null;
    check('the dining car\'s hatches go down from its roof into the car and up again', reach(at(SIB.gravy, 6, 9), (g) => g.roomId === SIB.gravy && g.y === standY(17), { room: SIB.gravy, col: 12, row: 15 })
      && reach(at(SIB.gravy, 20, 17), (g) => g.roomId === SIB.gravy && g.y === standY(9), { room: SIB.gravy, col: 25, row: 7 }));
  }
}

// ---- the yeti and the icicle ---------------------------------------------------------------------------
{
  const lap = lapFrames(YETI);
  let steady = true, maxRight = 0, minY = 999, maxY = 0;
  const origin = piecePlace(YETI, 0, 0)[0] - (YETI.path[0]?.[0] ?? 0) * 8; // (sprite pixels from the playfield's left edge)
  for (let t = 0; t < lap; t += 2) {
    const [x0, y0] = piecePlace(YETI, 0, t);
    YETI.pieces.forEach((piece, i) => {
      const [x, y] = piecePlace(YETI, i, t);
      if (!piece.rigid || Math.abs(x - x0 - piece.rigid[0]) > 0.01 || Math.abs(y - y0 - piece.rigid[1]) > 0.01) steady = false;
    });
    maxRight = Math.max(maxRight, x0 - origin + 48); minY = Math.min(minY, y0); maxY = Math.max(maxY, y0);
  }
  check(`the yeti's four sprites keep their places as one body round its lap of ${lap} frames`, steady && YETI.pieces.length === 4);
  check(`its loop runs from the floor lane to the bridge lane (${((maxY - minY) / 8).toFixed(1)} rows) and never east of column ${(maxRight / 8).toFixed(1)}: the pine's gap (from ${PINE.cols[0] - 1}) and the stair are never in its way`, maxY - minY >= 8 * 6 && maxRight <= 17 * 8 + 4);
  const s = at(SIB.yeti, 10, 17);
  let died = -1;
  for (let f = 0; f < lap * 4 && died < 0; f++) { frame(s, NONE); if (dead(s.g)) died = f; }
  check(`it prowls the floor lane: standing there for four laps he is caught (frame ${died})`, died >= 0);
  const safe = at(SIB.yeti, 23, 17);
  run(safe, NONE, lap * 12);
  check('and where he comes up the pine (the floor east of its gap) is never touched in twelve laps, whatever it chooses', !dead(safe.g));
  {
    // it chooses: over a long stay it carries on, stands, turns back and charges, each warned by a roar; the same seed gives the same yeti
    const moods = YETI.moods;
    const watch = at(SIB.yeti, 23, 17);
    const seen = { roar: 0, rest: 0, back: 0, charge: 0 };
    let warnedAll = true, roarLen = 0, last = watch.g.dragons[0];
    for (let f = 0; f < lap * 12; f++) {
      frame(watch, NONE);
      const d = watch.g.dragons[0];
      if (!d || !last) continue;
      if (d.mode === 'roar') { roarLen++; } else {
        if (last.mode === 'roar') { seen.roar++; if (roarLen < (moods?.roar ?? 0)) warnedAll = false; if (d.then === 'back') seen.back++; if (d.then === 'charge') seen.charge++; if (d.then === 'rest') seen.rest++; }
        roarLen = 0;
      }
      last = { ...d };
    }
    check(`the yeti has moods: in twelve laps it roared ${seen.roar} times, then rested ${seen.rest}, turned back ${seen.back}, charged ${seen.charge}`, moods !== undefined && seen.rest > 0 && seen.back > 0 && seen.charge > 0);
    check(`every roar is a full ${moods?.roar} frames before it moves: the warning`, warnedAll);
    const again = at(SIB.yeti, 23, 17);
    run(again, NONE, lap * 12);
    check('and it is deterministic: the same seed, the same yeti', JSON.stringify(again.g.dragons) === JSON.stringify(watch.g.dragons));
  }
  const yeti = roomOf(SIB.yeti);
  const rock = (col: number, row: number) => classAt(SIB.yeti, col, row) === 1;
  check('the cave\'s edges are rock all round: its only way out is down the pine through the floor\'s gap', Array.from({ length: 32 }, (_, c) => c).every((c) => rock(c, 0) && (rock(c, 19) || (c >= PINE.cols[0] - 1 && c <= PINE.cols[1] + 1)))
    && Array.from({ length: 20 }, (_, r) => r).every((r) => rock(0, r) && rock(31, r)) && yeti.enemies === undefined);
  const used = YETI.pieces.map((p) => p.sprite);
  check(`it takes sprites ${used.join(', ')}: none that the ticket (0), the icicle (1), Monty (3) or his hat (7) need`, used.every((n) => ![0, 1, 3, 7].includes(n)));
  check('the cave has one icicle (sprite 1), over the ticket', SIBERIA_ICICLES.length === 1 && SIBERIA_ICICLES[0]?.room === SIB.yeti && Math.abs((SIBERIA_ICICLES[0]?.col ?? 0) - ((yeti.item?.col ?? 0) - 4)) <= 1);
  check('and back down from the ticket: over the bridge, down the stair, into the gap and down the pine into the sleeper (a dead end, never a trap)',
    search(at(SIB.yeti, 18, 5, [TICKET]), (g) => g.roomId === SIB.sleeper && !g.freeze && !g.script, [{ room: SIB.yeti, col: 20, row: 19 }], 400000, 1.5) !== null);
  check('the bot finds the way from the pine\'s top over the stair and the bridge to the ticket', search(at(SIB.yeti, 23, 17), (g) => g.roomId === SIB.yeti && g.siCollected[itemIndex(g, SIB.yeti, 0)] !== 0, [{ room: SIB.yeti, col: 18, row: 3 }], 400000, 1.5) !== null);
}

// ---- the mine cart ---------------------------------------------------------------------------------------
{
  const jump = at(SIB.border, 1, 17);
  const y0 = jump.g.y, x0 = jump.g.x2;
  let airborne = false, span = 0;
  for (let f = 0; f < 140; f++) {
    frame(jump, { ...RIGHT, fire: f === 0 });
    if (jump.g.y !== y0) airborne = true;
    else if (airborne) break;
    span = ((jump.g.x2 - x0 + 256) & 0xff) >> 2;
  }
  const dockGap = CART.span.to - CART.span.from + 1 - CART.w;
  check(`a jump carries him ${span} cells; the working is ${CART.span.to - CART.span.from + 1} wide and the cart at one dock leaves ${dockGap} of it open: no way across without the cart`, dockGap > span + 1);
  const ride = at(SIB.mine, 22, 18, [], true);
  run(ride, LEFT, 24);
  const aboard = colOf(ride.g);
  run(ride, NONE, 150);
  check(`stepping onto the cart at the east dock (column ${aboard}) it carries him across: after its crossing he is at column ${colOf(ride.g)}, on it, alive`, aboard <= CART.span.to && colOf(ride.g) <= CART.span.from + 3 && ride.g.y === standY(18) && !dead(ride.g));
  const there = search(at(SIB.mine, 22, 18), (g) => g.roomId === SIB.mine && colOf(g) <= 3 && g.y === standY(18), [{ room: SIB.mine, col: 2, row: 16 }], 300000, 1.5);
  const back = search(at(SIB.mine, 2, 18), (g) => g.roomId === SIB.mine && colOf(g) >= 21 && g.y === standY(18), [{ room: SIB.mine, col: 23, row: 16 }], 300000, 1.5);
  check(`the bot finds the way west by the cart to the west dock (${there ? there.nodes : 'none'} states) and back (${back ? back.nodes : 'none'}): the cart carries him both ways`, there !== null && back !== null);
  {
    const walk = at(SIB.mine, 3, 4, [], true);
    run(walk, RIGHT, 220);
    check(`walking east along the gantry he stays on it to its end (column ${colOf(walk.g)}, y ${walk.g.y} of ${standY(4)})`, walk.g.y === standY(4) || walk.g.onRope !== 0);
  }
  check('the cart is a float with a bouncing cycle', MINE_CART.bounce !== undefined && MINE_CART.room === SIB.mine);
  const mine = roomOf(SIB.mine);
  check('the mine\'s ladder and rope go through gaps three wide, the ladder and the rope in their middles', MINE_LADDER.gap[1] - MINE_LADDER.gap[0] === 2 && MINE_LADDER.col === MINE_LADDER.gap[0] + 1 && MINE_ROPE.gap[1] - MINE_ROPE.gap[0] === 2 && MINE_ROPE.col === MINE_ROPE.gap[0] + 1
    && [MINE_LADDER.gap[0], MINE_LADDER.gap[1]].every((c) => classAt(SIB.mine, c, 4) === 0) && mine.map.length === 20);
}

// ---- the river's cracking ice ----------------------------------------------------------------------------
{
  const patch = must(CRACKS[0], 'the first stretch');
  const standOn = (col: number) => at(SIB.border, col, 17);
  {
    const s = standOn(patch.col + 2);
    const codeAt = () => cell(s.g, patch.col + 2, patch.row);
    const seen = new Map<number, number>();
    let fell = false;
    for (let f = 0; f < patch.gone + 80; f++) {
      frame(s, NONE);
      if (!seen.has(codeAt())) seen.set(codeAt(), f);
      if (dead(s.g)) fell = true;
    }
    const whole = patch.codes[0], lines = patch.codes[1], wide = patch.codes[2];
    check(`standing on the ice: lines after ${patch.crack} frames (${seen.get(lines)}), wider ones after ${patch.wide} (${seen.get(wide)}), gone after ${patch.gone}`,
      seen.get(whole) === 0 && Math.abs((seen.get(lines) ?? -9) - patch.crack) <= 2 && Math.abs((seen.get(wide) ?? -9) - patch.wide) <= 2 && seen.has(0) && Math.abs((seen.get(0) ?? -9) - patch.gone) <= 2);
    check('and he falls into the river and dies', fell);
  }
  {
    const s = standOn(patch.col - 2);
    let worst = 0, crossed = -1;
    for (let f = 0; f < 200 && crossed < 0; f++) {
      frame(s, RIGHT);
      worst = Math.max(worst, must(s.g.cracks[0], 'the stretch').stage);
      if (colOf(s.g) > patch.col + patch.cols) crossed = f;
    }
    check(`walking across the ${patch.cols} cells of ice (${crossed} frames) is safe: it shows lines at most (stage ${worst}) and he lives, on the sandbar`, crossed >= 0 && worst <= 1 && !dead(s.g));
    run(s, NONE, 400);
    check('on the sandbar he can stop as long as he likes', !dead(s.g) && colOf(s.g) >= RIVER.bar[0] - 1 && colOf(s.g) <= RIVER.bar[1]);
  }
  {
    const s = standOn(patch.col + 2);
    run(s, NONE, patch.crack + 5);
    check('after the crack frames the ice shows lines (not yet broken)', cell(s.g, patch.col, patch.row) === patch.codes[1]);
    run(s, LEFT, 40);
    run(s, NONE, 200);
    check('off it (back on the village bank) the count dies away: it is whole again', cell(s.g, patch.col, patch.row) === patch.codes[0] && !dead(s.g));
  }
  {
    const other = must(CRACKS[1], 'the second stretch');
    const s = standOn(other.col + 2);
    run(s, NONE, other.gone + 5);
    check('the other stretch cracks and breaks on its own count', cell(s.g, other.col + 3, other.row) === 0 || dead(s.g));
  }
  {
    const s = standOn(patch.col - 2);
    must(s.g.cracks[0], 'the stretch').t = patch.gone + 5;
    frame(s, NONE);
    const goneNow = cell(s.g, patch.col + 2, patch.row) !== patch.codes[0];
    let back = -1;
    for (let f = 0; f < patch.away + 20 && back < 0; f++) { frame(s, NONE); if (cell(s.g, patch.col + 2, patch.row) === patch.codes[0]) back = f; }
    check(`past its count the ice is gone, and grows back whole ${patch.away} frames after (${back})`, goneNow && Math.abs(back - patch.away) <= 4 && !dead(s.g));
  }
  {
    const s = at(SIB.border, 25, 17);
    run(s, RIGHT, 100);
    check(`the barrier is raised: from the far bank he walks east into China (room ${s.g.roomId}) without anything in his way`, s.g.roomId === CHI.wall);
  }
}

// ---- the joins: loops, the ways back, no trap -----------------------------------------------------------
{
  const reach = (from: State, aim: { room: number; col: number; row: number }, goal: (g: Game) => boolean, limit = 400000) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], limit, 1.5);
  const lands = (room: number, floors: readonly number[]) => (g: Game) => g.roomId === room && (g.onRope !== 0 || floors.some((f) => g.y === standY(f)));
  check('under the roof with the ticket: from inside the dining car through the sleeper\'s corridor into the tender\'s pocket',
    reach(at(SIB.gravy, 26, 17, [TICKET]), { room: SIB.gravy, col: 31, row: 16 }, (g) => g.roomId === SIB.sleeper && g.y === standY(17)) !== null
    && reach(at(SIB.sleeper, 24, 17, [TICKET]), { room: SIB.sleeper, col: 31, row: 16 }, (g) => g.roomId === SIB.coal && g.y === standY(17)) !== null);
  check('and back west the same way (the tender to the sleeper to the dining car)',
    reach(at(SIB.coal, 3, 17, [TICKET]), { room: SIB.coal, col: 0, row: 16 }, (g) => g.roomId === SIB.sleeper) !== null && reach(at(SIB.sleeper, 3, 17, [TICKET]), { room: SIB.sleeper, col: 0, row: 16 }, (g) => g.roomId === SIB.gravy) !== null);
  check('the tender\'s coal climbs to the cab\'s roof, its ladder to the tipple, and the tipple goes east into the mine\'s gantry',
    reach(at(SIB.coal, 3, 17), { room: SIB.coal, col: 31, row: 3 }, (g) => g.roomId === SIB.mine && g.y === standY(4), 600000) !== null);
  check('and the gantry goes back west onto the tipple and down its ladder to the cab\'s roof',
    reach(at(SIB.mine, 3, 4), { room: SIB.coal, col: 24, row: 9 }, (g) => g.roomId === SIB.coal && g.y === standY(11), 400000) !== null);
  check('the sleeper\'s pine climbs into the yeti\'s cave and the cave\'s gap lets him down it again (both ends on the trunk)',
    reach(at(SIB.sleeper, 22, 9), { room: SIB.sleeper, col: 20, row: 0 }, lands(SIB.yeti, [17]), 200000) !== null && reach(at(SIB.yeti, 23, 17), { room: SIB.yeti, col: 20, row: 19 }, lands(SIB.sleeper, [9]), 200000) !== null);
  check('the mine\'s rope goes down into the river\'s village and, no trap, up again from the bank into the mine',
    reach(at(SIB.mine, 2, 18), { room: SIB.mine, col: 5, row: 19 }, lands(SIB.border, [17]), 200000) !== null && reach(at(SIB.border, 3, 17), { room: SIB.border, col: 5, row: 0 }, lands(SIB.mine, [18]), 200000) !== null);
  {
    const s = at(SIB.gravy, 6, 9);
    run(s, LEFT, 80);
    check(`the dining car's roof walks west back to Moscow's station (room ${s.g.roomId})`, s.g.roomId === ROOM.station);
  }
}

// ---- hints, the map, the save ---------------------------------------------------------------------
{
  const wants = at(SIB.sleeper, 4, 17, [], true);
  run(wants, NONE, 120);
  check(`ENHANCED: the sleeper without the ticket says the inspector wants one ("${rowText(wants.g)}")`, rowText(wants.g) === 'THE INSPECTOR CHECKS TICKETS');
  const gravy = at(SIB.gravy, 4, 17, [], true);
  run(gravy, NONE, 120);
  const border = at(SIB.border, 3, 17, [], true);
  run(border, NONE, 120);
  check(`no other room of Siberia asks for it (the dining car: "${rowText(gravy.g)}", the river: "${rowText(border.g)}")`, rowText(gravy.g) === 'THE GRAVY TRAIN' && rowText(border.g) === 'BORDER LINE CASE');
  const plain = at(SIB.sleeper, 4, 17, [], false);
  run(plain, NONE, 120);
  check('ORIGINAL says nothing', rowText(plain.g) === 'SLEEPER HIT');
  const take = at(SIB.yeti, 17, 5, [], true);
  for (let f = 0; f < 60 && !take.g.siCollected[itemIndex(take.g, SIB.yeti, 0)]; f++) frame(take, RIGHT);
  run(take, NONE, 3);
  check(`ENHANCED: taking the ticket says what it is for ("${rowText(take.g)}")`, rowText(take.g) === 'A TICKET: THE INSPECTOR ASKS' && take.g.siCollected[itemIndex(take.g, SIB.yeti, 0)] !== 0);

  const s = newGame(WORLD, true);
  const info = montyMap.info(s.g, { rooms: {} });
  check(`the pause screen counts the snacks and the items over every region (${info.join(' | ')})`, info[3] === `SNACKS 0/${WORLD.progress.cakes.length}` && info[2] === `ITEMS  0/${WORLD.progress.keyItems.length}`);
  enterRoom(s.g, SIB.mine, 0x40, standY(4));
  const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { 14: [0x40, 0x52, 1, 7], 17: [0x40, 0xb2, 2, 7] } });
  check('in Siberia the map shows its region (four columns), the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));
  check('Monty on the Run is as it was (no tunnels, no ice)', MOTR.tunnels.length === 0 && MOTR.cracks.length === 0);

  // a save made on coming into each of Siberia's rooms (the ticket taken, so the gangways are opened on loading) carries on
  {
    const spots = [[SIB.gravy, 2, 9], [SIB.sleeper, 2, 9], [SIB.coal, 3, 17], [SIB.yeti, 23, 17], [SIB.mine, 2, 4], [SIB.border, 3, 17]] as const;
    const carried = spots.filter(([room, col, floor]) => {
      const a = newGame(WORLD, false);
      a.g.siCollected[itemIndex(a.g, SIB.yeti, 0)] = 0x81;
      enterRoom(a.g, room, 0x0c + (col + 4) * 4, standY(floor));
      for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
      const b = newGame(WORLD, false);
      restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
      run(b, NONE, 4);
      b.g.enemies = [];
      b.g.enable &= 0x0f;
      b.g.vic.enable &= 0x0f;
      run(b, NONE, 120);
      return b.g.roomId === room && !dead(b.g) && b.g.siCollected[itemIndex(b.g, SIB.yeti, 0)] !== 0;
    }).length;
    check(`a save made on coming into each of Siberia's six rooms packs, unpacks and carries on in the same room, alive (${carried} of ${spots.length})`, carried === spots.length);
  }

  // a save from before the reset (format 1: Siberia of nine rooms, 13 coins and 4 finds) moves on: Moscow's and the later regions' coins and finds to their new places, Siberia's
  // pelmeni and ticket kept, and a save made in a room of Siberia's (here the cut dark shaft, 15) carries on from the dining car's roof
  {
    const now = newGame(WORLD, true).g;
    const coins = Array.from({ length: now.coinCollected.length + 5 }, () => 0), items = Array.from({ length: now.siCollected.length + 2 }, () => 0);
    coins[3] = 0xff; coins[20] = 0xff; coins[27] = 0xff; items[1] = 0x81; items[5] = 0x81; items[7] = 0x81; items[8] = 0x81;
    const v1 = { ...snapshot(now), coins, items, roomId: 15, mapRow: 0, exitCol: 7, worn: itemIndex(now, CHI.top, 0) + 2 };
    const g = newGame(WORLD, true).g;
    restore(g, CODEC.unpack(CODEC.pack(v1), 1));
    run({ g, col: 0 }, NONE, 4);
    check(`a format 1 save reads as format ${CODEC.format}: Moscow's coin and find where they were, Siberia's old coins gone, China's first coin and find moved down (27 to 22, 8 to 6), the ticket kept, the lamp gone, the worn rice hat's number moved down two, and he carries on from the dining car's roof (room ${g.roomId})`,
      g.coinCollected[3] === 0xff && g.coinCollected.slice(14, 22).every((c) => c === 0) && g.coinCollected[22] === 0xff && g.coinCollected.filter((c) => c).length === 2
      && g.siCollected[1] === 0x81 && g.siCollected[5] === 0x81 && g.siCollected[6] === 0x81 && g.siCollected.filter((c) => c).length === 3 && g.worn === itemIndex(now, CHI.top, 0) && g.roomId === SIB.gravy && g.y === standY(9));
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
