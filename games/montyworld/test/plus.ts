/**
 * NEW GAME+ (montyotr's src/plus.ts, Do Svidaniya Monty's `newGamePlus`): Chris, 2026-11-26: "a new game plus that lets you start at the beginning with the
 * entire map open. And all the items still collected."
 *
 *  1. the map it begins with: every room of the exit grid a place to travel to (not only those visited); travelled to, each room has him standing in it,
 *     alive, through the moment's grace and on his feet after it (a way in is never inside a wall, over nothing or in a strike);
 *  2. in the session: a won game's save from before NEW GAME+ (a game won here, its save not NEW GAME+) is NEW GAME+ waiting on the title, the won game's
 *     kept as the previous save; ENTER CONTINUE begins it at Moscow's start, every key item his and nothing else, in the ushanka, no coin, the score nothing,
 *     the whole map open; the pause screen says NEW GAME+ (with an out-dir: pause.png); a reload carries it on as NEW GAME+; and NEW GAME over it is NEW GAME+ too.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/plus.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { indicesPng } from '../../../tools/probe/render';
import { montyMap } from '../../montyotr/src/map';
import { openMap, plusStart } from '../../montyotr/src/plus';
import { restore } from '../../montyotr/src/save';
import { frame, NONE, settled } from '../../montyotr/test/play';
import { hold, newGame } from '../../shared/monty/test/bot';
import { readSaves } from '../../shared/saves';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { WORLD } from '../src/data';
import { CODEC, run } from '../src/main';
import { unpackSlot } from '../../shared/continue';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
const PLUS = must(WORLD.ending?.newGamePlus, 'NEW GAME+');
const { keyItems } = WORLD.progress;

// ---- 1. the map: every room, and a way into each ----------------------------------------------------------------------------------
{
  const grid = [...new Set(WORLD.exitGrid.image)].filter((id) => id !== 0xff);
  const found = openMap(WORLD, montyMap.found.empty());
  // (but the flight's legs: he flies them, he stands nowhere in them, and the biplane at Hilo is the way into them)
  const flown = new Set(WORLD.planes.map((leg) => leg.room));
  const missing = grid.filter((id) => !(String(id) in found.rooms) && !flown.has(id));
  check(`every room of the grid but the flight's legs is on NEW GAME+'s map (${grid.length - missing.length - flown.size} of ${grid.length - flown.size}; none: ${missing.join(' ') || '-'})`, missing.length === 0 && [...flown].every((id) => !(String(id) in found.rooms)));

  const base = newGame(WORLD, true);
  restore(base.g, plusStart(WORLD, PLUS.worn));
  for (let n = 0; n < 200 && !settled(base.g); n++) frame(base, NONE);
  const bad: string[] = [];
  for (const id of grid) {
    if (!(String(id) in found.rooms) || id === base.g.roomId) continue;
    const s = newGame(WORLD, true);
    restore(s.g, plusStart(WORLD, PLUS.worn));
    for (let n = 0; n < 200 && !settled(s.g); n++) frame(s, NONE);
    let graceLeft = 150;
    s.g.graceActive = () => graceLeft > 0;
    if (!montyMap.go(String(id), s.g, found)) { bad.push(`${id}: no travel`); continue; }
    for (let n = 0; n < 300 && !(s.g.roomId === id && settled(s.g)); n++) frame(s, NONE);
    if (s.g.roomId !== id) { bad.push(`${id}: not there (${s.g.roomId})`); continue; }
    const y = s.g.y;
    const held = hold(s, NONE, 150);
    graceLeft = 0;
    if (held.dead) bad.push(`${id}: died`);
    else if (held.room !== null) bad.push(`${id}: left for ${held.room}`);
    // (in the sea he floats: alive and in the room is all)
    else if (!WORLD.swimRooms.includes(id) && (s.g.falling || s.g.y !== y)) bad.push(`${id}: not standing (y ${y} to ${s.g.y})`);
  }
  check(`travelled to, every room has him standing where it is come into, alive (${bad.join('; ') || 'all'})`, bad.length === 0);
}

// ---- 2. in the session ----------------------------------------------------------------------------------------------------------
const store = useMemoryStorage();
function boot() {
  const inp = new Input(nowhere), rend = new PixelRenderer(), p = run({ renderer: rend, input: inp, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { inp.poll(); p.tick(); p.render(0); } };
  const press = (code: string) => { inp.keyDown(code); tick(1); inp.keyUp(code); tick(1); };
  const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
  return { p, g: p.game, tick, press, until, rend };
}
/** NEW GAME+ as it begins: Moscow's start, every key item and nothing else, the ushanka on, no coin, the score nothing, the whole map open. */
function isPlusStart(s: ReturnType<typeof boot>): boolean {
  const g = s.g, start = WORLD.start;
  const items = g.siCollected.every((v, i) => (keyItems.includes(i) ? v !== 0 : v === 0));
  const open = Object.keys(s.p.state.found.rooms).length >= Object.keys(openMap(WORLD, montyMap.found.empty()).rooms).length;
  return g.plus && g.mapRow === start.mapRow && g.exitCol === start.exitCol && items && g.worn === PLUS.worn && g.coinCollected.every((v) => v === 0) && g.score === 0 && open;
}
const current = () => { const slot = readSaves('montyworld').current; return slot ? unpackSlot(CODEC, slot) : null; };
{
  store.clear();
  // a game played a while (an autosave in its first rooms), then won before NEW GAME+ was here
  {
    const s = boot();
    s.tick(300);
    s.press('Space');
    s.until(() => s.p.state.hasSave && s.p.state.mode === 'play', 400);
    s.tick(100);
  }
  const before = current();
  check('a game\'s save, not NEW GAME+', before !== null && before.plus !== true);
  store.set('montyworld.won', '1');
  const s = boot();
  const now = current();
  check('won here, its save is NEW GAME+ waiting at the start (the won game\'s kept as the previous save)', now?.plus === true && now.roomId === before?.roomId && readSaves('montyworld').previous !== null);
  s.tick(300);
  s.press('Enter');
  check('ENTER CONTINUE begins NEW GAME+: Moscow\'s start, every key item, the ushanka, nothing else, the whole map open', s.until(() => s.p.state.mode === 'play' && settled(s.g), 300) && isPlusStart(s));
  s.tick(60);
  s.press('KeyP');
  check('the pause screen is up', s.p.state.paused);
  s.tick(30);
  const px = s.rend.screen.pixels;
  // (NEW GAME+ in yellow in the side panel, between the legend and the options: letters there and nothing else, no box)
  let yellow = 0, other = 0;
  for (let y = 95; y < 118; y++) for (let x = 222; x < 318; x++) { const v = px[y * 320 + x]; if (v === 7) yellow++; else if (v !== 0 && v !== 0xff) other++; }
  check(`the pause screen says NEW GAME+ in yellow in the panel's empty spot (${yellow} yellow pixels, ${other} others there)`, yellow > 40 && other === 0);
  if (out) indicesPng(path.join(out, 'pause.png'), px.map((v) => (v === 0xff ? s.rend.background : v)), 320, 200);
  s.press('KeyP');
  s.tick(30);
}
{
  const s = boot();
  s.tick(300);
  s.press('Enter');
  check('after a reload, ENTER CONTINUE carries NEW GAME+ on', s.until(() => s.p.state.mode === 'play' && settled(s.g), 300) && s.g.plus && current()?.plus === true);
  s.press('KeyP'); s.press('KeyT');
  s.tick(300);
  s.press('Space');
  const asked = s.p.state.prompt === 'newGame';
  s.press('Space');
  s.tick(20);
  check(`NEW GAME (asked: ${asked}) over it, once won: NEW GAME+ again`, asked && s.p.state.mode === 'play' && isPlusStart(s));
}
finish();
