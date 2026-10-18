/**
 * A dragon that is hit shows it (ENHANCED's ENEMIES SHOW HITS, games/shared/native/colour-cycle.ts, the `react` hook at $6561 of
 * the dragons' block): on a dragon's screen stones are thrown until one is counted ($676F up one). In ENHANCED the dragon's
 * sprites (1, 4, 5, 6, 7) are drawn in other colours for some frames (the frame's capture; the tenth for longer, as it dies) and
 * then as the game set them, while the game's own colour registers are never touched; in ORIGINAL nothing is ever recoloured.
 *
 *   nice -n 15 node tools/test.mjs games/dragonskulle/test/dragon-react.ts /tmp/dragon-react
 */
import fs from 'node:fs';
import { Input, PixelRenderer, packState } from 'c64kit';
import { renderPng } from '../../../tools/probe/render';
import { must } from '../../shared/test/must';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { run } from '../src/main';
import { HITS } from '../src/rules';
import { ACTION, STAND, enter } from '../re/rules/lab';
import { HIT_CYCLE } from '../../shared/native/colour-cycle';
import type { MachineState } from 'c64kit';

stubFetch(fs.readFileSync('games/dragonskulle/assets/dragonskulle-title.state'));
const outDir = process.argv[2];
if (outDir) fs.mkdirSync(outDir, { recursive: true });

const DRAGON = [1, 4, 5, 6, 7];
const dragonState = enter(9, 10);

async function launch(state: MachineState, enhanced: boolean) {
  useMemoryStorage(new Map([['dragonskulle.save.v1', Buffer.from(packState(state)).toString('base64')]]));
  const input = new Input(nowhere);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 0));
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
  const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
  for (let i = 0; i < 900 && !p.state.playing; i++) tick(1);
  tick(160); // (the grace)
  if (p.frontEnd.enhanced !== enhanced) { tap('KeyP'); tap('KeyE'); tap('KeyP'); }
  const m = () => must(p.machine, 'a game');
  const alive = () => { const r = m().ram; r[0x1248] = 0; r[0x123e] = 0x14; r[0x3432] = 0; };
  /** One frame of throwing a stone from beneath the dragon, facing up. */
  const throwing = () => {
    const { ram, vic } = m();
    alive();
    ram[0x12eb] = ACTION.stone;
    ram[0x341d] = STAND.x + 0x78; ram[0x341e] = STAND.y; vic[0x04] = STAND.x + 0x78; vic[0x05] = STAND.y; vic[0x10] &= ~4;
    input.keyDown('Space');
    tick(1);
  };
  const faceUp = () => { input.keyDown('ArrowUp'); alive(); tick(2); input.keyUp('ArrowUp'); input.keyUp('Space'); };
  /** What is drawn for the dragon: its sprites' colours in the frame's capture and the game's registers for them. */
  const drawn = () => {
    const mm = m();
    return mm.capture.sprites.filter((s) => DRAGON.includes(s.n)).map((s) => ({ n: s.n, shown: s.colour, mc: [s.mc1, s.mc2], reg: mm.vic[0x27 + s.n] & 15 }));
  };
  return { p, input, tick, tap, m, throwing, faceUp, drawn, alive };
}
type Game = Awaited<ReturnType<typeof launch>>;

/** Throw until a stone is counted: the frame after it, and the colours drawn before it. */
function untilHit(g: Game, normalPng?: string, limit = 3000) {
  g.faceUp();
  const before = g.drawn();
  const hits = g.m().ram[HITS];
  for (let f = 0; f < limit; f++) {
    if (normalPng) renderPng(g.m(), normalPng); // (the last one written is the frame before the hit)
    g.throwing();
    if (g.m().ram[HITS] !== hits) return { before, frame: f };
  }
  return null;
}

/** The next `frames` frames after a hit (the stone kept from being thrown again): how many showed another colour than the game's. */
function after(g: Game, frames: number, flashedPng?: string, only: readonly number[] = DRAGON) {
  let flashed = 0, regsMoved = 0, bad = 0;
  const regs0 = Array.from(g.m().vic.slice(0x27, 0x2f));
  const colours = new Set<number>();
  for (let f = 0; f < frames; f++) {
    const d = g.drawn().filter((s) => only.includes(s.n));
    if (d.length > 0) {
      const differs = d.filter((s) => s.shown !== s.reg);
      if (differs.length > 0) {
        flashed++;
        differs.forEach((s) => colours.add(s.shown));
        if (differs.length !== d.length) bad++; // (a part of the dragon left as it was)
        if (flashedPng && flashed === 2) renderPng(g.m(), flashedPng);
      }
    }
    if (!Array.from(g.m().vic.slice(0x27, 0x2f)).every((v, i) => only.includes(i) ? v === regs0[i] : true)) regsMoved++;
    g.alive();
    g.input.keyUp('Space');
    g.tick(1);
  }
  return { flashed, regsMoved, bad, colours: colours.size };
}

for (const enhanced of [true, false]) {
  const name = enhanced ? 'ENHANCED' : 'ORIGINAL';
  const g = await launch(dragonState, enhanced);
  check(`${name}: the switch`, g.p.frontEnd.enhanced === enhanced);
  const hit = untilHit(g, outDir && enhanced ? `${outDir}/dragon-normal.png` : undefined);
  check(`${name}: a stone is counted on the dragon (${hit ? `after ${hit.frame} frames` : 'never'}, sprites: ${hit?.before.map((s) => `${s.n}:${s.shown}`).join(' ')})`, hit !== null && hit.before.length >= 4);
  if (!hit) continue;
  check(`${name}: before it, the dragon is drawn in the colours the game set`, hit.before.every((s) => s.shown === s.reg));
  const events = g.p.combat?.events ?? [];
  check(`${name}: the combat events of the frame: ${events.map((e) => e.kind).join(', ') || 'none'}${enhanced ? ' (a react)' : ''}`, events.some((e) => e.kind === 'react') === true);
  const r = after(g, HIT_CYCLE.colours.length + 12, outDir && enhanced ? `${outDir}/dragon-flashed.png` : undefined);
  if (enhanced) {
    check(`ENHANCED: the dragon is drawn in other colours for ${r.flashed} frames (${HIT_CYCLE.colours.length} in the cycle), through ${r.colours} colours, every part of it`, r.flashed >= HIT_CYCLE.colours.length - 2 && r.flashed <= HIT_CYCLE.colours.length + 1 && r.colours >= 3 && r.bad === 0);
    check('ENHANCED: its colour registers were never touched', r.regsMoved === 0);
    const end = g.drawn();
    check('ENHANCED: afterwards it is drawn as the game set it', end.length > 0 && end.every((s) => s.shown === s.reg && s.mc[0] !== 0xff));
  } else {
    check(`ORIGINAL: never recoloured (${r.flashed} frames) and no colour register touched`, r.flashed === 0 && r.regsMoved === 0);
  }

  // the tenth: the head flashes as any hit's (the game's own death then cycles the body's colours, as it always did)
  g.m().ram[HITS] = 9;
  const tenth = untilHit(g);
  check(`${name}: the tenth stone is counted`, tenth !== null);
  if (tenth) {
    const d = after(g, HIT_CYCLE.colours.length + 60, undefined, [1]);
    check(enhanced ? `ENHANCED: the tenth shows on the head for ${d.flashed} frames, then the game's own death goes on` : `ORIGINAL: the tenth recolours not the head (${d.flashed})`,
      enhanced ? d.flashed >= HIT_CYCLE.colours.length - 2 && d.flashed <= HIT_CYCLE.colours.length + 1 && d.regsMoved === 0 : d.flashed === 0);
  }
}

finish();
