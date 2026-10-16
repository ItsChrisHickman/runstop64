/**
 * Thing on a Spring's front end, headless (c64kit stood in by games/shared/test/kit.ts): the
 * title → play; walking into the next screen (the map notes it, and the end come in by); the
 * pause screen with the factory map, and ENHANCED (on unless chosen off; E changes it); travel
 * back by the map (keys, and taps), arriving where the game's own way in puts Thing; hints
 * (with ENHANCED: a sparkle on the room's piece); continuing after the oil runs out (with
 * ENHANCED, at least half full).
 *
 *   nice -n 15 node tools/test.mjs games/thingonaspring/test/frontend.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { indicesPng } from '../../../tools/probe/render';
import { MAP_BOX, type Found } from '../../shared/native/pause';
import { run } from '../src/main';
import { makeMap } from '../src/map';
import { hintSpots } from '../src/hint-spots';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { parseOptions } from '../../shared/test/data';
import { check, finish } from '../../shared/test/check';

// a browser's storage, in memory; the title snapshot from disk
const store = useMemoryStorage();
const titleBytes = fs.readFileSync('games/thingonaspring/assets/toas-title.state');
stubFetch(titleBytes);

const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
const machine = () => { const m = p.machine; if (!m) throw new Error('no game yet'); return m; };
const ram = () => machine().ram;
const where = () => `${ram()[0x5f]}.${ram()[0x5e]}`;
/** What the map has noted: the screens been in, with the ends come in by. */
function screensFound(found: Found): Record<string, string[]> {
  const s = found.screens, out: Record<string, string[]> = {};
  if (typeof s !== 'object' || s === null) return out;
  for (const [k, v] of Object.entries(s)) if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === 'string');
  return out;
}
const options = (): Record<string, unknown> => parseOptions(store.get('thingonaspring.assist'));

const outDir = process.argv[2];
function shot(name: string) {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  indicesPng(path.join(outDir, `${name}.png`), renderer.screen.pixels.map((v) => (v === 0xff ? renderer.background : v)), 320, 200);
}

// ---- the title, then play -------------------------------------------------------------------------
await new Promise((r) => setTimeout(r, 10));
tick(60);
check('the title is up', !!p.machine && !p.state.playing);
input.keyDown('Space'); tick(10); input.keyUp('Space');
until(() => p.state.playing && ram()[0x63] === 0, 400);
const first = where();
check(`Space: playing, in corridor ${first}`, p.state.playing && first === '0.5');
check('a save on coming in', store.has('thingonaspring.save.v2'));
check('ENHANCED is on unless chosen off', p.options.enhanced === true);
// walk left into the room before
input.keyDown('ArrowLeft');
const walked = until(() => where() !== first && ram()[0x63] === 0, 1500);
input.keyUp('ArrowLeft');
tick(30);
const second = where();
check(`walking left: into the next screen (${second})`, walked && second === '0.4');
const screens = () => screensFound(p.state.found);
check(`the map has both screens, with the ends come in by (${JSON.stringify(screens())})`, !!screens()[first]?.includes('L') && !!screens()[second]?.includes('R'));

// ---- the pause screen: the map, and ENHANCED ------------------------------------------------------
tap('KeyP');
check('P: the pause screen', p.state.paused);
tick(2);
shot('1-pause');
const at = ram()[0x1d];
tick(20);
check('the game waits while paused', ram()[0x1d] === at);
tap('KeyE');
check('E: ENHANCED off (ORIGINAL), and kept', p.options.enhanced === false && options().enhanced === false);
tick(2);
shot('2-pause-original');
tap('KeyE');
check('E again: ENHANCED on', p.options.enhanced === true && options().enhanced === true);

// ---- travel back by the map -----------------------------------------------------------------------
// the first corridor, at its left end (where he came in), is to the right of here on the map
const map = makeMap();
const placesOf = () => map.places?.(MAP_BOX, ram(), p.state.found) ?? [];
check(`the map offers ${placesOf().map((q) => q.id).join(' ')}`, placesOf().some((q) => q.id === `${first}L`));
tap('ArrowRight');
tap('Enter');
until(() => where() === first && ram()[0x63] === 0, 300);
tick(2);
check(`Enter: travel back to ${first}, at its left end (x ${ram()[0x1d]}, scroll ${ram()[0x19]})`, where() === first && ram()[0x19] === 0 && ram()[0x1d] < 0x30);
// touch: two taps on the room's right end
input.touch = true;
tap('KeyP');
const q = placesOf().find((x) => x.id === `${second}R`);
if (q) { input.point(q.x, q.y); tick(2); input.point(q.x, q.y); tick(3); }
until(() => where() === second && ram()[0x63] === 0, 300);
input.touch = false;
check(`touch: two taps on ${second}R travel there (at its right end: scroll ${ram()[0x19]})`, !!q && where() === second && ram()[0x19] > 0);

// ---- hints --------------------------------------------------------------------------------------------
// (the room given a piece to find, as a new game might have: its oil can is what it shows otherwise)
const room = ram()[0x20];
ram()[0x39f + room] = 0;
tick(30);
const spots = hintSpots(ram(), machine().vic);
check(`with ENHANCED, a sparkle for room ${room}'s piece (${JSON.stringify(spots)})`, spots.length === 1);

// ---- the oil runs out: CONTINUE? with at least half ------------------------------------------------
tick(10);
// (touching a creature or a live wire takes the last of it; or time: $56B4)
for (let n = 0; n < 2000 && !(p.state.prompt === 'continue'); n++) { ram()[0x8f] = 0; ram()[0x90] = 0; tick(); }
check('the oil ran out: CONTINUE?', p.state.prompt === 'continue');
shot('3-continue');
tap('Enter');
until(() => p.state.playing && ram()[0x63] === 0, 300);
tick(5);
check(`Enter: back in ${where()} with the oil at least half (${ram()[0x8f]})`, p.state.playing && ram()[0x8f] >= 0x7c);

finish();
