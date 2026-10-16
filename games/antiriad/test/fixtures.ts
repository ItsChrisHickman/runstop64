/**
 * The original, running, at two quiet moments, for the checks against it (rooms.ts,
 * lockstep.ts): `original.state` (Tal, just arrived in the first room) and `armour.state`
 * (Tal in the armour in room $3F, with the Gravity Displacer and the Pulsar Beam fitted).
 * Made from a snapshot of the original in play (games/antiriad/build/README.md):
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/fixtures.ts play.state games/antiriad/test
 *
 * "Quiet": a frame's end with the original back in its main loop, its interrupt's frame of
 * logic done, so the port can start from the same memory.
 */
import fs from 'node:fs';
import path from 'node:path';
import { C64Machine, packState, unpackState } from 'c64kit';

const [from, outDir] = process.argv.slice(2);
const load = (file: string) => { const m = new C64Machine(); m.loadState(unpackState(new Uint8Array(fs.readFileSync(file)))); m.collisionsPerLine = true; return m; };
const quiet = (m: C64Machine) => !m.ram[0xab] && !(m.cpu.p & 4) && m.cpu.pc >= 0x8053 && m.cpu.pc < 0x8071 && m.line < 20;
function settle(m: C64Machine, frames: number) {
  for (let f = 0; f < frames; f++) m.runFrame();
  for (let f = 0; f < 500; f++) { m.runFrame(); if (quiet(m)) return; }
  throw new Error('the original never came back to its main loop');
}

// Tal, arrived
const a = load(from);
settle(a, 30);
fs.writeFileSync(path.join(outDir, 'original.state'), packState(a.saveState()));

// in the armour: Tal (facing out, as he turns) where the armour stands in room $3F steps in
const b = load(path.join(outDir, 'original.state'));
const { a: ra, x: rx, y: ry, sp: rs, p: rp, pc: rpc } = b.cpu;
const r = b.ram;
r[0x5b] = 0x3f;
b.cpu.p |= 4; b.call(0x852c); Object.assign(b.cpu, { a: ra, x: rx, y: ry, sp: rs, p: rp, pc: rpc });
r[0x0200] = r[0x0202] = r[0x78]; r[0x0201] = r[0x79]; r[0x0203] = (r[0x79] + 0x15) & 0xff;
r[0x0210] = (r[0x0210] & 0xfc) | (r[0x7a] & 3);
r[0x0260] = 0x88; r[0x0261] = 0x89;
r[0x0680] = 0x80; r[0x067e] = 0x80; // the Gravity Displacer, the Pulsar Beam
for (let f = 0; f < 400 && !(r[0x7b] & 0x80); f++) b.runFrame();
if (!(r[0x7b] & 0x80)) throw new Error('Tal never got into the armour');
settle(b, 400); // (the armour's power-up: its tune, the panel lighting up)
fs.writeFileSync(path.join(outDir, 'armour.state'), packState(b.saveState()));
console.log('original.state: room', a.ram[0x5b].toString(16), '; armour.state: room', b.ram[0x5b].toString(16), 'in the armour', !!(b.ram[0x7b] & 0x80), 'panel on', !!(b.ram[0x8a] & 0x80));
