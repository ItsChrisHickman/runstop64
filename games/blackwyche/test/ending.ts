/**
 * The ending (games/shared/ending/, src/ending.ts), headless, with the real game under it:
 *
 *  1. every place of the montage can be entered on a new game, and Pendragon, driven by the joystick
 *     alone, does what the scene says (the shelf's piece struck, the captain struck, ...);
 *  2. the whole show runs from the first frame to THE END and calls `done` (back to the title), the title
 *     tune playing all the way, with every figure of the cast recorded with its frames;
 *  3. any key skips it, after the first moment and not before;
 *  4. the credits (games/shared/test/ending-kit.ts): every line of every scene types on over the montage, in the black band
 *     between the picture and the status panel (empty in every scene before the text, only that yellow after it), and all shown;
 *  5. what a win is: the captain freed (room $0C, $342C 2); and `Won` keeps it.
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/ending.ts [out-dir]
 *
 * With an out-dir: PNG frames of each scene, of each name in turn and of THE END.
 */
import fs from 'node:fs';
import { BitmapFont, Input, KIT_GLYPHS, PixelRenderer, unpackState } from 'c64kit';
import { PORT_CREDITS, keepWon, readWon } from '../../shared/ending/credits';
import { Ending } from '../../shared/ending/machine-reel';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { checkShow, playShow } from '../../shared/test/ending-kit';
import { must } from '../../shared/test/must';
import type { C64 } from '../../../packages/c64kit/src/c64/machine';
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
let over = 0;

// ---- the show, from the start to the end
const struck = { shelf: false, captain: false, pearl: false };
// the credits stand in the black band between the picture and the status panel (rows 166 to 173)
const BAND = { top: 166, bottom: 173 };
const show = {
  spec: blackwycheEnding, port: game.port, title, titleTune: true,
  stats: endingStats(title.ram, blackwycheMap.found.empty()),
  band: BAND,
  out,
  onMontage(scene: number, _frame: number, m: C64) {
    if (scene === 0 && m.ram[0x638f] >= 1) struck.shelf = true;
    if (scene === 3 && m.ram[0x9d69] !== 0) struck.pearl = true;
    if (scene === 4 && m.ram[0x633b] >= 1) struck.captain = true;
  },
};
const result = playShow(show);
const allLines = blackwycheEnding.scenes.flatMap((sc) => sc.credits ?? []);
checkShow(show, result, allLines, PORT_CREDITS, 'BLACKWYCHE');
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
  for (let f = 0; f < 9000 && ended < 0; f++) { s.tick(); if (!s.p.ending?.active) ended = f; }
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
  for (let f = 0; f < 9000 && w.p.ending?.active; f++) w.tick();
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
