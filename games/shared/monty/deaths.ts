import { FRAME } from './frames';

/**
 * Monty on the Run's deaths, shared: the dissolve of his picture into noise or into the ground, as the original draws them
 * (Death.* in the reconstruction), over the little a game gives them (`DissolveStage`): its sprite bank, sprite pointers and random
 * numbers. Each is a generator: every `yield` is one WaitForVSync, so timings match frame for frame while the rest of the frame
 * keeps running. What follows a death (a life lost, the room again, game over) is the game's.
 */
export type Seq = Generator<void, void, void>;

/** What the dissolve works on. */
export interface DissolveStage {
  /** The VIC bank: sprite data by pointer, the buffers below in it. */
  readonly mem: Uint8Array;
  /** The sprite pointers (Monty is sprite 3). */
  readonly sptr: Uint8Array;
  frameIndex: number;
  actionCounter: number;
  random(): number;
}

/** The cause of a death, as Monty on the Run draws it. */
export type DeathKind =
  /** a creature: Monty comes apart into noise */
  | 'noise'
  /** water or lava: he sinks */
  | 'sink'
  /** a crusher: he sinks, and noise */
  | 'crusher';

const PIXEL = 0x2700; // dissolve buffers: $6700 (sprite ptr $9C), $6740 ($9D), $7000
const MASK = 0x2740;
const REF = 0x3000;

/** Original WaitDelay(X): a busy loop of roughly X/5 frames (X=0 means 256). */
export function* wait(x: number): Seq {
  const frames = Math.round(((x || 256) * 3328) / 16000);
  for (let i = 0; i < frames; i++) yield;
}

/** His picture copied into the dissolve buffers, and shown from them. */
export function dissolve(s: DissolveStage) {
  const src = s.sptr[3] * 64;
  for (let y = 0x3f; y >= 0; y--) s.mem[PIXEL + y] = s.mem[MASK + y] = s.mem[REF + y] = s.mem[src + y];
  s.frameIndex = FRAME.dissolve;
  s.sptr[3] = FRAME.dissolve;
  s.mem.fill(0, PIXEL, PIXEL + 3);
  s.mem.fill(0, MASK, MASK + 3);
}

/** One step of sinking: the picture a row down. */
export function sinkStep(s: DissolveStage) {
  for (let x = 0x27; x >= 0; x -= 3) {
    s.mem[PIXEL + x + 3] = s.mem[PIXEL + x];
    s.mem[MASK + x + 3] = s.mem[MASK + x];
    s.mem[PIXEL + x + 4] = s.mem[PIXEL + x + 1];
    s.mem[MASK + x + 4] = s.mem[MASK + x + 1];
  }
}

/** One step of noise: the picture eaten away (a >= $10) or the leftover set to noise. */
export function noiseStep(s: DissolveStage, a: number) {
  for (let x = 0x30; x >= 0; x--) {
    if (a >= 0x10) {
      s.mem[PIXEL + x] = (s.random() ^ s.mem[PIXEL + x]) & s.mem[MASK + x];
    } else {
      const v = s.random() & s.mem[MASK + x];
      s.mem[PIXEL + x] = s.mem[MASK + x] = v;
    }
  }
}

/** PlayDissolve: Monty materialises after a teleport. */
export function* playDissolve(s: DissolveStage): Seq {
  s.actionCounter = 0x80;
  dissolve(s);
  s.mem.fill(0, REF, REF + 0x64);
  for (let t = 10; t > 0; t--) {
    yield;
    s.mem.copyWithin(PIXEL, REF, REF + 0x40);
    s.mem.copyWithin(REF, MASK, MASK + 0x40);
    for (let y = t; y >= 0; y--) for (let x = 0x30; x >= 0; x--) s.mem[REF + x] = s.random() & s.mem[MASK + x];
  }
}

/** The death by a creature, the water or a crusher: his picture dissolves (a life lost follows, the game's). */
export function* dissolveDeath(s: DissolveStage, kind: DeathKind): Seq {
  dissolve(s);
  switch (kind) {
    case 'noise':
      for (let a = 0x3c; a >= 0; a--) {
        noiseStep(s, a);
        yield;
      }
      return;
    case 'crusher':
      for (let a = 0x30; a >= 0; a--) {
        if (!(a & 1)) sinkStep(s);
        noiseStep(s, a);
        yield;
      }
      return;
    case 'sink':
      for (let a = 0x12; a >= 0; a--) {
        sinkStep(s);
        yield;
      }
      return;
  }
}
