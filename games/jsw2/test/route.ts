/**
 * Jet Set Willy II's map, played as a person plays (games/shared/native/play.ts as the browser runs
 * it, c64kit stood in by games/shared/test/kit.ts): a new game, then a long route through the
 * mansion (re/routes.json, found by re/route.ts: walking and jumping, never stopping on purpose),
 * the keys held as a player holds them. Then:
 *
 * - most rooms passed through can be picked on the map (TRAVEL, not NO TRAVEL); for comparison,
 *   how many the rule before (a third of a second standing still) would have offered;
 * - what's been found is kept with the autosave: a launch later (the page opened again, straight
 *   back into play) offers the same rooms;
 * - picking: by the arrows, by taps (a tap picks, a second goes) and Enter;
 * - travel to every room offered: he's in that room, where he was on the walk there (a spot he
 *   walked through: where he came in, or landed), and alive 200 frames later, standing still.
 *
 * Played in ORIGINAL: the route was found under the game's own rules (a long fall kills, and he
 * starts the room again where he came in), and ENHANCED's safe landings would take it elsewhere.
 * The map, travel and autosave are the same in both modes.
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/route.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { run } from '../src/main';
import { MANSION } from '../src/mansion';
import { jsw2Map } from '../src/map';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { isNumbers, isRecord, readJson } from '../../shared/guards';
import { MAP_BOX } from '../../shared/native/pause';
import { must } from '../../shared/test/must';
import { check, finish } from '../../shared/test/check';

useMemoryStorage(new Map([['jsw2.assist', JSON.stringify({ enhanced: false })]])); // (the switch as the page remembers it)
stubFetch(fs.readFileSync('games/jsw2/assets/jsw2-title.state'));


const routeJson: unknown = readJson(fs.readFileSync('games/jsw2/re/routes.json', 'utf8'));
if (!isRecord(routeJson) || !isNumbers(routeJson.rooms) || !isNumbers(routeJson.joystick)) throw new Error('re/routes.json: { rooms, joystick } expected');
const route = { rooms: routeJson.rooms, joystick: routeJson.joystick };

const input = new Input(nowhere);
const launch = async () => {
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 50));
  return p;
};
let p = await launch();
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(3); input.keyUp(code); tick(3); };
const ram = () => must(p.machine, 'the machine').ram;
const room = () => ram()[0x13];
const lives = () => { let n = 0; for (let b = ram()[0x8096]; b; b >>= 1) n += b & 1; return n; };
const spot = () => `${ram()[0x8062]},${ram()[0x8072] & 1},${ram()[0x8063]}`;

// ---- the walk: the joystick as keys, held and let go as a player does ----
const KEYS: [number, string][] = [[4, 'ArrowLeft'], [8, 'ArrowRight'], [16, 'Space']];
const held = new Set<string>();
const hold = (joy: number) => {
  for (const [bit, code] of KEYS) {
    const on = !(joy & bit);
    if (on && !held.has(code)) { input.keyDown(code); held.add(code); }
    if (!on && held.has(code)) { input.keyUp(code); held.delete(code); }
  }
};
// (as for the rule before: where he first stood still, a third of a second on his feet, in each room)
const stoodBefore = new Set<number>();
let still = { room: -1, at: '', n: 0 };
const standing = () => !ram()[0x82e4] && !ram()[0x8292] && !ram()[0x835d] && !ram()[0x82d7];
/** Where he's been in each room on the walk (each spot, as x,high bit,y). */
const walked = new Map<number, Set<string>>();
const passed: number[] = [];
for (let i = 0; i < route.joystick.length; i += 2) {
  for (let n = 0; n < route.joystick[i + 1]; n++) {
    hold(route.joystick[i]);
    tick();
    if (p.state.playing) {
      const r = room();
      if (passed[passed.length - 1] !== r) passed.push(r);
      const w = walked.get(r) ?? new Set<string>();
      w.add(spot()); walked.set(r, w);
      w.add(`${ram()[0x82a8]},${ram()[0x82ac] & 1},${ram()[0x82a9]}`); // (where the game has him come in: it starts him there again after a lost life)
      if (!standing() || still.room !== r || still.at !== spot()) still = { room: r, at: spot(), n: 0 };
      else if (++still.n === 16) stoodBefore.add(r);
    }
    ram()[0x8096] = 0xff; // (lives kept full along the route, as when it was found)
  }
}
hold(0x1f);
tick(150); // (the last room drawn, its autosave made: once he has found his feet there and lived a second)
const rooms = [...new Set(passed)].filter((r) => MANSION[r]);
check(`the route as found: ${passed.length} arrivals through ${rooms.length} rooms (${passed.join(' ')})`, passed.join(' ') === route.rooms.join(' '));

// ---- the map ----
const stand = () => p.state.found.stand;
const offered = () => rooms.filter((r) => r !== room() && String(r) in stand());
const before = rooms.filter((r) => stoodBefore.has(r));
console.log(`     rooms passed through (not counting the one he's in): ${rooms.length - 1}; offered for travel: ${offered().length}; by the rule before: ${before.filter((r) => r !== room()).length}`);
check('most rooms passed through are offered for travel (at least 3 in 4)', offered().length * 4 >= (rooms.length - 1) * 3);
for (const r of rooms) if (!(String(r) in stand()) && r !== room()) console.log(`     not offered: ${r} ${MANSION[r].name}`);

// the page opened again: straight back into play, the map as it was
const offeredThen = offered().join(' ');
p = await launch();
tick(120);
check(`opened again: back in play in the same room (${room()})`, p.state.playing && room() === passed[passed.length - 1]);
check('opened again: the same rooms offered (what was found is kept with the autosave)', offered().join(' ') === offeredThen);

// ---- picking: arrows, taps, Enter ----
/** P: the pause map (if it isn't up already). */
const openMap = () => { if (!p.state.paused) tap('KeyP'); };
openMap();
check('P: the pause map', p.state.paused);
const pickedNow = () => p.frontEnd.picked;
const first = pickedNow();
const moves: string[] = [];
for (const k of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) { tap(k); moves.push(`${k.slice(5)} ${pickedNow()}`); }
check(`the arrows move the pick (${first} then ${moves.join(', ')})`, new Set([first, ...moves.map((m) => m.split(' ')[1])]).size > 2);
/** Where a room offered is drawn on the pause map (the map's own places, as the front end reads them). */
const placeOf = (r: number) => must(must(jsw2Map.places, 'places')(MAP_BOX, ram(), p.state.found).find((q) => q.id === String(r)), `room ${r} on the map`);
const tapAt = (x: number, y: number) => { input.point(x, y); tick(1); tick(2); };
const goals = offered();
const byTap = must(goals[0], 'a room to go to');
const at = placeOf(byTap);
tapAt(at.x, at.y);
check(`a tap on room ${byTap} picks it`, pickedNow() === String(byTap) && p.state.paused);
tapAt(at.x, at.y);
tick(120);
check(`a second tap goes there (room ${room()}, ${MANSION[room()]?.name})`, !p.state.paused && room() === byTap);
openMap();
const arrows = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
for (let i = 0; i < 8 && pickedNow() === String(room()); i++) tap(arrows[i % 4]);
const viaArrow = pickedNow();
tap('Enter');
tick(120);
check(`arrows and Enter go there (picked ${viaArrow}, in ${room()})`, !p.state.paused && String(room()) === viaArrow);

// ---- travel to every room offered: where he was on the walk, alive 200 frames on ----
let safe = 0;
for (const r of goals) {
  if (r === room()) continue;
  openMap();
  const xy = placeOf(r);
  tapAt(xy.x, xy.y);
  if (pickedNow() !== String(r)) { check(`room ${r} picked by a tap`, false); tap('KeyP'); continue; }
  tapAt(xy.x, xy.y);
  const was = lives();
  // (the game draws the room over some frames; then the map puts him where he came in)
  for (let n = 0; n < 100 && p.state.found.to !== null; n++) tick();
  const arrived = room(), where = spot();
  let fell = 0; // (how far he fell after arriving: the fall byte, $82D7)
  for (let n = 0; n < 200; n++) { tick(); fell = Math.max(fell, ram()[0x82d7]); }
  const ok = arrived === r && room() === r && lives() === was && !!walked.get(r)?.has(where) && fell === 0;
  if (ok) safe++;
  else check(`travel to ${r} ${MANSION[r].name}: in ${arrived} at ${where} (${walked.get(r)?.has(where) ? 'a spot walked through' : 'not a spot walked through'}), 200 frames on in ${room()}, lives ${was} -> ${lives()}, fell ${fell}`, false);
  ram()[0x8096] = 0xff;
}
check(`travel to every room offered lands where he was on the walk, on his feet (no fall), alive 200 frames later (${safe} of ${goals.length})`, safe === goals.length);

finish();
