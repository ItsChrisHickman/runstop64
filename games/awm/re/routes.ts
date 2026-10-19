/**
 * Finds the routes the ending's montage replays (src/ending-scenes.ts): for each scene, from where Monty comes into the room, a
 * breadth-first search over the game's own logic steps (a stick held 4 steps at a time, the game copied at each step: its
 * enemies, lift and random numbers part of where it is; states that are the same place and motion are met once) for the
 * cheapest run (a jump costs twice a step of walking, so he runs where he can) that does what the scene says, and the route as text for the scene's data. The game is run as the montage
 * runs it (nothing hurts him: a moment's grace), from the same start (`sceneGame`), so the route does the same there.
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/routes.ts [scene numbers ...]
 *
 * Scenes are numbered from 0 in `SCENES`; a room as `r:1a` tries a scene of that room (the first); `try room x y goal` below
 * is for choosing a start: `nice -n 15 node tools/test.mjs games/awm/re/routes.ts try 13 20 100 take:93`.
 */
import { TABLES, WORLD_GRID } from '../src/data';
import { isPlane } from '../src/enemies';
import { decodeStick, Stick } from '../src/input';
import { COLS } from '../src/room';
import { State } from '../src/tiles';
import { Game } from '../src/game';
import { stickOf, isMove, routeText, type Move } from '../../shared/ending/pilot';
import { atPlane, isDone, sceneGame, stickBits } from '../src/ending';
import { SCENES, type Goal, type Scene } from '../src/ending-scenes';
import { copyGame } from './game-copy';

/** Logic steps a stick is held for. */
const STEP = 4;
/** How hard the search leans towards the goal (1: the cheapest way, more: a way found sooner, not always the cheapest). */
const HURRY = 2;
/** A scene is given up after this many nodes or seconds (the machine is shared). */
const NODES = 600000;
const SECONDS = 150;
const MOVES: readonly Move[] = ['<', '>', '^', 'v', '.', 'J', 'J<', 'J>', '^<', '^>', 'v<', 'v>'].filter(isMove);

type Start = Pick<Scene, 'room' | 'spot' | 'taken' | 'carry' | 'progress' | 'goals'>;

const key = (g: Game, stage: number) => {
  const m = g.monty;
  return [stage, m.x, m.y, m.state, m.step, m.faceLeft ? 1 : 0, m.jumpDir, m.blocked, g.world.room, g.items.carried.join('.'), g.progress].join(',');
};

/** Steps `g` one logic step with the move (the key down for a plane if asked). */
function step(g: Game, move: Move, key = false) {
  g.step(decodeStick(stickBits(stickOf(move))), key);
}

/** What a step of a move costs: walking and climbing 1; a jump or standing still 2 (so he runs where he can and jumps where he must). */
const costOf = (move: Move) => (move.startsWith('J') || move === '.' ? 2 : 1);

interface Node { g: Game; path: Move[]; stage: number; cost: number }

/** Where a goal is (pixels of the play area), for the search to lean towards, or null (a goal with nowhere to go: the ending's). */
function target(goal: Goal, g: Game): { x: number; y: number } | null {
  if ('near' in goal) return goal.near;
  if ('take' in goal) {
    const e = TABLES.items[goal.take];
    return e ? { x: (e.cell % COLS) * 8 - 3, y: Math.floor(e.cell / COLS) * 8 - 2 } : null;
  }
  if ('board' in goal) {
    const slot = [0, 1, 2, 3].find((s) => isPlane(g.enemies.frame(s)));
    return slot === undefined ? null : { x: g.enemies.x(slot), y: g.enemies.y(slot) };
  }
  if ('dance' in goal) {
    const e = TABLES.items.find((it) => it.room === g.world.room && it.type === 8);
    return e ? { x: (e.cell % COLS) * 8 - 3, y: Math.floor(e.cell / COLS) * 8 - 2 } : null;
  }
  if ('enter' in goal) {
    // (the edge of the room the way there goes by)
    const to = goal.enter, here = g.world.room;
    const at = (r: number) => WORLD_GRID.indexOf(r);
    const d = at(to) - at(here);
    return d === -1 ? { x: 0, y: g.monty.y } : d === 1 ? { x: 0xf8, y: g.monty.y } : d < 0 ? { x: g.monty.x, y: 0 } : { x: g.monty.x, y: 0x8e };
  }
  return null;
}

/** How far the search thinks he is from done: the goals left (a thousand each) and the way to the next one in steps (he goes about 2 pixels a step). */
function remaining(scene: Start, g: Game, stage: number): number {
  const goal = scene.goals[stage];
  const at = goal ? target(goal, g) : null;
  const way = at ? Math.abs(g.monty.x - at.x) / 2 + Math.abs(g.monty.y - at.y) / 3 : 0;
  return (scene.goals.length - stage) * 1000 + way * HURRY;
}

function search(scene: Start): Move[] | null {
  const root = sceneGame(scene);
  // (a place that ends with an item taken or a room entered ends with him on his feet, not mid-jump: he does not go on out of the room)
  const lastGoal = scene.goals[scene.goals.length - 1];
  const needsSettle = !!lastGoal && ('take' in lastGoal || 'near' in lastGoal || 'enter' in lastGoal);
  const began = Date.now();
  const seen = new Set<string>([key(root, 0)]);
  // (cheapest first: the nodes by what getting there cost)
  const buckets: Node[][] = [[{ g: root, path: [], stage: 0, cost: 0 }]];
  let nodes = 0;
  for (let level = 0; level < buckets.length; level++) {
    for (const { g, path, stage, cost } of buckets[level] ?? []) {
      const before = path[path.length - 1];
      const order = before ? [before, ...MOVES.filter((m) => m !== before)] : MOVES;
      for (const move of order) {
        const t = copyGame(g);
        const room = scene.room;
        let ok = true;
        let now = stage;
        for (let s = 0; s < STEP && ok; s++) {
          step(t, move);
          const goal = scene.goals[now];
          if (goal && isDone(goal, t)) now++;
          if (now >= scene.goals.length && (!needsSettle || t.monty.state === State.Free)) return [...path, ...Array<Move>(s + 1).fill(move)];
          // (a room left is a failure, unless a goal is to go to one)
          if (t.world.room !== room && !scene.goals.some((x) => 'enter' in x)) ok = false;
          if (t.lives !== g.lives || t.monty.dead) ok = false;
        }
        nodes++;
        if (!ok) continue;
        const k = key(t, now);
        if (seen.has(k)) continue;
        seen.add(k);
        const spent = cost + STEP * costOf(move);
        const to = Math.max(level, Math.round(spent + remaining(scene, t, now)));
        while (buckets.length <= to) buckets.push([]);
        buckets[to]?.push({ g: t, path: [...path, ...Array<Move>(STEP).fill(move)], stage: now, cost: spent });
      }
      if (nodes > NODES || Date.now() - began > SECONDS * 1000) { console.log(`  (given up after ${nodes} nodes, level ${level})`); return null; }
    }
    // (a bucket done with is let go)
    buckets[level] = [];
  }
  console.log(`  (no way found: ${nodes} nodes)`);
  return null;
}

const goalText = (g: readonly Goal[]) => JSON.stringify(g);

/** Where Monty stands on his own in a room: aligned places that are still his after three steps (on his feet, nothing moving him). */
function spots(room: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 8; y < 0x90; y += 8) {
    for (let x = 0x10; x < 0xf0; x += 8) {
      const g = sceneGame({ room, spot: { x, y } });
      for (let i = 0; i < 4; i++) g.step(0, false);
      const m = g.monty;
      if (!(m.x === x && m.y === y && m.state === 0 && g.world.room === room)) continue;
      // (and he can walk from it: not stuck in something)
      const w = sceneGame({ room, spot: { x, y } });
      for (let i = 0; i < 6; i++) w.step(decodeStick(Stick.Right), false);
      const v = sceneGame({ room, spot: { x, y } });
      for (let i = 0; i < 6; i++) v.step(decodeStick(Stick.Left), false);
      if (w.monty.x !== x || v.monty.x !== x) out.push({ x, y });
    }
  }
  return out;
}

const args = process.argv.slice(2);
if (args[0] === 'spots') {
  for (const arg of args.slice(1)) {
    const found = spots(parseInt(arg, 16));
    // (as a map of the room, 8 pixels a character: o where he can stand)
    const rows: string[] = [];
    for (let y = 8; y < 0x90; y += 8) rows.push(`${y.toString().padStart(3)} ` + Array.from({ length: 30 }, (_, i) => (found.some((s) => s.x === 0x10 + i * 8 && s.y === y) ? 'o' : '.')).join(''));
    console.log(`room ${arg}: x from 16 by 8\n${rows.join('\n')}`);
  }
} else if (args[0] === 'try') {
  // try <room> <x> <y> <goals joined with +: take:n | enter:n | near:x,y | board | dance | ending> [left] [carry:t,t] [progress:n]
  const [, room, x, y, goal, ...rest] = args;
  const g: Goal[] = goal.split('+').map((one) => (one.startsWith('take:') ? { take: Number(one.slice(5)) } : one.startsWith('enter:') ? { enter: parseInt(one.slice(6), 16) } : one.startsWith('near:') ? { near: { x: Number(one.slice(5).split(',')[0]), y: Number(one.slice(5).split(',')[1]) } } : one === 'board' ? { board: true } : one === 'dance' ? { dance: true } : { ending: true }));
  const carry = rest.find((a) => a.startsWith('carry:'))?.slice(6).split(',').map(Number);
  const progress = rest.find((a) => a.startsWith('progress:'));
  const start: Start = {
    room: parseInt(room, 16), spot: { x: Number(x), y: Number(y), faceLeft: rest.includes('left') }, goals: g,
    ...(carry ? { carry } : {}), ...(progress ? { progress: Number(progress.slice(9)) } : {}),
  };
  const route = search(start);
  console.log(`room $${room}: ${goalText(g)}: ${route ? routeText(route) : 'NO ROUTE'}`);
  if (route && atPlane(sceneGame(start))) console.log('(already at a plane)');
} else {
  const only = args.map(Number);
  SCENES.forEach((scene, i) => {
    if (only.length && !only.includes(i)) return;
    const route = search(scene);
    console.log(`scene ${i} room $${scene.room.toString(16)} ${goalText(scene.goals)}: ${route ? routeText(route) : 'NO ROUTE'}`);
  });
}
