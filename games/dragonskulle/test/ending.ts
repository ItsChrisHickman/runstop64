/**
 * Dragonskulle's ending (games/shared/native/ending.ts, src/ending.ts), headless, with the real game under it:
 *
 *  1. the whole show runs from the first frame to THE END and back to the title, each scene of the montage the game itself running
 *     on a new game of its own, Pendragon driven by the joystick alone: the cloak dug up, the shovel taken by a stone, the bridge
 *     crossed, stones thrown at the dragon and at the eyes, a grave dug, the cloak on under the falling rocks and in the gas, stones
 *     at the skull stopped short of its last hit (the game's own end follows that); no scene leaves its screen;
 *  2. the credits (games/shared/test/ending-kit.ts): every line shown in full in the empty band at the top of the picture, under the
 *     caption on the status panel (which a new game's score and faces would otherwise fill), in every scene;
 *  3. every figure of the cast recorded; the numbers under THE END;
 *  4. what a win is ($342B $FF: the skull's last hit), and through the front end: the win keeps `won`, the game's own end
 *     is over before the ending, the ending runs and ends at the title; W on the pause screen once won; none in ORIGINAL;
 *  5. any key skips it, after the first moment and not before.
 *
 *   nice -n 15 node tools/test.mjs games/dragonskulle/test/ending.ts [out-dir]
 *
 * With an out-dir: PNG frames of each scene, of the credits, of the parade and of THE END.
 */
import fs from 'node:fs';
import { BitmapFont, Input, KIT_GLYPHS, PixelRenderer, unpackState } from 'c64kit';
import { Ending, PORT_CREDITS, keepWon, readWon } from '../../shared/native/ending';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { checkShow, playShow } from '../../shared/test/ending-kit';
import { must } from '../../shared/test/must';
import { PlaySession } from '../../shared/test/play-session';
import { enter } from '../re/rules/lab';
import { dragonskulleShow, run } from '../src/main';
import { endingStats, won } from '../src/ending';
import { dragonskulleMap } from '../src/map';
import { port } from '../src/native';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
useMemoryStorage();

const titleBytes = fs.readFileSync('games/dragonskulle/assets/dragonskulle-title.state');
stubFetch(titleBytes);
const title = unpackState(new Uint8Array(titleBytes));
const spec = dragonskulleShow;
/** Where the credits stand (the blank rows of the status panel, at the top in the layout), with a pixel round them. */
const BAND = { top: 11, bottom: 20 };
const keep = (ram: Uint8Array) => { ram[0x1248] = 0; ram[0x123e] = 0x14; ram[0x3432] = 0; };

// ---- the show, from the start to the end
const seen = {
  cell: new Map<number, string>(), left: new Set<number>(),
  cloak: new Map<number, number>(), throws: new Map<number, number>(), jumps: new Map<number, number>(),
  highestHit: 0, shovel: false, dug: false, grave: false, crossed: false, won: false, boss: 0,
};
let lastThrow = 0, lastAir = 0;
const result = playShow({
  spec, port, title, titleTune: true,
  stats: endingStats(title.ram, dragonskulleMap.found.empty()),
  // (the credits at y 12 to 19 in the two blank rows of the status panel at the top, with a pixel of room round them)
  band: BAND,
  out,
  onMontage(scene, frame, m) {
    const r = m.ram;
    const cell = `${r[0x20a8]},${r[0x20a9]}`;
    if (!seen.cell.has(scene)) seen.cell.set(scene, cell); else if (seen.cell.get(scene) !== cell) seen.left.add(scene);
    if (won(r)) seen.won = true;
    if (frame === 1) { lastThrow = 0; lastAir = 0; }
    if ((r[0x3417] === 1 || r[0x3417] === 2)) seen.cloak.set(scene, (seen.cloak.get(scene) ?? 0) + 1);
    // a stone leaves his hand ($1FEF 1 while he throws), a jump ($3425 not 0)
    if (r[0x1fef] === 1 && lastThrow === 0) seen.throws.set(scene, (seen.throws.get(scene) ?? 0) + 1);
    lastThrow = r[0x1fef];
    if (r[0x3425] !== 0 && lastAir === 0) seen.jumps.set(scene, (seen.jumps.get(scene) ?? 0) + 1);
    lastAir = r[0x3425];
    if (scene === 0 && r[0x342e] === 1) seen.dug = true;
    if (scene === 1 && r[0x342f] === 1) seen.shovel = true;
    if (scene === 3 && m.vic[5] < 125) seen.crossed = true;
    if (scene === 4) seen.highestHit = Math.max(seen.highestHit, r[0x676f]);
    if (scene === 5 && r[0x343d] === 1) seen.grave = true;
    if (scene === 10) seen.boss = Math.max(seen.boss, r[0x6795]);
  },
});
const lines = spec.scenes.flatMap((sc) => sc.credits ?? []);
checkShow({ spec, port, title, stats: [], band: BAND }, result, lines, PORT_CREDITS, 'DRAGONSKULLE');
const names = spec.scenes.map((sc) => sc.caption ?? '');
check('the places are named on the status panel, in the lettering it has (no more than its 23 letters)', names.every((n) => n.length > 0 && n.length <= 23 && /^[A-Z ]+$/.test(n)));
check(`no scene left its screen (${seen.left.size} did)`, seen.left.size === 0);
check('the show never won the game it shows (the skull is stopped short of its last hit)', !seen.won && seen.boss < 6);
check('the beach: he dug up the cloak (four digs on the spot, the game\'s own count)', seen.dug);
check('the shovel room: a stone thrown facing up took the shovel', seen.shovel);
check('the river: he crossed the bridge (its wizards counted, the way across open)', seen.crossed);
check(`the dragon: stones thrown (${seen.throws.get(4) ?? 0}), and one counted on its head (${seen.highestHit})`, (seen.throws.get(4) ?? 0) >= 6 && seen.highestHit >= 1);
check('the graves: a good grave dug (its sprite and sound)', seen.grave);
check(`the cloak on under the falling rocks (${seen.cloak.get(6) ?? 0} frames) and in the gas (${seen.cloak.get(9) ?? 0})`, (seen.cloak.get(6) ?? 0) > 300 && (seen.cloak.get(9) ?? 0) > 200);
check(`the eyes: stones thrown both ways (${seen.throws.get(7) ?? 0})`, (seen.throws.get(7) ?? 0) >= 3);
check(`jumps along the caves (${seen.jumps.get(2) ?? 0}) and the lake (${seen.jumps.get(8) ?? 0})`, (seen.jumps.get(2) ?? 0) >= 1 && (seen.jumps.get(8) ?? 0) >= 1);
check(`the skull: stones thrown at it (${seen.throws.get(10) ?? 0})`, (seen.throws.get(10) ?? 0) >= 3);
check('the cast is the island\'s creatures with plain names, Pendragon last', result.figures.length === spec.cast.length && result.figures[result.figures.length - 1].name === 'SIR ARTHUR PENDRAGON' && result.figures.every((f) => f.poses >= 1));
check('the creatures move: the dragon and the wizard have more than one picture', result.figures.filter((f) => f.poses > 1).length >= 4);

// ---- THE END's numbers
{
  const ram = new Uint8Array(65536);
  ram.set([0x3a, 0x31, 0x32, 0x33, 0x34, 0x35], 0x400 + 22 * 40 + 13); // 012345
  ram[0x1248] = 3; // one life gone
  ram[0x72b0] = 1; ram[0x72b1] = 1; ram[0x343a] = 0xff;
  ram.fill(1, 0x6e20, 0x6e20 + 20);
  const stats = endingStats(ram, { cells: ['1,0', '2,0'], at: {}, last: null, links: [] });
  check('the numbers under THE END: score, lives, dragons, bridges, screens', stats.join('|') === 'SCORE 012345|LIVES LEFT 4 OF 5|DRAGONS SLAIN 2 OF 4|BRIDGES OPENED 1 OF 3|SCREENS SEEN 2 OF 20');
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

// ---- through the front end, as the browser runs it: the win, then the ending; W on the pause screen
const atTitle = (s: PlaySession) => [0x9951, 0x995c, 0x9960].includes(s.p.state.lastWait ?? 0);
{
  // the final room, the skull's last hit struck ($6795 $FF: its death, the game's own end follows)
  const s = await PlaySession.launch(run, 'dragonskulle', enter(9, 23), keep);
  s.tick(30);
  must(s.ram, 'ram')[0x6795] = 0xff;
  check('ENHANCED: not won yet, the flag is not kept', !readWon('dragonskulle'));
  let began = -1;
  for (let f = 0; f < 3000 && began < 0; f++) { s.tick(); if (s.p.ending?.active) began = f; }
  check('the game was won: kept, and its own end is over before the ending (the title is up)', readWon('dragonskulle') && began > 0 && atTitle(s));
  let ended = -1;
  for (let f = 0; f < 9000 && ended < 0; f++) { s.tick(); if (!s.p.ending?.active) ended = f; }
  s.tick(30);
  check('the ending ran and the game is at the title again', ended > 0 && atTitle(s));

  // W on the pause screen, once won
  const w = await PlaySession.launch(run, 'dragonskulle', enter(4, 2), keep);
  keepWon('dragonskulle');
  w.press('KeyP');
  check('the pause screen is up', w.p.frontEnd.paused);
  w.press('KeyW');
  check('W watches the ending (the flag kept above)', !!w.p.ending?.active);
  for (let f = 0; f < 9000 && w.p.ending?.active; f++) w.tick();
  w.tick(30);
  check('and back at the title', !w.p.ending?.active && atTitle(w));

  // ORIGINAL: the game as it was, no ending (and none offered)
  useMemoryStorage(new Map());
  const o = await PlaySession.launch(run, 'dragonskulle', enter(9, 23), keep, false);
  o.tick(30);
  must(o.ram, 'ram')[0x6795] = 0xff;
  let any = false;
  for (let f = 0; f < 2500; f++) { o.tick(); if (o.p.ending?.active) any = true; }
  check('ORIGINAL: no ending after the win (the game goes to its title as it did)', !any && atTitle(o));
}

// ---- what a win is, and the flag
{
  const ram = new Uint8Array(65536);
  useMemoryStorage(new Map());
  check('not won before the skull goes', !won(ram));
  ram[0x342b] = 1;
  check('a screen\'s own setup ($342B 1) is not a win', !won(ram));
  ram[0x342b] = 0xff;
  check('won: the skull\'s last hit ($342B $FF, as the final room sets it and the main loop runs the end from it)', won(ram));
  check('the won flag is not kept until a win', !readWon('dragonskulle'));
  keepWon('dragonskulle');
  check('the won flag is kept', readWon('dragonskulle'));
}
finish();
