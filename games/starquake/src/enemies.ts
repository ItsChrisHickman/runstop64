import { rom } from './data';
import type { Game } from './game';

/**
 * Enemies (the original's $1200 module): up to four, as sprites 4-7 (three
 * when the hover pad has sprite 4). They wait, materialise at a free spot by
 * the room's edges (deadly to touch while they do), fly about by their kind's
 * rules, drain BLOB's energy on contact (some kill outright), and die to the
 * laser. Spiky plants (tile places) stand still and kill. The last two rooms'
 * enemies are remembered, so going back finds them where they were.
 * The same machinery throws BLOB's fragments about when he dies.
 */

export interface Enemy {
  /** $033E: 1 waiting, 2 materialising, 3 about, 4 dying, 5 gone (or the pad's slot). */
  state: number;
  /** $0342: frames to the next change. */
  timer: number;
  /** $0346: how it moves (1 straight, 2 and 3 wander, 4 homes in, 5 homes in with pauses). */
  move: number;
  /** $034A: its kind (0 kills, $0F kills (materialising, plants, fragments), others drain energy). */
  kind: number;
  /** $034E: animation counter. */
  anim: number;
  /** $0352, $0356: direction (-1, 0, 1). */
  dx: number; dy: number;
  /** $035A: pausing (move 5). */
  pause: number;
  /** $035E: speed (pixels a frame). */
  speed: number;
  /** $0362/$0366: its cell (attribute address - $D800). */
  cell: number;
  /** $036A: its first sprite pointer. */
  base: number;
}

export const newEnemy = (): Enemy => ({ state: 0, timer: 0, move: 0, kind: 0, anim: 0, dx: 0, dy: 0, pause: 0, speed: 0, cell: 0, base: 0 });

const BIT = [0x10, 0x20, 0x40, 0x80];
const s8 = (v: number) => (v & 0x80 ? v - 256 : v);

/** $18B9: a wait of 7-38 frames. */
const wait = (g: Game) => ((g.rng.next() & 0x1f) + 7) & 0xff;
/** $18C2: -1 or +1. */
const plusMinus = (g: Game) => ((g.rng.both() & 2) - 1) & 0xff;

/** $1212: a room's enemies (or the remembered ones, if BLOB has just been here). */
export function enter(g: Game) {
  g.collide = 1;
  findSpawns(g);
  for (const e of g.enemies) e.state = 1;
  let t = wait(g);
  let carry = 0;
  for (let i = 0; i < 4; i++) {
    g.enemies[i].timer = t;
    const s = t + 7 + carry;
    carry = s > 0xff ? 1 : 0;
    t = s & 0xff;
  }
  g.scr.bank.fill(0, 0x1a80, 0x1b80);
  placePlants(g);
  restore(g);
}

/**
 * $1246: spots enemies can appear at: along the room's four edges, every
 * 3×3 cells free of anything ($036E-$03C8, `spawnSpots`).
 */
function findSpawns(g: Game) {
  g.spawnSpotCount = 0;
  const scan = (cell: number, step: number, n: number, x: number, y: number, across: boolean) => {
    for (let k = n; k >= 0; k--) {
      const a = g.scr.attr;
      let bits = 0;
      for (const o of [0x29, 0x2a, 0x2b, 0x51, 0x52, 0x53, 0x79, 0x7a, 0x7b]) bits |= a[(cell + o) & 0x3ff];
      const advance = () => { cell += step; if (across) x = (x + 4) & 0xff; else y = (y + 8) & 0xff; };
      if (!(bits & 15)) {
        g.spawnSpots[g.spawnSpotCount++ % g.spawnSpots.length] = { cell, x, y };
        advance(); k--;
        advance(); k--;
      }
      advance();
    }
  };
  scan(0xcb, 1, 0x1f, 0x1c, 0x62, true);
  scan(0x112, 0x28, 0x0d, 0x98, 0x6a, false);
  scan(0x34b, 1, 0x1f, 0x1c, 0xe2, true);
  scan(0xcb, 0x28, 0x0d, 0x1c, 0x62, false);
}

/** $167B: the room's plants (deadly, standing still) at its enemy places. */
function placePlants(g: Game) {
  const sp = g.sprites;
  let x = 3;
  for (;;) {
    g.enemyPlaceCount = (g.enemyPlaceCount - 1) & 0xff;
    if (g.enemyPlaceCount & 0x80) return;
    const e = g.enemies[x];
    e.state = 3; e.base = 0x62; sp.ptr[4 + x] = 0x62;
    sp.colour[4 + x] = rom(0x1b72 + (g.rng.both() & 7));
    e.move = 1; e.anim = x; e.kind = 0x0f; e.speed = 1; e.dy = 0;
    e.dx = plusMinus(g);
    e.cell = g.enemyPlaceCell[x];
    sp.y[4 + x] = g.enemyPlaceY[x];
    const xx = g.enemyPlaceX[x] << 1;
    sp.x[4 + x] = xx & 0xff;
    sp.msb = xx > 0xff ? sp.msb | BIT[x] : sp.msb & ~BIT[x] & 0xff;
    sp.enable |= BIT[x];
    x--;
    if (g.padShown && x === 0) return;
    if (x < 0) return;
  }
}

/** $17EB: which of the two remembered rooms this is (0 or 1), or -1 (and the slot to use). */
function cacheSlot(g: Game) {
  const lo = g.room & 0xff, hi = g.room >> 8;
  if (lo === g.cacheRoomLo[0] && hi === g.cacheRoomHi[0]) return { slot: 0, at: 0 };
  if (lo === g.cacheRoomLo[1] && hi === g.cacheRoomHi[1]) return { slot: 1, at: 0x42 };
  return { slot: -1, at: g.cacheAt ^ 0x42 };
}

/** $16F0: remember the room's enemies on leaving it. */
export function leave(g: Game) {
  const c = cacheSlot(g);
  g.cacheAt = c.at;
  let slot = c.slot;
  if (slot < 0) slot = c.at ? 1 : 0;
  g.cacheRoomHi[slot] = g.room >> 8;
  g.cacheRoomLo[slot] = g.room & 0xff;
  const sp = g.sprites;
  g.cache[c.at ? 1 : 0] = {
    enemies: g.enemies.map((e) => ({ ...e })),
    colour: [...sp.colour.subarray(4, 8)], ptr: [...sp.ptr.subarray(4, 8)],
    x: [...sp.x.subarray(4, 8)], y: [...sp.y.subarray(4, 8)],
    enable: sp.enable & 0xf0, msb: sp.msb & 0xf0,
  };
}

/** $1746: back in a remembered room: its enemies as they were. */
function restore(g: Game) {
  const c = cacheSlot(g);
  if (c.slot < 0) return;
  const saved = g.cache[c.at ? 1 : 0];
  if (!saved) return;
  saved.enemies.forEach((e, i) => Object.assign(g.enemies[i], e));
  const sp = g.sprites;
  if (!g.padShown) {
    for (let i = 0; i < 4; i++) { sp.colour[4 + i] = saved.colour[i]; sp.ptr[4 + i] = saved.ptr[i]; sp.x[4 + i] = saved.x[i]; sp.y[4 + i] = saved.y[i]; }
    const keep = g.enemies[0].state === 5 ? 0xe0 : 0xf0;
    sp.enable = (sp.enable & 0x0f) | (saved.enable & keep);
    sp.msb = (sp.msb & 0x0f) | saved.msb;
  } else {
    for (let i = 1; i < 4; i++) { sp.colour[4 + i] = saved.colour[i]; sp.ptr[4 + i] = saved.ptr[i]; sp.x[4 + i] = saved.x[i]; sp.y[4 + i] = saved.y[i]; }
    g.enemies[0].state = 5;
    sp.enable = (sp.enable & 0x1f) | (saved.enable & 0xe0);
    sp.msb = (sp.msb & 0x1f) | (saved.msb & 0xe0);
  }
}

/**
 * $13D4: the core's guardians: one for every two pieces put back, flying
 * round the core from fixed places (straight, as they last moved).
 */
export function guardians(g: Game) {
  const n = (9 - g.coreMissing) >> 1;
  for (const e of g.enemies) e.state = 5;
  if (!n) return;
  const sp = g.sprites;
  for (let x = n - 1; x >= 0; x--) {
    const e = g.enemies[x];
    e.state = 3; e.move = 1; sp.colour[4 + x] = 1; e.anim = x;
    e.base = 0x5e; sp.ptr[4 + x] = 0x5e;
    e.speed = 3; e.kind = 0x0f;
  }
  for (let i = 0; i < 4; i++) {
    sp.x[4 + i] = rom(0x1b7a + 2 * i);
    sp.y[4 + i] = rom(0x1b7b + 2 * i);
    g.enemies[i].cell = ((rom(0x1b86 + i) | (rom(0x1b82 + i) << 8)) - 0xd800) & 0xffff;
  }
  sp.enable |= rom(0x1bca + ((n - 1) & 0xff));
  sp.msb = 0;
}

/** $1437: the enemies' frame. */
export function tick(g: Game) {
  let x = 0;
  if (g.padShown) { g.enemies[0].state = 5; x = 1; }
  for (; x < 4; x++) one(g, x);
}

function one(g: Game, x: number) {
  const e = g.enemies[x];
  const sp = g.sprites;
  const n = 4 + x;
  switch (e.state) {
    case 1: // waiting
      e.timer = (e.timer - 1) & 0xff;
      if (e.timer) return;
      e.state = 2;
      e.base = 0x5a; sp.ptr[n] = 0x5a; sp.colour[n] = 1;
      e.timer = wait(g);
      e.move = 1; e.anim = 0; e.kind = 0x0f;
      sp.enable |= BIT[x];
      e.speed = 1; e.dx = 1; e.dy = 1;
      spawnAt(g, x);
      g.sound.effect(rom(0x1bce + (g.rng.both() & 3)), 2);
      return;
    case 2: // materialising
      move(g, x);
      e.timer = (e.timer - 1) & 0xff;
      if (e.timer) return;
      e.speed = rom(0x1bc6 + (g.rng.both() & 3));
      e.state = 3;
      sp.colour[n] = rom(0x1b72 + (g.rng.both() & 7));
      e.anim = 0;
      e.move = rom(0x1bae + (g.rng.both() & 7));
      e.kind = e.move === 5 ? 0 : rom(0x1bb6 + (g.rng.both() & 15));
      graphics(g, x);
      return;
    case 3: // about
      move(g, x);
      if (collide(g, x)) return;
      e.state = 4;
      sp.colour[n] = 1;
      void (g.rng.both() & 7);
      e.move = 1;
      e.timer = wait(g);
      e.base = 0x66;
      e.kind = 0x0f;
      g.sound.effect(rom(0x1bd2 + (g.rng.both() & 1)), 1);
      return;
    case 4: // dying
      move(g, x);
      e.timer = (e.timer - 1) & 0xff;
      if (e.timer) return;
      if (g.rng.next() & 0x80) e.state = 5;
      else { e.timer = wait(g); e.state = 1; }
      sp.enable &= rom(0x1b8e + x);
      return;
  }
}

/** $155D: materialise at one of the room's free edge spots. */
function spawnAt(g: Game, x: number) {
  const e = g.enemies[x];
  const sp = g.sprites;
  // The count less one is used as a mask, as in the original (an empty list reads old entries).
  const i = g.rng.both() & ((g.spawnSpotCount - 1) & 0xff);
  const s = g.spawnSpots[i % g.spawnSpots.length];
  e.cell = s.cell;
  sp.y[4 + x] = s.y;
  const xx = s.x << 1;
  sp.x[4 + x] = xx & 0xff;
  sp.msb = xx > 0xff ? sp.msb | BIT[x] : sp.msb & rom(0x1b8e + x);
}

/**
 * $1591: touching BLOB (energy, or death) and the laser shot (the enemy
 * dies, 5 points). Returns false if the laser got it.
 */
function collide(g: Game, x: number): boolean {
  const sp = g.sprites;
  const n = 4 + x;
  const e = g.enemies[x];
  const half = (v: number, high: boolean) => ((v >> 1) | (high ? 0x80 : 0)) & 0xff;
  const near = (a: number, b: number, mask: number) => {
    let d = (a - b) & 0xff;
    if (d & 0x80) d = (b - a) & 0xff;
    return !(d & mask);
  };
  if (g.collide) {
    if (near(sp.y[n], sp.y[0], 0xf0)) {
      const ex = half(sp.x[n], !!(sp.msb & BIT[x]));
      const bx = half(sp.x[0], !!(sp.msb & 1));
      if (near(bx, ex, 0xf8) && !g.graceActive()) {
        if (e.kind === 0) g.dead = 1;
        else if (e.kind === 0x0f) g.dead = 0x0f;
        else {
          g.energy = g.energy ? g.energy - 1 : 0;
          g.panelDirty |= 1;
        }
      }
    }
  }
  if (!(g.laser & 0x40)) return true;
  if (!near(sp.y[n], sp.y[3], 0xf0)) return true;
  const ex = half(sp.x[n], !!(sp.msb & BIT[x]));
  const lx = half(sp.x[3], !!(sp.msb & 8));
  if (!near(lx, ex, 0xf8)) return true;
  g.laser &= 0x1f;
  sp.enable &= 0xf7;
  g.addScore(5);
  return false;
}

/** $1813: moving, by the enemy's kind of movement. */
function move(g: Game, x: number) {
  const e = g.enemies[x];
  const R = g.rng;
  switch (e.move) {
    case 1: step(g, x); break;
    case 2:
      step(g, x);
      e.timer = (e.timer - 1) & 0xff;
      if (e.timer) break;
      e.timer = R.both() & 0x1f;
      e.dx = rom(0x1baa + (R.both() & 1));
      e.dy = rom(0x1baa + (R.both() & 1));
      break;
    case 3:
      step(g, x);
      e.timer = (e.timer - 1) & 0xff;
      if (e.timer) break;
      e.timer = R.both() & 0x1f;
      e.dx = rom(0x1baa + (R.both() & 3));
      e.dy = rom(0x1baa + (R.both() & 3));
      break;
    case 4:
      step(g, x);
      e.timer = (e.timer - 1) & 0xff;
      if (!(e.timer & 0x80)) break;
      homeIn(g, x);
      e.timer = R.both() & 0x1f;
      break;
    case 5:
      step(g, x);
      if (!e.pause) {
        e.timer = (e.timer - 1) & 0xff;
        if (!(e.timer & 0x80)) break;
        e.timer = e.pause = R.both() & 0x1f;
        homeIn(g, x);
      } else {
        e.speed = 1;
        e.timer = (e.timer - 1) & 0xff;
        if (!(e.timer & 0x80)) break;
        e.speed = e.dy = e.dx = e.pause = 0;
        e.timer = R.both() & 0x1f;
      }
      break;
  }
}

/** $18FF: head for BLOB. */
function homeIn(g: Game, x: number) {
  const sp = g.sprites, e = g.enemies[x], n = 4 + x;
  const sign = (a: number, b: number) => { const d = (a - b) & 0xff; return d === 0 ? 0 : d & 0x80 ? 0xff : 1; };
  e.dy = sign(sp.y[0] >> 1, sp.y[n] >> 1);
  const ex = (((sp.x[n] >> 1) | (sp.msb & BIT[x] ? 0x80 : 0)) >> 1) & 0xff;
  const bx = (((sp.x[0] >> 1) | (sp.msb & 1 ? 0x80 : 0)) >> 1) & 0xff;
  e.dx = sign(bx, ex);
}

/** The attribute bits of cells offset from the enemy's cell. */
function bits(g: Game, cell: number, a: number, b: number, c: number, third: boolean) {
  const at = g.scr.attr;
  let v = at[(cell + a) & 0x3ff] | at[(cell + b) & 0x3ff];
  if (third) v |= at[(cell + c) & 0x3ff];
  return v & 15;
}

/**
 * $1942: a step: across, turning back at the room's sides or anything in
 * the way, then up or down likewise; then its graphics.
 */
function step(g: Game, x: number) {
  const sp = g.sprites, e = g.enemies[x], n = 4 + x, bit = BIT[x];
  const rowOff = (sp.y[n] - 2) & 7;
  let cell = e.cell;
  const dx = s8(e.dx);
  if (dx > 0) {
    if ((sp.msb & bit) && sp.x[n] >= 0x30) e.dx = (-e.dx) & 0xff;
    else {
      let blocked = false;
      if (((sp.x[n] & 7) + e.speed) & 0xf8) {
        if (bits(g, cell, 0x2c, 0x54, 0x7c, rowOff !== 0)) blocked = true;
        else cell = (cell + 1) & 0xffff;
      }
      if (blocked) e.dx = (-e.dx) & 0xff;
      else {
        const v = sp.x[n] + e.speed;
        sp.x[n] = v & 0xff;
        if (v > 0xff) sp.msb |= bit;
      }
    }
  } else if (dx < 0) {
    if (!(sp.msb & bit) && sp.x[n] < 0x30) e.dx = (-e.dx) & 0xff;
    else {
      let blocked = false;
      if (((sp.x[n] & 7) - e.speed) & 0x80) {
        if (bits(g, cell, 0x28, 0x50, 0x78, rowOff !== 0)) blocked = true;
        else cell = (cell - 1) & 0xffff;
      }
      if (blocked) e.dx = (-e.dx) & 0xff;
      else {
        const v = sp.x[n] - e.speed;
        sp.x[n] = v & 0xff;
        if (v < 0) sp.msb &= rom(0x1b8e + x);
      }
    }
  }
  const colOff = sp.x[n] & 7;
  const dy = s8(e.dy);
  let up = dy < 0;
  if (dy > 0) {
    if (sp.y[n] >= 0xda) e.dy = (-e.dy) & 0xff;
    else {
      let blocked = false;
      if ((((sp.y[n] - 2) & 7) + e.speed) & 0xf8) {
        if (bits(g, cell, 0xa1, 0xa2, 0xa3, colOff !== 0)) blocked = true;
        else cell = (cell + 0x28) & 0xffff;
      }
      if (blocked) e.dy = (-e.dy) & 0xff;
      else {
        const v = sp.y[n] + e.speed;
        sp.y[n] = v & 0xff;
        up = v > 0xff; // a carry falls into the upward step, as in the original
      }
    }
  }
  if (up) {
    if (sp.y[n] < 0x64) e.dy = (-e.dy) & 0xff;
    else {
      let blocked = false;
      if ((((sp.y[n] - 2) & 7) - e.speed) & 0x80) {
        if (bits(g, cell, 1, 2, 3, colOff !== 0)) blocked = true;
        else cell = (cell - 0x28) & 0xffff;
      }
      if (blocked) e.dy = (-e.dy) & 0xff;
      else sp.y[n] = (sp.y[n] - e.speed) & 0xff;
    }
  }
  graphics(g, x);
  e.cell = cell;
}

/**
 * $1AA7: the enemy's look: spinning kinds step through their pointers;
 * others' frames (16×16, at $1C00) are copied into the slot's sprite,
 * flipped when heading left.
 */
function graphics(g: Game, x: number) {
  const sp = g.sprites, e = g.enemies[x];
  const kindBits = rom(0x1b92 + e.kind);
  if (kindBits === 0x20) {
    e.anim = (e.anim + (e.dx & 0x80 ? -1 : 1)) & 0xff;
    sp.ptr[4 + x] = (((e.anim >> 1) & 3) + e.base) & 0xff;
    return;
  }
  let y = (e.anim + 1) & 0xff;
  if (y === (kindBits & 0x40 ? 0x10 : 0x0c)) y = 0;
  e.anim = y;
  if (y & 3) return;
  sp.ptr[4 + x] = (x + 0x6a) & 0xff;
  const frame = (rom(0x1ba2 + (y >> 2)) + e.kind * 3) & 0xff;
  const src = 0x1c00 + frame * 32;
  let at = rom(0x1ba6 + x);
  const b = g.scr.bank;
  const flip = (kindBits & 0x80) && (e.dx & 0x80);
  for (let r = 0x1f; r >= 0; r -= 2) {
    if (flip) {
      b[(0x1a7f + at) & 0x3fff] = rom(0xcc03 + rom(src + r));
      b[(0x1a80 + at) & 0x3fff] = rom(0xcc03 + rom(src + r - 1));
    } else {
      b[(0x1a80 + at) & 0x3fff] = rom(src + r);
      b[(0x1a80 + at - 1) & 0x3fff] = rom(src + r - 1);
    }
    at -= 3;
  }
}

/**
 * $131E: BLOB dies: his fragments fly off (as enemies, which can't hurt
 * now), from his place.
 */
export function fragments(g: Game) {
  g.sound.effect(6, 0);
  g.sound.effectIfFree(8, 1);
  g.collide = 0;
  const sp = g.sprites;
  let hi = 0xe0, lo = 0x1f, from = 1;
  if (!g.padShown || g.riding) {
    if (g.padShown) { g.riding = 0; g.padShown = 0; }
    hi = 0xf0; lo = 0x0f; from = 0;
  }
  sp.msb = sp.msb & 1 ? sp.msb | hi : sp.msb & lo;
  sp.enable = 0xf0;
  for (let x = from; x < 4; x++) {
    const e = g.enemies[x];
    e.state = 3; e.move = 2; sp.colour[4 + x] = 1; e.anim = x;
    e.base = 0x66; sp.ptr[4 + x] = 0x66;
    e.speed = 3; e.kind = 0x0f;
    e.cell = g.cell;
    e.dx = plusMinus(g);
    e.dy = plusMinus(g);
    const at = g.scr.attr;
    if (!((at[(g.cell + 1) & 0x3ff] | at[(g.cell + 2) & 0x3ff]) & 2)) {
      e.dy = 0;
      e.timer = 0x0c;
    }
  }
  for (let x = from; x < 4; x++) { sp.y[4 + x] = sp.y[0]; sp.x[4 + x] = sp.x[0]; }
}
