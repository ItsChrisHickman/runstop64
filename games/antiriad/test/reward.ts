/**
 * The reward for winning (ENHANCED: src/ending.ts on shared/ending/show.ts; the game's own ending is test/centre.ts and won.ts),
 * headless, with the real game under it:
 *
 *  1. every place of the montage does what it says, in the game's own engine driven by the pilot's input (pilot.ts), in the
 *     frames the place runs, Tal never out of life, the same each time;
 *  2. the whole show runs from the first frame to THE END and calls `done`: the tune stepped every frame and put back on the way
 *     out, every figure of the cast recorded (the creatures' frames; Tal is in every place, not among them) walking through the montage, each named in the credits' row
 *     in turn on pixels the game leaves empty, no parade, about a minute and a quarter, THE END and its numbers;
 *  3. the credits: the row between the playfield and the panel is empty in the game's own picture in every frame of every place
 *     (sprites included), every line types on there letter by letter in yellow, is held, and goes, and the port's lines are last;
 *  4. a key skips it, after two seconds and not before;
 *  5. in the session: winning in ENHANCED runs it from the ending's fire (the title and ENTER CONTINUE after it, the save kept) and
 *     keeps that the game has been won; ORIGINAL has none (the win is kept all the same); W on the pause screen once won
 *     (ENHANCED only) runs it and ends on the title; `?ending` on the page runs it at once.
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/reward.ts [out-dir]
 *
 * With an out-dir: PNG frames of each place, of each name in turn and of THE END, and the cast on a sheet.
 */
import fs from 'node:fs';
import path from 'node:path';
import { BitmapFont, Input, KIT_GLYPHS, PixelRenderer, Surface, TRANSPARENT, decodeSprite } from 'c64kit';
import { MACHINE_CODEC } from '../../shared/continue';
import { CREDIT, PORT_CREDITS, readWon } from '../../shared/ending/credits';
import { RewardShow, type Place, type Reel } from '../../shared/ending/show';
import { toBase64, writeCurrent } from '../../shared/saves';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { BandWatch, CastWatch, SHOW_FRAMES, drawVisitors } from '../../shared/test/ending-kit';
import { must } from '../../shared/test/must';
import { indicesToRgb, renderPixels, rgbPng } from '../../../tools/probe/render';
import { CREDIT_ROW, SceneReel, antiriadEnding, endingStats } from '../src/ending';
import { CAST } from '../src/ending-cast';
import { SCENES } from '../src/ending-scenes';
import { Game } from '../src/game';
import { run } from '../src/main';
import { Bases } from '../src/stage';
import { V } from '../src/vars';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
const MINE_SET_OFF = 0xb1;
const store = useMemoryStorage();
const hex = (n: number) => `$${n.toString(16)}`;
const png = (name: string, px: Uint8Array) => { if (out) rgbPng(path.join(out, name), indicesToRgb(px), 320, 200, 2); };

// ---- 1. the places, played as the show plays them --------------------------------------------------------------------

const bases = new Bases();
const renderer = new PixelRenderer();
renderer.frame = { x: 32, y: 36 };

/** A place played to its end: when what it says was done, whether Tal was ever out of life, the rooms, and where it ended. */
function playPlace(index: number) {
  const scene = SCENES[index];
  const reel = new SceneReel(renderer, bases, scene);
  let doneAt = -1, dead = 0;
  const rooms = new Set<number>();
  for (let f = 0; f < scene.frames; f++) {
    reel.tick();
    rooms.add(reel.g.ram[V.room]);
    if (doneAt < 0 && scene.done(reel.g)) doneAt = f;
    if (!reel.g.ram[V.life]) dead++;
  }
  const end = `${reel.g.ram[V.room]}:${reel.g.ram[0x0200]}:${reel.g.ram[0x0201]}:${reel.g.ram[0x0697]}:${reel.g.ram[V.anim]}`;
  reel.dispose();
  return { doneAt, dead, rooms, end };
}

SCENES.forEach((scene, i) => {
  const r = playPlace(i);
  check(`place ${i}, ${scene.name}: done at frame ${r.doneAt} of ${scene.frames} (rooms ${[...r.rooms].map(hex).join(' ')}), Tal never out of life`, r.doneAt >= 0 && r.doneAt <= scene.frames - 20 && r.dead === 0);
});
// (the same each time: the places are made of the game's frames and the pilot's input, nothing random)
check('the places are the same each time they are played', [0, 3, SCENES.length - 1].every((i) => playPlace(i).end === playPlace(i).end));
check('the montage has 8 to 12 places', SCENES.length >= 8 && SCENES.length <= 12);

// ---- 2 and 3. the show, from the first frame to THE END -----------------------------------------------------------------

const input = new Input(nowhere);
const spec = antiriadEnding(renderer);
const font = new BitmapFont().addDrawn(KIT_GLYPHS);
/** The row between the playfield and the panel: eight pixels. */
const BAND = { top: CREDIT_ROW, bottom: CREDIT_ROW + 7 };
/**
 * What the game's own picture has in the band: the pixels its characters (row 16, as the panel's charset has them) and its sprites
 * draw there, apart from the background (nothing else is the game's to draw). Exact, and far quicker than the whole picture (the
 * sampled frames below check it against that).
 */
let reelNow: SceneReel | null = null;
/** The place running now, if one is (a function, so what the watched reels set is seen). */
const current = () => reelNow;
const flat = new Surface(48, 42, TRANSPARENT);
function bandOfGame(g: Game) {
  const { rows, sprites } = g.m.capture;
  const row = rows[16];
  let n = 0;
  if (row) {
    const charset = row.bank + ((row.d018 >> 1) & 7) * 0x800;
    for (let c = 0; c < 40; c++) for (let l = 0; l < 8; l++) if (g.ram[charset + row.codes[c] * 8 + l]) n++;
  }
  for (const s of sprites) {
    const h = s.expandY ? 42 : 21, top = s.y - 50;
    if (top + h <= BAND.top || top > BAND.bottom) continue;
    flat.pixels.fill(TRANSPARENT);
    decodeSprite(s.data, s.colour, s.multicolour, s.mc1, s.mc2, s.expandX, s.expandY, flat);
    for (let y = Math.max(BAND.top, top); y <= Math.min(BAND.bottom, top + h - 1); y++) for (let x = 0; x < (s.expandX ? 48 : 24); x++) if (flat.pixels[(y - top) * flat.width + x] !== TRANSPARENT) n++;
  }
  return n;
}
/** The same by the whole picture (what is there that is not the background colour). */
function bandOfPicture(g: Game) {
  const px = renderPixels(g.m);
  const bg = g.m.capture.rows[16]?.bg[0] ?? 0;
  let n = 0;
  for (let y = BAND.top; y <= BAND.bottom; y++) for (let x = 0; x < 320; x++) if (px[y * 320 + x] !== (bg & 15)) n++;
  return n;
}
function bandOfShow() {
  let yellow = 0, other = 0;
  for (let y = BAND.top; y <= BAND.bottom; y++) for (let x = 0; x < 320; x++) {
    const c = renderer.screen.pixels[y * 320 + x];
    if (c === CREDIT.colour) yellow++; else if (c !== TRANSPARENT) other++;
  }
  return { yellow, other };
}

// each place's reel watched: what the game's own picture has in the band before any credit goes over it
let gameBand = 0, gameFrames = 0, disagree = 0, gameBandEmpty = true;
const badPlaces = new Map<number, number>();
const watched: Place[] = spec.places.map((place) => ({
  ...place,
  open() {
    const reel = place.open();
    if (!(reel instanceof SceneReel)) return null;
    const watch: Reel = {
      tick: () => reel.tick(),
      draw() {
        reel.draw();
        reelNow = reel;
        const n = bandOfGame(reel.g);
        gameBand += n;
        gameBandEmpty = n === 0;
        gameFrames++;
        // (every so often by the whole picture too: the quick way and the slow agree)
        // (not while the game's ending flashes the screen: its background is no longer the band's black, and no line is typed then)
        if (gameFrames % 60 === 0 && (reel.g.m.capture.rows[16]?.bg[0] ?? 0) === 0 && bandOfPicture(reel.g) !== n) disagree++;
        if (n > 0 && !badPlaces.has(show.progress.place)) badPlaces.set(show.progress.place, gameFrames);
      },
      render: (a) => reel.render(a),
      dispose: () => reel.dispose(),
    };
    return watch;
  },
}));

let tuneStarts = 0, tuneEnds = 0, tuneFrames = 0, over = 0;
const show = new RewardShow({
  host: { renderer, input, canvas: nowhere },
  spec: { ...spec, places: watched },
  font: () => font,
  music: { start: () => { tuneStarts++; }, frame: () => { tuneFrames++; }, end: () => { tuneEnds++; } },
  done: () => { over++; },
});
const stats = endingStats(new Game(), { rooms: [], entry: {}, suitEntry: {} });
show.start(stats);
let frames = 0;
const phases: string[] = [];
let lastPlace = -1, placesSeen = 0;
const bandWatch = new BandWatch(), castWatch = new CastWatch();
let endFrames = 0, endYellow = 0;
let flashed = 0, visitedLast = 0;
const sceneFrames: number[] = [];
const t0 = Date.now();
while (show.active && frames < 20000) {
  input.poll();
  show.tick();
  show.render(0);
  frames++;
  const p = show.progress;
  if (phases[phases.length - 1] !== p.phase) phases.push(p.phase);
  if (p.phase === 'montage') {
    if (p.place !== lastPlace) { lastPlace = p.place; placesSeen++; }
    sceneFrames[p.place] = p.frames;
    const place = spec.places[p.place];
    // (the tick that moves on to a place draws nothing of it yet)
    if (p.frames === 0) continue;
    const b = bandOfShow();
    // (the game's ending flashes the whole screen: nothing is typed over a background that is not black)
    if ((current()?.g.m.capture.rows[16]?.bg[0] ?? 0) !== 0 && b.yellow > 0) flashed++;
    bandWatch.frame(p, place.credits, { ink: b.yellow, other: b.other });
    castWatch.frame(p, BAND, () => gameBandEmpty);
    if (p.place === spec.places.length - 1 && p.visitors.length > 0) visitedLast++;
    if (out && [60, 200, 400, 600].includes(p.frames)) png(`place-${p.place}-f${p.frames}.png`, compose());
    if (out && p.said?.kind === 'name' && !castWatch.pictured.has(p.said.text)) { castWatch.pictured.add(p.said.text); png(`name-${p.said.text.toLowerCase().replace(/\W+/g, '-')}.png`, compose()); }
  } else if (p.phase === 'end') {
    endFrames++;
    const pic = renderer.picture();
    if (endFrames === 5) {
      for (let y = 50; y < 66; y++) for (let x = 0; x < 320; x++) if (pic[y * 320 + x] === 7) endYellow++;
      png('the-end.png', pic);
    }
  }
}
console.log(`  the show took ${Date.now() - t0} ms for ${frames} frames (${(frames / 50).toFixed(0)} s); scenes ${sceneFrames.join(' ')}`);

/** The picture of the place running now: the game's, with the credits and the visitors over it. */
function compose() {
  const px = renderPixels(must(current(), 'a place running').g.m);
  renderer.screen.pixels.forEach((c, i) => { if (c !== TRANSPARENT) px[i] = c; });
  drawVisitors(renderer, px);
  return px;
}

const progress = show.progress;
check(`the show ran through its phases (${phases.join(', ')}) in ${frames} frames (${(frames / 50).toFixed(0)} s) and is over: the montage and THE END, no parade`, phases.join() === 'loading,montage,end' && !show.active && over === 1);
check(`it is a watchable length (${(frames / 50).toFixed(0)} seconds, about 60 to 75)`, frames >= SHOW_FRAMES.min && frames <= SHOW_FRAMES.max);
check(`the tune began with it, was stepped every frame (${tuneFrames}) and was put back as it left (${tuneStarts} start, ${tuneEnds} end)`, tuneStarts === 1 && tuneEnds === 1 && tuneFrames === frames);
check(`every place of the montage was shown (${placesSeen} of ${spec.places.length})`, placesSeen === spec.places.length);

const figures = progress.figures;
check(`the cast: ${CAST.length} creatures and things, each with frames, in order (${figures.length} recorded), Tal not among them (he is in every place)`, figures.length === CAST.length && CAST.every((c, i) => figures[i]?.name === c.name && figures[i].poses >= 1) && !figures.some((f) => f.name === 'TAL'));
check(`the creatures move (${figures.filter((f) => f.poses >= 4).length} of them have 4 frames or more)`, figures.filter((f) => f.poses >= 4).length >= 10);
castWatch.check(figures);
check(`THE END is on the picture in yellow (${endYellow} pixels), with the numbers: ${stats.join(' / ')}`, endYellow > 100 && stats.length === 4);

const lines = spec.places.flatMap((p) => p.credits ?? []);
bandWatch.check(lines.filter((l) => l !== '').length, gameFrames, gameBand + disagree, [...badPlaces.keys()].map((n) => `place ${n} from frame ${badPlaces.get(n)}`));
const bad = lines.filter((l) => l.length > CREDIT.letters || [...l].some((c) => c !== ' ' && !font.glyph(c)));
check(`lines are at most ${CREDIT.letters} letters, in the font the show draws them in${bad.length ? ` (not: ${bad.join(' / ')})` : ''}`, bad.length === 0);
check(`no line is typed over the ending's flashing screen (${flashed} frames)`, flashed === 0);
check('the port is credited last, as PORT_CREDITS has it', PORT_CREDITS.every((l, i) => lines[lines.length - PORT_CREDITS.length + i] === l) && bandWatch.typed.has(`${spec.places.length - 1}.${(spec.places[spec.places.length - 1]?.credits?.length ?? 0) - 1}`));
check(`the last place, the game's own ending, has no visitors walking through it (${visitedLast} frames with one)`, visitedLast === 0);
// each place shows what the credits near it say? the makers come first, the facts after, the port last
check('the makers come first (the title and Palace Software on the first place)', spec.places[0].credits?.[0] === 'THE SACRED ARMOUR OF ANTIRIAD' && lines.slice(0, 8).some((l) => l.includes('SCHEMBRI')) && lines.slice(0, 8).some((l) => l.includes('MALONE')) && lines.slice(0, 8).some((l) => l.includes('JOSEPH')));

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

// ---- the tune ---------------------------------------------------------------------------------------------------------------

{
  // (main.ts: a game of its own left on its title, its sound writes going into the player: the title sequence's own tunes)
  const tune = new Game();
  let writes = 0;
  for (let f = 0; f < 300; f++) { tune.m.joy1 = tune.m.joy2 = 0x1f; tune.tick(); writes += tune.m.sidWrites.length; }
  check(`the tune: a game of its own left on its title plays the game's own music (${writes} writes to the SID in 6 seconds)`, writes > 300);
}

// ---- 5. in the session ----------------------------------------------------------------------------------------------------------

/** The game launched into play in the armour (the snapshot of the original), ENHANCED or not, with a store of its own. */
function boot(enhanced: boolean) {
  store.clear();
  store.set('antiriad.assist', JSON.stringify({ enhanced }));
  writeCurrent('antiriad', { format: MACHINE_CODEC.format, data: toBase64(new Uint8Array(fs.readFileSync('games/antiriad/test/armour.state'))), at: 0, summary: [], rooms: 5 });
  const inp = new Input(nowhere), rend = new PixelRenderer(), p = run({ renderer: rend, input: inp, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { inp.poll(); p.tick(); p.render(0); } };
  const press = (code: string) => { inp.keyDown(code); tick(3); inp.keyUp(code); tick(2); };
  const hold = (keys: string[], n: number, until: () => boolean = () => false) => {
    for (const k of keys) inp.keyDown(k);
    let ok = false;
    for (let i = 0; i < n && !ok; i++) { tick(); ok = until(); }
    for (const k of keys) inp.keyUp(k);
    return ok;
  };
  return { p, g: () => p.game, tick, press, hold, rend };
}
type Session = ReturnType<typeof boot>;

/** Win the game: in the power centre with the Implosion Mine, landed on the pedestal, the ending played out, fire. */
function win(s: Session) {
  const { g, hold, tick } = s;
  hold([], 100, () => g().playing);
  hold([], 600, () => g().ram[0x92] >= 0x20 && g().ram[V.suitEnergy] >= 0x1f);
  for (const at of [0x067e, 0x067f, 0x0680, 0x0681]) g().ram[at] = 0x80;
  g().travelTo = { room: 0, x: 168, y: 64, high: 0 };
  hold([], 60, () => g().ram[V.room] === 0 && !(g().ram[V.roomChange] & 0x80) && !g().travelTo);
  tick(5);
  for (let tries = 0; tries < 8 && !(g().ram[MINE_SET_OFF] & 0x80); tries++) {
    hold(['ArrowUp'], 40 + tries * 3, () => g().ram[0x0201] < 72 - tries);
    hold([], 9);
    hold(['ArrowDown'], 80, () => g().ram[V.anim] === 0xb2);
    hold([], 10);
  }
  const set = !!(g().ram[MINE_SET_OFF] & 0x80);
  hold([], 3000, () => !g().playing);
  hold([], 1500, () => g().ram[V.message] === 0x95);
  return set;
}

{
  const s = boot(true);
  const { p, g, tick, press, hold } = s;
  const set = win(s);
  const ending = must(p.ending, 'the ending');
  check('ENHANCED: the mine is set off and the game\'s own ending plays (the game\'s, not ours: no show yet)', set && !ending.active);
  check('ENHANCED: the win is kept, apart from the saves', readWon('antiriad') && store.has('antiriad.won') && !store.has('antiriad.save.v2.won'));
  hold(['Space'], 600, () => ending.active);
  check('ENHANCED: fire at the ending: the show begins, over the title', ending.active);
  tick(10);
  check('ENHANCED: it is running (the montage on games of its own, the player\'s game untouched on the title)', ending.progress.phase !== 'loading' && !g().playing);
  tick(110);
  press('Space');
  tick(40);
  check('ENHANCED: a key skips it: the title, ENTER CONTINUE as after any ending', !ending.active && p.state.prompt === 'title' && g().onTitle);
  press('Enter');
  tick(5);
  check('ENHANCED: ENTER CONTINUE: back in play (New Game+)', g().playing && g().plus);
  // W on the pause screen, once won
  press('KeyP');
  check('ENHANCED, won: the pause screen is up', p.state.paused);
  press('KeyW');
  check('ENHANCED: W starts it', ending.active);
  tick(120);
  press('Space');
  tick(40);
  check('ENHANCED: after it, the title with ENTER CONTINUE', !ending.active && g().onTitle && p.state.prompt === 'title');
}

{
  const s = boot(false);
  const { p, g, press, hold, tick } = s;
  const set = win(s);
  const ending = must(p.ending, 'the ending');
  hold(['Space'], 600, () => g().onTitle);
  tick(150);
  check('ORIGINAL: the game is won, and kept so, with no ending of ours (the title, ENTER CONTINUE)', set && readWon('antiriad') && !ending.active && p.state.prompt === 'title');
  press('Enter');
  tick(5);
  press('KeyP');
  press('KeyW');
  check('ORIGINAL: W on the pause screen does nothing', !ending.active && p.state.paused);
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
  check('?ending: a key ends it on the title', !ending.active && p.game.onTitle);
  Reflect.deleteProperty(globalThis, 'location');
}

finish();
console.log('all passed');
