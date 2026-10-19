import { storeCell } from './cells';
import type { Game } from './game';
import { note } from './feel';
import { HURT_AMOUNT, hurtingBeside } from './hero';
import { BIT, NOT_BIT } from './sprites';
import { V } from './vars';

/**
 * What the VIC-II's collision interrupts report: the shot hitting a wall, the
 * hero touching something that hurts ($A44C, sprite-background), and sprites
 * meeting ($A5C0, sprite-sprite): shooting creatures, being hurt by them,
 * picking up the armour's parts and the recharge cell, the teleporter, getting
 * into the armour.
 */
const OPEN = 0xce1c;
const ARMOUR_PARTS = 0xfc54; // the four parts' animations (c2-c5)
const HAVE_PART = 0x067e; // per part: bit 7 = found
const PART_NEWS = 0x067a; // per part: bit 7 = to show in the panel
const PART_MARK_COL = 0xfc58, PART_MARK_ROW = 0xfc5c;
const TOUGH = 0xc608; // 16 animations that a touch or a shot doesn't destroy
const CREATURES = 0xc618; // 25 creatures' animations, with their score and how much they hurt
const CREATURE_HURT = 0xc64a;
const RECHARGE_CELL = 0xc6, TELEPORTER = 0xd3, VANISHES = 0xdb;

const inList = (g: Game, list: number, n: number, v: number) => {
  for (let i = n - 1; i >= 0; i--) if (g.ram[list + i] === v) return i;
  return -1;
};

/** $A82E: a sound on voice 2 (unless the low-energy warning has it). */
export function sound1(g: Game, s: number) {
  g.ram[0x9f] = s;
  if (g.ram[V.playing + 1] !== 0x9b) g.ram[V.request + 1] = s;
}

/** $A851: add to the score (24 bits at $0697). */
export function addScore(g: Game, n: number) {
  const { ram } = g;
  let v = ram[0x0697] + n;
  ram[0x0697] = v & 0xff;
  v = ram[0x0698] + (v >> 8); ram[0x0698] = v & 0xff;
  v = ram[0x0699] + (v >> 8); ram[0x0699] = v & 0xff;
}

/** $A876: the hero (out of the armour) is hurt. */
function hurtHero(g: Game) {
  const { ram } = g;
  if ([0xa6, 0xa8, 0xaa].includes(ram[V.anim])) return;
  if (ram[0x65]) note(g.feel, { kind: 'hurt' });
  const v = (ram[V.life] - ram[0x65]) & 0xff;
  ram[V.life] = v & 0x80 ? 0 : v;
}

/** $A891: the armour is hit: it loses energy. */
function hurtSuit(g: Game) {
  const { ram } = g;
  if (ram[0x65]) note(g.feel, { kind: 'hurt' });
  const v = (ram[V.suitEnergy] - ram[0x65]) & 0xff;
  ram[V.suitEnergy] = v & 0x80 ? 0 : v;
}

/** Hurt by `amount`: Tal, or (half, a quarter with the Particle Negator) the armour. */
function hurt(g: Game, amount: number) {
  if (g.graceActive()) return; // (a moment's grace after a resume, grace.ts)
  const { ram } = g;
  ram[0x65] = amount;
  if (!(ram[V.inSuit] & 0x80)) { hurtHero(g); return; }
  ram[0x65] >>= 1;
  if (ram[0x067f] & 0x80) ram[0x65] >>= 1;
  hurtSuit(g);
}

/** $A500 + $A4D3: does the shot (sprite 2) touch a wall? (3 characters across its row) */
function shotInWall(g: Game) {
  const { ram } = g;
  const row = (((g.r(0xd005) - 0x32) & 0xff) >> 3) + 1;
  const v = ((g.r(0xd010) & 4) << 6) | g.r(0xd004);
  let col = ((v >> 3) - 3) & 0xff;
  const at = g.word(0xf128 + ((row * 2) & 0xff)) - 0x4000;
  ram[0x45] = 2;
  for (;;) {
    if (inList(g, OPEN, 12, g.m.colour[(at + col) & 0x3ff] & 15) < 0) return true;
    col = (col + 1) & 0xff;
    ram[0x45] = (ram[0x45] - 1) & 0xff;
    if (ram[0x45] & 0x80) return false;
  }
}

/**
 * $A44C (main loop): sprite-background collisions. Returns roughly how long the original takes
 * over them (in cycles, from the interrupt that latched them to clearing them): while it's busy,
 * its interrupt keeps the first collisions it latched and drops the rest (a stone hitting a wall
 * while Tal's feet are being checked goes on).
 */
export function backgroundHits(g: Game): number {
  const { ram } = g;
  const c = ram[V.bgCollisions];
  let busy = 100;
  if (c & 4) {
    // the shot hit a wall
    if (ram[V.anim + 2] === 0xbd) { ram[V.bgCollisions] = 0; return busy; }
    busy = 300;
    if (shotInWall(g)) {
      if (ram[V.anim + 2] === 0xbc) ram[V.request + 1] = 0x89;
      else sound1(g, 0xad);
      ram[V.anim + 2] = 0xbd; // the shot breaks up
      ram[V.animPos + 2] = 2;
      const v = ram[V.animDelay + 2];
      ram[V.move + 2] = v; ram[V.bgCollisions] = v; ram[V.shot] = v;
      return busy;
    }
  } else if (c & 3 && ram[V.room] && !ram[V.hurtCooldown]) {
    // the hero touched something that hurts
    busy = 1830;
    let k = hurtingBeside(g, false);
    if (k < 0) k = hurtingBeside(g, true);
    if (k >= 0) {
      ram[V.hurtCooldown] = 0x19;
      hurt(g, ram[HURT_AMOUNT + k]);
    }
  }
  ram[V.bgCollisions] = 0;
  return busy;
}

/** $A869: the highest sprite (7 down to 3) in the collision bits, or -1. */
function struck(g: Game) {
  let a = g.ram[V.spriteCollisions];
  for (let x = 7; x >= 3; x--) { if (a & 0x80) return x; a <<= 1; }
  return -1;
}

/** $A5C0 (interrupt): sprite-sprite collisions. */
export function spriteHits(g: Game) {
  const { ram } = g;
  if (ram[V.titleMode] & 0x80 || !ram[V.spriteCollisions]) return;
  if (ram[V.spriteCollisions] & 3) heroTouches(g);
  else if (ram[V.spriteCollisions] & 4) shotHits(g);
  ram[V.spriteCollisions] = 0;
}

const busy = (g: Game, x: number) => !!((g.ram[V.dying + x] | g.ram[V.appearing + x]) & 0x80);

/** $A5D7: the shot hits a creature. */
function shotHits(g: Game) {
  const { ram } = g;
  const x = struck(g);
  if (x >= 0 && !busy(g, x)) {
    const a = ram[V.anim + x];
    if (!(a & 0x80)) return;
    if (inList(g, TOUGH, 16, a) < 0) {
      ram[V.hits + x]--;
      if (ram[V.anim + 2] === 0xbc) ram[V.request + 1] = 0x89; // a stone
      else { sound1(g, 0xad); ram[V.hits + x]--; } // the Pulsar Beam does twice the damage
      let v = ram[V.hits + x];
      if (!v || v & 0x80) {
        // destroyed: the score (twice for a stone), and it explodes
        addScore(g, ram[V.score + x]);
        if (ram[V.anim + 2] === 0xbc) addScore(g, ram[V.score + x]);
        ram[V.dying + x] = ram[V.anim + x];
        note(g.feel, { kind: 'kill', sprite: x });
        sound1(g, 0xa2);
        ram[V.dyingStep + x] = 0; ram[V.dyingTimer + x] = 0; ram[V.move + x] = 0;
        v = 0;
      }
      ram[V.shot] = v; ram[V.move + 2] = v; ram[V.anim + 2] = v;
    }
  }
  ram[V.spriteEnable] &= 0xfb;
  g.w(0xd015, ram[V.spriteEnable]);
}

/** A part of the armour is his (found, the panel to say so and its mark lit: part 0 the Pulsar Beam, 1 the Particle Negator, 2 the Gravity Displacer, 3 the Implosion Mine). */
export function fitPart(g: Game, part: number) {
  const { ram } = g;
  ram[HAVE_PART + part] = 0x80; ram[PART_NEWS + part] = 0x80;
  const n = ram[0x46];
  const at = g.word(0xf128 + ram[PART_MARK_ROW + n] * 2) + ram[PART_MARK_COL + n];
  ram[at] = 0xc1; g.m.colour[(at - 0x4000) & 0x3ff] = 7;
  ram[0x46]++;
}

/** $A643: the hero touches sprite x. */
function heroTouches(g: Game) {
  const { ram } = g;
  const x = struck(g);
  if (x < 0) return;
  const a = ram[V.anim + x];
  const part = inList(g, ARMOUR_PARTS, 4, a);
  const reaching = () => ram[V.inSuit] & 0x80 || ram[V.anim] === 0x8a || ram[V.anim] === 0x8c;
  if (part >= 0) {
    // a part of the armour: crouch to pick it up (or touch it in the armour)
    if (!(ram[V.panelOn] & 0x80) || (ram[V.appearing + x] | ram[HAVE_PART + part]) & 0x80 || !reaching()) return;
    fitPart(g, part);
    ram[V.anim + x] = 0; ram[V.move + x] = 0;
    addScore(g, ram[V.score + x]);
    ram[V.request + 2] = 0x99;
    return;
  }
  if (a === RECHARGE_CELL) {
    if (!(ram[V.panelOn] & 0x80) || !reaching()) return;
    if (!g.enhanced && ram[0xa7] & 0x80) { g.say(0x89); return; } // already carrying one (ENHANCED: every cell is his, cells.ts)
    if (ram[V.appearing + x] & 0x80) return;
    const room = ram[V.room];
    ram[0x0661 + (room >> 3)] |= ram[BIT + (room & 7)];
    if (g.enhanced) storeCell(g); else ram[0xa7] = 0x80;
    ram[V.request + 2] = 0x99;
    ram[V.anim + x] = 0; ram[V.move + x] = 0;
    ram[V.spriteEnable] &= ram[NOT_BIT + x];
    g.w(0xd015, ram[V.spriteEnable]);
    addScore(g, ram[V.score + x]);
    return;
  }
  if (a === TELEPORTER) {
    if (!(ram[V.panelOn] & 0x80) || busy(g, 0) || ram[V.anim] !== 0x88) return;
    // back to the armour: Tal fades out
    ram[V.dying] = ram[V.dying + 1] = ram[V.teleport] = 0x88;
    ram[V.dyingStep] = ram[V.dyingStep + 1] = ram[V.dyingTimer] = ram[V.dyingTimer + 1] = 0;
    ram[V.request] = 0x96; ram[V.request + 1] = 0x97;
    g.say(0x91);
    return;
  }
  if (a === 0xc0 || a === 0xc1) {
    // the empty armour: Tal steps in (fades out, the armour takes over)
    if (ram[V.anim] !== 0x88 || ram[V.anim + 1] !== 0x89 || busy(g, 0) || ram[0x93]) return;
    ram[V.dying] = ram[V.dying + 1] = 0x88;
    ram[V.dyingStep] = ram[V.dyingStep + 1] = ram[V.dyingTimer] = ram[V.dyingTimer + 1] = 0;
    ram[V.request] = 0x96; ram[V.request + 1] = 0x97;
    return;
  }
  // a creature: it hurts, and (unless it's one that can't be) it's destroyed
  if (busy(g, x) || !(a & 0x80)) return;
  const tough = inList(g, TOUGH, 16, a) >= 0;
  ram[0xad] = tough ? 0x0f : 0xff;
  const k = inList(g, CREATURES, 25, a);
  if (k >= 0) hurt(g, ram[CREATURE_HURT + k]);
  if (tough) return;
  if (a === VANISHES) {
    ram[V.anim + x] = 0; ram[V.move + x] = 0;
    ram[V.spriteEnable] &= ram[NOT_BIT + x];
    g.w(0xd015, ram[V.spriteEnable]);
    return;
  }
  ram[V.dying + x] = a;
  note(g.feel, { kind: 'kill', sprite: x });
  sound1(g, 0xa2);
  addScore(g, ram[V.score + x]);
  ram[V.dyingStep + x] = 0; ram[V.dyingTimer + x] = 0; ram[V.move + x] = 0;
}
