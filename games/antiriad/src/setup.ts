import type { Game } from './game';
import { putBack } from './fades';
import { isPlus } from './plus';
import { BIT, NOT_BIT, resetMove } from './sprites';
import { V } from './vars';

/**
 * A room's things: its creatures and items (sprites 3-7, from the list at
 * $CA16), the armour if it was left here, and the animated characters
 * (waterfalls, fires: the lists at $FBAB, scripts at $06BC).
 */
const ROOM_SPRITES = 0xca16;
const ROOM_CHAR_ANIMS = 0xfbab;
const CHAR_ANIMS = 0x06bc;
const RADIATION = 0xf7a6; // a nibble per room: its radiation (0-3) in the low bits
const ARMOUR_PARTS = 0xfc54;
const CREATURES = 0xc618, CREATURE_HURT = 0xc64a, CREATURE_SCORE = 0xc631;
// char animation steps that make a sound: animation, step, sound (voice 2)
const CSFX_ANIM = 0xc600, CSFX_STEP = 0xc5fb, CSFX_SOUND = 0xc5f6;

/** $86E2: a room left: shapes being faded are put back, and the fades stop. */
export function stopFades(g: Game) {
  const { ram } = g;
  for (let x = 7; x >= 0; x--) {
    if (ram[V.dying + x] & 0x80 && ram[V.dyingStep + x]) putBack(g, x, true);
    if (ram[V.appearing + x] & 0x80 && ram[V.appearStep + x]) putBack(g, x, true);
    ram[V.dying + x] = 0; ram[V.appearing + x] = 0;
    ram[V.dyingTimer + x] = 0; ram[V.appearTimer + x] = 0;
    ram[V.dyingStep + x] = 0; ram[V.appearStep + x] = 0;
  }
}

/** $8716: the room's sprites. */
export function roomSprites(g: Game) {
  const { ram } = g;
  // $878B: sprites 2-7 cleared
  for (let x = 2; x < 8; x++) {
    resetMove(g, x);
    ram[V.move + x] = 0; ram[V.anim + x] = 0; ram[V.animDelay + x] = 0; ram[V.hits + x] = 0; ram[V.score + x] = 0;
    ram[V.animPos + x] = 2;
  }
  ram[V.request + 1] = 0xa0;
  const list = g.word(ROOM_SPRITES + ram[V.room] * 2);
  let n = ram[list];
  if (!n) return;
  let y = 0;
  for (let x = 7; n; x--, n--) {
    ram[V.spriteXY + x * 2] = ram[list + ++y]; g.w(0xd000 + x * 2, ram[V.spriteXY + x * 2]);
    ram[V.spriteXY + x * 2 + 1] = ram[list + ++y]; g.w(0xd001 + x * 2, ram[V.spriteXY + x * 2 + 1]);
    const m = ram[list + ++y];
    ram[V.move + x] = m | 0x80;
    ram[V.spriteXHigh] &= ram[NOT_BIT + x];
    if (m & 0x80) ram[V.spriteXHigh] |= ram[BIT + x];
    ram[V.appearing + x] = ram[V.anim + x] = ram[list + ++y];
    gone(g, x);
    creature(g, x);
  }
  generators(g);
  dropper(g);
}

/** $87AF: parts of the armour already found, and a recharge cell already taken here, aren't there. */
function gone(g: Game, x: number) {
  const { ram } = g;
  const a = ram[V.anim + x];
  for (let y = 3; y >= 0; y--) {
    if (a !== ram[ARMOUR_PARTS + y]) continue;
    if (!(ram[0x067e + y] & 0x80)) return;
    ram[V.appearing + x] = 0; ram[V.anim + x] = 0; ram[V.move + x] = 0;
    return;
  }
  if (a !== 0xc6) return;
  const room = ram[V.room];
  ram[0xa8] = room & 7;
  if (ram[0x0661 + (room >> 3)] & ram[BIT + (room & 7)]) { ram[V.appearing + x] = 0; ram[V.anim + x] = 0; ram[V.move + x] = 0; }
}

/** $87F3: a creature's strength and score. */
function creature(g: Game, x: number) {
  const { ram } = g;
  for (let y = 0x18; y >= 0; y--) {
    if (ram[V.anim + x] !== ram[CREATURES + y]) continue;
    ram[V.hits + x] = ram[CREATURE_HURT + y] >> 2;
    ram[V.score + x] = ram[CREATURE_SCORE + y];
    return;
  }
}

/** $8810: creatures that come out of a generator ($D0, $D1) wait before appearing. */
function generators(g: Game) {
  const { ram } = g;
  for (let x = 7; x >= 3; x--) {
    ram[0x7d] = x;
    const a = ram[V.appearing + x];
    if (a !== 0xd1 && a !== 0xd0) continue;
    for (let y = x - 1; y >= 3; y--) {
      const b = ram[V.appearing + y];
      if (b === 0xc0 || b === 0xc1) return;
      ram[V.appearTimer + y] = 0x64;
    }
    return;
  }
  ram[0x7d] = 0;
}

/** $8841: a creature that drops things (sprite 7, $C9) starts with its bomb. */
function dropper(g: Game) {
  if (g.ram[V.anim + 7] !== 0xc9) return;
  g.ram[V.hits + 5] = 0x14;
  dropBomb(g);
}

/** $884F: sprite 7 drops a bomb (sprite 5) from under itself. */
export function dropBomb(g: Game) {
  const { ram } = g;
  ram[V.spriteXHigh] &= 0xdf;
  if (ram[V.spriteXHigh] & 0x80) ram[V.spriteXHigh] |= 0x20;
  const x = ram[0x020e] + 0x0c;
  ram[0x020a] = x & 0xff;
  if (x > 0xff) ram[V.spriteXHigh] |= 0x20;
  ram[0x020b] = (ram[0x020f] + 0x12) & 0xff;
  ram[V.anim + 5] = 0xd2;
  ram[V.move + 5] = 0xa7; ram[V.slowX + 5] = 0xa7; ram[V.slowY + 5] = 0xa7;
  ram[V.moveCount + 5] = 0; ram[V.moveCmd + 5] = 0; ram[V.movePos + 5] = 0;
  ram[V.animDelay + 5] = 0;
  ram[V.animPos + 5] = 2;
}

/** $88A7: the armour, if it's standing in this room. */
export function armourHere(g: Game) {
  const { ram } = g;
  if (ram[V.room] === ram[V.suitRoom] && !(ram[V.inSuit] & 0x80)) {
    ram[0x0206] = ram[0x0208] = ram[V.suitX];
    ram[0x0207] = ram[V.suitY];
    ram[0x0209] = (ram[V.suitY] + 0x15) & 0xff;
    ram[V.spriteXHigh] = (ram[V.spriteXHigh] & 0xe7) | ((ram[V.suitXHigh] << 3) & 0x18);
    ram[V.anim + 3] = 0xc0; ram[V.anim + 4] = 0xc1;
  }
  ram[V.warnTimer] = 0; ram[V.warnTimer + 1] = 0;
}

/** $88EA: the room's animated characters, and its radiation. */
export function roomCharAnims(g: Game) {
  const { ram } = g;
  for (let x = 7; x >= 0; x--) { ram[0x0250 + x] = 0; ram[0x0248 + x] = 0; ram[0x0258 + x] = 3; }
  const room = ram[V.room];
  const list = g.word(ROOM_CHAR_ANIMS + room * 2);
  const n = ram[list];
  if (n) {
    ram[0x72] = n;
    let y = 0, x = 0;
    do { y++; ram[0x0250 + x++] = ram[list + y] | 0x80; } while (y < n);
  }
  let r = ram[RADIATION + (room >> 1)];
  if (!(room & 1)) r >>= 4;
  ram[0x74] = r;
  ram[0x75] = isPlus(ram) ? 0 : r & 3; // (New Game+: none, plus.ts)
}

/** $8C30 (main loop): the room's animated characters step on, each at its own pace. */
export function charAnims(g: Game) {
  for (let x = 7; x >= 0; x--) if (g.ram[0x0250 + x] & 0x80) charAnim(g, x);
}

/**
 * $8C3E: a character animation: a delay, ?, how many characters, ?, where they
 * go (2 bytes), then a source address per step (high byte below 3: 0 start
 * again, 1 n go to step n, 2 n carry on as animation n, else stop).
 */
function charAnim(g: Game, x: number): void {
  const { ram } = g;
  for (;;) {
    if (ram[0x0248 + x]) return;
    charAnimSound(g, x);
    special(g, x);
    const p = g.word(CHAR_ANIMS + ((ram[0x0250 + x] << 1) & 0xff));
    const count = ram[(p + 2) & 0xffff], to = ram[(p + 4) & 0xffff] | (ram[(p + 5) & 0xffff] << 8);
    ram[0x58] = count;
    const y = (ram[0x0258 + x] << 1) & 0xff;
    const lo = ram[(p + y) & 0xffff], hi = ram[(p + y + 1) & 0xffff];
    if (hi >= 3) {
      const from = lo | (hi << 8);
      for (let i = ((count << 3) - 1) & 0xff; ; i = (i - 1) & 0xff) {
        ram[(to + i) & 0xffff] = ram[(from + i) & 0xffff];
        if (i === 0) break;
      }
      ram[0x0258 + x]++;
      ram[0x0248 + x] = ram[p];
      return;
    }
    if (lo === 0) { ram[0x0258 + x] = 3; continue; }
    if (lo === 1) { ram[0x0258 + x] = (ram[(p + y + 2) & 0xffff] + 3) & 0xff; continue; }
    if (lo === 2) { ram[0x0250 + x] = ram[(p + y + 2) & 0xffff] | 0x80; ram[0x0258 + x] = 3; continue; }
    ram[0x0250 + x] &= 0x7f;
    return;
  }
}

/** $8CD6 */
function charAnimSound(g: Game, x: number) {
  const { ram } = g;
  for (let y = 4; y >= 0; y--) {
    if (ram[0x0250 + x] === ram[CSFX_ANIM + y] && ram[0x0258 + x] === ram[CSFX_STEP + y]) ram[V.request + 1] = ram[CSFX_SOUND + y];
  }
}

/** $8CF2: at step 5 of animation $89, something comes out (sprite 5). */
function special(g: Game, x: number) {
  const { ram } = g;
  if (ram[0x0250 + x] !== 0x89 || ram[0x0258 + x] !== 5) return;
  ram[V.anim + 5] = 0xdb;
  ram[V.move + 5] = 0xa6;
  resetMove(g, 5);
  ram[V.animDelay + 5] = 0;
  ram[V.animPos + 5] = 2;
  ram[0x020a] = 0x86; ram[0x020b] = 0x7e;
  ram[V.spriteXHigh] &= 0xdf;
}


