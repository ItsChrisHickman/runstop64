/**
 * Antiriad: a moment's grace (games/shared/grace.ts), headless through the front end: for 3 seconds
 * after back to room start, travel or continuing, nothing hurts Tal (a creature's touch, $A643's
 * `hurt`, driven here as the VIC's sprite collision does it) or the armour, and the radiation's
 * drain waits; after it the same touch hurts again.
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/grace.ts
 */
import { Input, PixelRenderer } from 'c64kit';
import { GRACE_FRAMES } from '../../shared/grace';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { spriteHits } from '../src/collisions';
import { run } from '../src/main';
import { V } from '../src/vars';

useMemoryStorage();
const input = new Input(nowhere);
const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(3); input.keyUp(code); tick(2); };
const g = () => p.game;
const CREATURES = 0xc618, CREATURE_HURT = 0xc64a;

/** A creature (sprite 3, the first kind) touches Tal, as the VIC's collision interrupt reports it. */
function touch() {
  const { ram } = g();
  ram[V.anim + 3] = ram[CREATURES]; ram[V.dying + 3] = 0; ram[V.appearing + 3] = 0;
  ram[V.spriteCollisions] = 0x09;
  spriteHits(g());
}

tick(300);
tap('Space');
for (let n = 0; !g().playing && n < 300; n++) tick();
tick(150);
check('in play, no grace in a new game', g().playing && p.state.grace === 0 && g().ram[CREATURE_HURT] > 0);
const life0 = g().ram[V.life];
touch();
check(`no grace: a creature's touch hurts Tal (${life0} -> ${g().ram[V.life]})`, g().ram[V.life] < life0);

// ---- back to room start: the grace ----
tap('KeyP'); tap('KeyB');
check(`B starts the grace (${p.state.grace} frames)`, p.state.grace > GRACE_FRAMES - 12);
g().ram[V.life] = 0x1f;
let lowest = 0x1f;
while (p.state.grace > 4) { touch(); tick(); lowest = Math.min(lowest, g().ram[V.life]); }
check(`creature touches every frame through the grace: nothing hurts (life lowest ${lowest} of 31)`, lowest === 0x1f);
tick(10);
g().ram[V.life] = 0x1f;
touch();
check(`after it the same touch hurts (31 -> ${g().ram[V.life]})`, g().ram[V.life] < 0x1f);

// ---- the radiation's drain waits too (out of the armour) ----
tap('KeyP'); tap('KeyB');
g().ram[V.life] = 0x1f; g().ram[0x75] = 3; g().ram[0x91] = 0;
let drained = false;
while (p.state.grace > 4) { tick(); if (g().ram[V.life] < 0x1f) drained = true; }
check(`the radiation (3 a pass) takes nothing through the grace (life ${g().ram[V.life]})`, !drained);
g().ram[0x75] = 3; g().ram[0x91] = 0;
tick(120);
check(`after it the radiation takes life again (31 -> ${g().ram[V.life]})`, g().ram[V.life] < 0x1f);

// ---- the armour is hurt the same way ----
tap('KeyP'); tap('KeyB');
g().ram[V.inSuit] = 0x80; g().ram[V.suitEnergy] = 0x1f;
const suit = g().ram[V.suitEnergy];
while (p.state.grace > 4) { touch(); tick(); }
check(`in the armour: the touches through the grace take no energy (${suit} -> ${g().ram[V.suitEnergy]})`, g().ram[V.suitEnergy] === suit);
tick(10);
touch();
check(`after it the armour loses energy (${suit} -> ${g().ram[V.suitEnergy]})`, g().ram[V.suitEnergy] < suit);

console.log(failures ? `${failures} failed` : 'all passed');
process.exit(failures ? 1 : 0);
