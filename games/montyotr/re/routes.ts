/**
 * Finds the routes the ending's montage replays (src/ending-scenes.ts): for each scene, from where Monty comes into the
 * room, a beam search over the game's own frames (the stick held 8 frames at a time, the game copied at each step, its
 * enemies and crushers part of where it is; at each depth the states nearest the goal are kept) for a run that does what
 * the scene says without a death, and the route as text for the scene's data. The crushers and teleporters take
 * `g.random()`, which takes `Math.random`: seeded here, so the same run each time.
 *
 *   nice -n 15 node tools/test.mjs games/montyotr/re/routes.ts [room ...]
 *
 * With rooms, only those scenes; with `spots <room>`, the places Monty can stand in a room (to choose where a scene starts).
 */
import { specialItems } from '../src/data';
import { isDone, SCENES, type Scene } from '../src/ending-scenes';
import { Game, ROW, SCREEN } from '../src/game';
import { copyGame } from '../src/game-copy';
import { MOVES, routeText, stickOf, type Move } from '../src/pilot';
import { arrive, frame, NONE, settled, type State } from '../test/play';

{
  let seed = 12345;
  Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
}

const STEP = 8;
const STAND: Move = '.';
/** States kept at each depth (the nearest the goal). */
const BEAM = 600;
/** Depth: 100 steps of 8 frames is 16 seconds. */
const DEPTH = 100;
/** A scene is given up after this long (the machine is shared). */
const SECONDS = 240;

/** Where Monty stands on his own in a room: every aligned place with a floor under it and nothing in the way. */
function spots(room: number): { x2: number; y: number }[] {
  const out: { x2: number; y: number }[] = [];
  for (let y = 0x4a; y < 0xd8; y += 8) {
    for (let x2 = 0x14; x2 < 0x9c; x2 += 4) {
      const g = new Game();
      g.start();
      if (!arrive(g, room, x2, y)) return out;
      const free = [0, 1, 40, 41].every((o) => g.tileFlag(g.chr(g.montyChr + o)) !== 1);
      const s: State = { g, col: 0 };
      frame(s, NONE); frame(s, NONE);
      if (free && g.x2 === x2 && g.y === y && !g.falling && !g.montyAction && !g.actionCounter) out.push({ x2, y });
    }
  }
  return out;
}

/** What the game looks like to the search: where he is and how, and where the room's enemies, crushers and lifts are. */
const key = (g: Game) => g.showJetpack
  // (flying he is anywhere: a place to a few pixels, the enemies to a few characters)
  ? [g.x2 >> 2, g.y >> 2, g.frameToggle, ...g.enemies.map((e) => `${e.x >> 4}/${e.y >> 4}/${e.flags >> 7}`)].join(',')
  : [
  g.x2, g.y, g.onRope, g.montyAction, g.arcIdx, g.falling, g.facing >> 7, g.frameToggle, g.jetpackActive,
  ...g.enemies.map((e) => `${e.x >> 3}/${e.y >> 3}/${e.flags >> 7}`), g.pd.state, g.pd.index, g.pd.position >> 3, g.lift.y, g.lift.x,
].join(',');

/** How far the scene's goal is (in characters) from where he is with `stage` of the places to go by behind him: the next of them, or the item, the treasure, or the nearest coin left. */
function distance(scene: Scene, g: Game, stage: number): number {
  const goals: { x2: number; y: number }[] = [];
  const via = scene.via?.[stage];
  if (via) {
    goals.push(via);
  } else if ('item' in scene.take) {
    const i = scene.take.item;
    goals.push({ x2: specialItems[i * 4 + 1], y: specialItems[i * 4 + 2] });
  } else if ('drive' in scene.take) {
    goals.push({ x2: scene.take.drive, y: g.y });
  } else if ('treasure' in scene.take) {
    goals.push({ x2: 0x40, y: 0x9a });
  } else {
    for (const e of g.entities) {
      if (e.index < 0) continue;
      const o = e.at - SCREEN;
      goals.push({ x2: 0x0c + (o % ROW) * 4, y: 0x32 + Math.floor(o / ROW) * 8 });
    }
  }
  const left = (scene.via?.length ?? 0) - stage;
  return left * 1000 + Math.min(...goals.map((t) => Math.abs(g.x2 - t.x2) / 4 + Math.abs(g.y - t.y) / 8), 1000);
}

function search(scene: Scene): Move[] | null {
  const g = new Game();
  g.start();
  g.assist = { cloud: true, jetpack: true, c5: true, rooms: false, respawn: true };
  scene.prepare(g);
  if (!arrive(g, scene.room, scene.spot.x2, scene.spot.y, scene.spot.facing)) return null;
  g.score = 0;
  const seen = new Set<string>([key(g)]);
  let level: { s: State; path: Move[]; stage: number }[] = [{ s: { g, col: 0 }, path: [], stage: 0 }];
  const began = Date.now();
  for (let depth = 0; depth < DEPTH && level.length && Date.now() - began < SECONDS * 1000; depth++) {
    const next: { s: State; path: Move[]; h: number; stage: number }[] = [];
    for (const { s, path, stage } of level) {
      // (what he did last first, then standing still: the first way to a place found is the smoothest)
      const before = path[path.length - 1];
      const acts: readonly Move[] = (s.g.montyAction || s.g.falling) && !s.g.showJetpack ? ['.'] : [...(before ? [before] : []), STAND, ...MOVES].filter((m, i, a) => a.indexOf(m) === i);
      for (const move of acts) {
        const t: State = { g: copyGame(s.g), col: s.col };
        let ok = true, frames = 0;
        for (; frames < STEP && ok; ) {
          frame(t, stickOf(move));
          frames++;
          // (the treasure's ending takes the game over: that is the goal, not a failure)
          if (isDone(scene, t.g)) return [...path, ...Array<Move>(frames).fill(move)];
          if (t.g.actionCounter || t.g.roomId !== scene.room || !settled(t.g)) ok = false;
        }
        if (!ok) continue;
        const p = [...path, ...Array<Move>(STEP).fill(move)];
        const k = key(t.g);
        if (seen.has(k)) continue;
        seen.add(k);
        // (a place gone by when he is within a character of it)
        const via = scene.via?.[stage];
        const reached = via !== undefined && Math.abs(t.g.x2 - via.x2) <= 4 && Math.abs(t.g.y - via.y) <= 8;
        const now = reached ? stage + 1 : stage;
        next.push({ s: t, path: p, h: distance(scene, t.g, now), stage: now });
      }
    }
    next.sort((a, b) => a.h - b.h);
    level = next.slice(0, BEAM).map(({ s, path, stage }) => ({ s, path, stage }));
  }
  console.log('  (no way found)');
  return null;
}

const args = process.argv.slice(2);
if (args[0] === 'spots') {
  const room = parseInt(args[1], 16);
  console.log(spots(room).map((s) => `${s.x2.toString(16)},${s.y.toString(16)}`).join(' '));
} else {
  const only = args.map((a) => parseInt(a, 16));
  for (const scene of SCENES) {
    if (only.length && !only.includes(scene.room)) continue;
    const route = search(scene);
    console.log(`room $${scene.room.toString(16)}: ${route ? routeText(route) : 'NO ROUTE'}`);
  }
}
