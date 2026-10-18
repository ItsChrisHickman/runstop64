/**
 * Karnath: travel (the pause map) brings the creatures with it. Where a creature starts is worked out from
 * his place along the strip ($3214/$3215, $3653), which a travel used to leave as the one he had where he came
 * from, so the guard room's knights, the dungeon's skull and the rest started off the picture ("all the bad
 * guys have gone" after a warp). Checked against walking: along the recorded routes (re/routes.json) the
 * place is formed from what the memory says (his sprite's x, the scroll) for every frame, and from the
 * first route's end he travels to each room he has been in, where the creatures a walked arrival shows
 * (sprites other than his and his spell's, on the picture's playfield) are shown too, and that is the same
 * after a save is resumed (a save made after a travel, with the old value, is put right).
 *
 *   nice -n 15 node tools/test.mjs games/karnath/test/travel-creatures.ts
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from '../../../packages/c64kit/src/c64/machine';
import { cpu } from '../../shared/native/cpu';
import { NativeHost } from '../../shared/native/host';
import { GAMES, setJoy } from '../../shared/native/test/games';
import { karnathMap } from '../src/map';
import { repairStripX, stripXNow } from '../src/travel';
import { check, finish } from '../../shared/test/check';
import { readRoutes } from '../../shared/test/data';

const game = GAMES.karnath;
const routes = readRoutes('games/karnath/re/routes.json');
const title = unpackState(new Uint8Array(fs.readFileSync(game.title)));
const tick = (g: NativeHost, joy = 0x1f, keys: [number, number][] = []) => {
  setJoy(g.m, game, joy); g.m.keys = keys; g.tick();
  g.m.ram[0x6ffe] = 100; g.m.ram[0x322e] = 0; // (as the routes were found)
};
const saved = (g: NativeHost): MachineState => {
  const s = g.save();
  if (!s) throw new Error('not at the main loop wait');
  return s;
};
const hostAt = (state: MachineState, act?: (ram: Uint8Array) => void) => {
  const g = NativeHost.resume(game.port, state);
  let done = !act;
  g.onWait = (site) => {
    if (done || site !== game.port.mainLoopWait || !act) return;
    done = true;
    const regs = { ...cpu };
    act(g.m.ram);
    Object.assign(cpu, regs);
  };
  return g;
};

// ---- the routes: his place along the strip is what the memory says, in every frame ----
const found = karnathMap.found.empty();
const arrivals = new Map<string, MachineState>();
const ends: MachineState[] = [];
let frames = 0, wrong = 0;
for (const route of routes) {
  const g = new NativeHost(game.port, title);
  let frame = 0;
  for (let i = 0; i < route.length; i += 2) for (let k = 0; k < route[i + 1]; k++) {
    const v = route[i];
    tick(g, v & 0x1f, v & 32 ? [[1, 2]] : []);
    frame++;
    if (g.lastWait !== game.port.mainLoopWait || frame < 200) continue;
    const r = g.m.ram;
    if (r[0x3235] >= 1 && r[0x3235] <= 0x19 && r[0x2392] === 0 && r[0x237d] === 0) {
      frames++;
      if (stripXNow(r, g.m.vic) !== (r[0x3214] | (r[0x3215] << 8))) wrong++;
    }
    const before = new Set(Object.keys(found.castle.at));
    karnathMap.observe(r, found, g.m.vic);
    for (const key of Object.keys(found.castle.at)) if (!before.has(key)) arrivals.set(key, saved(g));
  }
  ends.push(saved(g));
}
check(`his place along the strip ($3214) is what his sprite and the scroll say, in ${frames} frames of the routes (${wrong} are not)`, frames > 1000 && wrong === 0);

// ---- travel: the creatures a walked arrival shows ----
/** The creature sprites (not his, 2, nor his spell's, 3) seen on the playfield in `n` frames. */
function seen(g: NativeHost, n: number) {
  const out = new Set<number>();
  for (let f = 0; f < n; f++) {
    tick(g);
    const vic = g.m.vic;
    for (const s of [0, 1, 4, 5, 6, 7]) {
      const x = vic[2 * s] + (vic[0x10] & (1 << s) ? 256 : 0), y = vic[2 * s + 1];
      if (vic[0x15] & (1 << s) && x >= 24 && x < 344 && y >= 50 && y < 250) out.add(s);
    }
  }
  return out;
}
let places = 0, goneAfter = 0;
const lost: string[] = [];
for (const [key, state] of arrivals) {
  const walked = seen(NativeHost.resume(game.port, state), 300);
  for (const end of ends) {
    const g = hostAt(end, (ram) => { karnathMap.go?.(key, ram, found); });
    const travelled = seen(g, 300);
    places++;
    // (creatures come and go along the screen: what a walked arrival shows, some of it is shown after travelling)
    if (walked.size > 0 && travelled.size === 0) { goneAfter++; lost.push(`room ${key}`); }
  }
}
check(`after travelling to a room where a walked arrival shows creatures, some are shown (${places} travels, ${goneAfter} with none: ${[...new Set(lost)].join(', ')})`, places > 50 && goneAfter === 0);

// ---- a save made after a travel with the old value is put right when it is resumed ----
const key = [...arrivals.keys()].find((k) => k === '3') ?? '3';
const there = arrivals.get(key);
if (!there) throw new Error('no arrival in the guard room');
const bad = { ...there, ram: there.ram.slice() };
bad.ram[0x3214] = 0xc0; bad.ram[0x3215] = 0x00; // (what it was after travelling from the upper floor)
repairStripX(bad.ram, bad.vic);
check('a save with the old value (a place far from where he is) is put right', (bad.ram[0x3214] | (bad.ram[0x3215] << 8)) === stripXNow(there.ram, there.vic));
const fine = { ...there, ram: there.ram.slice() };
fine.ram[0x3214] += 5;
repairStripX(fine.ram, fine.vic);
check('a place a few pixels from what the memory says is left alone', fine.ram[0x3214] === there.ram[0x3214] + 5);

finish();
