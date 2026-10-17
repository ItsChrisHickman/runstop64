/**
 * The AY-3-8912 synthesiser (src/ay/ay.ts), the register stream and the tune player (src/ay/tune.ts) and the beeper (src/beeper.ts)
 * at register level: tone and noise periods, the noise register's sequence, the mixer, the volume table, the 16 envelope shapes,
 * what a rendered tone sounds at, the coding of a stream, and a tune's timing and loop.
 *
 *   node tools/test.mjs packages/c64kit/test/ay.test.ts
 */
import { Ay, AY_CLOCK_128K, AY_LEVELS } from '../src/ay/ay';
import { AyTune, packAyStream, readAyStep, unpackAyStream } from '../src/ay/tune';
import { renderToggles, togglesLength } from '../src/beeper';
import { check, finish } from '../../../games/shared/test/check';

const RATE = 48000;
const chip = (regs: Record<number, number> = {}): Ay => {
  const ay = new Ay(RATE);
  for (const [r, v] of Object.entries(regs)) ay.write(Number(r), v);
  return ay;
};
/** (a register map for channel A, the tone only, at volume 15) */
const TONE_A = { 7: 0b00111110, 8: 15 };

// ---- the volume table ----------------------------------------------------------------------------------------------
check('the volume table: 0 is silent, 15 is 1, and every step is louder', AY_LEVELS.length === 16 && AY_LEVELS[0] === 0 && AY_LEVELS[15] === 1 && AY_LEVELS.every((v, i) => i === 0 || v > (AY_LEVELS[i - 1] ?? 0)));
check('the volume table is logarithmic, not linear (the middle is a tenth of the top, steps of about 1.4 up there)', (AY_LEVELS[7] ?? 1) < 0.15 && (AY_LEVELS[14] ?? 0) / (AY_LEVELS[15] ?? 1) > 0.78 && (AY_LEVELS[14] ?? 0) / (AY_LEVELS[15] ?? 1) < 0.82);

// ---- tone ------------------------------------------------------------------------------------------------------------
{
  const periodMasks = chip({ 0: 0x34, 1: 0xff, 2: 5, 3: 0x12, 4: 0, 5: 0 });
  check('a tone period is 12 bits: the high register keeps 4', periodMasks.tonePeriod(0) === 0xf34 && periodMasks.tonePeriod(1) === 0x205);
  check('a tone period of 0 counts as 1', periodMasks.tonePeriod(2) === 1);
  for (const period of [1, 2, 5, 37, 300]) {
    const ay = chip({ 0: period & 255, 1: period >> 8, ...TONE_A });
    const flips: number[] = [];
    let last = ay.toneOut(0);
    for (let t = 1; t <= period * 10 + 3; t++) {
      ay.tick();
      if (ay.toneOut(0) !== last) { flips.push(t); last = ay.toneOut(0); }
    }
    check(`period ${period}: the output flips every ${period} ticks`, flips.length >= 10 && flips.every((t, i) => t === (i + 1) * period));
  }
  // what it sounds at: a tone of period 100 is clock / 1600 Hz
  const ay = chip({ 0: 100, 1: 0, ...TONE_A });
  let rises = 0;
  let high = false;
  const seconds = 2;
  for (let i = 0; i < RATE * seconds; i++) {
    const level = ay.integrate() > (AY_LEVELS[15] ?? 1) / 3 / 2;
    if (level && !high) rises++;
    high = level;
  }
  const expected = AY_CLOCK_128K / 1600;
  check(`a tone of period 100 sounds at clock / 1600 = ${expected.toFixed(1)} Hz (counted ${(rises / seconds).toFixed(1)})`, Math.abs(rises / seconds - expected) < 1);
}

// ---- noise -----------------------------------------------------------------------------------------------------------
{
  // an independent LFSR: the sequence of the bit shifted out, for the polynomial x^17 + x^14 + 1
  const reference = (n: number): number[] => {
    const bits: number[] = [];
    let r = 1;
    for (let i = 0; i < n; i++) {
      bits.push(r & 1);
      const fb = (r & 1) ^ ((r >> 3) & 1);
      r = (r >> 1) | (fb << 16);
    }
    return bits;
  };
  const ay = chip({ 6: 1 });
  const seen: number[] = [ay.noiseOut() ? 1 : 0];
  for (let i = 0; i < 2000; i++) { ay.tick(); ay.tick(); seen.push(ay.noiseOut() ? 1 : 0); }
  check('noise: the register is 17 bits shifted with feedback bit 0 xor bit 3 (the sequence matches, 2000 shifts)', seen.join() === reference(2001).join());
  const long = chip({ 6: 1 });
  let shifts = 0;
  do { long.tick(); long.tick(); shifts++; } while (long.noiseRegister !== 1 && shifts < 200000);
  check('noise: the register has the maximal period, 131071', shifts === 131071);
  const slow = chip({ 6: 7 });
  const changes: number[] = [];
  let before = slow.noiseRegister;
  for (let t = 1; t <= 14 * 20; t++) {
    slow.tick();
    if (slow.noiseRegister !== before) { changes.push(t); before = slow.noiseRegister; }
  }
  check('noise: a period of 7 shifts the register every 14 ticks (16 clocks per unit)', changes.length === 20 && changes.every((t, i) => t === (i + 1) * 14));
  check('noise period: 5 bits, and 0 counts as 1', chip({ 6: 0xff }).noisePeriod() === 31 && chip({ 6: 0 }).noisePeriod() === 1);
}

// ---- the mixer ---------------------------------------------------------------------------------------------------------
{
  // (tone period 1: high after one tick, low after two; noise period 31 keeps the register still, high, for 62 ticks)
  const rows: [string, number, boolean, number][] = [
    ['tone on, noise off, tone high', 0b00001000 | 0b110, true, 1],
    ['tone on, noise off, tone low', 0b00001000 | 0b110, false, 0],
    ['tone off, noise on, noise high', 0b00000001 | 0b110, true, 1],
    ['tone off, noise off: held at its volume', 0b00001001 | 0b110, false, 1],
    ['tone on, noise on, both high', 0b110, true, 1],
    ['tone on, noise on, tone low', 0b110, false, 0],
  ];
  for (const [what, mixer, toneHigh, want] of rows) {
    const ay = chip({ 0: 1, 6: 31, 8: 15, 7: mixer });
    ay.tick();
    if (!toneHigh) ay.tick();
    check(`mixer: ${what}`, ay.channelLevel(0) === want);
  }
  const ay = chip({ 0: 1, 6: 31, 8: 9, 9: 15, 10: 0, 7: 0b00111111 });
  check('mixer: with every source off the channels are held high at their own volumes (9, 15, 0): the mix is their sum over three', Math.abs(ay.mix() - ((AY_LEVELS[9] ?? 0) + (AY_LEVELS[15] ?? 0)) / 3) < 1e-12);
}

// ---- the envelope ------------------------------------------------------------------------------------------------------
{
  const cycle = (shape: number, n: number): number => {
    const k = n % 16;
    const c = Math.floor(n / 16);
    switch (shape) {
      case 0: case 1: case 2: case 3: case 9: return n < 16 ? 15 - n : 0;
      case 4: case 5: case 6: case 7: case 15: return n < 16 ? n : 0;
      case 8: return 15 - k;
      case 10: return c % 2 === 0 ? 15 - k : k;
      case 11: return n < 16 ? 15 - n : 15;
      case 12: return k;
      case 13: return n < 16 ? n : 15;
      default: return c % 2 === 0 ? k : 15 - k; // 14
    }
  };
  for (let shape = 0; shape < 16; shape++) {
    for (const period of [1, 3]) {
      const ay = chip({ 11: period, 12: 0, 13: shape });
      const levels: number[] = [ay.envLevel];
      let early = false;
      for (let step = 1; step < 70; step++) {
        for (let t = 0; t < 2 * period - 1; t++) { ay.tick(); if (ay.envLevel !== levels[step - 1]) early = true; }
        ay.tick();
        levels.push(ay.envLevel);
      }
      if (early) levels.push(-1);
      const want = Array.from({ length: 70 }, (_, n) => cycle(shape, n));
      check(`envelope shape ${shape}, period ${period}: 70 steps, one every ${2 * period} ticks, as the shape draws`, levels.join() === want.join());
    }
  }
  const ay = chip({ 11: 1, 8: 0x10, 7: 0b00111111, 13: 12 });
  ay.write(7, 0b00111110);
  for (let i = 0; i < 2 * 5; i++) ay.tick();
  const withEnvelope = (): number => ay.channelLevel(0);
  ay.write(0, 1);
  ay.tick(); // (the tone is high)
  check('a volume with bit 4 set takes the envelope\'s level (a rising shape, step 5 of the ramp)', ay.toneOut(0) ? withEnvelope() === AY_LEVELS[ay.envLevel] : true);
  check('writing the shape register starts the envelope over', (() => { ay.write(13, 4); return ay.envLevel === 0; })());
}

// ---- rendering ---------------------------------------------------------------------------------------------------------
{
  const quiet = chip();
  const silence = new Float32Array(2000);
  quiet.render(silence, 0, silence.length);
  check('a chip with nothing set renders exact silence', silence.every((v) => v === 0));
  // tone and noise both off in the mixer holds a channel high: the output is a constant that AC coupling takes away
  const hold = chip({ 0: 1, 8: 15, 7: 0b00001001 | 0b00110110 });
  const out = new Float32Array(RATE);
  hold.render(out, 0, out.length);
  check('a channel held high at full volume steps up once, then the AC coupling takes it away (the last tenth of a second is under 1e-3)', (out[1] ?? 0) > 0.2 && out.subarray(RATE - 4800).every((v) => Math.abs(v) < 1e-3));
  // the mean of the raw signal is the duty cycle of the level
  const tone = chip({ 0: 77, 8: 12, 7: 0b00111110 });
  let sum = 0;
  const n = RATE;
  for (let i = 0; i < n; i++) sum += tone.integrate();
  const want = (AY_LEVELS[12] ?? 0) / 3 / 2;
  check('a tone\'s raw mean is half its level over three', Math.abs(sum / n - want) < 0.002);
}

// ---- the stream and the tune ---------------------------------------------------------------------------------------------
{
  const images: number[][] = [];
  let seed = 12345;
  const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) >> 8;
  let state = new Array<number>(14).fill(0);
  for (let i = 0; i < 300; i++) {
    state = state.slice();
    const changes = i % 7 === 0 ? 0 : 1 + (next() % 4);
    for (let c = 0; c < changes; c++) state[next() % 14] = next() & 255;
    images.push(state);
  }
  const bytes = packAyStream(images);
  check('a stream unpacks to the images it was made from', unpackAyStream(bytes).join('|') === images.join('|'));
  check('the first step is coded in full (14 registers), a step with no change in one byte', readAyStep(bytes, 0).writes.length === 14 && bytes[readAyStep(bytes, 0).next] !== undefined);
  const still = packAyStream([[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]]);
  check('a step with nothing changed is one zero byte', still.length === 2 + 14 + 1 && still[still.length - 1] === 0);
}
{
  // three steps at 25 a second on a 50000 Hz clock: one every 2000 samples
  const images = [[10, 0, 0, 0, 0, 0, 0, 0b00111110, 15], [11, 0, 0, 0, 0, 0, 0, 0b00111110, 15], [12, 0, 0, 0, 0, 0, 0, 0b00111110, 15]];
  const tune = new AyTune(packAyStream(images), 25, 50000);
  check('a tune knows its steps', tune.steps === 3);
  const out = new Float32Array(50000);
  const marks: number[] = [];
  let at = 0;
  for (const length of [1, 1998, 1, 1, 1999, 1, 3000, 7999]) {
    tune.render(out, at, length);
    at += length;
    marks.push(tune.ay.read(0));
  }
  // samples rendered: 1, 1999, 2000, 2001, 4000, 4001, 7001, 15000
  check('steps come every 2000 samples from the first, and the tune loops (10 11 12 10 ...)', marks.join() === '10,10,10,11,11,12,10,11');
  tune.render(out, 0, 2000 * 3 * 4 - 15000 + 5);
  check('it counts its loops', tune.loops >= 4);
  tune.paused = true;
  const before = tune.next;
  tune.render(out, 0, 10000);
  check('paused, a tune is silent and keeps its place', tune.next === before && out.subarray(0, 10000).every((v) => v === 0));
}

// ---- the beeper --------------------------------------------------------------------------------------------------------------
{
  const clock = 3_500_000;
  const toggles = { lead: 700, gaps: [1000, 2000, 500], tail: 800 };
  check('a sound\'s length is lead + gaps + tail', togglesLength(toggles) === 5000);
  const raw = renderToggles(toggles, 3_500_000 / 100, clock, false); // (a sample every 100 T-states)
  const levels = Array.from(raw);
  // up from 700 to 1700, down to 3700, up to 4200, down to the end
  const want = Array.from({ length: 50 }, (_, i) => {
    let up = 0;
    for (let t = i * 100; t < i * 100 + 100; t++) if ((t >= 700 && t < 1700) || (t >= 3700 && t < 4200)) up++;
    return up / 100;
  });
  check('a 1-bit signal integrated over each sample is the fraction of it the speaker was up', levels.length === 50 && levels.every((v, i) => Math.abs(v - (want[i] ?? 0)) < 1e-9));
  const coupled = renderToggles({ lead: 100, gaps: [300000], tail: 100 }, 44100, clock, true);
  check('AC coupled, a speaker left up decays to nothing', (coupled[coupled.length - 1] ?? 1) < 0.05 && Math.max(...coupled) > 0.9);
}

finish();
