/** Where the bot can get to in one room from a start (a map of cells his top left reached), for finding what a layout lacks. */
import { enterRoom } from '../../montyotr/src/ending';
import { WORLD } from '../src/data';
import { ACTIONS, hold, keyOf, newGame, STEP } from '../../shared/monty/test/bot';
import { copy } from '../../montyotr/test/play';
import { LEGS, standY } from './route';
import { play, search } from '../../shared/monty/test/bot';

const room = Number(process.argv[2] ?? 0), col = Number(process.argv[3] ?? 3), floor = Number(process.argv[4] ?? 17);
let s = newGame(WORLD, false);
const legs = Number(process.argv[5] ?? 0);
for (const leg of LEGS.slice(0, legs)) { const f = search(s, leg.goal, leg.aim); if (!f) throw new Error(leg.name); const n = play(s, f.route); if (!n) throw new Error('died ' + leg.name); s = n; }
if (legs === 0 && (room !== 0 || col !== 3 || floor !== 17)) enterRoom(s.g, room, 0x0c + (col + 4) * 4, standY(floor));
console.log('from', s.g.roomId, s.g.montyCol - 4, s.g.montyRow - 3);
const probeGoal = LEGS[Number(process.argv[6] ?? -1)]?.goal;
let hit = 0;
const seen = new Set([keyOf(s.g)]);
const cells = new Set<string>();
const rooms = new Set<number>();
let level = [s];
let nodes = 0;
while (level.length && nodes < 300000) {
  const next: typeof level = [];
  for (const n of level) {
    const acts = n.g.montyAction || n.g.falling || n.g.gameMode ? [ACTIONS[4]] : ACTIONS;
    for (const a of acts) {
      if (!a) continue;
      const t = { g: copy(n.g), col: n.col };
      const r = hold(t, a[1], STEP);
      nodes++;
      if (r.dead) continue;
      if (t.g.roomId !== room) { rooms.add(t.g.roomId); continue; }
      if (probeGoal && probeGoal(t.g) && !hit) { hit = nodes; }
      cells.add(`${t.g.montyCol - 4},${t.g.montyRow}`);
      const k = keyOf(t.g);
      if (seen.has(k)) continue;
      seen.add(k);
      next.push(t);
    }
  }
  level = next;
}
const g = s.g;
const lines: string[] = [];
for (let r = 0; r < 20; r++) {
  let line = '';
  for (let c = 0; c < 32; c++) {
    const f = g.flagAt(r + 3, c + 4);
    const reached = cells.has(`${c},${r + 3}`) ;
    line += reached ? '*' : f === 1 ? '#' : f === 2 ? '=' : f === 3 ? '|' : f === 4 ? '!' : '.';
  }
  lines.push(line);
}
console.log(lines.join('\n'));
console.log(`goal first reached at node ${hit}; nodes ${nodes}, left to rooms: ${[...rooms].join(',')}`);
