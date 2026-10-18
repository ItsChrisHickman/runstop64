/**
 * Entombed's HD view (c64kit's hd/, src/hd.ts), headless: the shell's C64/HD switch with the game
 * (games/shared/native/play.ts as the browser runs it), and the view itself, built from the game's
 * own frames in a corridor and in chambers and drawn by the software renderer
 * (packages/c64kit/test/hd-raster.ts: hd/layer.ts's steps and formulas) to look at.
 *
 * - The switch: C64 by default (no room drawn); switched, HD at once, and kept; in play the
 *   renderer is given the room; on the title, the pause screen and CONTINUE? it isn't.
 * - The room: with the camera at rest (no tilt, no perspective) every quad lands on its own pixel
 *   of the picture (the room is the same room); floor faces up, the back wall out, a corridor's
 *   side wall across; Pendragon stands on the floor under his feet; the torches give light.
 * - The stairs: every place the game takes him between floors (the corridor cell with a stairway in its back wall on
 *   each floor, $3E; the gate in each of the stairs chambers 3, 5, 7, 12, 15 and 17, $AC), as he arrives and with him
 *   standing where walking up takes him through, has its stairway or gate shown in HD where the C64 draws it, the arch
 *   standing against it (`checkHdCharacters`). A wall hung over the stairs at the depth of the ground in front of them
 *   (the tiers' back edge ignored) put the arch a stair's depth in front of the gate. Pictures to look at with an out-dir.
 * - The pictures: lit (not black, not blown out), lit most round the torches and Pendragon, the
 *   same every run. Written as C64 | HD side by side to look at.
 *
 *   nice -n 15 node tools/test.mjs games/entombed/test/hd.ts [out-dir]
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { unpackState, type MachineState } from 'c64kit';
import { cpu } from '../../shared/native/cpu';
import { NativeHost } from '../../shared/native/host';
import { port } from '../src/native';
import { entombedMap } from '../src/map';
import { entombedHd } from '../src/hd';
import { decodePicture } from '../../../packages/c64kit/src/c64/picture';
import { run } from '../src/main';
import { chamberState } from '../re/hints/chambers';
import { replay } from '../re/hints/play';
import { readSolved } from '../re/hints/solved';
import { checkHdCharacters, checkHdEntry, checkHdFrames, checkHdRoom, checkHdSwitch } from '../../shared/test/hd';
import { stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';
import { check, finish } from '../../shared/test/check';

const store = useMemoryStorage();
const titleBytes = fs.readFileSync('games/entombed/assets/entombed-title.state');
stubFetch(titleBytes);
const outDir = process.argv[2];
if (outDir) fs.mkdirSync(outDir, { recursive: true });


/** The start of a game (fire on the title: he's in chamber 1). */
function gameStart(): MachineState {
  const g = new NativeHost(port, unpackState(new Uint8Array(titleBytes)));
  for (let f = 0; f < 200; f++) { g.m.joy1 = g.m.joy2 = f > 50 && f < 60 ? 0x0f : 0x1f; g.tick(); }
  return must(g.save(), 'a save');
}
const start = gameStart();

/** A floor-1 corridor with a torch on its wall (its fourth junction), Pendragon walked a little way right. */
function corridor(): MachineState {
  const g = NativeHost.resume(port, start);
  let done = false;
  g.onWait = (site) => {
    if (done || site !== port.mainLoopWait) return;
    done = true; const r = { ...cpu };
    const all = [...Array(256).keys()].map((k) => `${k & 15},${k >> 4}`);
    entombedMap.go(entombedMap.places({ x: 0, y: 0, w: 196, h: 150 }, g.m.ram, entombedMap.found.parse({ cells: { 1: all } }))[3].id, g.m.ram, entombedMap.found.empty());
    Object.assign(cpu, r);
  };
  for (let f = 0; f < 30; f++) { g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); }
  for (let f = 0; f < 30; f++) { g.m.joy1 = g.m.joy2 = 0x17; g.tick(); }
  for (let f = 0; f < 4; f++) { g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); }
  return must(g.save(), 'a save in the corridor');
}
const corridorState = corridor();
/** The same corridor walked on a good way (the next cell's picture scrolling in beside the first's: two pictures side by side). */
function corridorOn(frames: number): MachineState {
  const g = NativeHost.resume(port, corridorState);
  for (let f = 0; f < frames; f++) { g.m.joy1 = g.m.joy2 = 0x17; g.tick(); }
  return must(g.save(), 'a save in the corridor, walked on');
}
const corridorScrolling = corridorOn(170);

// ---- the switch, in the front end ----
await checkHdSwitch(check, { id: 'entombed', run, store, save: corridorState, action: 'KeyX' }, outDir);
/**
 * A dark chamber with the torch, used: its flash (sprite 7, a white ball over him) halfway through.
 * The game draws the room black all the while ($3240 stays 0: only leaving lights it): so does the view.
 */
function torchUsed(n: number): MachineState {
  const g = NativeHost.resume(port, chamberState(n, { 0x322f: 1 }, start));
  for (let f = 0; f < 10; f++) { g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); }
  g.m.ram[0x3215] = 3; // (the action fire does: the torch)
  for (let f = 0; f < 12; f++) { g.m.joy1 = g.m.joy2 = 0x0f; g.tick(); }
  return must(g.save(), 'a save with the torch used');
}

// ---- the view: a corridor and chambers ----
// (chambers 22 and 24 are dark: the game draws them black, with the torch or without, and so does the view)
const rooms: { name: string; state: MachineState; light: 'lit' | 'dark'; behindMost?: number; carried?: boolean }[] = [
  { name: 'corridor', state: corridorState, light: 'lit' },
  { name: 'corridor-scrolling', state: corridorScrolling, light: 'lit' },
  { name: 'chamber01', state: start, light: 'lit' },
  { name: 'chamber03-stairs', state: chamberState(3, {}, start), light: 'lit' },
  { name: 'chamber04', state: chamberState(4, {}, start), light: 'lit' },
  { name: 'chamber08', state: chamberState(8, {}, start), light: 'lit' },
  { name: 'chamber10', state: chamberState(10, {}, start), light: 'lit' },
  { name: 'chamber13', state: chamberState(13, {}, start), light: 'lit', carried: false },
  { name: 'chamber14', state: chamberState(14, {}, start), light: 'lit' },
  { name: 'chamber25', state: chamberState(25, {}, start), light: 'lit' },
  { name: 'chamber22-dark', state: chamberState(22, {}, start), light: 'dark' },
  { name: 'chamber22-torch', state: torchUsed(22), light: 'dark' },
  // (the flash stands at the depth of the floor under its own box, deeper than he is: nearer things, here a block beside him, hide its far side)
  { name: 'chamber24-torch', state: torchUsed(24), light: 'dark', behindMost: 0.6 },
];
const entered: NativeHost['m'][] = [];
for (const { name, state, light, behindMost, carried = true } of rooms) {
  const g = NativeHost.resume(port, state);
  for (let f = 0; f < 2; f++) { g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); }
  entered.push(g.m);
  const { gaps, top } = checkHdRoom(check, entombedHd, { name, m: g.m, light, sideWall: name === 'corridor', behindMost }, outDir);
  // (the walls carried on up past the picture: the dip behind chamber 10's stairs and over chamber 1's back wall is wall; where a
  // chamber's picture shows nothing over its top, as chamber 13's (the dark above), there's nothing to carry on, and the corners
  // the camera opens show the picture behind, dimmed)
  if (name.startsWith('chamber') && light === 'lit' && carried) check(`${name}: the walls carried on up cover the room's top (${gaps} of ${top} columns not)`, gaps <= top / 10);
}

// coming into each of those rooms in turn: no frame of the main thread's stalls (the room built off it)
await checkHdEntry(check, 'entombed', entombedHd, entered);

// ---- the stairs: the ways between floors (games/entombed/test/stairs.ts walks through each in the game) ----
{
  const FLOOR = 0x37f7, STAIRWAY = 0x3e, GATE = 0xac;
  /** A corridor cell (travel, as the pause map does it). */
  const cell = (id: string): MachineState => {
    const g = NativeHost.resume(port, start);
    let done = false;
    g.onWait = (site) => {
      if (done || site !== port.mainLoopWait) return;
      done = true; const r = { ...cpu };
      entombedMap.go(id, g.m.ram, entombedMap.found.empty());
      Object.assign(cpu, r);
    };
    for (let f = 0; f < 6; f++) { g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); }
    return must(g.save(), 'a save in the cell');
  };
  /** Walking up from the state: the machine just before he's taken through (or after 40 frames if the way is shut), and the frames that took. */
  const standing = (state: MachineState) => {
    const walk = (frames: number) => {
      const g = NativeHost.resume(port, state), r = g.m.ram, from = r[FLOOR];
      for (let f = 0; f < frames; f++) {
        g.m.joy1 = g.m.joy2 = 0x1e; g.tick(); r[0x37f6] = 0; r[0x323d] = 0;
        if (r[FLOOR] !== from) return { g, through: f };
      }
      return { g, through: -1 };
    };
    const first = walk(80);
    return first.through < 0 ? walk(40).g : walk(first.through).g;
  };
  const statueMoved = (): MachineState => {
    const solved = readSolved(pathToFileURL('games/entombed/re/hints/solved/chamber-17.json'));
    const given: Record<number, number> = {};
    for (const [a, v] of Object.entries(solved.given)) given[Number(a)] = v;
    return must(replay(chamberState(17, given, start), solved.steps[0].path).save(), 'the statue whipped');
  };
  const places: { name: string; state: MachineState; char: number }[] = [
    ...(['1:1,3', '2:4,1', '3:4,0', '4:2,0', '5:3,0', '6:7,2', '7:3,0'] as const).map((id) => ({ name: `floor ${id.split(':')[0]} stairs (cell ${id.split(':')[1]})`, state: cell(id), char: STAIRWAY })),
    // (the free gates, and the guarded ones with their puzzle done: the stone moved, the small idol in hand, the statue whipped away)
    ...[3, 7, 12].map((n) => ({ name: `chamber ${n} gate`, state: chamberState(n, {}, start), char: GATE })),
    { name: 'chamber 5 gate (the stone moved)', state: chamberState(5, { 0x37fd: 0x29 }, start), char: GATE },
    { name: 'chamber 15 gate (the altar cleared)', state: chamberState(15, { 0x322d: 1 }, start), char: GATE },
    { name: 'chamber 17 gate (the statue moved)', state: statueMoved(), char: GATE },
  ];
  for (const { name, state, char } of places) {
    const tag = name.replace(/[^a-z0-9]+/gi, '-');
    const arrive = NativeHost.resume(port, state);
    for (let f = 0; f < 2; f++) { arrive.m.joy1 = arrive.m.joy2 = 0x1f; arrive.tick(); }
    const at = standing(state);
    const had = (m: typeof arrive.m) => decodePicture(m.ram, m.capture).code.includes(char);
    check(`${name}: the picture has its ${char === GATE ? 'gate' : 'stairway'} ($${char.toString(16).toUpperCase()})`, had(arrive.m) && had(at.m));
    // (C64 | HD of each, to look at, with an out-dir)
    checkHdCharacters(check, entombedHd, `${name}, arriving`, arrive.m, [char], { png: outDir && `${outDir}/stairs-${tag}-arrive.png` });
    checkHdCharacters(check, entombedHd, `${name}, standing where walking up takes him through`, at.m, [char], { png: outDir && `${outDir}/stairs-${tag}-at.png` });
  }
}

// ---- a wide chamber scrolling, its flames animating: only what changed made again ----
// (walking right to the edge, back left, right again: it scrolls each way)
{
  const g = NativeHost.resume(port, chamberState(3, {}, start));
  let f = 0;
  checkHdFrames(check, 'a wide chamber (3) walked to its edges and back', entombedHd, () => {
    if (f >= 600) return null;
    g.m.joy1 = g.m.joy2 = [0x17, 0x1b, 0x17][Math.floor(f++ / 200)];
    g.tick();
    return g.m;
  });
}
// ---- the corridor walked a cell (two pictures side by side, scrolling), and chamber 1 to its edge and back (9 columns) ----
{
  const g = NativeHost.resume(port, corridorState);
  let f = 0;
  checkHdFrames(check, 'a corridor walked on to the next cell', entombedHd, () => {
    if (f >= 330) return null;
    g.m.joy1 = g.m.joy2 = 0x17; f++;
    g.tick();
    return g.m;
  });
  const h = NativeHost.resume(port, start);
  let k = 0;
  checkHdFrames(check, 'chamber 1 walked to its edge and back', entombedHd, () => {
    if (k >= 500) return null;
    h.m.joy1 = h.m.joy2 = k++ < 250 ? 0x17 : 0x1b;
    h.tick();
    return h.m;
  });
}
finish();
