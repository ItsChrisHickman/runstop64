/**
 * Combat events (games/shared/native/combat.ts) for The Staff of Karnath and Blackwyche,
 * headless, against the game's own state: random fights from states along each game's
 * recorded routes (re/routes.json; every room they reach), the weapon used often (Karnath:
 * every spell in turn), energy kept up. For each frame:
 *
 * - every hurt is reported once, as it starts: Karnath's damage still to take ($322E) going up
 *   (the cast of a spell aside: it costs a point), Blackwyche's flash of him starting the frame
 *   after (its count, $3799);
 * - every blow the game takes (the code for a weapon touching a creature runs) is reported
 *   with the creature's sprite where it was drawn; the weapon and that sprite were both in
 *   the collisions the game read; then, from the next frame's picture: destroyed (gone, or put
 *   somewhere else) or hit (still there); never reported again while it goes on landing;
 * - a swing (a spell cast, the sword drawn) once, as it starts;
 * - nothing else.
 *
 *   nice -n 15 node tools/test.mjs games/shared/native/test/combat.ts karnath|blackwyche|dragonskulle [frames per state] [states]
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../host';
import { Combat, type CombatSpec } from '../combat';
import { GAMES, setJoy } from './games';
import { karnathCombat } from '../../../karnath/src/combat';
import { blackwycheCombat } from '../../../blackwyche/src/combat';
import { dragonskulleCombat } from '../../../dragonskulle/src/combat';
import { must } from '../../test/must';
import { readRoutes } from '../../test/data';

interface Truth {
  spec: CombatSpec;
  /** The collisions the game read. */
  collisions: number;
  /** Whether a hurt shows in this frame (before, after), and how many frames after the hurt's start it shows. */
  hurtShows(before: Uint8Array, after: Uint8Array, swung: boolean): boolean;
  hurtLag: number;
  weaponBit: number;
  keep(ram: Uint8Array): void;
  /** Before a frame: what the weapon is (choose one often), and whether a cast/swing starts this frame (from memory before and after). */
  arm(ram: Uint8Array, rnd: () => number): void;
  swung(before: Uint8Array, after: Uint8Array): boolean;
}
const TRUTHS: Record<string, Truth> = {
  karnath: {
    spec: karnathCombat, collisions: 0x321a, weaponBit: 8,
    // damage still to take ($322E) is stored (it otherwise counts down a point a frame); not in
    // a frame a spell is cast (it costs a point: stored there too)
    hurtShows: (b, a, swung) => (b[0x322e] === 0 ? a[0x322e] > 0 : a[0x322e] !== b[0x322e] - 1) && !swung,
    hurtLag: 0,
    keep: (r) => { r[0x6ffe] = 100; },
    arm: (r, rnd) => { if (rnd() < 0.05) r[0x322c] = 1 + Math.floor(rnd() * 10); },
    swung: (b, a) => b[0x3216] !== 1 && a[0x3216] === 1,
  },
  blackwyche: {
    spec: blackwycheCombat, collisions: 0x3414, weaponBit: 8,
    // the flash of him starts: its count ($3799) from 0 (the frame after the hurt flag is set)
    hurtShows: (b, a) => b[0x3799] === 0 && a[0x3799] !== 0,
    hurtLag: 1,
    keep: (r) => { r[0x9d77] = 100; r[0x342b] = 1; },
    arm: (r, rnd) => { if (rnd() < 0.05) r[0x3415] = rnd() < 0.8 ? 2 : 1; },
    swung: (b, a) => b[0x1ed0] !== 1 && a[0x1ed0] === 1,
  },
  dragonskulle: {
    spec: dragonskulleCombat, collisions: 0x3414, weaponBit: 8,
    // the block's flash of him starts: its count ($37AB) from 0 (the frame after the hurt flag is set)
    hurtShows: (b, a) => b[0x37ab] === 0 && a[0x37ab] !== 0,
    hurtLag: 1,
    keep: (r) => { r[0x1248] = 0; r[0x123e] = 0x14; r[0x3432] = 0; },
    // the stone mostly, sometimes a jump
    arm: (r, rnd) => { if (rnd() < 0.05) r[0x12eb] = rnd() < 0.8 ? 3 : 4; },
    swung: (b, a) => b[0x1fef] === 0 && a[0x1fef] === 1,
  },
};

const [gameId, framesArg = '1500', statesArg = '40'] = process.argv.slice(2);
const game = GAMES[gameId], T = TRUTHS[gameId];
const port = game.port;
let failures = 0;
const fail = (msg: string) => { failures++; if (failures <= 25) console.log('FAIL', msg); };

// states along the routes
const routes = readRoutes(`games/${gameId}/re/routes.json`);
const title = unpackState(new Uint8Array(fs.readFileSync(game.title)));
const states: MachineState[] = [];
const every = Math.max(100, Math.floor(routes.reduce((n, r) => n + r.filter((_, i) => i % 2).reduce((a, b) => a + b, 0), 0) / Number(statesArg)));
for (const route of routes) {
  const g = new NativeHost(port, title);
  let f = 0;
  for (let i = 0; i < route.length; i += 2) for (let k = 0; k < route[i + 1]; k++) {
    setJoy(g.m, game, route[i] & 0x1f); g.m.keys = route[i] & 32 ? [[1, 2]] : [];
    g.tick(); T.keep(g.m.ram); f++;
    if (f > 200 && f % every === 0) { const s = g.save(); if (s) states.push(s); }
  }
}

const counts = { frames: 0, kill: 0, hit: 0, hurt: 0, swing: 0 };
states.forEach((st, si) => {
  const g = NativeHost.resume(port, st);
  const combat = new Combat(T.spec, () => ({ effects: true, glow: false, invulnerable: false, knockback: false, hitStop: false }));
  combat.attach(g);
  const hooked: { pc: number; coll: number }[] = [];
  { const h = must(g.onHook, 'the combat hook'); g.onHook = (pc) => { hooked.push({ pc, coll: g.m.ram[T.collisions] }); h(pc); }; }
  let s = si + 1;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let joy = 0x1f;
  let lastStrikes: { sprite: number; x: number; y: number }[] = [];
  /** The frame each sprite last had an enemy destroyed on it (the replacement struck by the same blow is not a second one). */
  const killedAt = new Map<number, number>();
  const hurtEvents: number[] = [];
  for (let f = 0; f < Number(framesArg); f++) {
    if (f % 14 === 0) { joy = 0x1f & ~[0, 1, 2, 4, 8, 5, 9, 6, 10][Math.floor(rnd() * 9)]; if (rnd() < 0.5) joy &= ~16; }
    T.arm(g.m.ram, rnd);
    const before = g.m.ram.slice();
    hooked.length = 0;
    setJoy(g.m, game, joy); g.m.keys = [];
    g.tick(); T.keep(g.m.ram);
    counts.frames++;
    const ram = g.m.ram, at = `state ${si} frame ${f}`;
    const events = combat.afterFrame(g.m);
    // hurts: each one the game shows (its flash, its damage) was reported once, as it started (`hurtLag` frames before)
    const swung = T.swung(before, ram);
    // (a frame the truth can't see into, e.g. Karnath's cast: not held against it)
    hurtEvents.push(events.some((e) => e.kind === 'hurt') && !(T.hurtLag === 0 && swung) ? f : -1);
    counts.hurt += events.filter((e) => e.kind === 'hurt').length;
    if (events.filter((e) => e.kind === 'hurt').length > 1) fail(`${at}: more than one hurt reported`);
    if (T.hurtShows(before, ram, swung)) {
      const k = hurtEvents.length - 1 - T.hurtLag;
      if (k < 0) { /* (it started before this state) */ } else if (hurtEvents[k] < 0) fail(`${at}: a hurt shows, none reported ${T.hurtLag} frames before (hooks ${hooked.map((h) => h.pc.toString(16))})`);
      else hurtEvents[k] = -2; // (matched)
    }
    const old = hurtEvents.length - 1 - T.hurtLag - 1;
    if (old >= 0 && hurtEvents[old] >= 0) { fail(`${at}: a hurt reported at frame ${hurtEvents[old]} that the game didn't show`); hurtEvents[old] = -1; }
    // swings
    const sw = events.filter((e) => e.kind === 'swing').length;
    if (sw !== (swung ? 1 : 0)) fail(`${at}: ${swung ? 1 : 0} swings, ${sw} reported`);
    counts.swing += sw;
    // blows taken this frame: the weapon and the creature both in the collisions read there
    for (const h of hooked) {
      const hk = T.spec.hooks[h.pc], k = Array.isArray(hk) ? hk.find((x) => x.when(before) || x.when(ram)) : hk;
      if (k?.kind !== 'strike') continue;
      const ns = [k.sprite(ram)].flat(); // (a thing drawn as either of two sprites: one of them)
      if (!(h.coll & T.weaponBit) || !ns.some((n) => h.coll & (1 << n))) fail(`${at}: a blow on sprite ${ns.join(' or ')} at $${h.pc.toString(16)} with collisions ${h.coll.toString(16)}`);
    }
    // destroyed at once (a 'kill' hook: the game's own end of it begins), where it's drawn
    // (each kill: the sprites it may be drawn as, e.g. Entombed's monster as sprite 1 or 6)
    const direct = hooked.map((h) => { const hk = T.spec.hooks[h.pc], k = Array.isArray(hk) ? hk.find((x) => x.when(ram)) : hk; return k?.kind === 'kill' ? [k.sprite(ram)].flat().filter((n) => n >= 0) : []; }).filter((ns) => ns.length);
    for (const ns of direct) {
      const e = events.filter((x) => x.kind === 'kill').filter((x) => ns.includes(x.sprite));
      const sp = g.m.capture.sprites.find((x) => ns.includes(x.n));
      if (sp && e.length !== 1) fail(`${at}: sprite ${ns.join(' or ')} destroyed, reported ${e.length} times`);
      if (sp && e.length === 1 && (e[0].image.x !== sp.x - 24 || e[0].image.y !== sp.y - 50)) fail(`${at}: sprite ${ns.join(' or ')} destroyed, reported away from where it's drawn`);
      if (e.length === 1) counts.kill++;
    }
    // last frame's blows, judged now: reported once, kill or hit, where the sprite was
    const judged = events.filter((e) => e.kind === 'kill' || e.kind === 'hit').filter((e) => !(e.kind === 'kill' && direct.some((ns) => ns.includes(e.sprite))));
    for (const e of judged) if (!lastStrikes.some((x) => x.sprite === e.sprite && x.x === e.x && x.y === e.y)) fail(`${at}: ${e.kind} of sprite ${e.sprite} without a blow last frame`);
    for (const e of judged) {
      if (e.kind === 'kill') killedAt.set(e.sprite, f);
      else if (f - (killedAt.get(e.sprite) ?? -99) < 12) fail(`${at}: a hit on sprite ${e.sprite} ${f - (killedAt.get(e.sprite) ?? -99)} frames after it was destroyed: the same blow reported twice`);
      if (e.kind === 'kill' && g.m.capture.sprites.some((x) => x.n === e.sprite && Math.abs(x.x - 24 - e.image.x) + Math.abs(x.y - 50 - e.image.y) <= 8)) fail(`${at}: destroyed sprite ${e.sprite} still drawn there`);
      counts[e.kind]++;
    }
    lastStrikes = [];
    for (const h of hooked) {
      const hk = T.spec.hooks[h.pc], k = Array.isArray(hk) ? hk.find((x) => x.when(ram)) : hk;
      if (k?.kind !== 'strike') continue;
      const ns = [k.sprite(ram)].flat(), sp = g.m.capture.sprites.filter((x) => ns.includes(x.n));
      if (!sp.length) continue;
      for (const x of combat.pendingStrikes) if (ns.includes(x.sprite) && !lastStrikes.includes(x)) lastStrikes.push(x);
    }
  }
  if (g.fallbacks.size) console.log(`  (state ${si}: 6502 fallbacks ${[...g.fallbacks.keys()].map((a) => a.toString(16)).join(' ')})`);
});
console.log(`${gameId}: ${states.length} states, ${counts.frames} frames: ${counts.kill} destroyed, ${counts.hit} hit, ${counts.hurt} hurts, ${counts.swing} swings reported, all as the game did them`);
if (failures) { console.log(`${failures} failures`); process.exit(1); }
