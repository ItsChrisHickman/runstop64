/**
 * The reward for winning Wanted: Monty Mole Remix (ENHANCED: src/ending.ts on shared/ending/show.ts; the game's own ending, the verse, is test/ending.ts),
 * headless, with the real game under it:
 *
 *  1. every place's route (test/ending-routes.ts: the passability bot's way, a stick a frame) played again on the game it was found on does what the place
 *     asks, alive: every piece of the room's coal is taken, a gate's room opens its gate, the way on is taken; played twice it is the same game;
 *  2. the whole show runs from the first frame to THE END and calls `done`: the tune from its start and again on the way out, every creature of the cast
 *     recorded with its frames and walking through the montage, each named in the credits' row in turn on pixels the game leaves empty (Monty is in every
 *     place, not among them), no parade, about a minute and THE END and its numbers;
 *  3. the credits: the row under the playfield is empty in the game's own picture in every frame of every place (sprites included), every line types on there
 *     letter by letter in yellow, is held, and goes, and the port's lines are last;
 *  4. a key skips it, after two seconds and not before;
 *  5. in the session: winning in ENHANCED runs the verse and then the show (the title and CONTINUE? after it, the save kept) and keeps that the game has been
 *     won; ORIGINAL has the verse and no show (the win is kept all the same); W on the pause screen once won (ENHANCED only) runs it and ends on the title;
 *     `?ending` on the page runs it at once.
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/reward.ts [out-dir]
 *
 * With an out-dir: PNG frames of each place, of each name in turn and of THE END.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { CREDIT, PORT_CREDITS, readWon } from '../../shared/ending/credits';
import { RoutePilot } from '../../shared/ending/pilot';
import { RewardShow, type Place, type Reel } from '../../shared/ending/show';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { BandWatch, CastWatch, SHOW_FRAMES } from '../../shared/test/ending-kit';
import { must } from '../../shared/test/must';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { montyLettering } from '../../shared/monty/font';
import { bankImage } from '../../montyotr/src/data';
import { STILL_THERE, piecesOfRoom } from '../../montymole/src/coal-rules';
import { GATES } from '../../montymole/src/gates';
import { VIC_LEFT, VIC_TOP } from '../src/coords';
import { CAST, CREDIT_ROW, LINES, SCENE_ROOMS, endingStats, remixEnding, routeOf, sceneGame } from '../src/ending';
import { ROUTES } from '../src/ending-routes';
import { RemixGame, START_LIVES } from '../src/game';
import { run } from '../src/main';
import { type Play, step } from './harness';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
const png = (name: string, renderer: PixelRenderer) => { if (out) rgbPng(path.join(out, name), indicesToRgb(renderer.picture()), 320, 200, 2); };
const store = useMemoryStorage();
const font = montyLettering(bankImage);

// ---- 1. the routes, played again ----------------------------------------------------------------------------------

/** The way on from each place: the room it leads to. */
const NEXT: Readonly<Record<number, number>> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8 };

/** A route played on a game of its start, as the bot found it, and what came of it. */
function playRoute(room: number) {
  const route = routeOf(room);
  const g = sceneGame(room, route);
  const p: Play = { g, col: 0 };
  const pilot = new RoutePilot(route.route);
  const gate = GATES.find((k) => k.room === room);
  let hash = 0, gateOpened = false, passes = 0;
  for (; !pilot.done && g.roomId === room; passes++) {
    step(p, pilot.next());
    if (gate !== undefined && g.gateOpen[GATES.indexOf(gate)] === true && g.roomId === room) gateOpened = true;
    hash = (Math.imul(hash, 31) + g.x2 + g.y * 512 + g.score) >>> 0;
  }
  const left = piecesOfRoom(room).filter((id) => ((g.coal.flags[id] ?? 0) & STILL_THERE) !== 0).length;
  return { room: g.roomId, lives: g.lives, left, frames: passes, hash, score: g.score, gateOpened, gate };
}
for (const room of SCENE_ROOMS) {
  const a = playRoute(room), b = playRoute(room);
  check(`room ${room + 1}: the route takes ${a.frames} frames (${(a.frames / 50).toFixed(0)} s), every piece of coal (${a.left} left)${a.gate !== undefined ? ', opens the gate' : ''} and goes on to room ${(NEXT[room] ?? 0) + 1}, no life lost, the same game twice (score ${a.score})`,
    a.left === 0 && a.room === NEXT[room] && a.lives === START_LIVES && a.hash === b.hash && a.score === b.score && (a.gate === undefined || a.gateOpened));
}
check('the rooms of the montage in the order of the game, each with a route', SCENE_ROOMS.every((room, i) => ROUTES[room] !== undefined && (i === 0 || (SCENE_ROOMS[i - 1] ?? 0) < room)));

// ---- 2 and 3. the show, from the first frame to THE END ---------------------------------------------------------------

const input = new Input(nowhere);
const renderer = new PixelRenderer();
renderer.frame = { x: 32, y: 36 };
const spec = remixEnding(renderer);
const BAND = { top: CREDIT_ROW, bottom: CREDIT_ROW + 7 };
/** What is in the band under the playfield: pixels of the colour the credits use, and any other. */
function band() {
  const pic = renderer.picture();
  let yellow = 0, other = 0;
  for (let y = BAND.top; y <= BAND.bottom; y++) for (let x = 0; x < 320; x++) { const c = pic[y * 320 + x]; if (c === CREDIT.colour) yellow++; else if (c !== 0) other++; }
  return { yellow, other };
}

// each place's reel watched: what the game's own picture has in the band before any credit goes over it
let gameBand = 0, gameFrames = 0, gameBandEmpty = true;
const badPlaces = new Map<number, string>();
const watched: Place[] = spec.places.map((place) => ({
  ...place,
  open() {
    const reel = place.open();
    if (!reel) return null;
    const watch: Reel = {
      tick: () => reel.tick(),
      draw() {
        reel.draw();
        const b = band();
        gameBand += b.yellow + b.other;
        gameBandEmpty = b.yellow + b.other === 0;
        gameFrames++;
        // (the first pixel in each place that has any: where a creature of the room goes through the row)
        const at = show.progress.place;
        if (b.yellow + b.other > 0 && !badPlaces.has(at)) {
          const pic = renderer.picture();
          for (let y = BAND.top; y <= BAND.bottom; y++) for (let x = 0; x < 320; x++) if (pic[y * 320 + x] !== 0 && !badPlaces.has(at)) badPlaces.set(at, `place ${at} (${x},${y}) frame ${gameFrames}`);
        }
      },
      render: (a) => reel.render(a),
      dispose: () => reel.dispose(),
      ground: reel.ground,
    };
    return watch;
  },
}));

let tuneStarts = 0, tuneEnds = 0, over = 0;
const show = new RewardShow({
  host: { renderer, input, canvas: nowhere },
  spec: { ...spec, places: watched },
  font: () => font,
  music: { start: () => { tuneStarts++; }, end: () => { tuneEnds++; } },
  done: () => { over++; },
});
const stats = endingStats(new RemixGame(), { reached: [], arrivals: [] });
show.start(stats);
let frames = 0;
const phases: string[] = [];
let lastPlace = -1, placeFrames = 0, placesSeen = 0;
const bandWatch = new BandWatch(), castWatch = new CastWatch();
let endFrames = 0, endYellow = 0;
const sceneFrames: number[] = [];
while (show.active && frames < 14000) {
  input.poll();
  show.tick();
  show.render(0);
  frames++;
  const p = show.progress;
  if (phases[phases.length - 1] !== p.phase) phases.push(p.phase);
  if (p.phase === 'montage') {
    if (p.place !== lastPlace) {
      if (lastPlace >= 0) png(`place-${lastPlace}-end.png`, renderer);
      lastPlace = p.place; placeFrames = 0; placesSeen++;
    }
    placeFrames = p.frames;
    sceneFrames[p.place] = p.frames;
    const place = spec.places[p.place];
    if (p.frames === 0) continue;
    const b = band();
    bandWatch.frame(p, place?.credits, { ink: b.yellow, other: b.other });
    castWatch.frame(p, BAND, () => gameBandEmpty);
    if ([40, 100, 200, 300, 400, 600, 700].includes(placeFrames)) png(`place-${p.place}-f${placeFrames}.png`, renderer);
    if (p.said?.kind === 'name' && !castWatch.pictured.has(p.said.text)) { castWatch.pictured.add(p.said.text); png(`name-${p.said.text.toLowerCase().replace(/\W+/g, '-')}.png`, renderer); }
  } else if (p.phase === 'end') {
    endFrames++;
    const pic = renderer.picture();
    if (endFrames === 5) {
      for (let y = 50; y < 66; y++) for (let x = 0; x < 320; x++) if (pic[y * 320 + x] === 7) endYellow++;
      png('the-end.png', renderer);
    }
  }
}
const progress = show.progress;
console.log(`phases ${phases.join(' ')}; ${frames} frames (${(frames / 50).toFixed(0)} s); scenes ${sceneFrames.join(' ')}`);
check(`the show ran through its phases (${phases.join(', ')}) in ${frames} frames (${(frames / 50).toFixed(0)} s) and is over: the montage and THE END, no parade`, phases.join() === 'loading,montage,end' && !show.active && over === 1);
check(`it is a watchable length (${(frames / 50).toFixed(0)} seconds, about 60 to 75)`, frames >= SHOW_FRAMES.min && frames <= SHOW_FRAMES.max);
check(`the tune began with it and was put back as it left (${tuneStarts} start, ${tuneEnds} end)`, tuneStarts === 1 && tuneEnds === 1);
check(`every place of the montage was shown (${placesSeen} of ${spec.places.length})`, placesSeen === spec.places.length);

const figures = progress.figures;
check(`the cast: ${CAST.length} creatures, each with frames (${figures.length} recorded), Monty not among them (he is in every place)`, figures.length === CAST.length && figures.every((f) => f.poses >= 1) && !figures.some((f) => f.name === 'MONTY'));
check('creatures are named as the cast says, in order', CAST.every((c, i) => figures[i]?.name === c.name));
check(`the cast moves (${figures.filter((f) => f.poses >= 2).length} have two frames or more)`, figures.filter((f) => f.poses >= 2).length >= CAST.length - 2);
castWatch.check(figures);
check(`THE END is on the picture in yellow (${endYellow} pixels)`, endYellow > 100);

bandWatch.check(LINES.length, gameFrames, gameBand, [...badPlaces.values()]);
const bad = LINES.filter((l) => l.length > CREDIT.letters || [...l].some((c) => c !== ' ' && !font.glyph(c)));
check(`lines are at most ${CREDIT.letters} letters, in the game's own lettering${bad.length ? ` (not: ${bad.join(' / ')})` : ''}`, bad.length === 0);
check('the port is credited last, as PORT_CREDITS has it, to Christopher Hickman with Claude', PORT_CREDITS.every((l, i) => LINES[LINES.length - 1 - PORT_CREDITS.length + i] === l) && LINES.some((l) => l.includes('HICKMAN')) && LINES.some((l) => l.includes('CLAUDE')));

// ---- 4. skipping ---------------------------------------------------------------------------------------------------------------
{
  let ended = 0;
  const s = new RewardShow({ host: { renderer, input, canvas: nowhere }, spec, font: () => font, music: { start() {}, end() {} }, done: () => { ended++; } });
  s.start(stats);
  for (let f = 0; f < 60; f++) { input.poll(); s.tick(); }
  input.keyDown('Space'); input.poll(); s.tick(); input.keyUp('Space');
  check('a key in the first two seconds does not skip it', s.active && ended === 0);
  for (let f = 0; f < 60; f++) { input.poll(); s.tick(); }
  input.keyDown('Space'); input.poll(); s.tick(); input.keyUp('Space'); input.poll();
  check('a key after them does', !s.active && ended === 1);
}

// ---- 5. in the session ----------------------------------------------------------------------------------------------------------
function boot(enhanced: boolean) {
  store.clear();
  store.set('montymoleremix.assist', JSON.stringify({ enhanced }));
  const inp = new Input(nowhere), rend = new PixelRenderer(), p = run({ renderer: rend, input: inp, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { inp.poll(); p.tick(); p.render(0); } };
  const press = (code: string) => { inp.keyDown(code); tick(1); inp.keyUp(code); tick(1); };
  const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
  return { p, g: p.game, inp, tick, press, until, rend };
}

/** Win the game: every piece of coal taken, Monty put in room 20 and walked out of its right edge, and the verse typed through (a key at the end of it). */
function win(s: ReturnType<typeof boot>): boolean {
  const { g, p, inp } = s;
  s.tick(300);
  s.press('Space');
  s.tick(40);
  g.coal.flags.forEach((f, id) => { g.coal.flags[id] = f & ~STILL_THERE; });
  g.graceActive = () => true; // (room 20's creatures are about there: nothing is to kill him on his way out)
  g.travelTo(20, (222 + VIC_LEFT) >> 1, VIC_TOP + 3 * 8);
  s.tick(30);
  inp.keyDown('ArrowRight');
  const verse = s.until(() => p.verse !== null, 400);
  inp.keyUp('ArrowRight');
  if (!verse) return false;
  // the verse, and a key every few seconds: the verse takes no key until it has been typed through
  for (let i = 0; i < 60 && p.verse !== null; i++) { s.tick(100); s.press('Space'); }
  return p.verse === null && p.state.mode === 'title';
}

{
  const s = boot(true);
  const won = win(s);
  const ending = must(s.p.ending, 'the ending');
  check('ENHANCED: the game is won (the verse typed through, a key at its end)', won);
  check('ENHANCED: the win is kept, apart from the saves', readWon('montymoleremix') && store.has('montymoleremix.won'));
  check('ENHANCED: the show begins after the verse, over the title', ending.active);
  s.tick(10);
  check('ENHANCED: it is running (the montage, the game of its own)', ending.progress.phase !== 'loading');
  s.tick(110);
  s.press('Space');
  check('ENHANCED: a key skips it: the title, and CONTINUE? as after any ending', !ending.active && s.until(() => s.p.state.prompt === 'continue', 600) && s.p.state.mode === 'title');
  check('ENHANCED: the show\'s sprites are put away (none left over the title)', s.rend.sprites.every((h) => !h.visible));
  check('ENHANCED: the save is kept', s.p.state.hasSave);
  s.press('Enter');
  check('ENHANCED: CONTINUE? yes: back in play', s.until(() => s.p.state.mode === 'play' && !s.g.freeze, 300));
  // W on the pause screen, once won
  s.press('KeyP');
  check('ENHANCED, won: the pause screen is up', s.p.state.paused);
  s.press('KeyW');
  check('ENHANCED: W starts the show', ending.active);
  s.tick(120);
  s.press('Space');
  check('ENHANCED: after it, the title with the save kept', !ending.active && s.p.state.mode === 'title' && s.p.state.hasSave && s.p.state.prompt === null);
}

{
  const s = boot(false);
  const won = win(s);
  const ending = must(s.p.ending, 'the ending');
  s.tick(30);
  check('ORIGINAL: the game is won, and kept so, with no show of ours (the title, then CONTINUE?)', won && readWon('montymoleremix') && !ending.active && s.until(() => s.p.state.prompt === 'continue', 600));
  s.press('Enter');
  s.until(() => s.p.state.mode === 'play' && !s.g.freeze, 300);
  s.press('KeyP');
  s.press('KeyW');
  check('ORIGINAL: W on the pause screen does nothing', !ending.active && s.p.state.paused);
}

{
  store.clear();
  Reflect.set(globalThis, 'location', { search: '?ending' });
  const inp = new Input(nowhere), rend = new PixelRenderer(), p = run({ renderer: rend, input: inp, canvas: nowhere });
  const ending = must(p.ending, 'the ending');
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { inp.poll(); p.tick(); p.render(0); } };
  tick(5);
  check('?ending on the page: the show at once', ending.active);
  tick(200);
  inp.keyDown('Space'); tick(1); inp.keyUp('Space'); tick(2);
  check('?ending: a key ends it on the title', !ending.active && p.state.mode === 'title');
  Reflect.deleteProperty(globalThis, 'location');
}

finish();
