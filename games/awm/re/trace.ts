import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
/**
 * Monty's variables each time they change, while a scripted joystick plays (directions joined
 * with +, then :frames, comma-separated).
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/trace.ts games/awm/build/play.state "right:20,none:10,up:3" 120
 */
const [stateFile, script, frames] = process.argv.slice(2);
const o = new C64Machine();
o.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
const JOY: Record<string, number> = { up: 1, down: 2, left: 4, right: 8, fire: 16, none: 0 };
const seq: number[] = [];
for (const part of script.split(',')) {
  const [dirs, n] = part.split(':');
  let mask = 0;
  for (const d of dirs.split('+')) mask |= JOY[d] ?? 0;
  for (let i = 0; i < Number(n); i++) seq.push(mask);
}
const h = (a: number) => o.ram[a].toString(16).padStart(2, '0');
let last = '';
for (let f = 0; f < Number(frames); f++) {
  const m = seq[f] ?? 0;
  o.joy1 = o.joy2 = 0x1f & ~m;
  o.runFrame();
  const line = `x=${h(0x5c3f)} y=${h(0x5c40)} st=${h(0x4f87)} ar=${h(0x4f88)} d=${h(0x4f86)} 403e=${h(0x403e)} 4033=${h(0x4033)} 4048=${h(0x4048)} spr=${h(0x5c46)} fl=${h(0x5c48)} room=${h(0x402b)} life=${h(0x4061)} 405d=${h(0x405d)} 5e=${h(0x405e)} 4007=${h(0x4007)}`;
  const shown = line.replace(/ 4007=..$/, '');
  if (shown !== last) console.log(`f${f} in=${m} ${shown}`);
  last = shown;
}
