/**
 * Jet Set Willy II: a moment's grace (games/shared/grace.ts): for 3 seconds after our front end puts
 * him back into play he can't lose a life (the death routine $51C7 returns at once: re/engine.json
 * "skips"), and after it he can again. Through the front end, headless:
 *
 * - travel from the map and B (back to room start) start the grace, counted in frames of play;
 * - a deadly collision forced every frame ($8304) in a safe room: nothing in grace, a life after it;
 * - walking into the hole down to Hades (the skull kills) within the grace: no life lost, and once
 *   it is over, the skull kills;
 * - CONTINUE? after the last life lost starts it.
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/grace.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { run } from '../src/main';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { GRACE_FRAMES } from '../../shared/grace';
import { must } from '../../shared/test/must';
import { check, finish } from '../../shared/test/check';

stubFetch(fs.readFileSync('games/jsw2/assets/jsw2-title.state'));

const HADES = 7, BINS = 60;
const FLOOR: [number, number, number] = [150, 0, 158];
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
    grace: () => p.state.grace,
    until(done: () => boolean, n: number) { for (let i = 0; i < n && !done(); i++) s.tick(); return done(); },
    /** Forces the deadly collision (sprite collision, not the one case $8173 excuses) for a frame. */
    force() { s.ram()[0x8304] |= 1; s.ram()[0x8173] = 0; },
  };
  s.tick(80); s.tap('Space'); s.tick(230);
  p.state.found.stand = { ...p.state.found.stand, [BINS]: FLOOR };
  p.frontEnd.going = String(BINS);
  return s;
}

// ---- travel starts the grace (room 60's floor, as the map puts him) ----
const s = await launch();
s.tick(3);
check(`travel starts the grace (${s.grace()} frames left of ${GRACE_FRAMES})`, s.grace() > GRACE_FRAMES - 10);
s.tick(200);
check('the grace runs out (counted in frames of play)', s.grace() === 0);
check(`on room 60's floor (${s.room()})`, s.room() === BINS);

// ---- a deadly collision forced every frame: grace, then a life ----
s.tap('KeyP'); s.tap('KeyB');
check(`B (back to room start) starts the grace (${s.grace()})`, s.grace() > GRACE_FRAMES - 12);
const lives = s.lives();
let lostInGrace = false;
while (s.grace() > 5) { s.force(); s.tick(); if (s.lives() < lives) lostInGrace = true; }
check(`a deadly collision forced through the grace: no life lost (${lives} -> ${s.lives()}, grace ${s.grace()} left)`, !lostInGrace && s.lives() === lives && s.grace() > 0);
s.until(() => s.grace() === 0, 300);
for (let i = 0; i < 60 && s.lives() === lives; i++) { s.force(); s.tick(); }
check(`after the grace the same collision costs a life (${lives} -> ${s.lives()})`, s.lives() < lives);

// ---- the hole down to Hades, within the grace ----
const h = await launch();
h.tick(200);
h.tap('KeyP'); h.tap('KeyB');
const hLives = h.lives();
// (a few steps from the hole's edge, so he's in Hades within the grace)
h.ram()[0x8062] = h.ram()[0x82a8] = h.ram()[0x82c0] = h.ram()[0x82d9] = 80;
h.input.keyDown('ArrowLeft');
const fell = h.until(() => h.room() === HADES, 300);
h.input.keyUp('ArrowLeft');
const graceAtFall = h.grace();
check(`into Hades within the grace (grace left ${graceAtFall})`, fell && graceAtFall > 0);
h.tick(Math.max(0, graceAtFall - 2));
check(`on the skull through the grace: no life lost (${hLives} -> ${h.lives()})`, h.lives() === hLives && h.room() === HADES);
h.tick(300);
check(`after it the skull kills (${hLives} -> ${h.lives()})`, h.lives() < hLives);

// ---- CONTINUE? after the last life: the grace starts ----
const c = await launch(new Map([['jsw2.assist', JSON.stringify({ enhanced: false })]]));
c.tick(200);
c.input.keyDown('ArrowLeft');
const over = c.until(() => !c.p.state.playing && c.p.state.prompt === 'continue', 6000);
c.input.keyUp('ArrowLeft');
c.tap('Enter');
check(`CONTINUE?: reached, and the grace starts (${c.grace()})`, over && c.grace() > GRACE_FRAMES - 12);

finish();
