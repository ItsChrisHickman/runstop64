/**
 * The % complete and the best ending (montyotr's src/percent.ts, src/passport.ts; src/full-monty.ts; Chris, 2026-11-25: "I love when games have a % complete -- and I
 * love the idea of there being a best ending for 100% complete"):
 *
 *  1. the % math: every room of the grid but the flight rooms, every coin, snack and key item, each bonus room's challenge (its coins), each of Viktor's chases;
 *     rounded down, so 100 only when every part is done; every part in a region, a region's stamp at its own 100%; the play time as text;
 *  2. the save keeps the rooms visited and the play time; a save from before them takes the map's rooms visited (not NEW GAME+'s, whose map is opened whole);
 *  3. the finale: at 100% THE FULL MONTY plays after the dance (the name row says so, the picture fades out, then GAME OVER), every frame before it the finale as
 *     it was; at 99% (one coin left) the finale alone, as it was; THE END's lines have the % and the time;
 *  4. the pause screen: the % in light green in the panel's empty spot, no box; Tab turns to the PASSPORT page (a stamp in its ink for a region at 100%, the rest
 *     dark), and back to the map; THE END's ROOMS count the rooms the % counts;
 *  5. the sky's parts can be had again: flown once with a coin of a leg missed, the biplane at Hilo takes him up again and the coin is there to take.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/full-monty.ts [out-dir]
 *
 * With an out-dir: pause.png, passport.png, the FULL MONTY's frames (fm-<n>.png) and full-monty-sheet.png (them all, three across).
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { endingStats, enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { progressOf } from '../../montyotr/src/map';
import { cellOf } from '../../montyotr/src/montydata';
import { flightRooms, fullyComplete, hasPercent, isFull, percentOf, percentText, tallyOf, timeText, type Progress } from '../../montyotr/src/percent';
import { plusStart } from '../../montyotr/src/plus';
import { regionAt } from '../../montyotr/src/regions';
import { parseSave, restore, snapshot } from '../../montyotr/src/save';
import { frame, NONE, settled } from '../../montyotr/test/play';
import { MOTR } from '../../montyotr/src/motr';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { readJson } from '../../shared/guards';
import { newGame } from '../../shared/monty/test/bot';
import { ROUNDS, WORLD } from '../src/data';
import { PAC } from '../src/pacific';
import { FLY } from '../src/sky';
import { run } from '../src/main';
import { FULL_MONTY_NAME } from '../src/full-monty';
import { RIO_ROOM as R } from '../src/rio';
import { at, RIGHT, rowText } from './mech-kit';
import { itemIndex, standY } from './route';
import { contactSheet, savePng, shot } from './shots-kit';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
const data = WORLD;
const COINS = data.coinTable.length / 3, ITEMS = data.specialItems.length / 4;
const grid = [...new Set(data.exitGrid.image)].filter((id) => id !== 0xff);
const chases = [...new Set(data.pursuers.map((p) => p.until))];
const counted = [...new Set([...data.progress.keyItems, ...data.progress.cakes, ...chases])];
const flights = flightRooms(data);

/** A progress with everything done, as flags. */
function full(): { visited: Uint8Array; coins: Uint8Array; items: Uint8Array } {
  const visited = new Uint8Array(256), coins = new Uint8Array(COINS).fill(0xff), items = new Uint8Array(ITEMS);
  for (const id of grid) visited[id] = 1;
  for (const i of counted) items[i] = 0x81;
  return { visited, coins, items };
}
const roomOfCoin = (i: number) => data.coinTable[i * 3] ?? 0xff;
const regionOf = (room: number) => { const c = cellOf(data, room); return c ? regionAt(data.regions, c.row, c.col)?.name : undefined; };

// ---- 1. the % math ---------------------------------------------------------------------------------------------------------------
{
  const bonus = must(data.complete, 'complete').bonus;
  const rooms = grid.filter((id) => !flights.includes(id)).length;
  const parts = rooms + COINS + counted.length + bonus.length;
  const none = must(tallyOf(data, { visited: new Uint8Array(256), coins: new Uint8Array(COINS), items: new Uint8Array(ITEMS) }), 'tally');
  check(`nothing done: 0% of ${none.total.all} parts (${rooms} rooms, the flight rooms ${flights.join(' ')} left out; ${COINS} coins; ${counted.length} snacks, key items and chases; ${bonus.length} bonus challenges)`, none.total.all === parts && none.total.got === 0 && percentOf(none.total) === 0);
  const all = full();
  const t = must(tallyOf(data, all), 'tally');
  check('everything done: 100%, every region full', percentOf(t.total) === 100 && isFull(t.total) && fullyComplete(data, all) && t.regions.every(isFull));
  check(`every part is in a region (${t.regions.map((r) => `${r.name} ${r.all}`).join(', ')}), every region has parts`, t.regions.reduce((n, r) => n + r.all, 0) === t.total.all && t.regions.every((r) => r.all > 0));
  // one coin left (not a bonus room's): 99%, not complete, its region not full
  const plain = must(Array.from({ length: COINS }, (_, i) => i).find((i) => !bonus.includes(roomOfCoin(i))), 'a coin');
  const missing = { ...all, coins: Uint8Array.from(all.coins) };
  missing.coins[plain] = 0;
  const m = must(tallyOf(data, missing), 'tally');
  const region = regionOf(roomOfCoin(plain));
  check(`one coin left: ${percentText(data, missing)}, not complete, ${region} not full and every other region full`, percentOf(m.total) === 99 && !fullyComplete(data, missing) && m.regions.every((r) => isFull(r) === (r.name !== region)));
  // a bonus room's coin: the coin and the challenge
  const bonusCoin = must(Array.from({ length: COINS }, (_, i) => i).find((i) => roomOfCoin(i) === bonus[0]), 'a bonus coin');
  const noBonus = { ...all, coins: Uint8Array.from(all.coins) };
  noBonus.coins[bonusCoin] = 0;
  check('a bonus room\'s coin left: two parts short (the coin, and the challenge it ends)', must(tallyOf(data, noBonus), 'tally').total.got === t.total.all - 2);
  // a chase not escaped, a room not visited, a flight room visited or not
  const noChase = { ...all, items: Uint8Array.from(all.items) };
  noChase.items[must(chases[0], 'a chase')] = 0;
  const noRoom = { ...all, visited: Uint8Array.from(all.visited) };
  noRoom.visited[0] = 0;
  const noFlight = { ...all, visited: Uint8Array.from(all.visited) };
  for (const id of flights) noFlight.visited[id] = 0;
  check('a chase not escaped, or a room not visited, is not complete; the flight rooms not visited still are', !fullyComplete(data, noChase) && !fullyComplete(data, noRoom) && fullyComplete(data, noFlight));
  check(`the play time as text (${timeText(0)}, ${timeText(50 * 61)}, ${timeText(50 * 3723)})`, timeText(0) === '0:00' && timeText(50 * 61) === '1:01' && timeText(50 * 3723 + 49) === '1:02:03');
  check('Monty on the Run has no %', !hasPercent(MOTR) && percentText(MOTR, all) === null);
}

// ---- 2. the save -----------------------------------------------------------------------------------------------------------------
{
  const s = at(R.bust, 3, 18);
  s.g.visited.fill(0); s.g.visited[3] = 1; s.g.visited[R.bust] = 1; s.g.playFrames = 12345;
  const saved = snapshot(s.g);
  check('a save keeps the rooms visited and the play time', JSON.stringify(saved.visited) === JSON.stringify([3, R.bust].sort((a, b) => a - b)) && saved.time === 12345);
  const back = at(R.bust, 3, 18);
  restore(back.g, saved, [1, 2]);
  check('carried on from, the game has them again (not the map\'s)', back.g.visited[R.bust] === 1 && back.g.visited[1] === 0 && back.g.playFrames === 12345);
  const older = { ...saved };
  delete older.visited; delete older.time;
  const parsed = must(parseSave(readJson(JSON.stringify(older))), 'an older save');
  const old = at(R.bust, 3, 18);
  restore(old.g, parsed, [1, 2]);
  check('a save from before them loads, with the map\'s rooms visited and the time from nothing', old.g.visited[1] === 1 && old.g.visited[2] === 1 && old.g.playFrames === 0);
  const plus = plusStart(data, null);
  const p = at(R.bust, 3, 18);
  restore(p.g, plus, grid);
  check('NEW GAME+ counts its own: no room of the opened map is visited before he comes into it', p.g.visited.every((v, id) => !v || id === p.g.roomId || id === R.bust) && plus.visited?.length === 0 && plus.time === 0);
}

// ---- 3. the finale ----------------------------------------------------------------------------------------------------------------
/** The finale played from the bowl's room in the headdress, with the progress `as` (it is set as he touches the bowl): its frames, the frame GAME OVER began, whether the name row said THE FULL MONTY, the game. */
function finale(as: Progress, keep: (f: number) => boolean) {
  const s = at(R.bust, 3, 18, [[R.float, 0], [R.drum, 0]], false, true);
  wear(s.g, itemIndex(s.g, R.drum, 0));
  s.g.visited.set(as.visited); s.g.coinCollected.set(as.coins); s.g.siCollected.set(as.items);
  for (let f = 0; f < 200 && !s.g.completionActive; f++) frame(s, RIGHT);
  const pics: Uint8Array[] = [], hashes: number[] = [];
  let over = -1, named = -1;
  for (let f = 0; f < 4000 && over < 0; f++) {
    frame(s, NONE);
    if (s.g.gameOverActive) over = f;
    if (named < 0 && rowText(s.g).toUpperCase() === FULL_MONTY_NAME) named = f;
    const px = shot(s.g);
    let h = 0;
    for (let i = 0; i < px.length; i += 7) h = Math.imul(h ^ (px[i] ?? 0), 0x01000193) >>> 0;
    hashes.push(h);
    if (keep(f)) pics.push(px);
  }
  return { over, named, hashes, pics, g: s.g };
}
{
  const all = full();
  const one = { ...all, coins: Uint8Array.from(all.coins) };
  one.coins[0] = 0;
  const short = finale(one, () => false);
  check(`99% (a coin left): the finale as it was, no FULL MONTY (GAME OVER ${short.over} frames on)`, short.named < 0 && short.over > 900 && short.over < 1200);
  // (the FULL MONTY's frames to look at: from just before it, every 24 frames)
  const best = finale(all, (f) => f >= short.over - 40 && (f - short.over) % 24 === 0);
  check(`100%: THE FULL MONTY after the dance (named ${best.named} frames on), GAME OVER after it (${best.over})`, best.named > 0 && best.over > short.over + 400 && best.g.won);
  const before = short.over - 0x21;
  const same = best.hashes.slice(0, before).every((h, i) => h === short.hashes[i]);
  check(`every frame of the finale before it (${before}) as the finale alone has it: the close-up, the bowl and the dance untouched`, same);
  const lines = endingStats(best.g, { rooms: {} });
  const counted = grid.filter((id) => !flights.includes(id)).length;
  const roomsLine = lines.find((l) => l.startsWith('ROOMS')) ?? '';
  check(`THE END's ROOMS count the rooms the % counts, the flight rooms left out (${roomsLine.replace(/ +/g, ' ')}, beside COMPLETE 100%)`, new RegExp(`^ROOMS +${counted}/${counted}$`).test(roomsLine));
  check(`THE END's lines have the % and the finish time (${lines.slice(-2).join(' / ')})`, lines.some((l) => /^COMPLETE +100%$/.test(l)) && lines.some((l) => /^TIME +\d+:\d\d$/.test(l)));
  if (out) {
    best.pics.forEach((px, i) => savePng(out, `fm-${String(i).padStart(2, '0')}.png`, px));
    contactSheet(out, 'full-monty-sheet.png', best.pics);
  }
}

// ---- 4. the pause screen -----------------------------------------------------------------------------------------------------------
{
  useMemoryStorage();
  const inp = new Input(nowhere), rend = new PixelRenderer(), p = run({ renderer: rend, input: inp, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { inp.poll(); p.tick(); p.render(0); } };
  const press = (code: string) => { inp.keyDown(code); tick(1); inp.keyUp(code); tick(1); };
  tick(5); press('Space'); tick(120);
  const g = p.game;
  // Moscow done, and a part of the rest
  const all = full();
  for (const id of grid) if (regionOf(id) === 'MOSCOW' || id % 3 === 0) g.visited[id] = 1;
  for (let i = 0; i < COINS; i++) if (regionOf(roomOfCoin(i)) === 'MOSCOW' || i % 2 === 0) g.coinCollected[i] = 0xff;
  for (const i of counted) if (all.items[i] && (regionOf(data.specialItems[i * 4] ?? 0xff) === 'MOSCOW' || i % 2 === 0)) g.siCollected[i] = 0x81;
  for (const e of data.pursuers) if (regionOf(e.room) === 'MOSCOW') g.siCollected[e.until] = 0x81;
  const t = must(tallyOf(data, progressOf(g)), 'tally');
  press('KeyP'); tick(20);
  const px = (): Uint8Array => rend.screen.pixels.map((v) => (v === 0xff ? rend.background : v));
  const map = px();
  let green = 0, other = 0;
  for (let y = 84; y < 128; y++) for (let x = 222; x < 318; x++) { const v = map[y * 320 + x] ?? 0; if (v === 13) green++; else if (v !== 0) other++; }
  check(`the pause screen: DONE ${percentOf(t.total)}% in light green in the panel's empty spot, nothing else there (${green} green pixels, ${other} others)`, green > 40 && other === 0);
  if (out) savePng(out, 'pause.png', map);
  press('Tab'); tick(10);
  const pass = px();
  const moscow = t.regions.findIndex((r) => r.name === 'MOSCOW');
  let red = 0;
  for (let y = 26; y < 50; y++) for (let x = 10; x < 34; x++) if (pass[y * 320 + x] === 2) red++;
  check(`Tab: the PASSPORT page, Moscow's stamp in red (${red} red pixels; Moscow ${t.regions[moscow]?.got}/${t.regions[moscow]?.all})`, red > 40 && isFull(must(t.regions[moscow], 'moscow')));
  if (out) savePng(out, 'passport.png', pass);
  press('Tab'); tick(10);
  check('Tab again: back to the map', p.state.paused && px().some((v, i) => i % 320 < 206 && v === 11));
}

// ---- 5. the sky's parts can be had again ------------------------------------------------------------------------------------------
// (the flight rooms' coins and find count, but he passes them on the plane's clock and the parachute's: one missed must not make 100% out of reach)
{
  const s = newGame(WORLD, true), g = s.g;
  // the game up to the Andes done, the flight flown once (Viktor clipped the tail: the round), but a coin of the second leg missed
  const later = new Set<number>([...flights, ...data.exitGrid.image.filter((id) => regionOf(id) === 'ANDES' || regionOf(id) === 'RIO')]);
  for (let i = 0; i < g.siCollected.length; i++) if (!later.has(data.specialItems[i * 4] ?? 0)) g.siCollected[i] = 0x81;
  g.siCollected[ROUNDS.plane] = 0x81;
  const missed = must(Array.from({ length: COINS }, (_, i) => i).find((i) => roomOfCoin(i) === FLY.storm), 'a coin of the second leg');
  for (let i = 0; i < COINS; i++) if (flights.includes(roomOfCoin(i)) && i !== missed) g.coinCollected[i] = 0xff;
  wear(g, itemIndex(g, PAC.luau, 0));
  // back at Hilo (travel takes him to any room he has been in), into the biplane again
  enterRoom(g, PAC.hilo, 0x0c + (27 + 4) * 4, standY(19));
  g.enemies = []; g.enable &= 0x0f; g.vic.enable &= 0x0f; // (the rooster out of the way: the boarding is what is checked)
  for (let n = 0; n < 200 && !settled(g); n++) frame(s, NONE);
  for (let n = 0; n < 200 && g.roomId === PAC.hilo; n++) frame(s, { ...NONE, left: true });
  for (let n = 0; n < 200 && !settled(g); n++) frame(s, NONE);
  check(`flown once, the biplane at Hilo takes him up again: the first leg (room ${g.roomId})`, g.roomId === FLY.mail);
  enterRoom(g, FLY.storm, 0x0c + (5 + 4) * 4, 0x32 + (8 + 3) * 8);
  for (let n = 0; n < 200 && !settled(g); n++) frame(s, NONE);
  check(`and the coin he missed in the second leg is there to take (coin ${missed})`, !g.coinCollected[missed] && g.entities.some((e) => e.index === missed));
}

finish();
