import type { Game } from './game';
import { isPlus } from './plus';
import { rowAt } from './rooms';
import { BIT, NOT_BIT, heroAnim, resetMove, restartHeroAnim } from './sprites';
import { V } from './vars';

/**
 * Tal, the hero: the joystick (read every 7th frame), walking, jumping and
 * falling out of the armour, flying in it, and the checks against the room's
 * characters. Walls and floors are told by the colour of the character (its low
 * nibble): the tables at $CE12, $CE1C and $CE2C list colours that are open, and
 * those that hurt.
 *
 * The hero's animations (sprite 0's number; sprite 1, his legs, is one more):
 * $80/$82 walking left/right, $84/$86 standing, $88 appearing, $8A/$8C crouching,
 * $92/$98 jumping, $94/$9A falling, $96/$9C landing, $A2/$A4 throwing, $A6 dying,
 * $A8/$AA reviving; in the armour $AC-$B6 flying (by speed and way) and $B2
 * standing.
 */
const OPEN_BELOW = 0xce12; // 10 colours a hero can't stand on
const OPEN = 0xce1c; // 12 colours a hero can walk through
const HURTS = 0xce2c; // 4 colours that hurt
export const HURT_AMOUNT = 0xce28; // ... and by how much
const POWER_CENTRE = 0xce30; // the power centre's characters
const JUMP_SPEEDS = 0xc5e1;
const HOVER = 0xfc4c;
const MOVES = 0xc683;

const inList = (g: Game, list: number, n: number, v: number) => {
  for (let i = n - 1; i >= 0; i--) if (g.ram[list + i] === v) return i;
  return -1;
};
const colourAt = (g: Game, row: number, col: number) => g.m.colour[(rowAt(g, row) - 0x4000 + col) & 0x3ff] & 15;
const inSuit = (g: Game) => !!(g.ram[V.inSuit] & 0x80);
const setDir = (g: Game, d: number) => { g.ram[V.dir] = d; g.ram[V.dir + 1] = d; };

// ---- the joystick ($9076) --------------------------------------------------------------------

/** $9076: every 7th frame, the joystick moves the hero (unless he's busy). */
export function joystick(g: Game) {
  const { ram } = g;
  if (ram[V.inputDelay]) { ram[V.inputDelay]--; return; }
  if ((ram[V.dying] | ram[V.appearing] | ram[V.jumping] | ram[V.titleMode] | ram[0xb1]) & 0x80) return;
  if (inSuit(g)) suitControl(g); else walkControl(g);
  ram[V.inputDelay] = 6;
}

const readStick = (g: Game) => (g.ram[V.joystick] = ~g.r(0xdc00) & 0x1f);

/**
 * ENHANCED's jump button (or up), read with the joystick: a press since the last read counts
 * even if it's let go again before it (the joystick is read only every 7th frame).
 */
function jumpAsked(g: Game, j: number) {
  if (!g.enhanced) return false;
  const asked = !!g.jumpButton || !!(j & 1);
  g.jumpButton &= 1;
  return asked;
}

/** Change the hero's animation from one to another, as a table of pairs. */
function swap(g: Game, pairs: [number, number][]) {
  const now = g.ram[V.anim];
  for (const [from, to] of pairs) if (now === from) { heroAnim(g, to); restartHeroAnim(g); return true; }
  return false;
}

/** $909C: out of the armour. */
function walkControl(g: Game) {
  const { ram } = g;
  const j = readStick(g);
  setDir(g, j & 0x0c);
  if (jumpAsked(g, j) && jumpThatWay(g, j)) { /* ENHANCED: jumped */ }
  else if (!j) swap(g, [[0x80, 0x84], [0x82, 0x86], [0x9e, 0x8e], [0xa0, 0x90]]);
  else if (j & 1) {
    if (ram[V.anim] === 0x84) { heroAnim(g, 0x92); ram[V.dir] = 1; jump(g); }
    else if (ram[V.anim] === 0x86) { heroAnim(g, 0x98); ram[V.dir] = 1; jump(g); }
    else swap(g, [[0x9e, 0x8e], [0xa0, 0x90], [0x80, 0x84], [0x82, 0x86]]);
  } else if (j & 2) swap(g, [[0x84, 0x8a], [0x86, 0x8c], [0x80, 0x84], [0x82, 0x86]]);
  else {
    if (j & 4) swap(g, [[0x84, 0x80], [0x88, 0x84], [0x86, 0x88], [0x82, 0x86], [0x9e, 0x8e], [0xa0, 0x90]]);
    else if (j & 8) swap(g, [[0x86, 0x82], [0x88, 0x86], [0x84, 0x88], [0x80, 0x84], [0xa0, 0x90], [0x9e, 0x8e]]);
    if (j & 0x10) walkFire(g);
  }
  // $9364: only walking and jumping go sideways
  if (![0x80, 0x82, 0x92, 0x98].includes(ram[V.anim])) setDir(g, ram[V.dir] & 3);
}

/**
 * ENHANCED: the jump button (or up) jumps from walking or standing, the way the stick is
 * pushed (or straight up), with the game's own jumps: the walking jump's ($92C9) and the
 * standing one's ($9155), which differ only in the way they go.
 */
function jumpThatWay(g: Game, j: number) {
  const { ram } = g;
  const a = ram[V.anim];
  if (a !== 0x80 && a !== 0x82 && a !== 0x84 && a !== 0x86) return false;
  const left = j & 4 ? true : j & 8 ? false : a === 0x80 || a === 0x84;
  heroAnim(g, left ? 0x92 : 0x98);
  if (!(j & 0x0c)) ram[V.dir] = 1;
  jump(g);
  return true;
}

/** $934E: take off. */
function jump(g: Game) {
  const { ram } = g;
  setDir(g, ram[V.dir] | 1);
  ram[V.jumpStep] = 0x14;
  ram[V.jumping] = 0x80;
  restartHeroAnim(g);
}

/**
 * $92C9: fire out of the armour: jump (walking), throw (standing). ENHANCED: fire only
 * throws; walking, he stops to throw (the standing throw, as from the stance he'd stop in),
 * unless his stone is still out: then, as standing, there's no throw, and he walks on.
 */
function walkFire(g: Game) {
  const { ram } = g;
  let a = ram[V.anim];
  if (g.enhanced && (a === 0x80 || a === 0x82)) {
    // (Not by putting him in the stance first: an animation switched without starting it again
    // runs on from the old one's place in its script, and the stances' scripts are one frame
    // each, so from the walk's place it ran into the scripts after them: other animations'
    // frames, a crouch. That happened whenever his stone was still out, and no throw followed.)
    if (ram[V.anim + 2] & 0x80) return;
    a += 4;
  }
  if (a === 0x80) { heroAnim(g, 0x92); jump(g); }
  else if (a === 0x82) { heroAnim(g, 0x98); jump(g); }
  else if (a === 0x84 || a === 0x86) {
    if (ram[V.anim + 2] & 0x80) return;
    heroAnim(g, a === 0x84 ? 0xa2 : 0xa4);
    ram[V.shot] = ram[V.anim + 1];
    restartHeroAnim(g);
  } else if (a === 0x9e) { heroAnim(g, 0x8e); restartHeroAnim(g); }
  else if (a === 0xa0) { heroAnim(g, 0x90); restartHeroAnim(g); }
  else if (ram[V.gameOver] & 0x80 && !ram[V.timer68]) g.restart();
}

// ---- in the armour ($9383) -------------------------------------------------------------------

/** $954D, $955A: the armour's thrust sounds. */
const thrust = (g: Game) => { if (g.ram[V.playing] !== 0x8a) g.ram[V.request] = 0x8a; };
const coast = (g: Game) => { if (g.ram[V.playing] !== 0x8b) g.ram[V.request] = 0x8b; };

function suitControl(g: Game) {
  const { ram } = g;
  let j = readStick(g);
  // ENHANCED: the jump button lifts the armour, as up does (takes off, climbs)
  if (jumpAsked(g, j)) j = ram[V.joystick] = j | 1;
  if (!(j & 0x0f)) idleSuit(g);
  else {
    // $9567: up and down speed
    if (!ram[V.flySpeedY]) setDir(g, (ram[V.dir] & 0x0c) | (j & 3));
    if (ram[V.dir] & 1) climb(g, j, 2);
    if (ram[V.dir] & 2) climb(g, j, 1);
    if (j & 1 && ram[V.anim] === 0xb2) takeOff(g);
    if (j & 2 && ram[V.anim] === 0xb2) setDir(g, ram[V.dir] & 0x0c);
    if (j & 4) { suitLeft(g); suitLeftSpeed(g); }
    if (j & 8) { suitRight(g); suitRightSpeed(g); }
  }
  if (j & 0x10) suitFire(g);
  if (inSuit(g)) {
    ram[V.speedX] = ram[V.flySpeedX]; ram[V.speedX + 1] = ram[V.flySpeedX];
    ram[V.speedY] = ram[V.flySpeedY]; ram[V.speedY + 1] = ram[V.flySpeedY];
    suitDrift(g);
  }
}

/** $9595/$95B6: pushing the other way slows, the same way speeds up (with the Gravity Displacer). */
function climb(g: Game, j: number, against: number) {
  const { ram } = g;
  if (j & against) {
    if (ram[V.flySpeedY]) { ram[V.flySpeedY]--; coast(g); }
  } else if (ram[V.flySpeedY] < 2 && ram[0x0680] & 0x80) { ram[V.flySpeedY]++; thrust(g); }
}

/** $93E4: nothing pushed: slow down. */
function idleSuit(g: Game) {
  const { ram } = g;
  if (ram[V.dir] & 3 && ram[V.flySpeedY]) {
    if (--ram[V.flySpeedY] === 0) coast(g);
  }
  if (ram[V.dir] & 0x0c && ram[V.flySpeedX]) { ram[V.flySpeedX]--; coast(g); return; }
  if ((ram[V.anim] === 0xae || ram[V.anim] === 0xb4) && ram[V.playing] === 0x8a) coast(g);
}

/** $941D: up, standing: take off (with the Gravity Displacer). */
export function takeOff(g: Game) {
  const { ram } = g;
  if (!(ram[0x0680] & 0x80)) { setDir(g, ram[V.dir] & 0x0c); g.say(0x85); return; }
  heroAnim(g, 0xb0);
  ram[V.flySpeedX] = 0; ram[V.flySpeedY] = 0; ram[V.hover] = 0; ram[V.hoverTimer] = 0;
  restartHeroAnim(g);
}

/** $9465: left: turn through the flying animations, or leave the armour standing. */
function suitLeft(g: Game) {
  const { ram } = g;
  if (ram[V.flySpeedX]) return;
  const a = ram[V.anim];
  if (a === 0xae) { heroAnim(g, 0xac); thrust(g); restartHeroAnim(g); }
  else if (a === 0xb0) { heroAnim(g, 0xae); thrust(g); restartHeroAnim(g); }
  else if (a === 0xb4) { heroAnim(g, 0xb0); coast(g); restartHeroAnim(g); }
  else if (a === 0xb6) { heroAnim(g, 0xb4); coast(g); restartHeroAnim(g); }
  else if (a === 0xb2) leaveSuit(g);
  else if (a === 0xac) { setDir(g, (ram[V.dir] & 3) | 4); thrust(g); }
}

/** $94D9 */
function suitRight(g: Game) {
  const { ram } = g;
  if (ram[V.flySpeedX]) return;
  const a = ram[V.anim];
  if (a === 0xb4) { heroAnim(g, 0xb6); thrust(g); restartHeroAnim(g); }
  else if (a === 0xb0) { heroAnim(g, 0xb4); thrust(g); restartHeroAnim(g); }
  else if (a === 0xae) { heroAnim(g, 0xb0); coast(g); restartHeroAnim(g); }
  else if (a === 0xac) { heroAnim(g, 0xae); coast(g); restartHeroAnim(g); }
  else if (a === 0xb2) leaveSuit(g);
  else if (a === 0xb6) { setDir(g, (ram[V.dir] & 3) | 8); thrust(g); }
}

/** $95D7 */
function suitLeftSpeed(g: Game) {
  const { ram } = g;
  const a = ram[V.anim];
  if (a === 0xac && !(ram[V.dir] & 8)) { if (ram[V.flySpeedX] < 3) ram[V.flySpeedX]++; }
  else if ((a === 0xac || a === 0xb6) && ram[V.flySpeedX]) ram[V.flySpeedX]--;
}

/** $95FA */
function suitRightSpeed(g: Game) {
  const { ram } = g;
  const a = ram[V.anim];
  if (a === 0xb6 && !(ram[V.dir] & 4)) { if (ram[V.flySpeedX] < 3) ram[V.flySpeedX]++; }
  else if ((a === 0xb6 || a === 0xac) && ram[V.flySpeedX]) ram[V.flySpeedX]--;
}

/** $9776: flying on (facing the way he's going), energy, the recharge cell. */
function suitDrift(g: Game) {
  const { ram } = g;
  const a = ram[V.anim];
  let way = -1;
  if (a === 0xac) way = ram[V.dir] & 8 ? -1 : 4;
  else if (a === 0xb6) way = ram[V.dir] & 4 ? -1 : 8;
  else way = 0;
  if (way >= 0) { ram[V.joystick] = way; setDir(g, (ram[V.dir] & 3) | way); }
  if (!ram[V.suitEnergy] && ram[V.anim] !== 0xb2) {
    // out of energy: the armour drops
    setDir(g, 2);
    ram[V.speedY] = 1; ram[V.speedY + 1] = 1;
    g.say(0x88);
  }
  if (ram[0xa7] & 0x80) {
    // the recharge cell is used
    ram[V.suitEnergy] = 0x1f; ram[0xa7] = 0x1f;
    ram[V.request + 1] = 0x93;
  }
  if (ram[V.suitEnergy] && ram[V.suitEnergy] < 8) g.say(0x8a);
}

/** ENHANCED: an armour out of energy always lets Tal out (sets down, the interlock doesn't hold). */
export const emptyLetsOut = (g: Game) => g.enhanced && !g.ram[V.suitEnergy];

/**
 * ENHANCED: an armour out of energy that comes down on a floor sets down there, standing ($B2)
 * whichever way it faces, and stops ($80, $81), so left or right lets Tal out. The original
 * ($97AA) drops it and it bounces on the floor for good, steering dead, unless it's turned to
 * face out first ($B0, the one frame it lands in): which takes pushing the other way from the
 * way it flew until it slows to a stop and turns. Held the way it flew, or let go, it never lands.
 */
function settleEmpty(g: Game) {
  if (!emptyLetsOut(g)) return false;
  g.ram[V.flySpeedX] = g.ram[V.flySpeedY] = 0;
  return true;
}

/**
 * $961D: leave the armour where it stands (not in the first ten rooms: too much radiation, "HIGH
 * RADIATION SAFETY INTERLOCK OPERATIVE"). There, out of energy, the original keeps him in for
 * good: the armour can't fly, nothing in it can hurt him, so the game never ends. ENHANCED: an
 * empty armour's interlock doesn't hold him (out there the radiation is his to face). In New Game+
 * there's no radiation, and no interlock (plus.ts).
 */
function leaveSuit(g: Game) {
  const { ram } = g;
  if (ram[V.room] < 0x0a && !emptyLetsOut(g) && !isPlus(ram)) { g.say(0x87); return; }
  if (ram[V.anim] !== 0xb2 || ram[V.anim + 1] !== 0xb3) return;
  if ((ram[V.dying] | ram[V.appearing]) & 0x80 || ram[0x93]) return;
  ram[V.suitRoom] = ram[V.room];
  ram[0x0206] = ram[0x0208] = ram[V.suitX] = ram[0x0200];
  ram[0x0207] = ram[V.suitY] = ram[0x0201];
  ram[0x0209] = ram[0x0203];
  ram[V.suitXHigh] = ram[V.spriteXHigh];
  ram[V.spriteXHigh] &= 0xe7;
  if (ram[V.spriteXHigh] & 1) ram[V.spriteXHigh] |= 0x18;
  ram[V.anim + 3] = 0xc0; ram[V.anim + 4] = 0xc1; // the empty armour
  ram[V.animDelay + 3] = 0; ram[V.animDelay + 4] = 0;
  ram[V.appearTimer] = 0; ram[V.appearTimer + 1] = 0; ram[V.appearStep] = 0; ram[V.appearStep + 1] = 0;
  ram[V.animPos + 3] = 2; ram[V.animPos + 4] = 2;
  ram[V.inSuit] = 2;
  ram[V.speedX] = 2; ram[V.speedX + 1] = 2;
  g.w(0xd025, 8); g.w(0xd026, 9);
  ram[V.spriteEnable] &= 0xfc;
  ram[V.appearing] = 0x88; ram[V.appearing + 1] = 0x89; // Tal steps out
  ram[V.request] = 0x96; ram[V.request + 1] = 0x97;
  restartHeroAnim(g);
}

/** $96CC: fire in the armour: the Pulsar Beam (once fitted). */
function suitFire(g: Game) {
  const { ram } = g;
  if (ram[V.anim + 2] & 0x80) return;
  ram[V.spriteXHigh] = (ram[V.spriteXHigh] & 0xfb) | ((ram[V.spriteXHigh] << 2) & 4);
  const a = ram[V.anim];
  if (a !== 0xac && a !== 0xb6) return;
  if (!(ram[0x067e] & 0x80)) { g.say(0x86); return; }
  const left = a === 0xac;
  const way = left ? 4 : 8;
  ram[0x73] = way;
  ram[V.anim + 2] = left ? 0xbe : 0xbf;
  const x = ram[0x0200] + (left ? -0x18 : 0x18);
  ram[0x0204] = x & 0xff;
  if (left && x < 0) ram[V.spriteXHigh] &= ram[NOT_BIT + 2];
  if (!left && x > 0xff) ram[V.spriteXHigh] |= ram[BIT + 2];
  ram[0x0205] = (ram[0x0201] + 0x0b) & 0xff;
  ram[V.move + 2] = 0x82;
  resetMove(g, 2);
  ram[V.animDelay + 2] = 0; ram[V.animPos + 2] = 2;
  const script = g.word(MOVES + ((0x82 << 1) & 0xff));
  ram[script + 4] = way;
  g.sound1(0x98);
}

// ---- the hero against the room ($9A5C) --------------------------------------------------------

/** $9A5C: before sprites move: floors, ceilings and walls for the hero. */
export function heroPhysics(g: Game) {
  const { ram } = g;
  if (ram[V.titleMode] & 0x80) return;
  if ([0xa6, 0xaa, 0xa8, 0x88].includes(ram[V.anim])) return;
  const d = ram[V.dir];
  if (inSuit(g)) {
    if (d & 1) suitCeiling(g);
    if (d & 2) suitFloor(g);
    if (d & 4) suitWall(g, false);
    if (d & 8) suitWall(g, true);
    return;
  }
  if (!(ram[V.jumping] & 0x80)) startFalling(g);
  if (d & 1) rising(g);
  if (d & 2) falling(g);
  if (d & 4) wall(g, false);
  if (d & 8) wall(g, true);
}

/** $9ABD: going up in a jump: slower each frame, until the top (or a ceiling). */
function rising(g: Game) {
  const { ram } = g;
  if (ceiling(g)) ram[V.jumpStep] = 0;
  else if (ram[V.jumpStep]) {
    ram[V.jumpStep]--;
    ram[V.speedY] = ram[V.speedY + 1] = ram[JUMP_SPEEDS + ram[V.jumpStep]];
    return;
  }
  heroAnim(g, ram[V.anim] === 0x98 ? 0x9a : 0x94);
  setDir(g, ram[V.dir] ^ 3);
  restartHeroAnim(g);
}

/** $9B06: coming down: faster each frame, until the floor. */
function falling(g: Game) {
  const { ram } = g;
  const fast = ram[V.jumpStep] >= 0x13;
  if (onGround(g)) { land(g); return; }
  if (fast) return;
  ram[V.jumpStep]++;
  ram[V.speedY] = ram[V.speedY + 1] = ram[JUMP_SPEEDS + ram[V.jumpStep]];
}

/** $9B29 */
function land(g: Game) {
  const { ram } = g;
  const a = ram[V.anim];
  if ([0x9a, 0x86, 0x82, 0xa0].includes(a)) { heroAnim(g, 0x9c); restartHeroAnim(g); }
  else if (a !== 0x9c) { heroAnim(g, 0x96); restartHeroAnim(g); }
  setDir(g, 0);
  ram[V.jumping] = 0;
  snapToRow(g);
}

/** $9B6B: walking off an edge: fall. */
function startFalling(g: Game) {
  const { ram } = g;
  if (onGround(g) || ram[V.dir] & 1) return;
  setDir(g, ram[V.dir] | 2);
  ram[V.jumpStep] = 0;
  ram[V.jumping] = 0x80;
  const a = ram[V.anim];
  if (a === 0x80 || a === 0x84) { heroAnim(g, 0x94); restartHeroAnim(g); }
  else if (a === 0x82 || a === 0x86) { heroAnim(g, 0x9a); restartHeroAnim(g); }
}

/** $9BBB, $9BFF: a wall ahead: stop (walking), or drop (in the air). */
function wall(g: Game, right: boolean) {
  const { ram } = g;
  if (wallClear(g, right) < 0) return;
  if (ram[V.anim] === (right ? 0x82 : 0x80)) {
    setDir(g, 0);
    heroAnim(g, right ? 0x86 : 0x84);
  } else {
    setDir(g, 2);
    ram[V.jumpStep] = 0;
    ram[V.jumping] = 0x80;
    heroAnim(g, right ? 0x9a : 0x94);
  }
  restartHeroAnim(g);
}

/** $9C43: the armour bumps a ceiling. */
function suitCeiling(g: Game) {
  const { ram } = g;
  if (!ceiling(g)) return;
  ram[V.request] = 0x8b;
  setDir(g, (ram[V.dir] & 0x0c) | 2);
}

/**
 * $9C5D: the armour reaches a floor: lands (taking off) or bounces. ENHANCED: out of energy it
 * lands whichever way it faces (`settleEmpty`).
 */
function suitFloor(g: Game) {
  const { ram } = g;
  if (!onGround(g)) return;
  if (ram[V.anim] === 0xb0) {
    ram[V.request] = 0xa0;
    setDir(g, 0);
    heroAnim(g, 0xb2);
  } else if (settleEmpty(g)) {
    ram[V.request] = 0xa0;
    setDir(g, 0);
    heroAnim(g, 0xb2);
    restartHeroAnim(g);
  } else {
    ram[V.request] = 0x8b;
    setDir(g, (ram[V.dir] & 0x0c) | 1);
  }
  snapToRow(g);
}

/** $9C9C, $9CBF: the armour bumps a wall (or a force field, $FF): bounces back at half speed. */
function suitWall(g: Game, right: boolean) {
  const { ram } = g;
  if (wallClear(g, right) < 0 && forceField(g, right) < 0) return;
  ram[V.request] = 0x8b;
  setDir(g, (ram[V.dir] & 3) | (right ? 4 : 8));
  ram[V.flySpeedX] >>= 1;
}

// ---- where the hero is on the screen ($8F67-$9061) ---------------------------------------------

/** $8F87: the text column (Y) of sprite 0's left edge + 3... as the original works it out. */
function heroColumn(g: Game) {
  const v = ((g.r(0xd010) & 1) << 8) | g.r(0xd000);
  let c = v >> 3;
  if (v & 4) c++;
  return (c - 3) & 0xff;
}

/** $8F73: the text row of sprite 0's top, less `from` (rounded). */
function heroRow(g: Game, from: number) {
  let y = g.r(0xd001);
  if (y < from) y = from;
  const d = (y - from) & 0xff;
  return (d >> 3) + ((d >> 2) & 1);
}

/** $8FA3: the floor under the hero's feet ($84). */
function onGround(g: Game) {
  const { ram } = g;
  let row = ((ram[0x0201] - 0x10) & 0xff) >> 3;
  if (row >= 0x0f) row = 0x0f;
  const col = (heroColumn(g) + 1) & 0xff;
  ram[0x84] = 0;
  if (inList(g, OPEN_BELOW, 10, colourAt(g, row, col)) < 0 && ram[V.dir + 1] & 2) return false;
  if (row >= 0x0f) return false;
  if (inList(g, OPEN_BELOW, 10, colourAt(g, row + 1, col)) >= 0) return false;
  ram[0x84] = 0x80;
  return true;
}

/** $8FFA: a ceiling over the hero's head ($83). Out of the armour, only the top of the screen. */
function ceiling(g: Game) {
  const { ram } = g;
  const from = inSuit(g) ? 0x32 : 0x2e;
  const row = heroRow(g, from), col = (heroColumn(g) + 1) & 0xff;
  ram[0x83] = 0;
  if (from >= g.r(0xd001)) return false;
  if (!inSuit(g) && row) return false;
  if (inList(g, OPEN_BELOW, 10, colourAt(g, row, col)) >= 0) return false;
  if (row && inList(g, OPEN_BELOW, 10, colourAt(g, row - 1, col)) >= 0) return false;
  ram[0x83] = 0x80;
  return true;
}

/** $9061: stand on the row: the feet at the bottom of a text row. */
function snapToRow(g: Game) {
  const { ram } = g;
  ram[0x0203] = ((((ram[0x0203] - 0x32) & 0xff) | 7) + 0x2e) & 0xff;
  ram[0x0201] = (ram[0x0203] - 0x15) & 0xff;
}

/** The rows the hero's side covers: from his top (the first rows, if he's above the screen) to 5 down. */
function sideRows(g: Game) {
  const { ram } = g;
  const top = heroRow(g, 0x32);
  const above = ram[0x0201] <= 0x32 ? ((0x32 - ram[0x0201]) & 0xff) >> 3 : 0;
  return { top, count: (4 - above) & 0xff };
}

/** $9CE2, $9D42: is the hero's left (right) side clear? ($45: negative = clear). */
function wallClear(g: Game, right: boolean) {
  const { ram } = g;
  const col = (heroColumn(g) + (right ? 2 : 0)) & 0xff;
  let { top: row, count } = sideRows(g);
  ram[0x45] = count;
  for (;;) {
    const r = row >= 0x0f ? 0x0f : row;
    const c = colourAt(g, r, col);
    if (inSuit(g) && row === 0 && c) return ram[0x45];
    if (inList(g, OPEN, 12, c) < 0) return ram[0x45];
    row = (row + 1) & 0xff;
    ram[0x45] = (ram[0x45] - 1) & 0xff;
    if (ram[0x45] & 0x80) return -1;
  }
}

/** $9DA4, $9DD8: a force field (character $FF) beside the armour. */
function forceField(g: Game, right: boolean) {
  const { ram } = g;
  const col = (heroColumn(g) + (right ? 2 : 0)) & 0xff;
  let row = heroRow(g, 0x32);
  ram[0x45] = 4;
  for (;;) {
    const r = row >= 0x0f ? 0x0e : row;
    if (ram[(rowAt(g, r) + col) & 0xffff] === 0xff) { ram[V.request + 1] = 0xa7; return ram[0x45]; }
    row = (row + 1) & 0xff;
    ram[0x45] = (ram[0x45] - 1) & 0xff;
    if (ram[0x45] & 0x80) return -1;
  }
}

/** $A51E, $A56E: something that hurts beside the hero (the index of what, or -1). */
export function hurtingBeside(g: Game, right: boolean) {
  const { ram } = g;
  const col = (heroColumn(g) + (right ? 2 : 0)) & 0xff;
  let { top: row, count } = sideRows(g);
  ram[0x45] = count;
  for (;;) {
    const r = row >= 0x0f ? 0x0f : row;
    const k = inList(g, HURTS, 4, colourAt(g, r, col));
    if (k >= 0) return k;
    row = (row + 1) & 0xff;
    ram[0x45] = (ram[0x45] - 1) & 0xff;
    if (ram[0x45] & 0x80) return -1;
  }
}

// ---- the armour hovering, the power centre ----------------------------------------------------

/** $97E7: the empty-handed armour bobs gently in the air. */
export function hover(g: Game) {
  const { ram } = g;
  if (ram[V.titleMode] & 0x80) return;
  if (!ram[V.hoverTimer]) {
    if (!inSuit(g) || ram[V.anim] === 0xb2 || ram[V.speedY]) return;
    ram[V.hover] &= 3;
    const d = ram[HOVER + ram[V.hover]] & 1 ? 1 : -1;
    ram[0x0201] = (ram[0x0201] + d) & 0xff; ram[0x0203] = (ram[0x0203] + d) & 0xff;
    ram[V.hoverTimer] = 9;
    ram[V.hover]++;
  }
  ram[V.hoverTimer]--;
}

/** $9825: in the power centre (room 0): its lights cycle, and standing on it with the mine primed sets it off. */
export function powerCentre(g: Game) {
  const { ram } = g, col = g.m.colour;
  if (ram[V.titleMode] & 0x80 || ram[V.room]) return;
  let c = col[0x63];
  do { c = (c + 1) & 15; } while (!(c & 7));
  c &= 7;
  for (const at of [0x63, 0xda, 0xdb, 0xdc, 0x1f2, 0x1f3, 0x1f4]) col[at] = c;
  if (ram[V.anim] !== 0xb2 || ram[0xb1] & 0x80) return;
  let row = ((ram[0x0201] - 0x10) & 0xff) >> 3;
  row++;
  if (row >= 0x0f) row = 0x0f;
  const code = ram[(rowAt(g, row) + heroColumn(g) + 1) & 0xffff];
  if (inList(g, POWER_CENTRE, 3, code) < 0) return;
  if (!(ram[0x0681] & 0x80)) return;
  ram[0xb1] = ram[0x0681];
  ram[V.timer69] = 0x32;
  g.say(0x93);
}
