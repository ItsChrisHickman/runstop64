/**
 * Which creature each room's tool is for (`TOOL_TARGET`, src/hints.ts), found by the passability bot and not by eye.
 *
 * For a room with a tool, Monty is put in at each side (`SIDES`: the first row from which the bot's map of the room, for Monty alone, has a
 * thousand states: as passable.ts takes a way in) and every goal of the room is asked of the bot twice: `plain`, without the tool (the bot's A*
 * over copies of the game, the creatures as they are: touching one is a death, so it goes round, waits or fails), and `with`, the tool taken
 * first and then the goal sought (touching a creature with it in hand destroys that creature). A goal the plain search does not meet in
 * `PLAIN_BUDGET` states and the tool's way does is a goal the tool opens, and the creature the tool's way destroys (the way is replayed
 * frame by frame, watching which creature `useTool` takes) is the one the tool is for. A room whose goals are all met plain has no target.
 * When the goals of a room name more than one creature, the one that opens most of them is the target (the others are in the notes).
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/tool-target.ts derive [from [to]]   (prints the table: `TOOL_TARGET`; about 13 minutes for all rooms)
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/tool-target.ts check [from [to]]    (the same, compared with `TOOL_TARGET`; the slow set, in two halves)
 */
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { check, finish } from '../../shared/test/check';
import { arrive, bitOf, factsOf, type Goal, goalName, goalsOf, RoomMap, search, sticksOf, withRoomsCoalTaken } from './bot';
import { ARRIVE_LEFT_X2, ARRIVE_RIGHT_X2, RemixGame } from '../src/game';
import { TOOL_TARGET } from '../src/hints';
import { step, type Play } from './harness';
import { copyPlay } from './bot-copy';

const PLAIN_BUDGET = Number(process.env.PLAIN_BUDGET ?? 6000);
const TOOL_BUDGET = Number(process.env.TOOL_BUDGET ?? 12000);
/** A way into a room is somewhere to be if a thousand states of its map can be reached from it (passable.ts's `ROOMY`). */
const ROOMY = 1000;
const SIDES = [['left', ARRIVE_LEFT_X2], ['right', ARRIVE_RIGHT_X2]] as const;

/** Monty at the left or right edge of a room on a row, as the way in from the next room puts him; null where the room is not that one. */
function seed(room: number, x2: number, row: number): Play | null {
  const g = new RemixGame();
  g.start(false);
  g.travelTo(room, x2, 50 + (3 + row) * 8);
  const p: Play = { g, col: 0 };
  for (let i = 0; i < 20 && (i === 0 || g.freeze || g.script); i++) g.frame(0);
  return g.roomId === room ? arrive(p, room) : null;
}

/** The creatures (slots) a way destroys with the tool, replayed from `start` frame by frame. */
function destroyed(start: Play, steps: Parameters<typeof sticksOf>[1]): number[] {
  const p = copyPlay(start);
  const out: number[] = [];
  for (const stick of sticksOf(start, steps)) {
    const had = p.g.carrying, before = p.g.creatures.map((e) => e.state);
    step(p, stick);
    if (had && !p.g.carrying) p.g.creatures.forEach((e, slot) => { if (e.state !== before[slot]) out.push(slot); });
  }
  return out;
}

interface Opened { readonly goal: string; readonly side: string; readonly slots: readonly number[] }

/** What the tool opens in a room: per goal and side. */
function opened(room: number): Opened[] {
  const out: Opened[] = [];
  for (const [side, x2] of SIDES) {
    for (let row = 0; row < 18; row++) {
      const s = seed(room, x2, row);
      if (s === null) continue;
      const map = new RoomMap(factsOf(s.g));
      map.addStart(s.g);
      map.explore();
      if (map.reachableSize(s.g) < ROOMY) continue;
      const facts = map.facts;
      for (const goal of goalsOf(s.g, facts)) {
        if (goal.kind === 'tool' || !map.reaches(s.g, bitOf(facts, goal))) continue;
        const from = goal.kind === 'exit' ? withRoomsCoalTaken(s, room) : s;
        if ('play' in search(from, map, goal, PLAIN_BUDGET)) continue;
        const tool = search(from, map, { kind: 'tool' } satisfies Goal, PLAIN_BUDGET);
        if (!('play' in tool)) continue;
        const then = search(tool.play, map, goal, TOOL_BUDGET);
        if (!('play' in then)) continue;
        const slots = destroyed(tool.play, then.steps);
        if (slots.length > 0) out.push({ goal: goalName(goal), side, slots });
      }
      break;
    }
  }
  return out;
}

/** The creature a room's tool is for, from what it opens: the one most goals need, the lowest slot of equals; null for none. */
function targetOf(list: readonly Opened[]): number | null {
  const count = new Map<number, number>();
  for (const o of list) for (const slot of new Set(o.slots)) count.set(slot, (count.get(slot) ?? 0) + 1);
  let best: number | null = null;
  for (const [slot, n] of [...count].sort((a, b) => a[0] - b[0])) if (best === null || n > (count.get(best) ?? 0)) best = slot;
  return best;
}

const mode = process.argv[2] === 'check' ? 'check' : 'derive';
const from = Number(process.argv[3] ?? 0), to = Number(process.argv[4] ?? ROOMS.length - 1);
const found: Record<number, number> = {};
for (const data of ROOMS) {
  if (data.object.sprite === 0 || data.id < from || data.id > to) continue;
  const t = Date.now();
  const list = opened(data.id);
  const target = targetOf(list);
  if (target !== null) found[data.id] = target;
  console.log(`room ${data.id}: ${target === null ? 'no target' : `slot ${target}`} (${list.map((o) => `${o.side} ${o.goal}: ${o.slots.join('+')}`).join('; ') || 'nothing needs the tool'}) ${Math.round((Date.now() - t) / 1000)} s`);
}
if (mode === 'derive') console.log(JSON.stringify(found));
else {
  check('TOOL_TARGET names no room that has no tool', Object.keys(TOOL_TARGET).every((k) => (ROOMS[Number(k)]?.object.sprite ?? 0) !== 0));
  const mine = Object.entries(TOOL_TARGET).filter(([k]) => Number(k) >= from && Number(k) <= to);
  check(`TOOL_TARGET is what the bot finds in rooms ${from} to ${to}: ${mine.length} rooms with a target, ${Object.keys(found).length} found`, mine.length === Object.keys(found).length && mine.every(([k, v]) => found[Number(k)] === v));
  finish();
}
