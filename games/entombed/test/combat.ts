/**
 * Entombed's combat events (src/combat.ts, games/shared/native/combat.ts), headless, against
 * the game's own state: random fights in the corridors of every floor and in the chambers
 * with monsters (the whip in hand, air and ankhs kept up), and for each frame:
 *
 * - every monster the whip destroys is reported once, in that frame, as the sprite it was,
 *   where it was drawn (the monster's state byte goes from alive to 0 with the collision the
 *   game read being exactly the whip, Pendragon and it: $6C8B, $6C98, $6C9F), and it's gone
 *   from the next frame's picture;
 * - every hurt is reported once, as it starts (the block's hurt flag going from 0 to 1);
 * - every swing of the whip once, as it starts ($20CF from 0 to 1);
 * - nothing else is reported.
 *
 *   nice -n 15 node tools/test.mjs games/entombed/test/combat.ts [frames per run] [runs per floor]
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from '../../../packages/c64kit/src/c64/machine';
import { imageCentre, spriteImage } from '../../../packages/c64kit/src/effects';
import { NativeHost } from '../../shared/native/host';
import { cpu } from '../../shared/native/cpu';
import { Combat, type CombatEvent } from '../../shared/native/combat';
import { port } from '../src/native';
import { entombedMap } from '../src/map';
import { entombedCombat } from '../src/combat';
import { chamberState } from '../re/hints/chambers';
import { must } from '../../shared/test/must';

const FRAMES = Number(process.argv[2] ?? 3000), RUNS = Number(process.argv[3] ?? 2);
const title = unpackState(new Uint8Array(fs.readFileSync('games/entombed/assets/entombed-title.state')));
let failures = 0;
const fail = (msg: string) => { failures++; if (failures < 30) console.log('FAIL', msg); };

/** The start of a game (fire on the title). */
function gameStart(): MachineState {
  const g = new NativeHost(port, title);
  for (let f = 0; f < 200; f++) { g.m.joy1 = g.m.joy2 = f > 50 && f < 60 ? 0x0f : 0x1f; g.tick(); }
  return must(g.save(), 'a save');
}
/** A host that runs `act` (between frames, registers kept) at its first main loop wait. */
function host(state: MachineState, act?: (ram: Uint8Array) => void) {
  const g = NativeHost.resume(port, state);
  let done = false;
  if (act) g.onWait = (site) => { if (done || site !== port.mainLoopWait) return; done = true; const r = { ...cpu }; act(g.m.ram); Object.assign(cpu, r); };
  return g;
}

// the corridors' monsters: state byte, the collision that destroys it (whip, Pendragon, monster), its sprites
const MONSTERS = [{ at: 0x6c8b, coll: [0x0d], sprite: [0] }, { at: 0x6c98, coll: [0x0e, 0x4c], sprite: [1, 6] }, { at: 0x6c9f, coll: [0x8c], sprite: [7] }];
// the hurt flags: the corridors' ($6C8C) and each chamber block's (src/combat.ts), by the block's first jump
const HURT_FLAGS: Record<number, number> = { 0x60f8: 0x6c8c };
const CHAMBER_FLAGS = [0x64f9, 0x6215, 0x6348, 0x6479, 0x62c3, 0x6432, 0x63b3, 0x63e1, 0x6559, 0x640d, 0x6541];

const counts = { kill: 0, hurt: 0, swing: 0, frames: 0 };
function fight(start: MachineState, seed: number, label: string) {
  const g = host(start);
  const combat = new Combat(entombedCombat, () => ({ effects: true, glow: false, invulnerable: false, knockback: false, hitStop: false }));
  combat.attach(g);
  const hooked: number[] = [];
  { const h = must(g.onHook, 'the combat hook'); g.onHook = (pc) => { hooked.push(pc); h(pc); }; }
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let joy = 0x1f;
  const block = () => g.m.ram[0x6001] | (g.m.ram[0x6002] << 8);
  let prevKilled: CombatEvent[] = [];
  for (let f = 0; f < FRAMES; f++) {
    if (f % 12 === 0) { joy = 0x1f & ~[0, 1, 2, 4, 8, 5, 9, 6, 10][Math.floor(rnd() * 9)]; if (rnd() < 0.45) joy &= ~16; g.m.ram[0x3215] = rnd() < 0.85 ? 2 : 1; }
    const ram = g.m.ram;
    const before = { mon: MONSTERS.map((m) => ram[m.at]), whip: ram[0x20cf], blk: block(), flags: CHAMBER_FLAGS.map((a) => ram[a]), c6c8c: ram[0x6c8c] };
    g.m.joy1 = g.m.joy2 = joy;
    hooked.length = 0;
    g.tick();
    ram[0x37f6] = 0; ram[0x323d] = 0; ram[0x322e] = 1; // (air, ankhs, the whip)
    const events = combat.afterFrame(g.m);
    counts.frames++;
    const at = `${label} frame ${f}`;
    // monsters gone from last frame's kills
    for (const e of prevKilled) if (g.m.capture.sprites.some((sp) => sp.n === e.sprite && Math.abs(imageCentre(spriteImage(sp)).x - e.x) < 2 && Math.abs(imageCentre(spriteImage(sp)).y - e.y) < 2)) fail(`${at}: sprite ${e.sprite} destroyed last frame still drawn there`);
    // the truth: kills
    const kills: number[] = [];
    if (before.blk === 0x60f8 && block() === 0x60f8) MONSTERS.forEach((m, i) => { if (before.mon[i] === 2 && ram[m.at] === 0 && m.coll.includes(ram[0x3214])) kills.push(m.sprite[m.coll.indexOf(ram[0x3214])]); });
    const got = events.filter((e) => e.kind === 'kill');
    // (the monster drawn as sprite 1 or 6 is one: the one drawn is reported)
    const same = (a: number, b: number) => a === b || (a === 1 && b === 6) || (a === 6 && b === 1);
    for (const k of kills) {
      const e = got.filter((x) => same(x.sprite, k));
      if (e.length !== 1) fail(`${at}: monster sprite ${k} destroyed, reported ${e.length} times (hooks ${hooked.map((x) => x.toString(16))}, drawn ${g.m.capture.sprites.map((x) => x.n)})`);
      else {
        const sp = g.m.capture.sprites.find((x) => x.n === e[0].sprite);
        const c = sp && imageCentre(spriteImage(sp));
        if (!c || Math.abs(c.x - e[0].x) > 0.5 || Math.abs(c.y - e[0].y) > 0.5) fail(`${at}: kill reported at ${e[0].x},${e[0].y}, sprite drawn at ${c?.x},${c?.y}`);
      }
    }
    for (const e of got) if (!kills.some((k) => same(k, e.sprite))) fail(`${at}: a kill reported (sprite ${e.sprite}) with none in the game`);
    counts.kill += got.length;
    prevKilled = got;
    // hurts: a flag of the block in going 0 -> 1
    let hurts = 0;
    if (before.blk === block()) {
      if (block() === 0x60f8 && before.c6c8c === 0 && ram[0x6c8c] === 1) hurts++;
      CHAMBER_FLAGS.forEach((a, i) => { if (block() !== 0x60f8 && before.flags[i] === 0 && ram[a] === 1 && entombedHurtFlag(block()) === a) hurts++; });
    }
    const gotHurt = events.filter((e) => e.kind === 'hurt').length;
    if (before.blk === block() && gotHurt !== hurts) fail(`${at}: ${hurts} hurts started, ${gotHurt} reported (block $${block().toString(16)})`);
    counts.hurt += gotHurt;
    // swings
    const swings = before.whip === 0 && ram[0x20cf] === 1 ? 1 : 0, gotSwing = events.filter((e) => e.kind === 'swing').length;
    if (gotSwing !== swings) fail(`${at}: ${swings} swings, ${gotSwing} reported`);
    counts.swing += gotSwing;
  }
  if (g.fallbacks.size) fail(`${label}: 6502 fallbacks ${[...g.fallbacks.keys()].map((a) => a.toString(16))}`);
}

/** Which hurt flag the chamber block in uses (by its first jump; as found in the blocks' code). */
function entombedHurtFlag(blk: number) {
  const flags: Record<number, number> = { 0x6135: 0x64f9, 0x6122: 0x6215, 0x613b: 0x6348, 0x614c: 0x6479, 0x612c: 0x62c3, 0x6160: 0x6432, 0x6178: 0x63b3, 0x6145: 0x63e1, 0x617a: 0x6559, 0x6143: 0x640d, 0x619a: 0x6541 };
  return flags[blk] ?? -1;
}
void HURT_FLAGS;

const start = gameStart();
// the corridors: a junction on each floor
for (let floor = 1; floor <= 7; floor++) {
  const all = [...Array(256).keys()].map((k) => `${k & 15},${k >> 4}`);
  const places = entombedMap.places({ x: 0, y: 0, w: 196, h: 150 }, start.ram, { cells: { [floor]: all } });
  for (let r = 0; r < RUNS && places.length; r++) {
    const to = places[(r * 7) % places.length].id;
    const g = host(start, (ram) => { entombedMap.go(to, ram, {}); });
    for (let f = 0; f < 3; f++) g.tick();
    fight(must(g.save(), 'a save'), floor * 100 + r, `floor ${floor} ${to}`);
  }
}
// the chambers with monsters that hurt
for (const n of [4, 5, 6, 9, 11, 13, 14, 16, 18, 19, 20, 21, 22, 23, 24, 25]) {
  let st: MachineState;
  try { st = chamberState(n, {}, start); } catch { continue; }
  fight(st, n, `chamber ${n}`);
}
console.log(`${counts.frames} frames: ${counts.kill} monsters destroyed, ${counts.hurt} hurts, ${counts.swing} swings reported, all as the game did them`);
if (failures) { console.log(`${failures} failures`); process.exit(1); }
