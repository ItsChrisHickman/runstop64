/**
 * The 128K music: the tape on a model with 128K paging and an AY chip (tools/zx `ram128`). The game's own test finds the extra
 * RAM, copies its player and tune into bank 1 and calls it from the interrupt; this runs it and keeps the AY writes.
 *
 *   nice -n 15 node tools/test.mjs games/moley/re/music.ts games/moley/build/moley.tap [frames] [out.json]
 *
 * Prints how many writes there were, how often the player runs (frames between writes), which registers it uses, and how
 * long before the per-frame register image repeats (the tune's length when it loops). With an out-file it writes the
 * register image of each frame as JSON: [[r0..r13] per frame that had writes, with the frame number].
 */
import fs from 'node:fs';
import { bootedSpectrum, readRom, readTape, typeLoad } from '../../../tools/zx/boot';

const [tapeFile, framesArg = '6000', outFile] = process.argv.slice(2);
if (!tapeFile) throw new Error('usage: music.ts <tape> [frames] [out.json]');
const m = bootedSpectrum(readRom(), true);
m.tape = readTape(tapeFile);
typeLoad(m);
m.ay.length = 0;
const total = Number(framesArg);
const images: { frame: number; regs: number[] }[] = [];
let last = '';
for (let f = 0; f < total; f++) {
  const before = m.ay.length;
  m.runFrame();
  if (m.ay.length > before) {
    const regs = [...m.ayRegs.subarray(0, 14)];
    const key = regs.join(',');
    images.push({ frame: m.frame, regs });
    last = key;
  }
}
void last;
console.log(`128K flag $8112 = ${m.mem[0x8112]}; ${m.ay.length} AY writes in ${total} frames; frames with writes: ${images.length}`);
const gaps = images.slice(1).map((im, i) => im.frame - images[i].frame);
const hist = new Map<number, number>();
for (const g of gaps) hist.set(g, (hist.get(g) ?? 0) + 1);
console.log('frames between writes (gap: count):', [...hist].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([g, c]) => `${g}:${c}`).join(' '));
const used = new Set(m.ay.map((w) => w.reg));
console.log('registers written:', [...used].sort((a, b) => a - b).join(' '));
// the tune repeats when a long run of frame images comes round again
const keys = images.map((im) => im.regs.join(','));
let period = 0;
for (let p = 50; p < keys.length / 2 && period === 0; p++) {
  let same = true;
  for (let i = 0; i < 40 && same; i++) if (keys[i + 100] !== keys[i + 100 + p]) same = false;
  if (same) period = p;
}
console.log(period ? `the register image repeats after ${period} writes (about ${(period * 2 / 50).toFixed(1)} seconds)` : 'no repeat found in the frames run');
if (outFile) fs.writeFileSync(outFile, JSON.stringify(images));
