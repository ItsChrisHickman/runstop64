import { rom } from './data';
import type { Game } from './game';

/**
 * BLOB's laser (the original's $2500): fire shoots the way he faces (on the
 * hover pad, the way he's pushing, diagonals too), a cell a frame, as
 * sprite 3. A shot stops at walls; one from the hover pad bounces once.
 * Each shot spends laser charge, and there's a short wait between shots.
 */
export function tick(g: Game) {
  const L = g.shot;
  let y = L.faceY, x = L.faceX;
  if (g.riding && (g.input & 15) !== 15) { y = 0; x = 0; }
  const a = g.input;
  if (!(a & 1)) y = 0xf8;
  else if (!(a & 2)) y = 8;
  if (!(a & 4)) x = 0xf8;
  else if (!(a & 8)) x = 8;
  L.faceX = x; L.faceY = y;

  const wait = g.laser & 0x3f;
  if (wait !== 0x14) g.laser = (g.laser + 1) & 0xff;
  if (!(g.laser & 0x40)) {
    if (wait !== 0x14) return;
    if (g.input & 0x10) return;
    if (!g.charge) return;
    g.charge = (g.charge - 2) & 0xff;
    g.panelDirty |= 4;
    launch(g);
    if (!(g.laser & 0x40)) return;
  }
  // $2571: in flight: its colour and frame cycle, and it moves.
  const sp = g.sprites;
  L.anim = (L.anim + 1) & 0xff;
  sp.ptr[3] = ((L.anim & 3) + L.base) & 0xff;
  sp.colour[3] = rom(0x275e + (L.anim & 3));
  if (L.dx) {
    if (L.dx & 0x80) left(g); else right(g);
  }
  if (L.dy) vertical(g);
}

/** $259F: a shot leaves BLOB. */
function launch(g: Game) {
  const L = g.shot, sp = g.sprites;
  g.laser = g.riding | 0x40;
  L.cell = g.cell;
  sp.x[3] = sp.x[0];
  sp.y[3] = sp.y[0];
  sp.msb = sp.msb & 1 ? sp.msb | 8 : sp.msb & 0xf7;
  let ptr: number;
  if (!g.riding) {
    g.sound.effect(2, 1);
    ptr = L.faceX & 0x80 ? 0x50 : 0x4c;
    L.dy = 0;
    L.faceY = 0;
  } else {
    L.dy = L.faceY;
    g.sound.effect(4, 1);
    ptr = 0x56;
  }
  sp.ptr[3] = ptr;
  L.base = ptr;
  L.anim = 0;
  L.bounced = 0;
  L.dx = L.faceX;
  if (!L.dx && !L.dy) { g.laser = 0; return; }
  sp.enable |= 8;
}

const at = (g: Game, o: number) => g.scr.attr[(g.shot.cell + o) & 0x3ff];

/** $2611: a cell right. */
function right(g: Game) {
  const sp = g.sprites, L = g.shot;
  let a = at(g, 0x2c) | at(g, 0x2b);
  if (g.laser & 0x80) a |= at(g, 0x54);
  if (!(a & 8) && !((sp.msb & 8) && !(((sp.x[3] & 0xf8) - 0x30) & 0x80))) {
    L.cell = (L.cell + 1) & 0xffff;
    const v = sp.x[3] + 8;
    sp.x[3] = v & 0xff;
    if (v > 0xff) sp.msb |= 8;
    return;
  }
  hitSide(g, 0xf8);
}

/** $266F: a cell left. */
function left(g: Game) {
  const sp = g.sprites, L = g.shot;
  let a = at(g, 0x28);
  if (g.laser & 0x80) a |= at(g, 0x50);
  const edge = !(sp.msb & 8) && !((sp.x[3] & 0xf8) & 0x80) && (((sp.x[3] & 0xf8) - 0x30) & 0x80);
  if (!(a & 8) && !edge) {
    L.cell = (L.cell - 1) & 0xffff;
    const v = sp.x[3] - 8;
    sp.x[3] = v & 0xff;
    if (v < 0) sp.msb &= 0xf7;
    return;
  }
  hitSide(g, 8);
}

/** $2649/$26AB: the shot hits a wall: gone, or (from the hover pad, once) bounces back. */
function hitSide(g: Game, back: number) {
  const L = g.shot;
  if (!(g.laser & 0x80) || L.bounced) { stop(g); return; }
  g.sound.effect(2, 1);
  L.bounced = back;
  L.dx = back;
  if (!L.dy) L.dy = ((g.rng.next() & 0x10) - 8) & 0xff;
}

/** $26D1: a quarter cell up or down. */
function vertical(g: Game) {
  const sp = g.sprites, L = g.shot;
  let blocked: boolean;
  if (!(L.dy & 0x80)) {
    blocked = !!((at(g, 0x79) | at(g, 0x7a)) & 8);
    const y = sp.y[3] & 0xf8;
    if (!blocked && (y & 0x80) && !((y - 0xda) & 0x80)) blocked = true;
    if (!blocked) L.cell = (L.cell + 0x28) & 0xffff;
  } else {
    blocked = !!((at(g, 1) | at(g, 2)) & 8);
    const y = sp.y[3] & 0xf8;
    if (!blocked && !(y & 0x80) && ((y - 0x62) & 0x80)) blocked = true;
    if (!blocked) L.cell = (L.cell - 0x28) & 0xffff;
  }
  if (!blocked) { sp.y[3] = (sp.y[3] + L.dy) & 0xff; return; }
  if (L.bounced) { stop(g); return; }
  g.sound.effect(2, 1);
  L.bounced = 8;
  L.dy = L.dy & 0x80 ? 8 : 0xf8;
  if (!L.dx) L.dx = ((g.rng.next() & 0x10) - 8) & 0xff;
}

/** $2751: the shot is gone. */
function stop(g: Game) {
  g.laser &= 0x3f;
  g.sprites.enable &= 0xf7;
}
