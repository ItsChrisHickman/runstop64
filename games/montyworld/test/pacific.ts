/**
 * The Pacific, played by a bot from Japan's cargo ship to the plane's hold (docs/dosvidaniya-pacific.md): the bot (bot.ts) searches the game's own frames for a way to each goal in pacific-route.ts (every coin, the
 * bolt cutters, the snorkel, the lei, the parachute and the three musubi; the crushers, the torches, the cars, the swimming, the lava, the guard and the loader all in the way), plays it, and the game must be where the
 * goal says, alive, in ORIGINAL and in ENHANCED. It starts where a player does after Japan: on the cargo ship's gangway with Moscow's, Siberia's, China's and Japan's finds and the ninja hood on. (The gates' proofs, the
 * loops and the no-trap checks are in pacific-mechanisms.ts.)
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific.ts [original|enhanced] [first leg] [last leg]
 */
import fs from 'node:fs';
import { enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { JP } from '../src/japan';
import { PAC } from '../src/pacific';
import { copy } from '../../montyotr/test/play';
import { ACTIONS, hold, keyOf, newGame, play, search, STEP, type Route } from './bot';
import { PACIFIC_LEGS } from './pacific-route';
import { itemIndex, standY } from './route';

if (new Set(PACIFIC_LEGS.map((l) => l.name)).size !== PACIFIC_LEGS.length) throw new Error('two legs have the same name');
const only = process.argv[2];
const first = Number(process.argv[3] ?? 0), last = Number(process.argv[4] ?? PACIFIC_LEGS.length);

/**
 * While building, PACIFIC_CACHE=<file> keeps each leg's route (one line a leg: its name, a tab, then `action:frames` pairs) so a run plays the ones it has again and searches only for the ones it lacks or that no longer work.
 */
const cacheFile = process.env.PACIFIC_CACHE;
const cached = new Map<string, Route>();
if (cacheFile && fs.existsSync(cacheFile)) {
  for (const line of fs.readFileSync(cacheFile, 'utf8').split('\n')) {
    const [name, steps] = line.split('\t');
    if (name && steps !== undefined) cached.set(name, steps === '' ? [] : steps.split(' ').map((p): readonly [string, number] => { const at = p.lastIndexOf(':'); return [p.slice(0, at), Number(p.slice(at + 1))]; }));
  }
}
const keep = (name: string, route: Route) => { cached.set(name, route); if (cacheFile) fs.writeFileSync(cacheFile, [...cached].map(([n, r]) => `${n}\t${r.map(([a, f]) => `${a}:${f}`).join(' ')}`).join('\n')); };

/** The rooms and finds of the Pacific in the tables: the rooms from the stern on. */
/** When a leg finds no way: where he could get to in the room he is in (the cells his top left reached in up to 150000 states), for finding what the layout lacks. */
function reached(from: State): string {
  const room = from.g.roomId;
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
  return Array.from({ length: 20 }, (_, r) => `${String(r).padStart(2)} ${Array.from({ length: 32 }, (_, c) => (cells.has(`${c},${r + 3}`) ? '*' : g.flagAt(r + 3, c + 4) === 1 ? '#' : '.')).join('')}`).join('\n');
}

const pacific = (room: number) => room >= PAC.stern && room <= PAC.hold;

for (const mode of ['original', 'enhanced'] as const) {
  if (only !== undefined && only !== 'all' && only !== mode) continue;
  let live = newGame(WORLD, mode === 'enhanced');
  // Moscow, Siberia, China and Japan done: every find of theirs is his, the ninja hood worn
  for (let i = 0; i < live.g.siCollected.length; i++) if (!pacific(live.g.data.specialItems[i * 4] ?? 0)) live.g.siCollected[i] = 0x81;
  wear(live.g, itemIndex(live.g, JP.mole, 0));
  enterRoom(live.g, PAC.stern, 0x0c + 4 * 4, standY(13));
  for (let n = 0; n < 200 && (live.g.freeze || live.g.script); n++) frame(live, NONE);

  let frames = 0, nodes = 0;
  for (const [n, leg] of PACIFIC_LEGS.entries()) {
    if (n < first || n >= last) continue;
    const t0 = Date.now();
    const stats = { exhausted: false };
    const before = cached.get(leg.name);
    const replay = before ? play(live, before) : null;
    if (before && replay && leg.goal(replay.g)) {
      frames += before.reduce((a, [, f]) => a + f, 0);
      check(`${mode}: ${leg.name} (kept route, ${before.reduce((a, [, f]) => a + f, 0)} frames)`, true);
      live = replay;
      continue;
    }
    // the first look is the careful one (a weighted A*); a swim across a wide reef has too many ways, so the second leans harder on the aim
    const found = search(live, leg.goal, leg.aim, 60000, 1.5, stats) ?? search(live, leg.goal, leg.aim, 600000, 3, stats);
    if (!found) { check(`${mode}: ${leg.name}: a way (${stats.exhausted ? 'every state looked at' : 'the search limit'})`, false); console.log(`   from room ${live.g.roomId} at ${live.g.montyCol - 4},${live.g.montyRow - 3} (y ${live.g.y}, lava ${live.g.lavas[0]?.t ?? '-'}), he reaches:\n${reached(live)}`); break; }
    const next = play(live, found.route);
    const ok = next !== null && leg.goal(next.g);
    if (ok) keep(leg.name, found.route);
    frames += found.route.reduce((a, [, f]) => a + f, 0);
    nodes += found.nodes;
    check(`${mode}: ${leg.name} (${found.route.reduce((a, [, f]) => a + f, 0)} frames, ${found.nodes} states, ${((Date.now() - t0) / 1000).toFixed(1)}s)`, ok);
    if (next) console.log(`   now in room ${next.g.roomId} at ${next.g.montyCol - 4},${next.g.montyRow - 3} y ${next.g.y} falling ${next.g.falling} action ${next.g.montyAction} arc ${next.g.arcIdx} rope ${next.g.onRope} counter ${next.g.actionCounter} script ${next.g.script ? 'yes' : 'no'}`);
    if (!next || !ok) break;
    live = next;
  }
  if (first === 0 && last >= PACIFIC_LEGS.length) {
    const g = live.g;
    const coins = g.data.coinTable.length / 3;
    const mineCoins = Array.from({ length: coins }, (_, i) => i).filter((i) => pacific(g.data.coinTable[i * 3] ?? 0));
    const coinsLeft = mineCoins.filter((i) => !g.coinCollected[i]).length;
    const found = Array.from({ length: g.data.specialItems.length / 4 }, (_, i) => i).filter((i) => pacific(g.data.specialItems[i * 4] ?? 0));
    const itemsLeft = found.filter((i) => !g.siCollected[i]).length;
    check(`${mode}: at the end all ${mineCoins.length} coins, the cutters, the snorkel, the lei, the parachute and the three musubi of the Pacific are taken (${coinsLeft} coins, ${itemsLeft} items left), ${g.score} points (${mineCoins.length} x 50 + ${found.length} x 200), he is in the plane's hold (room ${g.roomId}), in the lei`,
      coinsLeft === 0 && itemsLeft === 0 && found.length === 7 && g.score === mineCoins.length * 50 + found.length * 200 && g.roomId === PAC.hold && g.worn === itemIndex(g, PAC.lei, 0));
  }
  console.log(`${mode}: ${frames} frames played, ${nodes} states searched`);
}
finish();
