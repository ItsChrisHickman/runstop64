import type { Game } from './game';
import { V } from './vars';

/**
 * The sprites: animations, movement, and the scripts enemies follow. Each of the
 * eight sprites has a slot in the tables at $0200-$030F (vars.ts); the hero is
 * sprites 0 (top half) and 1 (bottom half), 2 is his shot, the rest are the
 * room's creatures and things.
 */
export const BIT = 0xf118; // 1 << sprite
export const NOT_BIT = 0xf120; // ~(1 << sprite)
const ANIMATIONS = 0xfca6; // a script for each animation number (bit 7 dropped)
const MOVES = 0xc683; // a movement script for each number
const RESPAWNERS = 0x06a0; // animations that end by starting their room's creature again ($06A0-$06A2)
const LANDERS = 0x06a3; // falling things that become RESPAWNERS[i] when they land ($06A3-$06A5)
const ROOM_SPRITES = 0xca16;
// animation frames that make a sound: animation, frame position, voice, sound
const SFX_ANIM = 0xc67b, SFX_POS = 0xc66b, SFX_VOICE = 0xc673, SFX_SOUND = 0xc663;

const bit = (g: Game, x: number) => g.ram[BIT + x];
const notBit = (g: Game, x: number) => g.ram[NOT_BIT + x];
/** The sprite isn't busy dying or appearing (both run their own frames). */
const free = (g: Game, x: number) => !((g.ram[V.dying + x] | g.ram[V.appearing + x]) & 0x80);

// ---- animations ($9E0E) ---------------------------------------------------------------------

/** $9E0E: each frame, every sprite's animation steps on (and a sprite shows while it has one). */
export function animateSprites(g: Game) {
  const { ram } = g;
  for (let x = 7; x >= 0; x--) {
    if (!free(g, x)) continue;
    if (ram[V.anim + x] & 0x80) {
      ram[V.spriteEnable] |= bit(g, x);
      animStep(g, x);
    } else ram[V.spriteEnable] &= notBit(g, x);
  }
}

/** $AA54: stop a sprite's movement script where it is (A=0 after). */
export function resetMove(g: Game, x: number) {
  const { ram } = g;
  ram[V.slowX + x] = 0x80; ram[V.slowY + x] = 0x80;
  ram[V.moveCount + x] = 0; ram[V.moveCmd + x] = 0; ram[V.movePos + x] = 0;
}

/**
 * $9E39: one frame of a sprite's animation. A script is a frame delay, a byte of
 * flags (colour; bit 7 multicolour, 6 wide, 5 tall), then sprite pointers ($10 on);
 * 0 loops, 1 ends, 2 n jumps to n, 3-$0F n carries on as animation n.
 */
export function animStep(g: Game, x: number): void {
  const { ram } = g;
  if (ram[V.animDelay + x]) { ram[V.animDelay + x]--; return; }
  const script = g.word(ANIMATIONS + ((ram[V.anim + x] << 1) & 0xff));
  const nb = notBit(g, x), b = bit(g, x);
  ram[V.spriteMulti] &= nb; ram[V.spriteExpandY] &= nb; ram[V.spriteExpandX] &= nb;
  ram[V.animDelay + x] = ram[script];
  const flags = ram[(script + 1) & 0xffff];
  ram[V.spriteColour + x] = flags & 15;
  if (flags & 0x80) ram[V.spriteMulti] |= b;
  if (flags & 0x40) ram[V.spriteExpandX] |= b;
  if (flags & 0x20) ram[V.spriteExpandY] |= b;
  for (;;) {
    frameSound(g, x);
    const pos = ram[V.animPos + x], v = ram[(script + pos) & 0xffff];
    if (v >= 0x10) {
      ram[V.frame + x] = v;
      ram[V.animPos + x]++;
      ram[V.animDelay + x]--;
      return;
    }
    if (v === 0) { ram[V.animPos + x] = 2; continue; }
    if (v === 1) {
      for (let y = 2; y >= 0; y--) if (ram[V.anim + x] === ram[RESPAWNERS + y]) { respawn(g, x); return; }
      ram[V.anim + x] = 0;
      ram[V.spriteEnable] &= nb;
      g.w(0xd015, ram[V.spriteEnable]);
      ram[V.animDelay + x]--;
      return;
    }
    if (v === 2) { ram[V.animPos + x] = (ram[(script + pos + 1) & 0xffff] + 2) & 0xff; continue; }
    ram[V.anim + x] = ram[(script + pos + 1) & 0xffff];
    ram[V.animDelay + x] = 0;
    ram[V.animPos + x] = 2;
    animStep(g, x);
    return;
  }
}

/** $A23A: some animation frames make a sound. */
function frameSound(g: Game, x: number) {
  const { ram } = g;
  if (ram[V.titleMode] & 0x80) return;
  for (let y = 7; y >= 0; y--) {
    if (ram[V.anim + x] === ram[SFX_ANIM + y] && ram[V.animPos + x] === ram[SFX_POS + y]) ram[V.request + ram[SFX_VOICE + y]] = ram[SFX_SOUND + y];
  }
}

/** $9F0D: the room's creature appears again (from the room's sprite list, at sprite 7's place). */
function respawn(g: Game, x: number) {
  const { ram } = g;
  const list = g.word(ROOM_SPRITES + ram[V.room] * 2);
  ram[0x020e] = ram[list + 1];
  ram[0x020f] = ram[list + 2];
  ram[V.move + x] = ram[list + 3] | 0x80;
  ram[V.appearing + x] = ram[list + 4];
  resetMove(g, x);
  ram[V.animDelay + x] = 0; ram[V.appearTimer + x] = 0; ram[V.appearStep + x] = 0;
  ram[V.animPos + x] = 2;
  animStep(g, x);
}

/** $9894: the hero's animation starts from its first frame. */
export function restartHeroAnim(g: Game) {
  const { ram } = g;
  ram[V.animDelay] = 0; ram[V.animDelay + 1] = 0;
  ram[V.animPos] = 2; ram[V.animPos + 1] = 2;
}

/** Set the hero's animation (top and bottom halves). */
export function heroAnim(g: Game, top: number) {
  g.ram[V.anim] = top;
  g.ram[V.anim + 1] = top + 1;
}

// ---- movement ($98A5) ------------------------------------------------------------------------

/** The hero's shot goes away. */
function endShot(g: Game) {
  g.ram[V.anim + 2] = 0; g.ram[V.move + 2] = 0; g.ram[V.shot] = 0;
}

/** $98A5 (after the hero's own checks): every sprite moves the way its direction bits say. */
export function moveSprites(g: Game) {
  const { ram } = g;
  for (let x = 7; x >= 0; x--) {
    if (!free(g, x)) continue;
    const d = ram[V.dir + x];
    if (d & 1) moveUp(g, x);
    if (d & 2) moveDown(g, x);
    if (d & 4) moveLeft(g, x);
    if (d & 8) moveRight(g, x);
  }
}

/** $98DA */
function moveUp(g: Game, x: number) {
  const { ram } = g, at = V.spriteXY + x * 2 + 1;
  ram[at] = (ram[at] - ram[V.speedY + x]) & 0xff;
  if (ram[at] >= 0x1d) return;
  ram[at] = 0x1d;
  if (x >= 1 || ram[V.roomChange] & 0x80) return;
  ram[V.roomChange] = 0x83; // off the top: the room above
  ram[0x0201] = 0x9c; ram[0x0203] = 0xb1;
}

/** $9906 */
function moveDown(g: Game, x: number) {
  const { ram } = g, at = V.spriteXY + x * 2 + 1;
  ram[at] = (ram[at] + ram[V.speedY + x]) & 0xff;
  if (ram[at] >= 0x9c) {
    if (x === 0) {
      if (ram[V.roomChange] & 0x80) return;
      ram[V.roomChange] = 0x82; // off the bottom: the room below
      ram[0x0201] = 0x1d; ram[0x0203] = 0x32;
      return;
    }
    if (x === 5) { if (ram[V.anim + 5] === 0xd2) g.dropBomb(); return; }
    if (x === 2) { endShot(g); return; }
    if (x !== 7) return;
  }
  if (ram[at] >= 0x94) landed(g, x);
}

/** $9A2A: a falling thing landed: it becomes what it turns into, on the floor. */
function landed(g: Game, x: number) {
  const { ram } = g;
  for (let y = 2; y >= 0; y--) {
    if (ram[V.anim + x] !== ram[LANDERS + y]) continue;
    ram[V.anim + x] = ram[RESPAWNERS + y];
    ram[V.move + x] = 0; ram[V.animDelay + x] = 0; ram[V.animPos + x] = 2;
    ram[0x020f] = (((ram[0x020f] - 0x32) & 0xf8) + 0x35) & 0xff;
    return;
  }
}

/** $9962 */
function moveLeft(g: Game, x: number) {
  const { ram } = g, at = V.spriteXY + x * 2;
  const v = ram[at] - ram[V.speedX + x];
  ram[at] = v & 0xff;
  if (ram[V.spriteXHigh] & bit(g, x)) {
    if (v < 0) ram[V.spriteXHigh] &= notBit(g, x);
    return;
  }
  if ((v & 0xff) >= 0x32) return;
  if (x === 0) {
    if (ram[V.roomChange] & 0x80) return;
    ram[V.roomChange] = 0x81; // off the left: the room to the left
    ram[0x0200] = 0x2c; ram[0x0202] = 0x2c;
    ram[V.spriteXHigh] |= 3;
    return;
  }
  if (x === 2 && (v & 0xff) < 0x0e) endShot(g);
}

/** $99C6 */
function moveRight(g: Game, x: number) {
  const { ram } = g, at = V.spriteXY + x * 2;
  const v = ram[at] + ram[V.speedX + x];
  ram[at] = v & 0xff;
  if (!(ram[V.spriteXHigh] & bit(g, x))) {
    if (v > 0xff) ram[V.spriteXHigh] |= bit(g, x);
    return;
  }
  if ((v & 0xff) < 0x2c) return;
  if (x === 0) {
    if (ram[V.roomChange] & 0x80) return;
    ram[V.roomChange] = 0x80; // off the right: the room to the right
    ram[0x0200] = 0x32; ram[0x0202] = 0x32;
    ram[V.spriteXHigh] &= 0xfc;
    return;
  }
  if (x === 2 && (v & 0xff) >= 0x59) endShot(g);
}

// ---- movement scripts ($A8A0) ----------------------------------------------------------------

/** $A8A0: sprites 2-7 follow their movement scripts. */
export function followScripts(g: Game) {
  const { ram } = g;
  for (let x = 2; x < 8; x++) {
    if (ram[V.move + x] & 0x80) { if (free(g, x)) script(g, x); }
    else ram[V.dir + x] = 0;
  }
}

/**
 * $A8C0: a movement script is records of 4 bytes: direction bits, speeds (high
 * nibble across, low nibble up/down; 8-$F: 1 pixel every n frames), how many
 * frames, and a command for when they're done (0 next record, 1 n a: script n and
 * animation a, 2 n: script n, 3 n: record n, 4 on: home in on the hero).
 */
function script(g: Game, x: number): void {
  const { ram } = g;
  const p = g.word(MOVES + ((ram[V.move + x] << 1) & 0xff));
  const at = (y: number) => ram[(p + (y & 0xff)) & 0xffff];
  /** $A935: take the record's speeds and directions (y: just past its speed byte). */
  const take = (y: number) => {
    y = (y - 1) & 0xff;
    const v = at(y);
    let lo = v & 15;
    if (lo >= 8) { ram[V.slowY + x] = lo & 7; lo = 1; }
    ram[V.speedY + x] = lo;
    let hi = v >> 4;
    if (hi >= 8) { ram[V.slowX + x] = hi & 7; hi = 1; }
    ram[V.speedX + x] = hi;
    ram[V.dir + x] = at(y - 1);
    if (ram[V.slowX + x] & 0x80 && ram[V.slowY + x] & 0x80 && ram[V.moveCount + x]) ram[V.moveCount + x]--;
  };
  const count = () => { ram[V.moveCount + x]--; };
  if (ram[V.moveCount + x]) {
    // slow speeds: a pixel every n frames
    const sy = ram[V.slowY + x];
    if (!(sy & 0x80)) {
      if (sy) {
        ram[V.slowY + x]--; ram[V.speedY + x] = 0;
        if (ram[V.slowX + x] & 0x80) return;
      } else take(ram[V.movePos + x] - 2);
    }
    const sx = ram[V.slowX + x];
    if (sx & 0x80) { count(); return; }
    if (sx) { ram[V.slowX + x]--; ram[V.speedX + x] = 0; return; }
    take(ram[V.movePos + x] - 2);
    count();
    return;
  }
  const cmd = ram[V.moveCmd + x];
  if (!cmd) {
    ram[V.slowX + x] = 0x80; ram[V.slowY + x] = 0x80;
    const y = (ram[V.movePos + x] + 4) & 0xff;
    ram[V.movePos + x] = y;
    ram[V.moveCmd + x] = at(y - 1);
    ram[V.moveCount + x] = at(y - 2);
    take(y - 2);
    return;
  }
  const pos = ram[V.movePos + x];
  if (cmd === 1) {
    ram[V.move + x] = at(pos) | 0x80;
    ram[V.anim + x] = at(pos + 1);
    resetMove(g, x);
    ram[V.dir + x] = 0; ram[V.animDelay + x] = 0; ram[V.animPos + x] = 2;
    return;
  }
  if (cmd === 2) {
    ram[V.move + x] = at(pos) | 0x80;
    resetMove(g, x);
    script(g, x);
    return;
  }
  if (cmd === 3) {
    ram[V.movePos + x] = (at(pos) << 2) & 0xff;
    ram[V.moveCount + x] = 0; ram[V.moveCmd + x] = 0;
    ram[V.slowX + x] = 0x80; ram[V.slowY + x] = 0x80;
    script(g, x);
    return;
  }
  // 4 on: home in on the hero
  const sx = ram[V.slowX + x];
  if (!(sx & 0x80)) {
    if (sx) { ram[V.slowX + x]--; ram[V.speedX + x] = 0; }
    else { ram[V.slowX + x] = (at(pos - 3) >> 4) & 7; ram[V.speedX + x] = 1; }
  }
  homeIn(g, x);
}

/** $A9F7: head for the hero (sprite 0): across, and up or down to 10 pixels above him. */
function homeIn(g: Game, x: number) {
  const { ram } = g;
  let across = 4;
  const mine = ram[V.spriteXHigh] & bit(g, x) ? 1 : 0, his = ram[V.spriteXHigh] & 1;
  if (his === mine) {
    const sx = ram[V.spriteXY + x * 2], hx = ram[0x0200];
    if (sx === hx) across = 0;
    else if (sx < hx) across = 8;
  } else if (his > mine) across = 8;
  let upDown = 1;
  const y = (ram[V.spriteXY + x * 2 + 1] - 0x0a) & 0xff, hy = ram[0x0201];
  if (y === hy) upDown = 0;
  else if (y < hy) upDown = 2;
  ram[V.dir + x] = across | upDown;
}
