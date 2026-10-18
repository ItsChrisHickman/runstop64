/**
 * Entombed's ending (games/shared/native/ending.ts, src/ending.ts), headless, with the real game under it:
 *
 *  1. the whole show runs from the first frame to THE END and back to the title, every scene of the montage the game itself running on a
 *     new game of its own, Pendragon driven by the joystick alone: along the first chamber and a corridor, the five bells whipped in
 *     order (the torch comes down), the statue and the pot whipped, the creatures at the bowl of fruit and the book of the dead taken,
 *     the cobra touched with the book, the torch used in a dark chamber, the leap up the bird's chamber, and the way out run for and
 *     stopped short of (walking out is the game's own end: it never happens in the show);
 *  2. the credits: every line typed over the montage in the empty band under the picture (the game leaves rows 20 and 21 black),
 *     in the credit colour and nothing else, the band empty before the text in every scene; the cast recorded, Pendragon last;
 *  3. what a win is ($3230 is 2: he walked out of chamber 1 with the way open), and through the front end as the browser runs it:
 *     a save in chamber 1 with the way open, up to the door and out: the win kept, the game's own end over before the ending, the
 *     ending run to the title; W on the pause screen once won; none in ORIGINAL; the numbers under THE END;
 *  4. any key skips it, after the first moment and not before.
 *
 *   nice -n 15 node tools/test.mjs games/entombed/test/ending.ts [out-dir]
 *
 * With an out-dir: PNG frames of each scene, of the credits, of the parade and of THE END.
 */
import fs from 'node:fs';
import { BitmapFont, Input, KIT_GLYPHS, PixelRenderer, unpackState } from 'c64kit';
import { Ending, PORT_CREDITS, bootGame, keepWon, placed, readWon } from '../../shared/native/ending';
import { GAMES } from '../../shared/native/test/games';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { checkShow, playShow } from '../../shared/test/ending-kit';
import { must } from '../../shared/test/must';
import { pendragonCode } from '../../shared/pendragon/status';
import { PlaySession } from '../../shared/test/play-session';
import { enterChamber } from '../src/chambers';
import { endingStats, entombedEnding, won } from '../src/ending';
import { entombedMap } from '../src/map';
import { port } from '../src/native';
import { run } from '../src/main';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
useMemoryStorage();

const game = GAMES.entombed;
const titleBytes = fs.readFileSync(game.title);
stubFetch(titleBytes);
const title = unpackState(new Uint8Array(titleBytes));
const spec = entombedEnding;
const keep = (ram: Uint8Array) => { ram[0x37f6] = 0; ram[0x323d] = 0; };

// ---- the show, from the start to the end
const seen = {
  bells: 0, torch: false, statue: 0, pot: false, book: false, cobra: false, flash: 0, birdLow: 999, outFurthest: 999, won: false,
  firstLeft: 999, corridorRight: 0, whipped: 0, scenes: new Set<number>(),
};
const result = playShow({
  spec, port, title,
  stats: endingStats(title.ram, entombedMap.found.empty()),
  band: { top: 166, bottom: 175 },
  out,
  onMontage(scene, _frame, m) {
    const r = m.ram, me = m.capture.sprites.find((s) => s.n === 2);
    seen.scenes.add(scene);
    if (r[0x3230] === 2) seen.won = true;
    if (scene === 0 && me) seen.firstLeft = Math.min(seen.firstLeft, me.x);
    if (scene === 1) { if (me) seen.corridorRight = Math.max(seen.corridorRight, me.x); if (r[0x20cf] === 1) seen.whipped++; }
    if (scene === 2) { seen.bells = Math.max(seen.bells, r[0x6329]); if (r[0x322f] === 1) seen.torch = true; }
    if (scene === 3) seen.statue = Math.max(seen.statue, r[0x37fc]);
    if (scene === 4 && r[0x6291] === 0x1a) seen.pot = true;
    if (scene === 5 && r[0x322c] === 1) seen.book = true;
    if (scene === 6 && r[0x37ff] === 1) seen.cobra = true;
    if (scene === 7 && m.vic[0x15] & 0x80) seen.flash++;
    if (scene === 8 && me) seen.birdLow = Math.min(seen.birdLow, me.y);
    if (scene === 9 && me) seen.outFurthest = Math.min(seen.outFurthest, me.x);
  },
});
const lines = spec.scenes.flatMap((sc) => sc.credits ?? []);
checkShow({ spec, port, title, stats: [], band: { top: 166, bottom: 175 } }, result, lines, PORT_CREDITS, 'ENTOMBED');
check('the montage is eight to twelve places', spec.scenes.length >= 8 && spec.scenes.length <= 12 && spec.scenes.every((sc) => sc.caption !== undefined));
check(`the first chamber: he ran along it to the left (x ${seen.firstLeft})`, seen.firstLeft < 110);
check(`the corridors: he ran along and used the whip (${seen.whipped} frames of it, x ${seen.corridorRight})`, seen.corridorRight > 220 && seen.whipped > 20);
check(`the bells: all five whipped in order (${seen.bells}) and the torch came down`, seen.bells === 5 && seen.torch);
check(`the statue: whipped until it gives ($37FC ${seen.statue})`, seen.statue >= 6);
check('the pots: the right pot gives ($6291 $1A)', seen.pot);
check('the book of the dead: the creatures came for the fruit and it is his ($322C)', seen.book);
check('the cobra: touched with the book, it goes ($37FF)', seen.cobra);
check(`the torch used in the dark chamber (sprite 7's flash shown ${seen.flash} frames)`, seen.flash > 20);
check(`the bird's chamber: he climbed it (his y ${seen.birdLow})`, seen.birdLow < 140);
check(`the way out: he ran for it (x ${seen.outFurthest}) and stopped short: the show never walked out ($3230 not 2)`, seen.outFurthest <= 70 && seen.outFurthest > 50 && !seen.won);
check('the cast has plain names, Pendragon last, and the creatures move', result.figures.length === spec.cast.length && result.figures[result.figures.length - 1].name === 'SIR ARTHUR PENDRAGON' && result.figures.every((f) => f.poses >= 1) && result.figures.filter((f) => f.poses > 1).length >= 4);

// ---- THE END's numbers
{
  const ram = new Uint8Array(title.ram);
  ram.set(Array.from('TIME 1:23 AIR 097', (c) => pendragonCode(c) ?? 0x20), 0x400 + 22 * 40);
  ram[0x37f6] = 3;
  const stats = endingStats(ram, entombedMap.found.empty());
  check(`the numbers under THE END: chambers, junctions, air, time (${stats.join(' | ')})`, stats[0] === 'CHAMBERS ENTERED 0 OF 25' && stats[1].startsWith('JUNCTIONS SEEN 0 OF') && stats[2] === 'AIR LEFT 97 PERCENT' && stats[3] === 'TIME 1:23');
}

// ---- skipping
{
  const input = new Input(nowhere);
  let over = 0;
  const again = new Ending({ host: { renderer: new PixelRenderer(), input, canvas: nowhere }, spec, port, title: () => title, sound: { pushFrame: () => {} }, font: () => new BitmapFont().addDrawn(KIT_GLYPHS), done: () => { over++; } });
  again.start([]);
  for (let i = 0; i < 20; i++) { input.poll(); again.tick(); }
  input.keyDown('Space'); input.poll(); again.tick(); input.keyUp('Space');
  check('a key in the first moment does not skip it', again.active);
  for (let i = 0; i < 120; i++) { input.poll(); again.tick(); }
  input.keyDown('Space'); input.poll(); again.tick(); input.keyUp('Space');
  check('a key after the first moment skips it, back to the title', !again.active && over === 1);
}

// ---- through the front end, as the browser runs it: out of the way out, then the ending; W on the pause screen
const atTitle = (s: PlaySession) => s.p.state.lastWait === 0x98bf;
/** Hold keys for some frames, then let go. */
function hold(s: PlaySession, keys: string[], frames: number) {
  for (const k of keys) s.input.keyDown(k);
  s.tick(frames);
  for (const k of keys) s.input.keyUp(k);
  s.tick(2);
}
/** A save in chamber 1 with the way out open (the ball is in the river), just come in. */
function wayOutOpen() {
  const base = must(bootGame(port, title, spec), 'a new game');
  const g = must(placed(port, base, spec, (ram) => { ram[0x3230] = 1; ram[0x1609] = 0x79; return enterChamber(ram, 1); }), 'chamber 1');
  for (let f = 0; f < 60; f++) { g.m.joy1 = g.m.joy2 = 0x1f; keep(g.m.ram); g.tick(); }
  return must(g.save(), 'a save');
}
/** Up to the door and out. */
function walkOut(s: PlaySession) {
  hold(s, ['ArrowUp'], 30);
  hold(s, ['ArrowLeft'], 200);
}
{
  const save = wayOutOpen();
  const s = await PlaySession.launch(run, 'entombed', save, keep);
  check('ENHANCED: not won yet, the flag is not kept', !won(s.ram) && !readWon('entombed'));
  walkOut(s);
  check(`he walked out ($3230 ${must(s.ram, 'ram')[0x3230]}): won, and kept`, readWon('entombed'));
  let began = -1;
  for (let f = 0; f < 4000 && began < 0; f++) { s.tick(); if (s.p.ending?.active) began = f; }
  check('the game\'s own end ("congratulations") is over before the ending (the title is up)', began > 0 && atTitle(s));
  let ended = -1;
  for (let f = 0; f < 9000 && ended < 0; f++) { s.tick(); if (!s.p.ending?.active) ended = f; }
  s.tick(30);
  check('the ending ran and the game is at the title again', ended > 0 && atTitle(s));

  // W on the pause screen, once won
  const w = await PlaySession.launch(run, 'entombed', save, keep);
  keepWon('entombed');
  w.press('KeyP');
  check('the pause screen is up', w.p.frontEnd.paused);
  w.press('KeyW');
  check('W watches the ending (the flag kept above)', !!w.p.ending?.active);
  for (let f = 0; f < 9000 && w.p.ending?.active; f++) w.tick();
  w.tick(30);
  check('and back at the title', !w.p.ending?.active && atTitle(w));

  // ORIGINAL: the game as it was, no ending (and none offered)
  useMemoryStorage(new Map());
  const o = await PlaySession.launch(run, 'entombed', save, keep, false);
  walkOut(o);
  let any = false;
  for (let f = 0; f < 2500; f++) { o.tick(); if (o.p.ending?.active) any = true; }
  check('ORIGINAL: no ending after the win (the game goes to its title as it did)', !any && atTitle(o));
}

// ---- what a win is, and the flag
{
  const ram = new Uint8Array(65536);
  useMemoryStorage(new Map());
  check('not won with the way open ($3230 1)', (ram[0x3230] = 1, !won(ram)));
  ram[0x3230] = 2;
  check('won: he is out ($3230 2)', won(ram));
  check('the won flag is not kept until a win', !readWon('entombed'));
  keepWon('entombed');
  check('the won flag is kept', readWon('entombed'));
}
finish();
