/**
 * Planes and hops, the three things that keep a player from being stuck in Denmark (Chris, 2026-11-14: Breakfast's bouncer looked
 * impossible, and nothing said a plane from Moledavia lands in Copenhagen):
 *   - the panel's prompt at a plane says where it flies, for every flight, in the slot's 22 cells (ENHANCED; up boards, 2026-11-15);
 *   - the pause map marks every plane's room he has stood in with a small plane, and the picked room's plane (his own room's if
 *     none is picked) has one line with an arrowhead to where it lands, and PLANE TO under its name (both modes; 2026-11-15: one
 *     flight at a time, not all their lines at once, nor colour badges);
 *   - the map leaves out the flight's sky (room $4F); ENHANCED keeps the Good Life shut until the ending is due;
 *   - ENHANCED's hoppers rest at the top of each hop, so Breakfast's crossing has a window a person can time; ORIGINAL's and the
 *     hoppers that bob in place are as they were.
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/flights.ts
 */
import { Surface } from 'c64kit';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { stickOf, isMove, type Move } from '../../shared/ending/pilot';
import { NO_ROOM, WORLD_GRID } from '../src/data';
import { sceneGame, stickBits } from '../src/ending';
import { REST_STEPS } from '../src/enemies';
import { destination, FLIGHT_ROOM } from '../src/flight';
import { ENEMY_HOLD, Game } from '../src/game';
import { decodeStick, Dir } from '../src/input';
import { awmMap, flightFrom, flightsSeen, noteRoom, progressLines, type AwmFound } from '../src/map';
import { flyPrompt } from '../src/panel';
import { Program } from '../src/program';
import { snapshot } from '../src/save';
import { State } from '../src/tiles';
import { placeName } from '../src/wants';
import { copyGame } from '../re/game-copy';
import { MAP_BOX } from '../../shared/native/pause';

const ROOMS = Array.from(WORLD_GRID).filter((r) => r !== NO_ROOM);
const FLIGHTS = ROOMS.flatMap((from) => {
  const to = destination(from);
  return to === null ? [] : [{ from, to }];
});

// ---- the prompt names where the plane goes
check(`there are flights (${FLIGHTS.length})`, FLIGHTS.length === 15);
for (const { from, to } of FLIGHTS) {
  const p = flyPrompt(to);
  const ok = p.length <= 22 && p.endsWith(placeName(to)) && p.startsWith('UP: ') && !p.includes('AIRPORT');
  check(`$${from.toString(16)}'s prompt fits and names the place (${p})`, ok);
}
check(`a short name says FLY TO (${flyPrompt(0x11)})`, flyPrompt(0x11) === 'UP: FLY TO PARIS');
check(`so does the longest (${flyPrompt(1)})`, flyPrompt(1) === 'UP: FLY TO COPENHAGEN');
check(`an airport reads as its country (${flyPrompt(0x28)})`, flyPrompt(0x28) === 'UP: FLY TO SPAIN');
check('only Copenhagen and Byorn fly both ways', FLIGHTS.filter((f) => destination(f.to) === f.from).map((f) => f.from).sort().join() === '0,1');

// ---- the map: a flight is drawn once its plane's room has been stood in
const none: AwmFound = { rooms: {} };
const moledavia: AwmFound = { rooms: { [0x40]: [0x40, 0x40, 0, 0] } };
check('nothing seen: no flights on the map', flightsSeen(none).length === 0);
check(`Moledavia seen: its plane to Copenhagen (${JSON.stringify(flightsSeen(moledavia))})`, JSON.stringify(flightsSeen(moledavia)) === JSON.stringify([{ from: 0x40, to: 1 }]));
const program = new Program();
const g0 = new Game(0x40);
program.resume(snapshot(g0, [null, null, null, null]), false);
/** The white pixels of the map drawn with what has been found and a room picked (blink off: his room, Moledavia, is yellow). */
function whites(found: AwmFound, pick: string | null = null): number {
  const s = new Surface(320, 200, 0);
  awmMap.draw(s, MAP_BOX, program, found, false, 0, undefined, pick);
  return s.pixels.filter((p) => p === 1).length;
}
const MARK = 8; // the plane mark's pixels
const amsterdam: AwmFound = { rooms: { ...moledavia.rooms, [0x05]: [0x40, 0x40, 0, 0] } };
const own = whites(moledavia), nothing = whites(none);
check(`standing at Moledavia's plane: its one arrow, to Copenhagen (${own} white pixels, ${nothing} with nothing seen)`, nothing === 0 && own > 60);
const unpicked = whites(amsterdam, '3');
check(`a room with no plane picked: no arrow, Amsterdam's plane mark alone (${unpicked})`, unpicked === MARK);
const picked = whites(amsterdam, '5');
check(`Amsterdam picked: its mark and its arrow, to Spain (${picked})`, picked > MARK + 60);
check('where a room he has stood in flies (and nothing for one not seen)', flightFrom(amsterdam, 5) === 0x28 && flightFrom(none, 5) === null && flightFrom(amsterdam, 3) === null);

// ---- ENHANCED: Breakfast's bouncer rests at the top of its hop
const parse = (s: string): Move[] => s.split(' ').filter(Boolean).flatMap((tok) => {
  const m = /^(.*?)(\d+)$/.exec(tok);
  const mv = m?.[1] ?? '';
  if (!m || !isMove(mv)) throw new Error(`a move: ${tok}`);
  return Array<Move>(Number(m[2])).fill(mv);
});
const go = (g: Game, mv: Move) => g.step(decodeStick(stickBits(stickOf(mv))));
/** Breakfast, Monty on its left ladder at the top, damage on, ENHANCED's rest as asked. */
function breakfast(rest: boolean): Game {
  const g = sceneGame({ room: 3, spot: { x: 48, y: 8 } });
  g.graceActive = () => false;
  g.hopsRest = () => rest;
  return g;
}
const BOUNCER = 2;
/** Logic steps the bouncer is still at its highest point, in its first 60. */
function topSteps(rest: boolean): number {
  const g = breakfast(rest);
  let n = 0;
  for (let i = 0; i < 60; i++) { g.step(0); if (g.enemies.y(BOUNCER) === 40) n++; }
  return n;
}
check(`ORIGINAL: the bouncer is at its top ${topSteps(false)} steps of 60`, topSteps(false) < 15);
check(`ENHANCED: it rests there ${REST_STEPS} more each time (${topSteps(true)} steps of 60)`, topSteps(true) >= 15 + REST_STEPS);
{
  // a hopper that bobs in place (Danube's) is left as it was
  const track = (rest: boolean) => {
    const g = new Game(0x15);
    g.hopsRest = () => rest;
    return Array.from({ length: 80 }, () => { g.step(0); return `${g.enemies.x(2)},${g.enemies.y(2)}`; }).join(' ');
  };
  check('a hopper bobbing in place does not rest', track(true) === track(false));
}
{
  // the crossing: from the left ladder, the moments from which "step right, hop onto the ledge, wait, walk on under it" gets past unhurt
  const hurt = (g: Game) => g.monty.state === State.Knocked || g.monty.state === State.Dying || g.monty.dead !== 0;
  const windows = (rest: boolean): number => {
    const ready = breakfast(rest);
    for (const mv of parse('v>4 v<32 >12')) go(ready, mv);
    check(`(on the ledge unhurt, ${rest ? 'ENHANCED' : 'ORIGINAL'})`, !hurt(ready) && ready.world.room === 3);
    let n = 0;
    for (let wait = 0; wait < 64; wait++) {
      const ok = [2, 6, 10, 14, 18, 22, 26, 30].some((k) => {
        const g = copyGame(ready);
        for (let i = 0; i < wait; i++) go(g, '.');
        for (const mv of parse(`>2 J>2 .${k} >30`)) { go(g, mv); if (hurt(g)) return false; }
        return g.monty.x >= 130 && g.world.room === 3;
      });
      if (ok) n++;
    }
    return n;
  };
  const before = windows(false), after = windows(true);
  check(`ORIGINAL: the crossing is one moment in 64 (${before})`, before <= 2);
  check(`ENHANCED: it is a window to time (${after} moments in 64)`, after >= 15);
}
{
  // the flight's sky (room $4F) is not a room on the map: not drawn, not counted, not noted
  const all: AwmFound = { rooms: {} };
  for (const r of ROOMS) all.rooms[r] = [0x40, 0x40, 0, 0];
  const g = must(program.game, 'the program has a game');
  check(`the map counts the world's rooms without the flight's sky (${progressLines(g, all)[1]})`, progressLines(g, all)[1] === `ROOMS 79/79`);
  check('the sky has no place to travel to', !awmMap.places(MAP_BOX, program, all).some((p) => p.id === String(FLIGHT_ROOM)));
  const sky = new Game(FLIGHT_ROOM);
  check('being in the sky does not note it', !noteRoom(sky, none) && none.rooms[FLIGHT_ROOM] === undefined);
}
{
  // ENHANCED: the Good Life waits for the end. Walking left out of the Harbour, ORIGINAL goes in and is stuck in its wall, as the
  // original is; ENHANCED stays in the Harbour and walks back; with everything delivered ENHANCED goes in, to the ending
  const fromHarbour = (waits: boolean, progress = 0) => {
    const g = new Game(0x4e);
    g.goodLifeWaits = () => waits;
    g.progress = progress;
    g.placeAt({ room: 0x4e, x: 0x20, y: 0x68, state: State.Free, step: 0 });
    for (let i = 0; i < 60; i++) g.step(Dir.Left);
    return g;
  };
  const orig = fromHarbour(false);
  const ox = orig.monty.x;
  for (let i = 0; i < 30; i++) orig.step(Dir.Right);
  check(`ORIGINAL: in the Good Life, stuck in its wall (room ${orig.world.room.toString(16)}, x ${ox} then ${orig.monty.x})`, orig.world.room === 0x4d && orig.monty.x === ox);
  const enh = fromHarbour(true);
  const ex = enh.monty.x;
  for (let i = 0; i < 30; i++) enh.step(Dir.Right);
  check(`ENHANCED: the Harbour's left edge holds, and he walks back (room ${enh.world.room.toString(16)}, x ${ex} then ${enh.monty.x})`, enh.world.room === 0x4e && enh.monty.x > ex);
  const done = fromHarbour(true, 0xc3);
  check(`ENHANCED, everything delivered: in, to the ending (room ${done.world.room.toString(16)}, state ${done.monty.state})`, done.world.room === 0x4d && done.monty.state === State.Ending);
}
{
  // ENHANCED: the creatures move at three quarters of their speed; ORIGINAL's are as they were
  const travelled = (hold: number): number => {
    const g = new Game(8);
    g.enemyHold = () => hold;
    const y0 = g.enemies.y(0);
    let moved = 0, y = y0;
    for (let i = 0; i < 80; i++) { g.step(0); moved += Math.abs(g.enemies.y(0) - y); y = g.enemies.y(0); }
    return moved;
  };
  const full = travelled(0), slow = travelled(ENEMY_HOLD);
  check(`ENHANCED: East Germany's riser covers three quarters of the ground (${slow} pixels to ${full} in 80 steps)`, Math.abs(slow * 4 - full * 3) <= 8);
  // Breakfast's crossing, slowed and not
  const ready = (hold: number) => { const g = breakfast(false); g.enemyHold = () => hold; for (const mv of parse('v>4 v<32 >12')) go(g, mv); return g; };
  const crossings = (hold: number): number => {
    const r = ready(hold);
    let n = 0;
    for (let wait = 0; wait < 64; wait++) {
      if ([2, 6, 10, 14, 18, 22, 26, 30, 34, 38].some((k) => {
        const g = copyGame(r);
        for (let i = 0; i < wait; i++) go(g, '.');
        for (const mv of parse(`>2 J>2 .${k} >30`)) { go(g, mv); if (g.monty.state === State.Knocked || g.monty.state === State.Dying || g.monty.dead !== 0) return false; }
        return g.monty.x >= 130 && g.world.room === 3;
      })) n++;
    }
    return n;
  };
  const slowed = crossings(ENEMY_HOLD);
  check(`ENHANCED's slower creatures widen Breakfast's crossing (${slowed} moments in 64, 1 at full speed)`, slowed >= 6);
}
{
  // the room west of East Germany (room 7) at full speed, damage on: down the right side, left along the low ledges between the
  // risers, and over the zapper into room 7's bottom corner (the top is no way: its burnable wall only burns to a walk, and the pits are deadly)
  const g = sceneGame({ room: 8, spot: { x: 196, y: 32 } });
  g.graceActive = () => false;
  let hurtOnWay = false;
  for (const mv of parse('>8 .19 <4 J<2 .21 >4 v2 J<2 .28 <2 v2 .2 J<2 .12 <1 J2 .8 <2 v2 J<2 .12 <5 v4 J<2 .32 <6')) {
    go(g, mv);
    if (g.monty.state === State.Knocked || g.monty.state === State.Dying || g.monty.dead !== 0) hurtOnWay = true;
    if (g.world.room !== 8) break;
  }
  check(`room 7 is reachable from East Germany at full speed (room ${g.world.room}, unhurt ${!hurtOnWay})`, g.world.room === 7 && !hurtOnWay);
}
must(program.game, 'the program has a game');

finish();
