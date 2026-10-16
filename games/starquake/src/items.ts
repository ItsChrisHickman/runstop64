import { rom } from './data';
import type { Game } from './game';
import * as Panel from './panel';
import { cellAt, Screen } from './screen';

/**
 * Items and the other things a room's tiles mark: where items can appear,
 * teleports, doors, barriers, sparking cells, the hover pad's parking place.
 */

/** $48A3: a tile's info marks an object at (x, y) + the info's offsets. */
export function tileObject(g: Game, info: number, x: number, y: number) {
  const type = (info >> 4) | 0x30;
  const col = (x + ((info & 0x0c) >> 2)) & 0xff;
  const row = (y + (info & 3)) & 0xff;
  // The entry is written whatever the type; only teleports, doors and passages keep it.
  g.objects[g.objectCount] = { type, col, row };
  switch (type) {
    case 0x39: // a place items can appear (not in the edge columns)
      if (col !== 1 && col !== 0x25) {
        g.spawnCol[g.spawnCount & 15] = col;
        g.spawnRow[g.spawnCount & 15] = row;
        g.spawnCount = (g.spawnCount + 1) & 0xff;
      }
      break;
    case 0x37: addSpark(g, col, row); break;
    case 0x38: addEnemyPlace(g, col, row); break;
    case 0x3c: g.padRow = row; g.padCol = col; break;
    case 0x3b: g.barrierCell = cellAt(col, row); break;
    case 0x3e: g.barriers.push({ cell: cellAt(col, row), col }); break;
    case 0x30: // a security door
      g.doorRandom = g.rng.next();
      // falls through
    case 0x3d: // a teleport
    case 0x3f: // a lift's top
      g.arriveRow = row;
      g.arriveCol = col;
      g.objectCount++;
      break;
  }
}

/** $164A: a place enemies may appear (up to four), as sprite coordinates. */
function addEnemyPlace(g: Game, col: number, row: number) {
  const i = (3 - g.enemyPlaceCount) & 0xff;
  if (i < 4) {
    g.enemyPlaceCell[i] = cellAt(col - 1, row - 1);
    g.enemyPlaceX[i] = ((col << 2) + 0x0c) & 0xff;
    g.enemyPlaceY[i] = ((row << 3) + 0x32) & 0xff;
  }
  g.enemyPlaceCount++;
}

/** $4BA0: a sparking cell pair: drawn white on black, then sparks on its own timer. */
function addSpark(g: Game, col: number, row: number) {
  const cell = cellAt(col, row);
  g.scr.setColour(cell, 0x70);
  g.scr.setColour(cell + 1, 0x70);
  const i = g.sparkAt;
  let next = i + 9;
  const s = g.sparks[i / 9];
  s.on = next;
  const last = next === 0x2d;
  if (last) next = 0;
  g.sparkAt = next;
  s.cell = cell;
  const bitmapLo = (cell * 8) & 0xff; // $61: low byte of the cell's bitmap address
  s.bitmap = Screen.bitmapAt(cell);
  // ror ×4 of the bitmap address's low byte, carrying in the "last slot" flag
  let a = bitmapLo, c = last ? 1 : 0;
  for (let k = 0; k < 4; k++) { const out = a & 1; a = (a >> 1) | (c << 7); c = out; }
  const period = (a & 7) + 6 + c;
  s.period = period;
  s.onTime = period & 0xfc;
  s.timer = period & 0xfc;
  s.phase = 0;
}

/**
 * $2A6B: a new game's items. The core is missing five of its nine pieces
 * (random ones, at random places in it); they, two keys and the rest are
 * scattered in random rooms (each placed in its room on the first visit).
 */
export function newGame(g: Game) {
  Panel.reset(g);
  g.carried.fill(0x80);
  g.carriedCount = 0;
  for (const it of g.items) Object.assign(it, { col: 0, row: 0, roomLo: 0, roomHi: 0, graphic: 0 });
  g.core.fill(0); g.coreSlots.fill(0);
  g.spawnCol.fill(0); g.spawnRow.fill(0);
  g.lo.fill(0, 0, 0x80);
  const R = g.rng;
  // Items 0 and 1: the access card and the key, in one of four rooms each.
  g.items[0].roomLo = rom(0x2f3d + (R.next() & 3)); g.items[0].graphic = 0x0f;
  g.items[1].roomLo = rom(0x2f41 + (R.next() & 3)); g.items[1].graphic = 0x10;
  // Five different pieces ($08E2) and five different core places ($08FD).
  const pick = new Uint8Array(5); // $08E2-$08E6
  for (let x = 0; x < 5; x++) {
    let a: number;
    do a = rom(0x2f68 + (R.next() & 15)); while (seen(pick, x, a));
    pick[x] = a;
    let s: number;
    do { s = R.next() & 7; if (s >= 4) s++; } while (seen(g.coreSlots, x, s));
    g.coreSlots[x] = s;
  }
  for (let x = 8; x >= 0; x--) { g.core[x] = x; g.items[7 + x].graphic = x; }
  for (let x = 4; x >= 0; x--) {
    const a = rom(0x2f0a + pick[x]);
    g.core[g.coreSlots[x]] = a;
    g.items[2 + x].graphic = a;
  }
  for (let x = 0; x < 4; x++) {
    let a: number;
    do a = rom(0x2f0a + (R.next() & 15)); while (seen16(g, x, a));
    g.items[16 + x].graphic = a;
  }
  for (let x = 2; x < 20; x++) {
    let a: number;
    do a = R.next(); while (seenRoom(g, x, a));
    g.items[x].roomLo = a;
  }
  for (const it of g.items) {
    it.roomHi = it.roomLo >> 7;
    it.roomLo = (it.roomLo << 1) & 0xff;
  }
}

/** Whether `a` is among t[0..x] (the original compares the slot being filled too: it starts at 0). */
function seen(t: Uint8Array, x: number, a: number) {
  for (let y = x; y >= 0; y--) if (t[y] === a) return true;
  return false;
}
function seen16(g: Game, x: number, a: number) {
  for (let y = x; y >= 0; y--) if (g.items[16 + y].graphic === a) return true;
  return false;
}
function seenRoom(g: Game, x: number, a: number) {
  for (let y = x; y >= 0; y--) if (g.items[y].roomLo === a) return true;
  return false;
}

/** $2946: note the room as visited; the first visit scores. */
export function markVisited(g: Game) {
  const bit = rom(0x2ed0 + (g.room & 7));
  const at = g.room >> 3;
  g.visitBit = g.room & 7;
  g.visitByte = at;
  const before = g.lo[at];
  g.lo[at] = before | bit;
  if (!(before & bit)) g.addScore(10);
}

/** $299C: the room's bonus has been given. */
export function markBonus(g: Game) {
  g.lo[0x40 + g.visitByte] |= rom(0x2ed0 + g.visitBit);
}

/** $2A42: a random one of the room's item places (the count is used as a mask, as in the original). */
function randomPlace(g: Game) {
  let y = g.rng.next() & g.spawnCount;
  if (y) y--;
  return { row: g.spawnRow[y & 15], col: g.spawnCol[y & 15] };
}

/** $29AA: put this room's items on screen (placing new ones), and maybe a bonus. */
export function placeForRoom(g: Game) {
  for (const s of g.shown) s.graphic = 0xff;
  g.shownAt = 0;
  const lo = g.room & 0xff, hi = g.room >> 8;
  for (let y = 0x13; y >= 0; y--) {
    const it = g.items[y];
    if (it.roomLo !== lo || it.roomHi !== hi || it.graphic & 0x80) continue;
    if (it.col === 0) {
      const p = randomPlace(g);
      it.row = p.row;
      it.col = p.col;
      show(g, it.graphic, it.col, it.row);
      markBonus(g);
    } else {
      show(g, it.graphic, it.col, it.row);
    }
  }
  if (g.spawnCount === 1) return;
  if (g.lo[0x40 + g.visitByte] & rom(0x2ed0 + g.visitBit)) return;
  const a = g.rng.next();
  let graphic: number;
  if (a & 0x80) {
    if (((a - 0xb2) & 0x80) === 0) return;
    graphic = rom(0x2f1a + (a & 7));
  } else if (((a - 0x11) & 0x80) === 0) {
    graphic = rom(0x2f1a + (a & 7));
  } else {
    g.cheopsOffer = g.rng.next();
    graphic = 0x19;
  }
  const p = randomPlace(g);
  show(g, graphic, p.col, p.row);
}

// ---- touching and picking up ---------------------------------------------------------------

/** "What's here" at an offset from BLOB's reference cell (($91),Y). */
const here = (g: Game, o: number) => g.lo[(g.cell + o) & 0x3ff];

/**
 * $2CF0: BLOB's touch: bonuses he walks into are taken (whichever way he
 * moves, a cell ahead); pushing up (newly) while standing on something picks
 * it up (swapping for the oldest thing carried if his hands are full), or on
 * nothing, puts the oldest down. Returns $19 if he picked up a Cheops pyramid.
 */
export function touch(g: Game): number {
  const a = g.input;
  if (a !== 0) {
    if (!(a & 1) && !g.offRow && (here(g, 1) || here(g, 2))) touched(g, here(g, 1) || here(g, 2));
    if (!(a & 2) && !g.offRow) {
      const y = g.riding ? 0xa1 : 0x79;
      if (here(g, y) || here(g, y + 1)) touched(g, here(g, y) || here(g, y + 1));
    }
    if (!(a & 4) && (g.offCol & 2) === 2) {
      const s = here(g, 0x29) || here(g, 0x51) || (g.riding ? here(g, 0x79) : 0);
      if (s) touched(g, s);
    }
    if (!(a & 8) && (g.offCol & 4) === 4) {
      const s = here(g, 0x2b) || here(g, 0x53) || (g.riding ? here(g, 0x7b) : 0);
      if (s) touched(g, s);
    }
  }
  const under = here(g, 0x51) || here(g, 0x52);
  if (under) touched(g, under);
  const at = g.scr.attr;
  if ((at[(g.cell + 0x29) & 0x3ff] | at[(g.cell + 0x2a) & 0x3ff] | at[(g.cell + 0x51) & 0x3ff] | at[(g.cell + 0x52) & 0x3ff]) & 2) return 0;
  if (g.riding) return 0;
  const k = g.input & 15;
  if (k === g.inputPickup) return 0;
  g.inputPickup = k;
  if (k !== 0x0c) return 0;
  return pickUp(g);
}

/** $2E6F: BLOB touches a shown thing: a bonus is taken (its effect, and it's gone). */
function touched(g: Game, slot: number) {
  const graphic = g.shown[slot].graphic;
  if (rom(0x2f45 + graphic) & 0x80) return;
  take(g, slot);
}

/** $2E7C: a bonus is taken. */
function take(g: Game, slot: number) {
  const graphic = g.shown[slot].graphic;
  Panel.bonus(g, graphic);
  unshow(g, slot);
  markBonus(g);
}

/** $2D41: pick up what BLOB stands on, or put the oldest thing down. */
function pickUp(g: Game): number {
  let picked: number;
  let col = g.col, row = g.row;
  const slot = here(g, 0x29) || here(g, 0x2a) || here(g, 0x51) || here(g, 0x52);
  if (slot) {
    const s = g.shown[slot];
    const graphic = s.graphic;
    const kind = rom(0x2f45 + graphic);
    if (!(kind & 0x80)) { take(g, slot); return graphic === 0x19 ? 0x19 : graphic; }
    col = s.col; row = s.row;
    unshow(g, slot);
    if (graphic === 0x19) return 0x19;
    picked = graphic;
  } else {
    picked = 0x80;
  }
  // $2D73: in at the front of the four, out at the back.
  const c = g.carried;
  const dropped = c[3];
  c[3] = c[2]; c[2] = c[1]; c[1] = c[0]; c[0] = picked;
  if (!(dropped & 0x80)) show(g, dropped, col, row);
  drawCarried(g);
  if (dropped & 0x80) {
    if (!(picked & 0x80)) {
      const i = findItem(g, picked);
      if (i >= 0) g.items[i].graphic = 0xff;
      const y = g.carriedCount;
      if (y !== 4) g.carriedCount++;
      g.coreSlots[y % 5] = i & 0xff;
    }
  } else {
    let i: number;
    if (!(picked & 0x80)) i = findItem(g, picked);
    else {
      g.carriedCount = (g.carriedCount - 1) & 0xff;
      i = g.coreSlots[g.carriedCount % 5];
      const it = g.items[i];
      if (it) { it.row = g.row; it.col = g.col; it.roomLo = g.room & 0xff; it.roomHi = g.room >> 8; }
    }
    if (g.items[i]) g.items[i].graphic = dropped;
  }
  g.sound.effect(picked === 0x0f ? 0x2c : 0x2e, 0);
  return picked;
}

/** $2EB5: the item (0-19) in this room with this graphic, or -1. */
function findItem(g: Game, graphic: number) {
  for (let x = 0x13; x >= 0; x--) {
    const it = g.items[x];
    if (it.roomLo === (g.room & 0xff) && it.roomHi === g.room >> 8 && it.graphic === graphic) return x;
  }
  return -1;
}

/** $2B8E: show a thing in the room (taking a slot, so BLOB can touch it). */
export function show(g: Game, graphic: number, col: number, row: number): number {
  let slot = g.shownAt;
  do {
    slot++;
    if (slot === 0x19) slot = 1;
  } while (!(g.shown[slot].graphic & 0x80));
  g.shownAt = slot;
  g.shown[slot] = { graphic: graphic & 0x7f, col, row };
  setCells(g, cellAt(col, row), slot);
  return drawThing(g, graphic, col, row, true);
}

/** $2BC1: take a shown thing away. */
export function unshow(g: Game, slot: number) {
  const s = g.shown[slot];
  const graphic = s.graphic;
  s.graphic = 0xff;
  setCells(g, cellAt(s.col, s.row), 0);
  drawThing(g, graphic, s.col, s.row, false);
}

/** The 2×2 cells' "what's here" entries ($0400 + cell). */
function setCells(g: Game, cell: number, v: number) {
  for (const o of [0, 1, 40, 41]) g.lo[(cell + o) & 0x3ff] = v;
}

/**
 * $2BE6/$2BF3: draw (or erase) a 2×2-cell graphic from $C52C: each cell gets
 * the graphic's colour, except cells already white, cyan or yellow on black
 * (the parts of the scenery things sit in front of), where it's mixed in (XOR).
 */
export function drawThing(g: Game, graphic: number, col: number, row: number, draw: boolean): number {
  const s = g.scr;
  let src = 0xc52c + (graphic & 0x7f) * 32;
  let colour = 0;
  if (draw) {
    if (graphic & 0x80) colour = 0x20;
    else {
      let a = graphic;
      if (!(rom(0x2f45 + graphic) & 0x80)) a = g.rng.next();
      colour = rom(0x2f34 + (a & 7));
    }
  }
  let cell = cellAt(col, row);
  let carry = 0;
  for (let half = 0; half < 2; half++) {
    const bm = Screen.bitmapAt(cell);
    const special = (c: number) => { const v = s.colour(c & 0x3ff); return v === 0x10 || v === 0x30 || v === 0x70; };
    // (the carry the original's last CMP leaves: the second cell's colour before, as #$10, #$30, #$70 test it)
    const v1 = s.colour((cell + 1) & 0x3ff);
    carry = v1 === 0x10 || v1 === 0x30 || v1 >= 0x70 ? 1 : 0;
    let xor = false;
    if (special(cell)) {
      xor = true;
      if (!special(cell + 1)) s.setColour(cell + 1, colour);
    } else {
      s.setColour(cell, colour);
      if (special(cell + 1)) xor = true;
      else s.setColour(cell + 1, colour);
    }
    for (let i = 0; i < 16; i++) {
      const at = (bm + i) & 0x3fff;
      if (xor) s.bank[at] ^= rom(src + i);
      else s.bank[at] = draw ? rom(src + i) : 0;
    }
    src += 16;
    cell += 40;
  }
  return carry;
}

/** $2B5A: the four things BLOB carries, in the panel. */
export function drawCarried(g: Game) {
  const s = g.scr;
  for (let i = 0; i < 8; i++) {
    s.setColour(0x45 + i, 0);
    s.setColour(0x6d + i, 0);
  }
  g.carried.forEach((c, i) => {
    if (!(c & 0x80)) drawThing(g, c, 0x1d + i * 2, 1, true);
  });
}
