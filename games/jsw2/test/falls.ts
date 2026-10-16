/**
 * Jet Set Willy II: falls. The original kills on landing after a fall of 40 pixels or more (the
 * fall counter $82D7, two a step, against `cmp #$28` at $5465). ENHANCED: no fall kills
 * (main.ts FALL_LIMIT: the operand the translation reads from $5466), and what he lands on is still
 * the game's own business. Through the front end as the browser runs it, from room 60's floor
 * (the way travel puts him there), dropping Willy from the air above it:
 *
 * - ORIGINAL: a short drop is survived, a long fall (counter past 40) costs a life on landing;
 * - ENHANCED: both are survived, he lands on the floor on his feet and walks on;
 * - ENHANCED: a collision that kills (not a fall) still takes a life.
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/falls.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { run } from '../src/main';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';
import { check, finish } from '../../shared/test/check';

stubFetch(fs.readFileSync('games/jsw2/assets/jsw2-title.state'));

const BINS = 60;
/** Where he stands on room 60's floor, right of the hole down to Hades (x, its high bit, y). */
const FLOOR: [number, number, number] = [150, 0, 158];
/**
 * Room 60 is ledges a floor apart (the longest real drop there is one ledge: a counter of 8 to 24,
 * and guardians cross the gaps), so the long fall is the same drop to the floor with the fall
 * counter ($82D7: how far he has fallen, which is all the landing looks at) already at 40, the
 * original's limit, as if he had fallen from a floor higher.
 */
const SHORT = { x: 150, y: 134, fallen: 0 }, LONG = { x: 150, y: 134, fallen: 40 };
const livesOf = (b: number) => { let n = 0; for (; b; b >>= 1) n += b & 1; return n; };

async function launch(store = new Map<string, string>()) {
  useMemoryStorage(store);
  const input = new Input(nowhere);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 50));
  const ram = () => must(p.machine, 'the machine').ram;
  const s = {
    p, input, ram,
    tick(n = 1) { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } },
    tap(code: string) { input.keyDown(code); s.tick(3); input.keyUp(code); s.tick(3); },
    room: () => ram()[0x13],
    lives: () => livesOf(ram()[0x8096]),
    y: () => ram()[0x8063],
    /** Willy in the air at (x, y), standing still, the fall counter at `fallen` (as if he had fallen that far already). */
    drop(x: number, y: number, fallen = 0) {
      const r = ram();
      r[0x8062] = r[0x82a8] = r[0x82c0] = r[0x82d9] = x;
      r[0x8063] = r[0x82a9] = y;
      r[0x82e4] = 0; r[0x82d7] = 0;
      // (the game starts the count again as a fall begins: so a couple of passes in, he has fallen `fallen`)
      if (fallen) { s.tick(2); r[0x82d7] = fallen; }
    },
    /** Lets him fall: the most the fall counter reached. */
    fall() {
      let peak = 0;
      for (let i = 0; i < 120; i++) { s.tick(); peak = Math.max(peak, ram()[0x82d7]); }
      return peak;
    },
    /** A collision that kills (a sprite's, not the one case $8173 excuses) for a frame. */
    force() { ram()[0x8304] |= 1; ram()[0x8173] = 0; },
  };
  s.tick(80); s.tap('Space'); s.tick(230);
  p.state.found.stand = { ...(p.state.found.stand ?? {}), [BINS]: FLOOR };
  p.frontEnd.going = String(BINS);
  s.tick(200);
  return s;
}

const ORIGINAL = () => new Map([['jsw2.assist', JSON.stringify({ enhanced: false })]]);

for (const mode of ['ORIGINAL', 'ENHANCED'] as const) {
  const enhanced = mode === 'ENHANCED';
  const s = await launch(enhanced ? new Map() : ORIGINAL());
  check(`${mode}: on room 60's floor (${s.room()}), the switch right`, s.room() === BINS && s.p.state.enhanced === enhanced);
  check(`${mode}: the fall limit is ${enhanced ? '$FF' : '40'} ($${s.ram()[0x5466].toString(16)})`, s.ram()[0x5466] === (enhanced ? 0xff : 0x28));

  const lives0 = s.lives();
  s.drop(SHORT.x, SHORT.y, SHORT.fallen);
  const peakShort = s.fall();
  check(`${mode}: a short drop (counter reached ${peakShort}) costs no life (${lives0} -> ${s.lives()})`, peakShort > 0 && peakShort < 40 && s.lives() === lives0);

  const restY = s.y();
  const lives1 = s.lives();
  s.drop(LONG.x, LONG.y, LONG.fallen);
  const peakLong = s.fall();
  if (enhanced) {
    check(`${mode}: a long drop (counter reached ${peakLong}) lands: no life lost (${lives1} -> ${s.lives()}), on his feet at y ${s.y()}`, peakLong >= 40 && s.lives() === lives1 && s.room() === BINS && s.y() === restY);
    const x0 = s.ram()[0x8062];
    s.input.keyDown('ArrowRight'); s.tick(30); s.input.keyUp('ArrowRight');
    check(`${mode}: walks on after the landing (x ${x0} -> ${s.ram()[0x8062]})`, s.ram()[0x8062] !== x0);
    // a death that is not a fall still kills
    const lives2 = s.lives();
    for (let i = 0; i < 60 && s.lives() === lives2; i++) { s.force(); s.tick(); }
    check(`${mode}: a deadly collision (not a fall) still costs a life (${lives2} -> ${s.lives()})`, s.lives() < lives2);
  } else {
    check(`${mode}: a long drop (counter reached ${peakLong}) kills: a life lost (${lives1} -> ${s.lives()})`, peakLong >= 40 && s.lives() < lives1);
  }
}

finish();
