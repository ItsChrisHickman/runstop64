/**
 * Do Svidaniya Monty's pause screen map, through the front end: the whole world (every country's rooms on it, read from the exit
 * grid as the rooms have it: a kept entry for a room the rebuild cut is no place to go), scrolled to the picked room's country
 * (Monty's at first: Moscow's view, Rio past its right edge); the arrows go on from one country into the next and the view
 * follows, the pick always in the box; Enter goes to a room in another country; paused there, the view is that country's.
 * The heading names the country in view (MOSCOW at first, then each country the arrows or taps scroll to; THE SKY over the flight).
 * A cell of space before a region reached by plane (the sky and the Andes after Hilo). Under the map the key items are spread over two rows. With an out-dir, the screens are drawn (moscow.png, pick-<n>-<country>.png as the pick enters each country, rio.png, sky.png).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pause-map.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { indicesPng } from '../../../tools/probe/render';
import { iconAt, mapView, montyMap } from '../../montyotr/src/map';
import { regionAt } from '../../montyotr/src/regions';
import { MAP_BOX, type MapPlace } from '../../shared/native/pause';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { WORLD, WORLD_COLS } from '../src/data';
import { run } from '../src/main';
import { WORLD_REGIONS } from '../src/regions';
import { FLY } from '../src/sky';

useMemoryStorage();
const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const g = p.game;
/** The biggest move of the map's view between two drawn frames, and how many frames it moved in (the camera: never a jump). */
let biggestStep = 0, movingFrames = 0;
const tick = (n = 1) => {
  for (let i = 0; i < n; i++) {
    const before = mapView(g)?.shown;
    input.poll(); p.tick(); p.render(0);
    const after = mapView(g)?.shown;
    if (before && after && p.state.paused) {
      const d = Math.max(Math.abs(after.x - before.x), Math.abs(after.y - before.y));
      biggestStep = Math.max(biggestStep, d);
      if (d) movingFrames++;
    }
  }
};
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
const labelOf = (name: string | undefined) => WORLD_REGIONS.find((r) => r.name === name)?.label;
/** The map's heading as the pause screen has it now (its pick). */
const heading = () => montyMap.title(g, undefined, p.frontEnd.picked);

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
{
  // the flight from Hilo is a jump on the map, not one room over (Chris, 2026-11-25): a cell of space before every region reached by plane, from the regions' data
  const xs = new Map<number, number>();
  for (const q of places) { const at = onGrid.get(Number(q.id)); if (at) xs.set(at[1], q.x); }
  const flown = new Set(WORLD_REGIONS.filter((r) => r.flown).map((r) => r.from));
  const steps = [...xs.keys()].filter((c) => xs.has(c - 1)).map((c) => ({ c, d: (xs.get(c) ?? 0) - (xs.get(c - 1) ?? 0) }));
  const cell = Math.min(...steps.map((q) => q.d));
  check(`the map leaves a cell of space before a region reached by plane (columns ${[...flown].join(', ')}: ${steps.filter((q) => flown.has(q.c)).map((q) => `${q.d} pixels`).join(', ')} where a cell is ${cell}), and none between the other columns`,
    flown.size > 0 && [...flown].every((c) => steps.find((q) => q.c === c)?.d === 2 * cell) && steps.every((q) => flown.has(q.c) || q.d === cell));
}
check(`Moscow's view is headed MOSCOW (${heading()}), and every heading fits the panel's 214 pixels centred`, heading() === 'MOSCOW' && WORLD_REGIONS.every((r) => r.label.length * 8 <= 214));

// on east by the arrows: country after country, the pick always in the box (the view scrolls with it)
const seen: string[] = [];
const headings: string[] = [];
let allIn = true;
for (let n = 0; n < 80; n++) {
  const at = onGrid.get(Number(fe.picked));
  const where = at ? regionOf(at[0], at[1]) : undefined;
  if (where && seen.at(-1) !== where) { seen.push(where); headings.push(heading() === labelOf(where) ? heading() : `${heading()}?`); shot(`pick-${seen.length}-${where}`); }
  if (where === 'rio') break;
  // (down where the country ahead is lower: the Pacific's rooms, the Andes')
  tap(at && at[1] >= 16 ? 'ArrowDown' : 'ArrowRight');
  tap('ArrowRight');
  const pick = montyMap.places(MAP_BOX, g, p.state.found, undefined, fe.picked).find((q) => q.id === fe.picked);
  if (!pick || !inBox(pick)) allIn = false;
}
check(`the arrows go on from country to country (${seen.join(', ')}), the view following: the pick in the box all the way`, seen[0] === 'moscow' && seen.at(-1) === 'rio' && seen.length >= 5 && allIn);
check(`the view slides, never jumps: at most 4 pixels between frames (biggest ${biggestStep}, moving in ${movingFrames} frames)`, biggestStep > 0 && biggestStep <= 4);
check(`the heading follows the view, naming each country as the pick enters it (${headings.join(', ')})`, headings.length === seen.length && headings.every((h, i) => h === labelOf(seen[i])));
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

// by touch: a tap on a room picks it and the view scrolls to its country; tapping the room furthest west in the box, again and
// again, goes back country by country to Moscow (the pick in the box all the way, a tap never a trip until the picked room is tapped)
const touchSeen: string[] = [];
let touchIn = true;
for (let n = 0; n < 40 && p.state.paused; n++) {
  const at = onGrid.get(Number(fe.picked));
  const where = at ? regionOf(at[0], at[1]) : undefined;
  if (where && touchSeen.at(-1) !== where) touchSeen.push(where);
  if (where === 'moscow') break;
  const shown = montyMap.places(MAP_BOX, g, p.state.found, undefined, fe.picked);
  const pick = shown.find((q) => q.id === fe.picked);
  if (!pick || !inBox(pick)) { touchIn = false; break; }
  const west = shown.filter((q) => inBox(q) && q.id !== fe.picked).sort((a, b) => a.x - b.x)[0];
  if (!west || west.x >= pick.x) break;
  input.point(west.x, west.y);
  tick(2);
}
check(`taps go back from country to country (${touchSeen.join(', ')}), never travelling, the pick in the box`, p.state.paused && touchSeen.at(-1) === 'moscow' && touchIn && g.roomId === target);
check(`tapped back to Moscow, the heading is MOSCOW again (${heading()}), though Monty is in Rio`, heading() === 'MOSCOW');
tap('KeyP');

// the flight is a country of its own on the map: paused in the sky, THE SKY, its three legs in the box at the map's cell size (no other country's rows squeezed in)
check('travel to the second leg of the flight', montyMap.go(String(FLY.storm), g, p.state.found));
for (let n = 0; n < 300 && (g.roomId !== FLY.storm || g.freeze); n++) tick();
tap('KeyP');
tick(2);
shot('sky');
const skyView = montyMap.places(MAP_BOX, g, p.state.found, undefined, fe.picked).filter(inBox).map((q) => onGrid.get(Number(q.id))).flatMap((c) => (c ? [regionOf(c[0], c[1])] : []));
check(`paused in the sky: headed THE SKY (${heading()}), its legs in the box (${[...new Set(skyView)].join(', ')})`, heading() === 'THE SKY' && skyView.filter((r) => r === 'sky').length === 3 && !skyView.includes('moscow'));
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
