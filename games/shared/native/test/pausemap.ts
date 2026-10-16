/**
 * The pause map and travel through the front end, headless (games/shared/native/play.ts as the
 * browser runs it, c64kit stood in by games/shared/test/kit.ts): a game played along its recorded
 * routes (re/routes.json, the map noting places as it goes) is saved as the autosave keeps it,
 * with what was found; then the front end continues it on launch, P shows the pause screen (a picture of it
 * is kept), the arrows move the pick, and for each place the map offers a tap picks it and Enter goes there: after a
 * moment the map has him there, and the game plays on.
 *
 *   nice -n 15 node tools/test.mjs games/shared/native/test/pausemap.ts blackwyche [out-dir]
 */
import fs from 'node:fs';
import { Input, PixelRenderer, packState, unpackState } from 'c64kit';
import { NativeHost } from '../host';
import { MAP_BOX, type Found, type PauseMap } from '../pause';
import { GAMES, setJoy } from './games';
import { rgbPng } from '../../../../tools/probe/render';
import { C64_PALETTE } from '../../../../packages/c64kit/src/palette';
import { run as runBlackwyche } from '../../../blackwyche/src/main';
import { run as runKarnath } from '../../../karnath/src/main';
import { blackwycheMap } from '../../../blackwyche/src/map';
import { karnathMap } from '../../../karnath/src/map';
import { nowhere, stubFetch, useMemoryStorage } from '../../test/browser';

const gameId = process.argv[2] ?? 'blackwyche', outDir = process.argv[3];
const SPECS: Record<string, { run: typeof runBlackwyche; map: PauseMap; cheat(ram: Uint8Array): void }> = {
  blackwyche: { run: runBlackwyche, map: blackwycheMap, cheat: (ram) => { ram[0x9d77] = 100; ram[0x3417] = 0; } },
  karnath: { run: runKarnath, map: karnathMap, cheat: (ram) => { ram[0x6ffe] = 100; ram[0x322e] = 0; } },
};
const spec = SPECS[gameId], game = GAMES[gameId], port = game?.port;
if (!spec || !game || !port) throw new Error(`no pause map test for ${gameId}`);

let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

// ---- play the routes, the map noting what's found; the last route's end is the save ----
const titleBytes = fs.readFileSync(game.title);
const routes: number[][] = JSON.parse(fs.readFileSync(`games/${gameId}/re/routes.json`, 'utf8'));
const found: Found = {};
let save: Uint8Array | null = null;
for (const route of routes) {
  const g = new NativeHost(port, unpackState(new Uint8Array(titleBytes)));
  let frame = 0;
  for (let i = 0; i < route.length; i += 2) for (let k = 0; k < route[i + 1]; k++) {
    setJoy(g.m, game, route[i] & 0x1f); g.m.keys = route[i] & 32 ? [[1, 2]] : [];
    g.tick(); spec.cheat(g.m.ram); frame++;
    if (frame > 200 && g.lastWait === port.mainLoopWait) spec.map.observe(g.m.ram, found, g.m.vic);
  }
  const s = g.save();
  if (s) save = packState(s);
}
if (!save) throw new Error('no save at the end of the routes');

// ---- the front end, as the browser runs it ----
useMemoryStorage(new Map([[`${gameId}.save.v1`, Buffer.from(save).toString('base64')], [`${gameId}.found.v1`, JSON.stringify(found)]]));
stubFetch(titleBytes);
const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = spec.run({ renderer, input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); const m = p.machine; if (m) spec.cheat(m.ram); } }; // (kept alive, as along the routes)
const press = (code: string) => { input.keyDown(code); tick(1); input.keyUp(code); tick(1); };
const shot = (name: string) => {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  const rgb = new Float32Array(320 * 200 * 3);
  renderer.screen.pixels.forEach((v, i) => { const c = C64_PALETTE[(v === 0xff ? renderer.background : v) & 15]; rgb[i * 3] = (c >> 16) / 255; rgb[i * 3 + 1] = ((c >> 8) & 255) / 255; rgb[i * 3 + 2] = (c & 255) / 255; });
  rgbPng(`${outDir}/${gameId}-${name}.png`, rgb, 320, 200, 2);
};

await new Promise((r) => setTimeout(r, 0));
tick(150); // (launched with a save: straight back into play, no key)
const ram = () => { const m = p.machine; if (!m) throw new Error('no machine'); return m.ram; };
check('continued the save', p.state.playing);
press('KeyP');
check('P: the pause screen', p.frontEnd.paused);
shot('pause');
const places = spec.map.places?.(MAP_BOX, ram(), p.frontEnd.found) ?? [];
check(`the map offers the places found (${places.length})`, places.length > 1);
// the arrows move the pick
{
  const before = p.frontEnd.picked;
  press('ArrowRight'); press('ArrowDown');
  check(`the arrows move the pick (${before} to ${p.frontEnd.picked})`, p.frontEnd.picked !== before);
}
press('KeyP');

// each place: pause, pick it with the arrows (the nearest the way picked, as the front end does), Enter
let went = 0, played = 0;
for (const target of places) {
  tick(150); // (a fall or climb a trapdoor started finishes first: travel goes only from where he stands)
  // (the pause screen opens once he can pause)
  for (let f = 0; f < 200 && !p.frontEnd.paused; f++) press('KeyP');
  if ((spec.map.places?.(MAP_BOX, ram(), p.frontEnd.found) ?? []).find((q) => q.here)?.id === target.id) { press('KeyP'); went++; continue; } // (there already)
  // a tap on it picks it (the place nearest the tap), as on a phone
  input.point(target.x, target.y); tick(1); tick(1);
  if (p.frontEnd.picked !== target.id) { check(`picked ${target.id} with a tap (paused ${p.frontEnd.paused}, picked ${p.frontEnd.picked}, at ${target.x},${target.y})`, false); press('KeyP'); continue; }
  press('Enter'); // (the frame it goes in, and one there: a trapdoor may take him on at once)
  const there = (spec.map.places?.(MAP_BOX, ram(), p.frontEnd.found) ?? []).find((q) => q.here)?.id;
  if (there === target.id && !p.frontEnd.paused) went++;
  else check(`went to ${target.id} (the map has him at ${there})`, false);
  // and plays on
  for (let f = 0; f < 100; f++) { input.keyDown(f % 50 < 25 ? 'ArrowLeft' : 'ArrowRight'); tick(1); }
  input.keyUp('ArrowLeft'); input.keyUp('ArrowRight');
  if (p.machine) played++;
}
check(`went to ${went} of ${places.length} places through the pause map, and played on from each (${played})`, went === places.length);
press('KeyP');
shot('after');
console.log(failures ? `${failures} FAILURES` : 'all good');
process.exit(failures ? 1 : 0);
