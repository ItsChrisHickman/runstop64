/**
 * Entombed's pause map, headless (games/shared/native/play.ts as the browser runs it, c64kit stood
 * in by games/shared/test/kit.ts), from a save on floor 6 as Chris had one:
 *
 * - all seven floors on the map at once, at one scale, each by its number; headed with his floor
 *   (FLOOR 6 OF 7); no pages;
 * - every junction he's been to on any floor is a place to go, the picked box fitting round its
 *   junction (never over the next one's);
 * - the arrows pick (across floors too), Enter travels; a tap picks and a second tap travels,
 *   from floor 6 straight to floor 1 and back.
 *
 *   nice -n 15 node tools/test.mjs games/entombed/test/map.ts [out-dir]   (stills, 3x: phone size)
 */
import fs from 'node:fs';
import { Input, PixelRenderer, packState, unpackState } from 'c64kit';
import { cpu } from '../../shared/native/cpu';
import { NativeHost } from '../../shared/native/host';
import { MAP_BOX } from '../../shared/native/pause';
import { port } from '../src/native';
import { entombedMap } from '../src/map';
import { run } from '../src/main';
import { rgbPng } from '../../../tools/probe/render';
import { C64_PALETTE } from '../../../packages/c64kit/src/palette';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';

const store = useMemoryStorage();
const titleBytes = fs.readFileSync('games/entombed/assets/entombed-title.state');
stubFetch(titleBytes);

let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const all = [...Array(256).keys()].map((k) => `${k & 15},${k >> 4}`);
/** A floor's junctions ("x,y"), as the map has them. */
const junctions = (ram: Uint8Array, floor: number) => entombedMap.places(MAP_BOX, ram, { cells: { [floor]: all } }).map((p) => p.id.split(':')[1]);

// a save in the corridors of floor 6, as the autosave keeps one; found: floors 1, 2 and 5 in part, the west of floor 6
let start = '';
{
  const g = new NativeHost(port, unpackState(new Uint8Array(titleBytes)));
  for (let f = 0; f < 200; f++) { g.m.joy1 = g.m.joy2 = f > 50 && f < 60 ? 0x0f : 0x1f; g.tick(); }
  let done = false, cells: Record<number, string[]> = {};
  g.onWait = (site) => {
    if (done || site !== port.mainLoopWait) return;
    done = true; const r = { ...cpu };
    const seen6 = junctions(g.m.ram, 6).filter((k) => Number(k.split(',')[0]) < 8);
    start = seen6[Math.floor(seen6.length / 2)];
    cells = { 1: junctions(g.m.ram, 1).slice(0, 12), 2: junctions(g.m.ram, 2).slice(0, 8), 5: junctions(g.m.ram, 5), 6: seen6 };
    entombedMap.go(`6:${start}`, g.m.ram, {});
    Object.assign(cpu, r);
  };
  for (let f = 0; f < 5; f++) g.tick();
  check(`the save is on floor 6 (${g.m.ram[0x37f7]}), at ${start}`, g.m.ram[0x37f7] === 6);
  store.set('entombed.save.v1', Buffer.from(packState(must(g.save(), 'a save'))).toString('base64'));
  store.set('entombed.found.v1', JSON.stringify({ cells, stairs: { 5: { '3,0': 'up' }, 6: { '3,2': 'down' } }, chambers: { 6: { '5,2': 3 } }, doors: { 6: { 3: [5.4, 2, 1] } } }));
}

const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const press = (code: string) => { input.keyDown(code); tick(1); input.keyUp(code); tick(1); };
const tapAt = (x: number, y: number) => { input.point(x, y); tick(1); };
const outDir = process.argv[2];
const shot = (name: string) => {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  const rgb = new Float32Array(320 * 200 * 3);
  renderer.screen.pixels.forEach((v, i) => { const c = C64_PALETTE[(v === 0xff ? renderer.background : v) & 15]; rgb[i * 3] = (c >> 16) / 255; rgb[i * 3 + 1] = ((c >> 8) & 255) / 255; rgb[i * 3 + 2] = (c & 255) / 255; });
  rgbPng(`${outDir}/${name}.png`, rgb, 320, 200, 3);
};
const m = () => must(p.machine, 'the machine');
/** Whether he's at junction id ("floor:x,y") and back in play. */
const at = (id: string) => { const [f, x, y] = id.split(/[:,]/).map(Number); return !p.frontEnd.paused && m().ram[0x37f7] === f && m().ram[0x217e] === x && m().ram[0x217f] === y; };

await new Promise((r) => setTimeout(r, 0));
tick(132);
check('continued into the corridors of floor 6', p.state.playing && m().ram[0x37f7] === 6);

press('KeyP');
check('P: the pause screen', p.frontEnd.paused);
check(`headed with his floor: ${entombedMap.title(m().ram)}`, entombedMap.title(m().ram) === 'FLOOR 6 OF 7');
check('one map, no pages', !('pages' in entombedMap));
// every floor drawn: something lit in each floor's place (its number at least)
const places = entombedMap.places(MAP_BOX, m().ram, p.frontEnd.found);
const floors = new Set(places.map((pl) => pl.id.split(':')[0]));
check(`places to go on every floor he's walked (${[...floors].join(',')})`, [...floors].join() === '1,2,5,6');
const inside = places.every((pl) => pl.x >= MAP_BOX.x - 6 && pl.x <= MAP_BOX.x + MAP_BOX.w + 6 && pl.y >= MAP_BOX.y && pl.y <= MAP_BOX.y + MAP_BOX.h);
check('all of them inside the map (where a tap reaches)', inside);
check('the side panel has no floor count to confuse with the heading', !entombedMap.info(m().ram, p.frontEnd.found).some((l) => l.startsWith('FLOORS')));
shot('all-floors');
const here = must(places.find((pl) => pl.here), 'his place');
const r = here.r ?? 6;
const gap = Math.min(...places.filter((pl) => pl !== here).map((pl) => Math.max(Math.abs(pl.x - here.x), Math.abs(pl.y - here.y))));
check(`the picked box (${2 * r + 1} pixels) fits round its junction, short of the next (${gap} away)`, r >= 3 && r < gap - 2);
check(`picked where he is (${p.frontEnd.picked})`, p.frontEnd.picked === `6:${start}`);
press('ArrowLeft');
const to = must(p.frontEnd.picked, 'a pick');
check(`left picks the junction along (${to})`, to !== `6:${start}` && to.startsWith('6:'));
press('ArrowUp');
const up = must(p.frontEnd.picked, 'a pick');
check(`up: on to a floor above it on the map (${up})`, !up.startsWith('6:'));
shot('picked-up');
press('Enter');
tick(10);
check(`Enter: there (${m().ram[0x217e]},${m().ram[0x217f]} on floor ${m().ram[0x37f7]})`, at(up));

// taps: from where he is now, a junction on floor 1, then floor 6 again
for (const floor of [1, 6]) {
  press('KeyP');
  const ps = entombedMap.places(MAP_BOX, m().ram, p.frontEnd.found).filter((pl) => pl.id.startsWith(`${floor}:`) && !pl.here);
  const target = ps[Math.floor(ps.length / 2)];
  tapAt(target.x, target.y);
  check(`a tap picks ${target.id}`, p.frontEnd.picked === target.id);
  shot(`tap-floor${floor}`);
  tapAt(target.x, target.y);
  tick(10);
  check(`a second tap: there (${m().ram[0x217e]},${m().ram[0x217f]} on floor ${m().ram[0x37f7]})`, at(target.id));
}
press('KeyP');
check(`headed with his floor again: ${entombedMap.title(m().ram)}`, entombedMap.title(m().ram) === 'FLOOR 6 OF 7');
shot('back-on-6');
press('KeyP');

console.log(failures ? `${failures} failures` : 'all passed');
if (failures) process.exit(1);
