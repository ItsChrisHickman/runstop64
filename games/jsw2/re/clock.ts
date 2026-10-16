/**
 * Audit: the in-game clock's pace on the running port ($82A1-$82A3: hours, minutes, seconds in BCD;
 * the death routine runs when the hours reach 24, $786F).
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/re/clock.ts
 */
import fs from 'node:fs';
import { unpackState } from '../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../shared/native/host';
import { port } from '../src/native';

const IDLE = 0x1f, FIRE = 0x1f & ~16;
const START: number[] = [...Array<number>(80).fill(IDLE), ...Array<number>(3).fill(FIRE), ...Array<number>(200).fill(IDLE)];
const g0 = new NativeHost(port, unpackState(new Uint8Array(fs.readFileSync('games/jsw2/assets/jsw2-title.state'))));
const frame = (g: NativeHost, joy: number) => { g.m.joy1 = IDLE; g.m.joy2 = joy; g.tick(); };
let saved: ReturnType<NativeHost['save']> = null;
g0.onWait = () => { saved = g0.save(); };
for (const j of START) { frame(g0, j); g0.m.ram[0x8096] = 0xff; }
const base = saved;
if (!base) throw new Error('no save');

// the clock's pace: frames between changes of the seconds
{
  const g = NativeHost.resume(port, base);
  let last = g.m.ram[0x82a3], at = 0;
  const gaps: number[] = [];
  for (let f = 1; f <= 1500; f++) {
    frame(g, IDLE); g.m.ram[0x8096] = 0xff;
    if (g.m.ram[0x82a3] !== last) { last = g.m.ram[0x82a3]; if (at) gaps.push(f - at); at = f; }
  }
  const mean = gaps.reduce((s, x) => s + x, 0) / gaps.length;
  console.log(`clock: ${gaps.length} seconds seen, ${mean.toFixed(1)} frames each (${(mean / 50).toFixed(2)} s at 50 Hz); 24:00 comes after ${(24 * 3600 * mean / 50 / 3600).toFixed(1)} hours of play`);
}
