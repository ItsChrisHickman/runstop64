import { dissolve, dissolveDeath, sinkStep, wait, type Seq } from '../../shared/monty/deaths';
import type { Game } from './game';
import { C5_START, c5Arrive, c5Restart, c5Road } from './mechanisms';

/**
 * The original's blocking sequences (deaths, the ending, game over), ported as
 * generators: every `yield` is one WaitForVSync, so timings match frame for
 * frame while the rest of the frame (IRQ work) keeps running.
 */

export function eventScript(g: Game, ev: number): Seq {
  switch (ev) {
    case 0: return death4Split(g);
    case 1: return deathByEnemy(g);
    case 2: return deathByLift(g);
    case 3: return deathByPiledriver(g);
    case 4: return deathByHazard(g);
    case 5: return g.data.completion?.(g) ?? nothing();
    default: return deathByC5(g);
  }
}

/** A sequence that does nothing (no finale to play). */
function* nothing(): Seq {}

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
  yield* dissolveDeath(g, 'noise');
  yield* lifeLost(g);
}

function* deathByPiledriver(g: Game): Seq {
  yield* dissolveDeath(g, 'crusher');
  yield* lifeLost(g);
}

function* deathByHazard(g: Game): Seq {
  yield* dissolveDeath(g, 'sink');
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
    if (g.data.c5) g.exitCol = g.data.c5.startCol;
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

export function* gameOver(g: Game): Seq {
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
    g.sptr[x] = g.data.gameOverPtrs[x];
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
