/**
 * The reward for winning Wanted: Monty Mole (ENHANCED: src/ending.ts on shared/ending/show.ts), headless, no original needed:
 *
 *  1. every room's route (re/ending/route.ts: the test suite's bot's keys, found on a `SteadyGame`) played again does what the room asks, alive: every piece of the room's coal
 *     is taken, a gate's room opens its gate, and the way on is taken; played twice it is the same game;
 *  2. the whole show runs from the first frame to THE END and calls `done`: the rooms in order each with its credits, the creatures (their own frames, as the game shows them
 *     going their way; Monty is in every room, not among them) walking through them, each named in the credits' row in turn on pixels the game leaves empty, no parade,
 *     about a minute and THE END and its numbers, the tune from its start and again on the way out;
 *  3. the credits: the status rows (the score, the lives) are put away, black in every frame of every room before the text goes over them, every line types on in the top row
 *     letter by letter in bright yellow, is held and goes, the port's lines last;
 *  4. a key skips it, after two seconds and not before;
 *  5. in the session: the game's own ending in ENHANCED is followed by the show (and the win kept), over the title it goes back to; ORIGINAL has none (the win is kept all the
 *     same); W on the pause screen once won (ENHANCED only); `?ending` runs it at once.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/reward.ts [out-dir]
 *
 * With an out-dir: PNG frames of each room, of the credits, of each name in turn and of THE END.
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
import { palettePng } from '../../../tools/png';
import { SPECTRUM, SPECTRUM_PALETTE, SURFACE_WIDTH } from '../../shared/spectrum';
import { spectrumFont } from '../../shared/spectrum-font';
import { keyByte, portsFor } from '../src/controls';
import { CAST, CREDIT_ROW, LINES, SCENE_ROOMS, STATUS_BOTTOM, STATUS_TOP, endingStats, montyEnding, routeOf, sceneGame } from '../src/ending';
import { ROUTES } from '../src/ending-routes';
import { GATES } from '../src/gates';
import { Game, START_LIVES } from '../src/game';
import { MontyFlow } from '../src/flow';
import { run } from '../src/main';
import { piecesOfRoom } from '../src/map';
import { STILL_THERE } from '../src/coal';
import { NEXT_ROOM } from './bot';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
const png = (name: string, renderer: PixelRenderer) => { if (out) palettePng(path.join(out, name), renderer.picture(), 320, 200, SPECTRUM_PALETTE, 2); };
const store = useMemoryStorage();

// ---- 1. the routes, played again ---------------------------------------------------------------------------------

/** A route played on a game of its key, and what came of it: where it ended, lives, the room's coal left, the gate, a fingerprint of the play. */
function playRoute(room: number) {
  const route = routeOf(room);
  const game = sceneGame(room, route);
  const pilot = new RoutePilot(route.route);
  const gate = GATES.find((g) => g.room === room);
  let passes = 0, hash = 0, gateOpened = false;
  for (; !pilot.done; passes++) {
    const stick = pilot.next();
    game.pass(portsFor(keyByte(stick, stick.fire)));
    if (gate !== undefined && (game.gates.flags & gate.done) !== 0 && game.room === room) gateOpened = true;
    hash = (Math.imul(hash, 31) + game.monty.x + game.monty.y * 256 + game.score.value) >>> 0;
  }
  const left = piecesOfRoom(room).filter((id) => ((game.coal.flags[id] ?? 0) & STILL_THERE) !== 0).length;
  return { room: game.room, lives: game.lives, divergence: game.divergence, left, passes, hash, score: game.score.value, gateOpened, gate };
}
for (const room of SCENE_ROOMS) {
  const a = playRoute(room), b = playRoute(room);
  const next = NEXT_ROOM[room];
  check(`room ${room + 1}: the route takes ${a.passes} passes (${(a.passes / 25).toFixed(0)} s), every piece of coal (${a.left} left)${a.gate !== undefined ? ', opens the gate' : ''} and goes on to room ${(next ?? 21) + 1}, no life lost, the same game twice (score ${a.score})`,
    a.left === 0 && a.room === next && a.lives === START_LIVES && a.divergence === null && a.hash === b.hash && a.score === b.score && (a.gate === undefined || a.gateOpened));
}
check('the rooms of the montage in the order of the game, each with a route', SCENE_ROOMS.every((room, i) => ROUTES[room] !== undefined && (i === 0 || (SCENE_ROOMS[i - 1] ?? 0) < room)));

// ---- 2 and 3. the show --------------------------------------------------------------------------------------------

const input = new Input(nowhere);
const renderer = new PixelRenderer();
const spec = montyEnding(renderer);
const BAND = { top: CREDIT_ROW, bottom: CREDIT_ROW + 7 };
/** What is in the credits' row now: pixels of the credits' colour, and any other that is not black. */
function band() {
  const pic = renderer.picture();
  let credit = 0, other = 0;
  for (let y = BAND.top; y <= BAND.bottom; y++) for (let x = 0; x < SURFACE_WIDTH; x++) { const c = pic[y * SURFACE_WIDTH + x]; if (c === SPECTRUM.yellow) credit++; else if ((c ?? 0) !== 0) other++; }
  return { credit, other };
}
/** Pixels in the two status bands that are not black (before the show's own text, which is in the top one). */
function statusPixels(): number {
  const pic = renderer.picture();
  let n = 0;
  for (const s of [STATUS_TOP, STATUS_BOTTOM]) for (let y = s.from; y < s.to; y++) for (let x = 0; x < SURFACE_WIDTH; x++) if ((pic[y * SURFACE_WIDTH + x] ?? 0) !== 0) n++;
  return n;
}
// each place's reel watched: what the game's own picture has in the band before any credit goes over it
let gameBand = 0, gameFrames = 0, gameBandEmpty = true, statusDrawn = 0;
const watched: Place[] = spec.places.map((place) => ({
  ...place,
  open() {
    const reel = place.open();
    if (!reel) return null;
    const watch: Reel = {
      tick: () => reel.tick(),
      draw() {
        reel.draw();
        // (the first frame of a room: its sprites are not yet put where they go, `render` does that; they stand at the corner, which is no picture)
        if (show.progress.frames <= 1) { gameBandEmpty = true; return; }
        const b = band();
        gameBand += b.credit + b.other;
        gameBandEmpty = b.credit + b.other === 0;
        statusDrawn += statusPixels();
        gameFrames++;
      },
      render: (a) => reel.render(a),
      dispose: () => reel.dispose(),
      ground: reel.ground,
      shownArea: reel.shownArea,
    };
    return watch;
  },
}));
let tuneStarts = 0, tuneEnds = 0, tuneFrames = 0, over = 0;
const show = new RewardShow({
  host: { renderer, input, canvas: nowhere },
  spec: { ...spec, places: watched },
  font: spectrumFont,
  music: { start: () => { tuneStarts++; }, end: () => { tuneEnds++; }, frame: () => { tuneFrames++; } },
  done: () => { over++; },
});
show.start(['SCORE 1234', 'HIGH SCORE 5678', 'COAL 64 OF 64', 'ROOMS 21 OF 21']);
let frames = 0;
const phases: string[] = [];
let lastPlace = -1, placeFrame = 0, endYellow = 0, endFrames = 0;
const bandWatch = new BandWatch(), castWatch = new CastWatch();
const sceneFrames: number[] = [];
while (show.active && frames < 14000) {
  input.poll();
  show.tick();
  show.render(0);
  frames++;
  const p = show.progress;
  if (phases[phases.length - 1] !== p.phase) phases.push(p.phase);
  if (p.phase === 'montage') {
    if (p.place !== lastPlace) { lastPlace = p.place; placeFrame = 0; }
    placeFrame = p.frames;
    sceneFrames[p.place] = p.frames;
    if (p.frames === 0) continue;
    const place = spec.places[p.place];
    const b = band();
    // (a line in full is all credit-coloured pixels in the band, never another colour; while it types on the same)
    bandWatch.frame(p, place?.credits, { ink: b.credit, other: b.other });
    castWatch.frame(p, BAND, () => gameBandEmpty);
    if ([100, 400, 700, 1000].includes(placeFrame)) png(`place${p.place}-f${placeFrame}.png`, renderer);
    if (p.said?.kind === 'name' && !castWatch.pictured.has(p.said.text)) { castWatch.pictured.add(p.said.text); png(`name-${p.said.text.toLowerCase().replace(/\W+/g, '-')}.png`, renderer); }
  } else if (p.phase === 'end') {
    endFrames++;
    if (endFrames === 5) {
      const pic = renderer.picture();
      for (let y = 50; y < 66; y++) for (let x = 0; x < SURFACE_WIDTH; x++) if (pic[y * SURFACE_WIDTH + x] === SPECTRUM.yellow) endYellow++;
      png('the-end.png', renderer);
    }
  }
}
console.log(`phases: ${phases.join(' ')}; ${frames} frames (${(frames / 50).toFixed(0)} s); scenes ${sceneFrames.join(' ')}; figures: ${show.cast.map((f) => `${f.name}:${f.poses.length}`).join(', ')}`);
check('the show ran to its end and called done, once', !show.active && over === 1);
check('every room of the montage in order, then THE END, no parade', phases.join() === 'loading,montage,end');
check(`it is a watchable length (${(frames / 50).toFixed(0)} seconds, about 60 to 75)`, frames >= SHOW_FRAMES.min && frames <= SHOW_FRAMES.max);
check(`each room is as long as its credits and visitors take (${sceneFrames.join(', ')} frames), a part of its route played (never more than the route has: two frames a pass)`,
  sceneFrames.every((n, i) => n > 0 && n <= 2 * new RoutePilot(routeOf(SCENE_ROOMS[i] ?? 0).route).length));
check('the tune is begun with the show, goes on all through it and is stopped on the way out', tuneStarts === 1 && tuneEnds === 1 && tuneFrames > 2500);
check(`every creature of the cast was recorded (${show.cast.length}), Monty not among them (he is in every room), and each moves (four pictures)`, show.cast.length === CAST.length && !show.cast.some((f) => f.name === 'MONTY') && show.cast.every((f) => f.poses.length === 4));
castWatch.check(show.cast);
bandWatch.check(LINES.length, gameFrames, gameBand, []);
check(`the status rows (the score and the lives) are put away: nothing but black in either band, in every frame of every room, before the show's text goes over them (${statusDrawn} pixels in ${gameFrames} frames)`, gameFrames > 1000 && statusDrawn === 0);
check('every line fits the screen (at most 38 letters, upper case, in the lettering of our font)', LINES.every((l) => l.length <= CREDIT.letters && l === l.toUpperCase() && /^[A-Z0-9 ,.:!?()-]+$/.test(l)));
check('the credits are in order: the game first, the port and thanks last', LINES[0] === 'WANTED: MONTY MOLE, 1984' && PORT_CREDITS.every((l) => LINES.includes(l)) && LINES[LINES.length - 1] === 'THANKS FOR PLAYING');
check('the port is credited to Christopher Hickman, with Claude', LINES.some((l) => l.includes('HICKMAN')) && LINES.some((l) => l.includes('CLAUDE')));
check('THE END has its title and numbers', endYellow > 100);
check('the numbers under THE END: score, high score, coal, rooms', endingStats(new MontyFlow(new Game()), { reached: [0], arrivals: [0, 0x18, 0x27] }).length === 4);

// ---- 4. skipping --------------------------------------------------------------------------------------------------
{
  const input2 = new Input(nowhere);
  let done = 0;
  const again = new RewardShow({ host: { renderer: new PixelRenderer(), input: input2, canvas: nowhere }, spec: montyEnding(new PixelRenderer()), font: spectrumFont, music: { start() {}, end() {} }, done: () => { done++; } });
  again.start([]);
  for (let i = 0; i < 20; i++) { input2.poll(); again.tick(); }
  input2.keyDown('Space'); input2.poll(); again.tick(); input2.keyUp('Space');
  check('a key in the first moment does not skip it', again.active);
  for (let i = 0; i < 120; i++) { input2.poll(); again.tick(); }
  input2.keyDown('Space'); input2.poll(); again.tick(); input2.keyUp('Space');
  check('a key after the first moment skips it', !again.active && done === 1);
}

// ---- 5. in the session ------------------------------------------------------------------------------------------------
async function session(kept: Map<string, string>) {
  useMemoryStorage(kept);
  const input3 = new Input(nowhere);
  const renderer3 = new PixelRenderer();
  const p = run({ renderer: renderer3, input: input3, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input3.poll(); p.tick(); p.render(0); } };
  const tap = (code: string) => { input3.keyDown(code); tick(2); input3.keyUp(code); tick(2); };
  await new Promise((r) => setTimeout(r, 0));
  tick(60);
  tap('Space');
  await new Promise((r) => setTimeout(r, 0));
  tick(10);
  tap('Space');
  for (let i = 0; i < 200 && p.state.phase !== 'play'; i++) tick();
  return { p, tick, tap };
}
/** Winning: room 20's right edge (the game's own way to the ending), the verse typed, and a key to end it. */
function win(s: Awaited<ReturnType<typeof session>>) {
  const g = s.p.flow.game;
  g.place(20, 0xee, 0x40);
  for (let i = 0; i < 400 && s.p.state.phase !== 'ending'; i++) { g.monty.x = 0xf0; s.tick(); }
  const onVerse = s.p.state.phase === 'ending';
  s.tick(1100);
  s.tap('Space');
  for (let i = 0; i < 100 && s.p.state.phase === 'ending'; i++) s.tick();
  return onVerse;
}
{
  const s = await session(new Map());
  check('ENHANCED by default, not won yet', s.p.state.enhanced && !readWon('montymole'));
  const onVerse = win(s);
  check('the ending is the game\'s own verse, as it was, and the win is kept', onVerse && readWon('montymole'));
  check('then the show, over the title the verse goes back to', !!s.p.reward?.active && s.p.state.phase === 'title');
  let n = 0;
  while (s.p.reward?.active && n++ < 9000) s.tick();
  s.tick(30);
  check(`the show ran (${n} frames) and the title is back`, n > 2500 && !s.p.reward?.active && s.p.state.phase === 'title');

  // W on the pause screen once won (in a game started again)
  s.tap('Space');
  await new Promise((r) => setTimeout(r, 0));
  s.tick(10);
  s.tap('Space');
  for (let i = 0; i < 200 && s.p.state.phase !== 'play'; i++) s.tick();
  s.p.flow.game.place(0, 0x18, 0x27);
  s.tick(6);
  s.tap('KeyP');
  check('the pause screen is up', s.p.state.paused);
  s.tap('KeyW');
  check('W watches the reward (the flag kept above)', !!s.p.reward?.active);
  n = 0;
  while (s.p.reward?.active && n++ < 9000) s.tick();
  s.tick(30);
  check('and back at the title', !s.p.reward?.active && s.p.state.phase === 'title');
}
{
  // ORIGINAL: the game as it was: the verse, no show, the win kept; W not offered
  const s = await session(new Map([['montymole.assist', JSON.stringify({ enhanced: false })]]));
  check('ORIGINAL chosen', !s.p.state.enhanced);
  const onVerse = win(s);
  s.tick(60);
  check('ORIGINAL: the verse, no show after it, the win kept all the same', onVerse && !s.p.reward?.active && s.p.state.phase === 'title' && readWon('montymole'));
  s.tap('Space');
  await new Promise((r) => setTimeout(r, 0));
  s.tick(10);
  s.tap('Space');
  for (let i = 0; i < 200 && s.p.state.phase !== 'play'; i++) s.tick();
  s.p.flow.game.place(0, 0x18, 0x27);
  s.tick(6);
  s.tap('KeyP');
  s.tap('KeyW');
  check('ORIGINAL: W on the pause screen does nothing', !s.p.reward?.active);
}
void store;
finish();
