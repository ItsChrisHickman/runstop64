/**
 * What meets Monty as he comes into a room at one place (the reviewers' "death by luck" check, kept as a tool so nobody writes it again): he is put down
 * at a cell facing the room, the room's creatures fresh as on every entry, and the probe reports how long he lives standing, how long walking each way,
 * and the frames (after entry) on which a jump each way, then standing or jumping on the same way, keeps him alive for `--live` frames. A room whose only window is a frame or two
 * is a trap for a person; one that kills him standing in a few frames gives him no time to read it.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/entry-probe.ts <room id> <col> <floor row> [left|right facing] [--live 90]
 */
import { enterRoom } from '../../montyotr/src/ending';
import { copy, NONE, type State } from '../../montyotr/test/play';
import { WORLD } from '../src/data';
import { ACTIONS, hold, newGame } from '../../shared/monty/test/bot';
import { standY } from './route';

const args = process.argv.slice(2);
const liveAt = args.indexOf('--live');
const live = liveAt >= 0 ? Number(args[liveAt + 1] ?? 90) : 90;
const [room = 0, col = 3, floor = 17] = args.filter((_, i) => liveAt < 0 || (i !== liveAt && i !== liveAt + 1)).slice(0, 3).map(Number);
const facingLeft = args.includes('left');
const stick = (name: string) => ACTIONS.find(([n]) => n === name)?.[1] ?? NONE;

const start = newGame(WORLD, false);
if (!enterRoom(start.g, room, 0x0c + (col + 4) * 4, standY(floor), facingLeft ? 0x80 : 0x01)) throw new Error(`no room ${room}`);
const fresh = (): State => ({ g: copy(start.g), col: start.col });

/** Frames until a death holding `name` (or null if he lives `limit` frames, or leaves the room: then the frame he left, as `left`). */
function lives(name: string, limit: number): string {
  const s = fresh();
  for (let f = 1; f <= limit; f++) {
    const r = hold(s, stick(name), 1);
    if (r.dead) return `dies at frame ${f} (col ${s.g.montyCol - 4})`;
    if (r.room !== null) return `leaves into room ${r.room} at frame ${f}`;
  }
  return `alive after ${limit}`;
}

console.log(`room ${room}, in at col ${start.g.montyCol - 4}, row ${floor}, facing ${facingLeft ? 'left' : 'right'}`);
for (const name of ['.', '<', '>']) console.log(`  holding ${name === '.' ? 'still' : name}: ${lives(name, 300)}`);
for (const [jump, then] of [['J<', '.'], ['J<', 'J<'], ['J>', '.'], ['J>', 'J>']] as const) {
  const ok: number[] = [];
  for (let wait = 0; wait <= 120; wait++) {
    const s = fresh();
    if (wait && hold(s, NONE, wait).dead) break;
    const r = hold(s, stick(jump), 2);
    if (r.dead || r.room !== null) { if (!r.dead) ok.push(wait); continue; }
    const after = hold(s, stick(then), live);
    if (!after.dead) ok.push(wait);
  }
  const runs: string[] = [];
  for (let i = 0; i < ok.length; i++) {
    const a = ok[i] ?? 0; let b = a;
    while (ok[i + 1] === b + 1) { b++; i++; }
    runs.push(a === b ? `${a}` : `${a}-${b}`);
  }
  console.log(`  ${jump} after waiting (frames), then ${then === '.' ? 'standing' : 'jumping on'}, alive ${live} more or out: ${runs.join(', ') || 'never'}`);
}
