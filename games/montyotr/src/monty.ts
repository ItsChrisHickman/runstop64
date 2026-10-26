import { flameMasks, jumpArc, SFX } from './data';
import { ROW, type Game } from './game';
import { c5DriveMovement } from './mechanisms';

/**
 * Monty's movement and animation — a port of the original Monty.Draw:
 * UpdateMovement, StepJumpArc, UpdateState and the Utils.CheckTile* helpers.
 * Coordinates are the original's: x2 is the sprite X in 2-pixel units, y the
 * VIC sprite Y; the collision box is 2×2 chars from Monty's top-left.
 */
export function montyDraw(g: Game) {
  updateMovement(g);
  updateState(g);
  g.enable |= 0x08;
}

// ---- collision helpers --------------------------------------------------------------

const yAligned = (g: Game) => ((g.y - 0x32) & 7) === 0;
const xAligned = (g: Game) => ((g.x2 - 0x0c) & 3) === 0;
const flagAt = (g: Game, addr: number) => g.tileFlag(g.chr(addr));

function blockedRight(g: Game) {
  if (!xAligned(g)) return false;
  const rows = yAligned(g) ? 2 : 3;
  const base = g.rowAddr(g.montyRow) + g.montyCol + 2;
  for (let i = 0; i < rows; i++) if (flagAt(g, base + i * ROW) === 1) return true;
  return false;
}

function blockedLeft(g: Game) {
  if (!xAligned(g)) return false;
  const rows = yAligned(g) ? 2 : 3;
  const base = g.rowAddr(g.montyRow) + g.montyCol - 1;
  for (let i = 0; i < rows; i++) if (flagAt(g, base + i * ROW) === 1) return true;
  return false;
}

function blockedAbove(g: Game) {
  if (!yAligned(g)) return false;
  const cols = xAligned(g) ? 2 : 3;
  const base = g.rowAddr(g.montyRow - 1) + g.montyCol;
  for (let i = 0; i < cols; i++) if (flagAt(g, base + i) === 1) return true;
  return false;
}

/** CheckTileBelow; also starts a hazard death when both feet are on water/lava. */
function blockedBelow(g: Game) {
  if (!yAligned(g)) return false;
  const cols = xAligned(g) ? 2 : 3;
  const base = g.rowAddr(g.montyRow + 2) + g.montyCol;
  let hazards = 2;
  for (let i = 0; i < cols; i++) {
    const f = flagAt(g, base + i);
    if (f === 4 && --hazards === 0) {
      g.actionCounter = 5;
      return false;
    }
    if (f === 1) return true;
    if (!(g.montyAction === 0 && g.onRope) && (f === 2 || f === 3)) return true;
  }
  return false;
}

/** UpdateTileFlags: is any of the 2×3 chars Monty overlaps a rope? */
function updateRope(g: Game) {
  const base = g.montyChr;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      if (flagAt(g, base + r * ROW + c) !== 3) continue;
      if (g.montyAction > 0 && !(g.montyAction & 0x80)) return;
      if (!g.onRope) {
        g.montyAction = 0;
        g.falling = 0;
      }
      g.onRope = 1;
      return;
    }
  }
  g.onRope = 0;
}

function exitTo(g: Game, row: number, col: number) {
  if (g.roomAt(row, col) === 0xff) return false;
  g.mapRow = row;
  g.exitCol = col;
  g.roomExit = 1;
  return true;
}

function toggleGate(g: Game) {
  g.stepGate = (g.stepGate + 1) & 1;
  return g.stepGate;
}

// ---- UpdateMovement ---------------------------------------------------------------------

function updateMovement(g: Game) {
  if (g.gameMode) return;
  if (g.c5.active) return c5DriveMovement(g);
  const input = g.input;
  g.isMoving = false;
  updateRope(g);

  // Nothing underfoot: start falling.
  if (!g.onRope && !g.montyAction && !g.falling && !blockedBelow(g)) {
    g.falling = 1;
    g.arcIdx = 0;
    g.savedLeft = input.left;
    g.savedRight = input.right;
  }

  // Fire starts a jump (not with the jetpack on).
  if (g.inputFire && !g.montyAction && !g.falling && !g.showJetpack) {
    g.montyAction = 1;
    g.sfx(SFX.jump, true);
    g.ticker = 0xff;
    g.arcIdx = 0;
    g.savedLeft = input.left;
    g.savedRight = input.right;
  }

  g.dirUp = g.dirDown = false;
  if (g.onRope && !g.montyAction) {
    g.falling = 0;
    g.dirDown = input.down;
    g.dirUp = input.up;
  }
  g.dirLeft = input.left;
  g.dirRight = input.right;
  g.upSteps = g.downSteps = 1;

  if (g.montyAction) stepJumpArc(g);

  if (g.falling) {
    g.dirLeft = g.dirRight = g.dirUp = false;
    g.dirDown = true;
    g.downSteps = 1;
  }

  // The jetpack ("The Ultimate Experience"): steer freely; hold up to thrust.
  if (g.showJetpack) {
    g.dirLeft = input.left;
    g.dirRight = input.right;
    if (!input.up) {
      g.jetpackActive = 0;
      g.vic.mc2 = 0;
    } else {
      g.jetpackActive = 1;
      animateFlame(g);
      g.vic.mc2 = (g.vic.mc2 + 1) & 15;
      g.sfx(SFX.jetpack, true);
      g.dirUp = true;
      g.upSteps = 1;
      g.downSteps = 0;
      g.ticker = 0;
    }
  }

  if (g.dirUp) {
    while (g.upSteps > 0) {
      g.upSteps--;
      if (blockedAbove(g)) break;
      g.isMoving = true;
      if (g.y >= 0x4c) { g.y--; continue; }
      if (exitTo(g, g.mapRow - 1, g.exitCol)) g.y = 0xda;
      break;
    }
  }

  if (g.dirDown) {
    while (g.downSteps > 0) {
      g.downSteps--;
      if (blockedBelow(g)) {
        g.falling = 0;
        g.montyAction = 0;
        g.arcIdx = 0;
        g.savedLeft = g.savedRight = false;
        break;
      }
      g.isMoving = true;
      if (g.y < 0xda) { g.y++; continue; }
      if (exitTo(g, g.mapRow + 1, g.exitCol)) g.y = 0x4c;
      break;
    }
  }

  if (g.dirLeft && !blockedLeft(g)) {
    g.facing = 0x81;
    let ok = true;
    if (g.x2 < 0x14) {
      ok = exitTo(g, g.mapRow, g.exitCol - 1);
      if (ok) g.x2 = 0x9b;
    }
    if (ok) {
      g.isMoving = true;
      if (toggleGate(g)) g.x2--;
    }
  }

  if (g.dirRight && !blockedRight(g)) {
    g.isMoving = true;
    g.facing = 0x01;
    let ok = true;
    if (g.x2 >= 0x9c) {
      ok = exitTo(g, g.mapRow, g.exitCol + 1);
      if (ok) g.x2 = 0x15;
    }
    if (ok && !toggleGate(g)) g.x2++;
  }
}

/** StepJumpArc: ascent deltas, then descent deltas, from the original table. */
function stepJumpArc(g: Game) {
  g.dirRight = g.savedRight;
  g.dirLeft = g.savedLeft;
  if (!(g.arcIdx & 0x80)) {
    g.arcIdx++;
    const v = jumpArc[g.arcIdx];
    if (v === 0xff) {
      g.arcIdx |= 0x80;
      return;
    }
    g.upSteps = v;
    g.dirUp = true;
    return;
  }
  g.arcIdx++;
  const v = jumpArc[g.arcIdx & 0x7f];
  if (v !== 0xff) {
    g.downSteps = v;
    g.dirDown = true;
    return;
  }
  g.montyAction = 0;
  g.arcIdx = 0;
  g.inputFire = false;
}

/** Jetpack.AnimateFlame: random noise through the flame masks, odd frames. */
function animateFlame(g: Game) {
  if (!g.frameToggle) return;
  let y = g.random();
  for (let x = 17; x >= 0; x--, y = (y + 1) & 0xff) {
    const a = 0x1dea + x, b = 0x1e6a + x;
    g.mem[a] = (y ^ g.mem[a]) & flameMasks[x];
    g.mem[b] = (y ^ g.mem[b]) & flameMasks[18 + x];
  }
}

// ---- UpdateState ---------------------------------------------------------------------------

function updateState(g: Game) {
  if (g.gameMode) return;
  g.animTimer = (g.animTimer - 1) & 0xff;
  if (g.animTimer !== 0) return;

  if (!g.dirLeft && !g.dirRight && !g.montyAction && g.onRope && (g.dirUp || g.dirDown)) {
    g.ticker = (g.ticker + 1) & 0xff;
    g.frameIndex = 0x58 + (g.ticker & 3);
    g.animTimer = 4;
    return;
  }

  g.stateCur = (g.facing & 0x80 ? 2 : 1) | (g.montyAction ? 4 : 0);
  if (g.stateCur !== g.statePrev) g.ticker = 0xff;
  g.statePrev = g.stateCur;
  if (g.montyAction || g.isMoving) g.ticker = (g.ticker + 1) & 0xff;

  switch (g.stateCur) {
    case 1: g.frameIndex = 0x54 + (g.ticker & 3); g.animTimer = 4; break;
    case 2: g.frameIndex = 0x50 + (g.ticker & 3); g.animTimer = 4; break;
    case 5:
    case 6:
      if (g.ticker >= 12) g.ticker = 11;
      g.frameIndex = (g.stateCur === 5 ? 0x68 : 0x5c) + g.ticker;
      g.animTimer = 4;
      break;
    default: g.animTimer = 1;
  }
}
