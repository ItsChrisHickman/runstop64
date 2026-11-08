/**
 * Every room of Wanted: Monty Mole Remix passable on the remix's physics (docs/montymole-remix-plan.md, "Tests"): from the ways into a
 * room to each way out of it, to every piece of its coal and to its tool, played on the remix's own frames (test/bot.ts: a map of the room
 * for Monty alone says how far each state is from a goal; A* over copies of the game finds the way with the creatures, the crusher, the
 * floor and the gates as they are).
 *
 * The ways into a room are found by the bot itself, going out of the room before, starting from a new game: up to two different ones from
 * each side (`CROSSINGS`), the cheapest first, so the whole world is walked as a player walks it, down it and back (some of room 13's coal is
 * only to be had from the room beyond). A way in can land in a pocket that the player leaves by the way he came: from each way in every
 * way out is tried (so that the world is closed), and every piece of coal and the tool are played until one way in has given them. At the
 * end every goal of every room reached must have been met from one way in or another; a way out that is a wall in the original too
 * (`faithfulCan`: the faithful game's own map) is not a goal.
 *
 * `short` plays rooms 0 to 2 (about 10 seconds); `full` plays all 21 rooms (the slow set).
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/passable.ts short|full
 */
import { check, finish } from '../../shared/test/check';
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { arrive, bitOf, factsOf, faithfulCan, find, goalName, goalsOf, RoomMap, type Goal } from './bot';
import { ARRIVE_LEFT_X2, HOME_COL, HOME_ROW, PIT_ROOM, RemixGame } from '../src/game';
import { newGame, type Play } from './harness';

const mode = process.argv[2] === 'full' ? 'full' : 'short';
const SHORT_ROOMS = 3;
const BUDGET = Number(process.env.BUDGET ?? (mode === 'full' ? 40000 : 20000));
/** What a way out that is not the way on is given (the world is closed by them, but nothing needs them to be quick to find). */
const EXIT_BUDGET = 3000;
/** Different ways into a room that are taken from a way out, at most, from each room. */
const CROSSINGS = 2;
/** A way into a room is somewhere to be if a thousand states of the room's map can be reached from it (not a pocket of a ledge or two off the way). */
const ROOMY = 1000;

interface Arrival { readonly room: number; readonly via: string; readonly play: Play }

const queue: Arrival[] = [{ room: 0, via: 'start', play: arrive(newGame(), 0) }];
/** the maps of the rooms (made as a way into one is looked at), and the rooms a way in has been played from */
const maps = new Map<number, RoomMap>();
const reached = new Set<number>();
/** the rooms no way in could be made for */
const given = new Set<number>();
/** the ways out that go back (not the way on): met where they can be, but not asked for */
const back = new Set<string>();
/** per room: its goals, those met from some way in, the exits that were checked against the original and found a wall, and those that were not */
const goalsOfRoom = new Map<number, string[]>();
const metIn = new Map<number, Set<string>>();
const wall = new Map<number, Set<string>>();
const open = new Map<number, Set<string>>();
const taken = new Set<string>();
const ways = new Map<string, number>();
const notes: string[] = [];
let played = 0, met = 0, looked = 0;
const started = Date.now();

const setOf = <V>(m: Map<number, Set<V>>, room: number): Set<V> => { let s = m.get(room); if (s === undefined) { s = new Set<V>(); m.set(room, s); } return s; };

for (let a = next(); a !== undefined; a = next()) {
  const { play, room, via } = a;
  reached.add(room);
  const map = mapOf(play.g);
  const facts = map.facts;
  const goals = goalsOf(play.g, facts);
  goalsOfRoom.set(room, goals.map(goalName));
  const lines: string[] = [];
  for (const goal of goals) {
    const name = goalName(goal);
    const where = `room ${room} (in ${via}) ${name}`;
    if (goal.kind !== 'exit' && metIn.get(room)?.has(name) === true) { lines.push(`${name}: had`); continue; }
    if (!map.reaches(play.g, bitOf(facts, goal))) {
      if (goal.kind === 'exit') { if (faithfulCan(play.g, goal)) setOf(open, room).add(name); else setOf(wall, room).add(name); }
      lines.push(`${name}: no way on the map`);
      continue;
    }
    played++;
    const chain = goal.kind === 'exit' ? roomAfter(play.g, goal) : -1;
    if (goal.kind === 'exit' && chain !== room + 1) back.add(`${room}:${name}`);
    const slots = goal.kind === 'exit' ? CROSSINGS - (ways.get(`${chain}:${room}`) ?? 0) : 0;
    const wanted = Math.max(1, slots);
    const spots = new Set<string>();
    let first: number | null = null;
    for (let k = 0; k < wanted; k++) {
      const found = find(play, map, goal, goal.kind === 'exit' && chain !== room + 1 ? EXIT_BUDGET : BUDGET, goal.kind === 'exit' ? (g) => spots.has(spotOf(g)) || !roomy(g) : undefined);
      looked += found.expanded;
      if (!('play' in found)) {
        if (k === 0) notes.push(`${where}: ${found.why === 'budget' ? `not found in ${found.expanded} states` : 'no way in the game'} (${found.deaths} deaths)`);
        break;
      }
      if (k === 0) { met++; first = found.frames; setOf(metIn, room).add(name); }
      if (goal.kind === 'exit') { spots.add(spotOf(found.play.g)); enqueue(found.play, room, goal); }
    }
    // (room 16's pit: a way into it low down puts him into room 17; the first ways in are not low)
    if (goal.kind === 'exit' && chain === PIT_ROOM) {
      const lifted = find(play, map, goal, BUDGET, (g) => g.roomId !== PIT_ROOM + 1 || !roomy(g));
      looked += lifted.expanded;
      if ('play' in lifted) { met++; enqueue(lifted.play, room, goal); lines.push(`${name}: the pit, ${lifted.frames} frames`); } else notes.push(`${where}: no way into the pit (room ${PIT_ROOM + 1}) in ${lifted.expanded} states`);
    }
    lines.push(first === null ? `${name}: NOT FOUND` : `${name}: ${first} frames${spots.size > 1 ? ` (${spots.size} ways)` : ''}`);
  }
  console.log(`room ${String(room).padStart(2)} in ${via.padEnd(6)} map ${String(map.size).padStart(6)} states: ${lines.join('; ')}`);
}

/**
 * The next way into a room to play: from the queue, or, where the world has run out (a way on the bot did not find), a made one for the first room
 * not reached: Monty put in at the left side where a way in from the room before puts him (in room 17, by the pit), on the first row from which
 * a thousand states of the map are his; the rooms after it follow from it as from any. Said in the notes.
 */
function next(): Arrival | undefined {
  const queued = queue.shift();
  if (queued !== undefined) return queued;
  if (mode === 'short') return undefined;
  const room = ROOMS.findIndex((r) => !reached.has(r.id) && !given.has(r.id));
  if (room < 0) return undefined;
  for (let row = 0; row < 18; row++) {
    const g = new RemixGame();
    g.start();
    g.travelTo(room === PIT_ROOM + 1 ? PIT_ROOM : room, ARRIVE_LEFT_X2, 50 + (3 + (room === PIT_ROOM + 1 ? 17 : row)) * 8);
    const p: Play = { g, col: 0 };
    for (let i = 0; i < 20 && (i === 0 || g.freeze || g.script); i++) g.frame(0);
    if (g.roomId !== room) continue;
    const seeded = arrive(p, room);
    if (!roomy(seeded.g)) continue;
    notes.push(`room ${room} was not reached from the room before: put in at the left, row ${row}`);
    return { room, via: 'seed', play: seeded };
  }
  notes.push(`room ${room} was not reached, and no way in from the left is somewhere to be`);
  given.add(room); // (so as not to look again)
  return next();
}

/** The map of the room a game is in, with where it is as one of its starts. */
function mapOf(g: Play['g']): RoomMap {
  let map = maps.get(g.roomId);
  if (map === undefined) { map = new RoomMap(factsOf(g)); maps.set(g.roomId, map); }
  map.addStart(g);
  map.explore();
  return map;
}

/** Whether a way into a room is somewhere to be (`ROOMY`). */
function roomy(g: Play['g']): boolean {
  return mapOf(g).reachableSize(g) >= ROOMY;
}

/** The room a way out leads to. */
function roomAfter(g: Play['g'], goal: Goal & { kind: 'exit' }): number {
  const to = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[goal.direction];
  return g.roomAt(HOME_ROW + to[0], HOME_COL + to[1]);
}

/** Where a way into a room is, so that a second one is a different one. */
function spotOf(g: Play['g']): string { return `${g.x2 >> 2}:${g.y >> 3}`; }

/** A way out found: the way into the room it leads to (two from each room, at most). */
function enqueue(found: Play, from: number, goal: Goal & { kind: 'exit' }): void {
  const dest = found.g.roomId;
  if (dest >= ROOMS.length || (mode === 'short' && dest >= SHORT_ROOMS)) return;
  const via = `${from}${goal.direction[0]}`;
  const spot = `${dest}:${via}:${spotOf(found.g)}`;
  if (taken.has(spot) || (ways.get(`${dest}:${from}`) ?? 0) >= CROSSINGS) return;
  taken.add(spot);
  ways.set(`${dest}:${from}`, (ways.get(`${dest}:${from}`) ?? 0) + 1);
  queue.push({ room: dest, via, play: arrive(found, dest) });
}

// every goal of every room reached, met from some way in (the walls apart)
const failures: string[] = [];
for (const [room, goals] of goalsOfRoom) {
  for (const name of goals) {
    if (metIn.get(room)?.has(name)) continue;
    if (open.get(room)?.has(name) !== true && wall.get(room)?.has(name) === true) continue; // a wall in the original too
    if (back.has(`${room}:${name}`)) continue; // (a way back: the game goes on down the world)
    failures.push(`room ${room}: ${name} was met from none of the ways in`);
  }
}
const roomsReached = [...reached].sort((x, y) => x - y);
console.log(`${met} goals met of ${played} played; ${looked} states looked at in ${Math.round((Date.now() - started) / 1000)} s; rooms reached: ${roomsReached.join(' ')}`);
for (const n of notes) console.log(`  note: ${n}`);
for (const f of failures) console.log(`  FAILED: ${f}`);
check(`every goal of every room met from some way in (${mode}: ${failures.length} not)`, failures.length === 0 && played >= 15);
check(mode === 'full' ? 'all 21 rooms were reached' : `rooms 0 to ${SHORT_ROOMS - 1} were reached`, mode === 'full' ? reached.size === ROOMS.length : roomsReached.length >= SHORT_ROOMS);
finish();
