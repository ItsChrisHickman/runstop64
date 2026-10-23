/**
 * The reward for winning Moley Christmas (ENHANCED: src/ending.ts on shared/ending/show.ts), headless, no original needed:
 *
 *  1. every screen's route (re/ending/route.ts: the test suite's player's keys, found on a `SteadyGame`) played again does what the screen
 *     asks, alive: each leaves by its way out and the last delivers the papers and ends the game; played twice it is the same game;
 *  2. the whole show runs from the first frame to THE END and calls `done`: the six screens in order each with its credits, the creatures
 *     (recorded; Monty is in every screen, not among them) walking through them, each named in the credits' rows in turn on pixels the game leaves
 *     empty, no parade, about a minute and THE END and its numbers, the tune from its start and again on the way out;
 *  3. the credits: the rows they stand in (where the panel was, put away) are black in every frame of every screen, before the text goes
 *     over them, every line types on there letter by letter in bright yellow, is held and goes, the port's lines last;
 *  4. a key skips it, after two seconds and not before;
 *  5. in the session: the card in ENHANCED is followed by the show (and the win kept), on the credits page it leaves; ORIGINAL has none (the
 *     win is kept all the same); W on the pause screen once won (ENHANCED only); `?ending` runs it at once.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/reward.ts [out-dir]
 *
 * With an out-dir: PNG frames of each screen, of the credits, of each name in turn and of THE END.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { CREDIT, PORT_CREDITS, readWon } from '../../shared/ending/credits';
import { RewardShow, type Place, type Reel } from '../../shared/ending/show';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { BandWatch, CastWatch, SHOW_FRAMES } from '../../shared/test/ending-kit';
import { palettePng } from '../../../tools/png';
import { SPECTRUM } from '../src/colours';
import { CREDIT_ROW, LINES, SCENE_ROOMS, endingStats, moleyEnding, newScreen } from '../src/ending';
import { Pilot } from '../src/ending-pilot';
import { ROUTES } from '../src/ending-routes';
import { START_LIVES } from '../src/game';
import { spectrumFont } from '../src/font';
import { run } from '../src/main';
import { SPECTRUM_PALETTE } from '../src/palette';
import { MoleyFlow } from '../src/flow';
import { SeededRandom } from '../src/random';
import { SURFACE_WIDTH } from '../src/view';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
const png = (name: string, renderer: PixelRenderer) => { if (out) palettePng(path.join(out, name), renderer.picture(), 320, 200, SPECTRUM_PALETTE, 2); };
const store = useMemoryStorage();

// ---- 1. the routes, played again ---------------------------------------------------------------------------------

/** A route played on a game of its seed, and what came of it: where it ended, lives, score, a fingerprint of the play. */
function playRoute(room: number) {
  const route = ROUTES[room];
  const { game } = newScreen(room);
  let passes = 0, hash = 0, last = 'playing';
  outer: for (const [keys, n] of route.runs) {
    for (let i = 0; i < n; i++, passes++) {
      last = game.pass(keys);
      hash = (Math.imul(hash, 31) + game.monty.x + game.monty.y * 256 + game.score) >>> 0;
      if (last === 'ended') break outer;
    }
  }
  return { room: game.room, lives: game.lives, score: game.score, last, passes, hash };
}
for (const room of SCENE_ROOMS) {
  const a = playRoute(room), b = playRoute(room);
  const left = room === 5 ? a.last === 'ended' && a.score >= 1000 : a.room === room + 1;
  check(`screen ${room + 1}: the route takes ${a.passes} passes (${(a.passes / 25).toFixed(0)} s) and ${room === 5 ? 'delivers the papers: the ending' : `goes out to screen ${room + 2}`}, no life lost, the same game twice (score ${a.score})`,
    left && a.lives === START_LIVES && a.hash === b.hash && a.score === b.score);
}
check('the six screens in order, one place each', SCENE_ROOMS.join() === '0,1,2,3,4,5');

// ---- 2 and 3. the show --------------------------------------------------------------------------------------------

const input = new Input(nowhere);
const renderer = new PixelRenderer();
const spec = moleyEnding(renderer, null);
const BAND = { top: CREDIT_ROW, bottom: CREDIT_ROW + 7 };
/** What is in the band now: pixels of the credits' colour, and any other that is not black. */
function band() {
  const pic = renderer.picture();
  let credit = 0, other = 0;
  for (let y = BAND.top; y <= BAND.bottom; y++) for (let x = 0; x < SURFACE_WIDTH; x++) { const c = pic[y * SURFACE_WIDTH + x]; if (c === SPECTRUM.yellow) credit++; else if ((c & 7) !== 0) other++; }
  return { credit, other };
}
// each place's reel watched: what the game's own picture has in the band before any credit goes over it
let gameBand = 0, gameFrames = 0, gameBandEmpty = true;
const watched: Place[] = spec.places.map((place) => ({
  ...place,
  open() {
    const reel = place.open();
    if (!reel) return null;
    const watch: Reel = {
      tick: () => reel.tick(),
      draw() { reel.draw(); const b = band(); gameBand += b.credit + b.other; gameBandEmpty = b.credit + b.other === 0; gameFrames++; },
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
  font: spectrumFont,
  music: { start: () => { tuneStarts++; }, end: () => { tuneEnds++; } },
  done: () => { over++; },
});
show.start(['SCORE 1234', 'HIGH SCORE 5678', 'ITEMS 20 OF 20', 'LIVES 5']);
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
    bandWatch.frame(p, place.credits, { ink: b.credit, other: b.other });
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
check('every screen of the montage in order, then THE END, no parade', phases.join() === 'loading,montage,end');
check(`it is a watchable length (${(frames / 50).toFixed(0)} seconds, about 60 to 75)`, frames >= SHOW_FRAMES.min && frames <= SHOW_FRAMES.max);
check(`each screen is as long as its credits and visitors take (${sceneFrames.join(', ')} frames), a part of its route played (never more than the route has)`, sceneFrames.every((n, i) => n > 0 && n <= Pilot.frames(ROUTES[SCENE_ROOMS[i]])));
check('the tune is begun with the show and again on the way out', tuneStarts === 1 && tuneEnds === 1);
check(`every creature of the cast was recorded (${show.cast.length}), Monty not among them (he is in every screen), and most of them move`, show.cast.length === spec.cast.length && !show.cast.some((f) => f.name === 'MONTY') && show.cast.filter((f) => f.poses.length > 1).length >= 6);
castWatch.check(show.cast);
bandWatch.check(LINES.length, gameFrames, gameBand, []);
check('every line fits the screen (at most 38 letters, upper case, in the lettering of our font)', LINES.every((l) => l.length <= CREDIT.letters && l === l.toUpperCase() && /^[A-Z0-9 ,.:!?()-]+$/.test(l)));
check('the credits are in order: the game first, the port and thanks last', LINES[0] === 'MOLEY CHRISTMAS, 1987' && PORT_CREDITS.every((l) => LINES.includes(l)) && LINES[LINES.length - 1] === 'THANKS FOR PLAYING' && bandWatch.typed.has(`${spec.places.length - 1}.${(spec.places[spec.places.length - 1]?.credits?.length ?? 0) - 1}`));
check('the port is credited to Christopher Hickman, with Claude', LINES.some((l) => l.includes('HICKMAN')) && LINES.some((l) => l.includes('CLAUDE')));
check('THE END has its title and numbers', endYellow > 100);
check('the numbers under THE END: score, high score, items, lives', endingStats(new MoleyFlow(new SeededRandom(1)), { reached: [0], done: [0] }).length === 4);

// ---- 4. skipping --------------------------------------------------------------------------------------------------
{
  const input2 = new Input(nowhere);
  let done = 0;
  const again = new RewardShow({ host: { renderer: new PixelRenderer(), input: input2, canvas: nowhere }, spec: moleyEnding(new PixelRenderer(), null), font: spectrumFont, music: { start() {}, end() {} }, done: () => { done++; } });
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
  tick(120);
  tap('Enter');
  await new Promise((r) => setTimeout(r, 0));
  for (let i = 0; i < 200 && p.state.phase !== 'play'; i++) tick();
  return { p, tick, tap, input: input3 };
}
/** Winning: the last delivery made (the game's own `finish`), the card up, and a key let go and pressed to leave it. */
function win(s: Awaited<ReturnType<typeof session>>) {
  s.p.flow.game.finish();
  for (let i = 0; i < 400 && s.p.state.phase !== 'ending'; i++) s.tick();
  const onCard = s.p.state.phase === 'ending';
  s.tick(120);
  s.tap('Space');
  for (let i = 0; i < 400 && s.p.state.phase === 'ending'; i++) s.tick();
  return onCard;
}
{
  const s = await session(new Map());
  check('ENHANCED by default, not won yet', s.p.state.enhanced && !readWon('moley'));
  const onCard = win(s);
  check('the last delivery shows the Christmas card as it was, and the win is kept', onCard && readWon('moley'));
  check('then the show, over the credits page the card goes back to', !!s.p.ending?.active);
  let n = 0;
  while (s.p.ending?.active && n++ < 9000) s.tick();
  s.tick(30);
  check(`the show ran (${n} frames) and the credits page is back`, n > 2500 && !s.p.ending?.active && s.p.state.phase === 'credits');

  // W on the pause screen once won (in a game started again)
  s.tap('Enter');
  for (let i = 0; i < 200 && s.p.state.phase !== 'play'; i++) s.tick();
  s.tap('KeyP');
  check('the pause screen is up', s.p.state.paused);
  s.tap('KeyW');
  check('W watches the ending (the flag kept above)', !!s.p.ending?.active);
  n = 0;
  while (s.p.ending?.active && n++ < 9000) s.tick();
  s.tick(30);
  check('and back at the credits page', !s.p.ending?.active && s.p.state.phase === 'credits');
}
{
  // ORIGINAL: the game as it was: the card, no show, the win kept; W not offered
  useMemoryStorage(new Map());
  const s = await session(new Map([['moley.assist', JSON.stringify({ enhanced: false })]]));
  check('ORIGINAL chosen', !s.p.state.enhanced);
  const onCard = win(s);
  s.tick(60);
  check('ORIGINAL: the card, no show after it, the win kept all the same', onCard && !s.p.ending?.active && s.p.state.phase === 'credits' && readWon('moley'));
  s.tap('Enter');
  for (let i = 0; i < 200 && s.p.state.phase !== 'play'; i++) s.tick();
  s.tap('KeyP');
  s.tap('KeyW');
  check('ORIGINAL: W on the pause screen does nothing', !s.p.ending?.active);
}
void store;
finish();
