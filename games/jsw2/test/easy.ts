/**
 * Jet Set Willy II's ENHANCED, made a lot easier (src/easy.ts, QOL.md), headless through the front end as the
 * browser runs it:
 *
 * - a second jump in the air: Space again while he is up goes higher (the game's own jump begun again at
 *   the height he is), once per airtime, in the direction held; ORIGINAL has none;
 * - ropes: the beach (room 28) crossed from the Yacht's side to the Tool Shed's with a rope and a second jump,
 *   by a plain bot that jumps at the rope, rides it and lets go; in ORIGINAL the same bot does not get there;
 * - eight lives that never run out: deaths forced one after the other cost nothing, in ORIGINAL they do;
 * - a short grace after coming into a room (and after a life is lost): a deadly collision forced right
 *   after the room is entered costs nothing, and after the grace it does (lives not unlimited, for the count);
 * - a gentle touch: a guardian must overlap him by more than a pixel or two (his sprite 14 opaque pixels,
 *   the model's `spriteOverlap`), ORIGINAL kills on the first;
 * - sparkles on the items still in the room (a cell of each, gone when taken).
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/easy.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { run } from '../src/main';
import { OVERLAP, itemSpots } from '../src/easy';
import { ITEM_CELLS } from '../src/itemcounts';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';
import { check, finish } from '../../shared/test/check';

stubFetch(fs.readFileSync('games/jsw2/assets/jsw2-title.state'));

const livesOf = (b: number) => { let n = 0; for (; b; b >>= 1) n += b & 1; return n; };

/** A game as the browser runs it (`original`: ORIGINAL chosen), a new game begun, the bathroom's first moments passed. */
async function launch(original = false) {
  useMemoryStorage(new Map(original ? [['jsw2.assist', JSON.stringify({ enhanced: false })]] : []));
  const input = new Input(nowhere);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 20));
  const ram = () => must(p.machine, 'the machine').ram;
  const held = new Set<string>();
  const s = {
    p, input, ram,
    tick(n = 1) { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } },
    /** Holds `code` down (or lets go of it). */
    key(code: string, on: boolean) {
      if (on && !held.has(code)) { input.keyDown(code); held.add(code); }
      if (!on && held.has(code)) { input.keyUp(code); held.delete(code); }
    },
    lives: () => livesOf(ram()[0x8096]),
  };
  s.tick(80); s.key('Space', true); s.tick(3); s.key('Space', false); s.tick(230);
  return s;
}
type Session = Awaited<ReturnType<typeof launch>>;

// ---- the options: what ENHANCED turns on ----
{
  const e = await launch();
  const on = (id: string) => e.p.options[id] === true;
  check('ENHANCED: a second jump, ropes, a gentle touch, unlimited lives, sparkles, safe landings are on', ['airJump', 'ropes', 'gentle', 'lives', 'hints', 'falls'].every(on));
  const o = await launch(true);
  check('ORIGINAL: all of them off', ['airJump', 'ropes', 'gentle', 'lives', 'hints', 'falls'].every((id) => o.p.options[id] === false));
}

// ---- a second jump in the air ----
/** The jump from the bathroom floor, the second press `again` frames after the first (`dir`: a way held with it), the heights he goes through, and where he ends facing. */
async function jumps(original: boolean, again: number | null, presses = 1, dir = '') {
  const s = await launch(original);
  const ys: number[] = [];
  const way = { value: 0 };
  s.key('Space', true); s.tick(6); s.key('Space', false);
  for (let t = 0; t < 120; t++) {
    if (again !== null && (t === again || (presses > 1 && t === again + 30))) { if (dir) s.key(dir, true); s.key('Space', true); s.tick(6); s.key('Space', false); if (dir) s.key(dir, false); }
    s.tick();
    ys.push(s.ram()[0x8063]);
    if (dir && again !== null && t === again + 7) way.value = s.ram()[0x82ae];
  }
  return { top: Math.min(...ys), way: way.value };
}
{
  const single = await jumps(false, null);
  const twice = await jumps(false, 20);
  const third = await jumps(false, 20, 2);
  const original = await jumps(true, 20);
  check(`ENHANCED: Space again in the air goes higher (top ${single.top} -> ${twice.top}, smaller is higher)`, twice.top <= single.top - 12);
  check(`ENHANCED: one second jump per airtime (a third press: top ${third.top}, as with two: ${twice.top})`, third.top === twice.top);
  check(`ORIGINAL: Space again in the air does nothing (top ${original.top}, as the single jump's ${single.top})`, original.top === single.top);
  const right = await jumps(false, 20, 1, 'ArrowRight');
  const left = await jumps(false, 20, 1, 'ArrowLeft');
  check(`the second jump goes the way held (way ${right.way} right = 255, ${left.way} left = 1)`, right.way === 255 && left.way === 1);
}

// ---- the beach: the rope and a second jump ----
/** The Yacht side's platform in the Beach, then a plain bot: right and jump, ride the rope, let go to the right near its end, a second jump. */
async function beach(original: boolean) {
  const s = await launch(original);
  s.p.state.found.stand = { ...s.p.state.found.stand, 28: [90, 0, 118] };
  s.p.frontEnd.going = '28';
  s.tick(120);
  const T0 = 12, REL = 230, AGAIN = 22;
  let phase = 0, left = -1, grabbed = false;
  for (let t = 0; t < 700 && s.ram()[0x13] === 28; t++) {
    const r = s.ram(), x = r[0x8062], rope = r[0x835d] !== 0;
    if (rope) grabbed = true;
    if (phase === 0 && t >= T0) { s.key('ArrowRight', true); s.key('Space', t < T0 + 10); if (t >= T0 + 10) phase = 1; }
    else if (phase === 1) {
      s.key('Space', false); s.key('ArrowRight', t < T0 + 30);
      if (rope) { phase = 2; s.key('ArrowRight', false); } else if (t > T0 + 150) phase = 5;
    } else if (phase === 2) {
      if (!rope) phase = 4;
      else if (x >= REL) { s.key('ArrowRight', true); s.key('Space', true); phase = 3; left = t; }
    } else if (phase === 3) {
      if (t > left + 5) { s.key('Space', t >= left + AGAIN && t < left + AGAIN + 6); s.key('ArrowRight', true); }
      if (t > left + AGAIN + 10) phase = 4;
    } else if (phase === 4) { s.key('ArrowRight', true); s.key('Space', false); }
    else s.key('ArrowRight', false);
    s.tick();
  }
  return { room: s.ram()[0x13], grabbed };
}
{
  const e = await beach(false);
  check(`ENHANCED: the beach crossed (the rope taken: ${e.grabbed}), in the Tool Shed (room ${e.room})`, e.grabbed && e.room === 48);
  const o = await beach(true);
  check(`ORIGINAL: the same bot does not cross (room ${o.room}, rope taken: ${o.grabbed})`, o.room === 28);
}

// ---- unlimited lives ----
/**
 * Deadly collisions forced one at a time in the bathroom (the grace cleared each time), 25 frames between: the lives at the
 * end, and how many times a life was lost (a life lost starts the short grace again, which is what shows it: lives that
 * never run out are filled again at once).
 */
function dies(s: Session, times: number) {
  const before = s.lives();
  let lost = 0;
  for (let n = 0; n < times; n++) {
    s.p.grace.clear();
    for (let i = 0; i < 12; i++) { s.ram()[0x8304] |= 1; s.ram()[0x8173] = 0; s.tick(); }
    s.tick(5);
    if (s.p.state.grace > 0 || s.lives() < before) lost++;
    s.tick(25);
  }
  return { before, after: s.lives(), lost };
}
{
  const e = await launch();
  const o = await launch(true);
  const ed = dies(e, 6), od = dies(o, 6);
  check(`ENHANCED: six deaths (${ed.lost} lost a life) and still ${ed.after} lives`, ed.lost === 6 && ed.before === 8 && ed.after === 8);
  check(`ORIGINAL: they do cost (${od.lost} lost a life: lives ${od.before} -> ${od.after})`, od.after === od.before - 6);
}

// ---- a short grace on coming into a room ----
{
  const s = await launch();
  s.p.options.lives = false; // (so a life lost shows)
  s.tick(2);
  const lives = s.lives(), room = s.ram()[0x13];
  // (the way down to the Drain, the game's own room change: not travel, not a resume)
  s.ram()[0x816c] = 138; s.ram()[0x8063] = 0xa2;
  for (let i = 0; i < 30 && s.ram()[0x13] === room; i++) s.tick();
  s.tick(15); // (the room drawn: the grace begins at the main loop's first wait in it)
  const graced = s.p.state.grace;
  check(`coming into a room starts a short grace (${graced} frames left, room ${room} -> ${s.ram()[0x13]})`, s.ram()[0x13] === 138 && graced > 60 && graced <= 100);
  let lost = false;
  while (s.p.state.grace > 3) { s.ram()[0x8304] |= 1; s.ram()[0x8173] = 0; s.tick(); if (s.lives() < lives) lost = true; }
  check(`a deadly collision through it costs nothing (lives ${lives} -> ${s.lives()})`, !lost);
  s.tick(Math.max(0, s.p.state.grace));
  s.ram()[0x8304] |= 1; s.ram()[0x8173] = 0; s.tick(); // (once)
  s.tick(20);
  check(`after it the same collision costs a life (${lives} -> ${s.lives()})`, s.lives() < lives);
  check(`...and the life lost starts the short grace again (${s.p.state.grace} frames left)`, s.p.state.grace > 60);
}

// ---- a gentle touch ----
{
  const e = await launch();
  const o = await launch(true);
  check(`the model asks for ${OVERLAP} shared pixels in ENHANCED play, one in ORIGINAL (${must(e.p.machine, 'm').spriteOverlap}, ${must(o.p.machine, 'm').spriteOverlap})`, must(e.p.machine, 'm').spriteOverlap === OVERLAP && must(o.p.machine, 'm').spriteOverlap === 1);
  /**
   * The guardian walking along the bathroom's upper floor (sprite 3), Willy held beside it, `dx` pixels
   * to its right (his sprite's x from its): whether a collision was reported for him in a few frames.
   */
  const touches = (s: Session, dx: number) => {
    let hit = false;
    for (let i = 0; i < 6; i++) {
      const g = must(must(s.p.machine, 'm').capture.sprites.find((q) => q.n === 3), 'the guardian');
      const r = s.ram();
      r[0x8062] = (g.x + dx) & 0xff; r[0x8072] = (r[0x8072] & 0xfe) | (((g.x + dx) >> 8) & 1); r[0x8063] = g.y; r[0x82e4] = 0; r[0x8292] = 0;
      s.tick();
      if ((s.ram()[0x8304] & 1) !== 0) hit = true;
    }
    return hit;
  };
  /** The widest gap at which the guardian still touches him (smaller: it has to overlap him more). */
  const reach = (s: Session) => { for (let dx = 24; dx >= -24; dx--) if (touches(s, dx)) return dx; return -99; };
  const original = reach(o), enhanced = reach(e);
  check(`a guardian must overlap him more in ENHANCED (touches at a gap of ${original} in ORIGINAL, ${enhanced} in ENHANCED)`, original - enhanced >= 3);
}

// ---- sparkles on the items left ----
{
  const s = await launch();
  const r = s.ram();
  // (the Off Licence: 13 bottles in a row)
  r[0x13] = 1;
  const cells = must(ITEM_CELLS[1], 'room 1 cells');
  const bitsBefore = 0x1fff;
  r[0x8104] = bitsBefore & 0xff; r[0x8105] = bitsBefore >> 8;
  const all = itemSpots(r);
  r[0x8104] &= ~(1 << 3);
  const one = itemSpots(r);
  check(`sparkles: a place for each item left in the room (${all.length} of ${cells.length}, then ${one.length} with one taken), in its cell`,
    all.length === cells.length && one.length === cells.length - 1 && all.every((q, i) => q.x === cells[i][1] * 8 + 4 && q.y === cells[i][0] * 8 + 4));
  const none = itemSpots(Object.assign(new Uint8Array(0x10000), { 0x13: 2 }));
  check('...none in a room without items', none.length === 0);
}

finish();
