/**
 * Pictures of the combat effects over a game as it plays (to look at, not a pass/fail check):
 * random fights from a state until an enemy is destroyed and the player is hurt, then the
 * frames after each, with the effects (c64kit/effects.ts) drawn over the picture as the
 * renderer draws them (packages/c64kit/test/raster.ts), the weapon's trail included.
 *
 *   nice -n 15 node tools/test.mjs games/shared/native/test/effects-shots.ts <game> <state> <out-dir> [seed]
 */
import fs from 'node:fs';
import { unpackState } from '../../../../packages/c64kit/src/c64/machine';
import { EffectsModel } from '../../../../packages/c64kit/src/effects';
import { indicesToRgb, renderIndices, rgbPng } from '../../../../tools/probe/render';
import { rasterise } from '../../../../packages/c64kit/test/raster';
import { NativeHost } from '../host';
import { Combat, type CombatSpec } from '../combat';
import { GAMES, setJoy } from './games';
import { entombedCombat } from '../../../entombed/src/combat';
import { karnathCombat } from '../../../karnath/src/combat';
import { blackwycheCombat } from '../../../blackwyche/src/combat';

const SPECS: Record<string, { spec: CombatSpec; keep(ram: Uint8Array): void; action?(ram: Uint8Array): void }> = {
  entombed: { spec: entombedCombat, keep: (r) => { r[0x37f6] = 0; r[0x323d] = 0; r[0x322e] = 1; }, action: (r) => { r[0x3215] = 2; } },
  karnath: { spec: karnathCombat, keep: (r) => { r[0x6ffe] = 100; }, action: (r) => { r[0x322c] = 1; } },
  blackwyche: { spec: blackwycheCombat, keep: (r) => { r[0x9d77] = 100; r[0x342b] = 1; }, action: (r) => { r[0x3415] = 2; } },
};

const [gameId, statePath, outDir, seedArg = '1'] = process.argv.slice(2);
const game = GAMES[gameId], S = SPECS[gameId];
fs.mkdirSync(outDir, { recursive: true });
const g = NativeHost.resume(game.port, unpackState(new Uint8Array(fs.readFileSync(statePath))));
const combat = new Combat(S.spec, () => ({ effects: true, glow: true, invulnerable: false, knockback: false, hitStop: false }));
combat.attach(g);
const fx = new EffectsModel(5);
let seed = Number(seedArg), joy = 0x1f;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const want = new Set((process.env.WANT ?? 'kill,hurt').split(',')), shots: Record<string, number> = {};
let following: { kind: string; frame: number } | null = null;
for (let f = 0; f < 20000 && (want.size || following); f++) {
  if (f % 12 === 0) { joy = 0x1f & ~[0, 1, 2, 4, 8][Math.floor(rnd() * 5)]; if (rnd() < 0.5) joy &= ~16; S.action?.(g.m.ram); }
  setJoy(g.m, game, joy);
  g.tick();
  S.keep(g.m.ram);
  const now = f * 20;
  const events = combat.afterFrame(g.m);
  combat.present(g.m, events, fx, () => {}, now);
  const e = events.find((x) => want.has(x.kind));
  if (e && !following) { want.delete(e.kind); following = { kind: e.kind, frame: f }; }
  if (following) {
    const k = f - following.frame;
    if ([0, 1, 2, 4, 7, 12, 20].includes(k)) {
      const pic = rasterise(indicesToRgb(renderIndices(g.m)), fx.drawables(now), 3, fx.shake(now));
      const name = `${gameId}-${following.kind}-${String(k * 20).padStart(3, '0')}ms.png`;
      rgbPng(`${outDir}/${name}`, pic.rgb, pic.W, pic.H, 1);
      shots[following.kind] = (shots[following.kind] ?? 0) + 1;
    }
    if (k >= 20) following = null;
  }
}
console.log(`pictures in ${outDir}: ${Object.entries(shots).map(([k, n]) => `${k} ${n}`).join(', ')}${want.size ? ` (no ${[...want].join(', ')} seen)` : ''}`);
