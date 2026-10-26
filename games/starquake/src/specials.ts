import { rom } from './data';
import * as Enemies from './enemies';
import * as Frame from './frame';
import type { Game } from './game';
import * as Items from './items';
import * as Panel from './panel';
import { clearPlayArea, drawTileGraphics } from './room';
import { cellAt, Screen } from './screen';
import * as Screens from './screens';

/**
 * The places that do something (the original's $3400 module and friends):
 * teleports (type a destination's name), security doors and Cheops pyramids
 * (an access check against what BLOB carries), barriers (a key opens the
 * upright ones; falling on a flat one breaks it), and the core.
 */
type Frames = Generator<void, void, void>;

/** $2F95/$30BC: a frame of a screen that isn't play: the panel goes on, nothing else. */
export function* wait(g: Game): Frames {
  g.frames = (g.frames + 1) & 0xff;
  yield;
  Panel.frame(g);
}

/** $3869/$386D: n+1 frames. */
function* waitN(g: Game, n: number): Frames {
  for (let i = n; i >= 0; i--) yield* wait(g);
}

/** $3975: one of the game's message lines ($3E76 points into the lines at $3E8C). */
function message(g: Game, x: number) {
  const at = 0x3e8c + rom(0x3e76 + x);
  let text = '';
  for (let p = at + 3; rom(p); p++) text += String.fromCharCode(rom(p));
  Screens.printText(g, rom(at), rom(at + 1), rom(at + 2), text);
}

/** $35E7: which of his four places BLOB carries this in (-1: he doesn't). */
function carrying(g: Game, graphic: number) {
  for (let x = 3; x >= 0; x--) if (g.carried[x] === graphic) return x;
  return -1;
}

// ---- barriers --------------------------------------------------------------------------------

/**
 * $4A39: BLOB fell on a flat barrier: it breaks (two platforms' worth of
 * cells, crumbling away, the hole first). With two in the room, the half of
 * the screen he's in says which.
 */
export function breakBarrier(g: Game) {
  g.sound.effect(0x08, 2);
  let b = g.barriers[0];
  if (g.barriers.length !== 1 && !((g.col - 0x15) & 0x80)) b = g.barriers[1];
  b ??= { cell: 0, col: 0 };
  for (const cell of [b.cell, b.cell + 2]) {
    const p = g.platforms[g.platformAdd];
    g.platformAdd = (g.platformAdd + 1) % 14;
    p.cell = cell;
    p.saved = [0x10, 0x10];
    p.state = 8;
  }
}

/** $3B with the key ($10): the upright barrier goes (in every room of this map column, for good). */
export function openKeyBarrier(g: Game): boolean {
  if (carrying(g, 0x10) < 0) return false;
  g.sound.effect(0x30, 0);
  g.barrierGone[g.room & 15] = 1;
  // $4BFE: its three cells: not solid any more, and blank
  const s = g.scr, c = g.barrierCell;
  const v = s.attr[c & 0x3ff] & 0xf6;
  for (const o of [0, 0x28, 0x50]) s.attr[(c + o) & 0x3ff] = v;
  let bm = Screen.bitmapAt(c);
  for (let x = 3; x > 0; x--) {
    for (let y = 0; y < 8; y++) s.bank[(bm + y) & 0x3fff] = 0;
    bm += 0x140;
  }
  return true;
}

// ---- the screens with symbols: security doors, Cheops pyramids ------------------------------

/** $41-$4B: the marks: symbols shown (graphic, column, row); mark 3 is a place in the panel. */
interface Marks { graphic: number[]; col: number[]; row: number[] }
const marks = (): Marks => ({ graphic: [0, 0, 0, 0], col: [0, 0, 0, 0], row: [0, 0, 0, 0] });

/**
 * $3879: n symbols from a random byte (two bits each: graphics $0A-$0D), at
 * row y from column x, 6 apart, the last first. `carry` is what the
 * original's first ROR takes in (left by the drawing just before).
 */
function symbols(g: Game, m: Marks, random: number, n: number, x: number, y: number, carry: number) {
  let a = random, c = carry;
  for (let b = n; b > 0; b--) {
    for (let k = 0; k < 2; k++) { const out = a & 1; a = (a >> 1) | (c << 7); c = out; }
    const graphic = (a & 3) + 0x0a;
    m.graphic[b - 1] = graphic;
    m.col[b - 1] = x;
    m.row[b - 1] = y;
    Items.show(g, graphic, x, y);
    x = (x + 6) & 0xff;
    c = 0; // (CLC / ADC #6)
  }
}

/** $3853: light (or unlight) a 2×2 thing on the screen: its colours flipped. */
function light(g: Game, col: number, row: number) {
  const cell = cellAt(col, row);
  const v = g.scr.colour(cell) ^ 0xb0;
  for (const o of [0, 1, 40, 41]) g.scr.setColour(cell + o, v);
}

/** $3841 (no sound), $3838 (sound $24), $383E (sound 2): light mark y. */
function lightMark(g: Game, m: Marks, y: number, sound?: number) {
  if (sound !== undefined) g.sound.effect(sound, 1);
  light(g, m.col[y], m.row[y]);
}

/** $37E8: the symbols flash at random while the machine thinks. */
function* shuffle(g: Game, m: Marks): Frames {
  for (let n = 9; n >= 0; n--) {
    const y = rom(0x3f8b + (g.rng.next() & 3));
    lightMark(g, m, y, 2);
    yield* waitN(g, 2);
    lightMark(g, m, y, 2);
    yield* waitN(g, 2);
  }
}

/** $380E: mark y and BLOB's carrying place x flash together (they've been matched). */
function* matched(g: Game, m: Marks, x: number, y: number): Frames {
  m.row[3] = 1;
  m.col[3] = rom(0x3f8f + (x & 0xff));
  for (let n = 6; n >= 0; n--) {
    lightMark(g, m, 3);
    lightMark(g, m, y, 0x24);
    yield* waitN(g, 5);
    lightMark(g, m, y);
    lightMark(g, m, 3, 0x24);
    yield* waitN(g, 5);
  }
}

/**
 * $3798: the access check: each symbol (the last first) must be matched by
 * something BLOB carries; one (not the first) may be matched by the $0E, any
 * by the access card ($0F). Returns whether access is granted.
 */
function* access(g: Game, m: Marks, last: number): Generator<void, boolean, void> {
  let wildcard = 0;
  for (let y = last; y >= 0; y--) {
    yield* shuffle(g, m);
    let x = carrying(g, m.graphic[y]);
    if (x < 0) {
      let matchedByWildcard = false;
      if (!wildcard) {
        x = carrying(g, 0x0e);
        if (x >= 0) { wildcard = y; matchedByWildcard = y !== 0; }
      }
      if (!matchedByWildcard) {
        x = carrying(g, 0x0f);
        if (x < 0) {
          yield* verdict(g, 0x12, 0x26);
          return false;
        }
      }
    }
    yield* matched(g, m, x, y);
  }
  yield* verdict(g, 0x11, 0x24);
  return true;
}

/** $37DD/$38AA: the verdict (a message), then the bottom line flashing with its sound. */
function* verdict(g: Game, msg: number, sound: number): Frames {
  message(g, msg);
  for (let n = 0x14; n >= 0; n--) {
    for (let i = 6; i > 0; i--) yield* wait(g);
    g.sound.effect(sound, 1);
    for (let y = 0x27; y >= 0; y--) g.scr.setColour(0x348 + y, g.scr.colour(0x348 + y) ^ 0xf0);
  }
}

/** $373E: a security door. Returns whether BLOB may pass. */
export function* door(g: Game): Generator<void, boolean, void> {
  clearPlayArea(g);
  Screens.printBlock(g, 0x3c50);
  drawTileGraphics(g, 0x25, 0x10, 0x0a);
  const carry = drawTileGraphics(g, 0x26, 0x14, 0x0a);
  const m = marks();
  symbols(g, m, g.doorRandom, 3, 0x0d, 0x12, carry);
  if (!(yield* access(g, m, 2))) return false;
  g.sound.effect(0x34, 2);
  g.sound.effect(0x34, 0);
  for (let i = 0; i < 6; i++) yield* waitN(g, 5);
  return true;
}

/** $36B4: a Cheops screen's words and the pyramid. Returns the carry the drawing leaves. */
function pyramid(g: Game, block: number) {
  Screens.printBlock(g, block);
  message(g, 0x13);
  return Items.show(g, 0x19, 0x1c, 7);
}

/**
 * $35F8: a Cheops pyramid: two symbols to match; then a trade: the first
 * thing BLOB carries for one of five (keys 1-5; 5 keeps it).
 */
export function* cheops(g: Game): Frames {
  clearPlayArea(g);
  const carry = pyramid(g, 0x3bed);
  const m = marks();
  symbols(g, m, g.cheopsOffer, 2, 0x10, 0x10, carry);
  m.col[2] = m.col[0]; m.row[2] = m.row[0];
  if (!(yield* access(g, m, 1))) return;
  Items.markBonus(g);
  clearPlayArea(g);
  pyramid(g, 0x3c02);
  let slot = 0;
  while (slot < 0x80 && g.carried[slot & 3] & 0x80) slot++;
  const item = g.carried[slot & 3];
  Items.show(g, item, 0x0f, 9);
  const choice: number[] = [];
  let x = 2;
  for (let b = 4; b >= 0; b--) {
    x += 6;
    let a = item;
    if (b) {
      a = g.rng.next() & 7;
      if (a === 4) a = 6; // (CMP #4 / BNE / ADC #1, with the carry set)
    }
    Items.show(g, a, x, 0x0d);
    choice[b] = a;
  }
  // keys 1-5 (the C64's), held when a frame starts
  g.asking = 'trade';
  for (;;) {
    yield* wait(g);
    const k = [0x10, 0x0b, 0x08, 0x3b, 0x38].indexOf(g.key);
    if (k < 0) continue;
    g.asking = null;
    g.carried[slot & 3] = choice[k];
    const mm = marks();
    mm.row[0] = 0x0d;
    mm.col[0] = rom(0x3f94 + k);
    yield* matched(g, mm, slot & 0xff, 0);
    return;
  }
}

// ---- teleports ---------------------------------------------------------------------------------

/**
 * $36C6: a teleport: its name, and a destination's to type (five letters,
 * Del to rub out, Return). Returns the destination teleport (this one if the
 * name isn't known).
 */
export function* teleport(g: Game, here: number): Generator<void, number, void> {
  clearPlayArea(g);
  Screens.printBlock(g, 0x3b8d);
  drawTileGraphics(g, 0x24, 0x1b, 9);
  message(g, here);
  const typed = yield* typeCode(g, rom(0x3be0), rom(0x3be1));
  let found = -1;
  for (let t = 0; t < 15 && found < 0; t++) {
    let wrong = 0;
    for (let i = 0; i < 5; i++) if (typed[i] !== rom(0x3e8f + t * 9 + i)) wrong++;
    if (!wrong) found = t;
  }
  if (found < 0) { yield* verdict(g, 0x0f, 0x26); return here; }
  g.sound.effect(0x32, 2);
  yield* verdict(g, 0x10, 0x24);
  return found;
}


/**
 * $38D0: five letters typed at (x, y), the cursor blinking; Del rubs out,
 * Return finishes. `flash` (the heroes' screen, $3A0B): a second frame each
 * time round, and the corner tile flashing.
 */
export function* typeCode(g: Game, x: number, y: number, flash = false): Generator<void, number[], void> {
  const typed = [0x20, 0x20, 0x20, 0x20, 0x20];
  let n = 0, last = 0, blink = 0;
  g.asking = 'code';
  for (;;) {
    yield* wait(g);
    if (flash) {
      g.frames = (g.frames + 1) & 0xff;
      yield;
      drawTileGraphics(g, g.frames & 0xf8 ? 0x62 : 0x5f, 0x26, 0);
    }
    const cell = cellAt(x, y);
    g.codeAt = n < 5 ? { col: x, row: y } : null;
    if (++blink === 0x19) { blink = 0; g.scr.setColour(cell, g.scr.colour(cell) ^ 0x0f); }
    const k = g.key;
    if (k === last) continue;
    last = k;
    if (k === 0x40) continue;
    g.sound.effect(0x2e, 1);
    g.scr.setColour(cell, 0x30);
    if (k === 1) break; // Return
    if (k === 0) { // Del
      if (!n) continue;
      n--; x -= 2;
      typed[n] = 0x20;
      Screens.printText(g, 0x30, x, y, '-');
      continue;
    }
    if (k >= 0x40) continue;
    const ch = rom(0xc98c + k);
    typed[n] = ch;
    Screens.printText(g, 0x30, x, y, String.fromCharCode(ch));
    x += 2; n++;
    if (n === 5) break;
  }
  g.asking = null;
  g.codeAt = null;
  yield* waitN(g, 5);
  return typed;
}

/** The teleport (0-14) in this room, by the table of their rooms ($112A/$1139). */
export function teleportHere(g: Game) {
  for (let x = 0; x < 15; x++) if (rom(0x112a + x) === (g.room & 0xff) && rom(0x1139 + x) === g.room >> 8) return x;
  return 0x0f;
}

export const teleportRoom = (t: number) => rom(0x112a + t) | (rom(0x1139 + t) << 8);

// ---- the core -----------------------------------------------------------------------------------

/**
 * $0C80: the core room: the pieces BLOB carries go back in (50 points each),
 * the room flashing; its guardians come round; after a while he's put out to
 * the room on the left. Returns true if the core is complete.
 */
export function* core(g: Game): Generator<void, boolean, void> {
  coreDraw(g, 0, 0);
  // $282A: the pieces go in
  g.ambient = 0;
  let placed = 0;
  for (let x = 8; x >= 0; x--) {
    ambientSounds(g);
    coreFlash(g);
    const piece = g.core[x];
    if (piece & 0x80) continue;
    const slot = carrying(g, piece);
    if (slot < 0) continue;
    g.addScore(0x32);
    g.carried[slot] = piece | 0x80;
    g.core[x] = piece | 0x80;
    const m = marks();
    m.col[0] = rom(0x2f22 + x);
    m.row[0] = rom(0x2f2b + x);
    yield* matched(g, m, slot, 0);
    placed++;
    if ((g.core[x] & 0x7f) >= 0x0a) g.core[x] = x | 0x80;
    Items.drawCarried(g);
    Items.drawThing(g, g.core[x], rom(0x2f22 + x), rom(0x2f2b + x), true);
  }
  if (placed) {
    for (let n = 0xf2; n > 0; n--) {
      yield* wait(g);
      const s = g.scr;
      for (let y = 0xf0; y > 0; y--) {
        const v = s.colour(0xf0) ^ 0xf0;
        s.setColour(0xef + y, v);
        s.setColour(0x2cf + y, v);
        s.setColour(0x1df + y, s.colour(0x1df + y) ^ 0xf0);
      }
      ambientSounds(g);
      coreFlash(g);
    }
  }
  let missing = 0;
  for (let x = 8; x >= 0; x--) if (!(g.core[x] & 0x80)) missing++;
  g.coreMissing = missing;
  Enemies.guardians(g);
  g.ambient = 0;
  for (let n = 0xc8; n > 0; n--) {
    Enemies.tick(g);
    ambientSounds(g);
    yield* Frame.sync(g);
    coreFlash(g);
  }
  return missing === 0;
}

/** $28C5/$28CB: the core's nine places, at an offset. */
function coreDraw(g: Game, dx: number, dy: number) {
  for (let x = 8; x >= 0; x--) Items.drawThing(g, g.core[x], rom(0x2f22 + x) + dx, rom(0x2f2b + x) + dy, true);
}

/** $28F0: one of the core's missing places, at random, flickers (its cells' colours flipped). */
function coreFlash(g: Game) {
  let a = g.rng.next();
  for (let n = 9; n > 0; n--) {
    a = (a + 1) & 0x0f;
    const y = a >= 9 ? a - 9 : a;
    if (!(g.core[y] & 0x80)) {
      const at = rom(0x2934 + y * 2) | (rom(0x2935 + y * 2) << 8);
      const cell = (at - 0x5c00) & 0x3ff;
      const v = g.scr.colour(cell) ^ 0xb0;
      for (const o of [0, 1, 40, 41]) g.scr.setColour(cell + o, v);
      return;
    }
  }
}

/** $10F3: the core's hum: now and then a random sound, and a beat every other frame. */
function ambientSounds(g: Game) {
  if (!(g.rng.next() & 0xfc)) {
    const voice = g.rng.next() & 1;
    g.sound.effect(rom(0x11f5 + (g.rng.next() & 3)), voice);
  }
  g.ambient = (g.ambient + 1) & 0xff;
  if (g.ambient === 2) {
    g.ambient = 0;
    g.sound.effect(rom(0x11f3 + (g.rng.next() & 1)), 2);
  }
}

/** $3515: the core is complete: the end. */
export function ending(g: Game) {
  Screens.clear(g);
  coreDraw(g, 0, 2);
  Screens.framed(g, 0x3d2f, 0x30);
}
