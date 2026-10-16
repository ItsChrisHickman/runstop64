/** How many main-loop passes (frame syncs at $4C2D) the original makes per video frame. */
import { reference } from './ref';

const m = reference(process.argv[2]);
let hits = 0;
const step = m.cpu.step.bind(m.cpu);
m.cpu.step = () => { if (m.cpu.pc === 0x4c2d) hits++; return step(); };
const hist = new Map<number, number>();
const frames = Number(process.argv[3] ?? 500);
for (let f = 0; f < frames; f++) {
  hits = 0;
  m.joy2 = f % 200 < 100 ? 0x1f & ~8 : 0x1f & ~4;
  m.runFrame();
  hist.set(hits, (hist.get(hits) ?? 0) + 1);
}
console.log('passes per frame:', [...hist].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' '));
