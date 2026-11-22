/**
 * Where the bot can get to in one of the Pacific's rooms from a start (a map of the cells his top left reached, the creatures out of the way unless CREATURES=1), for finding what a layout lacks:
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific-probe.ts <room name> <col> <floor> [rooms whose first find is held: stern,surf,lei]
 *
 * (a swim room's `floor` is where his feet would be: he swims from there). `COIN=col,row` says when the coin of that cell is first taken.
 */
import { enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { copy } from '../../montyotr/test/play';
import { WORLD } from '../src/data';
import { PAC } from '../src/pacific';
import { ACTIONS, hold, keyOf, newGame, STEP } from '../../shared/monty/test/bot';
import { coinIndex, itemIndex, standY } from './route';

const ROOM_NAMES = new Map<string, number>(Object.entries(PAC));
const named = (word: string): number => {
  const id = ROOM_NAMES.get(word);
  if (id === undefined) throw new Error(`no room called ${word}`);
  return id;
};
const room = named(process.argv[2] ?? 'stern'), col = Number(process.argv[3] ?? 3), floor = Number(process.argv[4] ?? 17);
const held = (process.argv[5] ?? '').split(',').filter((w) => w !== '').map(named);
const s = newGame(WORLD, false);
for (let i = 0; i < s.g.siCollected.length; i++) if ((s.g.data.specialItems[i * 4] ?? 0) < PAC.stern) s.g.siCollected[i] = 0x81;
for (const r of held) {
  const i = itemIndex(s.g, r, 0);
  s.g.siCollected[i] = 0x81;
  if (r === PAC.lei) wear(s.g, i);
}
enterRoom(s.g, room, 0x0c + (col + 4) * 4, standY(floor));
for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) hold(s, ACTIONS[4]?.[1] ?? { left: false, right: false, up: false, down: false, fire: false }, 1);
if (!process.env.CREATURES) { s.g.enemies = []; s.g.enable &= 0x0f; s.g.vic.enable &= 0x0f; }
console.log('from', s.g.roomId, s.g.montyCol - 4, s.g.montyRow - 3);
const seen = new Set([keyOf(s.g)]);
const want = (process.env.COIN ?? '').split(',').map(Number);
const wantIdx = want.length === 2 && !Number.isNaN(want[0]) ? coinIndex(s.g, room, want[0] ?? 0, want[1] ?? 0) : -1;
let hitAt = 0;
const cells = new Set<string>();
const rooms = new Map<number, string>();
let level = [s];
let nodes = 0;
while (level.length && nodes < 500000) {
  const next: typeof level = [];
  for (const n of level) {
    const acts = n.g.montyAction || n.g.falling || n.g.gameMode ? [ACTIONS[4]] : ACTIONS;
    for (const a of acts) {
      if (!a) continue;
      const t = { g: copy(n.g), col: n.col };
      const r = hold(t, a[1], STEP);
      nodes++;
      if (r.dead) continue;
      if (t.g.roomId !== room) { rooms.set(t.g.roomId, `${t.g.montyCol - 4},${t.g.montyRow - 3}`); continue; }
      if (wantIdx >= 0 && t.g.coinCollected[wantIdx] && !hitAt) hitAt = nodes;
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
    const reached = cells.has(`${c},${r + 3}`);
    line += reached ? '*' : f === 1 ? '#' : f === 2 ? '=' : f === 3 ? '|' : f === 4 ? '!' : '.';
  }
  lines.push(`${String(r).padStart(2)} ${line}`);
}
console.log(lines.join('\n'));
console.log(`coin first taken at node ${hitAt}; nodes ${nodes}; left to rooms: ${[...rooms].map(([id, at]) => `${id} at ${at}`).join(', ')}`);
