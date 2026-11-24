/**
 * Do Svidaniya Monty's pause screen map, through the front end: the whole world (every country's rooms on it, read from the exit
 * grid as the rooms have it: a kept entry for a room the rebuild cut is no place to go), scrolled to the picked room's country
 * (Monty's at first: Moscow's view, Rio past its right edge); the arrows go on from one country into the next and the view
 * follows, the pick always in the box; Enter goes to a room in another country; paused there, the view is that country's.
 * Under the map the key items are spread over two rows. With an out-dir, the screens are drawn (moscow.png, rio.png).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pause-map.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { indicesPng } from '../../../tools/probe/render';
import { iconAt, montyMap } from '../../montyotr/src/map';
import { regionAt } from '../../montyotr/src/regions';
import { MAP_BOX, type MapPlace } from '../../shared/native/pause';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { WORLD, WORLD_COLS } from '../src/data';
import { run } from '../src/main';
import { WORLD_REGIONS } from '../src/regions';

useMemoryStorage();
const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const g = p.game;
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
const outDir = process.argv[2];
function shot(name: string) {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  indicesPng(path.join(outDir, `${name}.png`), renderer.screen.pixels.map((v) => (v === 0xff ? renderer.background : v)), 320, 200);
}

tick(5);
tap('Space');
tick(80);
check(`play begins in Moscow's first room (${g.roomId})`, p.state.mode === 'play' && g.roomId === 0);

// every room on the grid visited, and two kept entries that are no longer rooms: an id no cell has, an id in a cell not its own
const cells = WORLD.exitGrid.image;
const onGrid = new Map<number, [row: number, col: number]>();
cells.forEach((id, i) => { if (id !== 0xff) onGrid.set(id, [Math.floor(i / WORLD_COLS), i % WORLD_COLS]); });
const rooms = p.state.found.rooms;
for (const [id, [row, col]] of onGrid) if (id !== g.roomId) rooms[id] = [0x40, 0xb2, row, col];
const gone = 0xf0, moved = [...onGrid.keys()].find((id) => id !== g.roomId) ?? 1;
check('the id kept for a cut room is on no cell of the grid', !onGrid.has(gone));
rooms[gone] = [0x40, 0xb2, 1, 2];
const regionOf = (row: number, col: number) => regionAt(WORLD_REGIONS, row, col)?.name;

tap('KeyP');
tick(2);
shot('moscow');
const fe = p.frontEnd;
const inBox = (q: MapPlace) => q.x >= MAP_BOX.x && q.x < MAP_BOX.x + MAP_BOX.w && q.y >= MAP_BOX.y && q.y < MAP_BOX.y + MAP_BOX.h;
const places = montyMap.places(MAP_BOX, g, p.state.found, undefined, fe.picked);
const ids = new Set(places.map((q) => Number(q.id)));
check(`paused: the whole world's rooms are places to go (${places.length} of ${onGrid.size}), every one a room on the grid, the cut room's id not one`,
  places.length === onGrid.size && [...onGrid.keys()].every((id) => ids.has(id)) && !ids.has(gone));
const inView = places.filter(inBox).map((q) => onGrid.get(Number(q.id))).flatMap((c) => (c ? [regionOf(c[0], c[1])] : []));
check(`Moscow's view: Monty's room picked, Moscow's rooms in the box and the next countries' after them; Rio past its right edge (${[...new Set(inView)].join(', ')})`,
  fe.picked === String(g.roomId) && inView.includes('moscow') && inView.includes('siberia') && !inView.includes('rio'));

// on east by the arrows: country after country, the pick always in the box (the view scrolls with it)
const seen: string[] = [];
let allIn = true;
for (let n = 0; n < 80; n++) {
  const at = onGrid.get(Number(fe.picked));
  const where = at ? regionOf(at[0], at[1]) : undefined;
  if (where && seen.at(-1) !== where) seen.push(where);
  if (where === 'rio') break;
  // (down where the country ahead is lower: the Pacific's rooms, the Andes')
  tap(at && at[1] >= 16 ? 'ArrowDown' : 'ArrowRight');
  tap('ArrowRight');
  const pick = montyMap.places(MAP_BOX, g, p.state.found, undefined, fe.picked).find((q) => q.id === fe.picked);
  if (!pick || !inBox(pick)) allIn = false;
}
check(`the arrows go on from country to country (${seen.join(', ')}), the view following: the pick in the box all the way`, seen[0] === 'moscow' && seen.at(-1) === 'rio' && seen.length >= 5 && allIn);
shot('rio');
const target = Number(fe.picked);
const rioView = montyMap.places(MAP_BOX, g, p.state.found, undefined, fe.picked).filter(inBox).map((q) => onGrid.get(Number(q.id))).flatMap((c) => (c ? [regionOf(c[0], c[1])] : []));
check(`picked in Rio, the view is Rio's: Moscow's rooms are past its left edge (${[...new Set(rioView)].join(', ')})`, rioView.includes('rio') && !rioView.includes('moscow'));
tap('Enter');
for (let n = 0; n < 300 && (g.roomId !== target || g.freeze); n++) tick();
check(`Enter: travel from Moscow to Rio's room ${target}`, !p.state.paused && g.roomId === target);

// paused in Rio: its own view from the start
tap('KeyP');
tick(2);
const here = montyMap.places(MAP_BOX, g, p.state.found, undefined, fe.picked).find((q) => q.here);
check('paused in Rio: his room is in the box', !!here && inBox(here) && here.id === String(target));
tap('KeyP');

// a kept entry for a room in a cell no longer its own is no place to go either
rooms[moved] = [0x40, 0xb2, 7, 0];
check('a room kept in a cell not its own is no place to go', !montyMap.places(MAP_BOX, g, p.state.found).some((q) => Number(q.id) === moved));

// the key items over two rows, spread out
const n = WORLD.progress.keyItems.length;
const icons = Array.from({ length: n }, (_, i) => iconAt(MAP_BOX, n, i));
const rows = [...new Set(icons.map((a) => a.y))];
const first = icons.filter((a) => a.y === rows[0]).map((a) => a.x);
check(`the ${n} key items take two rows (${icons.filter((a) => a.y === rows[0]).length} and ${icons.filter((a) => a.y === rows[1]).length}), 20 apart, at least 20 apart along a row (${(first[1] ?? 0) - (first[0] ?? 0)}), inside the box`,
  rows.length === 2 && (rows[1] ?? 0) - (rows[0] ?? 0) === 20 && (first[1] ?? 0) - (first[0] ?? 0) >= 20 && icons.every((a) => a.x + 16 <= MAP_BOX.w));

finish();
