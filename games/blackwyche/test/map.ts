/**
 * Blackwyche's pause map and travel, as the browser runs them (keyboard through play.ts and the
 * front end): every place the map offers, and where it ends up.
 *
 * Starts from a recorded route's end with everything the ten recorded routes found on the map
 * (re/routes.json, as games/shared/native/test/travel.ts walks them). Then
 *
 * - every place the map offers to travel to is reachable with the arrow keys from where the
 *   cursor starts (found by pressing them, not by reading the code that moves it);
 * - every square the map draws as one he has been on (lit) is one the cursor can pick, and says
 *   where it goes;
 * - for every place: P, the arrows to it, Enter: after a second of play he is in that place (not
 *   bounced back to where he was), settled on his feet, and a second more on he is still there.
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/map.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { unpackState, type MachineState } from '../../../packages/c64kit/src/c64/machine';
import { MACHINE_CODEC } from '../../shared/continue';
import { NativeHost } from '../../shared/native/host';
import { MAP_BOX } from '../../shared/native/pause';
import { setJoy, GAMES } from '../../shared/native/test/games';
import { keepFound, toBase64, writeCurrent } from '../../shared/saves';
import type { BlackwycheFound } from '../src/map';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';
import { run } from '../src/main';
import { blackwycheMap, travelPlaces } from '../src/map';
import { placeId, settled, where } from '../src/travel';
import { readRoutes } from '../../shared/test/data';
import { check, finish } from '../../shared/test/check';

const titleBytes = fs.readFileSync('games/blackwyche/assets/blackwyche-title.state');
stubFetch(titleBytes);
const quiet = (what: string, ok: boolean) => check(what, ok, true);

// ---- the routes: the places they find, and a state to start from ----
const game = GAMES.blackwyche;
const routes = readRoutes('games/blackwyche/re/routes.json');
/** States caught in the middle of something (a jump, a strike, a climb, a fall), from the first route. */
const midway: { state: MachineState; found: BlackwycheFound }[] = [];
const walked = routes.map((steps, ri): { state: MachineState; found: BlackwycheFound } => {
  const g = new NativeHost(game.port, unpackState(new Uint8Array(titleBytes)));
  const found = blackwycheMap.found.empty();
  let frame = 0;
  for (let i = 0; i < steps.length; i += 2) for (let k = 0; k < steps[i + 1]; k++) {
    const v = steps[i];
    setJoy(g.m, game, v & 0x1f); g.m.keys = v & 32 ? [[1, 2]] : [];
    g.tick(); g.m.ram[0x9d77] = 100; g.m.ram[0x3417] = 0; frame++;
    if (g.lastWait === game.mainLoopWait && frame > 200) blackwycheMap.observe(g.m.ram, found, g.m.vic);
    if (ri === 0 && g.lastWait === game.mainLoopWait) {
      for (const a of [0x3427, 0x1ed0, 0x1ec7, 0x342a]) {
        if (g.m.ram[a] && !midway.some((m) => m.state.ram[a])) midway.push({ state: must(g.save(), 'a save'), found: structuredClone(found) });
      }
    }
  }
  return { state: must(g.save(), 'a save'), found };
});
/** Everything the routes found, as one record (the first place noted for each id wins; the rest of what the map keeps starts empty). */
function merged(): BlackwycheFound {
  const all = blackwycheMap.found.empty();
  const at = travelPlaces(all);
  for (const w of walked) for (const [id, v] of Object.entries(travelPlaces(structuredClone(w.found)))) at[id] ??= v;
  return all;
}
const found = merged();
let start = walked[0].state;
const offered = Object.keys(travelPlaces(structuredClone(found)));
console.log(`${offered.length} places to travel to: ${offered.join(' ')}`);

async function launch() {
  const store = new Map<string, string>();
  useMemoryStorage(store);
  writeCurrent('blackwyche', { data: toBase64(MACHINE_CODEC.pack(start)), at: 1, summary: ['MAP'], rooms: 1 });
  keepFound('blackwyche', structuredClone(found));
  const input = new Input(nowhere);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 0));
  const s = {
    p,
    tap(x: number, y: number) { input.point(x, y); s.tick(1); },
    tick(n = 1) { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } },
    press(code: string) { input.keyDown(code); s.tick(2); input.keyUp(code); s.tick(2); },
    ram: () => must(p.machine, 'the machine').ram,
    picked: () => p.frontEnd.picked,
    here: () => { const w = where(s.ram()); return w ? placeId(w) : '-'; },
  };
  for (let i = 0; i < 900 && !p.state.playing; i++) s.tick(1);
  s.tick(1);
  s.press('KeyP');
  return s;
}

const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

const pressedTo = (s: Awaited<ReturnType<typeof launch>>, path: string[]) => { for (const k of path) s.press(k); };

const starts = [...walked, ...midway];
const STARTS = process.env.STARTS ? process.env.STARTS.split(',').map(Number) : starts.map((_, i) => i);
let bad = 0, travels = 0;
for (const si of STARTS) {
  start = starts[si].state;
  const midMove = si >= walked.length;
  // ---- 1. the cursor: which places the arrows reach, and the way (from where the map opens) ----
  // (states caught in the middle of a move go on a frame as the map opens, so there the way is a tap on the map: touch)
  const session = await launch();
  const origin = must(session.picked(), 'a pick on opening the map');
  const hereAtStart = session.here() + (settled(session.ram()) ? '' : ', mid-move');
  const ways = new Map<string, string[]>([[origin, []]]);
  if (!midMove) {
    // (the map stays open: a tap puts the cursor on each place, then each arrow is pressed once to see where it goes)
    const edges = new Map<string, Map<string, string>>();
    const spots = blackwycheMap.places?.(MAP_BOX, session.ram(), session.p.state.found, 0) ?? [];
    for (const n of spots) {
      const to = new Map<string, string>();
      for (const k of ARROWS) {
        if (session.picked() !== n.id) { session.tap(n.x, n.y); session.tick(1); }
        quiet(`start ${si}: a tap picks ${n.id} (cursor on ${session.picked()})`, session.picked() === n.id);
        session.press(k);
        const next = session.picked();
        if (next !== null) to.set(k, next);
      }
      edges.set(n.id, to);
    }
    const queue = [origin];
    while (queue.length) {
      const at = must(queue.shift(), 'a place');
      for (const [k, to] of edges.get(at) ?? []) if (!ways.has(to)) { ways.set(to, [...(ways.get(at) ?? []), k]); queue.push(to); }
    }
  }
  if (!midMove) {
    const unreachable = offered.filter((id) => !ways.has(id));
    check(`start ${si} (${hereAtStart}): the arrows reach all ${offered.length} places the map offers (not reached: ${unreachable.join(' ') || 'none'})`, unreachable.length === 0);
  } else console.log(`start ${si} (${hereAtStart}): by taps`);

  // ---- touch: a tap on any square of a part or hall picks it (the cursor's box goes round them all) ----
{
  const s = await launch();
  const spots = blackwycheMap.places?.(MAP_BOX, s.ram(), s.p.state.found, 0) ?? [];
  let wrong = 0, taps = 0;
  for (const pl of spots.filter((q) => q.rx !== undefined && q.rx > 8 && !q.here)) {
    for (const dx of [-(pl.rx ?? 0) + 2, (pl.rx ?? 0) - 2]) {
      const other = must(spots.find((q) => q.id !== pl.id && q.id !== s.picked() && !q.here), 'another place');
      s.tap(other.x, other.y); s.tick(1); // (the pick elsewhere: a tap on the picked place would go there)
      s.tap(pl.x + dx, pl.y); taps++;
      if (s.picked() !== pl.id) { console.log(`FAIL a tap at ${Math.round(pl.x + dx)},${pl.y} picks ${s.picked()}, not ${pl.id}`); wrong++; }
    }
  }
  check(`a tap on the ends of each part and hall picks it (${taps} taps, ${wrong} wrong)`, wrong === 0);
}

// ---- 2. Enter: he is there, and stays ----
  for (const id of offered) {
    const way = ways.get(id);
    if (!way && !midMove) continue;
    const s = await launch();
    const from = s.here();
    if (way) pressedTo(s, way);
    else {
      const spot = must(blackwycheMap.places?.(MAP_BOX, s.ram(), s.p.state.found, 0).find((pl) => pl.id === id), 'a place on the map');
      s.tap(spot.x, spot.y);
      if (!spot.here) s.tick(2);
      if (spot.here) { s.tap(spot.x, spot.y); continue; }
    }
    if (s.picked() !== id) { console.log(`FAIL start ${si} ${id}: cursor on ${s.picked()} after its way`); bad++; continue; }
    if (process.env.TRACE === id) { const r = s.ram(); console.log('before', s.here(), [0x1519, 0x342c, 0x1ec7, 0x342a, 0x3427, 0x1ed0, 0x151f].map((a) => r[a]).join(','), 'chain', JSON.stringify(s.p.state.found.ship), 'jump6000', r[0x6000], r[0x6001], r[0x6002]); }
    if (way) s.press('Enter'); else s.tap(must(blackwycheMap.places?.(MAP_BOX, s.ram(), s.p.state.found, 0).find((pl) => pl.id === id), 'a place').x, must(blackwycheMap.places?.(MAP_BOX, s.ram(), s.p.state.found, 0).find((pl) => pl.id === id), 'a place').y);
    if (process.env.TRACE === id) for (let f = 0; f < 60; f++) { s.tick(); const r = s.ram(); console.log(f, s.here(), `room ${r[0x341c]} 342a=${r[0x342a]} 1ec7=${r[0x1ec7]} xy ${r[0x341f]},${r[0x3420]} grace=${s.p.state.grace}`); }
    s.tick(50);
    const a = s.here(), ok = a === id && (from === id || settled(s.ram()));
    s.tick(50);
    const b = s.here();
    travels++;
    if (!ok || b !== id || (s.p.state.paused && from !== id)) { console.log(`FAIL start ${si} ${id}: from ${from}: after a second ${a}${settled(s.ram()) ? '' : ' (not settled)'}, after two ${b}, paused ${s.p.state.paused}`); bad++; }
  }
}
check(`Enter takes him to each place offered, where he stays (${bad} of ${travels} not)`, bad === 0);

finish();
