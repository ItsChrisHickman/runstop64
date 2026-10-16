import { exitGridImage, isExtensionRoom, piledriverCfg, warpFound, piledriverGlyphs, SFX, teleporterCfg, teleporterColours, teleporterDests } from './data';
import { ROW, SCREEN, type Game } from './game';

/**
 * Ports of the original Mechanisms (Piledriver = the Mole Crushers, Lift,
 * Teleporter) and the Sinclair C5 drive from FreedomKit. Glyph addresses are
 * charset offsets ($4000-based): the crushers animate by scrolling the bytes
 * of their own characters, exactly as the original does.
 */

// ---- Piledriver (Mole Crusher) ------------------------------------------------------------

const PD_COLS = [[0x80, 0xb0, 0xe0], [0x110, 0x140, 0x170]];

function clearGlyphs(g: Game) {
  g.mem.fill(0, 0x80, 0x80 + 0x90);
  g.mem.fill(0, 0x110, 0x110 + 0x90);
}

function seedGlyphs(g: Game) {
  const o = g.cheatMode & 0x80 ? 0x18 : 0;
  for (let x = 0; x < 8; x++) {
    for (const d of PD_COLS) {
      g.mem[d[0] + x] = piledriverGlyphs[o + x];
      g.mem[d[1] + x] = piledriverGlyphs[o + 8 + x];
      g.mem[d[2] + x] = piledriverGlyphs[o + 16 + x];
    }
  }
}

function drawShaft(g: Game, row: number, col: number, height: number, charBase: number) {
  const at = g.rowAddr(row) + col;
  for (let i = 0; i < height; i++) {
    const a = at + i * ROW;
    g.setChr(a, charBase + i); g.setCol(a, 0x0f);
    g.setChr(a + 1, charBase + 6 + i); g.setCol(a + 1, 0x0c);
    g.setChr(a + 2, charBase + 12 + i); g.setCol(a + 2, 0x0b);
  }
}

export function piledriverRoomInit(g: Game) {
  clearGlyphs(g);
  seedGlyphs(g);
  const pd = g.pd;
  pd.roomFlag = 0;
  for (let i = 0; i + 4 < piledriverCfg.length; i += 5) {
    if (piledriverCfg[i] !== g.roomId) continue;
    const [col, row, height, chr] = piledriverCfg.subarray(i + 1, i + 5);
    drawShaft(g, row, col, height, chr);
    pd.travel[pd.roomFlag] = (height * 8 - 1) & 0xff;
    pd.spriteY[pd.roomFlag] = (row * 8 + 0x34) & 0xff;
    pd.roomFlag++;
  }
  pd.state = 0;
  pd.delay = 1;
  pd.index = 0xff;
}

function moveUp(g: Game, index: number) {
  for (const base of PD_COLS[index]) g.mem.copyWithin(base, base + 1, base + 0x30);
}

function moveDown(g: Game, index: number) {
  for (const base of PD_COLS[index]) g.mem.copyWithin(base + 1, base, base + 0x2f);
}

export function piledriverAnimate(g: Game) {
  const pd = g.pd;
  if (!pd.roomFlag) return;
  if (!pd.state) {
    pd.index = 0xff;
    pd.delay = (pd.delay - 1) & 0xff;
    if (pd.delay) return;
    pd.delay = (g.random() & 0x3f) + 0x14;
    let x = g.random() & 1;
    if (pd.roomFlag !== 2) x = 0;
    pd.index = x;
    pd.state = 1;
    pd.position = 5;
    seedGlyphs(g);
    g.sfx(SFX.piledriverDescend, true);
    return;
  }
  if (pd.state === 2) {
    pd.position -= 2;
    if (pd.position < 6) {
      pd.state = 0;
      return;
    }
    moveUp(g, pd.index);
    moveUp(g, pd.index);
    return;
  }
  pd.position += 2;
  if (pd.position >= pd.travel[pd.index]) {
    pd.state++;
    return;
  }
  moveDown(g, pd.index);
  moveDown(g, pd.index);
}

/** Stepping on a crusher head ($62) rides it; the base ($63) sets event 4. */
export function piledriverCheckContact(g: Game) {
  const c = g.chr(g.montyChr + 0x29);
  if (c === 0x63) {
    g.actionCounter = 4;
    return;
  }
  if (c !== 0x62) return;
  g.gameMode = 1;
  g.pd.ride = 1;
  g.priority = 0x03;
  g.sfx(SFX.liftDescend);
  g.x2 = 0x75;
  g.y = (g.y - 2) & 0xff;
  drawShaft(g, 0x0a, 0x1a, 0x06, 0x10);
  clearGlyphs(g);
  g.mem[0xaf] = g.mem[0xdf] = g.mem[0x10f] = 0xff;
}

export function piledriverUpdateRide(g: Game) {
  if (!g.pd.ride) return;
  if (g.y < 0x62) {
    g.pd.ride = 0;
    g.gameMode = 0;
    g.priority = 0;
    return;
  }
  moveUp(g, 0);
  g.y = (g.y - 1) & 0xff;
}

/** Touching a descending crusher's column kills (event 1, the 4-way split). */
export function piledriverCheckTiles(g: Game) {
  const pd = g.pd;
  if (!pd.roomFlag || pd.index === 0xff || pd.state === 2) return;
  const base = g.montyChr;
  for (const o of [0, 1, ROW, ROW + 1]) {
    const c = g.chr(base + o);
    if (c < 0x10 || c >= 0x34) continue;
    const which = c < 0x20 ? 0 : 1;
    if (which !== pd.index) return;
    if (((pd.spriteY[pd.index] + pd.position) & 0xff) >= g.y) g.actionCounter = 1;
    return;
  }
}

/** Room $0C: the rising bollard ($62 at row 15, col 27). */
export function piledriverInitState(g: Game) {
  g.pd.ride = 0;
  if (g.roomId !== 0x0c) return;
  g.mem[SCREEN + 15 * ROW + 0x1b] = 0x62;
  g.col[15 * ROW + 0x1b] = 1;
}

// ---- Lift ---------------------------------------------------------------------------------

export function liftInit(g: Game) {
  const l = g.lift;
  l.type = 0;
  l.speedDir = 0;
  l.riding = 0;
  if (g.roomId === 0x05) {
    Object.assign(l, { x: 0x48, y: 0x5b, type: 1, speedDir: 0x82 });
    g.sfx(SFX.liftDescend);
  } else if (g.roomId === 0x0d) {
    Object.assign(l, { x: 0x80, y: 0x53, type: 2, speedDir: 0x80 });
  }
}

export function liftSpriteUpdate(g: Game) {
  const l = g.lift;
  if (!l.type) return;
  g.sx[1] = g.sx[2] = l.x;
  g.sy[1] = l.y;
  g.sy[2] = (l.y + 0x15) & 0xff;
  const c = g.pulseGreyscale();
  g.scol[1] = g.scol[2] = c;
  g.vic.mc1 = 2;
  g.vic.mc2 = 0x0a;
  g.sptr[1] = 0x74;
  g.sptr[2] = 0x75;
  g.enable |= 0x06;
  g.multicolour |= 0x06;
  if (l.riding) g.y = (l.y + 0x17) & 0xff;
}

function liftBgTile(g: Game, value: number) {
  const l = g.lift;
  let y = l.y;
  l.speed = value;
  if (value === 0) y = (y + 8) & 0xff;
  const at = g.rowAddr(((y - 0x32) & 0xff) >> 3) + (((l.x - 0x0c) & 0xff) >> 2) + 1;
  g.setChr(at, value);
  g.setCol(at, 1);
}

export function liftMovementUpdate(g: Game) {
  const l = g.lift;
  l.speed = l.speedDir & 0x0f;
  if (!l.speed) return;
  if (l.speedDir & 0x80) {
    if (l.y >= 0xb0) {
      if (l.speedDir === 0x88) {
        l.riding = 0;
        g.gameMode = 0;
        g.actionCounter = 3; // squashed
        return;
      }
      l.speedDir = 0;
      l.riding = 0;
      g.gameMode = 0;
      return;
    }
    l.y = (l.y + l.speed) & 0xff;
    liftBgTile(g, l.speed === 8 ? 0 : 0x3c);
    return;
  }
  if (l.y < 0x62) {
    g.sfx(SFX.liftDescend);
    l.speedDir = 0x88;
    return;
  }
  l.y = (l.y - l.speed) & 0xff;
  liftBgTile(g, 0);
}

export function liftCheckContact(g: Game) {
  const l = g.lift;
  if (!l.type || l.riding) return;
  if (l.type === 2 && l.y >= 0xb0) return;
  const top = (l.y + 0x1a) & 0xff;
  if (((top - 3) & 0xff) !== g.y && ((top - 1) & 0xff) !== g.y) return;
  if (((l.x + 2) & 0xff) !== g.x2) return;
  l.riding = 1;
  g.gameMode = 1;
  if (l.type !== 1) {
    l.speedDir = 0x82;
    g.sfx(SFX.liftDescend);
  } else {
    l.speedDir = 0x02;
    g.sfx(SFX.liftAscend);
  }
}

// ---- Teleporter ---------------------------------------------------------------------------

function clearTeleporterChars(g: Game) {
  g.mem.fill(0xaa, 0x1c0, 0x1e0);
}

export function teleporterDisplay(g: Game) {
  const t = g.tele;
  t.active = 0;
  t.repeat = 0;
  for (let i = 0; teleporterCfg[i] !== undefined && teleporterCfg[i] !== 0xff; i += 5, t.repeat++) {
    if (teleporterCfg[i] !== g.roomId) continue;
    const [col, row, height, colour] = teleporterCfg.subarray(i + 1, i + 5);
    t.colH = height;
    t.base = colour;
    t.scr = g.rowAddr(row) + col;
    for (let y = 2; y >= 0; y--) {
      g.setChr(t.scr + y, 0x35 + y);
      g.setCol(t.scr + y, 3);
    }
    let at = t.scr;
    for (let x = height; x >= 0; x--) {
      g.setChr(at + 0x29, 0x38 + (x & 3));
      g.setCol(at + 0x29, 1);
      at += ROW;
    }
    t.active = 0xff;
    return;
  }
  clearTeleporterChars(g);
}

export function teleporterAnimate(g: Game) {
  const t = g.tele;
  if (!t.active) return;
  t.anim = (t.anim + 1) & 0xff;
  let k = 3;
  for (let x = 0x1f; x >= 0; x--) {
    if (--k < 0) {
      g.random();
      k = 3;
    }
    g.mem[0x1c0 + x] &= g.prng[k];
  }
  if ((t.anim & 7) !== 7) return;
  t.events = (t.events + 1) & 0xff;
  if ((t.events & 3) === 3) {
    t.cur = teleporterColours[g.random() & 3];
    g.setCol(t.scr, t.cur);
    g.setCol(t.scr + 2, t.cur);
    let at = t.scr + 1;
    for (let x = t.colH + 1; x >= 0; x--, at += ROW) g.setCol(at, t.cur);
  }
  clearTeleporterChars(g);
}

export function teleporterCheckContact(g: Game) {
  const t = g.tele;
  const base = g.montyChr;
  const hit = [0, 1, ROW, ROW + 1].some((o) => {
    const c = g.chr(base + o);
    return c >= 0x38 && c < 0x3c;
  });
  if (!hit || t.cur === t.base) return;
  const d = teleporterDests.subarray(t.repeat * 4, t.repeat * 4 + 4);
  g.x2 = d[0];
  g.y = d[1];
  g.exitCol = d[2];
  g.mapRow = d[3];
  g.roomExit = 1;
  g.dissolvePending = 1;
  // runstop64's warps (data/runstop64-rooms.ts): Monty comes in on foot, the C5 street as walking
  // into it always finds it; into the street, straight in as walking in does (as travel does: the
  // game moves the room's enemies on through a dissolve, so the street wouldn't be as he finds it)
  if (isExtensionRoom(g.roomId)) {
    for (const i of warpFound.get(g.roomId) ?? []) if (!g.siCollected[i]) g.siCollected[i] = 0x81;
    c5Arrive(g, C5_START);
    if (isC5Room(g.roomAt(g.mapRow, g.exitCol))) g.dissolvePending = 0;
  }
  g.sfx(SFX.warp);
}

// ---- Sinclair C5 ---------------------------------------------------------------------------

/**
 * What the C5 carries from room to room: the stage of the drive (0 on the top road, left;
 * 1 on the middle road after the drop in room $33, right; 2 on the bottom road after the
 * drop in room $24, left), its speed and direction, and a jump under way. The rest of the
 * section's state InitRoomDeathFlag sets up as each room loads (c5.active, the ramp sprite
 * from the stage, expandX, the rate; the fall cleared; entering $24 from the tree), and
 * Monty's place is the room's entry (x2, y; savedX, savedY).
 */
export interface C5State { fallStage: number; speed: number; dir: number; bounce: number }

/** The section's start: as a C5 death leaves it (DeathByC5), and as it is while Monty is on foot. */
export const C5_START: C5State = { fallStage: 0, speed: 0, dir: 0x01, bounce: 0 };

/** The C5 street's rooms ($24, $25, $31-$33): InitRoomDeathFlag's (the original's "$31 and up": its last rooms). */
export const isC5Room = (id: number) => id === 0x24 || id === 0x25 || (id >= 0x31 && id <= 0x33);

export const c5State = (g: Game): C5State => ({ fallStage: g.c5.fallStage, speed: g.c5.speed, dir: g.c5.dir, bounce: g.c5.bounce });

/**
 * The C5 as it comes into the next room (set before the room loads). Driving does this
 * itself; travel, saves and the retry after a crash (ENHANCED) bring it in as it once came.
 */
export function c5Arrive(g: Game, s: C5State) {
  Object.assign(g.c5, s);
  g.c5.fall = 0;
}

/** The road's height (Monty's y) on each pass: the top road, the middle road, the bottom road. */
export const c5Road = (fallStage: number) => [0x7a, 0xa2, 0xca][Math.min(2, fallStage)];

/**
 * ENHANCED's restart after a crash: the C5 as it came into the room (its pass, the way it was
 * going) but stopped, on the road (no hop under way). Standing still is safe on every pass (no
 * hole under the room's way in, and the street's enemies pass over a C5 standing there), and
 * from a standstill every room can be driven through (test/c5respawn.ts).
 */
export const c5Restart = (s: C5State): C5State => ({ fallStage: s.fallStage, speed: 0, dir: s.dir, bounce: 0 });

/**
 * The exit grid's cell for room $33 (row 2, column 4): the drive out of the section takes it off
 * the grid, and with it the way back east (in the original the street is behind him for good;
 * travel puts it back: `c5Street`).
 */
export const C5_LAST = { row: 2, col: 4 } as const;
const C5_LAST_CELL = C5_LAST.row * 23 + C5_LAST.col;
/** What's in room $33's cell: the room until the street's been driven, then nothing (0xff). */
export const c5LastCell = (driven: boolean) => (driven ? 0xff : exitGridImage[C5_LAST_CELL]);

/**
 * The section as the drive out of it leaves it (c5DriveMovement, out through $33): on the bottom
 * road (stage 2), heading left. Its speed and a hop under way are the drive's own and nothing
 * reads them on foot (InitRoomDeathFlag only the stage, and only in the street), so stopped.
 */
export const C5_OUT: C5State = { fallStage: 2, speed: 0, dir: 0x01, bounce: 0 };

/**
 * The street as the game has it on one side of it or the other (travel: map.ts `go`). All the
 * drive changes for good is room $33's cell (taken off the grid on the way out) and the C5's
 * state (its stage, speed, direction, a hop: C5_START until the first drive, as a new game and a
 * crash leave it; C5_OUT after); the rest (Monty's place, the C5's sprites and rate) each room
 * sets up again as it loads. Driven: as the drive out leaves them; not: as they are before he
 * first drives it, so the street can be driven again and leads on as before.
 */
export function c5Street(g: Game, driven: boolean) {
  g.exitGrid[C5_LAST_CELL] = c5LastCell(driven);
  c5Arrive(g, driven ? C5_OUT : C5_START);
}

export function c5SetupSprites(g: Game) {
  const c5 = g.c5;
  g.sy[2] = g.sy[3] = g.y;
  g.sx[2] = g.x2;
  g.sx[3] = (g.x2 + 8) & 0xff;
  g.scol[2] = g.scol[3] = 1;
  const f = (c5.anim & 3) + (c5.dir & 0x80 ? 4 : 0) + 0xa4;
  g.sptr[2] = f;
  g.sptr[3] = f + 8;
  g.enable |= 0x0e;
}

function c5Incr(g: Game) {
  if (g.frameToggle && g.c5.speed !== 4) g.c5.speed++;
}

function c5Decr(g: Game) {
  if (g.frameToggle && g.c5.speed) g.c5.speed--;
}

export function c5DriveMovement(g: Game) {
  const c5 = g.c5;
  if (!(g.cheatMode & 0x80)) {
    const base = g.montyChr;
    if (g.chr(base + 0x50) === 2 || g.chr(base + 0x54) === 2) {
      g.actionCounter = 7; // crashed
      return;
    }
  }
  // Room $33: drive off the bottom-left to come back out of the transit zone.
  if (g.roomId === 0x33 && g.x2 === 0x14 && g.y === 0xca) {
    g.x2 = 0x9c;
    g.y = 0x5c;
    g.scol[3] = 0x0f;
    g.exitGrid[C5_LAST_CELL] = c5LastCell(true);
    g.exitCol--;
    g.roomExit = 1;
    return;
  }
  // Fall triggers at the ramp tops.
  if (g.roomId === 0x24 && g.x2 === 0x94 && g.y === 0xa2) c5.fall = 1;
  if (g.roomId === 0x33 && g.x2 < 0x15 && g.y === 0x7a) c5.fall = 1;
  if (c5.fall) {
    const floor = g.roomId === 0x24 ? 0xca : 0xa2;
    if (g.y >= floor) {
      c5.fallStage++;
      c5.fall = 0;
    } else {
      g.y++;
      g.sy[1]++; // the ramp sprite drops with the C5
    }
    return;
  }
  if (c5.bounce) c5Bounce(g);
  const input = g.input;
  if (input.down) {
    c5.speed = 0;
  } else {
    if (!c5.bounce) {
      if (input.left) {
        if (!c5.speed) c5.dir = 0x01;
        if (!(c5.dir & 0x80)) c5Incr(g);
        else c5Decr(g);
      }
      if (input.right) {
        if (!c5.speed) c5.dir = 0x81;
        if (c5.dir & 0x80) c5Incr(g);
        else c5Decr(g);
      }
    }
    if (!c5.bounce && g.inputFire) c5.bounce = 1;
  }
  c5.rate = (c5.rate - 1) & 0xff;
  if (!c5.rate) {
    c5.rate = 8 - c5.speed;
    if (c5.speed) c5.anim++;
  }
  if (g.roomId !== 0x24 && g.x2 >= 0x94) {
    g.x2 = 0x16;
    g.exitCol++;
    g.roomExit = 1;
  }
  if (g.roomId !== 0x33 && g.x2 < 0x15) {
    g.x2 = 0x93;
    g.exitCol--;
    g.roomExit = 1;
  }
  let x = c5.speed;
  if (!(c5.dir & 0x80)) {
    while (g.x2 >= 0x15 && --x >= 0) {
      g.stepGate = (g.stepGate + 1) & 1;
      if (g.stepGate) g.x2--;
    }
  } else {
    while (g.x2 < 0x94 && --x >= 0) {
      g.stepGate = (g.stepGate + 1) & 1;
      if (!g.stepGate) g.x2++;
    }
  }
}

/**
 * ENHANCED (assist c5): fire held on past the top of a hop holds it there, for up to this many
 * of its steps (it moves on odd frames only: two frames each, so 14 frames), and it comes down
 * when fire is let go; a tap is the original's hop, frame for frame. How high it goes, the road,
 * the holes, the enemies and the speeds stay the original's.
 *
 * Held only while fire is: a hop that always held (tried at 3 to 11 steps) also lands later,
 * and the street's holes come in sets about one hop apart (on the return, room $33's big hole
 * and pair then room $32's first pair): the next hop's press came too late, so the windows
 * there stayed 1 or 2 frames at top speed and some speeds lost every way through. Held while
 * fire is, every route the original has is still there (tap), and a longer hop when wanted;
 * the windows (test/c5hop.ts) are at least double on the return at top speed.
 */
export const C5_HOLD = 7;
/**
 * The hold is kept in the hop's own byte, c5.bounce (the original's: bits 0-2 the height, bit 3
 * coming down), in bits 4-7, which the original never sets: what carries a hop under way
 * (travel, the autosave, the retry in the room) carries its hold too.
 */
const HOLD_STEP = 0x10;

function c5Bounce(g: Game) {
  const c5 = g.c5;
  if (!g.frameToggle) return;
  if (c5.bounce >= HOLD_STEP) {
    if (g.assist.c5 && g.inputFire) {
      c5.bounce -= HOLD_STEP;
      return;
    }
    c5.bounce &= 0x0f; // fire let go (or switched to ORIGINAL): down from the top as the original
  }
  if (!(c5.bounce & 0x08)) {
    g.y--;
    c5.bounce++;
    if (c5.bounce === 0x08 && g.assist.c5 && g.inputFire) c5.bounce |= C5_HOLD * HOLD_STEP;
    return;
  }
  g.y++;
  c5.bounce--;
  if (c5.bounce & 7) {
    c5.bounce |= 0x08;
    return;
  }
  g.y--;
  c5.bounce = 0;
}
