/**
 * Dragonskulle's help for the rules the game never explains (re/README.md, "Rules the game never explains"),
 * through the front end as the browser runs it, in both modes:
 *
 * - ENHANCED (the default): sparkles on the wizard of a river screen while its bridge is shut, none once it is
 *   open; on a dragon; ORIGINAL (E on the pause screen): none, over the same play;
 * - the pause screen's side panel is given the assists, and says what is still to do at a bridge or a dragon
 *   (KILL n MORE, n HITS LEFT) and the seconds the cloak has left, in ENHANCED only;
 * - the CLOAK icon drains from the top as the cloak runs out (ENHANCED), read off the picture as shown against the
 *   picture as the game drew it: as many lines emptied as the counter says, the rest as drawn; ORIGINAL: as drawn.
 *
 *   nice -n 15 node tools/test.mjs games/dragonskulle/test/rules.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer, backgroundAt, emptiedLines, packState } from 'c64kit';
import { renderPixels } from '../../../tools/probe/render';
import { must } from '../../shared/test/must';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { ACTION, BAR, BAR_AT, ICON_AT, cloakIcon } from '../src/main';
import { dragonskulleMap } from '../src/map';
import { cloakLeft } from '../src/rules';
import { run } from '../src/main';
import { enter, sprite } from '../re/rules/lab';
import type { MachineState } from 'c64kit';
import { continueFromTitle } from '../../shared/test/continue-from-title';

stubFetch(fs.readFileSync('games/dragonskulle/assets/dragonskulle-title.state'));

// what the front end gives the map's info (a spy over it: the lines asked for, the assists passed)
const asked: { assist: Readonly<Record<string, boolean>> | undefined }[] = [];
const realInfo = dragonskulleMap.info;
dragonskulleMap.info = (ram, found, assist) => { asked.push({ assist }); return realInfo(ram, found, assist); };

/** A running game, launched with this state as its save. */
async function launch(state: MachineState) {
  useMemoryStorage(new Map([['dragonskulle.save.v1', Buffer.from(packState(state)).toString('base64')]]));
  const input = new Input(nowhere);
  const renderer = new PixelRenderer();
  const p = run({ renderer, input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 0));
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
  const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
  continueFromTitle(p, input, tick); // (the title, ENTER CONTINUE, Enter)
  tick(160); // (the grace: the game's own hurts are kept off a moment after a launch)
  const machine = () => must(p.machine, 'a game');
  const ram = () => machine().ram;
  return { p, input, renderer, tick, tap, machine, ram, toggle() { tap('KeyP'); tap('KeyE'); tap('KeyP'); } };
}

const bridgeState = enter(4, 6), dragonState = enter(9, 10), quietState = (() => { const s = enter(4, 1); s.ram[0x3430] = 1; return s; })();

// ---- sparkles: a bridge's wizard, a dragon -------------------------------------------------------------------------------
type Game = Awaited<ReturnType<typeof launch>>;
/** Frames played: how many the wizard (sprite 5) was on the screen, in how many of them a sparkle was on him. */
function seenIn(g: Game, frames: number) {
  let shown = 0, withWizard = 0;
  for (let f = 0; f < frames; f++) {
    g.ram()[0x1248] = 0; g.ram()[0x123e] = 0x14; // (kept alive)
    g.tick(1);
    const w = sprite({ ram: g.ram(), vic: g.machine().vic }, 5);
    const near = g.renderer.sparkles.markers.some((m) => w.on && Math.abs(m.x - (w.x - 24 + 12)) < 16);
    const there = w.on && w.x > 30 && w.x < 330;
    if (there) withWizard++;
    if (near && there) shown++;
  }
  return { shown, withWizard, any: g.renderer.sparkles.markers.length };
}
{
  const g = await launch(bridgeState);
  const seen = (frames: number) => seenIn(g, frames);
  check(`ENHANCED: ${g.p.frontEnd.enhanced}`, g.p.frontEnd.enhanced);
  const on = seen(700);
  check(`the river screen, the bridge shut: a sparkle on the wizard while he is there (${on.shown} of ${on.withWizard} frames)`, on.withWizard > 100 && on.shown >= on.withWizard * 0.9);
  g.ram()[0x343a] = 0xff; g.tick(2);
  const done = seen(500);
  check(`with the count at $FF (the bridge open): none (${done.shown})`, done.shown === 0 && done.any === 0);
  // (a fresh launch for ORIGINAL: the wizard of a finished bridge is gone for good)
  const h = await launch(bridgeState);
  h.toggle();
  check('E: ORIGINAL', !h.p.frontEnd.enhanced);
  const orig = seenIn(h, 1500);
  check(`ORIGINAL, the same screen and play: no sparkle at all (${orig.shown}; ${orig.any} markers now), though the wizard was there ${orig.withWizard} frames`, orig.shown === 0 && orig.any === 0 && orig.withWizard > 100);
}
{
  const g = await launch(dragonState);
  let shown = 0, head = 0;
  for (let f = 0; f < 300; f++) {
    g.ram()[0x1248] = 0; g.ram()[0x123e] = 0x14;
    g.tick(1);
    const s = sprite({ ram: g.ram(), vic: g.machine().vic }, 1);
    if (s.on && s.y > 0) head++;
    if (g.renderer.sparkles.markers.some((m) => Math.abs(m.x - (s.x - 24 + 12)) < 16 && Math.abs(m.y - (s.y - 50 + 10)) < 16)) shown++;
  }
  check(`the dragon's screen (room ${g.ram()[0x341c]}): a sparkle on its head while it lives (${shown} of ${head} frames)`, head > 100 && shown >= head * 0.9);
  g.ram()[0x72b2] = 1; g.tick(5);
  check(`once its flag is set: none (${g.renderer.sparkles.markers.length})`, g.renderer.sparkles.markers.length === 0);
}

// ---- the pause screen's side panel ------------------------------------------------------------------------------------
{
  const lines = (state: MachineState, set: (r: Uint8Array) => void, enhanced: boolean) => {
    const found = dragonskulleMap.found.empty();
    const copy = new Uint8Array(state.ram);
    set(copy);
    return realInfo(copy, found, { enhanced });
  };
  const bridge = (r: Uint8Array) => { r[0x343a] = 3; };
  const dragon = (r: Uint8Array) => { r[0x676f] = 4; };
  const cloak = (r: Uint8Array) => { r[0x3417] = 1; r[0x124b] = 1; r[0x124a] = 0; r[0x3430] = 1; };
  const l1 = lines(bridgeState, bridge, true), l2 = lines(bridgeState, bridge, false), l3 = lines(dragonState, dragon, true);
  check(`a river screen with 3 of 10 kills: ENHANCED adds "${l1.slice(-2).join('" "')}"; ORIGINAL the usual ${l2.length} lines`, l1.slice(-2).join('|') === 'BRIDGE|KILL 7 MORE' && l2.length === 5 && !l2.includes('BRIDGE'));
  check(`a dragon with 4 hits: "${l3.slice(-2).join('" "')}"`, l3.slice(-2).join('|') === 'DRAGON|6 HITS LEFT');
  const l4 = lines(quietState, cloak, true), l5 = lines(quietState, cloak, false);
  check(`the cloak 256 of 768 frames in: "${l4[3]}" in ENHANCED (${Math.ceil(512 / 50.125)} seconds left), "${l5[3]}" in ORIGINAL`, l4[3] === 'CLOAK 11 SEC' && l5[3] === 'CLOAK   YES');
  // the front end gives the map the assists: ENHANCED on, then off
  const g = await launch(quietState);
  asked.length = 0;
  g.tap('KeyP'); g.tick(3);
  const a1 = asked.at(-1)?.assist?.enhanced;
  g.tap('KeyE'); g.tick(3);
  const a2 = asked.at(-1)?.assist?.enhanced;
  check(`the pause screen asks for its lines with the assists (ENHANCED on: ${a1}; after E: ${a2})`, a1 === true && a2 === false);
}

// ---- the cloak's icon draining ----------------------------------------------------------------------------------------
{
  const W = 320;
  const g = await launch(quietState);
  /**
   * The icon as shown against as drawn: the lines the counter says emptied (its lit pixels dark grey, from the top; the top lines of
   * the picture are blank, so which show is the picture's own), every other pixel as the game drew it. `wrong`: pixels not so;
   * `changed`: pixels that differ from as drawn.
   */
  const icon = () => {
    const m = g.machine(), left = cloakLeft(m.ram), at = cloakIcon.at(m.ram) ?? { ...ICON_AT(ACTION.cloak), w: 24 };
    // (the characters only: sprites reach over the bar)
    const chars = { ram: m.ram, capture: { ...m.capture, sprites: [] } };
    const ref = renderPixels(chars), shown = renderPixels(chars, g.renderer.layout);
    // (the icon is moved to its slot in the bar: its place there, as the layout declares it)
    const slot = BAR.findIndex((b) => b.action === ACTION.cloak), to = { x: BAR_AT.icon(slot) + at.x - ICON_AT(ACTION.cloak).x, y: BAR_AT.icons + at.y };
    const want = left === null || !cloakIcon.at(m.ram) ? 0 : emptiedLines(left, at.h);
    let wrong = 0, changed = 0;
    for (let y = 0; y < at.h; y++) for (let x = 0; x < at.w; x++) {
      const r = ref[(at.y + y) * W + at.x + x], s = shown[(to.y + y) * W + to.x + x];
      const expect = y < want && r !== backgroundAt(m.capture, at.y + y) ? cloakIcon.empty : r;
      if (s !== expect) wrong++;
      if (s !== r) changed++;
    }
    return { wrong, changed, want, shownAt: cloakIcon.at(m.ram) !== null };
  };
  for (const enhanced of [true, false]) {
    if (!enhanced) g.toggle();
    check(`${enhanced ? 'ENHANCED' : 'ORIGINAL'}: the switch`, g.p.frontEnd.enhanced === enhanced);
    g.ram()[0x3430] = 1; g.tap('KeyV');
    const rows: string[] = [];
    let ok = true, drained = 0, frame = 4;
    for (const at of [0, 100, 250, 400, 550, 700, 760]) {
      while (frame < at && g.ram()[0x3417] !== 0) { g.tick(1); frame++; }
      const i = icon();
      rows.push(`${frame}:${i.want} lines, ${i.changed} pixels changed, ${i.wrong} wrong`);
      if (i.wrong !== 0 || (!enhanced && (i.changed !== 0 || i.shownAt))) ok = false;
      if (i.changed > 0) drained++;
    }
    while (g.ram()[0x3417] !== 0) { g.tick(1); frame++; }
    g.tick(2);
    const after = icon();
    check(`${enhanced ? 'ENHANCED: the CLOAK icon drains' : 'ORIGINAL: the icon stays as drawn'} as the cloak runs out (by frame: ${rows.join('; ')}), the cloak ending at frame ${frame}; then as drawn (${after.changed} pixels changed)`, ok && (enhanced ? drained >= 5 : drained === 0) && after.changed === 0 && frame >= 760 && frame <= 775);
  }
}

finish();
