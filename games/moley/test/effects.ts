/**
 * The beeper effects as audio (src/beeper.ts, c64kit's `renderToggles`) checked against the original running: each effect is called
 * as the game does ($A017) from the game in play on the headless Spectrum, the speaker's writes are logged, and the log is rendered
 * as a reference a different way (the level of the speaker at every T-state, summed over each output sample from a running total),
 * at three sample rates. The committed effects' samples must equal it; the log must equal the committed toggle gaps, and the
 * speaker must start down (the first write raises it), which the conversion assumes.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/effects.ts [play.state] [rom]
 */
import fs from 'node:fs';
import { renderToggles, SPECTRUM_48K_CLOCK } from 'c64kit';
import { check, finish } from '../../../games/shared/test/check';
import { readRom } from '../../../tools/zx/boot';
import { unpackState } from '../../../tools/zx/snapshot';
import { FRAME_T, Spectrum } from '../../../tools/zx/spectrum';
import { EFFECTS } from '../src/data';
import { effectSamples } from '../src/beeper';

const [stateFile = 'games/moley/build/play.state', romFile = 'games/moley/build/48.rom'] = process.argv.slice(2);
const state = new Uint8Array(fs.readFileSync(stateFile));
const rom = readRom(romFile);
const RETURN = 0x822b; // the main loop's HALT: where an effect returns to

/** The effect as the model plays it: the speaker's level before the call, and every write (T-states from the call) with its level, and the length. */
function play(id: number): { before: number; writes: { t: number; level: number }[]; length: number } {
  const m = new Spectrum(rom);
  unpackState(m, state);
  const cpu = m.cpu;
  cpu.sp = (cpu.sp - 2) & 0xffff;
  m.mem[cpu.sp] = RETURN & 255; m.mem[cpu.sp + 1] = RETURN >> 8;
  cpu.regs[7] = id;
  cpu.pc = 0xa017;
  const before = m.speaker;
  const start = m.frame * FRAME_T + cpu.t;
  let end = -1;
  m.onStep = (pc) => { if (pc === RETURN && end < 0) end = m.frame * FRAME_T + cpu.t; };
  m.beeper.length = 0;
  for (let f = 0; f < 400 && end < 0; f++) m.runFrame();
  return { before, writes: m.beeper.map((b) => ({ t: b.frame * FRAME_T + b.t - start, level: b.level })), length: end - start };
}

/** The reference: the speaker's level at every T-state, and the mean over each sample from the running total (the partial T-states at the edges at their level). */
function reference(p: { before: number; writes: { t: number; level: number }[]; length: number }, sampleRate: number): Float64Array {
  const level = new Uint8Array(p.length);
  let now = p.before;
  let w = 0;
  for (let t = 0; t < p.length; t++) {
    while (w < p.writes.length && (p.writes[w]?.t ?? Infinity) <= t) now = p.writes[w++]?.level ?? now;
    level[t] = now;
  }
  const total = new Float64Array(p.length + 1);
  for (let t = 0; t < p.length; t++) total[t + 1] = (total[t] ?? 0) + (level[t] ?? 0);
  const upTo = (x: number): number => {
    const whole = Math.min(Math.floor(x), p.length);
    return (total[whole] ?? 0) + (x - whole) * (whole < p.length ? level[whole] ?? 0 : 0);
  };
  const perSample = SPECTRUM_48K_CLOCK / sampleRate;
  return Float64Array.from({ length: Math.ceil(p.length / perSample) }, (_, i) => (upTo((i + 1) * perSample) - upTo(i * perSample)) / perSample);
}

for (const effect of EFFECTS) {
  const p = play(effect.id);
  const times = p.writes.map((x) => x.t);
  check(`effect ${effect.id}: the model's log is the committed toggles (${p.writes.length} flips, lead ${effect.lead}, tail ${effect.tail})`,
    p.writes.length === effect.gaps.length + 1 && times[0] === effect.lead && times.slice(1).every((t, i) => t - (times[i] ?? 0) === effect.gaps[i]) && p.length - (times[times.length - 1] ?? 0) === effect.tail);
  check(`effect ${effect.id}: the speaker starts down and every write flips it`, p.before === 0 && p.writes.every((x, i) => x.level === (i + 1) % 2));
  for (const rate of [22050, 44100, 48000]) {
    const ref = reference(p, rate);
    const mine = renderToggles(effect, rate, SPECTRUM_48K_CLOCK, false);
    let worst = 0;
    for (let i = 0; i < Math.max(ref.length, mine.length); i++) worst = Math.max(worst, Math.abs((mine[i] ?? Infinity) - (ref[i] ?? Infinity)));
    check(`effect ${effect.id} at ${rate} Hz: ${mine.length} samples equal the reference rendered from the model's log (worst difference ${worst.toExponential(1)})`, mine.length === ref.length && worst < 1e-6);
  }
  const heard = effectSamples(effect.id, 48000);
  const ref = reference(p, 48000);
  const keep = 1 - (2 * Math.PI * 20) / 48000;
  let last = 0;
  let out = 0;
  const coupled = Array.from(ref, (x) => { out = x - last + keep * out; last = x; return out; });
  check(`effect ${effect.id}: what the game plays is the reference through the speaker's coupling (a 20 Hz high pass), within -1 to 1`, heard !== null && heard.length === coupled.length && heard.every((v, i) => Math.abs(v - (coupled[i] ?? Infinity)) < 1e-5 && Math.abs(v) <= 1));
}

finish();
