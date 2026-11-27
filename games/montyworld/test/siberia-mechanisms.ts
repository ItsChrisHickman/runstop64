/**
 * Siberia's mechanisms and its puzzle, headless, each on its own with the room's creatures out of the way unless a check says otherwise (the bot, siberia.ts, plays them all
 * together): the data (six rooms, retired ids, coins with reasons), the mountains (seen, warned of, deadly on the roof and up the pine, never under the roof), the sleeper's roof
 * run (a run straight to the pine is caught, one shelter in the closet and it is made), the puzzle (the train's two lanes: the dining car's inside a dead end, its gangway
 * bolted; the roof runs on onto the tender's coal, the coal's top sealed from the corridor under it; the sleeper's corridor shut until the ticket, which opens the closet's floor and sends
 * the inspector off), the locomotive's steam valve (one pipe, two ends, one wheel on the inside: the roof's way opened from the inside, the obvious move failing, never a trap), the yeti's loop (never where he comes in), the mine cart, the river's cracking ice, the joins both ways (no trap), the hints, the map and the saves.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/siberia-mechanisms.ts [--room <rooms>]
 */
import { enterRoom } from '../../montyotr/src/ending';
import type { Game } from '../../montyotr/src/game';
import { montyMap } from '../../montyotr/src/map';
import { MOTR } from '../../montyotr/src/motr';
import { restore, snapshot } from '../../montyotr/src/save';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { ADDED_ROOMS, DECOR_LIBRARY, STEAM_VALVE, TICKET_KEEPS, WORLD } from '../src/data';
import { CODEC } from '../src/main';
import { ROOM } from '../src/moscow';
import { CAB, CART, CLOSET, CRACKS, VESTIBULE, GANGWAYS, INSPECTOR_SLOT, MINE_CART, MINE_LADDER, MINE_ROPE, MINER, PINE, RIVER, SIB, SIBERIA_ICICLES, SIBERIA_ROOMS, STEAM, TAIGA, TAIGA_BOUGHS, TUNNELS, YETI } from '../src/siberia';
import { newGame } from '../../shared/monty/test/bot';
import { search } from './search';
import { SCOPE, scopedRooms } from './scope';
import { FORMAT1_COINS, FORMAT1_ITEMS } from '../src/save-format1';
import { RETIRED } from '../src/save-migrate';
import { at, cell, colOf, dead, diesAt, icicleMet, LEFT, panelLine, RIGHT, UP, rowText, run } from './mech-kit';
import { piecePlace, placeAt, lapFrames } from '../../montyotr/src/dragons';
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
SCOPE.section([], 'the data', () => {
  const cells = WORLD.exitGrid.image;
  const grid = (row: number, col: number) => cells[row * WORLD.exitGrid.cols + col];
  const block = [grid(0, 4), grid(0, 5), grid(0, 6), grid(0, 7), grid(1, 4), grid(1, 5), grid(1, 6), grid(1, 7), grid(2, 4), grid(2, 5), grid(2, 6), grid(2, 7)];
  check('Siberia is seven rooms at columns 4-7 beside Moscow\'s: the cave over the sleeper, the train and the mine in row 1, the river under the mine and the taiga (OFF THE BEATEN PATH, added after the flight: id 95) west of it; ids 9, 10, 11, 13, 14, 17 and 94 (12, 15 and 16 retired: nothing has them), Moscow\'s 0-8 and China\'s 18 on where they were',
    block.join() === [0xff, SIB.yeti, 0xff, 0xff, SIB.gravy, SIB.sleeper, SIB.coal, SIB.mine, 0xff, 0xff, SIB.taiga, SIB.border].join() && grid(1, 3) === ROOM.station && grid(2, 8) === CHI.wall
    && ![12, 15, 16].some((id) => cells.includes(id)) && SIBERIA_ROOMS.length === 7);
  const coinsIn = (lo: number, hi: number) => Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => WORLD.coinTable[i * 3] ?? 0).filter((r) => r >= lo && r <= hi).length;
  const itemsIn = (lo: number, hi: number) => Array.from({ length: WORLD.specialItems.length / 4 }, (_, i) => WORLD.specialItems[i * 4] ?? 0).filter((r) => r >= lo && r <= hi).length;
  const coinRooms = Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => WORLD.coinTable[i * 3] ?? 0);
  const firstTaiga = coinRooms.indexOf(SIB.taiga);
  check('Moscow still has its 14 coins and 4 finds, first in the tables; Siberia adds 8 coins and 2 finds (the pelmeni and the ticket), and the taiga 2 coins and no find at the tables\' end (added after the flight: no other coin\'s place moves, so every save keeps its coins)',
    coinsIn(0, 8) === 14 && itemsIn(0, 8) === 4 && coinsIn(9, 17) === 8 && itemsIn(9, 17) === 2 && (WORLD.coinTable[13 * 3] ?? 99) <= 8 && (WORLD.coinTable[14 * 3] ?? 0) >= 9
    && coinsIn(SIB.taiga, SIB.taiga) === 2 && itemsIn(SIB.taiga, SIB.taiga) === 0 && firstTaiga > coinRooms.indexOf(CHI.heaven) && coinRooms.slice(firstTaiga).every((r) => ADDED_ROOMS.includes(r)));
  const perRoom = SIBERIA_ROOMS.map((r) => (r.coins ?? []).length);
  check(`no room has more than three coins, about one a room as Monty on the Run's (${perRoom.join(' ')})`, perRoom.every((n) => n <= 3) && perRoom.reduce((a, b) => a + b, 0) === 10);
  check('the ticket is a key item and the pelmeni a snack on the pause screen; the lamp is gone', WORLD.progress.keyItems.includes(itemIndex(newGame(WORLD, false).g, SIB.yeti, 0)) && WORLD.progress.cakes.includes(itemIndex(newGame(WORLD, false).g, SIB.gravy, 0)));
  check('a mountain in each of the dining car and the sleeper, from the front of the train (the right), never from behind; the ice is only on the river', TUNNELS.length === 2 && TUNNELS.every((t) => (t.room === SIB.gravy || t.room === SIB.sleeper) && t.from === 'right') && CRACKS.every((c) => c.room === SIB.border && c.row === 17));
  check('the taiga\'s boughs shed their snow cell by cell, each a floor of its bough\'s row, and only there', TAIGA_BOUGHS.length === TAIGA.boughs.reduce((n, [, , w]) => n + w, 0) && TAIGA_BOUGHS.every((c) => c.room === SIB.taiga && c.cols === 1 && TAIGA.boughs.some(([col, row, w]) => c.row === row && c.col >= col && c.col < col + w)));
  const rooms = creatureRooms(SIBERIA_ROOMS);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in Siberia's rooms (and the yeti), none in more than two (${[...rooms.values()].map((v) => v.size).join(' ')})`, rooms.size >= 5 && most <= 2);
  check('no room has more than three creatures (the ushanka is worn through Siberia: a fourth would be a phantom)', SIBERIA_ROOMS.every((r) => (r.enemies ?? []).length <= 3));
  const vertical = SIBERIA_ROOMS.map((r) => (r.enemies ?? []).filter((e) => e.dir === 3 || e.dir === 4).length);
  check(`creatures vary: up-and-down patrols in ${vertical.filter((n) => n > 0).length} of the seven rooms (${vertical.join(' ')}), and one room with a big creature and no other`, vertical.filter((n) => n > 0).length >= 4 && SIBERIA_ROOMS.filter((r) => (r.enemies ?? []).length === 0).length === 1);
});

// ---- the layout: no decoration over a solid, floor or rope cell, no coin or find in one or under a decoration -------------------------------------------------------------
SCOPE.section([], 'the layout (the rooms in the filter)', () => {
  const bad: string[] = [];
  for (const r of scopedRooms(SIBERIA_ROOMS)) {
    const covered = new Set<string>();
    for (const d of r.decor ?? []) {
      const t = typeof d.type === 'number' ? DECOR_LIBRARY[d.type] : undefined;
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
});

// ---- the mountains --------------------------------------------------------------------------------
SCOPE.section([SIB.gravy, SIB.sleeper], 'the mountains', () => {
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
});

// ---- the set piece: the sleeper's roof run ------------------------------------------------------------
SCOPE.section([SIB.sleeper, SIB.gravy, SIB.coal, SIB.yeti], 'the sleeper\'s roof run', () => {
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
    // east to the tender: from the closet, out as the tail goes by, along to the vestibule and down it before the next mountain; out again as its tail goes by, and on onto the tender's coal
    const s = at(SIB.sleeper, CLOSET.hatch - 1, CLOSET.floor);
    const t = must(s.g.tunnels[0], 'the mountain');
    let f = 0;
    for (; f < 1400 && !(t.state === 'sweep' && t.left + mouth.cols <= CLOSET.left); f++) frame(s, NONE);
    for (; f < 1600 && s.g.y > standY(9) && !dead(s.g); f++) frame(s, UP);
    for (; f < 2000 && colOf(s.g) < VESTIBULE.hatch - 1 && !dead(s.g); f++) frame(s, RIGHT);
    const hatchAt = f;
    for (; f < 2200 && s.g.y < standY(VESTIBULE.floor) && !dead(s.g); f++) frame(s, DOWN);
    const sheltered = !dead(s.g) && s.g.y === standY(VESTIBULE.floor);
    for (; f < 2600 && !dead(s.g) && !(t.state === 'sweep' && t.left <= VESTIBULE.right); f++) frame(s, NONE);
    const atHatch = f - hatchAt; // (the frames from his reaching the hatch to the next mountain's reaching the vestibule)
    for (; f < 3000 && !dead(s.g) && !(t.state === 'sweep' && t.left + mouth.cols <= VESTIBULE.left); f++) frame(s, NONE);
    for (; f < 3200 && s.g.y > standY(9) && !dead(s.g); f++) frame(s, UP);
    for (; f < 3600 && s.g.roomId === SIB.sleeper && !dead(s.g); f++) frame(s, RIGHT);
    check(`east along the roof to the tender: from the closet as the tail goes by, at the vestibule's hatch with ${atHatch} frames before the next mountain is at it, down it while it goes over, and on onto the tender's coal (room ${s.g.roomId})`,
      sheltered && atHatch >= 24 && atHatch <= 160 && s.g.roomId === SIB.coal && !dead(s.g));
    const direct = at(SIB.sleeper, CLOSET.hatch - 1, CLOSET.floor);
    const u = must(direct.g.tunnels[0], 'the mountain');
    let g = 0;
    for (; g < 1400 && !(u.state === 'sweep' && u.left + mouth.cols <= CLOSET.left); g++) frame(direct, NONE);
    for (; g < 1600 && direct.g.y > standY(9) && !dead(direct.g); g++) frame(direct, UP);
    for (; g < 2400 && direct.g.roomId === SIB.sleeper && !dead(direct.g); g++) frame(direct, RIGHT);
    check(`but a run from the closet straight through to the tender is caught (at column ${colOf(direct.g)}): the vestibule is the shelter on the way`, dead(direct.g) && direct.g.roomId === SIB.sleeper);
  }
  {
    const s = at(SIB.sleeper, CLOSET.hatch - 1, CLOSET.floor);
    run(s, NONE, 2 * 800);
    const v = at(SIB.sleeper, VESTIBULE.hatch - 1, VESTIBULE.floor);
    run(v, NONE, 2 * 800);
    check('in the closet and in the vestibule nothing reaches him through two whole cycles', !dead(s.g) && !dead(v.g));
  }
});

// ---- the puzzle: the train's two lanes ---------------------------------------------------------------
SCOPE.section([SIB.gravy, SIB.sleeper, SIB.coal, SIB.yeti, ROOM.station], 'the train\'s two lanes', () => {
  // the roof runs on east onto the tender's coal (its lane of its own there: the coal is solid down to the tender's corridor)
  const s = at(SIB.sleeper, 22, 9);
  run(s, RIGHT, 120);
  check(`the sleeper's roof runs on east onto the tender's coal (room ${s.g.roomId}, on the coal's top: ${s.g.y === standY(CAR_ROOF)})`, s.g.roomId === SIB.coal && s.g.y === standY(CAR_ROOF));
  // the roof and the corridor are sealed from each other in the sleeper until the ticket: the only climb under its roof is the closet's ladder (walled, floored solid); from
  // the corridor's floor (17) to the roof's walkway (9) is far more than a jump
  const sleeper = roomOf(SIB.sleeper);
  const ropes: string[] = [];
  for (let row = 10; row <= 16; row++) for (let col = 0; col < 32; col++) if (classAt(SIB.sleeper, col, row) === 3) ropes.push(`${col},${row}`);
  const wells = [CLOSET, VESTIBULE] as const;
  const walled = wells.every((w) => [w.left, w.right].every((c) => [9, 10, 11, 12, 13].every((row) => classAt(SIB.sleeper, c, row) === 1))
    && Array.from({ length: w.right - w.left + 1 }, (_, i) => w.left + i).every((c) => classAt(SIB.sleeper, c, w.floor) === 1));
  check(`in the sleeper the roof and the corridor do not meet without the ticket: the only climbs below the roof are the closet's ladder and the vestibule's, over their floors (${ropes.join(' ')}), and a jump rises ${RISE} pixels of the ${(17 - 9) * 8} between them`,
    ropes.every((p) => { const [c = -1, r = -1] = p.split(',').map(Number); return wells.some((w) => c === w.hatch && r < w.floor); }) && walled && RISE < (17 - 9) * 8 - 21 && sleeper.map.length === 20);
  {
    // a pointer, not the proof: without the ticket the bot finds no way from the closet, the pine's foot or the dining car's inside down into the sleeper's corridor
    const below = (g: Game) => (g.roomId === SIB.sleeper || g.roomId === SIB.coal) && g.y === standY(17);
    const sealed = (room: number, col: number, floor: number) => search(at(room, col, floor), below, undefined, 150000, 0) === null;
    check('without the ticket the bot finds no way from the closet, the vestibule, the pine\'s foot, the tender\'s coal or the dining car\'s inside into the sleeper\'s corridor or the tender\'s',
      sealed(SIB.sleeper, CLOSET.hatch - 1, CLOSET.floor) && sealed(SIB.sleeper, VESTIBULE.hatch - 1, VESTIBULE.floor) && sealed(SIB.sleeper, PINE.cols[0] - 1, CAR_ROOF) && sealed(SIB.coal, 2, CAR_ROOF) && sealed(SIB.gravy, 26, 17));
  }
  // the dining car's gangway is bolted, both ways, with the ticket or without it: its inside is a dead end (the pelmeni's pocket), and its hatches join it to its roof
  {
    const bolted = (tickets: readonly (readonly [number, number])[]) => {
      const east = at(SIB.gravy, 27, 17, tickets);
      run(east, RIGHT, 80);
      const west = at(SIB.sleeper, 4, 17, tickets);
      run(west, LEFT, 80);
      return east.g.roomId === SIB.gravy && west.g.roomId === SIB.sleeper;
    };
    check('the dining car\'s gangway into the sleeper is bolted both ways, with the ticket and without it', bolted([]) && bolted([TICKET]));
    const reach = (from: State, goal: (g: Game) => boolean, aim: { room: number; col: number; row: number }) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], 200000, 1.5) !== null;
    check('the dining car\'s hatches go down from its roof into the car and up again (a dead end, never a trap)', reach(at(SIB.gravy, 6, 9), (g) => g.roomId === SIB.gravy && g.y === standY(17), { room: SIB.gravy, col: 12, row: 15 })
      && reach(at(SIB.gravy, 20, 17), (g) => g.roomId === SIB.gravy && g.y === standY(9), { room: SIB.gravy, col: 25, row: 7 }));
  }
  // the ticket opens the closet's floor: down from the roof through the closet into the corridor, and up again
  {
    const closetOpen = (tickets: readonly (readonly [number, number])[]) => {
      const s = at(SIB.sleeper, CLOSET.hatch - 1, CLOSET.floor, tickets);
      run(s, DOWN, 200);
      return s.g.y === standY(17);
    };
    check('without the ticket the closet\'s floor holds (he stands on it, over the corridor); with it, he climbs down through it into the corridor', !closetOpen([]) && closetOpen([TICKET]));
    const reach = (from: State, goal: (g: Game) => boolean, aim: { room: number; col: number; row: number }) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], 300000, 1.5) !== null;
    check('with the ticket the bot goes from the roof down the closet into the corridor, and from the corridor up the closet to the roof (never a trap)',
      reach(at(SIB.sleeper, 4, 9, [TICKET]), (g) => g.roomId === SIB.sleeper && g.y === standY(17), { room: SIB.sleeper, col: 10, row: 15 })
      && reach(at(SIB.sleeper, 4, 17, [TICKET]), (g) => g.roomId === SIB.sleeper && g.y === standY(9), { room: SIB.sleeper, col: 10, row: 7 }));
  }
  // the inspector keeps the corridor: shut without the ticket, open with it, and he is gone
  for (const w of GANGWAYS) {
    const side = w.cols[0] <= 1 ? 0 : 31;
    const out = (st: State) => { run(st, side === 0 ? LEFT : RIGHT, 160); return st.g.roomId !== w.room; };
    check(`room ${w.room}: the gangway at its ${side === 0 ? 'west' : 'east'} end is shut without the ticket and open with it`, !out(at(w.room, side === 0 ? 2 : 27, 17)) && out(at(w.room, side === 0 ? 2 : 27, 17, [TICKET])));
  }
  {
    const s = at(SIB.sleeper, 24, 17, [], false, true);
    must(s.g.enemies[0], 'the provodnitsa').x = 0xff;
    run(s, RIGHT, 200);
    check(`the inspector stands in his gangway: walking into it he stops at column ${colOf(s.g)} and lives (he only bars the way)`, !dead(s.g) && s.g.roomId === SIB.sleeper && colOf(s.g) >= 27);
    // with the ticket the gates give way where he uses it, seen, and stay done (`at` with `keep`)
    const t = at(SIB.sleeper, 18, 17, [TICKET], false, true);
    must(t.g.enemies[0], 'the provodnitsa').x = 0xff;
    const waiting = must(t.g.enemies[INSPECTOR_SLOT], 'the inspector').x !== 0xff && classAt(SIB.sleeper, 30, 15) === 1 && cell(t.g, 30, 15) !== 0;
    let f = 0;
    for (; f < 200 && !t.g.siCollected[TICKET_KEEPS.inspector]; f++) frame(t, RIGHT);
    const usedAt = colOf(t.g);
    let gone = 0;
    for (; gone < 200 && must(t.g.enemies[INSPECTOR_SLOT], 'the inspector').x !== 0xff; gone++) frame(t, NONE);
    check(`with the ticket the inspector waits in his gangway until Monty comes up to him (column ${usedAt}), then turns and walks off west down the corridor (gone ${gone} frames later), the gangway open, alive`,
      waiting && usedAt >= 23 && usedAt <= 27 && gone > 30 && gone < 200 && cell(t.g, 30, 15) === 0 && !dead(t.g));
    enterRoom(t.g, SIB.sleeper, 0x0c + (4 + 4) * 4, standY(17));
    check('and it stays done: coming into the sleeper again the gangway is open and the inspector is not there', cell(t.g, 30, 15) === 0 && must(t.g.enemies[INSPECTOR_SLOT], 'the inspector').x === 0xff);
    const c = at(SIB.sleeper, CLOSET.hatch - 1, CLOSET.floor - 4, [TICKET]);
    const bolted = cell(c.g, CLOSET.hatch - 1, CLOSET.floor) !== 0;
    run(c, DOWN, 200);
    const through = c.g.y === standY(17) && !!c.g.siCollected[TICKET_KEEPS.closet];
    enterRoom(c.g, SIB.sleeper, 0x0c + (4 + 4) * 4, standY(17));
    check(`the closet's floor is bolted until he climbs down onto it with the ticket (${bolted}), then opens under him and he goes on down into the corridor (${through}), and it stays open`,
      bolted && through && cell(c.g, CLOSET.hatch - 1, CLOSET.floor) === 0);
    // a save from before the keeps: the ticket held, the keeps unset, coming at the gangway from the tender's side, it opens there (never a trap)
    const back = at(SIB.coal, 2, 17, [TICKET]);
    for (let f = 0; f < 240 && !(back.g.roomId === SIB.sleeper && colOf(back.g) < 26) && !dead(back.g); f++) frame(back, LEFT);
    check(`coming back west from the tender with the ticket but no keep (an older save), the gangway gives way as he enters and he walks on into the corridor (column ${colOf(back.g)})`,
      back.g.roomId === SIB.sleeper && colOf(back.g) < 26 && !dead(back.g));
  }
});

// ---- the locomotive's steam valve ---------------------------------------------------------------------------
SCOPE.section([SIB.coal, SIB.sleeper, SIB.mine, SIB.gravy], 'the locomotive\'s steam', () => {
  type Outlet = { readonly col: number; readonly row: number; readonly cols: number; readonly rows: number };
  const cellsOf = (o: Outlet) => Array.from({ length: o.rows * o.cols }, (_, i) => [o.col + (i % o.cols), o.row + Math.floor(i / o.cols)] as const);
  const blows = (g: Game, o: Outlet) => cellsOf(o).every(([c, r]) => cell(g, c, r) !== 0);
  const still = (g: Game, o: Outlet) => cellsOf(o).every(([c, r]) => cell(g, c, r) === 0);
  const turned = (g: Game) => g.siCollected[STEAM_VALVE] !== 0;
  const top = (g: Game) => blows(g, STEAM.high) && still(g, STEAM.low) && !turned(g);
  const bottom = (g: Game) => blows(g, STEAM.low) && still(g, STEAM.high) && turned(g);
  const JUMP = { ...NONE, fire: true };
  {
    const s = at(SIB.coal, 2, CAR_ROOF);
    run(s, NONE, 4);
    check('as the game starts the steam blows out of the pipe\'s top, across the roof\'s lane at the cab, and the bottom is quiet', top(s.g));
  }
  {
    // walking the corridor under the niche turns nothing; a jump in the niche turns the wheel (both ends change in the frame); landing turns nothing more; another jump turns it back
    const s = at(SIB.coal, 3, 17, [TICKET]);
    for (let f = 0; f < 200 && colOf(s.g) < STEAM.box.col0; f++) frame(s, RIGHT);
    run(s, NONE, 4);
    const walked = top(s.g);
    frame(s, JUMP);
    let f = 0;
    for (; f < 40 && !turned(s.g); f++) frame(s, NONE);
    run(s, NONE, 60);
    const sent = bottom(s.g);
    frame(s, JUMP);
    run(s, NONE, 60);
    check(`walking along the corridor under the wheel's niche leaves the steam as it is (${walked}); a jump there turns the wheel (${f} frames in): out of the bottom, the top quiet, and it stays so when he lands (${sent}); another jump turns it back`,
      walked && sent && top(s.g));
  }
  {
    const s = at(SIB.coal, 9, CAR_ROOF);
    const topDies = diesAt(s, RIGHT, 60);
    const t = at(SIB.coal, 8, 17, [TICKET]);
    t.g.siCollected[STEAM_VALVE] = 0x81;
    const bottomDies = diesAt(t, RIGHT, 60);
    check(`the steam kills where it blows: walking along the coal's top into it out of the top (frame ${topDies}), along the corridor into it out of the bottom (frame ${bottomDies})`, topDies >= 0 && bottomDies >= 0);
  }
  {
    // the two lanes each hold half the answer: the roof sees the wheel but cannot reach it; the inside reaches it, but turning it shuts the inside's own way on
    const inMine = (g: Game) => g.roomId === SIB.mine;
    const inCab = (g: Game) => g.roomId === SIB.coal && g.y === standY(17) && colOf(g) >= CAB.cabFrom;
    const exit = [{ room: SIB.coal, col: 31, row: 3 }];
    check('with the steam out of the top the bot finds no way from the tender\'s coal past it to the mine',
      search(at(SIB.coal, 2, CAR_ROOF), inMine, exit, 150000, 1.5) === null);
    check('and no way from the roof to the wheel: from the tender\'s coal and the sleeper\'s roof (without the ticket) the bot never turns it',
      search(at(SIB.coal, 2, CAR_ROOF), turned, [{ room: SIB.coal, col: STEAM.box.col0, row: STEAM.box.row0 }], 150000, 1.5) === null);
    const turnedAt = (col: number, floor: number) => { const s = at(SIB.coal, col, floor, [TICKET]); s.g.siCollected[STEAM_VALVE] = 0x81; return s; };
    // (the wheel taken away, so the search cannot simply turn it back)
    const noTurns = (col: number, floor: number) => {
      const s = newGame({ ...WORLD, switches: [] }, false);
      s.g.siCollected[itemIndex(s.g, TICKET[0], TICKET[1])] = 0x81;
      s.g.siCollected[STEAM_VALVE] = 0x81;
      enterRoom(s.g, SIB.coal, 0x0c + (col + 4) * 4, standY(floor));
      s.g.enemies = [];
      s.g.enable &= 0x0f;
      s.g.vic.enable &= 0x0f;
      return s;
    };
    check('the obvious move fails: the wheel turned, the bot finds no way on from the corridor\'s end into the cab (the steam is across it now)',
      search(noTurns(STEAM.box.col0 - 1, 17), inCab, [{ room: SIB.coal, col: 20, row: 15 }], 150000, 1.5) === null);
    check('the fix follows: the wheel turned, from the tender\'s coal the bot crosses the quiet top onto the cab\'s roof, down to the boiler, up the tipple and into the mine',
      search(turnedAt(2, CAR_ROOF), inMine, exit, 300000, 1.5) !== null);
  }
  {
    // never a trap: the wheel's side of the inside goes back west whichever way the steam blows; the cab, entered while the bottom is quiet, too; the roof's east side, reached only
    // while the top is quiet, goes back west over it
    const reach = (from: State, goal: (g: Game) => boolean, aim: { room: number; col: number; row: number }) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], 300000, 1.5) !== null;
    const set = (s: State, low: boolean) => { if (low) s.g.siCollected[STEAM_VALVE] = 0x81; return s; };
    const west = { room: SIB.coal, col: 0, row: 15 };
    check('never a trap: from the corridor\'s end with the steam either way, and from the cab, the bot gets back west through the gangway into the sleeper',
      reach(set(at(SIB.coal, STEAM.box.col0, 17, [TICKET]), false), (g) => g.roomId === SIB.sleeper, west)
      && reach(set(at(SIB.coal, STEAM.box.col0, 17, [TICKET]), true), (g) => g.roomId === SIB.sleeper, west)
      && reach(at(SIB.coal, 19, 17, [TICKET]), (g) => g.roomId === SIB.sleeper, west));
    check('and from the boiler\'s top, the top quiet, back over the cab\'s roof and the coal onto the sleeper\'s roof',
      reach(set(at(SIB.coal, 26, CAB.boilerTop, [TICKET]), true), (g) => g.roomId === SIB.sleeper, { room: SIB.coal, col: 0, row: 7 }));
  }
});

// ---- the yeti and the icicle ---------------------------------------------------------------------------
SCOPE.section([SIB.yeti, SIB.sleeper, SIB.gravy, SIB.coal], 'the yeti and the icicle', () => {
  const lap = lapFrames(YETI);
  let steady = true, minY = 999, maxY = 0;
  const origin = piecePlace(YETI, 0, 0)[0] - (YETI.path[0]?.[0] ?? 0) * 8; // (sprite pixels from the playfield's left edge)
  const places = Array.from({ length: Math.ceil(lap / 2) }, (_, i) => piecePlace(YETI, 0, i * 2));
  for (let t = 0; t < lap; t += 2) {
    const [x0, y0] = piecePlace(YETI, 0, t);
    YETI.pieces.forEach((piece, i) => {
      const [x, y] = piecePlace(YETI, i, t);
      if (!piece.rigid || Math.abs(x - x0 - piece.rigid[0]) > 0.01 || Math.abs(y - y0 - piece.rigid[1]) > 0.01) steady = false;
    });
    minY = Math.min(minY, y0); maxY = Math.max(maxY, y0);
  }
  // its right edge (playfield pixels) in its lower half (where it stands on the floor or comes down to it) and on the bridge lane
  const rightEdge = (keep: (y: number) => boolean) => Math.max(...places.filter(([, y]) => keep(y)).map(([x]) => x - origin + 48));
  const floorRight = rightEdge((y) => y >= maxY - 2), bridgeRight = rightEdge((y) => y <= minY + 2), anyRight = rightEdge(() => true);
  check(`the yeti's four sprites keep their places as one body round its lap of ${lap} frames`, steady && YETI.pieces.length === 4);
  check(`its loop runs from the floor lane to the bridge lane (${((maxY - minY) / 8).toFixed(1)} rows); on the floor it never comes east of column ${(floorRight / 8).toFixed(1)} (the pine's gap is from ${PINE.cols[0] - 1}: he arrives safe) nor anywhere east of ${(anyRight / 8).toFixed(1)} (the stair is from 23), and on the bridge it walks to column ${(bridgeRight / 8).toFixed(1)}, over the bridge's east end where the stair comes up`,
    maxY - minY >= 8 * 6 && floorRight <= 17 * 8 + 4 && anyRight <= 23 * 8 && bridgeRight >= 22 * 8);
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
  // it shakes as he comes along the high ledge toward the ticket (lead): walking straight on from the ledge's east end dies, stopping as it shakes and going on as it grows back lives
  const ticketIce = must(SIBERIA_ICICLES[0], 'the icicle over the ticket');
  const met = icicleMet(SIB.yeti, ticketIce, 21, 5, 1);
  check(`walking west along the ledge to the ticket, the icicle shakes ${ticketIce.lead ?? 0} cells ahead and falls on him (frame ${met.straight}); stopping as it shakes and going on as it grows back, he gets by (${met.waited})`, met.straight >= 0 && met.waited);
  check('and back down from the ticket: over the bridge, down the stair, into the gap and down the pine into the sleeper (a dead end, never a trap)',
    search(at(SIB.yeti, 18, 5, [TICKET]), (g) => g.roomId === SIB.sleeper && !g.freeze && !g.script, [{ room: SIB.yeti, col: 20, row: 19 }], 400000, 1.5) !== null);
  check('the bot finds the way from the pine\'s top over the stair and the bridge to the ticket', search(at(SIB.yeti, 23, 17), (g) => g.roomId === SIB.yeti && g.siCollected[itemIndex(g, SIB.yeti, 0)] !== 0, [{ room: SIB.yeti, col: 18, row: 3 }], 400000, 1.5) !== null);
  {
    // the way to the ticket goes through the yeti's lane: held still on the bridge's east end, it shuts the way (he cannot get past it by walking and jumping); held on the
    // floor, the way is open. So the ticket is taken by reading where it is, not by ignoring it.
    const held = (pos: number) => {
      const s = at(SIB.yeti, 23, 17);
      frame(s, NONE);
      const d = must(s.g.dragons[0], 'the yeti');
      d.pos = pos; d.mode = 'rest'; d.left = 1e9;
      return search(s, (g) => g.roomId === SIB.yeti && g.siCollected[itemIndex(g, SIB.yeti, 0)] !== 0, [{ room: SIB.yeti, col: 18, row: 3 }], 150000, 1.5) !== null;
    };
    const length = lap * YETI.speed;
    const steps = Array.from({ length: Math.ceil(length) }, (_, i) => i);
    const east = steps.filter((p) => placeAt(YETI, 0, p)[1] <= minY + 2).reduce((a, b) => (placeAt(YETI, 0, b)[0] > placeAt(YETI, 0, a)[0] ? b : a));
    const shut = !held(east), open = held(0);
    check(`held on the bridge's east end, the yeti shuts the way to the ticket (${shut ? 'shut' : 'open'}); held on the floor, the way is open (${open ? 'open' : 'shut'})`, shut && open);
  }
});

// ---- the mine cart ---------------------------------------------------------------------------------------
SCOPE.section([SIB.mine, SIB.coal, SIB.border], 'the mine cart', () => {
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
});

// ---- the miner at the ladder's foot: passed by waiting for his window, never by a jump off the ladder ----------------------------------------
SCOPE.section([SIB.mine], 'the miner\'s window', () => {
  const FOOT = standY(18), WAIT = standY(16);
  /** The miner (the one creature on the dock's floor). */
  const miner = (g: Game) => must(g.enemies.find((e) => e.y === FOOT), 'the miner');
  /** Monty on the ladder two rows over the dock, the room's creatures as they start (the miner leaving the ledges' foot for his seam). */
  const onLadder = (y = WAIT) => {
    const s = at(SIB.mine, MINE_LADDER.col - 1, 18, [], false, true);
    s.g.y = y;
    frame(s, UP);
    return s;
  };
  {
    const s = onLadder();
    let lo = 255, hi = 0, hurt = false;
    for (let f = 0; f < 400; f++) { frame(s, NONE); const x = miner(s.g).x; lo = Math.min(lo, x); hi = Math.max(hi, x); hurt ||= dead(s.g); }
    check(`the miner walks from the ledges' foot under the ladder into his seam and back (x ${lo} to ${hi}, as MINER says), and Monty waiting on the ladder over him is never touched`,
      lo === MINER.from && hi === MINER.to && !hurt && s.g.onRope !== 0 && MINER.seam.every((c) => classAt(SIB.mine, c, 16) === 0 && classAt(SIB.mine, c, 17) === 0));
  }
  {
    const s = at(SIB.mine, 23, 18, [], false, true);
    check('the ledges\' foot (column 23 and west, where he waits for the cart) is never on the miner\'s beat', diesAt(s, NONE, 400) === -1);
  }
  // A player who watches: waits on the ladder until the miner has gone under it into his seam, then climbs down and walks west. From every moment he might arrive on the ladder.
  const phases = Array.from({ length: 20 }, (_, i) => i * 7);
  const passes = (s: State, watch: boolean) => {
    for (let f = 0; f < 300 && watch && !(miner(s.g).x >= 135 && !(miner(s.g).flags & 0x80)); f++) { frame(s, NONE); if (dead(s.g)) return false; }
    for (let f = 0; f < 40 && s.g.y < FOOT; f++) { frame(s, DOWN); if (dead(s.g)) return false; }
    for (let f = 0; f < 60 && colOf(s.g) > 22; f++) { frame(s, LEFT); if (dead(s.g)) return false; }
    return colOf(s.g) <= 22 && diesAt(s, NONE, 200) === -1;
  };
  const watched = phases.filter((p) => { const s = onLadder(); run(s, NONE, p); return passes(s, true); }).length;
  const rushed = phases.filter((p) => { const s = onLadder(); run(s, NONE, p); return passes(s, false); }).length;
  check(`waiting on the ladder for the miner to go into his seam, then down and west, gets past him from every moment he can arrive (${watched} of ${phases.length}); going straight down at a bad moment is caught (${phases.length - rushed} of ${phases.length})`,
    watched === phases.length && rushed < phases.length - phases.length / 4);
  // No way round him: off the ladder at any height, walking or jumping west, he never comes down on the timber ledges (the trick Chris found: a jump off the ladder over the miner).
  const tricks: string[] = [];
  for (let y = standY(4) + 2; y <= FOOT; y += 2) {
    for (const [name, stick, frames] of [['walk', LEFT, 12], ['jump', { ...LEFT, fire: true }, 2]] as const) {
      const s = onLadder(y);
      s.g.enemies = [];
      s.g.enable &= 0x0f;
      s.g.vic.enable &= 0x0f;
      run(s, stick, frames);
      run(s, NONE, 120);
      const col = colOf(s.g);
      if ((s.g.y === standY(14) && col >= 21 && col <= 24) || (s.g.y === standY(16) && col >= 20 && col <= 23) || (name === 'jump' && s.g.y === FOOT && col <= 22)) tricks.push(`${name} at y ${y} (column ${col}, y ${s.g.y})`);
    }
  }
  check(`off the ladder at any height, walking or jumping west, he never lands on the timber ledges, and a jump from its foot never carries him over the miner's beat: the shaft's side (column ${MINE_LADDER.lip}, rows 12-15) leaves only the walk from its foot${tricks.length ? ` (${tricks.join(', ')})` : ''}`,
    tricks.length === 0 && [12, 13, 14, 15].every((r) => classAt(SIB.mine, MINE_LADDER.lip, r) === 1));
  const climb = search(at(SIB.mine, 21, 18), (g) => g.roomId === SIB.mine && g.y === standY(14) && colOf(g) >= 21 && colOf(g) <= 23, [{ room: SIB.mine, col: 22, row: 12 }], 200000, 1.5);
  const down = search(at(SIB.mine, 22, 14), (g) => g.roomId === SIB.mine && g.y === FOOT && colOf(g) >= 21 && colOf(g) <= 23, [{ room: SIB.mine, col: 21, row: 16 }], 200000, 1.5);
  check(`the ledges climb from the dock to the top one (${climb ? climb.nodes : 'no way'}) and back down (${down ? down.nodes : 'no way'}): the coin tops a climb from the ledges' foot, off the miner's beat, and the top one is no trap`, climb !== null && down !== null);
});

// ---- the river's cracking ice ----------------------------------------------------------------------------
SCOPE.section([SIB.border, SIB.mine, CHI.wall], 'the river\'s cracking ice', () => {
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
    // it breaks faster than he walks across it (Chris: "both water bridges should break faster"): a jump is part of the crossing
    const walk = standOn(patch.col - 2);
    let walked = -1;
    for (let f = 0; f < 200 && walked < 0 && !dead(walk.g); f++) { frame(walk, RIGHT); if (colOf(walk.g) > patch.col + patch.cols) walked = f; }
    check(`walking straight across the ${patch.cols} cells of ice it breaks under him (at column ${colOf(walk.g)}) before he is over`, walked < 0 && dead(walk.g));
    const s = standOn(patch.col - 2);
    let worst = 0, crossed = -1;
    for (let f = 0; f < 200 && crossed < 0 && !dead(s.g); f++) {
      frame(s, colOf(s.g) >= patch.col - 1 && f < 40 ? { ...RIGHT, fire: true } : RIGHT); // one jump from the bank's edge, then on at a walk
      worst = Math.max(worst, must(s.g.cracks[0], 'the stretch').stage);
      if (colOf(s.g) > patch.col + patch.cols) crossed = f;
    }
    check(`a jump out onto it from the bank and on at a walk gets him over (${crossed} frames; the ice at stage ${worst}, not gone) to the sandbar`, crossed >= 0 && worst <= 2 && !dead(s.g));
    run(s, NONE, 400);
    check('on the sandbar he can stop as long as he likes', !dead(s.g) && colOf(s.g) >= RIVER.bar[0] - 1 && colOf(s.g) <= RIVER.bar[1]);
  }
  {
    const s = standOn(patch.col); // (at its edge: off it again in a step)
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
});

// ---- the joins: loops, the ways back, no trap -----------------------------------------------------------
SCOPE.section([SIB.gravy, SIB.sleeper, SIB.coal, SIB.yeti, SIB.mine, SIB.border, ROOM.station, CHI.wall], 'the joins: loops, the ways back, no trap', () => {
  const reach = (from: State, aim: { room: number; col: number; row: number }, goal: (g: Game) => boolean, limit = 400000) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], limit, 1.5);
  const lands = (room: number, floors: readonly number[]) => (g: Game) => g.roomId === room && (g.onRope !== 0 || floors.some((f) => g.y === standY(f)));
  check('under the roof with the ticket: along the sleeper\'s corridor into the tender\'s pocket',
    reach(at(SIB.sleeper, 12, 17, [TICKET]), { room: SIB.sleeper, col: 31, row: 16 }, (g) => g.roomId === SIB.coal && g.y === standY(17)) !== null);
  check('and back west the same way (the tender to the sleeper\'s corridor, up the closet to the roof, west along it to the dining car)',
    reach(at(SIB.coal, 2, 17, [TICKET]), { room: SIB.coal, col: 0, row: 16 }, (g) => g.roomId === SIB.sleeper) !== null
    && reach(at(SIB.sleeper, 12, 17, [TICKET]), { room: SIB.sleeper, col: 0, row: 7 }, (g) => g.roomId === SIB.gravy, 600000) !== null);
  {
    const turned = (s: State) => { s.g.siCollected[STEAM_VALVE] = 0x81; return s; };
    // (from the coal, where the sleeper's roof comes onto it: "the train's two lanes" walks that join; a search through the mountain's phases from the sleeper's roof never ends)
    check('from the tender\'s coal, the valve turned, across the cab\'s roof, up the tipple\'s ladder and east along the deck into the mine\'s gantry',
      reach(turned(at(SIB.coal, 2, CAR_ROOF)), { room: SIB.coal, col: 31, row: 3 }, (g) => g.roomId === SIB.mine && g.y === standY(4), 200000) !== null);
    check('and the gantry goes back west onto the tipple and down its ladder to the boiler\'s top',
      reach(turned(at(SIB.mine, 3, 4)), { room: SIB.coal, col: CAB.tippleLadder, row: 9 }, (g) => g.roomId === SIB.coal && g.y === standY(CAB.boilerTop), 400000) !== null);
  }
  check('the sleeper\'s pine climbs into the yeti\'s cave and the cave\'s gap lets him down it again (both ends on the trunk)',
    reach(at(SIB.sleeper, 22, 9), { room: SIB.sleeper, col: 20, row: 0 }, lands(SIB.yeti, [17]), 200000) !== null && reach(at(SIB.yeti, 23, 17), { room: SIB.yeti, col: 20, row: 19 }, lands(SIB.sleeper, [9]), 200000) !== null);
  {
    // the pine's join holds: up it into the cave, climbing or jumping up the trunk, and let go of the stick: he stays in the cave (a jump that carried him through the edge
    // ends there, he holds the trunk); and down it into the sleeper and let go: he stays in the sleeper
    const upAndRelease = (jump: boolean) => {
      const s = at(SIB.sleeper, PINE.cols[0], CAR_ROOF);
      frame(s, NONE);
      s.g.tunnels = []; // (the mountain is not what this is about)
      for (let f = 0; f < 400 && s.g.roomId === SIB.sleeper; f++) frame(s, { ...UP, fire: jump && f % 8 === 0 });
      const arrived = s.g.roomId === SIB.yeti;
      let left = false;
      for (let f = 0; f < 200; f++) { frame(s, NONE); if (s.g.roomId !== SIB.yeti) left = true; }
      return arrived && !left;
    };
    const down = at(SIB.yeti, PINE.cols[0], 17);
    for (let f = 0; f < 400 && down.g.roomId === SIB.yeti; f++) frame(down, DOWN);
    down.g.tunnels = [];
    let back = false;
    for (let f = 0; f < 200; f++) { frame(down, NONE); if (down.g.roomId !== SIB.sleeper) back = true; }
    check('up the pine into the cave, climbing or jumping, and the stick let go: he stays in the cave 200 frames; down it into the sleeper and let go: he stays there',
      upAndRelease(false) && upAndRelease(true) && down.g.roomId === SIB.sleeper && !back);
  }
  check('the mine\'s rope goes down into the river\'s village and, no trap, up again from the bank into the mine',
    reach(at(SIB.mine, 2, 18), { room: SIB.mine, col: 5, row: 19 }, lands(SIB.border, [17]), 200000) !== null && reach(at(SIB.border, 3, 17), { room: SIB.border, col: 5, row: 0 }, lands(SIB.mine, [18]), 200000) !== null);
  {
    const s = at(SIB.gravy, 6, 9);
    run(s, LEFT, 80);
    check(`the dining car's roof walks west back to Moscow's station (room ${s.g.roomId})`, s.g.roomId === ROOM.station);
  }
});

// ---- hints, the map, the save ---------------------------------------------------------------------
SCOPE.section([], 'hints, the map, the save', () => {
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
  check(`the pause screen counts the snacks and the items over every region (${info.join(' | ')})`, info[2] === panelLine('SNACKS', WORLD.progress.cakes.length) && info[1] === panelLine('ITEMS', WORLD.progress.keyItems.length));
  enterRoom(s.g, SIB.mine, 0x40, standY(4));
  const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { 14: [0x40, 0x52, 1, 7], 17: [0x40, 0xb2, 2, 7] } });
  check('in Siberia the map shows its region (four columns), the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));
  check('Monty on the Run is as it was (no tunnels, no ice)', MOTR.tunnels.length === 0 && MOTR.cracks.length === 0);

  // a save made on coming into each of Siberia's rooms (the ticket taken, so the gangways are opened on loading) carries on
  {
    const spots = [[SIB.gravy, 2, 9], [SIB.sleeper, 2, 9], [SIB.coal, 2, 17], [SIB.yeti, 23, 17], [SIB.mine, 2, 4], [SIB.border, 3, 17]] as const;
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

  // a save from before the reset (format 1: Siberia of nine rooms, 13 coins and 4 finds) is read into today's tables by save-migrate.ts (the whole world's, from the format 1 tables):
  // Moscow's coin and find where they were, Siberia's ticket kept (wherever it lies now), the lamp gone, and a save made in a cut room (here the dark shaft, 15) carries on in the room the plan names
  {
    const now = newGame(WORLD, true).g;
    const coins = Array.from({ length: FORMAT1_COINS.length / 3 }, () => 0), items = Array.from({ length: FORMAT1_ITEMS.length / 4 }, () => 0);
    coins[3] = 0xff; items[1] = 0x81; items[5] = 0x81; items[7] = 0x81; // (Moscow's coin and find, Siberia's ticket and lamp)
    const v1 = { ...snapshot(now), coins, items, roomId: 15, mapRow: 0, exitCol: 7 };
    const g = newGame(WORLD, true).g;
    const migrated = CODEC.unpack(CODEC.pack(v1), 1);
    restore(g, migrated);
    const b = { g, col: 0 };
    run(b, NONE, 4);
    g.enemies = [];
    run(b, NONE, 120);
    check(`a format 1 save reads as format ${CODEC.format}: Moscow's coin and find where they were, the ticket kept where it lies now, the lamp gone, and the cut shaft's save carries on in the mine, alive (room ${g.roomId})`,
      migrated.coins[3] === 0xff && migrated.coins.filter((c) => c).length === 1 && migrated.items[1] === 0x81 && migrated.items[itemIndex(now, SIB.yeti, 0)] === 0x81 && migrated.items.filter((c) => c).length === 2
      && migrated.roomId === RETIRED[15] && g.roomId === SIB.mine && !dead(g));
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
});

SCOPE.report();
finish();
