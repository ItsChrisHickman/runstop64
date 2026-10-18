/**
 * Jet Set Willy II: progress is never wiped by play starting on its own (Chris: "After I died I didn't hit
 * anything and I ended up starting in the bathroom, with all my progress wiped").
 *
 * The cause: the game's own title starts on Return, and the flow (games/shared/continue-step.ts) only took
 * Enter for ENTER CONTINUE once the title had been up half a second. An Enter in the moments after the last
 * life went reached the game, which began a new game in the bathroom; the front end took that for the player's
 * new game and wiped what had been found (the save kept only as the previous one). Headless, through the front
 * end as the browser runs it:
 *
 * - the last life lost, then Enter at every moment of the first second the title is up (and after): the save
 *   carries on in room 60 with what had been found, no previous save made;
 * - a game that begins by a key the flow never saw (Return put into the game's keyboard past the flow, over a
 *   save, the title left open with Esc): the front end carries the save on instead of making a new game;
 * - the player's own new game (Esc, Space, Space again at NEW GAME?) still wipes what had been found and
 *   keeps the save as the previous one;
 * - with no save at all the game starts as ever.
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/wipe.ts
 */
import fs from 'node:fs';
import { C64_KEYS, Input, PixelRenderer } from 'c64kit';
import { run } from '../src/main';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { readSaves } from '../../shared/saves';
import { must } from '../../shared/test/must';
import { check, finish } from '../../shared/test/check';

stubFetch(fs.readFileSync('games/jsw2/assets/jsw2-title.state'));

const BINS = 60;
/** Where he stands on room 60's floor, right of the hole down to Hades (x, its high bit, y). */
const FLOOR: [number, number, number] = [150, 0, 158];
const FOUND = [1, 2, 3, 4, 5];

/** A game on room 60's floor with some rooms found, then the last life lost (left into the hole): the title is up. */
async function gameOver() {
  useMemoryStorage(new Map());
  const input = new Input(nowhere);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 50));
  const ram = () => must(p.machine, 'the machine').ram;
  const s = {
    p, input, ram,
    tick(n = 1) { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } },
    tap(code: string) { input.keyDown(code); s.tick(3); input.keyUp(code); s.tick(3); },
    room: () => ram()[0x13],
    found: () => p.state.found.rooms.length,
    previous: () => readSaves('jsw2').previous !== null,
  };
  s.tick(80); s.tap('Space'); s.tick(230);
  p.state.found.stand = { ...p.state.found.stand, [BINS]: FLOOR };
  p.state.found.rooms.push(...FOUND);
  p.frontEnd.going = String(BINS);
  s.tick(200);
  ram()[0x8096] = 0; // the last life: the fall into Hades takes it
  input.keyDown('ArrowLeft');
  let n = 0;
  const titleUp = () => { const v = ram()[0x314] | (ram()[0x315] << 8); return v === 0x4ace || v === 0x4a18; };
  for (; n < 4000 && !titleUp(); n++) s.tick();
  input.keyUp('ArrowLeft');
  s.tick(2);
  return { ...s, titleUp: n < 4000 };
}
type Session = Awaited<ReturnType<typeof gameOver>>;

const before = await gameOver();
const FOUND_BEFORE = before.found();
check(`the last life lost: the title is up (${FOUND_BEFORE} rooms found), the save is room 60's`, before.titleUp && !before.p.state.playing && FOUND_BEFORE >= FOUND.length);

// ---- Enter at every moment after the last life: the save carries on ----
const OFFSETS = [0, 1, 2, 3, 5, 8, 12, 16, 20, 24, 25, 26, 30, 60];
let wiped: string[] = [];
for (const after of OFFSETS) {
  const s = await gameOver();
  s.tick(after);
  s.tap('Enter');
  s.tick(300);
  const ok = s.p.state.playing && s.room() === BINS && s.found() === FOUND_BEFORE && !s.previous();
  if (!ok) wiped = [...wiped, `${after}: room ${s.room()}, found ${s.found()}, previous ${s.previous()}`];
}
check(`Enter ${OFFSETS.length} different moments after the last life (${OFFSETS.join(', ')} ticks into the title): the save carries on in room ${BINS} with ${FOUND_BEFORE} rooms found, no previous save${wiped.length ? ` -- ${wiped.join('; ')}` : ''}`, wiped.length === 0);

// ---- a game that begins by a key the flow never saw ----
{
  const s = await gameOver();
  s.tick(60);
  s.tap('Escape'); // CONTINUE? no
  s.tick(60);
  check('CONTINUE? answered no: the title stays up, nothing playing', !s.p.state.playing && s.p.state.prompt === 'title');
  const game = must(s.p.host, 'the game');
  const tick = game.tick.bind(game);
  const enter = must(C64_KEYS.Enter, 'the Return key');
  game.tick = () => { game.m.keys.push(enter); tick(); }; // (Return into the game's keyboard, past the flow)
  s.tick(400);
  check(`a game begun past the flow: the save carries on (room ${s.room()}, ${s.found()} found, previous ${s.previous()})`, s.p.state.playing && s.room() === BINS && s.found() === FOUND_BEFORE && !s.previous());
  s.tick(300);
  check('...and stays so (still room 60, still alive and playing 300 frames on)', s.p.state.playing && s.room() === BINS && s.found() === FOUND_BEFORE);
}

// ---- the player's own new game still is one ----
{
  const s: Session = await gameOver();
  s.tick(60);
  s.tap('Escape');
  s.tick(60);
  s.tap('Space'); // NEW GAME?
  check('Space on the title over a save: NEW GAME? asks first', s.p.state.prompt === 'newGame');
  s.tap('Space'); // yes
  s.tick(400);
  check(`NEW GAME? answered yes: a new game in the bathroom (room ${s.room()}), nothing found (${s.found()}), the save kept as the previous one`, s.p.state.playing && s.room() === 0x20 && s.found() <= 1 && s.previous());
}

// ---- no save: the game starts as ever ----
{
  useMemoryStorage(new Map());
  const input = new Input(nowhere);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 50));
  for (let i = 0; i < 80; i++) { input.poll(); p.tick(); p.render(0); }
  input.keyDown('Enter');
  for (let i = 0; i < 60; i++) { input.poll(); p.tick(); p.render(0); }
  input.keyUp('Enter');
  for (let i = 0; i < 300; i++) { input.poll(); p.tick(); p.render(0); }
  check('no save: Enter on the title starts a game in the bathroom', p.state.playing && must(p.machine, 'the machine').ram[0x13] === 0x20);
}

finish();
