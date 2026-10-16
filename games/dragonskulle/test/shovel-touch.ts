/**
 * The shovel by hand (ENHANCED, src/shovel.ts), through the front end as the browser runs it
 * (games/shared/native/play.ts, c64kit stood in by games/shared/test/kit.ts):
 *
 * - launched with a save just inside the shovel's room (walked there by a recorded route, the map
 *   noting the screens as play.ts does), ENHANCED: walking Pendragon up to the shovel with the arrow
 *   keys takes it, by the game's own taking ($6269): the SHOVEL is his ($342F), the shovel gone from
 *   the room, the pause map's panel says so, and C (DIG) digs with it (it did nothing before);
 *   the same once the ants have closed in round it (no timer to beat);
 * - it stays his: travel away and back (the shovel not put back), and the autosave launched again
 *   (a new front end, as a reload does), then travel back into its room;
 * - ORIGINAL: walking up to it, touching it, does nothing (as in 1986); a stone thrown facing up from
 *   below and to its left takes it.
 *
 *   nice -n 15 node tools/test.mjs games/dragonskulle/test/shovel-touch.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer, TRANSPARENT, packState, unpackState } from 'c64kit';
import { indicesToRgb, renderPixels, rgbPng } from '../../../tools/probe/render';
import { MAP_BOX, isNumbers, isRecordOf, mapSummary, type Found } from '../../shared/native/pause';
import { NativeHost } from '../../shared/native/host';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { port } from '../src/native';
import { dragonskulleMap } from '../src/map';
import { run } from '../src/main';
import { readRoutes } from '../../shared/test/data';
import { check, finish } from '../../shared/test/check';

const store = useMemoryStorage();
const titleBytes = fs.readFileSync('games/dragonskulle/assets/dragonskulle-title.state');
stubFetch(titleBytes);

const outDir = process.argv[2];

const ROOM = 18, CELL = '4,2', BELOW = '4,1';

// ---- a save just inside the shovel's room, and the map as walking there noted it ------------------------
const routes = readRoutes('games/dragonskulle/re/routes.json');
let inRoom = '';
const walkedFound: Found = {};
for (const rle of routes) {
  if (inRoom) continue;
  const g = new NativeHost(port, unpackState(new Uint8Array(titleBytes)));
  const noted: Found = {};
  let frame = 0;
  walk: for (let i = 0; i < rle.length; i += 2) for (let k = 0; k < rle[i + 1]; k++) {
    g.m.joy1 = g.m.joy2 = rle[i] & 0x1f; g.m.keys = rle[i] & 32 ? [[1, 2]] : [];
    g.tick(); frame++;
    const r = g.m.ram; r[0x1248] = 0; r[0x123e] = 0x14; r[0x3432] = 0; // (kept alive, as the route was found)
    if (frame <= 300 || g.lastWait !== port.mainLoopWait) continue;
    dragonskulleMap.observe(r, noted, g.m.vic);
    if (r[0x341c] === ROOM) {
      const s = g.save();
      if (s) { inRoom = Buffer.from(packState(s)).toString('base64'); Object.assign(walkedFound, noted); }
      break walk;
    }
  }
}
const at = isRecordOf(walkedFound.at, isNumbers) ? walkedFound.at : {};
check(`a save just inside the shovel's room (${CELL}), the screens before it noted (${Object.keys(at).join(' ')})`, !!inRoom && !!at[CELL] && !!at[BELOW]);

// ---- the front end, launched with a save (as a reload does) ---------------------------------------------
interface Session { p: ReturnType<typeof run>; input: Input; renderer: PixelRenderer }
let s: Session | null = null;
const S = () => { if (!s) throw new Error('not launched'); return s; };
const tick = (n = 1) => { const { p, input } = S(); for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { S().input.keyDown(code); tick(2); S().input.keyUp(code); tick(2); };
const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
const ram = () => { const m = S().p.machine; if (!m) throw new Error('no game yet'); return m.ram; };
const vic = () => { const m = S().p.machine; if (!m) throw new Error('no game yet'); return m.vic; };
const cell = () => `${ram()[0x20a8]},${ram()[0x20a9]}`;
const has = () => ram()[0x342f] === 1;
/** The shovel (sprite 6) as the VIC shows it: on, and on the screen (the taking puts its y at 0). */
const shown = () => !!(vic()[0x15] & 0x40) && vic()[13] !== 0;
const panel = () => mapSummary(dragonskulleMap, ram(), S().p.state.found).join(' / ');

/** Launch the game with a save (`save`: the store's as it is when null), ENHANCED or ORIGINAL; until play is under way. */
async function launch(enhanced: boolean, save: string | null) {
  if (save !== null) {
    for (const k of [...store.keys()]) if (k.startsWith('dragonskulle.save')) store.delete(k);
    store.set('dragonskulle.save.v1', save);
    store.set('dragonskulle.found.v1', JSON.stringify(walkedFound));
  }
  store.set('dragonskulle.assist', JSON.stringify({ enhanced }));
  const input = new Input(nowhere), renderer = new PixelRenderer();
  s = { p: run({ renderer, input, canvas: nowhere }), input, renderer };
  await new Promise((r) => setTimeout(r, 10));
  return until(() => S().p.state.playing, 400) && S().p.frontEnd.enhanced === enhanced;
}
/** Travel by the map: P, then two taps on the place. */
const goTo = (id: string) => {
  const { p, input } = S();
  const q = (dragonskulleMap.places?.(MAP_BOX, ram(), p.state.found) ?? []).find((x) => x.id === id);
  if (!q) return false;
  input.touch = true;
  if (!p.state.paused) tap('KeyP');
  input.point(q.x, q.y); tick(2); input.point(q.x, q.y); tick(3);
  input.touch = false;
  return until(() => !p.state.paused && cell() === id, 100) && (tick(5), true);
};

/** The keys held this frame ('' for none; the rest let go). */
let held = new Set<string>();
const hold = (...keys: string[]) => {
  const { input } = S(), codes = keys.filter((k) => k !== '');
  for (const k of held) if (!codes.includes(k)) input.keyUp(k);
  for (const k of codes) if (!held.has(k)) input.keyDown(k);
  held = new Set(codes);
};
const x = () => ram()[0x341d] + (vic()[0x10] & 4 ? 256 : 0), y = () => ram()[0x341e];
/**
 * Walk up to the shovel as a player would: up into the room, along to below it, then up to it (the
 * back of the floor, where he touches it). Frames walked, how many of them he touched it (the
 * collisions the game read, $3414: him and the shovel), and whether it's his.
 */
function walkUp(max = 600) {
  let f = 0, touched = 0;
  for (; f < max && !has(); f++) {
    const tx = 0x9c;
    hold(f < 30 ? 'ArrowUp' : f < 200 ? (x() < tx - 1 ? 'ArrowRight' : x() > tx + 1 ? 'ArrowLeft' : '') : 'ArrowUp');
    tick();
    if ((ram()[0x3414] & 0x44) === 0x44) touched++;
    if (f > 200 && touched > 20) break;
  }
  hold();
  return { frames: f, touched, taken: has() };
}

/** C (DIG): whether he digs (the game's own: only with the shovel, $342F; digging is $3428), then let him finish. */
function digs() {
  tap('KeyC');
  const dug = until(() => ram()[0x3428] !== 0, 20);
  until(() => ram()[0x3428] === 0, 400); tick(10);
  return dug;
}
function shot(name: string) {
  if (!outDir) return;
  const m = S().p.machine;
  if (!m) return;
  fs.mkdirSync(outDir, { recursive: true });
  const px = renderPixels(m, S().renderer.layout), panels = S().renderer.screen.pixels;
  for (let i = 0; i < px.length; i++) if (panels[i] !== TRANSPARENT) px[i] = panels[i];
  rgbPng(path.join(outDir, `${name}.png`), indicesToRgb(px), 320, 200, 2);
}

// ---- ENHANCED: walk up to it ----------------------------------------------------------------------------
check('ENHANCED: launched with the save, in play', await launch(true, inRoom));
check(`in the shovel's room (${cell()}): the shovel there, not his (${panel()})`, cell() === CELL && shown() && !has());
check('C (DIG) does nothing without it', !digs());
shot('1-enhanced-before');
const walked = walkUp();
tick(2);
shot('2-enhanced-taken');
check(`walked up to it (${walked.frames} frames): touching it takes it, the SHOVEL his ($342F ${ram()[0x342f]}), gone from the room (${shown() ? 'still shown' : 'not shown'})`, walked.taken && walked.touched > 0 && !shown());
tick(80); // (the game's own flash of its icon on taking it: 64 frames, $628F)
check(`it's his as the game has it: C digs now; the map's panel: ${panel()}`, digs() && panel().includes('SHOVEL  YES'));

// ---- it stays his: travel, the autosave and a launch again ---------------------------------------------------
check(`travel to ${BELOW} and back to ${CELL}: still his, not put back in the room (${panel()})`, goTo(BELOW) && goTo(CELL) && has() && !shown());
check(`travel to ${BELOW} (a screen come onto: the autosave)`, goTo(BELOW) && (tick(20), store.has('dragonskulle.save.v2')));
check('launched again with that save (a reload): in play', await launch(true, null));
check(`after the launch, at ${cell()}: the SHOVEL his (${panel()})`, cell() === BELOW && has() && panel().includes('SHOVEL  YES'));
{
  const went = goTo(CELL);
  check(`travel into its room (${cell()}): still his, the shovel not there; C digs`, went && has() && !shown() && digs());
}
shot('3-relaunched-room');

// ---- ENHANCED: once the ants have closed in, walking up to it still takes it ---------------------------------
check('ENHANCED again from the save just inside the room', await launch(true, inRoom));
tick(600); // (every 16 frames each ant takes a step towards it, 36 steps: closed in by about 580 frames)
const late = walkUp();
check(`the ants closed in (x ${vic()[8].toString(16)}, ${vic()[10].toString(16)} round the shovel's ${vic()[12].toString(16)}): walking up to it still takes it (${late.frames} frames)`, late.taken && !shown());

// ---- ORIGINAL: touching it does nothing; a stone takes it -------------------------------------------------
check('ORIGINAL: launched with the save just inside the room', await launch(false, inRoom));
const touch = walkUp(500);
shot('4-original-touching');
check(`walking up to it, touching it (${touch.touched} frames): not taken, as in 1986 (${panel()})`, touch.touched > 20 && !touch.taken && shown());
check('ORIGINAL again from the save just inside the room', await launch(false, inRoom));
{
  // the hand on the stone (X), walked below and to the left of it, then a stone thrown facing up:
  // a tap up turns him to face up, X throws (re/README.md, "The shovel (for the player)")
  let seed = 3;
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);
  let dx = 0, dy = 0, f = 0;
  for (; f < 3000 && !has(); f++) {
    if (f % 100 === 0) { dx = Math.floor(rnd() * 17) - 8; dy = Math.floor(rnd() * 9) - 4; }
    const tx = ram()[0x3408] - 0x38 + dx, ty = 0x8a + dy;
    const k = y() > ty + 1 ? 'ArrowUp' : x() < tx - 1 ? 'ArrowRight' : x() > tx + 1 ? 'ArrowLeft' : y() < ty - 1 ? 'ArrowDown' : '';
    hold(...(k ? [k] : f % 30 < 3 ? ['ArrowUp'] : f % 30 < 7 ? ['KeyX'] : []));
    tick();
    if (ram()[0x62d9] >= 0x24 && f > 1200) break; // (the ants closed in: no stone takes it now)
  }
  hold();
  check(`a stone thrown facing up from below and to its left takes it (${f} frames): the SHOVEL his, gone (${panel()})`, has() && !shown());
}

finish();
