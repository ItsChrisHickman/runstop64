/**
 * The front end, headless (c64kit stood in by test/kit.ts): title → intro →
 * play; walking into the next room; the pause screen; travel back by the map;
 * autosave; game over → CONTINUE? → back in the last room.
 *
 *   node frontend.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input } from 'c64kit';
import { indicesPng } from '../../../tools/probe/render';

import { NAME, run } from '../src/main';
import { touchPad } from '../../shared/test/touchpad';
import { sidLog } from './kit';
import { MAP_BOX } from '../../shared/native/pause';
import { Game } from '../src/game';
import { entryOf, starquakeMap } from '../src/map';
import { isRecord } from '../../shared/guards';
import { drawRoom } from '../src/room';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';

// a browser's storage, in memory
const store = useMemoryStorage();

const input = new Input(nowhere);
const renderer = new (await import('c64kit')).PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
/** The line naming the touch controls (yellow, rows 176-183): how much of it is drawn. */
const hintPixels = () => renderer.screen.pixels.subarray(176 * 320, 184 * 320).filter((v) => v === 7).length;
let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
// pictures of the screens (no sprites), if an output folder is given
const outDir = process.argv[2];
const shot = (name: string) => {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  const s = renderer.screen, b = renderer.backdrop;
  const px = new Uint8Array(320 * 200);
  for (let i = 0; i < px.length; i++) px[i] = s.pixels[i] !== 0xff ? s.pixels[i] : b ? b.pixels[i] : renderer.background;
  indicesPng(path.join(outDir, `${name}.png`), px, 320, 200);
};
const TITLE_FLIP = 6 * 50;
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };

tick(60);
shot('1-title');
check('starts on the title, with its music (song 1)', p.state.mode === 'title' && sidLog.song.includes(1));
tick(TITLE_FLIP);
shot('2-credits');
tap('Space');
tick(2);
shot('3-intro');
check('Space: the intro (song 5)', p.state.mode === 'intro' && sidLog.song.at(-1) === 5);
tick(30);
tap('Space');
tick(5);
check('Space again: the game, in room 8, with the effects player (song 6)', p.state.mode === 'play' && p.game.room === 8 && sidLog.song.at(-1) === 6);
tick(100);
shot('4-play');
check('a save on coming into the first room', store.has('starquake.save.v2'));
const g = p.game;
g.lives = [0, 9]; // (lives enough for the walk; the panel shows what it shows)
// walk left until the room changes (down off the rock and away)
let n = 0;
input.keyDown('ArrowLeft');
while (g.room === 8 && n++ < 1500) tick();
input.keyUp('ArrowLeft');
tick(10);
const second = g.room;
check(`walking left leaves room 8 (now ${second})`, second !== 8);
check('the map has noted where BLOB came into both rooms', !!entryOf(p.state.found, 8) && !!entryOf(p.state.found, second));
tap('KeyP');
check('P: the pause screen', p.state.paused);
tick(2);
shot('5-pause');
const before = g.frames;
tick(20);
check('the game waits while paused', g.frames === before);
tap(second >= 24 ? 'ArrowUp' : second < 8 ? 'ArrowRight' : 'ArrowLeft'); // (room 8 on the map, from where BLOB is)
tap('Enter');
tick(3);
check('picking room 8 on the map and Enter: back in play, in room 8', !p.state.paused && g.room === 8);
// touch play: travel by tapping the map to a room with a teleport, walk into it, and tap a destination's name
{
  const t = new Game(); t.room = 31; drawRoom(t); // where room 31's teleport puts BLOB
  const found = p.state.found;
  found.entry = { ...(isRecord(found.entry) ? found.entry : {}), 31: [t.arriveCol, t.arriveRow] };
  g.lo[31 >> 3] |= 0x80 >> (31 & 7);
  input.touch = true;
  tap('KeyP');
  const place = starquakeMap.places(MAP_BOX, g, p.state.found, 0).find((q) => q.id === '31');
  if (!place) throw new Error("room 31 isn't a place on the map");
  input.point(place.x, place.y); tick(2);
  input.point(place.x, place.y); tick(3);
  check(`touch: two taps on room 31 on the map travel there (${g.room})`, !p.state.paused && g.room === 31);
  let n2 = 0;
  input.keyDown('ArrowRight');
  while (!g.asking && n2++ < 200) tick();
  input.keyUp('ArrowRight');
  check('walking into the teleport: its screen asks for a name', g.asking === 'code');
  tick(10);
  shot('8-teleport-touch');
  // ASTRA: picked with the touch controls (the stick, FIRE; the fifth letter ends it), through the touch layer
  const pad = touchPad(input, p.touch, tick);
  pad.stick('up'); pad.stick('up');
  shot('8-teleport-touch-c');
  check(`touch: up twice, C under the cursor, and the line naming our controls drawn (${hintPixels()} yellow pixels)`, hintPixels() > 100);
  pad.stick('down'); pad.stick('down');
  pad.pickName(NAME, 'ASTRA', 4);
  n2 = 0;
  while (g.room === 31 && n2++ < 600) tick();
  check(`tapping A S T R A: teleported to ASTRA's room 40 (${g.room})`, g.room === 40);
  input.touch = false;
}
// ENHANCED (the default): a life lost comes back
check('ENHANCED by default: unlimited lives and full energy on', p.state.enhanced === true);
// game over (in ORIGINAL): run out of energy with the last life
tap('KeyP'); tap('KeyE'); tap('KeyP');
check('E: ORIGINAL', p.state.enhanced === false);
const lastRoom = g.room;
g.lives = [0, 1];
g.energy = 0;
n = 0;
while (p.state.mode === 'play' && n++ < 2000) tick();
check(`out of energy on the last life: game over (${p.state.mode})`, p.state.mode === 'over' && sidLog.song.at(-1) === 2);
tick(120);
shot('6-gameover');
tap('Space');
tick(5);
check(`then the core of heroes (${p.state.mode})`, p.state.mode === 'heroes' || p.state.mode === 'hero');
if (p.state.mode === 'hero') { for (const k of ['KeyR', 'KeyW', 'KeyE', 'KeyR', 'KeyW']) tap(k); tick(20); }
tick(100);
shot('7-heroes');
check('the table of heroes', p.state.mode === 'heroes');
tap('Space');
tick(40);
check('after game over, the title asks CONTINUE?', p.state.mode === 'title' && p.state.prompt === 'continue');
tap('Enter');
tick(5);
check(`Enter: back in play in the last room entered (room ${g.room}), with four lives again (${g.lives[1]})`, p.state.mode === 'play' && g.room === lastRoom && g.lives[0] === 0 && g.lives[1] === 4);
console.log(failures ? `${failures} FAILED` : 'all passed');
process.exit(failures ? 1 : 0);
