/**
 * The READY. directory (games/loader.ts), headless (c64kit stood in by games/shared/test/kit.ts):
 *
 * - a click or tap picks a game, a second on the same game loads it (Picker);
 * - however many games there are (the eleven today, 16, 30), the banner and the saved games line
 *   never leave the top: while the intro types and lists, when it's skipped, with each game chosen
 *   by the keys (every one comes into sight, chosen), and while a game loads; the screen is
 *   cleared before LIST, so up to sixteen are all in sight with nothing scrolled; a click picks the game on its row and a second loads it, a touch
 *   drag moves the choice, a tap on the saved games line opens them.
 *
 *   nice -n 15 node tools/test.mjs games/shared/test/loader.ts [out-dir]
 */
import fs from 'node:fs';
import { C64_PALETTE, Input, PixelRenderer } from 'c64kit';
import { rgbPng } from '../../../tools/probe/render';
import { Picker, run, type PointerAt } from '../../loader';
import { GAMES, type GameEntry } from '../../registry';
import { nowhere } from './browser';
import { check, finish } from './check';

const outDir = process.argv[2];

const p = new Picker();
check('the first click on a game only picks it (even the first game, already lit)', p.click(0) === 'pick');
check('a second click on it loads it', p.click(0) === 'load');
const q = new Picker();
check('a click on one game, then another: picks each', q.click(2) === 'pick' && q.click(5) === 'pick');
check('then the same one again: loads', q.click(5) === 'load');
const d = new Picker();
d.drag(3);
check('a drag (touch) ending on a game picks it: a tap on it then loads', d.click(3) === 'load');

/** The canvas's pixels are the screen's (the stand-in renderer maps nothing). */
class ScreenRenderer extends PixelRenderer {
  override toScreen(clientX: number, clientY: number) { return { x: clientX, y: clientY }; }
}
const BANNER = '    **** RUNSTOP64 REMAKE SYSTEM ****';
const at = (row: number, pointerType = 'mouse', buttons = 1): PointerAt => ({ clientX: 100, clientY: row * 8 + 4, pointerType, buttons });

for (const count of [GAMES.length, 11, 16, 30]) {
  const games: GameEntry[] = [...GAMES];
  for (let i = games.length; i < count; i++) games.push({ id: `extra${i}`, name: `EXTRA GAME ${i}`, blocks: 10 });
  const input = new Input(nowhere);
  const renderer = new ScreenRenderer();
  let launched = '', saves = 0;
  const host = { renderer, input, canvas: nowhere };
  const options = { launch: (g: GameEntry) => { launched = g.id; }, saves: () => { saves++; }, games };
  const dir = run(host, options);
  const tick = () => { input.poll(); dir.tick(); };
  const press = (code: string) => { input.keyDown(code); tick(); input.keyUp(code); tick(); };
  const top = (rows: string[]) => rows[1] === BANNER && rows[2].includes('SAVED GAMES');
  const width = Math.max(16, ...games.map((g) => g.name.length));
  const listed = (rows: string[], i: number) => rows.some((r) => r.includes(`"${games[i].name.padEnd(width)}"`));
  const shot = (name: string) => {
    if (!outDir) return;
    fs.mkdirSync(outDir, { recursive: true });
    const rgb = new Float32Array(320 * 200 * 3);
    renderer.screen.pixels.forEach((v, i) => { const c = C64_PALETTE[(v === 0xff ? renderer.background : v) & 15]; rgb[i * 3] = (c >> 16) / 255; rgb[i * 3 + 1] = ((c >> 8) & 255) / 255; rgb[i * 3 + 2] = (c & 255) / 255; });
    rgbPng(`${outDir}/${name}.png`, rgb, 320, 200, 2);
  };

  // the intro, typed and listed: the banner stays put all the way through
  let steady = true, n = 0;
  for (; n < 2000 && dir.state.row < 0; n++) { tick(); if (n > 5 && !top(dir.state.rows)) steady = false; }
  const rows = dir.state.rows;
  const quotes = new Set(rows.filter((r) => r.endsWith(' PRG')).map((r) => r.lastIndexOf('"')));
  check(`${count} games: every game's closing quote in one column`, quotes.size === 1);
  check(`${count} games: the intro lists them all (${n} ticks), the banner and the saved games line on rows 1 and 2 throughout`, steady && dir.state.row >= 0 && top(rows));
  check(`  the first game chosen and in sight (row ${dir.state.row})`, dir.state.selected === 0 && rows[dir.state.row].includes(games[0].name));
  // (the screen is cleared before LIST, so up to sixteen games fit with nothing scrolled; more scroll under the pinned rows)
  if (count <= 16) check(`  the screen cleared before LIST: LIST on row 3, every game in sight, READY. on row ${7 + count}`, rows[3] === 'LIST' && games.every((_, i) => listed(rows, i)) && rows[7 + count] === 'READY.');
  else check(`  too many to show at once: the first ${rows.filter((r) => r.includes('"EXTRA') || r.includes(' PRG')).length} in sight, from the first`, listed(rows, 0) && !listed(rows, count - 1));
  shot(`directory-${count}`);

  // every game chosen in turn by the keys: each in sight, picked, the banner put
  let allSeen = true;
  for (let i = 1; i < count; i++) {
    press('ArrowDown');
    const s = dir.state;
    if (s.selected !== i || s.row < 3 || !s.rows[s.row].includes(games[i].name) || !top(s.rows)) allSeen = false;
  }
  check('  down through every game: each comes into sight, picked, under the banner', allSeen);
  if (count === 30) shot(`directory-${count}-last`);
  press('ArrowDown');
  check('  down from the last: back to the first, in sight', dir.state.selected === 0 && dir.state.row >= 3 && top(dir.state.rows));
  press('ArrowUp');
  check('  up from the first: the last, in sight', dir.state.selected === count - 1 && dir.state.row >= 3 && dir.state.rows[dir.state.row].includes(games[count - 1].name));

  // clicks: the game on a row picked, then loaded; a touch drag moves the choice
  const row = dir.state.row - 2; // (another game in sight, two lines up)
  const name = dir.state.rows[row];
  dir.pointer.down(at(row));
  tick();
  check(`  a click on another game's row picks it ("${name.trim()}"), no more`, dir.state.selected === count - 3 && dir.state.launching === null);
  dir.pointer.down(at(row + 1, 'touch'));
  dir.pointer.move(at(row - 1, 'touch'));
  dir.pointer.up();
  tick();
  check('  a touch drag from one row to another: the game it ends on is picked', dir.state.selected === count - 4 && dir.state.launching === null);
  dir.pointer.down(at(row - 1, 'touch'));
  tick();
  check('  a tap on the picked game: it loads', dir.state.launching === games[count - 4].id);
  let fine = true;
  for (let i = 0; i < 100 && !launched; i++) { tick(); if (!launched && !top(dir.state.rows)) fine = false; }
  check(`  LOAD"...",8,1 typed, RUN: the banner still on top, the game launched (${launched})`, fine && launched === games[count - 4].id);

  // the saved games line, by a tap, from a directory skipped to
  const dir2 = run(host, { ...options, skipIntro: true });
  input.poll(); dir2.tick();
  check('  skipped to the directory: the banner on top, the first game picked and in sight', top(dir2.state.rows) && dir2.state.row >= 3 && dir2.state.selected === 0);
  dir2.pointer.down(at(2, 'touch'));
  check('  a tap on the saved games line: the saved games', saves === 1);
}

finish();
