/**
 * A save made before the game image was mended (build/README.md: the first image lacked
 * $F800-$FBFF, rooms $C and $D) still holds the hole, and going into those rooms from it stopped
 * the machine ("CPU stopped in a call to $6003"). Resuming a save mends it (`mends` in main.ts,
 * `applyMends`): a save holding the hole (bar a few bytes the game wrote into it since: Chris's save,
 * 2026-10-15, had two at $F87D) gets the title snapshot's bytes; any other is left.
 * fixtures/hole-f800.bin is the hole as the first image had it.
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/mend.ts
 */
import fs from 'node:fs';
import { packState, unpackState, type MachineState } from '../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../shared/native/host';
import { applyMends } from '../../shared/native/play';
import { MENDS } from '../src/mends';
import { cpu } from '../../shared/native/cpu';
import { port } from '../src/native';
import * as engine from '../src/gen/engine';

let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };
const keep = (r: Uint8Array) => { r[0x9d77] = 100; r[0x3417] = 0; };

const title = unpackState(new Uint8Array(fs.readFileSync('games/blackwyche/assets/blackwyche-title.state')));
const hole = new Uint8Array(fs.readFileSync('games/blackwyche/test/fixtures/hole-f800.bin'));
{ const r = new Uint8Array(0x10000); r.set(hole, 0xf800); const title1 = new Uint8Array(0x10000).fill(7); applyMends(r, title1, MENDS); check('the hole is what src/mends.ts names (mended)', r[0xf800] === 7 && r[0xfbff] === 7); }

// a game begun, saved on the main deck
const g0 = new NativeHost(port, unpackState(new Uint8Array(fs.readFileSync('games/blackwyche/assets/blackwyche-title.state'))));
for (let f = 0; f < 400; f++) { g0.m.joy1 = g0.m.joy2 = f > 50 && f < 60 ? 0x0f : 0x1f; g0.tick(); keep(g0.m.ram); }
const start = g0.save();
if (!start) throw new Error('no game');

/** Room $C entered from a save (as test/rooms.ts does it): the error, if it stopped. */
function enterC(save: MachineState) {
  const g = NativeHost.resume(port, save);
  let entered = false;
  g.onWait = (site) => {
    if (site !== port.mainLoopWait || entered) return;
    entered = true;
    const regs = { ...cpu };
    engine.r_1289(); engine.r_1082(); engine.r_10a7();
    g.m.ram[0x341c] = 0x0c;
    engine.r_0e16(); engine.r_11cd(); engine.r_12d2(); g.m.ram[0x1521] = 0;
    Object.assign(cpu, regs);
  };
  try { for (let f = 0; f < 300; f++) { g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); keep(g.m.ram); } } catch (e) { return e instanceof Error ? e.message : String(e); }
  return entered ? '' : 'not entered';
}

const copy = (s: MachineState): MachineState => unpackState(packState(s));
const old = copy(start); old.ram.set(hole, 0xf800);
const err = enterC(copy(old));
check(`a save from the first image stops going into room $C (${err || 'it did not'})`, err.includes('$6003'));
const mended = copy(old); applyMends(mended.ram, title.ram, MENDS);
check('mended, it holds the title snapshot\'s kilobyte', mended.ram.subarray(0xf800, 0xfc00).every((b, i) => b === title.ram[0xf800 + i]));
const err2 = enterC(mended);
check(`mended, room $C runs${err2 ? ` (stopped: ${err2})` : ''}`, !err2);
const written = copy(old); written.ram[0xf87d] ^= 0x5a; written.ram[0xf87e] ^= 0xa5; applyMends(written.ram, title.ram, MENDS);
check('the hole with two bytes the game wrote (as in Chris\'s save) is mended too', written.ram.subarray(0xf800, 0xfc00).every((b, i) => b === title.ram[0xf800 + i]));
check(`and room $C runs from it${(() => { const e = enterC(written); return e ? ` (stopped: ${e})` : ''; })()}`, !enterC(copy(written)));
const other = copy(start); other.ram[0xf800] ^= 1; const before = other.ram.slice(0xf800, 0xfc00);
applyMends(other.ram, title.ram, MENDS);
check('a save holding anything else there is left as it is', other.ram.subarray(0xf800, 0xfc00).every((b, i) => b === before[i]));
console.log(failures ? `${failures} failures` : 'all passed');
if (failures) process.exit(1);
