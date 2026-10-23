/** Where the study starts from in Entombed, which has no recorded routes: states in the corridors of each floor and in each chamber. */
import { type MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../native/host';
import { cpu } from '../../native/cpu';
import { port as entombedPort } from '../../../entombed/src/native';
import { entombedMap } from '../../../entombed/src/map';
import { chamberState, gameStart } from '../../../entombed/re/hints/chambers';

/** states in the corridors of each floor and in each chamber (re/hints/chambers.ts, as the combat test). */
export function entombedStates(): MachineState[] {
  const start = gameStart(), out: MachineState[] = [];
  for (let floor = 1; floor <= 7; floor++) {
    const all = [...Array(256).keys()].map((k) => `${k & 15},${k >> 4}`);
    const places = entombedMap.places({ x: 0, y: 0, w: 196, h: 150 }, start.ram, entombedMap.found.parse({ cells: { [floor]: all } }));
    for (let r = 0; r < 4 && places.length; r++) {
      const to = places[(r * 7) % places.length].id;
      const g = NativeHost.resume(entombedPort, start);
      let done = false;
      g.onWait = (site) => { if (done || site !== entombedPort.mainLoopWait) return; done = true; const regs = { ...cpu }; entombedMap.go(to, g.m.ram, entombedMap.found.empty()); Object.assign(cpu, regs); };
      for (let f = 0; f < 3; f++) g.tick();
      const s = g.save(); if (s) out.push(s);
    }
  }
  for (let n = 1; n <= 25; n++) { try { out.push(chamberState(n, {}, start)); } catch { /* no way in */ } }
  return out;
}

