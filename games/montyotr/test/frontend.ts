/**
 * Monty's front end, headless (c64kit stood in by games/shared/test/kit.ts): the
 * title (the original's attract screen) → play; walking into the next room; the
 * shared pause screen (map, the assist), travel back by the map (keys, and taps);
 * autosave; game over with a high score → no name entry, the table as it was,
 * CONTINUE? straight away (the title's tune) → back in the last room; ENTER
 * CONTINUE on the title; the ending keeping the save. The title's lower part: MONTY'S FREEDOM KIT standing still
 * under the table (the five that work, no carousel, no item number), and ENTER
 * CONTINUE in the empty rows above the table, with room above and below.
 * With an out-dir, the title is drawn through its pages (the scroller's passages,
 * the box's scores and pictures), without a save and with one (the strip).
 *
 *   nice -n 15 node tools/test.mjs games/montyotr/test/frontend.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { indicesPng } from '../../../tools/probe/render';
import { sidLog } from '../../shared/test/kit';
import { isNumbers, isRecordOf } from '../../shared/guards';
import { MAP_BOX } from '../../shared/native/pause';
import { CORRECT_KIT, MUSIC } from '../src/data';
import { run, STRIP_Y } from '../src/main';
import { KIT_COL, KIT_ICON_ROW, KIT_LABEL_COL, KIT_LABEL_ROW, TABLE_ROW } from '../src/title';
import type { Game } from '../src/game';
import { montyMap } from '../src/map';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { readSaves } from '../../shared/saves';
import { parseOptions } from '../../shared/test/data';
import { check, finish } from '../../shared/test/check';

// a browser's storage, in memory
const store = useMemoryStorage();

const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const g = p.game;
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };

// pictures of the screens (the characters; sprites are drawn by the real renderer), if an output folder is given
const outDir = process.argv[2];
function shot(name: string) {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  indicesPng(path.join(outDir, `${name}.png`), renderer.screen.pixels.map((v) => (v === 0xff ? renderer.background : v)), 320, 200);
}
/** Screen codes as text (the game's: $40-$7F, letters at $41-$5A, $60 a space). */
const asText = (codes: ArrayLike<number>) => Array.from(codes, (c) => { const s = (c & 0x3f) | 0x40; return String.fromCharCode(s >= 0x60 ? s - 0x40 : s); }).join('');
const text = (row: number, col: number, n: number) => asText(g.mem.subarray(0x800 + row * 40 + col, 0x800 + row * 40 + col + n));
/** A name in the table (names are kept as the screen shows them, less $40). */
const tableName = (rank: number) => asText(p.title.table.subarray(0xff + rank * 16, 0xff + rank * 16 + 16));
const played = (song: number) => sidLog.calls.some(([a, s]) => a === MUSIC.init && s === song);

// ---- the title's lower part: the kit under the table, ENTER CONTINUE above it ----------------------------
const codes = (m: Uint8Array, row: number, col: number, n: number) => Array.from(m.subarray(0x800 + row * 40 + col, 0x800 + row * 40 + col + n));
const colours = (game: Game, row: number, col: number, n: number) => Array.from(game.col.subarray(row * 40 + col, row * 40 + col + n), (c) => c & 15);
const LABEL = [..."MONTY'S FREEDOM KIT"].map((c) => (c === "'" ? 0x68 : (c.charCodeAt(0) & 0x3f) | 0x40));
/** The title's kit as it should be: the label, the five correct icons (in the charset, and on the screen 2x2 apiece), no counter, no sprites. */
function kitChecks(where: string, game: Game) {
  const m = game.mem;
  check(`${where}: MONTY'S FREEDOM KIT under the table (row ${KIT_LABEL_ROW}), light blue`, codes(m, KIT_LABEL_ROW, KIT_LABEL_COL, LABEL.length).every((c, i) => c === LABEL[i]) && colours(game, KIT_LABEL_ROW, KIT_LABEL_COL, LABEL.length).every((c) => c === 14));
  const icons = CORRECT_KIT.every((item, i) => {
    const ch = 2 + i * 4, col = KIT_COL + i * 4;
    const inCharset = m.subarray(ch * 8, ch * 8 + 32).every((b, k) => b === m[0x3800 + item * 32 + k]);
    const top = codes(m, KIT_ICON_ROW, col, 2), bottom = codes(m, KIT_ICON_ROW + 1, col, 2);
    return inCharset && top[0] === ch && top[1] === ch + 1 && bottom[0] === ch + 2 && bottom[1] === ch + 3
      && [...colours(game, KIT_ICON_ROW, col, 2), ...colours(game, KIT_ICON_ROW + 1, col, 2)].every((c) => c === 1);
  });
  check(`${where}: the five correct icons (${CORRECT_KIT.join(', ')}) under it, white, between the pillars (columns 9-30)`, icons && KIT_COL >= 9 && KIT_COL + 18 <= 31);
  const table = codes(m, TABLE_ROW, 7, 26);
  check(`${where}: the table plain (no item number on it)`, table[0] === 0x28 && table[25] === 0x29 && table.slice(1, 25).every((c) => c === 0x2a));
  check(`${where}: rows 17-20 empty (the original's MONTY FREEDOM KIT. and picked icons gone), no sprites (no carousel)`, codes(m, 17, 0, 160).every((c) => c === 0) && game.vic.enable === 0);
}
/** The screen's pixel rows y0..y1 hold something other than the background. */
const lit = (y0: number, y1: number) => renderer.screen.pixels.subarray(y0 * 320, y1 * 320).some((v) => v !== 0 && v !== 0xff);
/** The title through its pages, drawn every 250 ticks (with an out-dir). */
function pages(name: string, step: (n: number) => void) {
  for (let i = 0; i < 6; i++) { step(250); shot(`${name}-${(i + 1) * 250}`); }
}

// ---- the title -----------------------------------------------------------------------------------
tick(400);
shot('1-title');
check('starts on the title, with the title tune (Music.Init 0)', p.state.mode === 'title' && played(0));
check(`the scroller has drawn into the top rows`, g.mem.subarray(0x800, 0x800 + 240).some((c) => c >= 0xf0));
const box = [10, 11, 12, 13, 14, 15].map((r) => text(r, 6, 28));
check(`the box rolls the table: "${box.find((l) => /\d\d\) /.test(l))?.trim()}"`, box.some((l) => /\d\d\) 00\d\d0 /.test(l)));
check('no save yet: no ENTER CONTINUE', !p.state.hasSave && p.state.prompt === null);
kitChecks('the title', g);
check('no save: nothing drawn between the box and the table (y 136-167)', !lit(136, 168));
{
  // left, right, down (the carousel's keys) and the frames going by: the kit stands still
  const before = [...codes(g.mem, 17, 0, 320), ...colours(g, 17, 0, 320), ...g.mem.subarray(0x10, 0xb0)];
  for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowDown']) { input.keyDown(k); tick(40); input.keyUp(k); tick(5); }
  const after = [...codes(g.mem, 17, 0, 320), ...colours(g, 17, 0, 320), ...g.mem.subarray(0x10, 0xb0)];
  check('left, right and down on the title: nothing turns or changes under the box (rows 17-24, the icons)', before.every((b, i) => b === after[i]) && p.state.mode === 'title');
}
pages('title-nosave', tick);

// ---- play ----------------------------------------------------------------------------------------
tap('Space');
tick(20);
const first = g.roomId;
check(`Space: the game, in the first room (${first.toString(16)})`, p.state.mode === 'play' && !g.freeze);
check('a save on coming into the first room', store.has('montyotr.save.v2'));
shot('2-play');
// walk left (jumping now and then) until the room changes
input.keyDown('ArrowLeft');
let steps = 0;
const walked = until(() => { if (++steps % 40 === 0) input.keyDown('Space'); else if (steps % 40 === 2) input.keyUp('Space'); return g.roomId !== first; }, 1500);
input.keyUp('ArrowLeft');
input.keyUp('Space');
tick(10);
const second = g.roomId;
check(`walking left leaves the first room (now ${second.toString(16)})`, walked);
const noted = p.state.found.rooms, rooms = isRecordOf(noted, isNumbers) ? noted : {};
check('the map has noted where Monty came into both rooms', !!rooms[first] && !!rooms[second]);

// ---- the pause screen ----------------------------------------------------------------------------
tap('KeyP');
check('P: the pause screen', p.state.paused);
tick(2);
shot('3-pause');
const x = g.x2;
tick(20);
check('the game waits while paused', g.x2 === x && p.state.paused);
check('ENHANCED by default: the cloud help on', g.assist.cloud === true);
tap('KeyE');
check('E: ORIGINAL, the cloud help off (and kept)', g.assist.cloud === false && parseOptions(store.get('montyotr.assist')).enhanced === false);
tap('KeyE');
check('E again: ENHANCED', g.assist.cloud === true);
// the first room is to the right on the map
tap('ArrowRight');
tap('Enter');
check('picking the first room on the map and Enter: the pause screen closes', !p.state.paused);
until(() => g.roomId === first && !g.freeze, 300);
check(`travel: back in the first room (${g.roomId.toString(16)}), where Monty first came in (${g.savedX},${g.savedY} vs ${rooms[first]})`, g.roomId === first && g.savedX === rooms[first]?.[0] && g.savedY === rooms[first]?.[1]);
// touch: two taps on the second room on the map
input.touch = true;
tap('KeyP');
const place = montyMap.places(MAP_BOX, g, p.state.found).find((q) => q.id === String(second));
if (!place) throw new Error(`room ${second.toString(16)} isn't a place on the map`);
input.point(place.x, place.y); tick(2);
input.point(place.x, place.y); tick(3);
until(() => g.roomId === second && !g.freeze, 300);
check(`touch: two taps on the second room on the map travel there (${g.roomId.toString(16)})`, !p.state.paused && g.roomId === second);
input.touch = false;
tick(20);
const lastRoom = g.roomId;

// ---- game over with a high score: no name entry, CONTINUE? -----------------------------------------
g.addScore(777 - g.score); // (00777 beats the table's top, 00500)
p.grace.clear(); // (the travel above gave a moment's grace: test/grace.ts)
g.lives = 1;
g.actionCounter = 2; // (an enemy: the death the original plays for it)
const table = p.title.table.slice(), heard = sidLog.calls.length;
const over = until(() => p.state.mode === 'title', 3000);
check(`the last life lost: game over (Music.Init 1), back to the title`, over && played(1));
until(() => p.state.prompt === 'continue', 600);
shot('5-continue');
const since = sidLog.calls.slice(heard).filter(([a]) => a === MUSIC.init).map(([, n]) => n);
check(`then CONTINUE? straight away, with the title's tune (songs since: ${since.join(', ')}), no hi-score tune`, p.state.prompt === 'continue' && since.at(-1) === 0 && !since.includes(2));
check('no name entry: the table as it was, nothing kept of it', p.title.table.every((b, i) => b === table[i]) && tableName(0) !== 'RUNSTOP64       ' && !store.has('montyotr.scores.v1'));
check('the box shows no CONGRATULATIONS', ![10, 11, 12, 13, 14, 15].some((r) => text(r, 6, 28).includes('CONGRAT')));
tap('Enter');
tick(20);
check(`Enter: back in play in the last room entered (${g.roomId.toString(16)}), five lives, the score from nothing`, p.state.mode === 'play' && g.roomId === lastRoom && g.lives === 5 && g.score === 0);
check(`the HUD hi-score is the best this visit (${g.hiScore})`, g.hiScore === 777);

// ---- ENTER CONTINUE on the title ------------------------------------------------------------------
g.lives = 2;
tick(5);
g.lives = 1;
p.grace.clear(); // (CONTINUE? gave a moment's grace)
g.actionCounter = 2;
until(() => p.state.mode === 'title', 3000);
until(() => p.state.prompt === 'continue', 600);
tap('Escape');
until(() => p.state.prompt === 'title', 100);
tick(2);
shot('6-title-continue');
check(`Esc: no; the title offers ENTER CONTINUE (y ${STRIP_Y}, above the table), with room above and below (nothing at y 136-${STRIP_Y - 1} or ${STRIP_Y + 8}-167)`,
  p.state.prompt === 'title' && renderer.screen.pixels.subarray(STRIP_Y * 320, (STRIP_Y + 8) * 320).some((v) => v === 1) && !lit(136, STRIP_Y) && !lit(STRIP_Y + 8, 168));
kitChecks('with ENTER CONTINUE', g);
tap('Enter');
tick(20);
check(`Enter: back in play in the last room (${g.roomId.toString(16)}), lives as saved`, p.state.mode === 'play' && g.roomId === lastRoom && g.lives === 5);

// ---- a page load with the save: straight back into play; T on the pause screen: the title, the save kept ----
{
  const saved = readSaves('montyotr').current;
  const p2 = run({ renderer, input, canvas: nowhere });
  const tick2 = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p2.tick(); p2.render(0); } };
  tick2(2); // (the first tick continues, the next loads the room)
  check(`launched again: straight back into play in the saved room (${p2.game.roomId.toString(16)}), no title`, p2.state.mode === 'play' && p2.game.roomId === lastRoom);
  tick2(20);
  shot('8-launched');
  input.keyDown('KeyP'); tick2(2); input.keyUp('KeyP'); tick2(2);
  shot('9-pause-title');
  input.keyDown('KeyT'); tick2(2); input.keyUp('KeyT'); tick2(60);
  check('T on the pause screen: the title, with ENTER CONTINUE; the save as it was', p2.state.mode === 'title' && p2.state.prompt === 'title' && readSaves('montyotr').current?.data === saved?.data);
  kitChecks('back to the title (T)', p2.game);
  pages('title-save', tick2);
  check(`the save described for the save manager ("${saved?.summary.join(' / ')}")`, saved?.summary[0] === 'THE HOUSE' && saved.summary.includes('LIVES 5'));
}

// ---- the ending: the save stays, CONTINUE? (test/ending.ts plays it through) ---------------------------
g.finished = 'won';
tick(2);
check('the game properly ended: the title, the save kept', p.state.mode === 'title' && p.state.hasSave && store.has('montyotr.save.v2'));
// (ENHANCED's reward for winning is on, test/reward.ts: a key skips it after two seconds)
tick(110);
tap('Space');
until(() => p.state.prompt === 'continue', 600);
check('CONTINUE? offered', p.state.prompt === 'continue');
tap('Escape');
tick(30);
tap('Space');
check('Esc, then Space: NEW GAME? first (a new game over a save asks)', p.state.prompt === 'newGame' && p.state.mode === 'title');
tap('Space'); // (again: yes)
tick(10);
check('Space again: a new game', p.state.mode === 'play');

finish();
