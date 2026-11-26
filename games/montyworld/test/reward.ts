/**
 * The reward for winning Do Svidaniya Monty (ENHANCED: montyotr's src/ending.ts on shared/ending/show.ts, with the places of src/ending-places.ts and their routes), headless, with the real game under it:
 *
 *  1. every scene's route does what the scene says in the game as the show plays it (no grace, the random numbers the game's own), the same room and the
 *     same place each time, and nothing kills him; and then he keeps going till the place ends: never standing still for long, and no creature walks
 *     through him (in a game with no grace its touch would be a death; Chris, 2026-11-25: he "ends up standing still and getting hit by an enemy and nothing happens");
 *  2. the whole show runs from the first frame to THE END and calls `done`: the tune from its start and again on the way
 *     out, every creature of the cast recorded with its frames, marching by after the credits in Rio's carnival parade across the beach (a group from each region behind its banner, a plain sand under
 *     them, each named under its region as it passes), Monty and the samba troupe dancing at the side, Viktor at the tail and the Mole Crusher's end for him;
 *     about a minute and a half to two minutes and a half, THE END and its numbers
 *     on the picture;
 *  3. the credits: the row under the playfield is empty in the game's own picture in every frame of every place (sprites
 *     included), every line types on there letter by letter in yellow, is held, and goes, and the port's lines are last;
 *  4. a key skips it, after two seconds and not before, and in the procession, to the title as it is (no CONTINUE? until a key);
 *  5. in the session: winning in ENHANCED runs it from the finale (the title and CONTINUE? after it, the save kept) and
 *     keeps that the game has been won; ORIGINAL has none (the win is kept all the same); W on the pause screen once won
 *     (ENHANCED only) runs it and ends on the title; `?ending` on the page runs it at once.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/reward.ts [out-dir]
 *
 * With an out-dir: PNG frames of each place, of each name in turn and of THE END.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer, TRANSPARENT } from 'c64kit';
import { CREDIT, PORT_CREDITS, readWon } from '../../shared/ending/credits';
import { RewardShow, type Place, type Reel } from '../../shared/ending/show';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { BandWatch, CastWatch, ParadeWatch, SHOW_FRAMES, drawVisitors, groundShare, touching } from '../../shared/test/ending-kit';
import { MARCH, NAME_LETTERS, PARADE } from '../../shared/ending/procession';
import { timelineOf } from '../../shared/ending/timeline';
import { prngEntropy } from '../../shared/monty/screen';
import { must } from '../../shared/test/must';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { CREDIT_ROW, endingStats, enterRoom, montyEnding } from '../../montyotr/src/ending';
import { isDone } from '../../montyotr/src/ending-scenes';
import { Game, type Assists } from '../../montyotr/src/game';
import { Pilot } from '../../montyotr/src/pilot';
import { frame, type State } from '../../montyotr/test/play';
import { WORLD } from '../src/data';
import { CLOSING } from '../src/ending-places';
import { SCENES, WORLD_ENDING } from '../src/ending-scenes';
import { montyFont, run } from '../src/main';
import { RIO_ROOM, RIO_ROOMS } from '../src/rio';
import { standY } from './route';
import { montyMap } from '../../montyotr/src/map';

const exitGridImage = WORLD.exitGrid.image;
const CAST = WORLD_ENDING.cast;
const PROC = must(WORLD_ENDING.procession, 'the procession');
const STYLE = must(PROC.parade, 'the parade');

// the same run each time (the show's places take their random numbers from the game's own state; whatever else takes Math.random, seeded)
let seed = 12345;
Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
const png = (name: string, renderer: PixelRenderer) => { if (out) rgbPng(path.join(out, name), indicesToRgb(renderer.picture()), 320, 200, 2); };
const hex = (n: number) => `$${n.toString(16)}`;

const store = useMemoryStorage();
const ENHANCED: Assists = { lives: false, cloud: true, jetpack: true, c5: true, rooms: false, respawn: true };

// ---- 1. the routes, played as the game plays ----------------------------------------------------------------------

/** A scene's route played in a game of the game's own as the show plays it (no grace; the random numbers from its own state), and what came of it; with `through`, on till the place ends: whether he was touched (a death here) or stood still too long. */
function playRoute(scene: (typeof SCENES)[number], through = 0) {
  const g = new Game(WORLD);
  g.start();
  g.entropy = () => prngEntropy(g.prng);
  g.assist = ENHANCED;
  scene.prepare(g);
  const arrived = enterRoom(g, scene.room, scene.spot.x2, scene.spot.y, scene.spot.facing);
  const st: State = { g, col: 0 };
  const pilot = new Pilot(scene.route);
  const lives = g.lives;
  let died = false, there = true;
  const done = () => isDone(scene, g);
  let hit = -1, still = 0, longest = 0, stillAt = 0;
  for (let f = 0; f < (through || pilot.length + 60) && (through || !done()); f++) {
    const { x2, y } = g;
    frame(st, pilot.next());
    // (the treasure's touch is event 6, then the sequence for it, 5, under way: the ending, not a death)
    if ((g.actionCounter && g.actionCounter !== 6 && g.actionCounter !== 0x85) || g.lives !== lives) { died = true; if (hit < 0) hit = f; }
    if (g.roomId !== scene.room && !('treasure' in scene.take)) there = false;
    still = g.x2 === x2 && g.y === y ? still + 1 : 0;
    if (still > longest) { longest = still; stillAt = f; }
  }
  return { arrived, died, there, done: done(), room: g.roomId, frames: pilot.length, hit, longest, stillAt };
}

for (const scene of SCENES) {
  const r = playRoute(scene);
  check(`room ${hex(scene.room)}: the route does it (${JSON.stringify(scene.take)}) in ${r.frames} frames, in the room, alive (arrived ${r.arrived}, done ${r.done}, died ${r.died}, there ${r.there}, room ${hex(r.room)})`, r.arrived && r.done && !r.died && r.there);
}

/** The most frames he may stand still together in a place (a moment's pause between moves). */
const STILL = 20;
const montage = montyEnding(WORLD, new PixelRenderer(), ENHANCED);
SCENES.forEach((scene, i) => {
  // (the finale's ending plays on by itself: he sits and eats)
  if ('treasure' in scene.take) return;
  const place = must(montage.places[i], `place ${i}`);
  const length = timelineOf(place, 0).length;
  const r = playRoute(scene, length);
  check(`room ${hex(scene.room)}: through the whole place (${length} frames) he keeps going: in the room, no creature through him (${r.hit < 0 ? 'none' : `touched at frame ${r.hit}`}), never still more than ${STILL} frames (${r.longest}, to frame ${r.stillAt})`,
    r.there && r.hit < 0 && r.longest <= STILL && r.frames >= length);
});

check('the places are in rooms that are on the exit grid, each once', SCENES.every((s) => exitGridImage.includes(s.room)) && new Set(SCENES.map((s) => s.room)).size === SCENES.length);

// ---- 2 and 3. the show, from the first frame to THE END -----------------------------------------------------------------

const input = new Input(nowhere);
const renderer = new PixelRenderer();
renderer.frame = { x: 32, y: 36 };
const spec = montyEnding(WORLD, renderer, ENHANCED);
/** The row a place's credits go in (a place may have its own): eight pixels. */
const bandOf = (place: Place) => { const top = place.creditRow ?? CREDIT_ROW; return { top, bottom: top + 7 }; };
let BAND = bandOf(spec.places[0]);
/** What is in the band under the playfield: pixels of the colour the credits use, and any other. */
function band(ink: number = CREDIT.colour) {
  const pic = renderer.picture();
  let yellow = 0, other = 0;
  for (let y = BAND.top; y <= BAND.bottom; y++) for (let x = 0; x < 320; x++) { const c = pic[y * 320 + x]; if (c === ink) yellow++; else if (c !== 0) other++; }
  return { yellow, other };
}

// each place's reel watched: what the game's own picture has in the band before any credit goes over it
let gameBand = 0, gameFrames = 0, gameBandEmpty = true, gameTouch = 0;
const badPlaces = new Map<number, string>();
const watched: Place[] = spec.places.map((place) => ({
  ...place,
  open() {
    const reel = place.open();
    if (!reel) return null;
    BAND = bandOf(place);
    const watch: Reel = {
      tick: () => reel.tick(),
      draw() {
        reel.draw();
        const b = band();
        // (the first frames of a place: the border and the old frame's pixels are still on the layers: not counted)
        { const pic = renderer.picture(); gameTouch = show.progress.frames > 5 ? touching((x, y) => pic[y * 320 + x] !== 0, BAND.top, CREDIT.x, CREDIT.letters) : 0; }
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
    };
    return watch;
  },
}));

let tuneStarts = 0, tuneEnds = 0, over = 0;
const show = new RewardShow({
  host: { renderer, input, canvas: nowhere },
  spec: { ...spec, places: watched },
  font: montyFont,
  music: { start: () => { tuneStarts++; }, end: () => { tuneEnds++; } },
  done: () => { over++; },
});
const stats = endingStats(new Game(WORLD), { rooms: {} });
show.start(stats);
let frames = 0;
const phases: string[] = [];
let lastPlace = -1, placeFrames = 0, placesSeen = 0;
const bandWatch = new BandWatch(), castWatch = new CastWatch(), procWatch = new ParadeWatch();
let endFrames = 0, endYellow = 0, paradeFrames = 0, paradeLength = 0, shownOff = 0;
const sceneFrames: number[] = [];
while (show.active && frames < 16000) {
  input.poll();
  show.tick();
  show.render(0);
  frames++;
  const p = show.progress;
  if (p.shown !== frames && show.active) shownOff++;
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
    const b = band(p.said?.ink);
    bandWatch.frame(p, place.credits, { ink: b.yellow, other: b.other, touch: p.said ? gameTouch : 0 });
    castWatch.frame(p, BAND, () => gameBandEmpty);
    if ([40, 100, 200, 300, 400, 600, 700].includes(placeFrames)) png(`place-${p.place}-f${placeFrames}.png`, renderer);
    if (p.said?.kind === 'name' && !castWatch.pictured.has(p.said.text)) { castWatch.pictured.add(p.said.text); png(`name-${p.said.text.toLowerCase().replace(/\W+/g, '-')}.png`, renderer); }
  } else if (p.phase === 'parade') {
    paradeFrames++;
    paradeLength = p.length;
    const mask = new Uint8Array(320 * 200).fill(TRANSPARENT);
    drawVisitors(renderer, mask);
    procWatch.frame(p, renderer.picture(), mask, PROC.ground, [STYLE.ink]);
    if (paradeFrames % 50 === 0) png(`parade-${String(paradeFrames).padStart(4, '0')}.png`, renderer);
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
check(`the show ran through its phases (${phases.join(', ')}) in ${frames} frames (${(frames / 50).toFixed(0)} s) and is over: the montage, the procession and THE END`, phases.join() === 'loading,montage,parade,end' && !show.active && over === 1);
check(`the show's own clock (\`shown\`, what the skip goes by) counted every frame, the procession's too (${shownOff} frames off)`, shownOff === 0);
check(`it is a watchable length (${(frames / 50).toFixed(0)} seconds: the credits through thirteen places, then the parade of the whole world's creatures)`, frames >= SHOW_FRAMES.min && frames <= 20000);
check(`the tune began with it and was put back as it left (${tuneStarts} start, ${tuneEnds} end)`, tuneStarts === 1 && tuneEnds === 1);
check(`every place of the montage was shown (${placesSeen} of ${spec.places.length})`, placesSeen === spec.places.length);
check('the places are thirteen rooms, one or two from every region', SCENES.length === 13);

const figures = progress.figures;
const unrecorded = CAST.filter((c) => !figures.some((f) => f.name === c.name)).map((c) => c.name);
check(`the cast: ${CAST.length} creatures, each with frames (${figures.length} recorded${unrecorded.length ? `; not: ${unrecorded.join(', ')}` : ''}), Monty not among them (he comes last, on his own)`, figures.length === CAST.length && figures.every((f) => f.poses >= 1) && !figures.some((f) => f.name.startsWith('MONTY')));
check(`creatures are named as the cast says, in order`, CAST.every((c, i) => figures[i]?.name === c.name));
check(`the cast walks (${figures.filter((f) => f.poses >= 4).length} have 4 frames or more)`, figures.filter((f) => f.poses >= 4).length >= CAST.length - 3);
check(`no creature walks through a place of the montage: they march in the procession after it (${castWatch.walked.size} seen in places)`, castWatch.walked.size === 0);
// the parade: a group from each region in the journey's order behind its banner, Viktor last
{
  const troupes = progress.troupes;
  const regions = PROC.troupes.map((t) => t.title);
  check(`the groups: one per region in the journey's order (${troupes.map((t) => t.title).join(', ')})`, troupes.length === regions.length && regions.every((r, i) => troupes[i]?.title === r) && regions.join() === 'MOSCOW,SIBERIA,CHINA,JAPAN,HAWAII,ANDES,RIO');
  check('the groups march the cast in its order, four at most each', troupes.flatMap((t) => t.names).join() === CAST.map((c) => c.name).join() && troupes.every((t) => t.names.length >= 1 && t.names.length <= MARCH.most));
  check(`Viktor is the gag at the tail (${progress.gagName ?? 'none'})`, progress.gagName === STYLE.gag?.name);
  procWatch.check(troupes, PARADE.crushAt);
}
{
  const troupes = progress.troupes;
  check(`the procession is ${(paradeFrames / 50).toFixed(0)} s, all of it shown`, paradeLength > 0 && paradeFrames >= paradeLength);
  const names = [...troupes.flatMap((t) => [t.title, ...t.names]), progress.gagName ?? ''];
  const badNames = names.filter((n) => n.length > NAME_LETTERS || [...n].some((c) => c !== ' ' && !montyFont().glyph(c)));
  check(`every heading and name fits its half of a row (${NAME_LETTERS} letters) in the game's lettering${badNames.length ? ` (not: ${badNames.join(', ')})` : ''}`, badNames.length === 0);
  const dark = show.cast.filter((f) => groundShare(f, PROC.ground.colour ?? 0) > 0.2).map((f) => f.name);
  check(`every creature reads on the plain sand in its own colours: none is mostly the sand's colour${dark.length ? ` (${dark.join(', ')})` : ''}`, dark.length === 0);
}
check(`THE END is on the picture in yellow (${endYellow} pixels)`, endYellow > 100);

const lines = spec.places.flatMap((p) => p.credits ?? []);
bandWatch.check(lines.length, gameFrames, gameBand, [...badPlaces.values()], false);
const font = montyFont();
const bad = lines.filter((l) => l.length > CREDIT.letters || [...l].some((c) => c !== ' ' && !font.glyph(c)));
check(`lines are at most ${CREDIT.letters} letters, in the game's own lettering${bad.length ? ` (not: ${bad.join(' / ')})` : ''}`, bad.length === 0);
check('the game\'s own credit is last (a new game, not a port: the port\'s "rebuilt for the browser" line is not said), as CLOSING has it', CLOSING.every((l, i) => lines[lines.length - CLOSING.length + i] === l) && !lines.some((l) => PORT_CREDITS.slice(0, 2).includes(l)) && bandWatch.typed.has(`${spec.places.length - 1}.${(spec.places[spec.places.length - 1].credits?.length ?? 0) - 1}`));

// ---- 4. skipping ---------------------------------------------------------------------------------------------------------------

{
  let ended = 0;
  const s = new RewardShow({ host: { renderer, input, canvas: nowhere }, spec, font: montyFont, music: { start() {}, end() {} }, done: () => { ended++; } });
  s.start(stats);
  for (let f = 0; f < 60; f++) { input.poll(); s.tick(); }
  input.keyDown('Space'); input.poll(); s.tick(); input.keyUp('Space');
  check('a key in the first two seconds does not skip it', s.active && ended === 0);
  for (let f = 0; f < 60; f++) { input.poll(); s.tick(); }
  input.keyDown('Space'); input.poll(); s.tick(); input.keyUp('Space'); input.poll();
  check('a key after them does', !s.active && ended === 1);
}
{
  // (the last place alone, to the procession: a key there skips the rest, THE END too)
  let ended = 0, n = 0;
  const s = new RewardShow({ host: { renderer, input, canvas: nowhere }, spec: { ...spec, places: spec.places.slice(-1) }, font: montyFont, music: { start() {}, end() {} }, done: () => { ended++; } });
  s.start(stats);
  while (s.active && n < 4000 && !(s.progress.phase === 'parade' && s.progress.marching !== null)) { input.poll(); s.tick(); n++; }
  check(`the procession comes on after the last place, its first group passing (${s.progress.marching?.title ?? 'none'}) and the show's clock counting on through it (shown ${s.progress.shown} of ${n} frames)`, s.progress.phase === 'parade' && s.progress.marching?.title === 'MOSCOW' && s.progress.shown === n);
  input.keyDown('Space'); input.poll(); s.tick(); input.keyUp('Space'); input.poll();
  check('a key in the procession skips the rest of the show', !s.active && ended === 1);
}

// ---- 5. in the session ----------------------------------------------------------------------------------------------------------

function boot(easy: boolean) {
  store.clear();
  store.set('montyworld.assist', JSON.stringify({ easy }));
  const inp = new Input(nowhere), rend = new PixelRenderer(), p = run({ renderer: rend, input: inp, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { inp.poll(); p.tick(); p.render(0); } };
  const press = (code: string) => { inp.keyDown(code); tick(1); inp.keyUp(code); tick(1); };
  const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
  return { p, g: p.game, tick, press, until, rend, inp };
}

/** Win the game: the beach, Monty put on the bowl, the finale played out. */
function win(s: ReturnType<typeof boot>) {
  const { g, p } = s;
  s.tick(300);
  s.press('Space');
  s.tick(40);
  const cell = exitGridImage.indexOf(RIO_ROOM.bust);
  g.mapRow = Math.floor(cell / WORLD.exitGrid.cols); g.exitCol = cell % WORLD.exitGrid.cols; g.x2 = 0x70; g.y = standY(18); g.roomExit = 1;
  s.until(() => g.roomId === RIO_ROOM.bust && !g.freeze, 200);
  // in on the promenade west of the bowl's table, and east into the bowl
  const bowl = must(RIO_ROOMS.find((r) => r.id === RIO_ROOM.bust)?.item, 'the beach\'s bowl');
  g.x2 = 0x0c + (Math.max(0, bowl.col - 8) + 4) * 4; g.y = standY(18);
  s.inp.keyDown('ArrowRight');
  s.until(() => g.completionActive === 1, 400);
  s.inp.keyUp('ArrowRight');
  return s.until(() => p.state.mode === 'title', 6000) && g.won;
}

{
  // the title's own sprites (its chase), from a fresh boot: what may be up over the title after the show
  const titleSprites = new Set<string>();
  {
    const t = boot(true);
    for (let f = 0; f < 900; f++) { t.tick(); for (const h of t.rend.sprites) if (h.visible && h.surface) titleSprites.add(h.surface.pixels.join()); }
  }
  const s = boot(true);
  const won = win(s);
  const ending = must(s.p.ending, 'the ending');
  check('EASY: the game is won (the finale played out)', won);
  check('EASY: the win is kept, apart from the saves', readWon('montyworld') && store.has('montyworld.won') && !store.has('montyworld.save.v2.won'));
  check('EASY: the show begins from the finale, over the title', ending.active);
  s.tick(10);
  check('EASY: it is running (the montage, the game of its own, the player\'s game untouched)', ending.progress.phase !== 'loading' && s.g.won);
  s.tick(110);
  s.press('Space');
  // (the show ends on the title as it is, waiting for a key: no CONTINUE? until one, Chris 2026-11-24)
  check('EASY: a key skips it: the title, waiting, with no CONTINUE? until a key', !ending.active && s.p.state.mode === 'title' && !s.until(() => s.p.state.prompt === 'continue', 300));
  const left = s.rend.sprites.filter((h) => h.visible && h.surface && !titleSprites.has(h.surface.pixels.join())).length;
  check(`EASY: the show's sprites are put away (what is up over the title is the title's own chase: ${left} others)`, left === 0);
  check('EASY: the save is kept', s.p.state.hasSave);
  s.press('Enter');
  check('EASY: CONTINUE? yes: back in play', s.until(() => s.p.state.mode === 'play' && !s.g.freeze, 300));
  // W on the pause screen, once won
  s.press('KeyP');
  check('EASY, won: the pause screen offers W ENDING', s.p.state.paused);
  s.press('KeyW');
  check('EASY: W starts it', ending.active);
  s.tick(120);
  s.press('Space');
  check('EASY: after it, the title with the save kept', !ending.active && s.p.state.mode === 'title' && s.p.state.hasSave && s.p.state.prompt === null);
  check('EASY: ENTER CONTINUE is back (the strip)', s.p.state.hasSave);
}

{
  const s = boot(false);
  const won = win(s);
  const ending = must(s.p.ending, 'the ending');
  check('HARD: the game is won, kept so, and the show begins as in EASY (it is in both modes)', won && readWon('montyworld') && ending.active);
  s.tick(120);
  s.press('Space');
  check('HARD: a key skips it: the title, waiting, with no CONTINUE? until a key', !ending.active && s.p.state.mode === 'title' && !s.until(() => s.p.state.prompt === 'continue', 300));
  s.press('Enter');
  s.until(() => s.p.state.mode === 'play' && !s.g.freeze, 300);
  s.press('KeyP');
  s.press('KeyW');
  check('HARD: W on the pause screen starts it', ending.active);
}

{
  store.clear();
  Reflect.set(globalThis, 'location', { search: '?ending' });
  const inp = new Input(nowhere), rend = new PixelRenderer(), p = run({ renderer: rend, input: inp, canvas: nowhere });
  const ending = must(p.ending, 'the ending');
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { inp.poll(); p.tick(); p.render(0); } };
  tick(5);
  check('?ending on the page: the ending at once', ending.active);
  tick(200);
  inp.keyDown('Space'); tick(1); inp.keyUp('Space'); tick(2);
  check('?ending: a key ends it on the title', !ending.active && p.state.mode === 'title');
  Reflect.deleteProperty(globalThis, 'location');
}

// THE END's numbers with everything collected: each line keeps its label and its whole value, in one column (Chris, 2026-11-24: "SNACKS13/13",
// the pause panel's line with no space at 10 or more, came out garbled when THE END re-read it)
{
  const g = new Game(WORLD);
  g.start();
  for (const i of [...WORLD.progress.cakes, ...WORLD.progress.keyItems]) g.siCollected[i] = 0x81;
  g.score = 1234567;
  const lines = endingStats(g, montyMap.found.empty());
  const food = WORLD.progress.foodName ?? 'CAKES';
  const want = [['SCORE', '1234567'], [food, `${WORLD.progress.cakes.length}/${WORLD.progress.cakes.length}`], ['ITEMS', `${WORLD.progress.keyItems.length}/${WORLD.progress.keyItems.length}`]] as const;
  check(`THE END with everything collected: ${lines.map((l) => `"${l}"`).join(', ')}: one width, every label and value whole`,
    new Set(lines.map((l) => l.length)).size === 1 && want.every(([label, value]) => lines.some((l) => l.startsWith(label) && l.endsWith(value) && l.slice(label.length, l.length - value.length).trim() === '')));
}

finish();
console.log('all passed');
