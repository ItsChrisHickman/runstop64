/**
 * Copy the original's state (a reference machine's RAM) into the port's
 * Game, and compare the two: the map from the original's addresses to the
 * port's fields, in one place.
 */
import type { C64 } from '../../../packages/c64kit/src/c64/machine';
import { indicesPng } from '../../../tools/probe/render';
import type { Game } from '../src/game';

export function syncFrom(m: C64, g: Game) {
  const r = m.ram;
  g.room = r[0xb9] | (r[0xba] << 8);
  g.colour = r[0x27];
  for (let i = 0; i < 4; i++) g.roomColours[i] = r[0x28 + i];
  Object.assign(g.rng, { a: r[0x67], b: r[0x68], c: r[0x3f], d: r[0x40], s1: r[0x3b], s2: r[0x3c] });
  g.barrierGone.set(r.subarray(0x032e, 0x033e));
  g.lo.set(r.subarray(0x0400, 0x0800));
  g.items.forEach((it, i) => {
    it.col = r[0x0890 + i]; it.row = r[0x08a4 + i]; it.roomLo = r[0x08b8 + i]; it.roomHi = r[0x08cc + i]; it.graphic = r[0x08e0 + i];
  });
  g.shown.forEach((s, i) => { s.graphic = r[0x0923 + i]; s.col = r[0x093d + i]; s.row = r[0x0957 + i]; });
  g.shownAt = r[0x0c];
  for (let i = 0; i < 4; i++) g.carried[i] = r[0xd9 + i];
  g.spawnCol.set(r.subarray(0x0902, 0x0912));
  g.spawnRow.set(r.subarray(0x0912, 0x0922));
  g.spawnCount = r[0xb8];
  g.padCol = r[0x7c]; g.padRow = r[0x7d];
  g.cheopsOffer = r[0xd7];
  g.pendingScore = r[0xcd];
  // BLOB, the exit he came by, the sprites
  g.riding = r[0x70]; g.exit = r[0x33]; g.exitCol = r[0x34]; g.exitRow = r[0x35];
  g.col = r[0x71]; g.row = r[0x72]; g.sub = r[0x6a]; g.stepTimer = r[0x5c]; g.falling = r[0x9a];
  g.fallHeight = r[0x78]; g.inLift = r[0xf8]; g.arrived = r[0xc1];
  g.inputPlatform = r[0x79]; g.inputPickup = r[0x95]; g.padX = r[0x56];
  g.cell = ((r[0x7a] | (r[0x7b] << 8)) - 0xd800) & 0xffff;
  const sp = g.sprites;
  for (let i = 0; i < 8; i++) { sp.x[i] = r[0x9b + 2 * i]; sp.y[i] = r[0x9c + 2 * i]; sp.ptr[i] = r[0x5ff8 + i]; sp.colour[i] = m.vic[0x27 + i] & 15; }
  sp.msb = r[0xab]; sp.enable = r[0xac];
  // the panel
  g.energy = r[0xd3]; g.platformsLeft = r[0xd4]; g.charge = r[0xd5]; g.panelDirty = r[0xd6];
  for (let i = 0; i < 6; i++) g.score[i] = r[0xbb + i];
  g.scoreRoll = r[0xcc]; g.scoreSpeed = r[0x54]; g.scoreTimer = r[0x55];
  g.lives = [r[0xd1], r[0xd2]];
  g.livesRoll = r[0xe3]; g.livesSteps = r[0xe2]; g.livesDir = r[0xe7];
  g.frames = r[0x8b];
  g.laser = r[0xed];
  // enemies
  g.enemies.forEach((e, i) => Object.assign(e, {
    state: r[0x033e + i], timer: r[0x0342 + i], move: r[0x0346 + i], kind: r[0x034a + i], anim: r[0x034e + i],
    dx: r[0x0352 + i], dy: r[0x0356 + i], pause: r[0x035a + i], speed: r[0x035e + i],
    cell: ((r[0x0366 + i] | (r[0x0362 + i] << 8)) - 0xd800) & 0xffff, base: r[0x036a + i],
  }));
  g.collide = r[0x3d]; g.padShown = r[0x19];
  g.cacheAt = r[0x57]; g.cacheRoomLo[0] = r[0x58]; g.cacheRoomLo[1] = r[0x59]; g.cacheRoomHi[0] = r[0x5a]; g.cacheRoomHi[1] = r[0x5b];
  g.spawnSpotCount = (r[0x1f] + 1) & 0xff;
  g.enemyPlaceCount = r[0x51];
  for (let i = 0; i < 4; i++) {
    g.enemyPlaceX[i] = r[0x03e6 + i]; g.enemyPlaceY[i] = r[0x03ea + i];
    g.enemyPlaceCell[i] = ((r[0x03ee + i] | (r[0x03f2 + i] << 8)) - 0xd800) & 0xffff;
  }
  // the core
  g.core.set(r.subarray(0x08f4, 0x08fd)); g.coreSlots.set(r.subarray(0x08fd, 0x0902)); g.carriedCount = r[0x97];
  // the screen: bank 1 and colour RAM
  g.scr.bank.set(r.subarray(0x4000, 0x8000));
  g.scr.attr.set(m.colour);
}

/** Differences between the original's state and the port's, as readable lines (empty: identical). */
export function compare(m: C64, g: Game, what: { screen?: boolean; state?: boolean } = { screen: true, state: true }) {
  const r = m.ram;
  const out: string[] = [];
  const diff = (name: string, a: ArrayLike<number>, b: ArrayLike<number>, mask = 0xff) => {
    let n = 0, first = -1;
    for (let i = 0; i < a.length; i++) if ((a[i] & mask) !== (b[i] & mask)) { n++; if (first < 0) first = i; }
    if (n) out.push(`${name}: ${n} differ, first at +${first} (orig ${a[first]?.toString(16)}, port ${b[first]?.toString(16)})`);
  };
  if (what.screen) {
    diff('bitmap', r.subarray(0x6000, 0x7f40), g.scr.bank.subarray(0x2000, 0x3f40));
    diff('colours', r.subarray(0x5c00, 0x5fe8), g.scr.bank.subarray(0x1c00, 0x1fe8));
    diff('attributes', m.colour.subarray(0, 1000), g.scr.attr.subarray(0, 1000), 0x0f);
    diff('cells ($0400)', r.subarray(0x0400, 0x07e8), g.lo.subarray(0, 0x3e8));
  }
  if (what.state) {
    const v = (name: string, a: number, b: number) => { if (a !== b) out.push(`${name}: orig ${a.toString(16)}, port ${b.toString(16)}`); };
    v('rng a', r[0x67], g.rng.a); v('rng b', r[0x68], g.rng.b); v('rng c', r[0x3f], g.rng.c); v('rng d', r[0x40], g.rng.d);
    v('colour', r[0x27], g.colour);
    v('tile flags', r[0x90], g.tileFlags);
    v('spawn count', r[0xb8], g.spawnCount);
    v('objects', r[0x69], g.objectCount * 3);
    v('pad', r[0x7c] | (r[0x7d] << 8), g.padCol | (g.padRow << 8));
    v('arrive', r[0x7f] | (r[0x7e] << 8), g.arriveCol | (g.arriveRow << 8));
    v('enemy places', r[0x51], g.enemyPlaceCount);
    v('shown at', r[0x0c], g.shownAt);
    v('pending score', r[0xcd], g.pendingScore);
    v('spark ring', r[0x80], g.sparkAt);
    g.items.forEach((it, i) => {
      v(`item ${i}`, r[0x0890 + i] | (r[0x08a4 + i] << 8), it.col | (it.row << 8));
    });
    g.shown.forEach((s, i) => v(`shown ${i}`, r[0x0923 + i] | (r[0x093d + i] << 8) | (r[0x0957 + i] << 16), s.graphic | (s.col << 8) | (s.row << 16)));
  }
  return out;
}

/** The screen (bitmap mode, no sprites) of either side as a PNG. */
export function screenPng(file: string, bitmap: ArrayLike<number>, colours: ArrayLike<number>) {
  const W = 320, H = 200;
  const px = new Uint8Array(W * H);
  for (let cell = 0; cell < 1000; cell++) {
    const cx = (cell % 40) * 8, cy = Math.floor(cell / 40) * 8, c = colours[cell];
    for (let y = 0; y < 8; y++) {
      const b = bitmap[cell * 8 + y];
      for (let x = 0; x < 8; x++) px[(cy + y) * W + cx + x] = b & (0x80 >> x) ? c >> 4 : c & 15;
    }
  }
  indicesPng(file, px, W, H);
}
