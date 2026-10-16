/**
 * Play the native game headlessly and save screenshots from its frame capture.
 *   node /tmp/shots.mjs <game> <outdir> "frame:dirs,..." [snap frames]
 */
import fs from 'node:fs';
import path from 'node:path';
import { unpackState } from '../../../../packages/c64kit/src/c64/machine';
import { renderPng } from '../../../../tools/probe/render';
import { C64_KEYS } from '../../../../packages/c64kit/src/c64/keyboard';
import { NativeHost } from '../host';
import { GAMES, setJoy } from './games';

const [gameId, outDir, plan = '', snapsArg = '100,300,600'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const g = new NativeHost(GAMES[gameId].port, unpackState(new Uint8Array(fs.readFileSync(GAMES[gameId].title))));
const JOY: Record<string, number> = { up: 1, down: 2, left: 4, right: 8, fire: 16 };
const steps = plan.split(',').filter(Boolean).map((s) => { const [f, d] = s.split(':'); return { f: Number(f), d }; });
const snaps = snapsArg.split(',').map(Number);
const last = Math.max(...snaps);
const t0 = performance.now();
let sid = 0;
for (let f = 0; f <= last; f++) {
  const st = [...steps].reverse().find((s) => s.f <= f);
  let j = 0x1f;
  g.m.keys = [];
  if (st) for (const d of st.d.split('+')) { j &= ~(JOY[d] ?? 0); if (C64_KEYS[d]) g.m.keys.push(C64_KEYS[d]); }
  setJoy(g.m, GAMES[gameId], j);
  g.tick();
  sid += g.m.sidWrites.length;
  if (snaps.includes(f)) renderPng(g.m, path.join(outDir, `native-${f}.png`));
}
console.log(`${last + 1} frames in ${(performance.now() - t0).toFixed(0)}ms; ${sid} SID writes; fallbacks ${[...g.fallbacks].map(([a, n]) => `$${a.toString(16)}×${n}`).join(' ') || 'none'}`);
