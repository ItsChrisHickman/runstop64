/**
 * Auf Wiedersehen Monty's front end, headless (c64kit stood in by games/shared/test/kit.ts): the title (F1 music, F7
 * effects, a tap on the menu), fire starts a game in room $48; walking into the next room; the pause screen with the map
 * (rooms seen, where Monty is, the shimmer of a room with everything taken, the picked room's name and what's left);
 * travel back by the map (keys, and taps); autosave and a launch with a save going straight back into play; GAME OVER ->
 * CONTINUE? -> back in the last room (a new game's lives, the score from nothing; after the ending, everything as saved);
 * back to room start; the save a faithful copy of the game (what the room start was); the ORIGINAL/ENHANCED switch and
 * ENHANCED's safe respawn; a moment's grace after a resume; the high score kept; the sound requests reaching the .sid.
 * With an out-dir: stills of the title, the front end's screens, play and the pause map.
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/frontend.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { indicesPng, renderPixels } from '../../../tools/probe/render';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { sidLog } from '../../shared/test/kit';
import { MAP_BOX } from '../../shared/native/pause';
import { unpackSlot } from '../../shared/continue';
import { readSaves } from '../../shared/saves';
import { TRANSPARENT } from '../../../packages/c64kit/src/surface';
import { TABLES } from '../src/data';
import { NEW_GAME_LIVES, SAFE_STEPS } from '../src/game';
import { awmMap, entryOf, roomName } from '../src/map';
import { run, STRIP_Y } from '../src/main';
import { CODEC, parseSave, snapshot } from '../src/save';
import { SOUND } from '../src/sound';
import { START_ROOM } from '../src/program';
import { State } from '../src/tiles';
import { readJson } from '../../shared/guards';
import { check, finish } from '../../shared/test/check';

// a browser's storage, in memory
const store = useMemoryStorage();

const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
const program = p.program;
const must = <T>(v: T | null | undefined, what: string): T => { if (v === null || v === undefined) throw new Error(what); return v; };
const game = () => must(program.game, 'no game');

// stills: the picture as the machine draws it, with the front end's screen over it (the real renderer does the same)
const outDir = process.argv[2];
function shot(name: string) {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  const px = renderPixels(program);
  const over = renderer.screen.pixels;
  for (let i = 0; i < px.length; i++) if (over[i] !== TRANSPARENT) px[i] = over[i];
  indicesPng(path.join(outDir, `${name}.png`), px, 320, 200);
}
const played = (addr: number, a?: number) => sidLog.calls.some(([x, y]) => x === addr && (a === undefined || y === a));

// ---- the title ---------------------------------------------------------------------------------------------
tick(120);
shot('1-title');
check('starts on the title, its tune (0) asked of the music driver', p.state.kind === 'title' && played(SOUND.tune, 0));
input.keyDown('F7'); tick(3); input.keyUp('F7'); tick(3);
check('F7: the sound effects chosen', program.effectsChosen);
input.keyDown('F1'); tick(3); input.keyUp('F1'); tick(3);
check('F1: the music chosen', !program.effectsChosen);
input.point(160, 116); tick(3);
check('touch: a tap on the menu line chooses the other (effects)', program.effectsChosen);
input.point(160, 116); tick(3);
check('and again (music)', !program.effectsChosen);

// ---- a game ------------------------------------------------------------------------------------------------
input.keyDown('Space'); tick(2); input.keyUp('Space');
check(`Space: a game in room $48 (${game().world.room})`, p.state.kind === 'play' && game().world.room === START_ROOM);
check('a new game: the save made on coming into the first room', store.has('awm.save.v2') && p.state.hasSave);
tick(100);
shot('3-play');
const g0 = game();
check('the game starts with its six lives', g0.lives === NEW_GAME_LIVES);

// through the room's way out (it has one, at the top): over the edge, as walking does
g0.lives = 0x8c;
game().monty.y = 2;
tick(4);
const second = game().world.room;
check(`past the top edge: the next room (now $${second.toString(16)})`, second !== START_ROOM);
check('the map has noted where Monty came into both rooms', !!entryOf(p.state.found, START_ROOM) && !!entryOf(p.state.found, second));
tick(60);

// ---- the pause screen and the map ---------------------------------------------------------------------------
tap('KeyP');
check('P: the pause screen', p.state.paused);
tick(3);
shot('4-pause-map');
const before = game().monty.x + game().monty.y * 256;
tick(20);
check('the game waits while paused', game().monty.x + game().monty.y * 256 === before);
const places = awmMap.places(MAP_BOX, program, p.state.found);
check(`the map offers the rooms he has stood in (${places.length}), his own marked`, places.length === 2 && places.filter((q) => q.here).length === 1);
// pick room $48 with the arrows, then Enter
for (let i = 0; i < 12 && p.frontEnd.picked !== String(START_ROOM); i++) {
  const here = must(places.find((q) => q.id === String(second)), 'no place');
  const there = must(places.find((q) => q.id === String(START_ROOM)), 'no place');
  tap(Math.abs(there.x - here.x) >= Math.abs(there.y - here.y) ? (there.x < here.x ? 'ArrowLeft' : 'ArrowRight') : (there.y < here.y ? 'ArrowUp' : 'ArrowDown'));
}
check(`the arrows pick room $48 (${p.frontEnd.picked})`, p.frontEnd.picked === String(START_ROOM));
tick(2);
shot('5-pause-pick');
tap('Enter');
tick(4);
check(`Enter: travel to room $48, where he first came in (${game().world.room.toString(16)})`, !p.state.paused && game().world.room === START_ROOM);
const e48 = must(entryOf(p.state.found, START_ROOM), 'no entry');
check('and he stands where he first came in', game().monty.x === e48.x && game().monty.y === e48.y);
check('a moment of grace after the travel', p.state.grace > 0);

// touch: tap the map to travel back to the second room
input.touch = true;
tap('KeyP');
const place2 = must(awmMap.places(MAP_BOX, program, p.state.found).find((q) => q.id === String(second)), 'no place');
input.point(place2.x, place2.y); tick(2);
input.point(place2.x, place2.y); tick(4);
check(`touch: two taps on the room travel there (${game().world.room.toString(16)})`, !p.state.paused && game().world.room === second);
input.touch = false;
tick(10);

// ---- the room shimmer, the names ------------------------------------------------------------------------------
{
  const items = game().items;
  const entries = TABLES.items.flatMap((e, i) => (e.room === START_ROOM ? [i] : []));
  /** The colours the map's cell for a room (not his own: that flashes) is drawn in over some frames of the pause screen. */
  const cellColours = () => {
    const at = must(awmMap.places(MAP_BOX, program, p.state.found).find((q) => q.id === String(START_ROOM)), 'no place');
    const seen = new Set<number>();
    for (let n = 0; n < 40; n++) { tick(1); seen.add(renderer.screen.pixels[(at.y - 2) * 320 + at.x - 3]); }
    return seen;
  };
  tap('KeyP');
  check('a room with things left in it keeps its country colour', cellColours().size === 1);
  tap('KeyP');
  for (const i of entries) items.collected[i] = true;
  tap('KeyP');
  const shimmering = cellColours();
  check(`a room with everything taken shimmers through the coin colours (${shimmering.size} colours)`, shimmering.size >= 4);
  tap('KeyP');
  for (const i of entries) items.collected[i] = false;
  check(`room names read like the banners (${roomName(START_ROOM)} / ${roomName(second)})`, roomName(START_ROOM) === 'LEAVE, GIBRALTAR' && roomName(second).length > 0);
}

// ---- autosave, and the save a faithful copy ------------------------------------------------------------------
const slot = readSaves('awm').current;
const saved = must(slot ? unpackSlot(CODEC, slot) : null, 'no save');
check(`the autosave is for the room he is in (${saved.room.toString(16)})`, saved.room === second || saved.room === START_ROOM);
check('a save read back through the checks', parseSave(readJson(JSON.stringify(saved))) !== null && parseSave({ v: 1, room: 3 }) === null);
check('the save is described for the save manager', (slot?.summary.length ?? 0) >= 3);
check('the save keeps the map\'s rooms', Object.keys(p.state.found.rooms ?? {}).length === 2);

// ---- ORIGINAL / ENHANCED ---------------------------------------------------------------------------------------
check('ENHANCED by default: the safe respawn is on', p.state.enhanced === true && p.frontEnd.assist.safe === true);
tap('KeyP');
tap('KeyE');
check('E: ORIGINAL (the switch kept)', p.state.enhanced === false && p.frontEnd.assist.safe === false && store.get('awm.assist') === '{"enhanced":false}');
tap('KeyE');
check('E again: ENHANCED', p.state.enhanced === true);
tap('KeyP');

// ---- back to room start ----------------------------------------------------------------------------------------
{
  const g = game();
  g.monty.x = 0x30;
  tap('KeyP');
  tap('KeyB');
  tick(2);
  check(`B: back to how things were on coming into the room (x ${game().monty.x.toString(16)})`, !p.state.paused && game().monty.x === game().monty.entryX);
  const again = parseSave(readJson(JSON.stringify(snapshot(game(), must(program.picture, 'no picture').hands))));
  check('the game put back from the save is the game saved', JSON.stringify(again) === JSON.stringify(snapshot(game(), must(program.picture, 'no picture').hands)));
}

// ---- CONTINUE? after the last life ------------------------------------------------------------------------------
tick(200);
const lastRoom = game().world.room;
game().score.add(0x64);
game().lives = 0x80; // (the last life)
game().monty.state = State.Dying;
game().monty.step = 0;
p.grace.clear();
check('the last life: no grace', p.state.grace === 0);
until(() => program.kind === 'closing', 400);
shot('6-game-over');
check('the last life lost: GAME OVER', program.kind === 'closing');
until(() => program.kind === 'title', 1500);
check('and the title', p.state.kind === 'title');
tick(60);
shot('7-continue');
check(`CONTINUE? straight away (${p.state.prompt})`, p.state.prompt === 'continue');
tap('Enter');
tick(4);
check(`Enter: back in play in the last room entered ($${game().world.room.toString(16)}), the six lives again and the score from nothing`,
  p.state.kind === 'play' && game().world.room === lastRoom && game().lives === NEW_GAME_LIVES && game().score.value === 0);
check('with what Monty had (the rooms on the map)', Object.keys(p.state.found.rooms ?? {}).length === 2);
check('and a moment of grace', p.state.grace > 0);
check('the high score kept', store.get('awm.high.v1') !== undefined);

// ---- a moment's grace: nothing hurts him; once it is over, an enemy does -----------------------------------------------
{
  const g = game();
  const touchOf = (): number => {
    g.enemies.setX(0, g.monty.x);
    g.enemies.setY(0, g.monty.y);
    g.enemies.setFrame(0, 0x20);
    tick(4);
    return g.monty.state;
  };
  check('grace on: an enemy on top of him does nothing', p.state.grace > 0 && touchOf() !== State.Knocked && g.monty.state !== State.Dying);
  p.grace.clear();
  g.monty.state = State.Free;
  g.shield = 0;
  check('grace over: the same enemy knocks him', touchOf() === State.Knocked);
}

// ---- after the ending: everything kept ------------------------------------------------------------------------------------
{
  const g = game();
  p.grace.clear();
  g.lives = 0x8a;
  g.score.add(0x64);
  g.placeAt(must(entryOf(p.state.found, g.world.room === START_ROOM ? second : START_ROOM), 'no entry')); // (a room entered: the save)
  tick(4);
  p.grace.clear();
  g.ended = true;
  until(() => program.kind === 'closing', 400);
  check('the ending flag: the closing screen', program.kind === 'closing' && program.lastEnd === 'ending');
  until(() => program.kind === 'title', 1500);
  tick(60);
  check(`CONTINUE? after the ending (${p.state.prompt})`, p.state.prompt === 'continue');
  tap('Enter');
  tick(4);
  check(`Enter: Monty is back with the lives and score he had (${game().lives.toString(16)}, ${game().score.value})`, p.state.kind === 'play' && game().lives === 0x8a && game().score.value === 100);
}

// ---- launching with a save -----------------------------------------------------------------------------------------
{
  const input2 = new Input(nowhere);
  const r2 = new PixelRenderer();
  const q = run({ renderer: r2, input: input2, canvas: nowhere });
  for (let i = 0; i < 8; i++) { input2.poll(); q.tick(); q.render(0); }
  const slot2 = readSaves('awm').current;
  const latest = must(slot2 ? unpackSlot(CODEC, slot2) : null, 'no save');
  check('launched with a save: straight back into play, in its room, as saved', q.state.kind === 'play' && q.program.game?.world.room === latest.room && q.program.game?.lives === latest.lives);
}

// ---- ENHANCED's safe respawn -------------------------------------------------------------------------------------------
{
  const g = game();
  tap('KeyP');
  if (!p.state.enhanced) tap('KeyE');
  tap('KeyP');
  p.grace.clear();
  g.lives = 0x8c;
  g.safeEntry = null;
  // two seconds on his feet in this room: its way in is somewhere safe to start again
  const room = g.world.room;
  tick(2 * SAFE_STEPS + 20);
  check(`two seconds on his feet in the room: his way in is the safe place`, game().safeEntry?.room === room);
  const other = START_ROOM === room ? second : START_ROOM;
  // into another room, and a death at once: back where he last had two seconds
  g.placeAt(must(entryOf(p.state.found, other), 'no entry'));
  p.grace.clear();
  const lives = g.lives;
  g.monty.state = State.Dying;
  g.monty.step = 0;
  until(() => g.lives !== lives, 200);
  check(`ENHANCED: a death before two seconds starts him in the room he last had them in ($${g.world.room.toString(16)}), a life lost once`, g.world.room === room && g.lives === lives - 1);
  // ORIGINAL: where he came in
  tap('KeyP'); tap('KeyE'); tap('KeyP');
  p.grace.clear();
  g.placeAt(must(entryOf(p.state.found, other), 'no entry'));
  p.grace.clear();
  g.monty.state = State.Dying;
  g.monty.step = 0;
  const lives2 = g.lives;
  until(() => g.lives !== lives2, 200);
  check(`ORIGINAL: the death starts him again in the room he came into ($${g.world.room.toString(16)})`, g.world.room === other && g.lives === lives2 - 1);
  tap('KeyP'); tap('KeyE'); tap('KeyP');
}

// ---- a flight: the key (or a tap on FLY), a ticket, a plane -----------------------------------------------------------------
{
  const g = game();
  p.grace.clear();
  g.lives = 0x8c;
  g.shield = 0;
  const AIRPORT = 0; // (Byorn: a plane at $C0, $68, which flies to room 1)
  g.placeAt({ room: AIRPORT, x: 0xb8, y: 0x68, state: State.Free, step: 0 });
  g.items.carried.fill(0xff);
  tick(8);
  tap('KeyC');
  tick(4);
  check('the key at a plane without a ticket does nothing', !program.flying && g.world.room === AIRPORT);
  g.items.give(0);
  const hands = g.items.carried.filter((t) => t === 0).length;
  // (a tap on FLY is a key pressed for a single frame: the logic step looks at the key in every other frame, and is not to miss it)
  input.keyDown('KeyC'); tick(1); input.keyUp('KeyC');
  tick(3);
  check(`C at a plane with a ticket (a tap on FLY on a touch screen): he takes off, the ticket is taken (${hands} before)`, program.flying && !g.items.carried.includes(0));
  shot('8-flight');
  const x0 = g.sky.player[0] ?? 0;
  input.keyDown('ArrowRight'); tick(6); input.keyUp('ArrowRight');
  check(`the stick steers his plane (${x0} to ${g.sky.player[0]})`, (g.sky.player[0] ?? 0) > x0 && program.flying);
  tap('KeyP');
  check('P in the air: the pause screen', p.state.paused && program.flying);
  tap('KeyP');
  const before = g.lives;
  const outcome = until(() => !program.flying, 2300);
  check('the flight ends by itself', outcome);
  tick(2);
  const crashed = g.lives < before;
  const planeAt = (room: number): { x: number; y: number } | undefined => {
    const slot = [0, 1, 2, 3].find((s) => g.enemies.frame(s) === 0xd0);
    return room === g.world.room && slot !== undefined ? { x: g.enemies.x(slot), y: g.enemies.y(slot) } : undefined;
  };
  if (crashed) check('shot down: back in the room he took off from, a life lost, at the plane', g.world.room === AIRPORT && g.lives === before - 1 && game().monty.x === planeAt(AIRPORT)?.x);
  else check('he comes down in room 1, at its plane', g.world.room === 1 && game().monty.x === planeAt(1)?.x && game().monty.y === planeAt(1)?.y);
  const saved2 = must(unpackSlot(CODEC, must(readSaves('awm').current, 'no save')), 'no save');
  check('the autosave keeps what the flight left in the machine (the clouds, the planes)', JSON.stringify(saved2.flight) === JSON.stringify(g.sky) || crashed);
}

// ---- an item taken at his way in: drawn first, then taken, so its colour stays; the way out grows with the progress -------------------
{
  // (what `picture.ts deliver:60:2` once showed as a difference in the panel's colours: room 36's item at column 25, row 6, with the
  // progress at $40, where a run began that the picture's harness started late; the rebuild itself must do as the original does)
  const g = game();
  p.grace.clear();
  g.progress = g.progressSeen = 0x40;
  g.placeAt({ room: 36, x: 200, y: 48, state: State.Free, step: 0 });
  const screen = must(program.picture, 'no picture').screen;
  check('a room entered shows its items at once (the item at column 25, row 6)', screen.code(29, 6) >= 0x2f);
  const colour = screen.colour[6 * 40 + 29] ?? 0;
  tick(4);
  check('taken at his way in, it is gone from the cells but keeps its colour there ($6CEF)', screen.code(29, 6) === 0 && colour !== 0 && screen.colour[6 * 40 + 29] === colour);
  check('and the way out grows its first part when the progress reaches $41', g.progress === 0x41 && screen.code(11, 23) !== 0);
}

// ---- T: the title, the save kept ---------------------------------------------------------------------------------------------
tap('KeyP');
tap('KeyT');
tick(40);
shot('2-title-continue');
check('T on the pause screen: the title, ENTER CONTINUE offered', p.state.kind === 'title' && p.state.prompt === 'title');
check(`ENTER CONTINUE sits in the title's black lower part (y ${STRIP_Y})`, STRIP_Y >= 144);
finish();
