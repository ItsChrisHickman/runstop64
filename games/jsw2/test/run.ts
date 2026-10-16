/**
 * Jet Set Willy II's running (ENHANCED: Shift held, or the touch RUN key on, and Willy alone goes
 * faster: his own steps come sooner, src/main.ts RUN, games/shared/native/play.ts `run: { player }`),
 * headless (play.ts as the browser runs it, c64kit stood in by games/shared/test/kit.ts):
 *
 * - holding Shift (a real key event) and the touch RUN key each take Willy a measured distance in
 *   about half the frames, the game itself at its own pace (one of its frames a frame shown); let go,
 *   he walks at the game's own pace again;
 * - only Willy: walking with and without Shift, the game's memory differs only in Willy's own bytes
 *   (the guardians, their steps, the clock, the music: the same);
 * - a jump at speed is the same jump (every spot he passes through, in order, and where he lands),
 *   in fewer frames; so is the fall down the toilet into the drain (landing in its channel, alive);
 * - not on a rope (his countdown left as it is);
 * - Shift is the front end's: it never reaches the C64's keyboard;
 * - ORIGINAL ignores it: the same game with and without Shift, byte for byte;
 * - a walk through rooms (left from the bathroom into Macaroni Ted, as the route goes): the same
 *   rooms, no life lost, in fewer frames;
 * - at speed, the pause screen stops the game, an autosave is made on coming into a room, and
 *   travel on the map takes him back, alive.
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/run.ts
 */
import fs from 'node:fs';
import { Input, PAL_FRAME_CYCLES, PixelRenderer, type KeyEventLike, type KeyTarget } from 'c64kit';
import { run, RUN } from '../src/main';
import { MANSION } from '../src/mansion';
import { jsw2Map } from '../src/map';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { isRecord } from '../../shared/guards';
import { MAP_BOX } from '../../shared/native/pause';
import { readSaves } from '../../shared/saves';
import { must } from '../../shared/test/must';
import { check, finish } from '../../shared/test/check';

stubFetch(fs.readFileSync('games/jsw2/assets/jsw2-title.state'));


/** A launch of the game with its own storage (`store`: seeded, e.g. ORIGINAL chosen) and a keyboard to press real keys on. */
async function launch(store = new Map<string, string>()) {
  useMemoryStorage(store);
  const listeners = new Map<string, ((e: KeyEventLike) => void)[]>();
  const target: KeyTarget = {
    addEventListener(type: string, fn: (e: KeyEventLike) => void) { listeners.set(type, [...(listeners.get(type) ?? []), fn]); },
  };
  const input = new Input(target);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 50));
  const key = (type: 'keydown' | 'keyup', code: string) => { for (const fn of listeners.get(type) ?? []) fn({ code, repeat: false, metaKey: false, preventDefault() {} }); };
  const machine = () => must(p.machine, 'the machine');
  const s = {
    p, input, store,
    tick(n = 1) { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } },
    tap(code: string) { input.keyDown(code); s.tick(3); input.keyUp(code); s.tick(3); },
    shift(down: boolean) { key(down ? 'keydown' : 'keyup', 'ShiftLeft'); },
    ram: () => machine().ram,
    room: () => machine().ram[0x13],
    x: () => machine().ram[0x8062] + 256 * (machine().ram[0x8072] & 1),
    spot: () => `${s.x()},${machine().ram[0x8063]}`,
    lives: () => machine().ram[0x8096],
    /** The game's frames so far (its machine's time). */
    gameFrames: () => Math.round(machine().cpu.cycles / PAL_FRAME_CYCLES),
    /** A new game, then standing in the bathroom a moment. */
    newGame() { s.tick(80); s.tap('Space'); s.tick(230); },
    /** Frames shown for Willy to walk `px` pixels left (the stick held, then let go). */
    walk(px: number) {
      const from = s.x();
      input.keyDown('ArrowLeft');
      let n = 0;
      while (from - s.x() < px && n < 1000) { s.tick(); n++; }
      input.keyUp('ArrowLeft');
      return n;
    },
    /** A jump to the left from where he stands: each spot he passes through till he's on his feet again, and the frames it took. */
    jump() {
      const spots: string[] = [];
      input.keyDown('ArrowLeft'); input.keyDown('Space');
      let n = 0;
      const up = () => s.ram()[0x82e4] || s.ram()[0x8292];
      while (!up() && n < 50) { s.tick(); n++; }
      input.keyUp('Space');
      // (where he is after each of his steps: his countdown set again)
      let count = s.ram()[0x8207];
      for (n = 0; n < 300 && up(); n++) { s.tick(); if (s.ram()[0x8207] > count) spots.push(s.spot()); count = s.ram()[0x8207]; }
      input.keyUp('ArrowLeft');
      return { spots, frames: n };
    },
  };
  return s;
}

type Session = Awaited<ReturnType<typeof launch>>;

// ---- the distance: normal, Shift (a real key), the touch RUN key, and let go again ----
const PX = 24;
const normal = await launch();
normal.newGame();
check(`a new game, in the bathroom (room ${normal.room()})`, normal.room() === 32 && normal.p.state.enhanced);
const atStart = normal.x();
const tNormal = normal.walk(PX);
const tNormal2 = normal.walk(PX);

const shifted = await launch();
shifted.newGame();
check('the same start each launch', shifted.x() === atStart);
shifted.shift(true);
shifted.tick();
check(`Shift is the front end's: it never reaches the C64's keyboard (keys ${must(shifted.p.machine, 'machine').keys.length})`, must(shifted.p.machine, 'machine').keys.length === 0);
const before = shifted.gameFrames();
const tShift = shifted.walk(PX);
const ranFrames = shifted.gameFrames() - before;
shifted.shift(false);
const tLetGo = shifted.walk(PX);
check(`Shift held: ${PX} px in ${tShift} frames shown, against ${tNormal}; the game at its own pace (${ranFrames} of its frames)`, tShift * 10 <= tNormal * 6 && Math.abs(ranFrames - tShift) <= 1);
check(`Shift let go: the game's own pace again (${tLetGo} frames, against ${tNormal2})`, Math.abs(tLetGo - tNormal2) <= 4);

const touch = await launch();
touch.newGame();
touch.input.keyDown('ShiftLeft'); // (the touch layer's RUN key, on)
const tTouch = touch.walk(PX);
touch.input.keyUp('ShiftLeft');
const tTouchOff = touch.walk(PX);
check(`the touch RUN key: ${PX} px in ${tTouch} frames shown (normal ${tNormal}); off again, ${tTouchOff} (normal ${tNormal2})`, tTouch * 10 <= tNormal * 6 && Math.abs(tTouchOff - tNormal2) <= 4);
check('the touch layout has RUN, on or off (Shift)', touch.p.touch.buttons.some((b) => b.label === 'RUN' && b.key === 'ShiftLeft' && b.mode === 'toggle'));

// ---- only Willy: the same walk with and without Shift, the rest of the game the same ----
{
  const a = await launch(), b = await launch();
  a.newGame(); b.newGame();
  b.shift(true);
  for (const s of [a, b]) s.input.keyDown('ArrowLeft');
  for (let i = 0; i < 40; i++) { a.tick(); b.tick(); }
  /** Willy's own bytes: where a jump began ($7ABA-$7ABD), his place ($8062, $8063, the high bits $8072-$8074), his countdown ($8207), his walk, jump and collision bytes ($8290-$82FF, $8306). */
  const willy = (i: number) => (i >= 0x7aba && i <= 0x7abd) || i === 0x8062 || i === 0x8063 || (i >= 0x8072 && i <= 0x8074) || i === 0x8207 || (i >= 0x8290 && i <= 0x82ff) || i === 0x8306;
  const differ: string[] = [];
  for (let i = 0; i < 0x10000; i++) if (a.ram()[i] !== b.ram()[i]) differ.push(`$${i.toString(16)}`);
  const others = differ.filter((h) => !willy(parseInt(h.slice(1), 16)));
  check(`only Willy: 40 frames walking, Shift held, he's twice as far (${atStart - a.x()} px, ${atStart - b.x()} px); the game's memory differs only in his own bytes (${differ.join(' ')})`, Math.abs((atStart - b.x()) - 2 * (atStart - a.x())) <= 2 && differ.length > 0 && others.length === 0);
}

// ---- a jump, and a fall, at speed: the same, in fewer frames ----
{
  const a = await launch(), b = await launch();
  a.newGame(); b.newGame();
  b.shift(true);
  const ja = a.jump(), jb = b.jump();
  /** A jump in short: where he is after its first step, its top, where he lands, and its steps. */
  const shape = (j: { spots: string[] }) => { const ys = j.spots.map((q) => Number(q.split(',')[1])); return `from ${j.spots[0]}, top ${Math.min(...ys)}, landing ${j.spots[j.spots.length - 1]}, ${j.spots.length} steps`; };
  check(`a jump at speed: the same jump (${shape(jb)}; normal ${shape(ja)}), in ${jb.frames} frames against ${ja.frames}`, shape(ja).replace(/\d+ steps/, '') === shape(jb).replace(/\d+ steps/, '') && Math.abs(ja.spots.length - jb.spots.length) <= 1 && ja.spots.length > 5 && jb.frames * 10 <= ja.frames * 8);
  // right, down the toilet into the drain: the fall, and where he lands in its channel
  const fall = (s: Session) => {
    s.input.keyDown('ArrowRight');
    let n = 0;
    while (s.room() === 32 && n++ < 1500) s.tick();
    s.input.keyUp('ArrowRight');
    const lives = s.lives(), spots: string[] = [];
    let f = 0;
    for (; f < 200 && !(s.ram()[0x8063] === 70 && !s.ram()[0x82e4] && !s.ram()[0x82d7]); f++) { s.tick(); if (spots[spots.length - 1] !== s.spot()) spots.push(s.spot()); }
    s.tick(100);
    return { spots, frames: f, alive: s.lives() === lives && s.room() === 138 };
  };
  const c = await launch(), d = await launch();
  c.newGame(); d.newGame();
  d.shift(true);
  const fa = fall(c), fb = fall(d);
  check(`down the toilet at speed: the same fall (${fb.spots.length} spots, landing at ${fb.spots[fb.spots.length - 1]}), in ${fb.frames} frames against ${fa.frames}, alive in the drain`, fa.spots.join(' ') === fb.spots.join(' ') && fb.frames < fa.frames && fa.alive && fb.alive);
}

// ---- not on a rope: his countdown left as it is ----
{
  const s = await launch();
  s.newGame();
  const r = s.ram();
  r[0x8207] = 4; r[0x835d] = 0xff;
  RUN.player();
  const onRope = r[0x8207];
  r[0x835d] = 0;
  RUN.player();
  check(`on a rope, running leaves his countdown (${onRope}); off it, a count more off (${r[0x8207]})`, onRope === 4 && r[0x8207] === 3);
  r[0x8207] = 1;
  RUN.player();
  check('never past the step the game counts down to itself', r[0x8207] === 1);
}

// ---- ORIGINAL: Shift does nothing (the same game, byte for byte) ----
const switched = await launch();
switched.newGame();
switched.tap('KeyP');
switched.tap('KeyE');
check(`E on the pause screen: ORIGINAL (remembered: ${switched.store.get('jsw2.assist')})`, !switched.p.state.enhanced && (switched.store.get('jsw2.assist') ?? '').includes('"enhanced":false'));
const ORIGINAL = () => new Map([['jsw2.assist', JSON.stringify({ enhanced: false })]]);
const plain = await launch(ORIGINAL()), held = await launch(ORIGINAL());
plain.newGame(); held.newGame();
held.shift(true);
const tPlain = plain.walk(PX), tHeld = held.walk(PX);
plain.tick(40); held.tick(40);
const same = plain.ram().every((b, i) => b === held.ram()[i]);
check(`ORIGINAL: Shift held changes nothing (${PX} px in ${tHeld} frames, without ${tPlain}; memory the same: ${same})`, !held.p.state.enhanced && tHeld === tPlain && tPlain === tNormal && same);

// ---- a walk through rooms: left from the bathroom, through room 64 into Macaroni Ted (the route's way) ----
/** Left held from the start (Shift too, `fast`) till he's in room 63: the rooms on the way, the frames, the lives on arriving. */
async function walkLeft(fast: boolean) {
  const s = await launch();
  s.newGame();
  s.shift(fast);
  s.input.keyDown('ArrowLeft');
  const rooms = [s.room()];
  let n = 0;
  for (; n < 2000 && s.room() !== 63; n++) { s.tick(); if (rooms[rooms.length - 1] !== s.room()) rooms.push(s.room()); }
  s.input.keyUp('ArrowLeft');
  s.shift(false);
  return { s, rooms: rooms.join(' '), frames: n, lives: s.lives() };
}
const walkNormal = await walkLeft(false), walkFast = await walkLeft(true);
check(`a walk through rooms running: the same rooms (${walkFast.rooms}), no life lost, in ${walkFast.frames} frames against ${walkNormal.frames}`, walkFast.rooms === walkNormal.rooms && walkFast.rooms === '32 64 63' && walkFast.lives === 0xff && walkFast.frames * 10 <= walkNormal.frames * 6);
const fast = walkFast.s;
const rooms = [32, 64];

// ---- at speed: pause, autosave, travel ----
fast.tick(120);
const save = readSaves('jsw2').current;
check(`at speed: the autosave was made in the room he's in ("${save?.summary[0]}", room ${fast.room()} ${MANSION[fast.room()]?.name})`, !!save && save.summary[0] === MANSION[fast.room()]?.name.slice(0, save.summary[0].length));
fast.shift(true);
fast.input.keyDown('ArrowRight');
fast.tick(4);
fast.tap('KeyP');
const pausedAt = fast.gameFrames();
fast.tick(20);
check(`at speed: P pauses, and the game waits (${fast.gameFrames() - pausedAt} of its frames in 20)`, fast.p.state.paused && fast.gameFrames() === pausedAt);
const stand = fast.p.state.found.stand;
const goal = must([32, ...rooms].find((r) => r !== fast.room() && isRecord(stand) && String(r) in stand), 'a room to travel back to');
const place = must(must(jsw2Map.places, 'places')(MAP_BOX, fast.ram(), fast.p.state.found).find((q) => q.id === String(goal)), `room ${goal} on the map`);
const tapAt = (x: number, y: number) => { fast.input.point(x, y); fast.tick(1); fast.tick(2); };
tapAt(place.x, place.y);
tapAt(place.x, place.y);
fast.input.keyUp('ArrowRight');
const livesThen = fast.lives();
fast.tick(150);
check(`at speed: travel on the map took him to room ${goal} (in ${fast.room()}), alive 150 frames on`, !fast.p.state.paused && fast.room() === goal && fast.lives() === livesThen);
fast.shift(false);

finish();
