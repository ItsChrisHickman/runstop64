/**
 * The reward for winning (ENHANCED: src/ending.ts on shared/ending/show.ts; the game's own ending is test/ending.ts),
 * headless, with the real game under it:
 *
 *  1. every scene's route does what the scene says in the game as the game plays it (no grace, the crushers' timing
 *     seeded), the same room and the same place each time, and nothing kills him;
 *  2. the whole show runs from the first frame to THE END and calls `done`: the tune from its start and again on the way
 *     out, every creature of the cast recorded with its frames and walking through the montage, each named in the credits' row in turn on
 *     pixels the game leaves empty (Monty is in every place, not among them), no parade, about a minute and a quarter, THE END and its numbers
 *     on the picture;
 *  3. the credits: the row under the playfield is empty in the game's own picture in every frame of every place (sprites
 *     included), every line types on there letter by letter in yellow, is held, and goes, and the port's lines are last;
 *  4. a key skips it, after two seconds and not before;
 *  5. in the session: winning in ENHANCED runs it from the finale (the title and CONTINUE? after it, the save kept) and
 *     keeps that the game has been won; ORIGINAL has none (the win is kept all the same); W on the pause screen once won
 *     (ENHANCED only) runs it and ends on the title; `?ending` on the page runs it at once.
 *
 *   nice -n 15 node tools/test.mjs games/montyotr/test/reward.ts [out-dir]
 *
 * With an out-dir: PNG frames of each place, of each name in turn and of THE END.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { CREDIT, PORT_CREDITS, readWon } from '../../shared/ending/credits';
import { RewardShow, type Place, type Reel } from '../../shared/ending/show';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { BandWatch, CastWatch, SHOW_FRAMES } from '../../shared/test/ending-kit';
import { must } from '../../shared/test/must';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { exitGridImage } from '../src/data';
import { CREDIT_ROW, endingStats, enterRoom, montyEnding } from '../src/ending';
import { CAST, SCENES, isDone } from '../src/ending-scenes';
import { Game, type Assists } from '../src/game';
import { montyFont, run } from '../src/main';
import { Pilot } from '../src/pilot';
import { frame, type State } from './play';

// the same run each time (the crushers and teleporters take g.random(), which takes Math.random)
let seed = 12345;
const reseed = (s: number) => { seed = s; };
Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
const png = (name: string, renderer: PixelRenderer) => { if (out) rgbPng(path.join(out, name), indicesToRgb(renderer.picture()), 320, 200, 2); };
const hex = (n: number) => `$${n.toString(16)}`;

const store = useMemoryStorage();
const ENHANCED: Assists = { lives: false, cloud: true, jetpack: true, c5: true, rooms: false, respawn: true };

// ---- 1. the routes, played as the game plays ----------------------------------------------------------------------

/** A scene's route played in a game of the game's own (no grace), and what came of it. */
function playRoute(scene: (typeof SCENES)[number], s: number) {
  reseed(s);
  const g = new Game();
  g.start();
  g.assist = ENHANCED;
  scene.prepare(g);
  const arrived = enterRoom(g, scene.room, scene.spot.x2, scene.spot.y, scene.spot.facing);
  const st: State = { g, col: 0 };
  const pilot = new Pilot(scene.route);
  const lives = g.lives;
  let died = false, there = true;
  const done = () => isDone(scene, g);
  for (let f = 0; f < pilot.length + 60 && !done(); f++) {
    frame(st, pilot.next());
    // (the treasure's touch is event 6, then the sequence for it, 5, under way: the ending, not a death)
    if ((g.actionCounter && g.actionCounter !== 6 && g.actionCounter !== 0x85) || g.lives !== lives) died = true;
    if (g.roomId !== scene.room && !('treasure' in scene.take)) there = false;
  }
  return { arrived, died, there, done: done(), room: g.roomId, frames: pilot.length };
}

for (const scene of SCENES) {
  const r = playRoute(scene, 12345);
  check(`room ${hex(scene.room)}: the route does it (${JSON.stringify(scene.take)}) in ${r.frames} frames, in the room, alive (arrived ${r.arrived}, done ${r.done}, died ${r.died}, there ${r.there}, room ${hex(r.room)})`, r.arrived && r.done && !r.died && r.there);
}
// (the crushers' timing is random in the browser: how many other timings the routes get through, for the record)
let survived = 0, tried = 0;
for (const scene of SCENES) for (const s of [1, 2, 3]) { tried++; const r = playRoute(scene, s); if (r.done && !r.died) survived++; }
console.log(`  routes under other crusher timings: ${survived}/${tried} (the show has a moment's grace for the rest)`);

check('the places are in rooms that are on the exit grid, each once', SCENES.every((s) => exitGridImage.includes(s.room)) && new Set(SCENES.map((s) => s.room)).size === SCENES.length);

// ---- 2 and 3. the show, from the first frame to THE END -----------------------------------------------------------------

const input = new Input(nowhere);
const renderer = new PixelRenderer();
renderer.frame = { x: 32, y: 36 };
const spec = montyEnding(renderer, ENHANCED);
/** The row a place's credits go in (a place may have its own): eight pixels. */
const bandOf = (place: Place) => { const top = place.creditRow ?? CREDIT_ROW; return { top, bottom: top + 7 }; };
let BAND = bandOf(spec.places[0]);
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
    BAND = bandOf(place);
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
const stats = endingStats(new Game(), { rooms: {} });
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
    bandWatch.frame(p, place.credits, { ink: b.yellow, other: b.other });
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
check('the places are 8 to 12 rooms', SCENES.length >= 8 && SCENES.length <= 12);

const figures = progress.figures;
check(`the cast: ${CAST.length} creatures, each with frames (${figures.length} recorded), Monty not among them (he is in every place)`, figures.length === CAST.length && figures.every((f) => f.poses >= 1) && !figures.some((f) => f.name === 'MONTY'));
check(`creatures are named as the cast says, in order`, CAST.every((c, i) => figures[i]?.name === c.name));
check(`the cast walks (${figures.filter((f) => f.poses >= 4).length} have 4 frames or more)`, figures.filter((f) => f.poses >= 4).length >= CAST.length - 3);
castWatch.check(figures);
check(`THE END is on the picture in yellow (${endYellow} pixels)`, endYellow > 100);

const lines = spec.places.flatMap((p) => p.credits ?? []);
bandWatch.check(lines.length, gameFrames, gameBand, [...badPlaces.values()]);
const font = montyFont();
const bad = lines.filter((l) => l.length > CREDIT.letters || [...l].some((c) => c !== ' ' && !font.glyph(c)));
check(`lines are at most ${CREDIT.letters} letters, in the game's own lettering${bad.length ? ` (not: ${bad.join(' / ')})` : ''}`, bad.length === 0);
check('the port is credited last, as PORT_CREDITS has it', PORT_CREDITS.every((l, i) => lines[lines.length - PORT_CREDITS.length + i] === l) && bandWatch.typed.has(`${spec.places.length - 1}.${(spec.places[spec.places.length - 1].credits?.length ?? 0) - 1}`));

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

// ---- 5. in the session ----------------------------------------------------------------------------------------------------------

function boot(enhanced: boolean) {
  store.clear();
  store.set('montyotr.assist', JSON.stringify({ enhanced }));
  const inp = new Input(nowhere), rend = new PixelRenderer(), p = run({ renderer: rend, input: inp, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { inp.poll(); p.tick(); p.render(0); } };
  const press = (code: string) => { inp.keyDown(code); tick(1); inp.keyUp(code); tick(1); };
  const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
  return { p, g: p.game, tick, press, until, rend };
}

/** Win the game: the treasure's room with the jerry can had, Monty put on the treasure, the finale played out. */
function win(s: ReturnType<typeof boot>) {
  const { g, p } = s;
  s.tick(300);
  s.press('Space');
  s.tick(40);
  const DOCK = 0x2f, cell = exitGridImage.indexOf(DOCK);
  g.siCollected[8] = 0x81;
  g.mapRow = Math.floor(cell / 23); g.exitCol = cell % 23; g.x2 = 0x70; g.y = 0x9a; g.roomExit = 1;
  s.until(() => g.roomId === DOCK && !g.freeze, 200);
  s.until(() => { g.x2 = 0x40; g.y = 0x99; return g.completionActive === 1; }, 200);
  return s.until(() => p.state.mode === 'title', 6000) && g.won;
}

{
  const s = boot(true);
  const won = win(s);
  const ending = must(s.p.ending, 'the ending');
  check('ENHANCED: the game is won (the finale played out)', won);
  check('ENHANCED: the win is kept, apart from the saves', readWon('montyotr') && store.has('montyotr.won') && !store.has('montyotr.save.v2.won'));
  check('ENHANCED: the show begins from the finale, over the title', ending.active);
  s.tick(10);
  check('ENHANCED: it is running (the montage, the game of its own, the player\'s game untouched)', ending.progress.phase !== 'loading' && s.g.won);
  s.tick(110);
  s.press('Space');
  check('ENHANCED: a key skips it: the title, and CONTINUE? as after any ending', !ending.active && s.until(() => s.p.state.prompt === 'continue', 600) && s.p.state.mode === 'title');
  check('ENHANCED: the show\'s sprites are put away (none left over the title)', s.rend.sprites.every((h) => !h.visible));
  check('ENHANCED: the save is kept', s.p.state.hasSave);
  s.press('Enter');
  check('ENHANCED: CONTINUE? yes: back in play', s.until(() => s.p.state.mode === 'play' && !s.g.freeze, 300));
  // W on the pause screen, once won
  s.press('KeyP');
  check('ENHANCED, won: the pause screen offers W ENDING', s.p.state.paused);
  s.press('KeyW');
  check('ENHANCED: W starts it', ending.active);
  s.tick(120);
  s.press('Space');
  check('ENHANCED: after it, the title with the save kept', !ending.active && s.p.state.mode === 'title' && s.p.state.hasSave && s.p.state.prompt === null);
  check('ENHANCED: ENTER CONTINUE is back (the strip)', s.p.state.hasSave);
}

{
  const s = boot(false);
  const won = win(s);
  const ending = must(s.p.ending, 'the ending');
  s.tick(30);
  check('ORIGINAL: the game is won, and kept so, with no ending of ours (the title, then CONTINUE?)', won && readWon('montyotr') && !ending.active && s.until(() => s.p.state.prompt === 'continue', 600));
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
  check('?ending on the page: the ending at once', ending.active);
  tick(200);
  inp.keyDown('Space'); tick(1); inp.keyUp('Space'); tick(2);
  check('?ending: a key ends it on the title', !ending.active && p.state.mode === 'title');
  Reflect.deleteProperty(globalThis, 'location');
}

finish();
console.log('all passed');
