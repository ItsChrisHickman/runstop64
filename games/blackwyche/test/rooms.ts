/**
 * Every room's code is in the game image and runs natively: for each room in the table at
 * $9D7A (rooms 1-$21), from the start of a game the room is brought in as a door takes him in
 * ($2648; $11CD swaps its block into $6000 from where the table keeps it and calls its start,
 * $6003), and then played for a while with the joystick going (energy kept up). Each must
 * be one of the translated blocks (src/rooms.ts), take no frame of the 6502 safety net, and
 * not stop.
 *
 * (The image from Blackwyche_1985_Ultimate.d64 lacked $F800-$FBFF: rooms $C and $D, below
 * deck 5's doors 1 and 3, stopped the machine on the way in, "CPU stopped in a call to
 * $6003", and room $17's code ran into it. build/patch.json puts the kilobyte back.)
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/rooms.ts [title.state]
 * (SAVE=dir: a state in each room, a second in, for lockstep.ts and the like)
 */
import fs from 'node:fs';
import { packState, unpackState } from '../../../packages/c64kit/src/c64/machine';
import { NativeHost, findOverlayRoutine } from '../../shared/native/host';
import { cpu } from '../../shared/native/cpu';
import { port } from '../src/native';
import { ROOMS } from '../src/rooms';
import * as engine from '../src/gen/engine';
import { check, finish } from '../../shared/test/check';

const [titleArg = 'games/blackwyche/assets/blackwyche-title.state'] = process.argv.slice(2);
const quiet = (what: string, ok: boolean) => check(what, ok, true);
const keep = (r: Uint8Array) => { r[0x9d77] = 100; r[0x3417] = 0; };

// a game begun (fire on the title), on the main deck
const g0 = new NativeHost(port, unpackState(new Uint8Array(fs.readFileSync(titleArg))));
for (let f = 0; f < 400; f++) { g0.m.joy1 = g0.m.joy2 = f > 50 && f < 60 ? 0x0f : 0x1f; g0.tick(); keep(g0.m.ram); }
const start = g0.save();
if (!start || g0.m.ram[0x9d78] !== 1) throw new Error('no game');

let seed = 5;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
let fine = 0;
for (let room = 1; room <= 0x21; room++) {
  const g = NativeHost.resume(port, start);
  let entered = false, translated = false, error = '';
  let frames = 0, saved = false;
  g.onWait = (site) => {
    if (site !== port.mainLoopWait) return;
    if (entered && !saved && frames >= 60 && process.env.SAVE) { saved = true; const s = g.save(); if (s) fs.writeFileSync(`${process.env.SAVE}/room-${room.toString(16)}.state`, packState(s)); }
    if (entered) return;
    entered = true;
    const regs = { ...cpu };
    // as a door takes him in ($2648), with this room in place of the one the door leads to ($10A7 picks it)
    engine.r_1289(); engine.r_1082(); engine.r_10a7();
    g.m.ram[0x341c] = room;
    engine.r_0e16(); engine.r_11cd(); engine.r_12d2(); g.m.ram[0x1521] = 0;
    translated = !!findOverlayRoutine(ROOMS, g.m.ram, 0x6000) && !!findOverlayRoutine(ROOMS, g.m.ram, 0x6003);
    Object.assign(cpu, regs);
  };
  let joy = 0x1f;
  try {
    for (let f = 0; f < 600; f++) {
      if (f % 20 === 0) { joy = 0x1f; for (const b of [1, 2, 4, 8, 16]) if (rnd() < 0.3) joy &= ~b; }
      g.m.joy1 = g.m.joy2 = joy; g.tick(); keep(g.m.ram); frames++;
    }
  } catch (e) { error = e instanceof Error ? e.message : String(e); }
  const fb = [...g.fallbacks.keys()].map((a) => `$${a.toString(16)}`);
  const ok = entered && translated && !error && !fb.length;
  if (ok) fine++;
  quiet(`room $${room.toString(16)}: its block translated, played natively${error ? ` (stopped: ${error})` : ''}${fb.length ? ` (6502 safety net at ${fb.join(' ')})` : ''}${translated ? '' : ' (no translation of the block)'}`, ok);
}
console.log(`${fine} of ${0x21} rooms`);
finish();
