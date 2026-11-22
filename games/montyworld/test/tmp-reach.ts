import { copy, NONE, type State } from '../../montyotr/test/play';
import { ACTIONS, hold, keyOf, STEP } from './bot';
import { at } from './mech-kit';

const room = Number(process.env.R), col = Number(process.env.C), floor = Number(process.env.F);
const from: State = at(room, col, floor, [], false, process.env.CREATURES === '1');
const seen = new Set([keyOf(from.g)]), cells = new Set<string>();
let level = [from], nodes = 0;
while (level.length && nodes < 150000) {
  const next: State[] = [];
  for (const n of level) {
    for (const [, stick] of n.g.montyAction || n.g.falling || n.g.gameMode ? [ACTIONS[4] ?? ['.', NONE]] : ACTIONS) {
      const t: State = { g: copy(n.g), col: n.col };
      const r = hold(t, stick, STEP);
      nodes++;
      if (r.dead || t.g.roomId !== room) continue;
      cells.add(`${t.g.montyCol - 4},${t.g.montyRow}`);
      const k = keyOf(t.g);
      if (!seen.has(k)) { seen.add(k); next.push(t); }
    }
  }
  level = next;
}
const g = from.g;
console.log(Array.from({ length: 20 }, (_, r) => `${String(r).padStart(2)} ${Array.from({ length: 32 }, (_, c) => (cells.has(`${c},${r + 3}`) ? '*' : g.flagAt(r + 3, c + 4) === 1 ? '#' : g.flagAt(r + 3, c + 4) === 3 ? 'H' : g.flagAt(r + 3, c + 4) === 4 ? '~' : '.')).join('')}`).join('\n'));
