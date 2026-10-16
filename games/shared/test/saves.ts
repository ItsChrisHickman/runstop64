/**
 * The saves, headless (c64kit stood in by games/shared/test/kit.ts): the storage module
 * (games/shared/saves.ts), ContinueFlow and FrontEnd driven by a small stand-in game, and the save
 * manager (games/saves.ts):
 *
 * - the single save from before the history (`<id>.save.v1`) moves into it, nothing lost;
 * - a launch with a save goes straight back into play;
 * - T on the pause screen goes back to the title, the save kept;
 * - a new game keeps the save as the previous one, and restoring it brings it back (and undoes);
 * - a second new game that never got past its first room doesn't push the older save out;
 * - CONTINUE? waits for its answer (no countdown);
 * - the save manager lists the saves, restores, and deletes only after a confirm (keys and taps).
 *
 *   nice -n 15 node tools/test.mjs games/shared/test/saves.ts [out-dir]
 */
import fs from 'node:fs';
import { C64_PALETTE, Input, PixelRenderer } from 'c64kit';
import { rgbPng } from '../../../tools/probe/render';
import { ContinueFlow, readsFormat, type SaveCodec } from '../continue';
import { FrontEnd } from '../frontend';
import { isNumber, isRecord, readJson } from '../guards';
import type { PauseMap } from '../native/pause';
import { readFound, readSaves, toBase64, watchWrites } from '../saves';
import { run as runLoader } from '../../loader';
import { GAMES } from '../../registry';
import { run as runSaves } from '../../saves';
import { nowhere, useMemoryStorage } from './browser';
import { must } from './must';
import { check, finish } from './check';

const store = useMemoryStorage();
const input = new Input(nowhere);
const renderer = new PixelRenderer();
const outDir = process.argv[2];
const shot = (name: string) => {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  const rgb = new Float32Array(320 * 200 * 3);
  renderer.screen.pixels.forEach((v, i) => { const c = C64_PALETTE[(v === 0xff ? renderer.background : v) & 15]; rgb[i * 3] = (c >> 16) / 255; rgb[i * 3 + 1] = ((c >> 8) & 255) / 255; rgb[i * 3 + 2] = (c & 255) / 255; });
  rgbPng(`${outDir}/${name}.png`, rgb, 320, 200, 2);
};

// ---- a stand-in game: a title, rooms numbered from 1, lives; its saves are JSON ------------------

interface Save { room: number; lives: number }
const CODEC: SaveCodec<Save> = {
  format: 1,
  pack: (s) => new TextEncoder().encode(JSON.stringify(s)),
  unpack: (b, format) => {
    readsFormat('test', format, 1);
    const v: unknown = readJson(new TextDecoder().decode(b));
    if (!isRecord(v) || !isNumber(v.room) || !isNumber(v.lives)) throw new Error('not a test save');
    return { room: v.room, lives: v.lives };
  },
};
/** What the stand-in map finds: the rooms been in. */
type Seen = Record<string, true>;
const MAP: PauseMap<Save, Seen> = {
  found: {
    empty: () => ({}),
    parse: (kept) => Object.fromEntries(Object.entries(isRecord(kept) ? kept : {}).filter(([, v]) => v === true).map(([k]) => [k, true as const])),
  },
  observe(s, found) { found[String(s.room)] = true; },
  title: (s) => `ROOM ${s.room}`,
  draw() {},
  info: (s, found) => [`LIVES ${s.lives}`, `SEEN ${Object.keys(found).length}`],
};

/** The game as launched (a page load): its front end and saves, from what's in storage. */
function launch(id = 'test') {
  const game = { onTitle: true, room: 0, lives: 3 };
  const flow = new ContinueFlow<Save, Seen>({ id, renderer, input, font: 'kit', codec: CODEC, found: MAP.found, describe: (s, found) => [MAP.title(s), ...MAP.info(s, found)] });
  const fe: FrontEnd<Save, Seen> = new FrontEnd<Save, Seen>({
    id, input, renderer, map: MAP, assists: [],
    font: () => flow.getFont(), saves: flow, onClose() {},
  });
  const status = () => ({ onTitle: game.onTitle, room: game.onTitle || fe.holding ? null : game.room, save: () => ({ room: game.room, lives: game.lives }) });
  return {
    game, flow, fe,
    tick() {
      input.poll();
      if (!game.onTitle) {
        fe.pauseKey({ room: game.room, lives: game.lives }, !flow.holding);
        if (fe.paused) {
          const r = fe.pausedTick({ room: game.room, lives: game.lives }, () => renderer.screen.clear(6));
          if (r === 'title') { fe.wentBack(); flow.toTitle(); game.onTitle = true; }
          return;
        }
      }
      // R in play: a restart, to the title (as the games' own restarts are)
      if (!game.onTitle && input.typed.includes('KeyR')) game.onTitle = true;
      const resume = flow.before(status());
      if (resume) { Object.assign(game, { onTitle: false, room: resume.room, lives: resume.lives }); flow.resumed(resume, resume.room); return; }
      // the title: Space starts a new game (in its first room)
      if (game.onTitle && !flow.holding && input.typed.includes('Space')) { fe.newGame(); Object.assign(game, { onTitle: false, room: 1, lives: 3 }); }
      if (!game.onTitle) MAP.observe({ room: game.room, lives: game.lives }, fe.found, new Uint8Array(0));
      flow.after(status());
      renderer.screen.clear(game.onTitle ? 14 : 6);
      flow.draw();
    },
  };
}
type Game = ReturnType<typeof launch>;
const ticks = (g: Game, n: number) => { for (let i = 0; i < n; i++) g.tick(); };
const press = (g: Game, code: string) => { input.keyDown(code); g.tick(); input.keyUp(code); g.tick(); };
/** Space on the title over a save: NEW GAME? first, and Space again starts it. */
const newGame = (g: Game) => { press(g, 'Space'); const asked = g.flow.state.prompt === 'newGame' && g.game.onTitle; press(g, 'Space'); return asked; };
/** The player walks into the next room. */
const nextRoom = (g: Game) => { g.game.room++; ticks(g, 2); };
/** The last life lost: back to the title. */
const gameOver = (g: Game) => { g.game.onTitle = true; ticks(g, 30); };

// ---- the single save from before the history moves into it ----------------------------------------
store.set('test.save.v1', toBase64(CODEC.pack({ room: 7, lives: 2 })));
store.set('test.found.v1', JSON.stringify({ 5: true, 6: true, 7: true }));
let g = launch();
check('the old single save (test.save.v1) is the current save now, its key gone', !store.has('test.save.v1') && readSaves('test').current !== null && readSaves('test').previous === null);
check(`  described once the game has read it ("${readSaves('test').current?.summary.join(' / ')}")`, readSaves('test').current?.summary.join(' / ') === 'ROOM 7 / LIVES 2 / SEEN 3');

// ---- a launch with a save: straight back into play ----------------------------------------------
check('launched with a save: on the way back into play', g.flow.launching);
g.tick();
check('the first tick: back in play where it was (room 7, two lives), no title', !g.game.onTitle && g.game.room === 7 && g.game.lives === 2 && g.flow.state.playing && !g.flow.launching);
nextRoom(g);
nextRoom(g);
check('entering rooms autosaves (room 9, dated, described)', readSaves('test').current?.summary[0] === 'ROOM 9' && (readSaves('test').current?.at ?? 0) > 0);
shot('1-play');

// ---- T on the pause screen: back to the title, the save kept -------------------------------------
press(g, 'KeyP');
check('P: the pause screen', g.fe.paused);
shot('2-pause');
press(g, 'KeyT');
check('T: back to the title', g.game.onTitle && !g.fe.paused);
ticks(g, 40);
check('the save is kept, and the title offers ENTER CONTINUE (no CONTINUE?: on purpose)', g.flow.state.hasSave && g.flow.state.prompt === 'title' && readSaves('test').current?.summary[0] === 'ROOM 9');
press(g, 'Enter');
check('Enter: back in room 9', !g.game.onTitle && g.game.room === 9);
// (a tap on its line on the pause screen, too: TITLE, the last of the options, at y=166)
press(g, 'KeyP');
input.point(260, 168); g.tick(); ticks(g, 40);
check('a tap on T TITLE: the title, the save kept', g.game.onTitle && g.flow.state.prompt === 'title' && readSaves('test').current?.summary[0] === 'ROOM 9');

// ---- a new game keeps the save as the previous one ------------------------------------------------
press(g, 'Space');
check('Space on the title, over a save: NEW GAME? first (the title held, the save kept)', g.game.onTitle && g.flow.holding && g.flow.state.prompt === 'newGame' && readSaves('test').current?.summary[0] === 'ROOM 9');
press(g, 'Escape');
check('Esc: no; the title, ENTER CONTINUE', g.game.onTitle && (g.flow.state.prompt === null || g.flow.state.prompt === 'title'));
press(g, 'Space'); press(g, 'Space');
check('Space on the title: a new game, in room 1', !g.game.onTitle && g.game.room === 1);
const after = readSaves('test');
check('its save is the current one; the old one (room 9) is the previous, with what had been found', after.current?.summary[0] === 'ROOM 1' && after.previous?.summary[0] === 'ROOM 9' && Object.keys(after.previous?.found ?? {}).length === 5);
check('the new game has found nothing yet but its room, kept with its autosave', JSON.stringify(g.fe.found) === '{"1":true}' && JSON.stringify(readFound('test')) === '{"1":true}');
nextRoom(g);
nextRoom(g);
// a page load later: the launch continues the new game (room 3)
g = launch();
g.tick();
check('launched again: straight back into the new game (room 3)', !g.game.onTitle && g.game.room === 3);

// ---- the save manager: the list, restore (both ways), delete with a confirm --------------------------
let launched = '', back = 0;
const mgrOpts = { back: () => { back++; }, launch: (e: { id: string }) => { launched = e.id; } };
let m = runSaves({ renderer, input, canvas: nowhere }, mgrOpts);
const mtick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); m.tick(); } };
const mpress = (code: string) => { input.keyDown(code); mtick(); input.keyUp(code); mtick(); };
mtick();
check(`the manager lists every game (${m.state.choices.length})`, m.state.page === 'list' && m.state.choices.length >= GAMES.length);
// (its own game list is the loader's: the stand-in's saves are under 'test'; look at Monty's, kept as a test would)
for (const key of ['save.v2', 'save.v2.previous']) {
  const slot = readJson(must(store.get(`test.${key}`), `the ${key}`));
  store.set(`montyotr.${key}`, JSON.stringify({ ...(isRecord(slot) ? slot : {}), game: 'montyotr' })); // (a slot says whose it is)
}
m = runSaves({ renderer, input, canvas: nowhere }, mgrOpts);
mtick();
shot('3-saves-list');
check(`Monty's line has its date ("${m.state.choices[0]}")`, /^MONTY ON THE RUN +\d\d [A-Z]{3} \d\d:\d\d$/.test(m.state.choices[0]));
mpress('Enter');
check(`Enter: Monty's page (${m.state.choices.join(', ')})`, m.state.page === 'game' && m.state.choices.join('|') === 'C  CONTINUE|R  RESTORE PREVIOUS|D  DELETE CURRENT|P  DELETE PREVIOUS|B  BACK');
shot('4-saves-game');
mpress('KeyR');
check('R: the previous save (room 9) is current again, the new game (room 3) previous', readSaves('montyotr').current?.summary[0] === 'ROOM 9' && readSaves('montyotr').previous?.summary[0] === 'ROOM 3');
mpress('KeyR');
check('R again: undone', readSaves('montyotr').current?.summary[0] === 'ROOM 3' && readSaves('montyotr').previous?.summary[0] === 'ROOM 9');
mpress('KeyD');
check('D: a page asking first, NO picked; nothing deleted yet', m.state.page === 'confirm' && m.state.picked === 0 && readSaves('montyotr').current !== null);
shot('5-saves-confirm');
mpress('Enter');
check('Enter (on NO): back, the save still there', m.state.page === 'game' && readSaves('montyotr').current !== null);
mpress('KeyD');
mpress('Escape');
check('D, then Esc: back, the save still there', m.state.page === 'game' && readSaves('montyotr').current !== null);
mpress('KeyD');
mpress('KeyY');
check('D, then Y: the current save deleted (the previous kept)', readSaves('montyotr').current === null && readSaves('montyotr').previous?.summary[0] === 'ROOM 9');
// taps: one picks a line, a second on it does it (RESTORE PREVIOUS is the first choice now)
check(`with no current save: ${m.state.choices.join(', ')}`, m.state.choices.indexOf('R  RESTORE PREVIOUS') === 0 && m.state.picked === 0);
// (the choices' rows: after the two saves' lines; find it from the picture: the reversed bar)
// (the bar's bottom line: the letters' bottom rows are empty)
const barRow = () => { for (let r = 0; r < 25; r++) if (renderer.screen.pixels[(r * 8 + 7) * 320 + 2] === 14) return r; return -1; };
mpress('ArrowDown');
const delPrev = barRow();
mpress('ArrowUp');
input.point(100, delPrev * 8 + 3); mtick();
check('a tap on DELETE PREVIOUS only picks it', m.state.page === 'game' && m.state.choices[m.state.picked] === 'P  DELETE PREVIOUS');
input.point(100, delPrev * 8 + 3); mtick();
check('a second tap: the confirm page (nothing deleted yet)', m.state.page === 'confirm' && readSaves('montyotr').previous !== null);
input.point(100, 14 * 8 + 3); mtick();
check('a tap on YES only picks it', m.state.page === 'confirm' && readSaves('montyotr').previous !== null);
input.point(100, 14 * 8 + 3); mtick();
check('a second tap on YES: deleted', readSaves('montyotr').previous === null);
mpress('Escape');
mpress('Escape');
check('Esc, Esc: back to the directory', back === 1 && m.state.left);
// continue from the manager: launches the game
m = runSaves({ renderer, input, canvas: nowhere }, mgrOpts);
mtick();
mpress('ArrowDown'); // (not Monty: it has no saves now; the stand-in's own 'test' isn't listed)
mpress('ArrowUp');
mpress('Enter');
check(`a game without saves: LOAD instead of CONTINUE (${m.state.choices.join(', ')})`, m.state.choices[0] === 'L  LOAD (A NEW GAME)');
mpress('KeyL');
check('L: the game is launched', launched === 'montyotr');

// ---- the directory: the saved games line under the banner; F1 (or a tap on the line) opens them -------
{
  let opened = 0;
  const dir = runLoader({ renderer, input, canvas: nowhere }, { launch() {}, saves: () => { opened++; }, skipIntro: true });
  const dtick = () => { input.poll(); dir.tick(); };
  dtick();
  shot('7-directory');
  // (the screen's 25 rows: the last game, BLOCKS FREE., READY. and the cursor all on it)
  const lit = (row: number) => renderer.screen.pixels.subarray(row * 8 * 320, row * 8 * 320 + 8 * 320).some((v) => v === 14);
  check(`the directory still fits the screen (rows 2 and ${13 + GAMES.length} have words)`, lit(2) && lit(13 + GAMES.length));
  input.keyDown('F1'); dtick(); input.keyUp('F1'); dtick();
  check('F1 on the directory: the saved games', opened === 1);
}

// ---- a new game that never got past its first room doesn't push the older save out -----------------
g = launch();
g.tick(); // (room 3: the second game)
press(g, 'KeyP'); press(g, 'KeyT'); ticks(g, 40);
newGame(g); // a new game (by accident): the second game (room 3) becomes the previous
check('another new game: the game it replaced (room 3) is the previous', readSaves('test').previous?.summary[0] === 'ROOM 3');
press(g, 'KeyP'); press(g, 'KeyT'); ticks(g, 40);
newGame(g); // and another, at once
check('and another straight after: the previous is still room 3 (a one-room game isn\'t kept over it)', readSaves('test').previous?.summary[0] === 'ROOM 3' && readSaves('test').current?.summary[0] === 'ROOM 1');

// ---- CONTINUE? waits for its answer ---------------------------------------------------------------
nextRoom(g);
gameOver(g);
check('the last life lost: CONTINUE?', g.flow.state.prompt === 'continue' && g.flow.holding);
shot('6-continue');
ticks(g, 30 * 50);
check('thirty seconds later it still waits (no countdown)', g.flow.state.prompt === 'continue');
press(g, 'Escape');
check('Esc: no; the title offers ENTER CONTINUE, the save kept', g.flow.state.prompt === null || g.flow.state.prompt === 'title');
ticks(g, 30);
check('  (the title with ENTER CONTINUE)', g.flow.state.prompt === 'title' && readSaves('test').current?.summary[0] === 'ROOM 2');
newGame(g);
check('then a new game: the declined save (room 2) kept as the previous one', readSaves('test').previous?.summary[0] === 'ROOM 2');

// ---- R (a restart): the game so far is kept as the previous save, however soon a new game starts -----
g.game.lives = 7; // (each game its own save)
nextRoom(g);
nextRoom(g);
let was = must(readSaves('test').current, 'the save before R');
press(g, 'KeyR');
check('R: the title, the save kept (ENTER CONTINUE)', g.game.onTitle && readSaves('test').current?.data === was.data);
ticks(g, 40);
check('  no CONTINUE? after it (a restart on purpose), ENTER CONTINUE', g.flow.state.prompt === 'title');
newGame(g);
check(`  then a new game: the game before (${was.summary[0]}) is the previous save, the new one current`, readSaves('test').previous?.data === was.data && readSaves('test').current?.summary[0] === 'ROOM 1');
g.game.lives = 6; // (each game its own save)
nextRoom(g);
nextRoom(g);
was = must(readSaves('test').current, 'the save before R');
press(g, 'KeyR');
check('  Space straight away: NEW GAME? first', newGame(g)); // (straight away: the title up two ticks)
check(`R, then a new game at once: the game before (${was.summary[0]}) is the previous save`, readSaves('test').previous?.data === was.data && readSaves('test').current?.summary[0] === 'ROOM 1');
// a new game begun where play never seemed to end (a title that doesn't say it's up while it's busy,
// as Monty's was after a high score): the game so far is still kept
g.game.lives = 5; // (each game its own save)
nextRoom(g);
nextRoom(g);
was = must(readSaves('test').current, 'the save before the new game');
g.fe.newGame();
g.game.room = 1;
ticks(g, 2);
check(`a new game straight from play: the game before (${was.summary[0]}) is the previous save`, readSaves('test').previous?.data === was.data && readSaves('test').current?.summary[0] === 'ROOM 1');
g.fe.newGame(); // (said again for the same new game, nothing of it worth keeping: nothing changes)
ticks(g, 2);
check('  said again at once: the previous save is still that game', readSaves('test').previous?.data === was.data);

// ---- storage that is full: the write that fails is reported (the shell shows a line), the game goes on ----
{
  const results: boolean[] = [];
  watchWrites((ok) => results.push(ok));
  const used = [...store].reduce((n, [k, v]) => n + k.length + v.length, 0);
  useMemoryStorage(store, used - 50); // (less room than there is in use: nothing more fits)
  const room = g.game.room;
  nextRoom(g);
  check('storage full: the autosave of the next room fails, and is reported as failed', g.game.room === room + 1 && results.length > 0 && results.at(-1) === false);
  check('  the game goes on, the save before it still there', readSaves('test').current?.summary[0] !== `ROOM ${room + 1}` && readSaves('test').current !== null);
  useMemoryStorage(store); // (room again)
  nextRoom(g);
  check('room again: the next autosave is kept, and reported as kept', results.at(-1) === true && readSaves('test').current?.summary[0] === `ROOM ${room + 2}`);
  watchWrites(() => {});
}

finish();
