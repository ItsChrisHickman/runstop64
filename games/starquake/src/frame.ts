import * as Blob from './blob';
import type { Game } from './game';
import * as Panel from './panel';

/**
 * $4C2D: the frame. The original waits for the raster to reach line $FA,
 * updates the panel, then the sprites, and moves the room's moving scenery
 * along: the sparkle, a spark, a platform.
 */
export function* sync(g: Game): Generator<void, void, void> {
  g.frames = (g.frames + 1) & 0xff; // $30BC
  yield; // $30F8: the raster wait
  Panel.frame(g);
  scenery(g);
}

/** $4C30: the sprites' registers, and the room's moving scenery: the sparkle, a spark, a platform. */
export function scenery(g: Game) {
  latchSprites(g);
  if ((g.tileFlags & 2) && !(g.frames & 7)) sparkle(g);
  if (g.frames === 0x32) {
    // The energy clock: a unit every 50 frames.
    if (!g.graceActive()) { g.energy = g.energy ? g.energy - 1 : 0; g.panelDirty |= 1; }
    g.frames = 0;
  }
  spark(g);
  Blob.crumble(g);
}

/** $4C30: the sprite registers, from the game's copies (BLOB's three sprites share sprite 0's place). */
function latchSprites(g: Game) {
  const sp = g.sprites, v = g.vic;
  v.x.set(sp.x); v.y.set(sp.y);
  v.x[1] = v.x[2] = sp.x[0];
  v.y[1] = v.y[2] = sp.y[0];
  v.msb = sp.msb;
  v.enable = sp.enable;
}

/**
 * $4C50: cells with sparkle in their attribute flicker (their paper colour
 * toggles), one row of the room each 8 frames: rows 21, 18 ... 6.
 */
function sparkle(g: Game) {
  const s = g.scr;
  for (let y = 0x26; y >= 0; y -= 4) {
    const c = g.sparkleCell + y;
    if ((s.attr[c & 0x3ff] & 0x0a) === 2) {
      const v = s.colour(c) ^ 1;
      s.setColour(c, v);
      s.setColour(c - 1, v);
    }
  }
  g.sparkleCell -= 0x78;
  if (--g.sparkleCount === 0) {
    g.sparkleCount = 6;
    g.sparkleCell = 0x348;
  }
}

/**
 * $4CB5: a spark, in turn (one a frame): waits its time, then is deadly for
 * a while, flashing, then safe again.
 */
function spark(g: Game) {
  const s = g.sparks[g.sparkAt / 9];
  g.sparkAt += 9;
  if (g.sparkAt === 0x2d) g.sparkAt = 0;
  if (!s.on) return;
  const attr = g.scr.attr;
  const c = s.cell & 0x3ff, c1 = (s.cell + 1) & 0x3ff;
  if (s.phase) {
    const old = s.phase;
    s.phase--;
    let pattern: number;
    if (s.phase === 0) {
      attr[c] &= 0xfb; attr[c1] &= 0xfb;
      s.timer = s.period;
      pattern = 0x4eb3;
    } else {
      pattern = [0x4ee3, 0x4eb3, 0x4ec3, 0x4ed3][old & 3];
    }
    Blob.xorGraphic(g, s.bitmap, pattern);
    Blob.deadlyCheck(g);
  } else {
    s.timer = (s.timer - 1) & 0xff;
    if (s.timer) return;
    attr[c] |= 4; attr[c1] |= 4;
    s.phase = s.onTime;
  }
}


