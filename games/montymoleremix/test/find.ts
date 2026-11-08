/**
 * Looking at the bot (not a check): the bot's search for one goal from a place in a room, with where it was found. A way into the next
 * room has to be a room to be in (a thousand states of its map, as passable.ts asks).
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/find.ts <room> <x2> <y> <goals: piece:N | tool | up | down | left | right, ...>
 *   (BUDGET=n: how many states; `start` for x2 is the new game's room 0)
 */
import { arrive, factsOf, find, goalName, RoomMap, type Goal } from './bot';
import { newGame } from './harness';
const [room, x2, y, what] = process.argv.slice(2);
const parse = (w: string | undefined): Goal => w?.startsWith('piece:') ? { kind: 'piece', id: Number(w.slice(6)) } : w === 'tool' ? { kind: 'tool' } : { kind: 'exit', direction: w === 'up' || w === 'down' || w === 'left' ? w : 'right' };
const p = newGame();
if (x2 !== 'start') p.g.enterAt(Number(room), Number(x2), Number(y));
const start = arrive(p, Number(room));
const maps = new Map<number, RoomMap>();
const goals = (what ?? '').split(',').map(parse);
const map = new RoomMap(factsOf(start.g));
map.addStart(start.g);
map.explore();
maps.set(start.g.roomId, map);
let shown = 0;
for (const goal of goals) {
  const t = Date.now();
  const r = find(start, map, goal, Number(process.env.BUDGET ?? 20000), goal.kind === 'exit' ? (g) => {
    let m = maps.get(g.roomId);
    if (m === undefined) { m = new RoomMap(factsOf(g)); maps.set(g.roomId, m); }
    m.addStart(g);
    m.explore();
    const n = m.reachableSize(g);
    if (shown++ < 6) console.log(`candidate into room ${g.roomId}: x2 ${g.x2} y ${g.y} action ${g.montyAction} falling ${g.falling} onRope ${g.onRope} reaches ${n} of ${m.size}`);
    return n < 1000;
  } : undefined);
  console.log(goalName(goal), 'play' in r ? `found in ${r.frames} frames` : `failed ${r.why} deaths ${r.deaths} nearest ${r.nearest} rejected ${r.rejected}`, `${r.expanded} states ${Date.now() - t} ms`);
}
