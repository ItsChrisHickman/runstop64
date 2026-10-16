import { rom } from './data';
import type { Game } from './game';
import { drawTile } from './room';

/**
 * The status panel (rows 0-5): the score, which rolls up as points come in,
 * the lives, which roll up or down, and the three bars (energy, platforms,
 * laser). The original's $2FE6-$33AA.
 */

/** $1080: the panel's frame, drawn in tiles. */
export function drawFrame(g: Game) {
  const s = g.scr;
  s.attr.fill(0, 0, 0xf0);
  s.bank.fill(0, 0x1c00, 0x1cf0);
  s.bank.fill(0, 0x2000, 0x2800);
  for (let x = 0; x !== 0x28; x += 4) drawTile(g, 0x65, x, 0);
  for (let i = 0; !(rom(0x1150 + i) & 0x80); i++) drawTile(g, rom(0x1158 + i), rom(0x1150 + i), 0);
}

/** $2FE6: a new game's panel: score 000000, four lives, full bars. */
export function reset(g: Game) {
  const s = g.scr;
  for (let x = 5; x >= 0; x--) {
    s.setColour(0x53 + x, 0x10);
    g.score[x] = 0;
  }
  s.setColour(0x84, 0xa0); s.setColour(0x85, 0xa0);
  for (let x = 5; x >= 0; x--) {
    s.setColour(0x3c + x, 0xd0);
    s.setColour(0x64 + x, 0x10);
    s.setColour(0x8c + x, 0x70);
  }
  s.setColour(0x3c, 0xa0); s.setColour(0x3d, 0xa0);
  for (let y = 0; y < 8; y++) {
    const zero = rom(0xcd5b + y);
    for (const o of [0x298, 0x2a0, 0x2a8, 0x2b0, 0x2b8, 0x2c0, 0x420]) s.bank[0x2000 + o + y] = zero;
    s.bank[0x2428 + y] = rom(0xcd7b + y);
  }
  g.lives = [0, 4];
  g.livesRoll = 0; g.livesSteps = 0; g.livesDir = 0;
  g.pendingScore = 0; g.scoreRoll = 0; g.scoreSpeed = 0; g.scoreTimer = 0;
  g.panelDirty = 7;
  g.platformsLeft = g.charge = g.energy = 0x78;
}

/** $2FB7: BLOB died: energy refilled, at least a few platforms, and a life rolls away. */
export function died(g: Game) {
  g.energy = 0x78;
  let dirty = 1;
  if (((g.platformsLeft - 0x0c) & 0x80) !== 0) { g.platformsLeft = 0x0c; dirty |= 2; }
  g.panelDirty |= dirty;
  if (!(g.livesDir & 0x80) && g.livesSteps === 1) { g.livesDir = 0xff; return; }
  g.livesSteps = (g.livesSteps - 1) & 0xff;
  if (g.livesDir) return;
  g.livesRoll = 0;
  g.livesDir = 0xff;
}

/** $2F9B: an extra life rolls in. */
export function extraLife(g: Game) {
  if (g.livesDir !== 1 && g.livesSteps === 0xff) { g.livesDir = 1; return; }
  g.livesSteps = (g.livesSteps + 1) & 0xff;
  if (g.livesDir) return;
  g.livesRoll = 0;
  g.livesDir = 1;
}

/**
 * $305E: a bonus taken: an extra life, or energy, platforms or laser charge
 * (its kind says which bar and how much; one kind tops up the lowest bar).
 */
export function bonus(g: Game, graphic: number) {
  let x: number, y = graphic;
  const bars = () => [g.energy, g.platformsLeft, g.charge];
  if (y === 0x18) {
    extraLife(g);
    x = 3;
  } else {
    x = rom(0x33ae + y);
    if (x === 3) {
      const b = bars();
      x = 0; let v = b[0];
      if (((v - b[1]) & 0x80) === 0) { x = 1; v = b[1]; }
      if (((v - b[2]) & 0x80) === 0) x = 2;
      y = 0x14;
    }
    g.panelDirty |= rom(0x33cc + x);
    let a = bars()[x] + rom(0x33b5 + y);
    a &= 0xff;
    if (a >= 0x79) a = 0x78;
    if (x === 0) g.energy = a & 0xff; else if (x === 1) g.platformsLeft = a & 0xff; else g.charge = a & 0xff;
  }
  g.sound.effect(rom(0x33cf + x), 1);
}

/** $30F8 (after the raster wait): the score rolls, the lives roll, the bars are redrawn. */
export function frame(g: Game) {
  if (g.pendingScore) rollScore(g);
  if (!(g.frames & 7) && (g.livesRoll || g.livesSteps)) rollLives(g);
  if (g.panelDirty & 1) { g.panelDirty ^= 1; bar(g, 0x21e0, g.energy); }
  if (g.panelDirty & 2) { g.panelDirty ^= 2; bar(g, 0x2320, g.platformsLeft); }
  if (g.panelDirty & 4) { g.panelDirty ^= 4; bar(g, 0x2460, g.charge); }
}

/** $310E: the score's digits roll up a pixel at a time; how fast depends on how much is still to come. */
function rollScore(g: Game) {
  g.scoreTimer = (g.scoreTimer + 1) & 0xff;
  if (g.scoreTimer !== 0x0a) return;
  let a = g.pendingScore;
  if (a >= 9) a = 9;
  if (((a - g.scoreSpeed) & 0x80) !== 0) {
    g.scoreSpeed = (g.scoreSpeed - 1) & 0xff;
    a = g.scoreSpeed || 1;
  } else {
    g.scoreSpeed = (g.scoreSpeed + 2) & 0xff;
    a = g.scoreSpeed;
    if (a >= 0x0a) a = 9;
  }
  g.scoreSpeed = a;
  g.scoreTimer = a;
  // Roll the units, and the digits above while they're about to carry.
  let y = 5, x = 0x28;
  let rolled = false;
  for (;;) {
    const d = drawRolling(g, g.score[y], x, y);
    if (!(d & 1)) break;
    x -= 8; y--;
    if (y === 3) {
      for (;;) {
        const d2 = drawRolling(g, g.score[y], x, y);
        if (d2 !== 9) break;
        x -= 8; y--;
        if (y < 0) { rolled = true; break; }
      }
      break;
    }
  }
  if (!rolled) {
    x -= 8; y--;
    drawDigit(g, g.score[y & 0xff], x);
  }
  g.scoreRoll++;
  if (g.scoreRoll !== 9) return;
  g.scoreRoll = 0;
  let i = 5;
  for (;;) {
    g.score[i]++;
    if (g.score[i] & 1) break;
    if (g.score[i] === 0x0a) g.score[i] = 0;
    i--;
    if (i === 3) {
      for (;;) {
        g.score[i]++;
        if (g.score[i] !== 0x0a) break;
        g.score[i] = 0;
        i--;
        if (i < 0) break;
      }
      break;
    }
  }
  g.pendingScore = (g.pendingScore - 1) & 0xff;
}

/** $32E1: the final count: a point a quarter frame (the last two digits carry; the rest don't). */
export function countFast(g: Game) {
  if (!g.pendingScore) return;
  let y = 5, x = 0x28;
  for (;;) {
    const d = drawRolling(g, g.score[y], x, y);
    if (d !== 9) break;
    x -= 8; y--;
    if (y === 3) break;
  }
  x -= 8; y--;
  drawDigit(g, g.score[y], x);
  g.scoreRoll++;
  if (g.scoreRoll !== 9) return;
  g.scoreRoll = 0;
  for (let i = 5; i !== 3; i--) {
    g.score[i]++;
    if (g.score[i] !== 10) break;
    g.score[i] = 0;
  }
  g.pendingScore = (g.pendingScore - 1) & 0xff;
}

/** $3352: a score digit part way through rolling to the next ($CC pixels); the last two digits use the half-step glyphs. */
function drawRolling(g: Game, digit: number, x: number, y: number) {
  let at = digit * 8 + g.scoreRoll;
  if (g.scoreRoll === 8 && !(g.rng.both() & 0xc0)) return digit;
  if (y !== 5) at += 0x58;
  for (let i = 0; i < 8; i++) g.scr.bank[(0x2298 + x + i) & 0x3fff] = rom(0xcd03 + ((at + i) & 0xff));
  return digit;
}

/** $3390: a score digit, still. */
function drawDigit(g: Game, digit: number, x: number) {
  const at = ((digit * 8) & 0xff) + 0x58;
  for (let i = 0; i < 8; i++) g.scr.bank[(0x2298 + x + i) & 0x3fff] = rom(0xcd03 + ((at + i) & 0xff));
}

/** $31AE: the lives counter rolls a step (every 8 frames). */
function rollLives(g: Game) {
  const L = g.lives; // [tens, units] = $D1, $D2
  if (!(g.livesDir & 0x80)) {
    drawLives(g, L[1], 8);
    if (L[1] === 9) drawLives(g, L[0], 0);
    g.livesRoll = (g.livesRoll + 1) & 0xff;
    if (g.livesRoll !== 9) return;
    g.livesRoll = 0;
    g.livesSteps = (g.livesSteps - 1) & 0xff;
    if (g.livesSteps === 0 || g.livesSteps & 0x80) { g.livesDir = 0; g.livesSteps = 0; }
    L[1]++;
    if (L[1] !== 10) return;
    L[1] = 0;
    L[0]++;
    if (L[0] !== 10) return;
    L[0] = L[1] = 9;
    return;
  }
  g.livesRoll = (g.livesRoll - 1) & 0xff;
  if (g.livesRoll === 0) {
    g.livesSteps = (g.livesSteps + 1) & 0xff;
    if (!(g.livesSteps & 0x80)) { g.livesSteps = 0; g.livesDir = 0; }
  } else if (g.livesRoll & 0x80) {
    g.livesRoll = 8;
    L[1]--;
    if (L[1] < 0) { L[1] = 9; L[0]--; if (L[0] < 0) L[0] = 9; }
  }
  drawLives(g, L[1], 8);
  if (L[1] === 9) drawLives(g, L[0], 0);
}

/** $3334: a lives digit, rolled $E3 pixels. */
function drawLives(g: Game, digit: number, x: number) {
  const at = digit * 8 + g.livesRoll;
  for (let i = 0; i < 8; i++) g.scr.bank[0x2420 + x + i] = rom(0xcd5b + ((at + i) & 0xff));
}

/** $327E: a bar: a cell per 20 units (value + 10), the last part-filled. */
function bar(g: Game, at: number, value: number) {
  const b = g.scr.bank;
  let v = (value + 0x0a) & 0xff;
  let mask = 0x0f;
  let y = 0;
  const put = (o: number, val: number) => { b[(at + o) & 0x3fff] = val; };
  for (;;) {
    if (v === 0x0a) return;
    if (((v - 0x14) & 0x80) === 0) {
      put(y + 1, 0xff & mask);
      put(y + 3, 0xfe & mask);
      put(y + 4, 0xfe & mask);
      put(y + 6, 0xff & mask);
      y += 8;
      mask = 0xff;
      v = (v - 0x14) & 0xff;
      continue;
    }
    const p = rom(0x33ab + v) & mask;
    put(y + 1, p); put(y + 3, p); put(y + 4, p); put(y + 6, p);
    if (y + 6 === 0x36) return;
    y += 9;
    for (let i = 0; i < 6; i++) put(y + i, 0);
    return;
  }
}
