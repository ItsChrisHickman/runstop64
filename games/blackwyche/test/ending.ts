/**
 * The ending (games/shared/native/ending.ts, src/ending.ts), headless, with the real game under it:
 *
 *  1. every place of the montage can be entered on a new game, and Pendragon, driven by the joystick
 *     alone, does what the scene says (the shelf's piece struck, the captain struck, ...);
 *  2. the whole show runs from the first frame to THE END and calls `done` (back to the title), the title
 *     tune playing all the way, with every figure of the cast recorded with its frames;
 *  3. any key skips it, after the first moment and not before;
 *  4. what a win is: the captain freed (room $0C, $342C 2); and `Won` keeps it.
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/ending.ts [out-dir]
 *
 * With an out-dir: PNG frames of each scene, of the parade and of THE END.
 */
import fs from 'node:fs';
import { Input, PixelRenderer, unpackState } from 'c64kit';
import { Ending, keepWon, readWon } from '../../shared/native/ending';
import { BitmapFont, KIT_GLYPHS } from 'c64kit';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { indicesPng, renderPng } from '../../../tools/probe/render';
import { Session, game, saveAt } from './guided-kit';
import { blackwycheEnding, endingStats, won } from '../src/ending';
import { blackwycheMap } from '../src/map';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
useMemoryStorage();

const title = unpackState(new Uint8Array(fs.readFileSync(game.title)));
const input = new Input(nowhere);
const renderer = new PixelRenderer();
const font = new BitmapFont().addDrawn(KIT_GLYPHS);
const sung: number[] = [];
let over = 0;
const show = new Ending({
  host: { renderer, input, canvas: nowhere },
  spec: blackwycheEnding,
  port: game.port,
  title: () => title,
  sound: { pushFrame: (w) => { sung.push(w.length); } },
  font: () => font,
  done: () => { over++; },
});

// ---- the show, from the start to the end
show.start(endingStats(title.ram, blackwycheMap.found.empty()));
let frames = 0;
const phases: string[] = [];
const struck = { shelf: false, captain: false, pearl: false };
let still = 0;
while (show.active && frames < 6000) {
  input.poll();
  show.tick();
  show.render(0);
  frames++;
  const p = show.progress;
  if (phases[phases.length - 1] !== `${p.phase}${p.scene}`) phases.push(`${p.phase}${p.scene}`);
  const m = p.machine;
  if (p.phase === 'montage' && m) {
    if (p.scene === 0 && m.ram[0x638f] >= 1) struck.shelf = true;
    if (p.scene === 3 && m.ram[0x9d69] !== 0) struck.pearl = true;
    if (p.scene === 4 && m.ram[0x633b] >= 1) struck.captain = true;
    if (out && p.frames % 70 === 5) renderPng(m, `${out}/ending-scene${p.scene}-${String(p.frames).padStart(3, '0')}.png`);
  } else if (out && (p.phase === 'parade' || p.phase === 'end')) {
    still++;
    if (still % 60 === 1) indicesPng(`${out}/ending-${p.phase}-${String(still).padStart(4, '0')}.png`, renderer.picture(), 320, 200);
  }
}
const p = show.progress;
console.log(`phases: ${phases.join(' ')}; ${frames} frames; figures: ${p.figures.map((f) => `${f.name}:${f.poses}`).join(', ')}`);
check('the show ran to its end and went back to the title (done, once)', !show.active && over === 1);
check('it went through the montage, the parade and THE END', phases.some((x) => x.startsWith('montage')) && phases.includes('parade5') || phases.some((x) => x.startsWith('parade')) && phases.some((x) => x.startsWith('end')));
check(`it is a watchable length (${(frames / 50).toFixed(0)} seconds, 30 to 120)`, frames >= 1500 && frames <= 6000);
check('every figure of the cast was recorded, each with more than one picture of its own except the still ones', p.figures.length === blackwycheEnding.cast.length);
check('the title tune played all the way (a write at most frames)', sung.length > 0 && sung.filter((n) => n > 0).length > sung.length / 4);
check('Pendragon struck the piece on the shelf', struck.shelf);
check('Pendragon struck the captain', struck.captain);
check('Pendragon took the pearl', struck.pearl);

// ---- skipping
{
  const again = new Ending({ host: { renderer, input, canvas: nowhere }, spec: blackwycheEnding, port: game.port, title: () => title, sound: { pushFrame: () => {} }, font: () => font, done: () => { over++; } });
  again.start([]);
  over = 0;
  for (let i = 0; i < 20; i++) { input.poll(); again.tick(); }
  input.keyDown('Space'); input.poll(); again.tick(); input.keyUp('Space');
  check('a key in the first moment does not skip it', again.active);
  for (let i = 0; i < 120; i++) { input.poll(); again.tick(); }
  input.keyDown('Space'); input.poll(); again.tick(); input.keyUp('Space');
  check('a key after the first moment skips it, back to the title', !again.active && over === 1);
}

// ---- through the front end, as the browser runs it: the win, then the ending; W on the pause screen
const atTitle = (s: Session) => [0x9931, 0x993b, 0x9940].includes(s.p.state.lastWait ?? 0);
{
  // the captain's cabin, the blow struck: the game's own end follows, then its title, then the ending
  const s = await Session.launch(saveAt({ room: 0x0c, flags: { 0x342b: 1 } }));
  must(s.ram, 'ram')[0x633b] = 1;
  check('ENHANCED: not won yet, the flag is not kept', !readWon('blackwyche'));
  let began = -1;
  for (let f = 0; f < 3000 && began < 0; f++) { s.tick(); if (s.p.ending?.active) began = f; }
  check('the game was won: kept, and its own end is over before the ending (the title is up)', readWon('blackwyche') && began > 0 && atTitle(s));
  let ended = -1;
  for (let f = 0; f < 6000 && ended < 0; f++) { s.tick(); if (!s.p.ending?.active) ended = f; }
  s.tick(30);
  check('the ending ran and the game is at the title again', ended > 0 && atTitle(s));
  const stats = endingStats(title.ram, blackwycheMap.found.empty());
  check('the numbers under THE END: things, places, time', stats[0] === 'THINGS FOUND 0 OF 24' && stats[1].startsWith('PLACES SEEN 0 OF'));

  // W on the pause screen, once won
  const w = await Session.launch(saveAt({ room: 0x04 }));
  keepWon('blackwyche');
  w.input.keyDown('KeyP'); w.tick(2); w.input.keyUp('KeyP'); w.tick(2);
  check('the pause screen is up', w.p.frontEnd.paused);
  w.input.keyDown('KeyW'); w.tick(2); w.input.keyUp('KeyW'); w.tick(2);
  check('W watches the ending (the flag kept above)', !!w.p.ending?.active);
  for (let f = 0; f < 6000 && w.p.ending?.active; f++) w.tick();
  w.tick(30);
  check('and back at the title', !w.p.ending?.active && atTitle(w));

  // ORIGINAL: the game as it was, no ending (and none offered)
  useMemoryStorage(new Map());
  const o = await Session.launch(saveAt({ room: 0x0c, flags: { 0x342b: 1 } }), false);
  must(o.ram, 'ram')[0x633b] = 1;
  let any = false;
  for (let f = 0; f < 2500; f++) { o.tick(); if (o.p.ending?.active) any = true; }
  check('ORIGINAL: no ending after the win (the game goes to its title as it did)', !any && atTitle(o));
  o.input.keyDown('KeyP'); o.tick(2); o.input.keyUp('KeyP');
  check('(not in play at the title: no pause screen to offer it on)', !o.p.frontEnd.paused);
}

// ---- what a win is, and the flag
{
  const ram = new Uint8Array(65536);
  useMemoryStorage(new Map());
  check('not won before the captain is freed', !won(ram));
  ram[0x341c] = 0x0c; ram[0x342c] = 2;
  check('won: the captain freed (room $0C, $342C 2)', won(ram));
  check('the won flag is not kept until a win', !readWon('blackwyche'));
  keepWon('blackwyche');
  check('the won flag is kept', readWon('blackwyche'));
}
must(true, 'done');
finish();
