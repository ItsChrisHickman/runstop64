/**
 * The reward for winning (ENHANCED: src/ending.ts on shared/ending/show.ts; the game's own ending is the closing screen), headless,
 * with the real game under it (needs none of the original's files):
 *
 *  1. every scene's route does what the scene says in the game as the montage runs it (a `Program` of its own, frame by frame,
 *     the stick read in the logic phases, a flight chased): its goals in order, in the room, nothing ending a life; and with no
 *     grace at all, for the record, how many of them he gets through untouched;
 *  2. the whole show runs from the first frame to THE END and calls `done`: the tune from its start and again on the way out,
 *     every creature of the cast recorded with its frames and walking through the montage, each named in the credits' row in turn on
 *     pixels the game leaves empty (Monty is in every place, not among them), no parade, about a minute and a quarter, THE END and its numbers on
 *     the picture;
 *  3. the credits: the row under the room is empty in the game's own picture between the side columns in every frame of every
 *     place (sprites included, the flight's sky too), every line types on there letter by letter in yellow, is held, and goes,
 *     and the port's lines are last;
 *  4. a key skips it, after two seconds and not before;
 *  5. in the session: winning in ENHANCED runs it from the ending (the title and CONTINUE? after it, the save kept) and keeps
 *     that the game has been won; ORIGINAL has none (the win is kept all the same); W on the pause screen once won (ENHANCED
 *     only) runs it and ends on the title; `?ending` on the page runs it at once.
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/reward.ts [out-dir]
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
import { indicesPng, renderPixels } from '../../../tools/probe/render';
import { AwmReel, awmEnding, CREDIT_LETTERS, CREDIT_ROW, CREDIT_X, endingStats, isDone, routeFrames, sceneGame, Stage, stickBits } from '../src/ending';
import { CAST, SCENES } from '../src/ending-scenes';
import { Game } from '../src/game';
import { decodeStick } from '../src/input';
import { awmFont, run } from '../src/main';
import type { Program } from '../src/program';
import { State } from '../src/tiles';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
const hex = (n: number) => `$${n.toString(16)}`;
const store = useMemoryStorage();
/** The states a hit puts him in. */
const HURT: readonly number[] = [State.Zap, State.Fire, State.Dying, State.Knocked];
/** The credits' row, between the side columns. */
const bandAt = (top: number) => ({ top, bottom: top + 7, left: CREDIT_X, right: CREDIT_X + CREDIT_LETTERS * 8 });
let BAND = bandAt(CREDIT_ROW);

/** The game's picture as the VIC draws it with what the show has put over it (the credits), as a PNG. */
function shot(name: string, renderer: PixelRenderer, program: Program | null) {
  if (!out) return;
  const px = program ? renderPixels(program) : Uint8Array.from(renderer.picture());
  if (program) {
    const over = renderer.screen.pixels;
    for (let i = 0; i < px.length; i++) if (over[i] !== TRANSPARENT) px[i] = over[i];
  }
  indicesPng(path.join(out, name), px, 320, 200);
}

// ---- 1. the routes, played as the montage plays them ----------------------------------------------------------------------

{
  const stage = new Stage(new PixelRenderer());
  SCENES.forEach((scene, n) => {
    stage.carry = { score: [0, 0, 0, 0, 0], money: [0, 0, 0, 0, 0] };
    const program = stage.begin(scene);
    const g = program?.game;
    if (!program || !g) { check(`scene ${n} (room ${hex(scene.room)}): begins`, false); return; }
    const reel = new AwmReel(stage, program, scene);
    const lives = g.lives;
    let goal = 0, hurt = false, left = false, flew = 0;
    const frames = routeFrames(scene);
    for (let f = 0; f < frames; f++) {
      reel.tick();
      const now = program.game;
      if (!now || program.kind !== 'play') break;
      if (now.lives !== lives || now.monty.dead) hurt = true;
      if (now.world.room !== scene.room && !scene.goals.some((x) => 'enter' in x || 'ending' in x)) left = true;
      if (program.flying) flew++;
      while (goal < scene.goals.length && isDone(must(scene.goals[goal], 'goal'), now)) goal++;
    }
    const board = scene.fly === true;
    const shotDown = board ? g.score.value >= 100 : true;
    check(`scene ${n} (room ${hex(scene.room)}, ${new RoutePilot(scene.route).length} steps): ${goal} of ${scene.goals.length} goals${hurt ? ', HURT' : ''}${left ? ', LEFT THE ROOM' : ''}${board ? `, ${flew} frames of flight, score ${g.score.value}` : ''}, in the room, alive`,
      goal === scene.goals.length && !hurt && !left && (!board || (flew > 200 && shotDown)));
  });
  // (no grace: how many routes he gets through untouched, for the record)
  let clean = 0;
  for (const scene of SCENES) {
    const bare = sceneGame(scene);
    bare.graceActive = () => false;
    const pilot = new RoutePilot(scene.route);
    let touched = false;
    while (!pilot.done) {
      bare.step(decodeStick(stickBits(pilot.next())), false);
      if (HURT.includes(bare.monty.state)) touched = true;
    }
    if (!touched) clean++;
  }
  console.log(`  routes with no grace at all: ${clean} of ${SCENES.length} untouched (the show has a moment's grace for the rest)`);
}
check('the places are 6 to 12', SCENES.length >= 6 && SCENES.length <= 12);

// ---- 2 and 3. the show, from the first frame to THE END -------------------------------------------------------------------

const input = new Input(nowhere);
const renderer = new PixelRenderer();
const spec = awmEnding(renderer);
const watching: { reel: AwmReel | null } = { reel: null };
/** What the game's own picture has in the credits' row between the side columns, and what the show has put there in yellow and in any other colour. */
let gameBand = 0, gameFrames = 0, badFrames = 0, gameBandEmpty = true;
const badPlaces = new Map<number, string>();
function bandOf(px: ArrayLike<number>, only: number | null) {
  let n = 0, yellow = 0, other = 0;
  for (let y = BAND.top; y <= BAND.bottom; y++) {
    for (let x = BAND.left; x < BAND.right; x++) {
      const c = px[y * 320 + x] ?? 0;
      if (only === null) { if (c !== 0 && c !== TRANSPARENT) n++; } else if (c === CREDIT.colour) yellow++; else if (c !== TRANSPARENT) other++;
    }
  }
  return { n, yellow, other };
}
const watched: Place[] = spec.places.map((place) => ({
  ...place,
  open() {
    const reel = place.open();
    if (!(reel instanceof AwmReel)) return null;
    watching.reel = reel;
    BAND = bandAt(place.creditRow ?? CREDIT_ROW);
    const wrapped: Reel = {
      tick: () => reel.tick(),
      draw() {
        reel.draw();
        const px = renderPixels(reel.program);
        const b = bandOf(px, null);
        gameBand += b.n;
        gameBandEmpty = b.n === 0;
        gameFrames++;
        if (b.n > 0 && !badPlaces.has(show.progress.place)) {
          let at = '';
          for (let y = BAND.top; y <= BAND.bottom && !at; y++) for (let x = BAND.left; x < BAND.right && !at; x++) if ((px[y * 320 + x] ?? 0) !== 0) at = `(${x},${y}) colour ${px[y * 320 + x]}`;
          badPlaces.set(show.progress.place, `place ${show.progress.place} frame ${show.progress.frames} ${at}`);
        }
        if (b.n > 0) badFrames++;
      },
      render: (a) => reel.render(a),
      dispose: () => reel.dispose(),
    };
    return wrapped;
  },
}));

let tuneStarts = 0, tuneEnds = 0, over = 0;
const show = new RewardShow({
  host: { renderer, input, canvas: nowhere },
  spec: { ...spec, places: watched },
  font: awmFont,
  music: { start: () => { tuneStarts++; }, end: () => { tuneEnds++; } },
  done: () => { over++; },
});
const stats = endingStats(new Game(0x48), { rooms: {} });
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
      if (lastPlace >= 0) shot(`place-${lastPlace}-end.png`, renderer, watching.reel?.program ?? null);
      lastPlace = p.place; placesSeen++;
    }
    sceneFrames[p.place] = p.frames;
    if (p.frames === 0) continue;
    const place = spec.places[p.place];
    const b = bandOf(renderer.screen.pixels, 1);
    bandWatch.frame(p, place.credits, { ink: b.yellow, other: b.other });
    castWatch.frame(p, BAND, () => gameBandEmpty);
    if ([60, 150, 250, 350, 500, 700, 900].includes(p.frames)) shot(`place-${p.place}-f${p.frames}.png`, renderer, watching.reel?.program ?? null);
    if (p.said?.kind === 'name' && !castWatch.pictured.has(p.said.text)) { castWatch.pictured.add(p.said.text); shot(`name-${p.said.text.toLowerCase().replace(/\W+/g, '-')}.png`, renderer, watching.reel?.program ?? null); }
  } else if (p.phase === 'end') {
    endFrames++;
    if (endFrames === 5) {
      const pic = renderer.picture();
      for (let y = 50; y < 66; y++) for (let x = 0; x < 320; x++) if (pic[y * 320 + x] === 7) endYellow++;
      shot('the-end.png', renderer, null);
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
check(`the cast moves (${figures.filter((f) => f.poses >= 3).length} have 3 frames or more)`, figures.filter((f) => f.poses >= 3).length >= CAST.length - 4);
castWatch.check(figures, CREDIT_LETTERS);
check(`THE END is on the picture in yellow (${endYellow} pixels)`, endYellow > 100);

const lines = spec.places.flatMap((p) => p.credits ?? []);
bandWatch.check(lines.length, gameFrames, gameBand, [...badPlaces.values()]);
const font = awmFont();
const bad = lines.filter((l) => l.length > CREDIT_LETTERS || [...l].some((c) => c !== ' ' && !font.glyph(c)));
check(`lines are at most ${CREDIT_LETTERS} letters, in the game's own lettering${bad.length ? ` (not: ${bad.join(' / ')})` : ''}`, bad.length === 0);
check('the port is credited last, as PORT_CREDITS has it', PORT_CREDITS.every((l, i) => lines[lines.length - PORT_CREDITS.length + i] === l) && bandWatch.typed.has(`${spec.places.length - 1}.${(spec.places[spec.places.length - 1]?.credits?.length ?? 0) - 1}`));

// ---- 4. skipping ----------------------------------------------------------------------------------------------------------

{
  let ended = 0;
  const s = new RewardShow({ host: { renderer, input, canvas: nowhere }, spec, font: awmFont, music: { start() {}, end() {} }, done: () => { ended++; } });
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
  store.set('awm.assist', JSON.stringify({ enhanced }));
  const inp = new Input(nowhere), rend = new PixelRenderer(), p = run({ renderer: rend, input: inp, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { inp.poll(); p.tick(); p.render(0); } };
  const press = (code: string) => { inp.keyDown(code); tick(2); inp.keyUp(code); tick(2); };
  const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
  return { p, tick, press, until, rend };
}

/** Win the game: a game begun, everything delivered, Monty come into Montos, the ending played out to the title. */
function win(s: ReturnType<typeof boot>) {
  s.tick(120);
  s.press('Space');
  s.tick(20);
  const g = must(s.p.program.game, 'a game');
  g.progress = g.progressSeen = 0xc3;
  g.placeAt({ room: 0x4d, x: 0x90, y: 0x40, state: 0, step: 0 });
  return s.until(() => s.p.program.kind === 'title', 3000) && s.p.program.lastEnd === 'ending';
}

{
  const s = boot(true);
  const won = win(s);
  const ending = must(s.p.ending, 'the ending');
  check('ENHANCED: the game is won (the ending played out, GAME OVER, the title)', won);
  check('ENHANCED: the win is kept, apart from the saves', readWon('awm') && store.has('awm.won') && !store.has('awm.save.v2.won'));
  check('ENHANCED: the show begins from the ending, over the title', ending.active);
  s.tick(10);
  check('ENHANCED: it is running (the montage, the game of its own, the player\'s game untouched)', ending.progress.phase !== 'loading');
  s.tick(110);
  s.press('Space');
  check('ENHANCED: a key skips it: the title, and CONTINUE? as after any ending', !ending.active && s.until(() => s.p.state.prompt === 'continue', 600) && s.p.state.kind === 'title');
  check('ENHANCED: the show\'s sprites are put away', s.rend.sprites.every((h) => !h.visible || s.p.state.kind === 'title'));
  check('ENHANCED: the save is kept', s.p.state.hasSave);
  s.press('Enter');
  check('ENHANCED: CONTINUE? yes: back in play', s.until(() => s.p.state.kind === 'play', 300));
  s.tick(10);
  s.press('KeyP');
  check('ENHANCED, won: the pause screen is up', s.p.state.paused);
  s.press('KeyW');
  check('ENHANCED: W starts it', ending.active);
  s.tick(120);
  s.press('Space');
  check('ENHANCED: after it, the title with the save kept', !ending.active && s.p.state.kind === 'title' && s.p.state.hasSave);
}

{
  const s = boot(false);
  const won = win(s);
  const ending = must(s.p.ending, 'the ending');
  s.tick(30);
  check('ORIGINAL: the game is won, and kept so, with no ending of ours (the title, then CONTINUE?)', won && readWon('awm') && !ending.active && s.until(() => s.p.state.prompt === 'continue', 600));
  s.press('Enter');
  s.until(() => s.p.state.kind === 'play', 300);
  s.tick(10);
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
  check('?ending: a key ends it on the title', !ending.active && p.state.kind === 'title');
  Reflect.deleteProperty(globalThis, 'location');
}

finish();
console.log('all passed');
