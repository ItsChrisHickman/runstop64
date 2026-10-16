import { refuel } from './cells';
import type { Game } from './game';
import { BIT, NOT_BIT } from './sprites';
import { V } from './vars';

/**
 * Sprites dissolving (dying, or Tal stepping into the armour or a teleporter)
 * and materialising: over 9 steps of 4 frames, the sprite's own shape is masked
 * with the patterns at $0800 (64 bytes a step). The original works on the
 * shape in the VIC-II's bank itself, keeping a copy at $0361 + sprite * 64 to
 * put back afterwards; so does the port.
 */
const MASKS = 0x0800;
const KEPT = 0x0361;
const ANIMATIONS = 0xfca6;

const shape = (_g: Game, frame: number) => 0x4000 + frame * 64;

/** $A073: keep a copy of the sprite's shape. */
function keep(g: Game, x: number) {
  const from = shape(g, g.ram[V.frame + x]), to = KEPT + x * 64;
  for (let i = 63; i >= 0; i--) g.ram[to + i] = g.ram[from + i];
}

/**
 * A write to a sprite's shape, from the interrupt's frame of logic: it reaches the VIC-II's bank at
 * the next frame's start. (The original's logic takes until about then: a sprite near the top of
 * the screen is drawn with the shape as it was. Nothing but the VIC-II reads shapes.)
 */
const setShape = (g: Game, at: number, v: number) => { g.shapeWrites.push((at & 0xffff) | (v << 16)); };

/** $A0B1: put the sprite's shape back (`now`: from the main program, not the interrupt). */
export function putBack(g: Game, x: number, now = false) {
  const to = shape(g, g.ram[V.frame + x]), from = KEPT + x * 64;
  for (let i = 63; i >= 0; i--) { if (now) g.ram[(to + i) & 0xffff] = g.ram[from + i]; else setShape(g, to + i, g.ram[from + i]); }
}

/** $9F4A (interrupt): sprites dying and appearing. */
export function fades(g: Game) {
  for (let x = 7; x >= 0; x--) {
    if (g.ram[V.dying + x] & 0x80) dissolve(g, x);
    if (g.ram[V.appearing + x] & 0x80) materialise(g, x);
  }
}

/** $9F60 */
function dissolve(g: Game, x: number) {
  const { ram } = g;
  if (ram[V.dyingTimer + x]) { ram[V.dyingTimer + x]--; return; }
  ram[V.dyingTimer + x] = 4;
  if (ram[V.dyingStep + x] >= 9) { gone(g, x); return; }
  if (!ram[V.dyingStep + x]) keep(g, x);
  // $A030: mask the shape with this step's pattern
  const at = shape(g, ram[V.frame + x]), mask = MASKS + ram[V.dyingStep + x] * 64;
  for (let i = 63; i >= 0; i--) setShape(g, at + i, ram[(at + i) & 0xffff] & ram[(mask + i) & 0xffff]);
  ram[V.dyingStep + x]++;
  ram[V.dyingTimer + x]--;
}

/** $9F83: dissolved. For Tal (stepping into the armour, not teleporting): the armour takes over. */
function gone(g: Game, x: number) {
  const { ram } = g;
  ram[V.anim + x] = 0; ram[V.dying + x] = 0;
  ram[V.spriteEnable] &= ram[NOT_BIT + x];
  g.w(0xd015, ram[V.spriteEnable]);
  putBack(g, x);
  if (x >= 1 || ram[V.teleport] & 0x80) return;
  intoArmour(g);
}

/** $9F9F: Tal, gone, is in the armour, where it stands (the first time, it powers up). */
export function intoArmour(g: Game) {
  const { ram } = g;
  ram[0x0200] = ram[0x0202] = ram[0x0206];
  ram[0x0201] = ram[0x0207];
  ram[0x0203] = ram[0x0209];
  ram[V.spriteXHigh] &= 0xfc;
  if (ram[V.spriteXHigh] & 0x18) ram[V.spriteXHigh] |= 3;
  ram[V.anim + 3] = 0; ram[V.anim + 4] = 0;
  ram[V.flySpeedX] = 0; ram[V.flySpeedY] = 0; ram[V.hover] = 0; ram[V.hoverTimer] = 0;
  ram[V.animDelay] = 0; ram[V.animDelay + 1] = 0;
  ram[V.animPos] = 2; ram[V.animPos + 1] = 2;
  g.w(0xd025, 0x0e); g.w(0xd026, 0x0b);
  ram[V.inSuit] = 0xb2;
  ram[V.anim] = 0xb2; ram[V.anim + 1] = 0xb3;
  ram[0x93] = 0x64;
  if (ram[0x88] & 0x80) { if (g.enhanced) refuel(g); return; } // (ENHANCED: a stored cell fills it, as the original's one does)
  // the first time: the armour powers up (its tune, the panel lights)
  ram[V.request] = 0x8c; ram[V.request + 1] = 0x8d; ram[V.request + 2] = 0x8e;
  ram[0x88] = ram[0x89] = ram[0xa0] = 0xc2;
  ram[0x42f8 + 0x22] = 0xc2;
  g.m.colour[0x2f8 + 0x22] = 5;
  ram[0x87] = 0x96;
}

/** $A0EF */
function materialise(g: Game, x: number) {
  const { ram } = g;
  if (ram[V.appearTimer + x]) { ram[V.appearTimer + x]--; return; }
  ram[V.appearTimer + x] = 4;
  const step = ram[V.appearStep + x];
  if (step >= 9) {
    const a = ram[V.appearing + x];
    ram[V.anim + x] = a;
    ram[V.appearing + x] = a & 0x7f;
    if (a === 0x88) { ram[0x93] = 0x64; return; }
  } else if (!step) {
    const y = ram[0x7d];
    if (x < y && x >= 3 && y && !((ram[V.dying + y] ^ ram[V.anim + y]) & 0x80)) {
      ram[V.appearing + x] = 0; ram[V.anim + x] = 0; ram[V.move + x] = 0;
      return;
    }
    // $A1E9: keep the first frame's shape
    const script = g.word(ANIMATIONS + ((ram[V.appearing + x] << 1) & 0xff));
    const f = ram[(script + 2) & 0xffff];
    ram[V.appearFrame + x] = f;
    const from = shape(g, f), to = KEPT + x * 64;
    for (let i = 63; i >= 0; i--) ram[to + i] = ram[(from + i) & 0xffff];
    reveal(g, x);
    ram[V.frame + x] = ram[V.appearFrame + x];
    ram[V.spriteEnable] |= ram[BIT + x];
    ram[V.appearStep + x]++;
  } else {
    reveal(g, x);
    ram[V.appearStep + x]++;
  }
  ram[V.appearTimer + x]--;
}

/** $A160: the shape so far: the kept copy, less this step's mask. */
function reveal(g: Game, x: number) {
  const { ram } = g;
  const script = g.word(ANIMATIONS + ((ram[V.appearing + x] << 1) & 0xff));
  ram[V.spriteMulti] &= ram[NOT_BIT + x];
  const flags = ram[(script + 1) & 0xffff];
  ram[V.spriteColour + x] = flags & 15;
  if (flags & 0x80) ram[V.spriteMulti] |= ram[BIT + x];
  const at = shape(g, ram[(script + 2) & 0xffff]), from = KEPT + x * 64, mask = MASKS + ram[V.appearStep + x] * 64;
  for (let i = 63; i >= 0; i--) setShape(g, at + i, ~ram[(mask + i) & 0xffff] & ram[from + i] & 0xff);
}
