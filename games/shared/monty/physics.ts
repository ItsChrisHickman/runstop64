import { montyCol, montyRow, type MontyBody, type MontyWorld } from './body';

/**
 * Monty on the Run's Monty moving: a port of the original Monty.Draw's UpdateMovement, StepJumpArc and the Utils.CheckTile*
 * helpers, over a `MontyBody` and a `MontyWorld` (body.ts). Shared by Monty on the Run (montyotr) and the remix; neither has a
 * copy.
 *
 * A frame is *decide* (what he does this frame: start to fall, start a jump, which way, how far) and *apply* (the moves and the
 * blocks). Between them a game may change the decision: the jetpack steers him freely and thrusts (montyotr/src/monty.ts).
 */

/** What a game says of itself to the move. */
export interface MontyRules {
  /** The jump arc's table (the original's: ascent deltas, $FF, descent deltas, $FF). */
  readonly arc: Uint8Array;
  /** Whether fire starts a jump (not with the jetpack on). */
  readonly canJump: boolean;
  /** A jump starts (its sound). */
  onJump(): void;
}

// ---- collision helpers --------------------------------------------------------------

const yAligned = (b: MontyBody) => ((b.y - 0x32) & 7) === 0;
const xAligned = (b: MontyBody) => ((b.x2 - 0x0c) & 3) === 0;

function blockedRight(b: MontyBody, w: MontyWorld) {
  if (!xAligned(b)) return false;
  const rows = yAligned(b) ? 2 : 3;
  const row = montyRow(b), col = montyCol(b) + 2;
  for (let i = 0; i < rows; i++) if (w.flagAt(row + i, col) === 1) return true;
  return false;
}

function blockedLeft(b: MontyBody, w: MontyWorld) {
  if (!xAligned(b)) return false;
  const rows = yAligned(b) ? 2 : 3;
  const row = montyRow(b), col = montyCol(b) - 1;
  for (let i = 0; i < rows; i++) if (w.flagAt(row + i, col) === 1) return true;
  return false;
}

function blockedAbove(b: MontyBody, w: MontyWorld) {
  if (!yAligned(b)) return false;
  const cols = xAligned(b) ? 2 : 3;
  const row = montyRow(b) - 1, col = montyCol(b);
  for (let i = 0; i < cols; i++) if (w.flagAt(row, col + i) === 1) return true;
  return false;
}

/** CheckTileBelow; also starts a hazard death when both feet are on water/lava. */
function blockedBelow(b: MontyBody, w: MontyWorld) {
  if (!yAligned(b)) return false;
  const cols = xAligned(b) ? 2 : 3;
  const row = montyRow(b) + 2, col = montyCol(b);
  let hazards = 2;
  for (let i = 0; i < cols; i++) {
    const f = w.flagAt(row, col + i);
    if (f === 4 && --hazards === 0) {
      b.actionCounter = 5;
      return false;
    }
    if (f === 1) return true;
    if (!(b.montyAction === 0 && b.onRope) && (f === 2 || f === 3)) return true;
  }
  return false;
}

/** UpdateTileFlags: is any of the 2 x 3 cells Monty overlaps a rope? */
function updateRope(b: MontyBody, w: MontyWorld) {
  const row = montyRow(b), col = montyCol(b);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      if (w.flagAt(row + r, col + c) !== 3) continue;
      if (b.montyAction > 0 && !(b.montyAction & 0x80)) return;
      if (!b.onRope) {
        b.montyAction = 0;
        b.falling = 0;
      }
      b.onRope = 1;
      return;
    }
  }
  b.onRope = 0;
}

function exitTo(b: MontyBody, w: MontyWorld, row: number, col: number) {
  if (w.roomAt(row, col) === 0xff) return false;
  b.mapRow = row;
  b.exitCol = col;
  b.roomExit = 1;
  return true;
}

function toggleGate(b: MontyBody) {
  b.stepGate = (b.stepGate + 1) & 1;
  return b.stepGate;
}

// ---- UpdateMovement ---------------------------------------------------------------------

/** What he does this frame: fall, jump, climb, which way and how far. */
export function decideMonty(b: MontyBody, w: MontyWorld, rules: MontyRules) {
  const input = b.input;
  b.isMoving = false;
  updateRope(b, w);

  // Nothing underfoot: start falling.
  if (!b.onRope && !b.montyAction && !b.falling && !blockedBelow(b, w)) {
    b.falling = 1;
    b.arcIdx = 0;
    b.savedLeft = input.left;
    b.savedRight = input.right;
  }

  // Fire starts a jump.
  if (b.inputFire && !b.montyAction && !b.falling && rules.canJump) {
    b.montyAction = 1;
    rules.onJump();
    b.ticker = 0xff;
    b.arcIdx = 0;
    b.savedLeft = input.left;
    b.savedRight = input.right;
  }

  b.dirUp = b.dirDown = false;
  if (b.onRope && !b.montyAction) {
    b.falling = 0;
    b.dirDown = input.down;
    b.dirUp = input.up;
  }
  b.dirLeft = input.left;
  b.dirRight = input.right;
  b.upSteps = b.downSteps = 1;

  if (b.montyAction) stepJumpArc(b, rules.arc);

  if (b.falling) {
    b.dirLeft = b.dirRight = b.dirUp = false;
    b.dirDown = true;
    b.downSteps = 1;
  }
}

/** The moves and the blocks: up, down, left, right, and out of the room by an edge. */
export function applyMonty(b: MontyBody, w: MontyWorld) {
  if (b.dirUp) {
    while (b.upSteps > 0) {
      b.upSteps--;
      if (blockedAbove(b, w)) break;
      b.isMoving = true;
      if (b.y >= 0x4c) { b.y--; continue; }
      if (exitTo(b, w, b.mapRow - 1, b.exitCol)) b.y = 0xda;
      break;
    }
  }

  if (b.dirDown) {
    while (b.downSteps > 0) {
      b.downSteps--;
      if (blockedBelow(b, w)) {
        b.falling = 0;
        b.montyAction = 0;
        b.arcIdx = 0;
        b.savedLeft = b.savedRight = false;
        break;
      }
      b.isMoving = true;
      if (b.y < 0xda) { b.y++; continue; }
      if (exitTo(b, w, b.mapRow + 1, b.exitCol)) b.y = 0x4c;
      break;
    }
  }

  if (b.dirLeft && !blockedLeft(b, w)) {
    b.facing = 0x81;
    let ok = true;
    if (b.x2 < 0x14) {
      ok = exitTo(b, w, b.mapRow, b.exitCol - 1);
      if (ok) b.x2 = 0x9b;
    }
    if (ok) {
      b.isMoving = true;
      if (toggleGate(b)) b.x2--;
    }
  }

  if (b.dirRight && !blockedRight(b, w)) {
    b.isMoving = true;
    b.facing = 0x01;
    let ok = true;
    if (b.x2 >= 0x9c) {
      ok = exitTo(b, w, b.mapRow, b.exitCol + 1);
      if (ok) b.x2 = 0x15;
    }
    if (ok && !toggleGate(b)) b.x2++;
  }
}

/** UpdateMovement: decide, then apply (a game that changes the decision in between calls the two itself). */
export function moveMonty(b: MontyBody, w: MontyWorld, rules: MontyRules) {
  decideMonty(b, w, rules);
  applyMonty(b, w);
}

/** StepJumpArc: ascent deltas, then descent deltas, from the original table. */
function stepJumpArc(b: MontyBody, arc: Uint8Array) {
  b.dirRight = b.savedRight;
  b.dirLeft = b.savedLeft;
  if (!(b.arcIdx & 0x80)) {
    b.arcIdx++;
    const v = arc[b.arcIdx];
    if (v === 0xff) {
      b.arcIdx |= 0x80;
      return;
    }
    b.upSteps = v;
    b.dirUp = true;
    return;
  }
  b.arcIdx++;
  const v = arc[b.arcIdx & 0x7f];
  if (v !== 0xff) {
    b.downSteps = v;
    b.dirDown = true;
    return;
  }
  b.montyAction = 0;
  b.arcIdx = 0;
  b.inputFire = false;
}
