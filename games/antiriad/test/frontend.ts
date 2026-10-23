/**
 * The front end, headless (c64kit stood in by test/kit.ts): the title, a new game, walking
 * into the next room (autosave), the pause screen and its map (rooms Tal can't travel to as he
 * is now drawn dark, and not offered), travel back by the map, ENHANCED (on unless chosen off;
 * E changes it) and its two buttons (keys and touch), the game over and CONTINUE?, and R (a
 * restart): the game so far kept as the previous save, even with a new game started at once.
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/frontend.ts
 */
import { Input, PixelRenderer } from 'c64kit';
import { COL, MAP_BOX } from '../../shared/native/pause';
import { sidLog } from '../../shared/test/kit';
import { run } from '../src/main';
import { V } from '../src/vars';
import { antiriadMap, entriesOf, roomAt, roomName } from '../src/map';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { readSaves } from '../../shared/saves';
import { check, finish } from '../../shared/test/check';

const store = useMemoryStorage();

const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(3); input.keyUp(code); tick(2); };
const g = () => p.game;

tick(300);
check('the title sequence runs (title mode, the music playing)', g().onTitle && sidLog.writes > 1000);
const titleText = String.fromCharCode(...g().titleText.filter((c) => c >= 0x20 && c < 0x60));
check('the credits page names our keys: SPACE OR FIRE TO PLAY', titleText.includes('SPACE OR FIRE TO PLAY') && !titleText.includes('PRESS FIRE'));
tap('Space');
let n = 0;
while (!g().playing && n++ < 300) tick();
check(`Space: the music fades, the game starts (room ${roomName(g().ram[V.room])})`, g().playing && [0x38, 0x44].includes(g().ram[V.room]));
tick(150);
check('a save on coming into the first room', store.has('antiriad.save.v2'));
const first = g().ram[V.room];
// walk left until the room changes
input.keyDown('ArrowLeft');
n = 0;
while (g().ram[V.room] === first && n++ < 1500) tick();
input.keyUp('ArrowLeft');
tick(30);
const second = g().ram[V.room];
check(`walking left leaves the first room (now ${roomName(second)})`, second !== first);
const found = p.state.found, rooms = found.rooms, onFoot = entriesOf(found, false);
check('the map noted both rooms and where Tal came into them', rooms.includes(first) && rooms.includes(second) && !!onFoot[String(first)] && !!onFoot[String(second)]);
// a room seen only in the armour (as if flown through): not one to travel to on foot
const flown = 0x3f;
rooms.push(flown);
entriesOf(found, true)[String(flown)] = { x: 0x80, y: 0x40, high: 0 };
tap('KeyP');
check('P: the pause screen', p.state.paused);
const frames = g().frames;
tick(20);
check('the game waits while paused', g().frames === frames);
const colourOf = (room: number) => { const at = roomAt(MAP_BOX, room); return renderer.screen.pixels[(at.y + 1) * 320 + at.x + 1]; };
check(`the map: a room Tal has been in on foot is lit (${colourOf(first)})`, colourOf(first) === COL.grey);
check(`the map: a room only the armour has been in is dark on foot (${colourOf(flown)})`, colourOf(flown) === COL.dgrey);
const places = antiriadMap.places?.(MAP_BOX, g(), found).map((pl) => Number(pl.id)) ?? [];
check(`the map offers only rooms to travel to as he is (${places.map(roomName).join(' ')})`, places.includes(first) && places.includes(second) && !places.includes(flown));
// in the armour it's the other way round
const suitWas = g().ram[V.inSuit];
g().ram[V.inSuit] = 0x80;
const inArmour = antiriadMap.places?.(MAP_BOX, g(), found).map((pl) => Number(pl.id)) ?? [];
g().ram[V.inSuit] = suitWas;
check(`in the armour, the map offers only rooms the armour has been in (${inArmour.map(roomName).join(' ')})`, inArmour.includes(flown) && !inArmour.includes(first));
// ENHANCED: on unless chosen off; E changes it (and it's remembered)
check('ENHANCED is on to begin with', p.state.enhanced);
tap('KeyE');
check('E on the pause screen: ORIGINAL', !p.state.enhanced && (store.get('antiriad.assist') ?? '').includes('"enhanced":false'));
tap('KeyE');
check('E again: ENHANCED', p.state.enhanced);
tap('ArrowRight');
tap('Enter');
tick(40);
check(`picking the first room on the map and Enter: back in play, in ${roomName(first)}`, !p.state.paused && g().ram[V.room] === first);
// the buttons: touch has FIRE and JUMP (and CELL, ENHANCED's stored recharge cells); with ENHANCED, Z (the touch JUMP) jumps and doesn't fire
const labels = p.touch.buttons.map((b) => `${b.label}=${b.key}`).join(' ');
check(`touch: FIRE, JUMP and CELL buttons (${labels})`, labels === 'FIRE=Space JUMP=KeyZ CELL=KeyC');
tick(60);
// (after travel Tal faces out of the screen, from where neither the original's up nor its fire
// jumps: he's turned to face left first)
const jumps = (code: string) => {
  input.keyDown('ArrowLeft'); tick(8); input.keyUp('ArrowLeft'); tick(8);
  const before = g().ram[V.anim].toString(16);
  input.keyDown(code);
  let air = false, fired = false;
  for (let i = 0; i < 20; i++) { tick(); air ||= !!(g().ram[V.jumping] & 0x80); fired ||= !(g().m.joy2 & 0x10); }
  input.keyUp(code);
  tick(60);
  return { air, fired, before };
};
const z = jumps('KeyZ');
check(`ENHANCED: Z jumps, and isn't fire (${JSON.stringify(z)})`, z.air && !z.fired);
const space = jumps('Space');
check(`ENHANCED: Space fires, and doesn't jump (${JSON.stringify(space)})`, !space.air && space.fired);
tap('KeyP'); tap('KeyE'); tap('KeyP'); tick(10);
const zO = jumps('KeyZ');
check(`ORIGINAL: Z is the original's one button (fire: ${JSON.stringify(zO)})`, zO.fired);
tap('KeyP'); tap('KeyE'); tap('KeyP'); tick(10);
// ENHANCED: unlimited lives and continues: out of life he is rejuvenated, with none used, never game over
g().ram[V.deaths] = 4;
g().ram[V.life] = 0;
n = 0;
while (g().ram[V.life] < 0x1f && n++ < 1500) tick();
check(`ENHANCED: out of life with the last rejuvenation used: he is rejuvenated, none used up, no game over (deaths ${g().ram[V.deaths]}, life ${g().ram[V.life]})`, g().ram[V.deaths] === 4 && !(g().ram[V.gameOver] & 0x80) && g().ram[V.life] >= 0x1f);
tap('KeyP'); tap('KeyE'); tap('KeyP'); tick(10);
check('ORIGINAL: no unlimited lives', !p.state.enhanced && !g().unlimitedLives());
// the game over: the last rejuvenation used, then no life left
g().ram[V.deaths] = 4;
g().ram[V.life] = 0;
n = 0;
while (!(g().ram[V.gameOver] & 0x80) && n++ < 500) tick();
check('out of life with no rejuvenations left: the game is over', !!(g().ram[V.gameOver] & 0x80));
tick(250);
input.keyDown('Space'); tick(10); input.keyUp('Space');
n = 0;
while (!(g().onTitle && p.state.prompt === 'continue') && n++ < 300) tick();
check('fire: back to the title, which asks CONTINUE?', g().onTitle && p.state.prompt === 'continue');
tap('Enter');
tick(5);
check(`Enter: back in play in the last room entered (${roomName(g().ram[V.room])}), full life, all rejuvenations`, g().playing && g().ram[V.room] === first && g().ram[V.life] === 0x1f && g().ram[V.deaths] === 0);
tap('KeyP'); tap('KeyE'); tap('KeyP'); tick(10); // (back to ENHANCED, the default)
check('and ENHANCED again', p.state.enhanced && g().unlimitedLives());
// R restarts (the original's Q): the game so far is kept as the previous save, as a new game from
// the title keeps it; once after the title has been up a while, once with a new game straight away
for (const wait of [300, 2]) {
  // (into another room first, left as before: a game worth keeping)
  const from = g().ram[V.room];
  input.keyDown('ArrowLeft');
  n = 0;
  while (g().ram[V.room] === from && n++ < 1500) tick();
  input.keyUp('ArrowLeft');
  tick(30);
  const was = readSaves('antiriad').current;
  tap('KeyR');
  n = 0;
  while (!g().onTitle && n++ < 300) tick();
  tick(wait);
  check(`R: the title, the save kept${wait > 25 ? ', ENTER CONTINUE and no CONTINUE? (a restart on purpose)' : ''}`, g().onTitle && was !== null && readSaves('antiriad').current?.data === was.data && (wait < 25 || p.state.prompt === 'title'));
  input.keyDown('Space'); tick(10); input.keyUp('Space');
  check('  Space: NEW GAME? first (a new game over a save asks), the title held', p.state.prompt === 'newGame' && g().onTitle && readSaves('antiriad').current?.data === was?.data);
  tick(2); input.keyDown('Space'); tick(10); input.keyUp('Space'); // (again: yes)
  n = 0;
  while (!(g().playing && readSaves('antiriad').current?.data !== was?.data) && n++ < 600) tick();
  const now = readSaves('antiriad');
  check(`  Space ${wait > 25 ? 'on the title' : 'straight away'}: a new game saving as the current save, the game before it (${was?.rooms} rooms) the previous`, was !== null && now.previous?.data === was.data && now.current !== null && now.current.data !== was.data);
  tick(30);
}
finish();
