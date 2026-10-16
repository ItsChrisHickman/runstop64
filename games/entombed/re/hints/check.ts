/**
 * Check the hints against the game: for each chamber in src/hints.ts, from its state (entered
 * as the game does, with the flags it was solved with), replay how each step was done
 * (re/hints/solved) and check:
 *   - just before the step is done, the game's hints (src/hint-spots.ts) show it: where
 *     Pendragon stands (within 12 pixels, scrolled as the chamber is), or for a hint on the thing
 *     it's done to (a sprite), on that sprite, which he has touched or whipped (its bit in the
 *     sprite collisions, $3214) in the second before;
 *   - once it's done (a second later), its hint has gone;
 *   - the chamber's code really did it (the step's goal bytes have their values).
 * Renders each chamber with its hints ringed as they show on going in, and each step's moment
 * (<outdir>/chamber-NN.png, chamber-NN-step-K.png) to look at.
 *
 *   nice -n 15 node tools/test.mjs games/entombed/re/hints/check.ts <outdir> [chamber...]
 */
import fs from 'node:fs';
import { renderPng } from '../../../../tools/probe/render';
import { HINTS, type Hint } from '../../src/hints';
import { hintSpots } from '../../src/hint-spots';
import { ACTIVATORS } from './activators';
import { chamberState, gameStart } from './chambers';
import { replay, where, onScreen } from './play';
import { readSolved } from './solved';

const [outDir, ...only] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const start = gameStart();
let failed = 0, passed = 0;
const fail = (msg: string) => { failed++; console.log(`  FAIL ${msg}`); };
const spotsOf = (m: { ram: Uint8Array; vic: Uint8Array }) => hintSpots(m.ram, m.vic).map(({ x, y }): [number, number] => [x, y]);
const active = (h: Hint, ram: Uint8Array) => ram[h.until[0]] !== h.until[1] && (h.when ?? []).every(([a, v]) => ram[a] === v);
const nn = (n: number) => String(n).padStart(2, '0');

for (const key of Object.keys(HINTS)) {
  const n = Number(key);
  if (only.length && !only.includes(key)) continue;
  const solved = readSolved(new URL(`./solved/chamber-${nn(n)}.json`, import.meta.url));
  const state = chamberState(n, Object.fromEntries(Object.entries(solved.given).map(([a, v]) => [Number(a), v])), start);
  console.log(`chamber ${n}`);
  const g0 = replay(state, [[0, 3]]);
  renderPng(g0.m, `${outDir}/chamber-${nn(n)}.png`, spotsOf(g0.m));
  // the steps done by playing, in order: one hint each (as gen.ts writes them)
  const steps = ACTIVATORS[n].steps.filter((st) => solved.steps.some((s) => s.name === st.name));
  if (steps.length !== HINTS[n].length) fail(`${steps.length} steps done, ${HINTS[n].length} hints: run gen.ts`);
  steps.forEach((st, k) => {
    const s = solved.steps.find((q) => q.name === st.name), hint = HINTS[n][k];
    if (!s) throw new Error(`chamber ${n}: ${st.name} isn't in its solved steps`); // (only those are listed)
    // just before: the path less its last frame
    const before = s.path.map(([i, f]): [number, number] => [i, f]);
    before[before.length - 1][1]--;
    const g = replay(state, before.filter(([, f]) => f > 0));
    const p = where(g), [px, py] = onScreen(p), spots = spotsOf(g.m);
    const scroll = p.x - (g.m.vic[4] | (g.m.vic[0x10] & 4 ? 256 : 0));
    renderPng(g.m, `${outDir}/chamber-${nn(n)}-step-${k + 1}.png`, spots);
    let ok = true;
    if (!active(hint, g.m.ram)) { ok = false; fail(`${st.name}: its hint isn't showing just before`); }
    if (hint.sprite === undefined && !spots.some(([x, y]) => Math.hypot(x - (px - scroll), y - py) <= 12)) { ok = false; fail(`${st.name}: no hint where he is (${px - scroll},${py}) just before: ${JSON.stringify(spots)}`); }
    // done (its last frame: and in the second up to it, did he touch the sprite?), and a second later
    let touched = false, frame = 0;
    const total = s.path.reduce((t, [, f]) => t + f, 0);
    const done = replay(state, s.path, (h) => { if (hint.sprite !== undefined && ++frame > total - 50 && h.m.ram[0x3214] & (1 << hint.sprite)) touched = true; });
    const after = replay(state, [...s.path, [0, 50]]);
    if (!st.goal.every(([a, v]) => done.m.ram[a] === v)) { ok = false; fail(`${st.name}: not done by its path`); }
    if (hint.sprite !== undefined && !touched) { ok = false; fail(`${st.name}: he didn't touch sprite ${hint.sprite} in the second before`); }
    if (active(hint, after.m.ram)) { ok = false; fail(`${st.name}: its hint still shows once done`); }
    if (ok) passed++;
    console.log(`  ${st.name}: ${ok ? 'ok' : 'FAILED'} (he's at ${px - scroll},${py}; ${spots.length} hint${spots.length === 1 ? '' : 's'} showing)`);
  });
}
console.log(failed ? `${failed} FAILED, ${passed} ok` : `all ${passed} hints check out`);
process.exit(failed ? 1 : 0);
