/**
 * Thing on a Spring's ending (games/shared/native/ending.ts, src/ending.ts), headless, with the real game under it:
 *
 *  1. the whole show runs from the first frame to THE END and back to the title, every scene of the montage the game itself running on a
 *     new game of its own, Thing steered by the joystick alone along a way found by playing (re/ways.json): each takes him through its
 *     room into the next screen as the game's own travel would; one takes a jigsaw piece, one an oil can; the last is the goblin's room;
 *  2. the credits: every line typed over the montage in the black band at the foot of the picture, in the credit colour and nothing
 *     else, the band empty before the text in every scene; the cast recorded, Thing last; the title tune (Rob Hubbard's) all the way;
 *  3. what a win is ($CD is 2: the goblin touched), and through the front end as the browser runs it: a save with the goblin touched,
 *     the game's own end over before the ending, the ending run to the title; W on the pause screen once won; none in ORIGINAL;
 *  4. any key skips it, after the first moment and not before.
 *
 *   nice -n 15 node tools/test.mjs games/thingonaspring/test/ending.ts [out-dir]
 *
 * With an out-dir: PNG frames of each scene, of the credits, of the parade and of THE END.
 */
import fs from 'node:fs';
import { BitmapFont, Input, KIT_GLYPHS, PixelRenderer, unpackState, type MachineState } from 'c64kit';
import { Ending, PORT_CREDITS, bootGame, keepWon, placed, readWon } from '../../shared/native/ending';
import { GAMES } from '../../shared/native/test/games';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { checkShow, playShow } from '../../shared/test/ending-kit';
import { must } from '../../shared/test/must';
import { PlaySession } from '../../shared/test/play-session';
import { endingStats, screen, thingEnding, won } from '../src/ending';
import { makeMap } from '../src/map';
import { port } from '../src/native';
import { run } from '../src/main';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
useMemoryStorage();

const game = GAMES.thingonaspring;
const titleBytes = fs.readFileSync(game.title);
stubFetch(titleBytes);
const title = unpackState(new Uint8Array(titleBytes));
const spec = thingEnding;
const keep = (ram: Uint8Array) => { ram[0x8f] = 0xff; };
const map = makeMap();

// ---- the show, from the start to the end
/** The screen each scene's way ends in ("level.screen"), and the places the show had him come to. */
const GOES: Record<number, string> = { 0: '0.6', 2: '0.4', 5: '3.4' };
const seen = { reached: new Set<number>(), piece: false, can: false, won: false, scenes: new Set<number>(), travelled: new Map<number, number[]>() };
const result = playShow({
  spec, port, title,
  stats: endingStats(title.ram, map.found.empty()),
  band: { top: 192, bottom: 199 },
  out,
  onMontage(scene, _frame, m) {
    const r = m.ram;
    seen.scenes.add(scene);
    if (`${r[0x5f]}.${r[0x5e]}` === GOES[scene]) seen.reached.add(scene);
    if (scene === 3 && r[0x3a5] & 0x80) seen.piece = true;
    if (scene === 1 && r[0x3b0] & 0x80) seen.can = true;
    const me = m.capture.sprites.find((sp) => sp.n === 0), t = seen.travelled.get(scene) ?? [999, 0];
    if (me) seen.travelled.set(scene, [Math.min(t[0], me.x + r[0x19] * 8), Math.max(t[1], me.x + r[0x19] * 8)]);
    if (r[0xcd] === 2) seen.won = true;
  },
});
const lines = spec.scenes.flatMap((sc) => sc.credits ?? []);
checkShow({ spec, port, title, stats: [], band: { top: 192, bottom: 199 } }, result, lines, PORT_CREDITS, 'THING ON A SPRING');
check('the montage is eight to twelve places', spec.scenes.length >= 8 && spec.scenes.length <= 12);
check(`each corridor run takes him through into the next screen (${[...seen.reached].sort().join(' ')} of ${Object.keys(GOES).join(' ')})`, Object.keys(GOES).every((k) => seen.reached.has(Number(k))));
check('he runs through the rooms with a way (the scroll and his place move on)', [1, 3, 4, 6].every((i) => { const t = seen.travelled.get(i); return !!t && t[1] - t[0] > 40; }));
check('the jigsaw piece is taken ($3A5 bit 7)', seen.piece);
check('the oil can is taken ($3B0 bit 7)', seen.can);
check('the show never ended the game it shows (the goblin is not touched)', !seen.won);
check('the cast is the factory\'s creatures with plain names, Thing last, and they move', result.figures.length === spec.cast.length && result.figures[result.figures.length - 1].name === 'THING' && result.figures.filter((f) => f.poses > 1).length >= 3);

// ---- THE END's numbers
{
  const ram = new Uint8Array(65536);
  ram[0x8f] = 128;
  for (let r = 0; r < 9; r++) ram[0x39f + r] = 0x80;
  const stats = endingStats(ram, { screens: { '0.1': ['L'], '0.2': ['L'] }, things: {}, last: null });
  check(`the numbers under THE END: pieces, oil, screens (${stats.join(' | ')})`, stats[0] === 'PIECES FOUND 9 OF 9' && stats[1] === 'OIL LEFT 50 PERCENT' && stats[2] === 'SCREENS SEEN 2 OF 32');
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

// ---- through the front end, as the browser runs it: the goblin touched, then the ending; W on the pause screen
/** The title's raster interrupt is the vector (the game is at its title). */
const atTitle = (s: PlaySession) => (s.ram[0xfffe] | (s.ram[0xffff] << 8)) === 0x7254;
/** A save in the goblin's room with every piece found; with `touched`, the goblin's stop just touched ($59EB: $CD 2, $D1 $FF). */
function inGoblinsRoom(touched: boolean): MachineState {
  const base = must(bootGame(port, title, spec), 'a new game');
  const g = must(placed(port, base, spec, screen(3, 8, 'L', (ram) => { ram[0xcc] = 0; })), 'the goblin\'s room');
  const got: { snap: MachineState | null } = { snap: null };
  g.onWait = (site) => {
    const r = g.m.ram;
    if (site !== port.mainLoopWait || r[0x63] || r[0x5d] || r[0x1c]) return;
    if (touched) { r[0xcd] = 2; r[0xd1] = 0xff; }
    got.snap = g.save() ?? got.snap;
  };
  for (let f = 0; f < 200; f++) { g.m.joy1 = g.m.joy2 = 0x1f; keep(g.m.ram); g.tick(); }
  return must(got.snap, 'a save');
}
{
  const save = inGoblinsRoom(true);
  check('ENHANCED: not won yet, the flag is not kept', !readWon('thingonaspring'));
  const s = await PlaySession.launch(run, 'thingonaspring', save, keep);
  s.tick(10);
  check('the goblin touched ($CD 2): the win is kept', readWon('thingonaspring'));
  let began = -1;
  // (the game's end: "PRESS Q TO QUIT OR C TO CONTINUE"; then the high score's name if it qualifies: RETURN puts it in)
  for (let f = 0; f < 6000 && began < 0; f++) { s.tick(); if (f > 300 && f % 100 === 0) { s.input.keyDown(f % 200 === 0 ? 'KeyQ' : 'Enter'); s.tick(10); s.input.keyUp(f % 200 === 0 ? 'KeyQ' : 'Enter'); } if (s.p.ending?.active) began = f; }
  check('the game\'s own end is over before the ending (the title is up)', began > 0 && atTitle(s));
  let ended = -1;
  for (let f = 0; f < 9000 && ended < 0; f++) { s.tick(); if (!s.p.ending?.active) ended = f; }
  s.tick(30);
  check('the ending ran and the game is at the title again', ended > 0 && atTitle(s));

  // W on the pause screen, once won
  const w = await PlaySession.launch(run, 'thingonaspring', inGoblinsRoom(false), keep);
  keepWon('thingonaspring');
  w.press('KeyP');
  check('the pause screen is up', w.p.frontEnd.paused);
  w.press('KeyW');
  check('W watches the ending (the flag kept above)', !!w.p.ending?.active);
  for (let f = 0; f < 9000 && w.p.ending?.active; f++) w.tick();
  w.tick(30);
  check('and back at the title', !w.p.ending?.active && atTitle(w));

  // ORIGINAL: the game as it was, no ending (and none offered)
  useMemoryStorage(new Map());
  const o = await PlaySession.launch(run, 'thingonaspring', save, keep, false);
  let any = false;
  for (let f = 0; f < 4000; f++) { o.tick(); if (f > 300 && f % 100 === 0) { o.input.keyDown(f % 200 === 0 ? 'KeyQ' : 'Enter'); o.tick(10); o.input.keyUp(f % 200 === 0 ? 'KeyQ' : 'Enter'); } if (o.p.ending?.active) any = true; }
  check('ORIGINAL: no ending after the win (the game goes to its title as it did)', !any);
}

// ---- what a win is, and the flag
{
  const ram = new Uint8Array(65536);
  useMemoryStorage(new Map());
  check('not won before the goblin is touched', !won(ram));
  ram[0xcd] = 2;
  check('won: the goblin touched ($CD 2)', won(ram));
  check('the won flag is not kept until a win', !readWon('thingonaspring'));
  keepWon('thingonaspring');
  check('the won flag is kept', readWon('thingonaspring'));
}
finish();
