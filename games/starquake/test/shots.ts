/**
 * Pictures of the port beside the original, from the same start and controls
 * (as lockstep.ts runs them): PNGs of the whole screen with sprites at chosen
 * passes, the original's from the probe's renderer, the port's from its own
 * state (bitmap mode, sprites behind the bitmap's pixels, as $D01B says).
 *
 *   node shots.mjs room0.state outdir "plan" passes,...
 */
import fs from 'node:fs';
import path from 'node:path';
import { indicesPng, renderPng } from '../../../tools/probe/render';
import { reference } from './ref';
import { syncFrom } from './sync';
import { Game } from '../src/game';
import { rooms } from '../src/flow';

const [stateFile, outDir, plan = '0:', passesArg = '50'] = process.argv.slice(2);
const shots = passesArg.split(',').map(Number);
fs.mkdirSync(outDir, { recursive: true });
const m = reference(stateFile);
const JOY: Record<string, number> = { up: 1, down: 2, left: 4, right: 8, fire: 16 };
const steps = plan.split(',').filter(Boolean).map((s) => { const [f, d] = s.split(':'); return { f: Number(f), d: d ?? '' }; });
const joyAt = (pass: number) => { const st = [...steps].reverse().find((s) => s.f <= pass); let j = 0x1f; if (st) for (const d of st.d.split('+')) j &= ~(JOY[d] ?? 0); return j; };

const inputs: number[] = [];
let passes = 0, shotNow = -1;
const step = m.cpu.step.bind(m.cpu);
m.cpu.step = () => {
  if (m.cpu.pc === 0x4c2d) passes++;
  if (m.cpu.pc === 0x4497) inputs.push(m.cpu.a);
  return step();
};
const g = new Game();
syncFrom(m, g);
let read = 0;
Object.defineProperty(g, 'joy', { get: () => inputs[read++] ?? 0x7f, set: () => {} });
const script = (function* () { for (;;) if ((yield* rooms(g, {})) === 'over') return; })();
const last = Math.max(...shots);
for (let pass = 0; pass <= last; pass++) {
  // the original: run frames until it has made this pass (the picture shows the frame after)
  while (passes <= pass) { m.joy2 = joyAt(passes); m.runFrame(); }
  script.next();
  if (shots.includes(pass)) {
    shotNow = pass;
    m.runFrame(); // one more frame so the probe's capture shows this pass's picture
    renderPng(m, path.join(outDir, `pass${pass}-orig.png`));
    portPng(path.join(outDir, `pass${pass}-port.png`));
  }
}
console.log(`pictures at passes ${shots.join(', ')} in ${outDir}${shotNow < 0 ? ' (none)' : ''}`);

function portPng(file: string) {
  const W = 320, H = 200, b = g.scr.bank;
  const px = new Uint8Array(W * H), fg = new Uint8Array(W * H);
  for (let cell = 0; cell < 1000; cell++) {
    const cx = (cell % 40) * 8, cy = Math.floor(cell / 40) * 8, c = b[0x1c00 + cell];
    for (let y = 0; y < 8; y++) {
      const bits = b[0x2000 + cell * 8 + y];
      for (let x = 0; x < 8; x++) { const on = bits & (0x80 >> x); px[(cy + y) * W + cx + x] = on ? c >> 4 : c & 15; fg[(cy + y) * W + cx + x] = on ? 1 : 0; }
    }
  }
  for (let n = 7; n >= 0; n--) {
    if (!(g.vic.enable & (1 << n))) continue;
    const sx = g.vic.x[n] | (g.vic.msb & (1 << n) ? 256 : 0), sy = g.vic.y[n];
    const data = b.subarray(g.sprites.ptr[n] * 64, g.sprites.ptr[n] * 64 + 63);
    for (let r = 0; r < 21; r++) for (let k = 0; k < 24; k++) {
      if (!(data[r * 3 + (k >> 3)] & (0x80 >> (k & 7)))) continue;
      const X = sx - 24 + k, Y = sy - 50 + r;
      if (X < 0 || Y < 0 || X >= W || Y >= H || fg[Y * W + X]) continue; // behind the bitmap's pixels
      px[Y * W + X] = g.sprites.colour[n] & 15;
    }
  }
  indicesPng(file, px, W, H);
}
