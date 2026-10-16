import { gameOverPtrs } from './data';
import { ROW, SCREEN, type Game } from './game';
import { C5_START, c5Arrive, c5Restart, c5Road } from './mechanisms';

/**
 * The original's blocking sequences (deaths, the ending, game over), ported as
 * generators: every `yield` is one WaitForVSync, so timings match frame for
 * frame while the rest of the frame (IRQ work) keeps running.
 */
type Seq = Generator<void, void, void>;

const PIXEL = 0x2700; // dissolve buffers: $6700 (sprite ptr $9C), $6740 ($9D), $7000
const MASK = 0x2740;
const REF = 0x3000;

/** Original WaitDelay(X): a busy loop of roughly X/5 frames (X=0 means 256). */
function* wait(x: number): Seq {
  const frames = Math.round(((x || 256) * 3328) / 16000);
  for (let i = 0; i < frames; i++) yield;
}

export function eventScript(g: Game, ev: number): Seq {
  switch (ev) {
    case 0: return death4Split(g);
    case 1: return deathByEnemy(g);
    case 2: return deathByLift(g);
    case 3: return deathByPiledriver(g);
    case 4: return deathByHazard(g);
    case 5: return completion(g);
    default: return deathByC5(g);
  }
}

// ---- dissolve helpers ------------------------------------------------------------------

function dissolve(g: Game) {
  const src = g.sptr[3] * 64;
  for (let y = 0x3f; y >= 0; y--) g.mem[PIXEL + y] = g.mem[MASK + y] = g.mem[REF + y] = g.mem[src + y];
  g.frameIndex = 0x9c;
  g.sptr[3] = 0x9c;
  g.mem.fill(0, PIXEL, PIXEL + 3);
  g.mem.fill(0, MASK, MASK + 3);
}

function sinkStep(g: Game) {
  for (let x = 0x27; x >= 0; x -= 3) {
    g.mem[PIXEL + x + 3] = g.mem[PIXEL + x];
    g.mem[MASK + x + 3] = g.mem[MASK + x];
    g.mem[PIXEL + x + 4] = g.mem[PIXEL + x + 1];
    g.mem[MASK + x + 4] = g.mem[MASK + x + 1];
  }
}

function noiseStep(g: Game, a: number) {
  for (let x = 0x30; x >= 0; x--) {
    if (a >= 0x10) {
      g.mem[PIXEL + x] = (g.random() ^ g.mem[PIXEL + x]) & g.mem[MASK + x];
    } else {
      const v = g.random() & g.mem[MASK + x];
      g.mem[PIXEL + x] = g.mem[MASK + x] = v;
    }
  }
}

/** PlayDissolve: Monty materialises after a teleport. */
export function* playDissolve(g: Game): Seq {
  g.actionCounter = 0x80;
  dissolve(g);
  g.mem.fill(0, REF, REF + 0x64);
  for (let t = 10; t > 0; t--) {
    yield;
    g.mem.copyWithin(PIXEL, REF, REF + 0x40);
    g.mem.copyWithin(REF, MASK, MASK + 0x40);
    for (let y = t; y >= 0; y--) for (let x = 0x30; x >= 0; x--) g.mem[REF + x] = g.random() & g.mem[MASK + x];
  }
}

// ---- deaths ---------------------------------------------------------------------------------

function* death4Split(g: Game): Seq {
  g.enable |= 0x0f;
  g.multicolour = 0;
  g.sx[0] = g.sx[1] = g.x2;
  g.sx[2] = (g.x2 - 8) & 0xff;
  g.sx[3] = (g.sx[2] + 0x10) & 0xff;
  g.sy[2] = g.sy[3] = g.y;
  g.sy[0] = (g.y - 0x10) & 0xff;
  g.sy[1] = (g.sy[0] + 0x20) & 0xff;
  g.scol.fill(1, 0, 4);
  let n = 0;
  for (;;) {
    if (g.sx[2] < 3) g.enable &= 0xfb;
    g.sx[2] = (g.sx[2] - 3) & 0xff;
    g.sx[3] = (g.sx[3] + 3) & 0xff;
    if (g.sx[3] >= 0xa0) g.enable &= 0xf7;
    if (g.sy[0] < 3) g.enable &= 0xfe;
    g.sy[0] = (g.sy[0] - 3) & 0xff;
    if (g.sy[1] + 3 > 0xff) g.enable &= 0xfd;
    g.sy[1] = (g.sy[1] + 3) & 0xff;
    n++;
    const x = (n & 7) >> 1;
    g.sptr[1] = 0x7e + 12 + x;
    g.sptr[0] = 0x7e + 8 + x;
    g.sptr[3] = 0x7e + 4 + x;
    g.sptr[2] = 0x7e + x;
    if (!(g.enable & 0x0f)) break;
    yield;
  }
  yield* lifeLost(g);
}

function* deathByEnemy(g: Game): Seq {
  dissolve(g);
  for (let a = 0x3c; a >= 0; a--) {
    noiseStep(g, a);
    yield;
  }
  yield* lifeLost(g);
}

function* deathByPiledriver(g: Game): Seq {
  dissolve(g);
  for (let a = 0x30; a >= 0; a--) {
    if (!(a & 1)) sinkStep(g);
    noiseStep(g, a);
    yield;
  }
  yield* lifeLost(g);
}

function* deathByHazard(g: Game): Seq {
  dissolve(g);
  for (let a = 0x12; a >= 0; a--) {
    sinkStep(g);
    yield;
  }
  yield* lifeLost(g);
}

function* deathByLift(g: Game): Seq {
  dissolve(g);
  for (let i = 0; i <= 9; i++) sinkStep(g);
  g.enable = (g.enable & 0xf0) | 0x0b;
  g.multicolour |= 0x03;
  g.sy[0] = g.sy[1] = 0xc5;
  g.sx[0] = 0x42;
  g.sx[1] = 0x4e;
  g.sptr[0] = 0xbd;
  g.sptr[1] = 0xbe;
  g.sy[3] = 0xc5;
  yield* wait(0);
  yield* wait(0x80);
  yield* lifeLost(g);
}

/**
 * A crash (or an enemy) in the C5: the original sends Monty back to the start of the
 * section, by the tree in room $24. ENHANCED (assist c5): back into the room he crashed
 * in, where he came into it (the room's entry, savedX, on the road), the C5 stopped there
 * facing the way it was going (mechanisms.ts c5Restart): coming back at the speed it came in
 * at, the first holes of some rooms came a frame or two after the edge (the return's second
 * room, $32: a press on its first frame), so every life went in the same crash.
 */
function* deathByC5(g: Game): Seq {
  if (g.assist.c5) {
    c5Arrive(g, c5Restart(g.c5Arrival));
    g.savedY = c5Road(g.c5Arrival.fallStage);
  } else {
    g.exitCol = 0x08;
    c5Arrive(g, C5_START);
    g.savedX = 0x9b;
  }
  yield* lifeLost(g);
}

/** LifeLost: a life gone, then the room again, or game over (CONTINUE? is the front end's, on the title after it). */
function* lifeLost(g: Game): Seq {
  if (!g.lifeLost()) return;
  yield* gameOver(g);
}

// ---- game over and the ending ------------------------------------------------------------------

function* gameOver(g: Game): Seq {
  yield;
  g.sound.song(1);
  g.gameOverActive = 1;
  g.ending = null;
  g.c5.active = 0;
  g.expandX = 0;
  g.completionActive = 0;
  g.priority = 0;
  g.cheatMode = 0;
  g.expandY = 0xff;
  g.actionCounter = 0x80;
  g.multicolour = 0xff;
  g.enable = 0xff;
  for (let x = 0; x < 8; x++) {
    g.sx[x] = x < 4 ? 0xfc : 0xb0;
    g.sy[x] = 0x85;
    g.scol[x] = x + 1;
    g.sptr[x] = gameOverPtrs[x];
  }
  // GAME and OVER fly apart letter by letter.
  for (let pair = 0; pair < 4; pair++) {
    for (let n = [0x32, 0x3c, 0x46, 0x50][pair]; n > 0; n--) {
      yield;
      g.sx[pair] = (g.sx[pair] + 1) & 0xff;
      g.sx[pair + 4] = (g.sx[pair + 4] - 1) & 0xff;
    }
  }
  yield* wait(0);
  yield* wait(0);
  yield* wait(0x80);
  for (let n = 0x3c; n >= 0; n--) {
    for (let x = 0; x < 4; x++) { g.sy[x]--; g.sy[x + 4]++; }
    yield;
  }
  for (let n = 0x9f; n > 0; n--) {
    for (let x = 0; x < 4; x++) { g.sx[x]++; g.sx[x + 4]--; }
    yield;
  }
  g.gameOverActive = 0;
  g.finished = g.won ? 'won' : 'gameover';
}

/** Chars $65-$67 rotate one pixel right per call (the prize area; RotateChar). */
export function rotatePrizeChars(g: Game) {
  for (let x = 7; x >= 0; x--) {
    const a = 0x65 * 8 + x, b = 0x66 * 8 + x, c = 0x67 * 8 + x;
    const ca = g.mem[a] & 1, cb = g.mem[b] & 1, cc = g.mem[c] & 1;
    g.mem[a] >>= 1;
    g.mem[b] = (g.mem[b] >> 1) | (ca << 7);
    g.mem[c] = (g.mem[c] >> 1) | (cb << 7);
    if (cc) g.mem[a] |= 0x80;
  }
}

/** Completion.Begin: the treasure is touched — off to France. */
function* completion(g: Game): Seq {
  g.freeze = 1;
  g.completionActive = 1;
  // (until he walks aboard, travel may take him away: the multicolours it then puts back)
  g.ending = { aboard: false, mc1: g.vic.mc1, mc2: g.vic.mc2 };
  g.actionCounter = 0;
  g.roomId = 0x30;
  g.loadRoom();
  for (const r of [19, 20, 21, 22]) g.col[r * ROW + 2] = 0;
  for (let x = 2, y = 0x65; x < 0x26; x++) {
    g.mem[SCREEN + 19 * ROW + x] = y;
    y = y === 0x67 ? 0x65 : y + 1;
  }
  // SetupDisplay: Monty (sprite 7) and the flag (sprite 0).
  g.sx[7] = 0x9b; g.sy[7] = 0xa3; g.scol[7] = 1;
  g.sx[0] = 0x7b; g.sy[0] = 0x56; g.scol[0] = 1;
  g.animTimer = 1;
  g.multicolour = 0x01;
  g.enable = 0x81;
  g.vic.mc1 = 2;
  g.vic.mc2 = 6;
  g.sound.song(2);
  yield* walkSprite7(g, 0x6c);
  if (!g.roomItemActive[2]) {
    // No passport: arrested at customs (can't happen with the full kit).
    yield* gameOver(g);
    return;
  }
  yield* wait(0xa0);
  // CompletionSetup: the boat.
  g.sy[1] = g.sy[2] = g.sy[3] = 0xa3;
  g.sx[1] = 0x0c; g.sx[2] = 0xe0; g.sx[3] = 0xf8;
  g.multicolour |= 0x0c;
  g.enable |= 0x0e;
  g.expandX = 0x0c;
  g.expandY = 0x0e;
  g.scol[2] = g.scol[3] = 1;
  g.scol[1] = 0;
  g.sptr[2] = 0x9e; g.sptr[3] = 0x9f; g.sptr[1] = 0xb4;
  g.priority = 0x0e;
  // Boat slides in.
  while (g.sx[2] !== 0x38) {
    yield;
    g.stepGate ^= 1;
    if (g.stepGate) { g.sx[2]++; g.sx[3]++; }
    boatParity(g);
  }
  // Monty walks aboard (from here the finale plays on to the end).
  yield* wait(0x80);
  if (g.ending) g.ending.aboard = true;
  yield* walkSprite7(g, 0x5e);
  for (let i = 0; i <= 0x0e; i++) {
    yield;
    g.sy[7]++;
  }
  yield* walkSprite7(g, 0x46);
  yield* wait(0x40);
  // Bon voyage.
  while (g.sx[3] !== 0xf9) {
    yield;
    g.stepGate ^= 1;
    if (!g.stepGate) { g.sx[2]--; g.sx[3]--; g.sx[7]--; }
    g.vic.sprites[7].x |= g.stepGate;
    boatParity(g);
  }
  g.won = true;
  yield* gameOver(g);
}

function boatParity(g: Game) {
  g.vic.sprites[2].x |= g.stepGate;
  g.vic.sprites[3].x |= g.stepGate;
}

/** WalkSprite7ToTarget: Monty (as sprite 7) walks left to a target X. */
function* walkSprite7(g: Game, target: number): Seq {
  while (g.sx[7] !== target) {
    yield;
    g.vic.sprites[7].x |= g.stepGate;
    g.animTimer = (g.animTimer - 1) & 0xff;
    if (!g.animTimer) {
      g.animTimer = 4;
      g.ticker = (g.ticker + 1) & 0xff;
    }
    g.sptr[7] = 0x50 + (g.ticker & 3);
    g.stepGate ^= 1;
    if (g.stepGate) g.sx[7]--;
  }
}
