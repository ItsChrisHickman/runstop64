/**
 * A saved state inside each of Entombed's chambers, for finding and checking what in them can
 * be done (find.ts, solve.ts, check.ts). From the start of a game (the title snapshot, fire
 * pressed: he starts in chamber 1), for each floor: travel there (as the pause map does, which
 * leaves chambers as the game would), then find which places the game's own door code ($10D2,
 * which picks the chamber by floor and place) sends to which chamber, and go in as the game does
 * (see `enter`). Each state is checked to still be in its chamber a second later.
 *
 *   nice -n 15 node tools/test.mjs games/entombed/re/hints/chambers.ts <outdir>     (writes chamber-NN.state)
 */
import fs from 'node:fs';
import { packState, unpackState, type MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../../shared/native/host';
import { cpu } from '../../../shared/native/cpu';
import { port } from '../../src/native';
import * as engine from '../../src/gen/engine';
import { entombedMap } from '../../src/map';
import { CORRIDORS } from './play';

const TITLE = new URL('../../assets/entombed-title.state', import.meta.url);
const inCorridor = (ram: Uint8Array) => (ram[0x6001] | (ram[0x6002] << 8)) === CORRIDORS;

/** The start of a game: the title snapshot, fire pressed (he's in chamber 1, floor 1). */
export function gameStart(): MachineState {
  const g = new NativeHost(port, unpackState(new Uint8Array(fs.readFileSync(TITLE))), 'title');
  for (let f = 0; f < 200; f++) { g.m.joy1 = g.m.joy2 = f > 50 && f < 60 ? 0x0f : 0x1f; g.tick(); }
  const s = g.save();
  if (!s) throw new Error('no state at the start of the game');
  return s;
}

/** A host started from `start`, with `act` run (between frames) at its first main loop wait. */
function host(start: MachineState, act: (ram: Uint8Array) => void, frames: number) {
  const g = NativeHost.resume(port, start);
  let done = false;
  g.onWait = (site) => {
    if (done || site !== port.mainLoopWait) return;
    done = true;
    const regs = { ...cpu };
    act(g.m.ram);
    Object.assign(cpu, regs);
  };
  for (let f = 0; f < frames; f++) { g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); }
  return g;
}

/** A junction on the floor to travel to (the floor's first). */
function junctionOn(ram: Uint8Array, floor: number) {
  const all = [...Array(256).keys()].map((k) => `${k & 15},${k >> 4}`);
  for (const id of entombedMap.places({ x: 0, y: 0, w: 196, h: 150 }, ram, { cells: { [floor]: all } })) return id.id;
  return null;
}

/**
 * How each chamber is entered: by a door from the corridors (the game's $26EC: he's walking up
 * into it, $2365 = 3, so the next frame doesn't take the exit he's standing on), or down the stairs
 * from the floor above ($2719: the floor goes down one and $1496 puts him at the foot of the stairs
 * and picks the chamber). The chambers the stairs lead to are entered that way (some, like 3, have
 * no door on any corridor: floor 1 has no column 7).
 */
type Entry = { floor: number; x: number; y: number } | { stairsFrom: number };
const enter = (start: MachineState, e: Entry, given: Record<number, number>) => (ram: Uint8Array) => {
  const floor = 'stairsFrom' in e ? e.stairsFrom : e.floor, to = junctionOn(unpackState(packState(start)).ram, floor);
  if (to === null) throw new Error(`no junction on floor ${floor}`);
  for (const [a, v] of Object.entries(given)) ram[Number(a)] = v; // (things done before, elsewhere)
  entombedMap.go(to, ram, {});
  if ('stairsFrom' in e) {
    ram[0x37f7]--; ram[0x3231] = 1;
    engine.r_c1a1(); engine.r_1496(); engine.r_c1c9();
  } else {
    ram[0x217e] = e.x; ram[0x217f] = e.y; ram[0x3231] = 1; ram[0x2365] = 3;
    engine.r_c1a1(); engine.r_10d2(); engine.r_c1c9();
  }
};

let entries: Map<number, Entry> | null = null;
/** Which way each chamber is entered (found once). */
function entriesFrom(start: MachineState) {
  if (entries) return entries;
  const found = new Map<number, Entry>();
  const ram0 = unpackState(packState(start)).ram;
  for (let floor = 2; floor <= 7; floor++) {
    let n = -1;
    host(start, (ram) => { enter(start, { stairsFrom: floor }, {})(ram); n = inCorridor(ram) ? -1 : ram[0x321c]; }, 2);
    if (n > 0 && !found.has(n)) found.set(n, { stairsFrom: floor });
  }
  for (let floor = 1; floor <= 7; floor++) {
    if (!junctionOn(ram0, floor)) continue;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let n = -1;
      host(start, (ram) => { enter(start, { floor, x, y }, {})(ram); n = inCorridor(ram) ? -1 : ram[0x321c]; }, 2);
      if (n > 0 && !found.has(n)) found.set(n, { floor, x, y });
    }
  }
  return (entries = found);
}

/**
 * A state inside chamber `n` (a second after going in), with `given` set first: the global
 * flags of things done elsewhere (the items he carries), as the chamber's own setup reads them.
 */
export function chamberState(n: number, given: Record<number, number> = {}, start = gameStart()): MachineState {
  const e = entriesFrom(start).get(n);
  if (!e) throw new Error(`chamber ${n}: no way in`);
  const g = host(start, enter(start, e, given), 60);
  const s = g.save();
  if (!s || g.m.ram[0x321c] !== n || inCorridor(g.m.ram)) throw new Error(`chamber ${n}: not in it after going in`);
  return s;
}

if (process.argv[1]?.endsWith('chambers.ts')) {
  const outDir = process.argv[2];
  fs.mkdirSync(outDir, { recursive: true });
  const start = gameStart();
  for (const [n, e] of [...entriesFrom(start)].sort((a, b) => a[0] - b[0])) {
    fs.writeFileSync(`${outDir}/chamber-${String(n).padStart(2, '0')}.state`, packState(chamberState(n, {}, start)));
    console.log(`chamber ${n}: ${'stairsFrom' in e ? `down the stairs from floor ${e.stairsFrom}` : `floor ${e.floor} at ${e.x},${e.y}`}`);
  }
}
