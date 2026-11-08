/**
 * Wanted: Monty Mole's front end, headless (c64kit stood in by games/shared/test/kit.ts; no original needed): the title and the options (our keys), a game started by the
 * jump key; the opening scene, the gift and the way out into room 0; walking; the pause screen with the map of the 21 rooms (Spectrum colours, our font), picked with the
 * arrows, and travel to a room he has come to; autosave on every room and a launch with a save (the title, ENTER CONTINUE, Enter goes back into play); game over, CONTINUE?
 * and the room again; back to room start; the ORIGINAL / ENHANCED switch (sprites on the renderer or not, unlimited lives, no deaths from falls); a moment's grace after a
 * resume; NEW GAME? over a save; ENTER CONTINUE where it sits; touch; the sound told what happens. With an out-dir: stills of the screens.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/frontend.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { palettePng } from '../../../tools/png';
import { unpackSlot } from '../../shared/continue';
import { MAP_BOX } from '../../shared/native/pause';
import { readSaves } from '../../shared/saves';
import { check, finish } from '../../shared/test/check';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { ayLog } from '../../shared/test/kit';
import { must } from '../../shared/test/must';
import { PAUSE_COLOURS, PICTURE_TOP, SPECTRUM, SPECTRUM_PALETTE } from '../../shared/spectrum';
import { Key } from '../src/controls';
import { START_LIVES } from '../src/game';
import { run, STRIP_Y } from '../src/main';
import { arrivalOf, montyMap } from '../src/map';
import { CODEC, type MontySave } from '../src/save';

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

const outDir = process.argv[2];
function shot(name: string) {
  if (outDir === undefined) return;
  fs.mkdirSync(outDir, { recursive: true });
  palettePng(path.join(outDir, `${name}.png`), renderer.picture(), 320, 200, SPECTRUM_PALETTE, 3);
}
const savedNow = (): MontySave | null => {
  const slot = readSaves('montymole').current;
  return slot ? unpackSlot(CODEC, slot) : null;
};
/** Monty put somewhere else with his old picture taken off the screen (left there it would be a touch: it differs from the picture). */
function teleport(x: number, y: number): void {
  const g = game();
  g.field.screen.set(g.field.picture);
  g.monty.x = x; g.monty.y = y;
}
/** Monty falling a long way (a fatal landing in the original's rule) from a place in the room. */
function fallFar(): void {
  teleport(0x30, 0x60);
  const m = game().monty;
  m.flags = 1; m.flags2 = 0x80; m.fallen = 40;
}
// ---- the title and the options ------------------------------------------------------------------------------------
tick(60);
shot('1-title');
check(`starts on the title (${p.state.phase}), nothing saved yet`, p.state.phase === 'title' && !p.state.hasSave && !store.has('montymole.save.v2'));
check('touch: the stick has four directions and the one button is JUMP on Space', p.touch.stick === '4' && p.touch.buttons.length === 1 && p.touch.buttons[0]?.label === 'JUMP' && p.touch.buttons[0]?.key === 'Space');
tap('Space');
await new Promise((resolve) => setTimeout(resolve, 0));
until(() => p.state.phase === 'options', 20);
check(`Space on the title: the options (${p.state.phase})`, p.state.phase === 'options');
tick(3);
shot('2-options');

// ---- a game: the opening scene ---------------------------------------------------------------------------------
tap('Space');
until(() => p.state.phase === 'play', 20);
check(`the jump key starts a game: the opening scene, three lives (${game().room}, ${game().lives})`, p.state.phase === 'play' && game().room === 0x2c && game().lives === START_LIVES);
check('the scene is no room: nothing saved', savedNow() === null);
tick(20);
shot('3-opening');
check('ENHANCED by default: Monty is a sprite on the renderer', p.state.enhanced && visibleSprites() > 0);
const x0 = game().monty.x;
input.keyDown('ArrowLeft'); tick(8); input.keyUp('ArrowLeft');
check(`the arrows walk him (${x0} to ${game().monty.x})`, game().monty.x < x0);
teleport(0x42, game().monty.y);
input.keyDown('ArrowLeft'); tick(4); input.keyUp('ArrowLeft');
check(`past the pot (x $40) the gift: all 64 pieces of coal are there (${game().coal.flags.filter((f) => (f & 0x80) !== 0).length})`, game().coal.flags.every((f) => (f & 0x80) !== 0) && game().opening.potWaits === 0);
game().place(0, 0x18, 0x27); // (the way out at x $E0 into room 0 is proved against the original: test/opening.ts)
tick(6);
check('a save on coming into room 0, and the map has it', savedNow()?.room === 0 && p.state.found.reached.join() === '0');
shot('4-room0');

// ---- the pause screen and the map ------------------------------------------------------------------------------------
tap('KeyP');
check('P: the pause screen', p.state.paused);
tick(3);
shot('5-pause-map');
const m = game().monty;
const before = m.x + m.y * 256;
tick(20);
check('the game waits while paused', game().monty.x + game().monty.y * 256 === before);
check('the pause screen is in the Spectrum palette: a yellow frame, black ground', renderer.screen.pixels[0] === PAUSE_COLOURS.yellow && renderer.screen.pixels[100 * 320 + 100] !== PAUSE_COLOURS.yellow);
const places = montyMap.places(MAP_BOX, p.flow, p.state.found);
check(`the map offers the rooms he has come to (${places.length}), his own marked`, places.length === 1 && places.filter((q) => q.here).length === 1);
tap('KeyP');
check('P closes it', !p.state.paused);

// ---- leaving room 0 (down), a save for room 1, travel back to room 0 ---------------------------------------------
teleport(game().monty.x, 0x1e);
until(() => game().room === 1, 30);
check(`out of the bottom of room 0 into room 1 (${game().room})`, game().room === 1);
check(`the save is for room 1 (${savedNow()?.room}), the map has both rooms`, savedNow()?.room === 1 && p.state.found.reached.join() === '0,1');
tick(10);
tap('KeyP');
tick(3);
for (let i = 0; i < 8 && p.frontEnd.picked !== '0'; i++) tap('ArrowUp');
check(`the arrows pick room 1 (${p.frontEnd.picked})`, p.frontEnd.picked === '0');
tick(2);
shot('6-pause-pick');
tap('Enter');
tick(4);
const arrival0 = must(arrivalOf(p.state.found, 0), 'no arrival');
check(`Enter: travel to room 1, where he came into it (${game().room}, ${game().monty.x}, ${game().monty.y})`, !p.state.paused && game().room === 0 && game().monty.x === arrival0.x);
check('a moment of grace after the travel', p.state.grace > 0);
check('the map is not changed by a travel', p.state.found.reached.join() === '0,1');

// ---- ORIGINAL / ENHANCED ---------------------------------------------------------------------------------------------------
check('ENHANCED by default: unlimited lives, no deaths from falls, no clash', p.state.enhanced && game().unlimitedLives && game().monty.safeFalls && p.frontEnd.assist.look === true);
tap('KeyP');
tap('KeyE');
tick(2);
check('E: ORIGINAL, the switch kept', !p.state.enhanced && store.get('montymole.assist') === '{"enhanced":false}');
tap('KeyP');
tick(4);
check('ORIGINAL: no sprites on the renderer (they are in the picture), the enhancements off', visibleSprites() === 0 && !game().unlimitedLives && !game().monty.safeFalls);
shot('7-original');
tap('KeyP');
tap('KeyE');
tap('KeyP');
tick(4);
check('E again: ENHANCED, the sprites back', p.state.enhanced && visibleSprites() > 0 && game().unlimitedLives);

// ---- back to room start ----------------------------------------------------------------------------------------------------
{
  teleport(0x80, game().monty.y);
  tap('KeyP');
  tap('KeyB');
  tick(2);
  check(`B: back to the start of the room (x ${game().monty.x})`, !p.state.paused && game().room === 0 && game().monty.x === arrival0.x);
  check('and a moment of grace', p.state.grace > 0);
}

// ---- grace, and the death in ENHANCED and in ORIGINAL ---------------------------------------------------------------------
{
  const lives = game().lives;
  fallFar();
  tick(60);
  check(`grace: a fatal landing in it costs no life (${lives} to ${game().lives})`, game().lives === lives);
  p.grace.clear();
  fallFar();
  tick(60);
  check(`ENHANCED: a long fall is no death and no life is lost (${lives} to ${game().lives})`, game().lives === lives);
  tap('KeyP'); tap('KeyE'); tap('KeyP');
  check('ORIGINAL: no unlimited lives, falls kill', !p.state.enhanced && !game().unlimitedLives && !game().monty.safeFalls);
  p.grace.clear();
  fallFar();
  until(() => game().lives < lives, 400);
  check(`and in ORIGINAL the fall is a death and takes a life (${lives} to ${game().lives})`, game().lives === lives - 1);
  tap('KeyP'); tap('KeyE'); tap('KeyP'); // (back to ENHANCED, the default)
  check('and ENHANCED again', p.state.enhanced && game().unlimitedLives);
}

// ---- autosave after a death: the lives lost stay lost ------------------------------------------------------------------------------------
until(() => !p.frontEnd.paused && game().entries > 0, 600);
tick(400);
check(`the save keeps the lives (${savedNow()?.lives} of ${game().lives})`, savedNow()?.lives === game().lives);

// ---- the sound -------------------------------------------------------------------------------------------------------------------------
check(`the sound: the audio unlocked by the first key, the tunes made (${ayLog.samples.length} samples), the title tune played (${ayLog.played.length} played)`, p.sound.unlocked && ayLog.samples.length >= 2 && ayLog.played.length > 0);
check('and held while the pause screen is up', (() => { tap('KeyP'); const held = ayLog.held; tap('KeyP'); return held && !ayLog.held; })());

// ---- game over -> CONTINUE? ---------------------------------------------------------------------------------------------------------------
tap('KeyP'); tap('KeyE'); tap('KeyP'); // ORIGINAL: the lives are real
const lastRoom = game().room;
game().lives = 1;
game().score.digits[0] = 5;
p.grace.clear();
fallFar();
until(() => p.state.phase === 'over', 800);
shot('8-game-over');
check('the last life lost: GAME OVER', p.state.phase === 'over');
until(() => p.state.phase === 'title', 1200);
check('and the title', p.state.phase === 'title');
check(`the high score is kept (${store.get('montymole.high.v1')})`, Number(store.get('montymole.high.v1')) >= 5);
tick(60);
shot('9-continue');
check(`CONTINUE? straight away (${p.state.prompt})`, p.state.prompt === 'continue');
tap('Enter');
tick(4);
check(`Enter: back in play in the last room (${game().room}), three lives again`, p.state.phase === 'play' && game().room === lastRoom && game().lives === START_LIVES);
check('with what he had (the map)', p.state.found.reached.join() === '0,1');
check('a moment of grace', p.state.grace > 0);
tap('KeyP'); tap('KeyE'); tap('KeyP'); // (ENHANCED, the default)

// ---- launching with a save ---------------------------------------------------------------------------------------------------------------------
{
  const input2 = new Input(nowhere);
  const r2 = new PixelRenderer();
  const q = run({ renderer: r2, input: input2, canvas: nowhere });
  const tick2 = (n: number) => { for (let i = 0; i < n; i++) { input2.poll(); q.tick(); q.render(0); } };
  tick2(60);
  const latest = must(savedNow(), 'no save');
  check('launched with a save: the title with ENTER CONTINUE, not play', q.state.phase === 'title' && q.state.prompt === 'title');
  input2.keyDown('Enter'); tick2(2); input2.keyUp('Enter'); tick2(4);
  check('Enter: back in play, in its room, as saved', q.state.phase === 'play' && q.flow.game.room === latest.room && q.flow.game.lives === latest.lives);
  check('and the grace begins on that continue', q.state.grace > 0);
}

// ---- T: the title, the save kept; ENTER CONTINUE where it sits; NEW GAME? -----------------------------------------------------------------------------
tap('KeyP');
tap('KeyT');
tick(60);
shot('10-title-continue');
check('T on the pause screen: the title, ENTER CONTINUE offered', p.state.phase === 'title' && p.state.prompt === 'title');
{
  let letters = 0;
  for (let y = STRIP_Y; y < STRIP_Y + 8; y++) letters += [...renderer.screen.pixels.subarray((PICTURE_TOP + y) * 320, (PICTURE_TOP + y + 1) * 320)].filter((v) => v === SPECTRUM.white).length;
  check(`ENTER CONTINUE is drawn in bright white letters at y ${STRIP_Y} (${letters} white pixels in the strip), on no box`, letters > 100);
}
input.keyDown('Space'); tick(3); input.keyUp('Space'); tick(3);
check(`Space over a save: NEW GAME? first (${p.state.prompt})`, p.state.prompt === 'newGame');
tap('Escape');
check(`Esc: back to the title (${p.state.prompt})`, p.state.prompt === 'title' && p.state.phase === 'title');
input.touch = true;
tick(2);
input.point(60, PICTURE_TOP + STRIP_Y + 4); tick(3);
check(`touch: a tap on ENTER CONTINUE continues (${p.state.phase})`, p.state.phase === 'play');
input.touch = false;
// a new game over a save
tap('KeyP');
tap('KeyT');
tick(60);
tap('Space');
tap('Space');
await new Promise((resolve) => setTimeout(resolve, 0));
until(() => p.state.phase === 'options', 20);
tap('Space');
until(() => p.state.phase === 'play', 20);
check(`Space over a save, answered, and the options: a new game (${p.state.phase}), the old save kept as the previous one`, p.state.phase === 'play' && game().room === 0x2c && game().lives === START_LIVES && store.has('montymole.save.v2.previous'));
check('and a new map: nothing come to yet', p.state.found.reached.length === 0);
check('the keys are ours: up, down, left, right, jump', Key.up === 1 && Key.down === 2 && Key.left === 4 && Key.right === 8 && Key.jump === 16);
finish();
