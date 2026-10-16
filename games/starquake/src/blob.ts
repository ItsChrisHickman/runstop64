import { rom } from './data';
import type { Game } from './game';
import { cellAt, Screen } from './screen';

/**
 * BLOB: arriving in a room, walking, falling, lifts, the hover pad, and
 * building platforms (the original's $4300 module). He's three sprites at one
 * place: his body (sprite 0, the walking frames), a yellow layer rebuilt each
 * step (sprite 1) and his eyes (sprite 2).
 */

const SFX = { step: 0x0a, fall: 0x0c, land: 0x0a, lift: 0x0e, platform: 0x30 } as const;

/** $43F6: sprite position of a cell: X = (column + 3) × 8 (carry = bit 8), Y = row × 8 + $32. */
export function spritePos(col: number, row: number) {
  const x = ((col + 3) & 0xff) * 8;
  return { x: x & 0xff, msb: x > 0xff, y: ((row * 8) & 0xff) + 0x32 & 0xff };
}

/** $4385: put BLOB in the room, by the way he came in (a teleport or door puts him at its spot). */
export function place(g: Game, code: number, col: number, row: number) {
  if (code === 0x3d || code === 0x3f) { col = g.arriveCol; row = g.arriveRow; }
  else if (code === 0x30) row = g.arriveRow;
  const sp = g.sprites;
  sp.ptr[1] = 0x55;
  sp.colour[0] = 8; sp.colour[2] = 1; sp.colour[1] = 7;
  g.row = row; g.col = col;
  const p = spritePos(col, row);
  sp.y[0] = p.y; sp.x[0] = p.x;
  sp.msb = p.msb ? sp.msb | 7 : sp.msb & 0xf8;
  g.cell = cellAt(col - 1, row - 1);
  sp.enable = (sp.enable | 7) & 0xef;
  g.inLift = 0; g.stepTimer = 0; g.sub = 0; g.falling = 0; g.arrived = 0;
  g.fallHeight = 0x72;
  buildSprite(g);
}

/** $4332: the hover pad (sprite 4): under BLOB if he's riding it, else parked at its place, if the room has one. */
export function placePad(g: Game) {
  const sp = g.sprites;
  g.padShown = g.riding;
  if (g.riding & 0x80) {
    sp.y[4] = (sp.y[0] + 0x10) & 0xff;
    sp.x[4] = sp.x[0];
    g.padX = sp.x[0];
    sp.msb = sp.msb & 1 ? sp.msb | 0x10 : sp.msb & 0xef;
  } else {
    g.padShown = g.padRow;
    if (!g.padRow) { sp.enable &= 0xef; return; }
    const p = spritePos(g.padCol, g.padRow + 2);
    sp.y[4] = p.y; sp.x[4] = p.x;
    sp.msb = p.msb ? sp.msb | 0x10 : sp.msb & 0xef;
  }
  sp.ptr[4] = 0x4b;
  sp.colour[4] = 1;
  sp.enable |= 0x10;
}

/** The attribute byte of a cell offset from BLOB's reference cell ($7A),Y. */
const at = (g: Game, y: number) => g.scr.attr[(g.cell + y) & 0x3ff];

/** $47F4: what's in the row at offset y (2 cells, 3 when between columns). Returns its bits. */
function rowBits(g: Game, y: number) {
  let a = at(g, y) | at(g, y + 1);
  if (g.sprites.x[0] & 6) a |= at(g, y + 2);
  return a & 15;
}

/** $480A: what's in the column at offset y (2 rows; 3 between rows or riding; 4 both). */
function columnBits(g: Game, y: number) {
  g.sub &= 3;
  const x = g.sub | g.riding;
  let a = at(g, y) | at(g, y + 40);
  if (x) {
    a |= at(g, y + 80);
    if (x !== g.riding && x !== g.sub) a |= at(g, y + 120);
  }
  return a & 15;
}

/** $4878: standing exactly on the hover pad's parking place. */
function atPad(g: Game) {
  return (g.sub & 3) === 0 && (g.sprites.x[0] & 6) === 0 && g.padRow === g.row && g.padCol === g.col;
}

/** $488F: a footstep (on foot, not falling). */
function stepSound(g: Game) {
  if (!g.riding && !g.falling) g.sound.effect(SFX.step, 0);
}

/**
 * $4407: BLOB's frame. `joy` is the controls (joystick bits, low = pressed).
 * Returns what happened: an exit code (0x10 down, 0x20 up, 0x40 left, 0x80
 * right, or a teleport/door/barrier/lift code) and the column and row to
 * arrive at, or else his bump bits.
 */
export function tick(g: Game, joy: number): { code: number; col: number; row: number } {
  const sp = g.sprites;
  if ((g.rng.next() & 0xfc) === 0) {
    const y = g.rng.next() & 3;
    const x = g.rng.next() & 3;
    g.sound.effectIfFree(rom(0x49e8 + x), rom(0x49ec + y));
  }
  g.bump = 0;
  g.beside = 0;
  if (g.arrived === 0 || g.arrived === 4) {
    // His sparkle as he arrives: a few pixels set, then taken away again.
    let p = 0x1000;
    for (let x = 0; x < 12; x++) {
      p += rom(0x49b8 + x);
      const b = rom(0x49c4 + x);
      if (g.arrived === 0) g.scr.bank[p & 0x3fff] |= b;
      else g.scr.bank[p & 0x3fff] ^= b;
    }
  }
  g.arrived = (g.arrived + 1) & 0xff;
  g.offRow = g.sub & 3;
  g.offCol = sp.x[0] & 6;
  if (g.riding && atPad(g)) g.riding = 0;
  g.input = joy & 0xff;
  if (g.riding) {
    sp.x[4] = sp.x[0];
    sp.msb = sp.msb & 1 ? sp.msb | 0x17 : sp.msb & 0xe8;
  }

  let x = sp.ptr[0] & 15;
  if (!(g.input & 8)) { // right
    g.stepTimer++;
    if (g.stepTimer === 3) {
      g.stepTimer = 0;
      stepSound(g);
      const f = rom(0x497d + x);
      if (f & 0x80) sp.ptr[0]++;
      else if (f === 0) { if (!g.riding) sp.ptr[0] = rom(0x498c + ((x + 1) & 3)); }
      else sp.ptr[0] = 0x44;
    }
    buildSprite(g);
    moveRight(g);
  } else if (!(g.input & 4)) { // left
    g.stepTimer++;
    if (g.stepTimer === 3) {
      g.stepTimer = 0;
      stepSound(g);
      const f = rom(0x497d + x);
      if (f & 0x80) sp.ptr[0]--;
      else if (f === 0) sp.ptr[0] = 0x46;
      else if (!g.riding) { x &= 3; sp.ptr[0] = rom(0x4988 + x); }
    }
    buildSprite(g);
    moveLeft(g);
  }

  // $4536: up and down.
  vertical: if (!(g.bump & 0xf0)) {
    g.bump = 0;
    let steps: number;
    if (g.riding) {
      const y = g.input;
      if (!(y & 1)) { moveUp(g); landed(g); break vertical; }
      if (!(y & 2)) { steps = 1; } else { landed(g); break vertical; }
    } else if (atPad(g)) {
      // $4573: onto the hover pad.
      g.riding = 0x80;
      g.padX = sp.x[0];
      const y = g.input;
      if (!(y & 1)) { moveUp(g); landed(g); break vertical; }
      if (!(y & 2)) { steps = 1; } else { landed(g); break vertical; }
    } else if (at(g, 0x51) & 2) {
      // $45B4: in a lift tube: carried up.
      if (!g.inLift) { g.inLift = 1; g.sound.effect(SFX.lift, 1); }
      moveUp(g);
      landed(g);
      break vertical;
    } else {
      g.inLift = 0;
      platformKey(g);
      if (g.bump & 0xf0) break vertical;
      if (g.falling === 1) g.sound.effect(SFX.fall, 1);
      if (g.falling !== 8) g.falling++;
      steps = rom(0x49af + g.falling);
    }
    // $4590: fall (or ride down) `steps` quarter rows.
    g.input &= 0xfd;
    for (;;) {
      if (--steps < 0) break vertical;
      fallStep(g);
      if ((g.bump & 9) === 9) { landedNoReset(g); break vertical; }
      g.fallHeight = (g.fallHeight + 1) & 0xff;
      if (g.bump & 8) { landed(g); break vertical; }
      if (atPad(g)) { landed(g); break vertical; }
    }
  }

  // $45D9: what came of it.
  if (g.bump & 0xf0) return g.exitResult;
  if ((g.beside & 8) && !(g.offRow | g.offCol)) {
    for (let i = 0; i < g.objectCount; i++) {
      const o = g.objects[i];
      if (o.col !== g.col || o.row !== g.row) continue;
      if (o.type === 0x3d || o.type === 0x30 || o.type === 0x3f) return { code: o.type, col: g.col, row: g.input & 8 };
      break;
    }
    if (g.beside & 1) return { code: 0x3b, col: g.col, row: g.row };
  }
  if (!g.riding && (g.fallHeight & 0x80) && (g.bump & 1)) {
    g.fallHeight = 0x72;
    return { code: 0x3e, col: g.col, row: g.row };
  }
  return { code: g.bump, col: g.col, row: g.row };
}

/** $45C4: landed (the fall height starts again), then $45C8. */
function landed(g: Game) {
  g.fallHeight = 0x72;
  landedNoReset(g);
}

/** $45C8: a thud if he fell far enough; not falling any more. */
function landedNoReset(g: Game) {
  if (((g.falling - 2) & 0x80) === 0) g.sound.effect(SFX.land, 1);
  g.falling = 0;
}

/** $4643: one quarter row down (onto the next row when crossing; stops on solid ground; out of the bottom). */
function fallStep(g: Game) {
  const sp = g.sprites;
  if ((g.sub & 3) === 0) {
    const a = rowBits(g, g.riding ? 0xa1 : 0x79);
    g.bump = a;
    if (a & 8) return;
    if (g.row === 0x15) { exitTo(g, 0x10, g.col, 6); return; }
  } else if ((g.sub & 3) === 3) {
    g.row = (g.row + 1) & 0xff;
    g.cell = (g.cell + 40) & 0xffff;
  }
  g.sub = (g.sub + 1) & 0xff;
  sp.y[0] = (sp.y[0] + 2) & 0xff;
  if (g.riding) sp.y[4] = (sp.y[4] + 2) & 0xff;
}

/** $468E: one quarter row up (blocked by solid; out of the top). */
function moveUp(g: Game) {
  const sp = g.sprites;
  if ((g.sub & 3) === 0) {
    const a = rowBits(g, 1);
    if (g.row === 6) { exitTo(g, 0x20, g.col, 0x15); return; }
    g.bump = a;
    if (a & 8) return;
    g.row = (g.row - 1) & 0xff;
    g.cell = (g.cell - 40) & 0xffff;
  }
  g.sub = (g.sub - 1) & 0xff;
  sp.y[0] = (sp.y[0] - 2) & 0xff;
  if (g.riding) sp.y[4] = (sp.y[4] - 2) & 0xff;
}

/** Leaving the room: the exit code goes in the bump bits; the arrival place is returned. */
function exitTo(g: Game, code: number, col: number, row: number) {
  g.bump = code;
  g.exitResult = { code, col, row };
}

/**
 * $46CD: pushing down (alone, newly) builds a platform under BLOB: if he's
 * standing, he hops up a row and it goes where he stood.
 */
function platformKey(g: Game) {
  if (g.sub & 3) return;
  const a = g.input & 15;
  if (a === g.inputPlatform) return;
  g.inputPlatform = a;
  if (a !== 0x0d) return;
  g.fallHeight = 0x72;
  if (rowBits(g, 0x79) & 8) {
    const above = rowBits(g, 1);
    if (g.row === 6) { exitTo(g, 0x20, g.col, 0x15); return; }
    g.bump = above;
    if (above & 8) return;
    g.row = (g.row - 1) & 0xff;
    g.cell = (g.cell - 40) & 0xffff;
    g.sprites.y[0] = (g.sprites.y[0] - 8) & 0xff;
  }
  buildPlatform(g, g.col, g.row);
}

/** $4727: two pixels left (checking the column beside him when on a cell boundary; out of the left). */
function moveLeft(g: Game) {
  const sp = g.sprites;
  if (!(sp.x[0] & 6)) {
    const a = columnBits(g, 0x28);
    if (g.col === 3) { exitTo(g, 0x40, 0x23, g.row); return; }
    g.beside = a;
    g.bump = a & 0xfe;
    if (a & 8) return;
    g.col = (g.col - 1) & 0xff;
    g.cell = (g.cell - 1) & 0xffff;
  }
  if (g.riding) {
    rotatePad(g, true);
    const y = sp.x[0];
    sp.x[4] = g.padX;
    g.padX = (y - 2) & 0xff;
    if (g.padX === 0xfc) sp.msb &= 0xef;
  }
  const was = sp.x[0];
  sp.x[0] = (sp.x[0] - 2) & 0xff;
  if (was === 0) sp.msb &= 0xf8;
}

/** $478F: two pixels right (likewise). */
function moveRight(g: Game) {
  const sp = g.sprites;
  const sub = sp.x[0] & 6;
  if (sub === 0) {
    const a = columnBits(g, 0x2b);
    if (g.col === 0x23) { exitTo(g, 0x80, 3, g.row); return; }
    g.beside = a;
    g.bump = a;
    if (a & 8) return;
  } else if (sub === 6) {
    g.col = (g.col + 1) & 0xff;
    g.cell = (g.cell + 1) & 0xffff;
  }
  if (g.riding) {
    rotatePad(g, false);
    const y = sp.x[0];
    sp.x[4] = g.padX;
    g.padX = (y + 2) & 0xff;
    if (g.padX === 2) sp.msb |= 0x10;
  }
  sp.x[0] = (sp.x[0] + 2) & 0xff;
  if (sp.x[0] === 0) sp.msb |= 7;
}

/** The hover pad's flame ($52C0/$52C1 in its sprite) turns as it moves: a 16-bit rotate. */
function rotatePad(g: Game, left: boolean) {
  const b = g.scr.bank;
  const lo = 0x12c0, hi = 0x12c1;
  if (left) {
    const a = b[lo] << 1;
    const h = (b[hi] << 1) | (a >> 8);
    b[hi] = h & 0xff;
    b[lo] = (a & 0xff) + (h >> 8);
  } else {
    const l = b[lo], h = b[hi];
    b[lo] = (l >> 1) | ((h & 1) << 7);
    b[hi] = (h >> 1) | ((l & 1) << 7);
  }
}

/** $483D: is BLOB touching anything deadly (attribute bit 2)? */
export function deadlyCheck(g: Game) {
  g.sub &= 3;
  const x = g.sub;
  let a = 0;
  if (g.sprites.x[0] & 6) {
    a = at(g, 0x2b) | at(g, 0x53);
    if (x) a |= at(g, 0x7b);
  }
  a |= at(g, 0x29) | at(g, 0x2a) | at(g, 0x51) | at(g, 0x52);
  if (x) a |= at(g, 0x79) | at(g, 0x7a);
  g.dead = g.graceActive() ? 0 : a & 4;
}

/**
 * $4928: rebuild BLOB's yellow layer (sprite 1, at $5540) for his frame, and
 * point his eyes (sprite 2) at theirs.
 */
export function buildSprite(g: Game) {
  const sp = g.sprites;
  const b = g.scr.bank;
  let y = rom(0x4972 + (sp.ptr[0] & 15));
  sp.ptr[2] = (0xfa + rom(0xcb1c + y)) & 0xff;
  for (let x = 0; x !== 0x0f; x += 3) {
    y++; b[0x1540 + x] = rom(0xcb1c + y);
    y++; b[0x1540 + x + 1] = rom(0xcb1c + y);
  }
  y = rom(0x4972 + (sp.ptr[0] & 15));
  for (let x = 0x21; x !== 0x30; x += 3) {
    b[0x1540 + x] = rom(0xcb27 + y); y++;
    b[0x1540 + x + 1] = rom(0xcb27 + y); y++;
  }
}

// ---- platforms ------------------------------------------------------------------------------

/** $4AD9: a platform under BLOB (at his row + 2), if he has any left: solid, crumbling in a while. */
export function buildPlatform(g: Game, col: number, row: number) {
  if (g.platformsLeft === 0) return;
  g.platformsLeft = (g.platformsLeft - 2) & 0xff;
  g.panelDirty |= 2;
  const cell = cellAt(col, row + 2);
  const p = g.platforms[g.platformAdd];
  g.platformAdd = (g.platformAdd + 1) % 14;
  const s = g.scr;
  p.cell = cell;
  p.saved = [s.colour(cell), s.colour(cell + 1)];
  s.setColour(cell, 0x10);
  s.setColour(cell + 1, 0x10);
  s.attr[cell & 0x3ff] |= 8;
  s.attr[(cell + 1) & 0x3ff] |= 8;
  p.state = (g.rng.next() & 3) + 4;
  xorGraphic(g, Screen.bitmapAt(cell), 0x4f33);
  g.sound.effect(SFX.platform, 2);
}

/** XOR a 2-cell (16-byte) graphic into the bitmap. */
export function xorGraphic(g: Game, bitmap: number, from: number) {
  for (let i = 0; i < 16; i++) g.scr.bank[(bitmap + i) & 0x3fff] ^= rom(from + i);
}

/**
 * $4D64: one platform (in turn, one a frame) crumbles a step: four frames of
 * dust, then it's gone and the cells are as they were. (State 8 is a barrier
 * broken by falling on it: it shows the hole first.)
 */
export function crumble(g: Game) {
  const p = g.platforms[g.platformTick];
  g.platformTick = (g.platformTick + 1) % 14;
  if (p.state & 0x80) return;
  const s = g.scr;
  const bm = Screen.bitmapAt(p.cell);
  const old = p.state;
  p.state = (p.state - 1) & 0xff;
  if (p.state & 0x80) {
    s.setColour(p.cell, p.saved[0]);
    s.setColour(p.cell + 1, p.saved[1]);
    s.attr[p.cell & 0x3ff] &= 0xf6;
    s.attr[(p.cell + 1) & 0x3ff] &= 0xf6;
    return;
  }
  switch (old) {
    case 1: xorGraphic(g, bm, 0x4ef3); break;
    case 2:
      if (p.saved[0]) s.setColour(p.cell, p.saved[0]);
      if (p.saved[1]) s.setColour(p.cell + 1, p.saved[1]);
      xorGraphic(g, bm, 0x4f03);
      break;
    case 3: xorGraphic(g, bm, 0x4f13); break;
    case 4: xorGraphic(g, bm, 0x4f23); break;
    case 8:
      p.state = 2;
      for (let i = 0; i < 16; i++) s.bank[(bm + i) & 0x3fff] = rom(0x4f43 + i);
      break;
  }
}
