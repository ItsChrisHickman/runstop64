/**
 * The Staff of Karnath's ending (games/shared/ending/, src/ending.ts), headless, with the real game under it:
 *
 *  1. the whole show runs from the first frame to THE END and back to the title, each scene of the montage the game itself running
 *     on a new game of its own, Pendragon driven by the joystick alone: FORTHRIN at the knights and the ghost (each struck one put
 *     somewhere else by the game's own code), the castle's rooms run through, a piece laid at the obelisk (BARACATA), the sixteenth
 *     and the staff in its shrine with MENHIR in hand, stopped short of the spell that destroys it (the game's own end follows that);
 *  2. the credits: Karnath's picture has no empty band, so they are typed into the panel's message line in the game's own lettering
 *     (games/shared/test/ending-kit.ts reads it back): blank before the text in every scene, every line said as given;
 *  3. every figure of the cast recorded; the numbers under THE END;
 *  4. what a win is ($6FFF $11: MENHIR at the staff), and through the front end from the abode fixture (the obelisk, a piece carried):
 *     the sixteenth piece laid, MENHIR cast: the win is kept, the game's own end is over before the ending, the ending runs and ends at
 *     the title; W on the pause screen once won; none in ORIGINAL;
 *  5. any key skips it, after the first moment and not before.
 *
 *   nice -n 15 node tools/test.mjs games/karnath/test/ending.ts [out-dir]
 *
 * With an out-dir: PNG frames of each scene, of the credits, of each name in turn and of THE END.
 */
import fs from 'node:fs';
import { BitmapFont, Input, KIT_GLYPHS, PixelRenderer, unpackState } from 'c64kit';
import { keepWon, readWon } from '../../shared/ending/credits';
import { Ending } from '../../shared/ending/machine-reel';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { checkShow, playShow } from '../../shared/test/ending-kit';
import { must } from '../../shared/test/must';
import { PlaySession } from '../../shared/test/play-session';
import { GAMES } from '../../shared/native/test/games';
import { SPELL } from '../src/actions';
import { PORT_LINES, endingStats, karnathEnding, won } from '../src/ending';
import { karnathMap } from '../src/map';
import { port } from '../src/native';
import { run } from '../src/main';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
useMemoryStorage();

const game = GAMES.karnath;
const titleBytes = fs.readFileSync(game.title);
stubFetch(titleBytes);
const title = unpackState(new Uint8Array(titleBytes));
const abode = unpackState(new Uint8Array(fs.readFileSync('games/karnath/test/fixtures/abode-obelisk.state')));
const spec = karnathEnding;
const keep = (ram: Uint8Array) => { ram[0x6ffe] = 100; ram[0x322e] = 0; };

// ---- the show, from the start to the end
const seen = {
  casts: new Map<number, number>(), struck: new Map<number, number>(),
  laid: 0, staff: false, menhir: false, won: false, lost: false, from: new Map<number, string>(),
};
let flying = 0;
let lastAt = new Map<number, { x: number; y: number }>();
const result = playShow({
  spec, port, title,
  stats: endingStats(title.ram, karnathMap.found.empty()),
  band: { top: 0, bottom: 0 },
  out,
  onMontage(scene, frame, m) {
    const r = m.ram;
    if (r[0x6fff] >= 0x11) seen.won = true;
    if (r[0x6ffd] !== 0) seen.lost = true;
    if (frame === 1) { flying = 0; lastAt = new Map(); seen.from.set(scene, `${r[0x3219]}/${r[0x3235]}`); }
    if (r[0x3216] === 1 && flying === 0) seen.casts.set(scene, (seen.casts.get(scene) ?? 0) + 1);
    flying = r[0x3216];
    // a creature struck by the right spell is put somewhere else at once (the game's own code): a sprite jumps far in a frame
    const now = new Map<number, { x: number; y: number }>();
    for (let n = 4; n < 8; n++) if (m.vic[0x15] & (1 << n)) now.set(n, { x: m.vic[n * 2] + (m.vic[0x10] & (1 << n) ? 256 : 0), y: m.vic[n * 2 + 1] });
    if (scene === 0 || scene === 2) for (const [n, c] of now) { const was = lastAt.get(n); if (was && Math.abs(c.x - was.x) > 30) seen.struck.set(scene, (seen.struck.get(scene) ?? 0) + 1); }
    lastAt = now;
    if (scene === 8) seen.laid = Math.max(seen.laid, r[0x6fff]);
    if (scene === 9 && r[0x6fff] === 0x10 && (m.vic[0x15] & 0xe0) === 0xe0) seen.staff = true;
    if (scene === 9 && r[0x322c] === SPELL.menhir) seen.menhir = true;
  },
});
const lines = spec.scenes.flatMap((sc) => sc.credits ?? []);
checkShow({ spec, port, title, stats: [], band: { top: 0, bottom: 0 } }, result, lines, PORT_LINES, 'THE STAFF OF KARNATH');
check('the game names each place itself (its own line above the message), and the show adds none of its own', spec.scenes.every((sc) => sc.caption === undefined) && [...seen.from.values()].length === spec.scenes.length);
check('the show never won the game it shows nor lost it (the staff is stopped short of MENHIR)', !seen.won && !seen.lost);
check(`the lower guard room: FORTHRIN cast at the knights (${seen.casts.get(0) ?? 0}), and a knight struck (${seen.struck.get(0) ?? 0})`, (seen.casts.get(0) ?? 0) >= 5 && (seen.struck.get(0) ?? 0) >= 2);
check(`the servants' quarters: FORTHRIN cast at the ghost (${seen.casts.get(2) ?? 0}), and it struck (${seen.struck.get(2) ?? 0})`, (seen.casts.get(2) ?? 0) >= 5 && (seen.struck.get(2) ?? 0) >= 1);
check(`the obelisk: BARACATA laid the tenth piece (${seen.laid})`, seen.laid === 10);
check('the sixteenth: laid, the staff in its shrine (sprites 5 to 7), MENHIR in hand', seen.staff && seen.menhir);
check('the cast is the castle\'s creatures with plain names (the hero is in every scene, not among them)', result.figures.length === spec.cast.length && result.figures.every((f) => f.poses >= 1));
check('the creatures move: most of them have more than one picture', result.figures.filter((f) => f.poses > 1).length >= 4);

// ---- THE END's numbers
{
  const ram = new Uint8Array(65536);
  ram[0x6fff] = 0x11;
  ram.set([0x3a, 0x39, 0x38], 0x07dc);
  const stats = endingStats(ram, { castle: { cells: {}, rooms: [1, 2, 3], at: {}, ways: [], last: [] } });
  check(`the numbers under THE END: pieces, rooms, energy (${stats.join(' | ')})`, stats[0] === 'PIECES LAID 16 OF 16' && stats[1] === 'ROOMS SEEN 3 OF 23' && stats[2] === 'ENERGY LEFT 98 PERCENT');
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

// ---- through the front end, as the browser runs it: the staff destroyed, then the ending; W on the pause screen
const atTitle = (s: PlaySession) => s.p.state.lastWait === 0x6c85;
/** Hold keys for some frames, then let go. */
function hold(s: PlaySession, keys: string[], frames: number) {
  for (const k of keys) s.input.keyDown(k);
  s.tick(frames);
  for (const k of keys) s.input.keyUp(k);
  s.tick(2);
}
/** From the abode fixture (the obelisk, a piece carried, fifteen laid): up to it, BARACATA at it (the sixteenth), MENHIR at the staff. */
function destroyTheStaff(s: PlaySession) {
  const r = must(s.ram, 'ram');
  r[0x6fff] = 15;
  hold(s, ['ArrowUp'], 80);
  hold(s, ['ArrowRight'], 3);
  s.press('Digit7'); hold(s, ['Space'], 3); s.tick(80);
  s.press('Digit5'); hold(s, ['Space'], 3);
}
{
  const s = await PlaySession.launch(run, 'karnath', abode, keep);
  check('ENHANCED: not won yet, the flag is not kept', !readWon('karnath'));
  destroyTheStaff(s);
  check(`the staff is destroyed ($6FFF ${must(s.ram, 'ram')[0x6fff].toString(16)}): won, and kept`, won(s.ram) && readWon('karnath'));
  let began = -1;
  for (let f = 0; f < 4000 && began < 0; f++) { s.tick(); if (s.p.ending?.active) began = f; }
  check('the game\'s own end is over before the ending (the title is up)', began > 0 && atTitle(s));
  let ended = -1;
  for (let f = 0; f < 9000 && ended < 0; f++) { s.tick(); if (!s.p.ending?.active) ended = f; }
  s.tick(30);
  check('the ending ran and the game is at the title again', ended > 0 && atTitle(s));

  // W on the pause screen, once won
  const w = await PlaySession.launch(run, 'karnath', abode, keep);
  keepWon('karnath');
  w.press('KeyP');
  check('the pause screen is up', w.p.frontEnd.paused);
  w.press('KeyW');
  check('W watches the ending (the flag kept above)', !!w.p.ending?.active);
  for (let f = 0; f < 9000 && w.p.ending?.active; f++) w.tick();
  w.tick(30);
  check('and back at the title', !w.p.ending?.active && atTitle(w));

  // ORIGINAL: the game as it was, no ending (and none offered)
  useMemoryStorage(new Map());
  const o = await PlaySession.launch(run, 'karnath', abode, keep, false);
  destroyTheStaff(o);
  let any = false;
  for (let f = 0; f < 2500; f++) { o.tick(); if (o.p.ending?.active) any = true; }
  check('ORIGINAL: no ending after the win (the game goes to its title as it did)', !any && atTitle(o));
}

// ---- what a win is, and the flag
{
  const ram = new Uint8Array(65536);
  useMemoryStorage(new Map());
  ram[0x6fff] = 0x10;
  check('not won with sixteen pieces laid ($6FFF $10: the staff stands in its shrine)', !won(ram));
  ram[0x6fff] = 0x11;
  check('won: the staff destroyed ($6FFF $11)', won(ram));
  ram[0x6fff] = 0x12;
  check('and as the game restarts ($6FFF $12)', won(ram));
  check('the won flag is not kept until a win', !readWon('karnath'));
  keepWon('karnath');
  check('the won flag is kept', readWon('karnath'));
}
finish();
