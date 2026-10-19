/**
 * Finds the routes the ending's montage replays (src/ending-scenes.ts): for each scene, from where BLOB comes into the room, a
 * search over the game's own frames (the stick held 4 frames at a time, the game copied at each step and run on from the copy:
 * `Flow.rooms(copy, hooks, true)`; states that are the same place and motion are met once; the cheapest first, leaning towards
 * the goal) for a run that does what the scene says, and the route as text for the scene's data. The game is run as the montage
 * runs it (nothing hurts him: a moment's grace), from the same start (`openScene`), so the route does the same there.
 *
 *   nice -n 15 node tools/test.mjs games/starquake/re/routes.ts [scene numbers ...]
 *   nice -n 15 node tools/test.mjs games/starquake/re/routes.ts try <room> <col> <row> <goals joined with +: take:n | near:col,row | ride | booth | room:n> [lying:graphic,col,row ...]
 */
import fs from 'node:fs';
import { PixelRenderer } from 'c64kit';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { copyState } from '../../shared/test/copy-state';
import { isMove, RoutePilot, routeText, stickOf, type Move } from '../../shared/ending/pilot';
import * as Flow from '../src/flow';
import { Game } from '../src/game';
import { isDone, joyOf, openScene, type Start } from '../src/ending';
import { SCENES, type Goal } from '../src/ending-scenes';
import { Stage } from '../src/stage';

const STEP = 4;
let QUICK = false;
const NODES = 600000;
const SECONDS = 170;
/** How hard the search leans towards the goal (1: the cheapest way). */
const HURRY = 2;
const MOVES: readonly Move[] = ['<', '>', '^', 'v', '.', '^<', '^>', 'v<', 'v>', '^v'].filter(isMove);
/** What a frame of a move costs: walking and flying 1; standing still, picking up 2; down (a platform built) 3, so he builds them where he must. */
const costOf = (move: Move) => (move.startsWith('v') ? 3 : move === '.' || move === '^v' ? 2 : 1);

type Search = Start & { goals: readonly Goal[] };

/** A game of the state of another, between frames, and the script that goes on from it. */
function copy(g: Game): Game {
  const c = new Game();
  copyState(c, g, new Set(['sound']));
  c.graceActive = g.graceActive;
  return c;
}

/** One frame with the move held (a copy's script goes on from the frame the copy was made in). */
function frame(g: Game, move: Move) {
  g.joy = joyOf(stickOf(move));
  g.key = 64;
  Flow.rooms(g, {}, true).next();
}

const key = (g: Game, stage: number) => [
  stage, g.room, g.col, g.row, g.sub, g.sprites.x[0], g.sprites.msb & 1, g.riding, g.falling, g.stepTimer, g.inLift, g.carried.join('.'),
  g.platforms.filter((p) => p.state !== 0xff).length, g.platformsLeft >> 3,
].join(',');

/** Where a goal is (cells), for the search to lean towards. */
function target(goal: Goal, g: Game): { col: number; row: number } | null {
  if ('near' in goal) return goal.near;
  if ('take' in goal) {
    const s = g.shown.find((t) => t.graphic === goal.take);
    return s ? { col: s.col, row: s.row } : null;
  }
  if ('ride' in goal) return g.padRow ? { col: g.padCol, row: g.padRow } : null;
  if ('booth' in goal) {
    const o = g.objects.slice(0, g.objectCount).find((t) => t.type === 0x3d);
    return o ? { col: o.col, row: o.row } : null;
  }
  if ('room' in goal) {
    const d = goal.room - g.room;
    return d === -1 ? { col: 0, row: g.row } : d === 1 ? { col: 39, row: g.row } : d < 0 ? { col: g.col, row: 5 } : { col: g.col, row: 24 };
  }
  return null;
}

function remaining(scene: Search, g: Game, stage: number): number {
  const goal = scene.goals[stage];
  const at = goal ? target(goal, g) : null;
  // (he goes about a cell in 2 frames sideways)
  const way = at ? (Math.abs(g.col - at.col) * 2 + Math.abs(g.row - at.row) * 3) : 0;
  return (scene.goals.length - stage) * 1000 + way * HURRY;
}

interface Node { g: Game; path: Move[]; stage: number; cost: number }

function search(scene: Search): Move[] | null {
  const g0 = new Game();
  const script = openScene(g0, scene);
  void script;
  const began = Date.now();
  const seen = new Set<string>([key(g0, 0)]);
  const buckets: Node[][] = [[{ g: g0, path: [], stage: 0, cost: 0 }]];
  let nodes = 0;
  const goalRoom = scene.goals.some((x) => 'room' in x);
  for (let level = 0; level < buckets.length; level++) {
    for (const { g, path, stage, cost } of buckets[level] ?? []) {
      const before = path[path.length - 1];
      const order = before ? [before, ...MOVES.filter((m) => m !== before)] : MOVES;
      for (const move of order) {
        const t = copy(g);
        let ok = true, now = stage;
        for (let s = 0; s < STEP && ok; s++) {
          frame(t, move);
          const goal = scene.goals[now];
          if (goal && isDone(goal, t)) now++;
          if (now >= scene.goals.length) return [...path, ...Array<Move>(s + 1).fill(move)];
          // (leaving the room, or a screen of its own, is a failure unless the goal is there)
          if ((t.room !== scene.room && !goalRoom) || t.inScreen || t.lives[0] * 10 + t.lives[1] !== g.lives[0] * 10 + g.lives[1]) ok = false;
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
      if (nodes > (QUICK ? 15000 : NODES) || Date.now() - began > (QUICK ? 8 : SECONDS) * 1000) { if (!QUICK) console.log(`  (given up after ${nodes} nodes, level ${level})`); return null; }
    }
    buckets[level] = [];
  }
  if (!QUICK) console.log(`  (no way found: ${nodes} nodes)`);
  return null;
}

const goalText = (g: readonly Goal[]) => JSON.stringify(g);

/** Where BLOB stands on his own in a room: cells he is still in after a few frames, on his feet (a map: o where, one character a cell, columns 4 to 35). */
function spots(room: number): string[] {
  const rows: string[] = [];
  for (let row = 6; row < 25; row++) {
    let line = '';
    for (let col = 4; col < 36; col++) {
      const g = new Game();
      try {
        const script = openScene(g, { room, spot: { col, row } });
        for (let f = 0; f < 6; f++) { g.joy = 0x7f; script.next(); }
        const stands = g.room === room && g.col === col && g.row === row && !g.falling && !g.dead;
        // (and he can walk from it: not stuck in the rock)
        let walks = false;
        for (const joy of [0x7f & ~4, 0x7f & ~8]) {
          const w = new Game();
          const run = openScene(w, { room, spot: { col, row } });
          for (let f = 0; f < 8; f++) { w.joy = joy; run.next(); }
          if (w.col !== col || w.sprites.x[0] !== g.sprites.x[0]) walks = true;
        }
        line += stands && walks ? 'o' : '.';
      } catch { line += '.'; } // (a place the game's tables don't reach)
    }
    rows.push(`${String(row).padStart(2)} ${line}`);
  }
  return rows;
}

/** Goals as the command line writes them (joined with +). */
function goalsOf(text: string): Goal[] {
  return text.split('+').map((one): Goal => {
    if (one.startsWith('take:')) return { take: parseInt(one.slice(5), 16) };
    if (one.startsWith('near:')) { const [c, r] = one.slice(5).split(',').map(Number); return { near: { col: c, row: r } }; }
    if (one.startsWith('room:')) return { room: Number(one.slice(5)) };
    if (one === 'ride') return { ride: true };
    if (one === 'booth') return { booth: true };
    return { won: true };
  });
}

const args = process.argv.slice(2);
if (args[0] === 'scan') {
  // scan <room> <goals> [lying:graphic,col,row]: the route from each place he can stand, short searches (the length of each that is found)
  const [, room, goal, ...rest] = args;
  const goals = goalsOf(goal);
  const lying = rest.filter((a) => a.startsWith('lying:')).map((a) => { const [gr, c, r] = a.slice(6).split(',').map(Number); return { graphic: gr, col: c, row: r }; });
  const map = spots(Number(room));
  QUICK = true;
  for (const line of map) {
    const row = Number(line.slice(0, 2));
    const cells = line.slice(3);
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] !== 'o' || i % 3 !== 0) continue;
      const start: Search = { room: Number(room), spot: { col: 4 + i, row }, goals, ...(lying.length ? { lying } : {}) };
      const route = search(start);
      if (route) console.log(`  from ${4 + i},${row}: ${route.length} frames`);
    }
  }
} else if (args[0] === 'shot') {
  // shot <out.png> <room> <col> <row> [route, or @file with it]: the picture after the route (BLOB where it leaves him), with sprites
  const [, out, room, col, row, route = ''] = args;
  const renderer = new PixelRenderer();
  const stage = new Stage(renderer);
  const g = stage.fresh();
  const script = openScene(g, { room: Number(room), spot: { col: Number(col), row: Number(row) } });
  const pilot = new RoutePilot(route.startsWith('@') ? fs.readFileSync(route.slice(1), 'utf8') : route);
  while (!pilot.done) { g.joy = joyOf(pilot.next()); script.next(); }
  for (let f = 0; f < 3; f++) { g.joy = 0x7f; script.next(); }
  stage.update(true);
  rgbPng(out, indicesToRgb(renderer.picture()), 320, 200, 2);
  console.log(`room ${g.room} col ${g.col} row ${g.row} riding ${g.riding} carried ${g.carried.map((c) => c.toString(16)).join(',')}`);
} else if (args[0] === 'spots') {
  for (const room of args.slice(1)) console.log(`room ${room}: columns 4 to 35\n${spots(Number(room)).join('\n')}`);
} else if (args[0] === 'try') {
  const [, room, col, row, goal, ...rest] = args;
  const goals = goalsOf(goal);
  const lying = rest.filter((a) => a.startsWith('lying:')).map((a) => { const [gr, c, r] = a.slice(6).split(',').map(Number); return { graphic: gr, col: c, row: r }; });
  const start: Search = { room: Number(room), spot: { col: Number(col), row: Number(row) }, goals, ...(lying.length ? { lying } : {}) };
  const route = search(start);
  console.log(`room ${room}: ${goalText(goals)}: ${route ? routeText(route) : 'NO ROUTE'}`);
} else {
  const only = args.map(Number);
  SCENES.forEach((scene, i) => {
    if (only.length && !only.includes(i)) return;
    if (scene.goals.some((x) => 'won' in x)) { console.log(`scene ${i} room ${scene.room}: the core (no route)`); return; }
    const route = search(scene);
    console.log(`scene ${i} room ${scene.room} ${goalText(scene.goals)}: ${route ? routeText(route) : 'NO ROUTE'}`);
  });
}
