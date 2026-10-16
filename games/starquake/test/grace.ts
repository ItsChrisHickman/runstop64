/**
 * Starquake: a moment's grace (games/shared/grace.ts), headless through the front end (ORIGINAL, so
 * ENHANCED's unlimited lives and full energy don't hide a loss): for 3 seconds after back to room
 * start, travel or continuing, the scenery that kills (forced here by marking the cells round BLOB
 * deadly every frame) doesn't, the energy clock waits, and after it the same cell kills.
 *
 *   nice -n 15 node tools/test.mjs games/starquake/test/grace.ts
 */
import { Input, PixelRenderer } from 'c64kit';
import { run } from '../src/main';
import { GRACE_FRAMES } from '../../shared/grace';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';

useMemoryStorage(new Map([['starquake.assist', JSON.stringify({ enhanced: false })]]));
const input = new Input(nowhere);
const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
const g = p.game;
const lives = () => g.lives[0] * 10 + g.lives[1];
/** The scenery round BLOB is deadly (attribute bit 4 on the cells $29, $2A, $51, $52 from his: $4B64's check). */
const deadly = () => { for (const o of [0x29, 0x2a, 0x51, 0x52]) g.scr.attr[(g.cell + o) & 0x3ff] |= 4; };

tick(60 + 6 * 50);
tap('Space'); tick(30); tap('Space'); tick(100);
check('in play (ORIGINAL), no grace in a new game', p.state.mode === 'play' && !p.state.enhanced && p.state.grace === 0);

// ---- no grace: the scenery kills ----
const l0 = lives();
for (let i = 0; i < 60 && lives() === l0; i++) { deadly(); tick(); }
check(`no grace: deadly scenery kills (${l0} -> ${lives()} lives)`, lives() < l0);
tick(400);

// ---- back to room start: the grace ----
tap('KeyP'); tap('KeyB');
check(`B starts the grace (${p.state.grace} frames)`, p.state.grace > GRACE_FRAMES - 12);
const l1 = lives(), e1 = g.energy;
let died = false;
while (p.state.grace > 4) { deadly(); tick(); if (g.dead || lives() < l1) died = true; }
check(`deadly scenery every frame through the grace: no death, no life lost (${l1} -> ${lives()}, grace ${p.state.grace} left)`, !died && lives() === l1);
check(`...and the energy clock waited (${e1} -> ${g.energy})`, g.energy === e1);
tick(10);
for (let i = 0; i < 60 && lives() === l1; i++) { deadly(); tick(); }
check(`after it the same cells kill (${l1} -> ${lives()})`, lives() < l1);

console.log(failures ? `${failures} failed` : 'all passed');
process.exit(failures ? 1 : 0);
