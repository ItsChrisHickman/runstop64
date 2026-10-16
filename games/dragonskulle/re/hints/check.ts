/**
 * Dragonskulle's hints, checked by playing (re/README.md, "Hints"): for each hint (src/hints.ts),
 * from a state on its screen (along the recorded routes, re/routes.json; what it needs, found
 * elsewhere, set first, as the game would have it), play until the step is done: steered at the
 * hinted sprite, doing the step's action there (touching it, digging, a stone at it), random
 * otherwise (Go-Explore style restarts). Then, replaying the solved inputs, check with the game's
 * own hint function (src/hint-spots.ts) that the hint shows on the sprite the step is done at
 * until it's done, that the game's own code does it (the byte), and that the hint has gone a
 * second later. Renders each one, the hint ringed, to look at.
 *
 *   nice -n 15 node tools/test.mjs games/dragonskulle/re/hints/check.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { unpackState, type MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { renderPng } from '../../../../tools/probe/render';
import { NativeHost } from '../../../shared/native/host';
import { port } from '../../src/native';
import { HINTS, type Hint } from '../../src/hints';
import { hintSpots } from '../../src/hint-spots';
import { readJson } from '../../../shared/guards';
import { check, finish } from '../../../shared/test/check';

const outDir = process.argv[2] ?? '';
const keep = (r: Uint8Array) => { r[0x1248] = 0; r[0x123e] = 0x14; r[0x3432] = 0; };

// states on each hint's screen, along the routes (the first frames of play there)
const routes: unknown = readJson(fs.readFileSync('games/dragonskulle/re/routes.json', 'utf8'));
const title = unpackState(new Uint8Array(fs.readFileSync('games/dragonskulle/assets/dragonskulle-title.state')));
const onScreen = new Map<number, MachineState[]>(); // room block -> states there (a few, along the way)
if (Array.isArray(routes)) for (const route of routes) {
  if (!Array.isArray(route)) continue;
  const rle = route.filter((n): n is number => typeof n === 'number');
  const g = new NativeHost(port, title);
  let frame = 0;
  for (let i = 0; i < rle.length; i += 2) for (let k = 0; k < rle[i + 1]; k++) {
    g.m.joy1 = g.m.joy2 = rle[i] & 0x1f; g.m.keys = rle[i] & 32 ? [[1, 2]] : [];
    g.tick(); keep(g.m.ram); frame++;
    const room = g.m.ram[0x341c];
    const list = onScreen.get(room) ?? [];
    if (frame > 300 && frame % 60 === 0 && list.length < 12 && HINTS.some((h) => h.room === room)) { const s = g.save(); if (s) { list.push(s); onScreen.set(room, list); } }
  }
  // (and where the route ends: some end on coming onto the screen)
  const end = g.save(), room = g.m.ram[0x341c];
  if (end && HINTS.some((h) => h.room === room)) onScreen.set(room, [...(onScreen.get(room) ?? []), end]);
}

/** Where a sprite is (its middle, on the screen), if shown. */
const spriteAt = (vic: Uint8Array, n: number) => {
  const bit = 1 << n;
  if (!(vic[0x15] & bit)) return null;
  return { x: (vic[n * 2] | (vic[0x10] & bit ? 256 : 0)) - 12, y: vic[n * 2 + 1] - 40 };
};
/** The action each step is done with (the hand: 0 shovel, 3 stone, 4 jump), and how. */
const ACTIONS: Record<string, { action: number; fire: boolean }> = {
  'touch a starfish: the way into the caves opens': { action: 4, fire: false },
  'dig here with the shovel: the cloak': { action: 0, fire: true },
  // (solved here the original's way, with a stone; ENHANCED's touching it: test/shovel-touch.ts)
  'walk up to the shovel (or throw a stone at it)': { action: 3, fire: true },
};

let seed = 11;
const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);

/** Play from `start` until the hint's step is done: the inputs (joystick per frame), or null. */
function solve(starts: MachineState[], h: Hint): { start: MachineState; inputs: number[] } | null {
  const how = ACTIONS[h.what];
  for (let attempt = 0; attempt < 400; attempt++) {
    const start = starts[attempt % starts.length];
    const g = NativeHost.resume(port, start);
    for (const [a, v] of h.when ?? []) g.m.ram[a] = v;
    g.m.ram[0x12eb] = how.action;
    const inputs: number[] = [];
    let mode = 0, left = 0, dx = 0, dy = 0;
    for (let f = 0; f < 900; f++) {
      if (left-- <= 0) { mode = rnd() < 0.8 ? 0 : 2; left = 20 + Math.floor(rnd() * 80); }
      const r = g.m.ram, s = spriteAt(g.m.vic, h.sprite);
      const x = r[0x341d] + (g.m.vic[0x10] & 4 ? 256 : 0), y = r[0x341e];
      let j = 0;
      if (mode < 2 && s) {
        // steered to touch it (his sprite up and left of it: the game compares his y with $9A and
        // the like, and the pictures touch there), then the action
        if (left === 19 || f === 0) { dx = Math.floor(rnd() * 33) - 24; dy = Math.floor(rnd() * 33) - 32; }
        // (a stone: thrown facing up, it goes up and to the right from beside him ($2972, $29E6), and
        // takes the shovel where it's within 8 pixels of it across and high enough ($6235): from
        // about $38 to its left, below it)
        const stone = h.what.includes('stone');
        const tx = stone ? s.x + 12 - 0x38 + (dx >> 3) : s.x + 12 + dx, ty = stone ? 0x8a + (dy >> 3) : s.y + 40 + dy;
        // (up into the room first for a stone: its way in is at the bottom)
        if (stone && y > ty + 1) j = 1;
        else if (x < tx - 1) j = 8; else if (x > tx + 1) j = 4; else if (y < ty - 1) j = 2; else if (y > ty + 1) j = 1;
        if (!j && !stone && how.fire && f % 20 < 10) j = 16;
        if (stone && !j) j = f % 30 < 3 ? 1 : f % 30 < 7 ? 16 : 0;
      } else j = [1, 2, 4, 8, 0, 16][Math.floor(rnd() * 6)];
      g.m.joy1 = g.m.joy2 = 0x1f & ~j; g.m.keys = [];
      g.tick(); keep(g.m.ram); r[0x12eb] = how.action; inputs.push(j);
      if (r[h.until[0]] === h.until[1]) { if (f >= 20) return { start, inputs }; break; } // (not a state where it was about to be done)
      if (r[0x341c] !== h.room) { if (process.env.DEBUG && attempt < 4) console.log(`  attempt ${attempt} left at frame ${f}: room ${r[0x341c]}`); break; } // (walked off the screen)
      if (process.env.DEBUG && f === 899 && attempt < 6) console.log(`  attempt ${attempt}: at ${x.toString(16)},${y.toString(16)} target ${s ? (s.x + 12).toString(16) : "-"} stone ${r[0x1fef]}`);
    }
  }
  return null;
}

for (const h of HINTS) {
  const starts = onScreen.get(h.room);
  if (!starts) { check(`${h.what}: a state on its screen (block ${h.room})`, false); continue; }
  const solved = solve(starts, h);
  check(`${h.what}: done by playing (${solved?.inputs.length ?? 0} frames)`, !!solved);
  if (!solved) continue;
  const { start, inputs } = solved;
  // replay: the hint shows on the sprite until the step's done, and is gone a second after
  const g = NativeHost.resume(port, start);
  for (const [a, v] of h.when ?? []) g.m.ram[a] = v;
  let shown = 0, onIt = 0, frames = 0, last: { x: number; y: number }[] = [];
  for (const j of inputs) {
    g.m.ram[0x12eb] = ACTIONS[h.what].action;
    g.m.joy1 = g.m.joy2 = 0x1f & ~j; g.m.keys = [];
    const spots = hintSpots(g.m.ram, g.m.vic), s = spriteAt(g.m.vic, h.sprite);
    frames++;
    if (spots.length) { shown++; last = spots; if (s && spots.some((p) => Math.abs(p.x - s.x) < 16 && Math.abs(p.y - s.y) < 16)) onIt++; }
    if (outDir && frames === 3) { fs.mkdirSync(outDir, { recursive: true }); renderPng(g.m, path.join(outDir, `${h.room}-${h.sprite}-start.png`), spots.map((p) => [p.x, p.y])); }
    g.tick(); keep(g.m.ram);
  }
  const done = g.m.ram[h.until[0]] === h.until[1];
  if (outDir) renderPng(g.m, path.join(outDir, `${h.room}-${h.sprite}-done.png`), last.map((p) => [p.x, p.y]));
  for (let k = 0; k < 50; k++) { g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); keep(g.m.ram); }
  const after = hintSpots(g.m.ram, g.m.vic).filter((p) => { const s = spriteAt(g.m.vic, h.sprite); return !!s && Math.abs(p.x - s.x) < 16 && Math.abs(p.y - s.y) < 16; });
  check(`  the hint showed on the sprite while it wasn't done (${onIt} of ${frames} frames, shown in ${shown})`, onIt > frames * 0.8);
  check(`  replayed, the game's own code does it ($${h.until[0].toString(16)} = ${g.m.ram[h.until[0]]})`, done);
  check(`  a second later the hint has gone (${after.length} left)`, after.length === 0);
}
finish();
