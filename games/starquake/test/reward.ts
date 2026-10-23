/**
 * The reward for winning (ENHANCED: src/ending.ts on shared/ending/show.ts; the game's own ending, the core drawn and a framed
 * message, stays and the reward follows it), headless, with the real game under it:
 *
 *  1. every scene's route does what the scene says in the game as the montage runs it (a game of its own, frame by frame):
 *     its goals in order, in the room, a teleport's name typed and BLOB arrived where it goes, the core's ending;
 *  2. the whole show runs from the first frame to THE END and calls `done`: the tune from its start and again on the way out,
 *     every creature of the cast recorded with its frames and walking through the montage, each named in the credits' row in turn on
 *     pixels the game leaves empty (BLOB is in every place, not among them), no parade, about a minute and a quarter, THE END and its numbers on
 *     the picture;
 *  3. the credits: the screen's last text row (y 192 to 199) is empty in the game's own picture in every frame of every place
 *     (sprites included), every line types on there letter by letter in yellow, is held, and goes, and the port's lines are last;
 *  4. a key skips it, after two seconds and not before;
 *  5. in the session: the game's ending (win) in ENHANCED runs the show on a key, then the final count goes on; ORIGINAL has none
 *     (the win is kept all the same); W on the pause screen once won (ENHANCED only) runs it and ends on the title; `?ending` on
 *     the page runs it at once.
 *
 *   nice -n 15 node tools/test.mjs games/starquake/test/reward.ts [out-dir]
 *
 * With an out-dir: PNG frames of each place, of each name in turn and of THE END.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer, TRANSPARENT } from 'c64kit';
import { CREDIT, PORT_CREDITS, readWon } from '../../shared/ending/credits';
import { RewardShow, type Place, type Reel } from '../../shared/ending/show';
import { RoutePilot } from '../../shared/ending/pilot';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { BandWatch, CastWatch, SHOW_FRAMES } from '../../shared/test/ending-kit';
import { must } from '../../shared/test/must';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { CREDIT_ROW, endingStats, isDone, openScene, routeFrames, SqReel, starquakeEnding } from '../src/ending';
import { CAST, SCENES } from '../src/ending-scenes';
import { Game } from '../src/game';
import { MAP_BOX } from '../../shared/native/pause';
import { run } from '../src/main';
import { starquakeMap } from '../src/map';
import { gameFont } from '../src/screens';
import { Stage } from '../src/stage';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
const store = useMemoryStorage();
const png = (name: string, renderer: PixelRenderer) => { if (out) rgbPng(path.join(out, name), indicesToRgb(renderer.picture()), 320, 200, 2); };
const BAND = { top: CREDIT_ROW, bottom: CREDIT_ROW + 7 };

// ---- 1. the routes, played as the montage plays them ----------------------------------------------------------------------

{
  const renderer = new PixelRenderer();
  const stage = new Stage(renderer);
  SCENES.forEach((scene, n) => {
    const g = stage.fresh();
    const script = openScene(g, scene);
    const reel = new SqReel(stage, script, scene);
    let goal = 0, left = false, typed = false, arrivedAt = -1;
    const frames = routeFrames(scene);
    const lives = g.lives.join();
    let hurt = false;
    for (let f = 0; f < frames; f++) {
      reel.tick();
      if (g.lives.join() !== lives) hurt = true;
      if (g.asking === 'code') typed = true;
      if (scene.teleportTo !== undefined && g.room === scene.teleportTo && arrivedAt < 0) arrivedAt = f;
      if (g.room !== scene.room && !scene.goals.some((x) => 'room' in x) && scene.teleportTo === undefined && !scene.complete) left = true;
      while (goal < scene.goals.length && isDone(must(scene.goals[goal], 'goal'), g)) goal++;
    }
    const pieces = scene.lying ? 'with a thing lying there' : '';
    check(`scene ${n} (room ${scene.room}${pieces ? ', ' + pieces : ''}, ${new RoutePilot(scene.route).length} frames): ${goal} of ${scene.goals.length} goals${scene.teleportTo !== undefined ? `, name typed ${typed}, arrived in ${g.room} (${scene.teleportTo})` : ''}${hurt ? ', LIVES LOST' : ''}${left ? ', LEFT THE ROOM' : ''}${scene.complete ? `, won ${g.won}` : ''}`,
      goal === scene.goals.length && !left && !hurt && (scene.teleportTo === undefined || (typed && g.room === scene.teleportTo)) && (!scene.complete || g.won));
  });
}
check('the places are 8 to 12', SCENES.length >= 8 && SCENES.length <= 12);

// ---- 2 and 3. the show, from the first frame to THE END -------------------------------------------------------------------

const input = new Input(nowhere);
const renderer = new PixelRenderer();
const spec = starquakeEnding(renderer);
/** What the game's own picture has in the credits' row, and what the show has put there in yellow and in any other colour. */
let gameBand = 0, gameFrames = 0, gameBandEmpty = true;
const badPlaces = new Map<number, string>();
function band(pic: ArrayLike<number>) {
  let other = 0, yellow = 0;
  for (let y = BAND.top; y <= BAND.bottom; y++) for (let x = 0; x < 320; x++) { const c = pic[y * 320 + x] ?? 0; if (c === CREDIT.colour) yellow++; else if (c !== 0 && c !== TRANSPARENT) other++; }
  return { yellow, other };
}
const watched: Place[] = spec.places.map((place) => ({
  ...place,
  open() {
    const reel = place.open();
    if (!reel) return null;
    const wrapped: Reel = {
      tick: () => reel.tick(),
      draw() {
        reel.draw();
        reel.render(0);
        const b = band(renderer.picture());
        gameBand += b.yellow + b.other;
        gameBandEmpty = b.yellow + b.other === 0;
        gameFrames++;
        if (b.yellow + b.other > 0 && !badPlaces.has(show.progress.place)) badPlaces.set(show.progress.place, `place ${show.progress.place} frame ${show.progress.frames}`);
      },
      render: (a) => reel.render(a),
      dispose: () => reel.dispose(),
    };
    return wrapped;
  },
}));

let tuneStarts = 0, tuneEnds = 0, over = 0;
const font = gameFont();
const show = new RewardShow({
  host: { renderer, input, canvas: nowhere },
  spec: { ...spec, places: watched },
  font: () => font,
  music: { start: () => { tuneStarts++; }, end: () => { tuneEnds++; } },
  done: () => { over++; },
});
const stats = endingStats(new Game());
show.start(stats);
let frames = 0;
const phases: string[] = [];
let lastPlace = -1, placesSeen = 0;
const bandWatch = new BandWatch(), castWatch = new CastWatch();
let endFrames = 0, endYellow = 0;
const sceneFrames: number[] = [];
while (show.active && frames < 20000) {
  input.poll();
  show.tick();
  show.render(0);
  frames++;
  const p = show.progress;
  if (phases[phases.length - 1] !== p.phase) phases.push(p.phase);
  if (p.phase === 'montage') {
    if (p.place !== lastPlace) {
      if (lastPlace >= 0) png(`place-${lastPlace}-end.png`, renderer);
      lastPlace = p.place; placesSeen++;
    }
    sceneFrames[p.place] = p.frames;
    if (p.frames === 0) continue;
    const place = spec.places[p.place];
    const b = band(renderer.screen.pixels);
    bandWatch.frame(p, place.credits, { ink: b.yellow, other: b.other });
    castWatch.frame(p, BAND, () => gameBandEmpty);
    if ([60, 150, 250, 350, 500, 700].includes(p.frames)) png(`place-${p.place}-f${p.frames}.png`, renderer);
    if (p.said?.kind === 'name' && !castWatch.pictured.has(p.said.text)) { castWatch.pictured.add(p.said.text); png(`name-${p.said.text.toLowerCase().replace(/\W+/g, '-')}.png`, renderer); }
  } else if (p.phase === 'end') {
    endFrames++;
    if (endFrames === 5) {
      const pic = renderer.picture();
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
check(`the cast: ${CAST.length} creatures, each with frames (${figures.length} recorded), BLOB not among them (he is in every place)`, figures.length === CAST.length && figures.every((f) => f.poses >= 1) && !figures.some((f) => f.name === 'BLOB'));
check('creatures are named as the cast says, in order', CAST.every((c, i) => figures[i]?.name === c.name));
check(`the cast moves (${figures.filter((f) => f.poses >= 3).length} have 3 frames or more)`, figures.filter((f) => f.poses >= 3).length >= CAST.length - 2);
castWatch.check(figures);
check(`THE END is on the picture in yellow (${endYellow} pixels)`, endYellow > 100);

const lines = spec.places.flatMap((p) => p.credits ?? []);
bandWatch.check(lines.length, gameFrames, gameBand, [...badPlaces.values()]);
const bad = lines.filter((l) => l.length > CREDIT.letters || [...l].some((c) => c !== ' ' && !font.glyph(c)));
check(`lines are at most ${CREDIT.letters} letters, in the game's own lettering${bad.length ? ` (not: ${bad.join(' / ')})` : ''}`, bad.length === 0);
check('the port is credited last, as PORT_CREDITS has it', PORT_CREDITS.every((l, i) => lines[lines.length - PORT_CREDITS.length + i] === l) && bandWatch.typed.has(`${spec.places.length - 1}.${(spec.places[spec.places.length - 1]?.credits?.length ?? 0) - 1}`));

// ---- 4. skipping ----------------------------------------------------------------------------------------------------------

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

// ---- 5. in the session ----------------------------------------------------------------------------------------------------

function boot(enhanced: boolean) {
  store.clear();
  store.set('starquake.assist', JSON.stringify({ enhanced }));
  const inp = new Input(nowhere), rend = new PixelRenderer(), p = run({ renderer: rend, input: inp, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { inp.poll(); p.tick(); p.render(0); } };
  const tap = (code: string) => { inp.keyDown(code); tick(2); inp.keyUp(code); tick(2); };
  const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
  return { p, inp, tick, tap, until, rend };
}

/** A game begun, the core all there but what BLOB carries, travelled to the core: the game's own ending, on the screen. */
function win(s: ReturnType<typeof boot>) {
  const { p, tick, tap, inp } = s;
  tick(60);
  tap('Space'); tick(30); tap('Space'); tick(5);
  const g = p.game;
  g.core.forEach((v, i) => { g.core[i] = v | 0x80; });
  // (the map's travel to the core's room, which BLOB has "been in")
  const found = p.state.found;
  found.entry = { ...found.entry, 199: [21, 16] };
  g.lo[199 >> 3] |= 0x80 >> (199 & 7);
  tap('KeyP');
  const place = must(starquakeMap.places(MAP_BOX, g, p.state.found, 0).find((q) => q.id === '199'), 'room 199 on the map');
  inp.point(place.x, place.y); tick(2);
  inp.point(place.x, place.y); tick(3);
  return s.until(() => p.state.mode === 'ending', 3000);
}

{
  const s = boot(true);
  const won = win(s);
  const ending = must(s.p.ending, 'the ending');
  check('ENHANCED: the game is won: its own ending on the screen', won && s.p.game.won);
  check('ENHANCED: the win is kept, apart from the saves', readWon('starquake') && store.has('starquake.won'));
  check('ENHANCED: the show waits for a key after the game\'s own ending', !ending.active);
  s.tick(110);
  s.tap('Space');
  s.tick(10);
  check('ENHANCED: a key after it: the show begins', ending.active);
  s.tick(110);
  s.tap('Space');
  check('ENHANCED: a key skips it: the final count goes on, then game over', !ending.active && s.p.state.mode === 'final' && s.until(() => s.p.state.mode === 'over', 3000));
  check('ENHANCED: the show\'s sprites are put away (game over: none on the screen)', s.rend.sprites.every((h) => !h.visible));
}
{
  const s = boot(true);
  win(s);
  s.tick(110); s.tap('Space'); s.tick(5); s.tick(110); s.tap('Space');
  s.until(() => s.p.state.mode === 'over', 3000);
  const ending = must(s.p.ending, 'the ending');
  // game over, the table of heroes (initials if a place, then the table), the title: then a new game, and W on its pause screen
  s.tick(120); s.tap('Space'); s.tick(5);
  if (s.p.state.mode === 'hero') { for (const k of ['KeyR', 'KeyW', 'KeyE', 'KeyR', 'KeyW']) s.tap(k); s.tick(20); }
  s.until(() => s.p.state.mode === 'heroes', 400);
  s.tick(120); s.tap('Space');
  s.until(() => s.p.state.mode === 'title', 3000);
  s.tick(100);
  s.tap('Space'); s.tick(30);
  s.tap('Space'); s.tick(30);
  s.until(() => s.p.state.mode === 'play', 600);
  s.tap('KeyP');
  check('ENHANCED, won: the pause screen is up in a new game', s.p.state.paused);
  s.tap('KeyW');
  check('ENHANCED: W starts it', ending.active);
  s.tick(120);
  s.tap('Space');
  check('ENHANCED: after it, the title', !ending.active && s.p.state.mode === 'title');
}

{
  const s = boot(false);
  const won = win(s);
  const ending = must(s.p.ending, 'the ending');
  check('ORIGINAL: the game is won, and kept so', won && readWon('starquake'));
  s.tick(110); s.tap('Space'); s.tick(10);
  check('ORIGINAL: a key after its own ending goes on to the final count, with no show of ours', !ending.active && s.p.state.mode === 'final');
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
