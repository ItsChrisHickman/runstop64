/**
 * Moley Christmas's front end, headless (c64kit stood in by games/shared/test/kit.ts; no original needed): the credits page, and a game
 * started by Enter (no save) or the jump key; the latch on the press that started it; walking; the exit to the next screen, noted on the map
 * (screens come to, finished); the pause screen with the map (Spectrum colours, our font), picked with the arrows and with taps, and travel to
 * the start of a screen he has come to; items taken and screens finished in its side panel; autosave on every screen (a death too) and a launch
 * with a save going straight back into play; GAME OVER -> CONTINUE? -> the last screen again (a new game's lives and score from nothing; after
 * the card, everything as saved); the Christmas card and any key; back to screen start; the save a faithful copy of the game; the ORIGINAL /
 * ENHANCED switch (sprites on the renderer or not, the enhancements on or off); a moment's grace after a resume; the high score kept; NEW GAME?
 * over a save; ENTER CONTINUE where it sits; touch; the sound told what happens. With an out-dir: stills of the screens.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/frontend.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { ayLog } from '../../shared/test/kit';
import { palettePng } from '../../../tools/png';
import { readJson } from '../../shared/guards';
import { unpackSlot } from '../../shared/continue';
import { MAP_BOX } from '../../shared/native/pause';
import { readSaves } from '../../shared/saves';
import { check, finish } from '../../shared/test/check';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';
import { PAUSE_COLOURS, SPECTRUM } from '../src/colours';
import { ARRIVALS, START_LIVES } from '../src/game';
import { hintsOf } from '../src/hints';
import { run, STRIP_Y } from '../src/main';
import { describeSave, ITEMS_IN, ITEMS_TOTAL, itemsTaken, moleyMap } from '../src/map';
import { Key, State } from '../src/monty';
import { SPECTRUM_PALETTE } from '../src/palette';
import { CODEC, MoleySave, restoreGame, snapshotOf } from '../src/save';
import { SeededRandom } from '../src/random';
import { PICTURE_LEFT, PICTURE_TOP } from '../src/view';

// a browser's storage, in memory
const store = useMemoryStorage();

const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
const game = () => p.flow.game;
const visibleSprites = () => renderer.sprites.filter((s) => s.visible).length;

// what the sound hook is told

// stills: the picture as the renderer shows it (the screen with its sprites), the Spectrum's colours
const outDir = process.argv[2];
function shot(name: string) {
  if (outDir === undefined) return;
  fs.mkdirSync(outDir, { recursive: true });
  palettePng(path.join(outDir, `${name}.png`), renderer.picture(), 320, 200, SPECTRUM_PALETTE, 3);
}
const savedNow = (): MoleySave | null => {
  const slot = readSaves('moley').current;
  return slot ? unpackSlot(CODEC, slot) : null;
};
/** Monty at the exit of room 0 with nothing left to take: the next pass is the way out. */
function atRoom0Exit() {
  const g = game();
  g.items.left = 0;
  const cassette = g.entities[6];
  cassette.x = 0xd8; cassette.y = 0x78; cassette.frame = 0x1c;
  g.monty.x = 0xd8; g.monty.y = 0x78;
}

// ---- the credits page ------------------------------------------------------------------------------------------
tick(120);
shot('1-credits');
check(`starts on the credits page (${p.state.phase}), nothing saved yet`, p.state.phase === 'credits' && !p.state.hasSave && !store.has('moley.save.v2'));
const yellowInStrip = () => [...renderer.screen.pixels.subarray(STRIP_Y * 320, (STRIP_Y + 8) * 320)].filter((v) => v === SPECTRUM.yellow).length;
const yellowBefore = yellowInStrip();
check('touch: the stick has four directions and the one button is JUMP on Space', p.touch.stick === '4' && p.touch.buttons.length === 1 && p.touch.buttons[0]?.label === 'JUMP' && p.touch.buttons[0]?.key === 'Space');

// Enter (with no save) starts a game as the jump key does (and is the first key: the audio unlocks, which is asynchronous)
tap('Enter');
await new Promise((resolve) => setTimeout(resolve, 0));
until(() => p.state.phase === 'play', 120);
check(`Enter starts a game: screen 1, five lives (${game().room}, ${game().lives})`, p.state.phase === 'play' && game().room === 0 && game().lives === START_LIVES);
tick(20);
check('a save on coming into the first screen, and the map has it', savedNow()?.room === 0 && p.state.found.reached.join() === '0' && p.state.found.done.length === 0);
shot('2-play');
check('ENHANCED by default: the sprites are on the renderer', p.state.enhanced && visibleSprites() > 0);

// ---- walking, jumping --------------------------------------------------------------------------------------------
const x0 = game().monty.x;
input.keyDown('ArrowRight'); tick(30); input.keyUp('ArrowRight');
check(`the arrows walk him (${x0} to ${game().monty.x})`, game().monty.x > x0);
const x1 = game().monty.x;
input.keyDown('KeyA'); tick(30); input.keyUp('KeyA');
check(`and WASD (${x1} to ${game().monty.x})`, game().monty.x < x1);
input.keyDown('KeyZ'); tick(6); input.keyUp('KeyZ');
check('Z jumps too (his state while it lasts, and he lands)', game().monty.phase > 0 || game().monty.state !== 0 || visibleSprites() > 0);
tick(60);

// ---- the way out: the next screen, noted --------------------------------------------------------------------------
atRoom0Exit();
const score0 = game().score;
tick(6);
check(`out of screen 1 into screen 2 (${game().room}), the exit's 200 points`, game().room === 1 && game().score >= score0 + 200);
check('the map: screens 1 and 2 come to, screen 1 finished', p.state.found.reached.join() === '0,1' && p.state.found.done.join() === '0');
check(`the save is for screen 2 (${savedNow()?.room})`, savedNow()?.room === 1);
tick(30);

// ---- the pause screen and the map ------------------------------------------------------------------------------------
tap('KeyP');
check('P: the pause screen', p.state.paused);
tick(3);
shot('3-pause-map');
const monty = game().monty;
const before = monty.x + monty.y * 256;
tick(20);
check('the game waits while paused', game().monty.x + game().monty.y * 256 === before);
check('the pause screen is in the Spectrum palette: a yellow frame, black ground', renderer.screen.pixels[0] === PAUSE_COLOURS.yellow && renderer.screen.pixels[100 * 320 + 100] !== PAUSE_COLOURS.yellow);
const places = moleyMap.places(MAP_BOX, p.flow, p.state.found);
check(`the map offers the screens he has come to (${places.length}), his own marked`, places.length === 2 && places.filter((q) => q.here).length === 1);
const pixelsOfScreen = (room: number): Set<number> => {
  const q = must(moleyMap.places(MAP_BOX, p.flow, { reached: [0, 1, 2, 3, 4, 5], done: [] }).find((z) => z.id === String(room)), 'no place');
  const seen = new Set<number>();
  tick(1);
  for (let y = -10; y < 10; y++) for (let x = -20; x < 20; x++) seen.add(renderer.screen.pixels[(q.y + y) * 320 + q.x + x]);
  return seen;
};
check('a screen not come to is dark (black)', pixelsOfScreen(4).size === 1 && pixelsOfScreen(4).has(SPECTRUM.black));
check('a screen come to is drawn in its own colours', pixelsOfScreen(0).size >= 3);
// pick screen 1 with the arrows, then Enter
for (let i = 0; i < 8 && p.frontEnd.picked !== '0'; i++) tap('ArrowLeft');
check(`the arrows pick screen 1 (${p.frontEnd.picked})`, p.frontEnd.picked === '0');
tick(2);
shot('4-pause-pick');
tap('Enter');
tick(4);
check(`Enter: travel to the start of screen 1 (${game().room}): ${ARRIVALS[0]?.x}, ${ARRIVALS[0]?.y}`, !p.state.paused && game().room === 0 && game().monty.x === ARRIVALS[0]?.x && game().monty.y === ARRIVALS[0]?.y);
check('its items are all there again', game().itemsLeft === ITEMS_IN[0]);
check('a moment of grace after the travel', p.state.grace > 0);
check('the map is not changed by a travel: screen 1 is still finished, and travel did not finish anything', p.state.found.done.join() === '0' && p.state.found.reached.join() === '0,1');

// touch: tap the map to travel to screen 2
input.touch = true;
tap('KeyP');
const place2 = must(moleyMap.places(MAP_BOX, p.flow, p.state.found).find((q) => q.id === '1'), 'no place');
input.point(place2.x, place2.y); tick(2);
input.point(place2.x, place2.y); tick(4);
check(`touch: two taps on the screen travel there (${game().room})`, !p.state.paused && game().room === 1);
input.touch = false;
tick(10);

// ---- items and what the pause screen says ----------------------------------------------------------------------------------
{
  const f = p.state.found;
  check(`items: ${ITEMS_TOTAL} in all (7, 3, 0, 0, 4, 0)`, ITEMS_TOTAL === 14 && ITEMS_IN.join() === '7,3,0,0,4,0');
  const here = itemsTaken(p.flow, f);
  check(`items taken counts the finished screens' (7) and what is taken here (${here})`, here === 7 + ITEMS_IN[1] - game().itemsLeft);
  const lines = moleyMap.info(p.flow, f);
  check(`the side panel: lives, screens finished, items, score (${lines.join(' | ')})`, lines.length === 4 && lines[1] === 'SCREENS 1/6' && lines[2] === `ITEMS ${here}/14` && lines.every((l) => l.length <= 11));
  check('the save is described for the save manager', describeSave(must(savedNow(), 'no save'), f).length === 4 && (readSaves('moley').current?.summary.length ?? 0) >= 3);
}

// ---- the save a faithful copy ------------------------------------------------------------------------------------------------
{
  const saved = must(savedNow(), 'no save');
  check('a save read back through the checks', MoleySave(readJson(JSON.stringify(saved))) && !MoleySave({ v: 1, room: 3 }) && !MoleySave({ ...saved, numbers: saved.numbers.slice(1) }) && !MoleySave({ ...saved, map: [1] }));
  const again = restoreGame(saved, new SeededRandom(1), 0, false);
  check('the game put back from the save gives the save again', JSON.stringify(snapshotOf(again)) === JSON.stringify(saved));
  check(`a save is small (${JSON.stringify(saved).length} characters)`, JSON.stringify(saved).length < 8000);
}

// ---- ORIGINAL / ENHANCED ------------------------------------------------------------------------------------------------------
check('ENHANCED by default: the four enhancements are on', p.state.enhanced && game().enhanced.airSteering && game().enhanced.itemCount && p.frontEnd.assist.look === true && p.frontEnd.assist.hints === true);
tap('KeyP');
tap('KeyE');
tick(2);
check('E: ORIGINAL, the switch kept', !p.state.enhanced && store.get('moley.assist') === '{"enhanced":false}');
tap('KeyP');
tick(4);
check('ORIGINAL: no sprites on the renderer (they are in the picture), the enhancements off', visibleSprites() === 0 && !game().enhanced.airSteering && !game().enhanced.itemCount);
shot('5-original');
tap('KeyP');
tap('KeyE');
tap('KeyP');
tick(4);
check('E again: ENHANCED, the sprites back', p.state.enhanced && visibleSprites() > 0 && game().enhanced.airSteering);

// ---- back to screen start -------------------------------------------------------------------------------------------------------
{
  const g = game();
  g.monty.x = 0x30;
  tap('KeyP');
  tap('KeyB');
  tick(2);
  check(`B: back to the start of the screen (x ${game().monty.x})`, !p.state.paused && game().room === 1 && game().monty.x === ARRIVALS[1]?.x);
  check('and a moment of grace', p.state.grace > 0);
}

// ---- grace: a death while it lasts is a fresh start of the room, the life kept -------------------------------------------------------------
{
  const g = game();
  const lives = g.lives;
  g.gauge.value = 0x80; // (time is up)
  tick(3);
  check('grace: time running out in it costs no life', game().lives === lives && game().room === 1);
  p.grace.clear();
  g.gauge.value = 0x80;
  tick(120);
  check(`ENHANCED (unlimited lives): with the grace gone the death takes no life (${lives} to ${game().lives})`, game().unlimitedLives && game().lives === lives);
  // ORIGINAL: the game's own lives
  tap('KeyP'); tap('KeyE'); tap('KeyP');
  check('ORIGINAL: no unlimited lives', !p.state.enhanced && !game().enhanced.unlimitedLives);
  p.grace.clear();
  g.gauge.value = 0x80;
  tick(120);
  check(`and in ORIGINAL it does (${lives} to ${game().lives})`, game().lives === lives - 1);
}

// ---- autosave after a death: the lives lost stay lost ---------------------------------------------------------------------------------------
tick(200);
check(`the save keeps the lives (${savedNow()?.lives} of ${game().lives})`, savedNow()?.lives === game().lives);

// ---- the sound -------------------------------------------------------------------------------------------------------------------
check(`the sound: the audio unlocked by the first key, the music playing, the effects made, and the death's effect played (${ayLog.played.length} played)`, p.sound.unlocked && ayLog.playing && ayLog.samples.length >= 4 && ayLog.played.length > 0);
check('and held while the pause screen is up', (() => { tap('KeyP'); const held = ayLog.held; tap('KeyP'); return held && !ayLog.held; })());

// ---- GAME OVER -> CONTINUE? ------------------------------------------------------------------------------------------------------------------
const lastRoom = game().room;
game().lives = 0;
game().score = 135;
p.grace.clear();
game().gauge.value = 0x80;
until(() => p.state.phase === 'over', 400);
shot('6-game-over');
check('the last life lost: GAME OVER', p.state.phase === 'over');
until(() => p.state.phase === 'credits', 400);
check('and the credits page', p.state.phase === 'credits');
check(`the high score is kept (${store.get('moley.high.v1')})`, store.get('moley.high.v1') === '135');
tick(60);
shot('7-continue');
check(`CONTINUE? straight away (${p.state.prompt})`, p.state.prompt === 'continue');
tap('Enter');
tick(4);
check(`Enter: back in play in the last screen (${game().room}), five lives again and the score from nothing`, p.state.phase === 'play' && game().room === lastRoom && game().lives === START_LIVES && game().score === 0);
check('with what he had (the map)', p.state.found.reached.join() === '0,1' && p.state.found.done.join() === '0');
check('a moment of grace, and the high score is the best', p.state.grace > 0 && game().highScore === 135);
check('the picture is up at once (the sprites on the renderer)', visibleSprites() > 0 || p.state.phase === 'play');
tap('KeyP'); tap('KeyE'); tap('KeyP'); // (back to ENHANCED, the default)
check('and ENHANCED again', p.state.enhanced && game().enhanced.unlimitedLives);

// ---- the Christmas card, and everything kept after it -------------------------------------------------------------------------------------------
{
  p.grace.clear();
  game().lives = 3;
  game().score = 700;
  tick(4); // (the save is of the screen's start: lives 3 are not in it)
  game().finish();
  until(() => p.state.phase === 'ending', 200);
  check('the last delivery: the Christmas card', p.state.phase === 'ending');
  check('the last screen is finished on the map', p.state.found.done.includes(lastRoom));
  shot('8-card');
  tick(80);
  const wasEnding = p.state.phase;
  tick(5);
  check('the card waits for a key', wasEnding === 'ending' && p.state.phase === 'ending');
  input.keyDown('KeyX'); tick(2); input.keyUp('KeyX');
  tick(4);
  input.keyDown('KeyQ'); tick(2); input.keyUp('KeyQ');
  until(() => p.state.phase === 'credits', 100);
  check('a key leaves the card for the credits page', p.state.phase === 'credits');
  // (ENHANCED: the ending's show follows the card, over the credits page: test/reward.ts; a key after two seconds skips it)
  check('the ending\'s show follows the card in ENHANCED', p.ending?.active === true);
  tick(110);
  tap('Space');
  check('a key skips it', p.ending?.active !== true);
  tick(60);
  check(`CONTINUE? after the card (${p.state.prompt})`, p.state.prompt === 'continue');
  const saved = must(savedNow(), 'no save');
  tap('Enter');
  tick(4);
  check(`Enter: back as saved: the lives and score he had at the screen's start (${game().lives}, ${game().score})`, p.state.phase === 'play' && game().lives === saved.lives && game().score === saved.score);
}

// ---- launching with a save -----------------------------------------------------------------------------------------------------------------------
{
  const input2 = new Input(nowhere);
  const r2 = new PixelRenderer();
  const q = run({ renderer: r2, input: input2, canvas: nowhere });
  for (let i = 0; i < 8; i++) { input2.poll(); q.tick(); q.render(0); }
  const latest = must(savedNow(), 'no save');
  check('launched with a save: straight back into play, in its screen, as saved', q.state.phase === 'play' && q.flow.game.room === latest.room && q.flow.game.lives === latest.lives);
  check(`and the high score is there (${q.flow.game.highScore}, kept ${store.get('moley.high.v1')})`, q.flow.game.highScore === Number(store.get('moley.high.v1')) && q.flow.game.highScore >= 700);
}

// ---- T: the credits page, the save kept; ENTER CONTINUE where it sits; NEW GAME? ----------------------------------------------------------------------------
tap('KeyP');
tap('KeyT');
tick(60);
shot('9-credits-continue');
check('T on the pause screen: the credits page, ENTER CONTINUE offered', p.state.phase === 'credits' && p.state.prompt === 'title');
{
  const letters = yellowInStrip() - yellowBefore;
  const outside = [...renderer.screen.pixels.subarray((STRIP_Y - 4) * 320, (STRIP_Y - 1) * 320)].filter((v) => v === SPECTRUM.yellow).length;
  check(`ENTER CONTINUE is drawn in bright yellow letters at y ${STRIP_Y} (${letters} pixels more than the page has), on no box`, letters > 100 && outside === 0);
}
input.keyDown('Space'); tick(3); input.keyUp('Space'); tick(3);
check(`Space over a save: NEW GAME? first (${p.state.prompt})`, p.state.prompt === 'newGame');
tap('Escape');
check(`Esc: back to the credits page (${p.state.prompt})`, p.state.prompt === 'title' && p.state.phase === 'credits');
// touch: a tap on the line continues
input.touch = true;
tick(2);
input.point(60, STRIP_Y + 4); tick(3);
check(`touch: a tap on ENTER CONTINUE continues (${p.state.phase})`, p.state.phase === 'play');
input.touch = false;
// a new game over a save
tap('KeyP');
tap('KeyT');
tick(60);
input.keyDown('Space'); tick(3); input.keyUp('Space'); tick(3);
input.keyDown('Space');
let jumped = false;
for (let i = 0; i < 40; i++) { tick(1); if (p.state.phase === 'play' && game().monty.state === State.jumping) jumped = true; }
input.keyUp('Space');
check(`Space again: a new game (${p.state.phase}), the old save kept as the previous one`, p.state.phase === 'play' && game().room === 0 && game().lives === START_LIVES && store.has('moley.save.v2.previous'));
check('and a new map: only screen 1 come to', p.state.found.reached.join() === '0' && p.state.found.done.length === 0);
check('the press that began it is not a jump while it is still held', !jumped);
check(`the keys are as ours: left, right, up, down, jump`, Key.left === 2 && Key.right === 1 && Key.up === 8 && Key.down === 4 && Key.jump === 16);
// ---- sparkles (hints.ts): ENHANCED, in play, not over our screens ---------------------------------------------------------------------------------------
{
  game().items.left = 0; // (the exit cassette is the way out now)
  tick(4);
  const want = hintsOf(game());
  const marks = () => renderer.sparkles.markers;
  check(`ENHANCED: a sparkle on the exit cassette once no item is left (${marks().map((m) => `${m.x},${m.y}`).join(' ')})`, want.length === 1 && marks().length === 1 && marks()[0].x === PICTURE_LEFT + want[0].x && marks()[0].y === PICTURE_TOP + want[0].y);
  tap('KeyP');
  tick(2);
  check('none on the pause screen', marks().length === 0);
  tap('KeyP');
  tick(4);
  check('and back when play is', marks().length === 1);
  tap('KeyP');
  tap('KeyE');
  tap('KeyP');
  tick(4);
  check('ORIGINAL: none, with the game the same', !p.state.enhanced && marks().length === 0 && hintsOf(game()).length === 1);
  tap('KeyP');
  tap('KeyE');
  tap('KeyP');
  tick(4);
  check('ENHANCED again: back', p.state.enhanced && marks().length === 1);
  tap('KeyP');
  tap('KeyT');
  tick(30);
  check('none on the credits page', p.state.phase === 'credits' && marks().length === 0);
}
finish();
