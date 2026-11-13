/**
 * The remix's front end, headless (c64kit stood in by games/shared/test/kit.ts): the title (Monty on the Run's, with the remix's logo and its tune)
 * → play; the shared pause screen (the map of the 21 rooms, the ORIGINAL / ENHANCED switch), travel by the map (keys and taps), a moment's grace
 * after it; autosave; ENHANCED's unlimited lives; game over → CONTINUE? straight away → back in the last room with five lives; ENTER CONTINUE on
 * the title and after a page load; T on the pause screen; the coal count in the row under the room (ENHANCED only) and the tool's sparkle (on the tool, then on the creature it is for).
 * With an out-dir, the title is drawn through its pages (the logo's passages, the credits), play, the pause screen and the map.
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/frontend.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { indicesPng } from '../../../tools/probe/render';
import { sidLog } from '../../shared/test/kit';
import { MAP_BOX } from '../../shared/native/pause';
import { MUSIC } from '../../montyotr/src/data';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { readSaves } from '../../shared/saves';
import { parseOptions } from '../../shared/test/data';
import { check, finish } from '../../shared/test/check';
import { SCREEN, ROW } from '../../shared/monty/screen';
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { EnemyState } from '../../montymole/src/enemy-rules';
import { must } from '../../shared/test/must';
import { VIC_LEFT, VIC_TOP, vicX, vicY } from '../src/coords';
import { hintsOf, TOOL_TARGET } from '../src/hints';
import { CREATURE_SPRITE, OPENING_ROOM, START_LIVES } from '../src/game';
import { run, STRIP_Y } from '../src/main';
import { remixMap } from '../src/map';

const store = useMemoryStorage();

const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const g = p.game;
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };

const outDir = process.argv[2];
function shot(name: string) {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  indicesPng(path.join(outDir, `${name}.png`), renderer.screen.pixels.map((v) => (v === 0xff ? renderer.background : v)), 320, 200);
}
const played = (song: number) => sidLog.calls.some(([a, s]) => a === MUSIC.init && s === song);
/** The screen's pixel rows y0..y1 hold something other than the background. */
const lit = (y0: number, y1: number) => renderer.screen.pixels.subarray(y0 * 320, y1 * 320).some((v) => v !== 0 && v !== 0xff);
/** A row of the screen as the game's letters. */
const rowText = (row: number, col: number, n: number): string => Array.from(g.mem.subarray(SCREEN + row * ROW + col, SCREEN + row * ROW + col + n), (c) => { const s = (c & 0x3f) | 0x40; return c === 0 ? ' ' : String.fromCharCode(s >= 0x60 ? s - 0x40 : s); }).join('');

// ---- the title ---------------------------------------------------------------------------------------------
tick(400);
shot('1-title');
check('starts on the title, with Monty on the Run\'s tune (Music.Init 0)', p.state.mode === 'title' && played(0));
check('the scroller has drawn into the top rows', g.mem.subarray(SCREEN, SCREEN + 240).some((c) => c >= 0xf0));
check('no save yet: no ENTER CONTINUE', !p.state.hasSave && p.state.prompt === null);
check('no freedom kit under the table: Wanted\'s coal there instead (a row of the lump, redefined as a character)', !rowText(22, 11, 19).includes('FREEDOM') && [0, 2, 4, 6, 8].every((i) => g.mem[SCREEN + 23 * ROW + 11 + i] === 2));
check('no save: nothing drawn between the box and the table (y 136-167)', !lit(136, 168));
let poster = 0, posterFirst = 0, shotFull = false;
for (let i = 1; i <= 50; i++) {
  tick(40);
  for (let r = 10; r < 16; r++) if (rowText(r, 6, 7) === 'WANTED:' && g.mem[SCREEN + r * ROW + 6 + 12] !== 0x60) { poster++; if (posterFirst === 0) posterFirst = i; }
  if (rowText(10, 6, 7) === 'WANTED:' && !shotFull) { shotFull = true; shot('title-poster-full'); }
  if (i % 6 === 0) shot(`title-${i * 40}`);
  if (posterFirst !== 0 && i - posterFirst < 8) shot(`title-poster-${i - posterFirst}`);
}
check(`the box shows Wanted's poster after the scores (WANTED: with its picture seen in ${poster} looks)`, poster > 0);

// ---- play ----------------------------------------------------------------------------------------------------
tap('Space');
tick(20);
check('Space: the game, in the opening scene (no room: nothing saved)', p.state.mode === 'play' && g.roomId === OPENING_ROOM && !g.freeze && !store.has('montymoleremix.save.v2'));
// the pause screen works in the scene (it is no room: the map shows none flashing)
tap('KeyP');
check('P in the scene: the pause screen, the game waiting', p.state.paused && g.roomId === OPENING_ROOM);
shot('2-pause-in-the-scene');
tap('KeyP');
check('P again: back in the scene', !p.state.paused && g.roomId === OPENING_ROOM);
// (the way out of the scene is walked in test/opening.ts: here he is sent to room 0 as the scene's way out puts him)
g.travelTo(0, 0x1c + (0x18 >> 1), 0xf9 - 0x27);
tick(20);
check('room 0 (the scene\'s way out): in play', p.state.mode === 'play' && g.roomId === 0 && !g.freeze);
check('a save on coming into the first room', store.has('montymoleremix.save.v2'));
check(`ENHANCED by default: five lives (${g.lives}), unlimited lives help on`, g.lives === START_LIVES && g.assist.lives === true);
tick(30);
shot('2-play');
check('ENHANCED: the coal count in the row under the room (COAL TO GATE: 16)', rowText(23, 4, 32).startsWith('COAL TO GATE: 16'));
// a second room: sent there, as a way out would (walking there is the bot's: test/passable.ts)
g.travelTo(2, 0x44, 0x4c + 8 * 5);
tick(10);
check('a second room, noted by the map with where he came into it', g.roomId === 2 && p.state.found.reached.includes(0) && p.state.found.reached.includes(2));

// ---- the pause screen -----------------------------------------------------------------------------------------
tap('KeyP');
check('P: the pause screen', p.state.paused);
tick(2);
shot('3-pause');
const x = g.x2;
tick(20);
check('the game waits while paused', g.x2 === x && p.state.paused);
tap('KeyE');
check('E: ORIGINAL, the unlimited lives help off (and kept)', g.assist.lives === false && parseOptions(store.get('montymoleremix.assist')).enhanced === false);
tap('KeyE');
check('E again: ENHANCED', g.assist.lives === true);
// room 0 is above room 2 on the map
tap('ArrowUp');
tap('ArrowUp');
tap('Enter');
check('picking room 0 on the map and Enter: the pause screen closes', !p.state.paused);
until(() => g.roomId === 0 && !g.freeze, 300);
check(`travel: back in room 0 where he first came in (${g.x2},${g.y})`, g.roomId === 0 && !g.freeze);
// touch: two taps on room 2 on the map
input.touch = true;
tap('KeyP');
const place = remixMap.places(MAP_BOX, g, p.state.found).find((q) => q.id === '2');
if (!place) throw new Error('room 3 is not a place on the map');
input.point(place.x, place.y); tick(2);
input.point(place.x, place.y); tick(3);
until(() => g.roomId === 2 && !g.freeze, 300);
check(`touch: two taps on room 3 on the map travel there (${g.roomId})`, !p.state.paused && g.roomId === 2);
input.touch = false;
tick(20);
check('a moment\'s grace after the travel: a death is refused (lives kept, nothing dying)', (() => { const lives = g.lives; g.actionCounter = 2; tick(3); return g.lives === lives && g.actionCounter === 0; })());

// ---- ENHANCED: unlimited lives and continues -------------------------------------------------------------------
{
  p.grace.clear();
  g.lives = 1;
  g.actionCounter = 2; // (a creature: the death Monty on the Run plays for it)
  tick(400);
  check(`ENHANCED: the last life lost takes nothing, no game over (lives ${g.lives}, ${p.state.mode})`, g.lives === 1 && p.state.mode === 'play');
  tap('KeyP'); tap('KeyE'); tap('KeyP');
  check('ORIGINAL: no unlimited lives, no coal count', g.assist.lives === false && !p.state.paused && !rowText(23, 4, 32).includes('COAL'));
}

// ---- game over: CONTINUE? --------------------------------------------------------------------------------------
const lastRoom = g.roomId;
g.addScore(777 - g.score);
p.grace.clear();
g.lives = 1;
g.actionCounter = 2;
const heard = sidLog.calls.length;
const over = until(() => p.state.mode === 'title', 3000);
check('the last life lost: back to the title', over);
until(() => p.state.prompt === 'continue', 600);
shot('5-continue');
check(`then CONTINUE? straight away, with the title's tune (songs since: ${sidLog.calls.slice(heard).filter(([a]) => a === MUSIC.init).map(([, n]) => n).join(', ')})`, p.state.prompt === 'continue');
tap('Enter');
tick(20);
check(`Enter: back in play in the last room entered (${g.roomId}), five lives, the score as it was at the room's start (${g.score}), the high score the best this visit (${g.hiScore})`, p.state.mode === 'play' && g.roomId === lastRoom && g.lives === START_LIVES && g.score === 0 && g.hiScore === 777);

// ---- ENTER CONTINUE on the title ----------------------------------------------------------------------------------
g.lives = 1;
p.grace.clear();
g.actionCounter = 2;
until(() => p.state.mode === 'title', 3000);
until(() => p.state.prompt === 'continue', 600);
tap('Escape');
until(() => p.state.prompt === 'title', 100);
tick(2);
shot('6-title-continue');
check(`Esc: no; the title offers ENTER CONTINUE (y ${STRIP_Y}), with room above and below (nothing at y 136-${STRIP_Y - 1} or ${STRIP_Y + 8}-167)`,
  p.state.prompt === 'title' && renderer.screen.pixels.subarray(STRIP_Y * 320, (STRIP_Y + 8) * 320).some((v) => v === 1) && !lit(136, STRIP_Y) && !lit(STRIP_Y + 8, 168));
tap('Enter');
tick(20);
check(`Enter: back in play in the last room (${g.roomId}), lives as saved`, p.state.mode === 'play' && g.roomId === lastRoom && g.lives === START_LIVES);

// ---- a page load with the save: the title, ENTER CONTINUE, Enter back into play; T on the pause screen: the title, the save kept ----
{
  const saved = readSaves('montymoleremix').current;
  const p2 = run({ renderer, input, canvas: nowhere });
  const tick2 = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p2.tick(); p2.render(0); } };
  tick2(60);
  check('launched again: the title with ENTER CONTINUE, not play', p2.state.mode === 'title' && p2.state.prompt === 'title');
  input.keyDown('Enter'); tick2(2); input.keyUp('Enter'); tick2(4);
  check(`Enter: back in play in the saved room (${p2.game.roomId})`, p2.state.mode === 'play' && p2.game.roomId === lastRoom);
  tick2(20);
  input.keyDown('KeyP'); tick2(2); input.keyUp('KeyP'); tick2(2);
  input.keyDown('KeyT'); tick2(2); input.keyUp('KeyT'); tick2(60);
  check('T on the pause screen: the title, with ENTER CONTINUE; the save as it was', p2.state.mode === 'title' && p2.state.prompt === 'title' && readSaves('montymoleremix').current?.data === saved?.data);
  check(`the save described for the save manager ("${saved?.summary.join(' / ')}")`, saved?.summary[0] === `ROOM ${lastRoom + 1}` && saved.summary.includes('LIVES 5'));
}

// ---- the tool's sparkle: on the tool while it lies there; once carried, on the creature it is for; none once spent ------------------

{
  const q = run({ renderer, input, canvas: nowhere });
  const gg = q.game;
  gg.start(false);
  gg.travelTo(1, 0x44, 0x4c + 8 * 3);
  for (let i = 0; i < 30; i++) gg.frame(0);
  check('a room with a tool: one sparkle on it; none once he carries it (room 2 has no creature the tool is for)', gg.tool !== null && hintsOf(gg).length === 1 && (() => { gg.carrying = true; return hintsOf(gg).length === 0; })());
  check('TOOL_TARGET: only rooms that have a tool, and a creature slot', Object.entries(TOOL_TARGET).every(([room, slot]) => (ROOMS[Number(room)]?.object.sprite ?? 0) !== 0 && slot >= 0 && slot < CREATURE_SPRITE.length));
}
{
  // room 12 (id 11): the fish at the top left is what the tool is for; a candle walking below it is touched first
  const q = run({ renderer, input, canvas: nowhere });
  const gg = q.game;
  gg.start(false);
  gg.enterAt(11, 0x44, 0x4c + 8 * 3);
  const tool = must(gg.tool, 'room 11 tool');
  const before = hintsOf(gg);
  check('room 11, before the tool is taken: one sparkle, on the tool', TOOL_TARGET[11] === 0 && before.length === 1 && before[0]?.x === vicX(tool.x) + 8 - 24 && before[0]?.y === vicY(tool.y) + 8 - 50);
  // stand on the tool: he takes it
  for (let i = 0; i < 400 && !gg.carrying; i++) { gg.x2 = (tool.x + VIC_LEFT) >> 1; gg.stepGate = tool.x & 1; gg.y = VIC_TOP + 175 - tool.y; gg.frame(0); }
  check('room 11: standing on the tool takes it', gg.carrying && gg.tool === null);
  const fish = must(gg.creatures[0], 'the fish');
  const near = (h: { x: number; y: number } | undefined, slot: number): boolean => {
    const r = must(gg.vic.sprites[must(CREATURE_SPRITE[slot], 'creature sprite')], 'sprite registers');
    return h !== undefined && h.x >= r.x - 24 && h.x < r.x && h.y >= r.y - 50 && h.y < r.y - 50 + 21;
  };
  let onFish = true, last = hintsOf(gg)[0], followed = false;
  for (let i = 0; i < 400; i++) {
    gg.x2 = 0x70; gg.y = 0x4c + 8 * 3; gg.falling = 0;
    if (i === 200) fish.x = (fish.x + 48) & 0xff; // (the creature goes elsewhere: the sparkle goes with it)
    gg.frame(0);
    const hs = hintsOf(gg);
    if (hs.length !== 1 || !near(hs[0], 0)) onFish = false;
    if (i === 202 && hs[0] !== undefined && last !== undefined) followed = Math.abs(hs[0].x - last.x) >= 40;
    if (i === 199) last = hs[0];
  }
  check('room 11, carrying the tool: one sparkle, on the fish (slot 0), not on the candle, in every one of 400 frames', onFish && gg.carrying);
  check('room 11: the sparkle follows the fish when it moves (48 px sideways)', followed);
  // the tool takes the first creature he touches (the fish here: only its bit is raised): spent, no sparkle
  gg.frame(8 | (1 << must(CREATURE_SPRITE[0], 'fish sprite')));
  check('room 11, the tool spent on the fish: the fish is gone, no sparkle', !gg.carrying && fish.state === EnemyState.none && hintsOf(gg).length === 0);
}

finish();
