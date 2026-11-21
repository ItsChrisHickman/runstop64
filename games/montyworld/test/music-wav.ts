/**
 * Renders Monty on the Run's tune and each region's version of it to WAV files, to listen to: the original's first 45 seconds,
 * the region's first 45 seconds, and the stretch around the region's break (where the folk phrase is, late in the loop).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/music-wav.ts <out-dir>
 */
import fs from 'node:fs';
import { parsePsid, SidTune } from '../../../packages/c64kit/src/sid/psid';
import { wavBytes } from '../../../tools/wav';
import { GAME_SONG, retune, type RegionTune } from '../src/music/region-tune';
import { MOSCOW } from '../src/music/moscow';

const RATE = 44100;
/** A tick is two frames of the 50 Hz player: 25 a second. */
const TICKS_PER_SECOND = 25;

const dir = process.argv[2];
if (!dir) throw new Error('usage: music-wav.ts <out-dir>');
fs.mkdirSync(dir, { recursive: true });
const original = fs.readFileSync('games/montyotr/assets/monty_on_the_run.sid');

/** The tune's first `seconds` seconds as samples. */
function render(file: Uint8Array, seconds: number): Float32Array {
  const tune = new SidTune(parsePsid(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)), RATE);
  tune.start(GAME_SONG + 1);
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let at = 0; at < out.length; at += 4096) tune.render(out.subarray(at, Math.min(at + 4096, out.length)));
  return out;
}

const write = (name: string, samples: Float32Array) => fs.writeFileSync(`${dir}/${name}.wav`, wavBytes(samples, RATE));

/** The ticks in which a break's pattern is played (its voice's start of it), from the song's first voice. */
function breakSeconds(tune: RegionTune, file: Uint8Array): { from: number; to: number } | null {
  const first = tune.breaks[0];
  if (!first) return null;
  // (every pattern before it in voice 0, in ticks)
  const image = parsePsid(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  const mem = new Uint8Array(65536);
  mem.set(image.data, image.loadAddress);
  const seq = mem[0x856c + 0] | (mem[0x856c + 3] << 8);
  let ticks = 0;
  for (let a = seq; mem[a] !== 0xff; a++) {
    const p = mem[a] ?? 0;
    let q = (mem[0x857e + p] ?? 0) | ((mem[0x85cb + p] ?? 0) << 8);
    let length = 0;
    for (let head = mem[q++] ?? 0xff; head !== 0xff; head = mem[q++] ?? 0xff) {
      length += (head & 0x1f) + 1;
      if (!(head & 0x40)) q += head & 0x80 ? 2 : 1;
    }
    if (p === first.pattern) return { from: ticks / TICKS_PER_SECOND, to: (ticks + length) / TICKS_PER_SECOND };
    ticks += length;
  }
  return null;
}

const moscow = retune(original, MOSCOW);
write('original-first-45s', render(original, 45));
write(`${MOSCOW.id}-first-45s`, render(moscow, 45));
const at = breakSeconds(MOSCOW, moscow);
if (at) {
  const from = Math.max(0, Math.floor(at.from) - 12), to = Math.ceil(at.to) + 10;
  const slice = (file: Uint8Array) => render(file, to).subarray(from * RATE);
  write(`${MOSCOW.id}-break-${from}s-to-${to}s`, slice(moscow));
  write(`original-same-stretch-${from}s-to-${to}s`, slice(original));
  console.log(`the break is at ${at.from.toFixed(1)}s to ${at.to.toFixed(1)}s of the loop`);
}
console.log(`written to ${dir}`);
