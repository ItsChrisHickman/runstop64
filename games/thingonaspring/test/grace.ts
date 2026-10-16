/**
 * Thing on a Spring: a moment's grace (games/shared/grace.ts), headless through the front end:
 * for 3 seconds after back to room start (and travel, and continuing) no oil is taken (the game's
 * routine that takes it, $56B4, is driven here as a creature's touch drives it: the oil stays),
 * and after it the same calls take it again.
 *
 *   nice -n 15 node tools/test.mjs games/thingonaspring/test/grace.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { cpu } from '../../shared/native/cpu';
import { GRACE_FRAMES } from '../../shared/grace';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';
import * as engine from '../src/gen/engine';
import { run } from '../src/main';

stubFetch(fs.readFileSync('games/thingonaspring/assets/toas-title.state'));
useMemoryStorage();
let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const input = new Input(nowhere);
const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const press = (code: string) => { input.keyDown(code); tick(3); input.keyUp(code); tick(3); };
const ram = () => must(p.machine, 'the machine').ram;
const oil = () => ram()[0x8f];
/** Oil taken as a creature's touch takes it: the game's own routine, once a frame (its every-third-call count set to take one). */
const touch = () => { ram()[0xc9] = 1; const regs = { ...cpu }; engine.r_56b4(); Object.assign(cpu, regs); };

await new Promise((r) => setTimeout(r, 10));
tick(60);
input.keyDown('Space'); tick(10); input.keyUp('Space');
for (let i = 0; i < 400 && !(p.state.playing && ram()[0x63] === 0); i++) tick();
tick(300);
check('in play', p.state.playing && p.state.hasSave);

// ---- no grace in an ordinary game: a touch takes oil ----
const o0 = oil();
for (let i = 0; i < 10; i++) { touch(); tick(); }
check(`a new game has no grace: ten touches take oil (${o0} -> ${oil()})`, oil() < o0 && p.state.grace === 0);

// ---- back to room start: the grace ----
press('KeyP'); press('KeyB');
check(`B starts the grace (${p.state.grace} frames)`, p.state.grace > GRACE_FRAMES - 12);
ram()[0x8f] = 0xa0; ram()[0x90] = 0; // (oil at a known level, none being filled)
const o1 = oil();
while (p.state.grace > 3) { touch(); tick(); }
check(`touches through the grace take no oil (${o1} -> ${oil()}, grace ${p.state.grace} left)`, oil() === o1);
tick(10);
ram()[0x90] = 0;
for (let i = 0; i < 10; i++) { touch(); tick(); }
check(`after it the same touches take oil again (${o1} -> ${oil()})`, oil() < o1);

console.log(failures ? `${failures} failed` : 'all passed');
process.exit(failures ? 1 : 0);
