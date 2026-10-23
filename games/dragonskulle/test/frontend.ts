/**
 * Dragonskulle's front end, headless (games/shared/native/play.ts as the browser runs it, c64kit
 * stood in by games/shared/test/kit.ts):
 *
 * - the title (its key lines rewritten), then a new game with Space: on the beach;
 * - the action keys: X the stone (thrown with the key), Z jump, C shovel, V cloak (the hand moves);
 * - continuing a save deep in the caves (made by walking a recorded route, the map noting the
 *   screens as play.ts does): with all five lives;
 * - the pause screen with the island map: the screens been on; travel back by the map (keys, and
 *   taps), arriving where walking in put him; ENHANCED (on unless chosen off; E changes it);
 * - fights in the caves: a hurt flashes the picture's edges and pulses the faces, with its sound
 *   (both modes); with ENHANCED no hurt starts within 75 frames of the last (ORIGINAL: closer);
 * - the energy on the face of the life under way, read off the picture as shown: full is the face as
 *   drawn; over random fights and a life's last points (both modes) its lines empty from the top as
 *   the energy says, the rest of the status line as drawn; the skull and a full next face when a
 *   life goes; full again on travelling (ENHANCED);
 * - losing every life: CONTINUE? (Enter), back on the last screen with all five lives;
 * - the bar, read off the picture as it's shown (tools/probe's renderPixels with the front end's
 *   layout): the status line at the top, the play area and its sprites under it, 4 lines up
 *   (its top four, never drawn on, left out), the icons at the bottom in the keys' order (jump,
 *   stone, shovel, cloak; no pause), each labelled below it (a gap between), centred, with its key
 *   in the game's letters; each key puts the game's hand in its slot and does its action, as soon
 *   as Space does with the hand already there (standing and walking); Enter (or
 *   any other key) one along the bar a press; a key in a hit-stop still picks its action; the
 *   faces' pulse goes with them; the same in ORIGINAL.
 *
 *   nice -n 15 node tools/test.mjs games/dragonskulle/test/frontend.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer, TRANSPARENT, backgroundAt, emptiedLines, labelFont, packState, placeBox, placeDrawable, placePoint, unpackState } from 'c64kit';
import { indicesToRgb, renderPixels, rgbPng } from '../../../tools/probe/render';
import { sidLog } from '../../shared/test/kit';
import { MAP_BOX } from '../../shared/native/pause';
import { NativeHost } from '../../shared/native/host';
import { port } from '../src/native';
import { dragonskulleMap, type DragonskulleFound } from '../src/map';
import { LOCATION } from '../src/travel';
import { ACTION, BAR, BAR_AT, ENERGY, ICON_AT, PLAY, dragonskulleLayout, energyFace, run } from '../src/main';
import { dragonskulleCombat } from '../src/combat';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { readRoute, parseOptions } from '../../shared/test/data';
import { check, finish } from '../../shared/test/check';

// a browser's storage, in memory; the title snapshot from disk
const store = useMemoryStorage();
const titleBytes = fs.readFileSync('games/dragonskulle/assets/dragonskulle-title.state');
stubFetch(titleBytes);


// ---- a save deep in the caves, and the map as walking there noted it ---------------------------------
const route = readRoute('games/dragonskulle/re/routes.json');
const walkedFound = dragonskulleMap.found.empty();
const arrivals = new Map<string, number[]>(); // cell -> the location bytes as he came onto it
let deepSave = '';
{
  const g = new NativeHost(port, unpackState(new Uint8Array(titleBytes)));
  let frame = 0;
  for (let i = 0; i < route.length; i += 2) for (let k = 0; k < route[i + 1]; k++) {
    const v = route[i];
    g.m.joy1 = g.m.joy2 = v & 0x1f; g.m.keys = v & 32 ? [[1, 2]] : [];
    g.tick(); frame++;
    const r = g.m.ram; r[0x1248] = 0; r[0x123e] = 0x14; r[0x3432] = 0; // (kept alive, as the route was found)
    if (frame < 300 || g.lastWait !== port.mainLoopWait) continue;
    const before = new Set(Object.keys(atOf(walkedFound)));
    dragonskulleMap.observe(r, walkedFound, g.m.vic);
    for (const key of Object.keys(atOf(walkedFound))) if (!before.has(key)) arrivals.set(key, LOCATION.map((a) => r[a]));
  }
  const s = g.save();
  if (s) { s.ram[0x1248] = 6; deepSave = Buffer.from(packState(s)).toString('base64'); } // (two lives lost: continuing gives them back)
}
function atOf(found: DragonskulleFound): Record<string, unknown> {
  return { ...found.at };
}

store.set('dragonskulle.save.v1', deepSave);
store.set('dragonskulle.found.v1', JSON.stringify(walkedFound));

const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
const machine = () => { const m = p.machine; if (!m) throw new Error('no game yet'); return m; };
/** Each action under way, as the game keeps it: a jump ($3425), a stone thrown ($1FEF), digging ($3428), the cloak on ($3417). */
const STARTED: Record<number, () => boolean> = {
  4: () => ram()[0x3425] === 1, 3: () => ram()[0x1fef] !== 0, 0: () => ram()[0x3428] !== 0, 1: () => ram()[0x3417] !== 0,
};
/** Nothing under way (each action's own time out): ready for the next. */
const idle = () => { until(() => Object.values(STARTED).every((f) => !f()), 3000); tick(10); };
/** The shovel and the cloak found (as the game marks them: $342F, $3430), so C and V use them. */
const found = () => { ram()[0x342f] = 1; ram()[0x3430] = 1; };
const ram = () => machine().ram;
const cell = () => `${ram()[0x20a8]},${ram()[0x20a9]}`;
const lives = () => 5 - Math.floor(ram()[0x1248] / 3);
const text = (at: number, n: number) => String.fromCharCode(...ram().subarray(at, at + n));
const options = (): Record<string, unknown> => parseOptions(store.get('dragonskulle.assist'));

const outDir = process.argv[2];
/** A picture as the browser shows it: the game's (laid out as the front end has it) with the front end's panels over it. */
function picture() {
  const px = renderPixels(machine(), renderer.layout), panels = renderer.screen.pixels;
  for (let i = 0; i < px.length; i++) if (panels[i] !== TRANSPARENT) px[i] = panels[i];
  return px;
}
function shot(name: string) {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  rgbPng(path.join(outDir, `${name}.png`), indicesToRgb(picture()), 320, 200, 2);
}

// ---- launched with a save deep in the caves: straight back into play ----------------------------------
await new Promise((r) => setTimeout(r, 10));
tick(10);
check('launched with a save: the title not shown (the screen kept black) on the way back into play', !!p.machine && !p.state.playing && p.state.launching && renderer.screen.pixels.every((v) => v === 0));
check(`its key lines for this keyboard ("${text(0x9327, 23)}" / "${text(0x9373, 30)}"), no action keys (the bar labels them)`, text(0x9327, 23) === 'PRESS P   TO PAUSE GAME' && text(0x9373, 30) === ' PRESS SPACE OR FIRE TO START ' && text(0x9355, 30).trim() === '');
until(() => p.state.playing, 200);
tick(5);
shot('0-launched');
const deep = cell();
check(`then back in play in the caves at ${deep}, with all five lives (${lives()}), without a key`, p.state.playing && !p.state.launching && deep === '5,4' && lives() === 5);
check('ENHANCED is on unless chosen off: its play changes on, the effects on', p.frontEnd.enhanced && !!p.options.eightWay && !!p.options.invulnerable && !!p.options.effects);

// ---- the pause screen: the map; ENHANCED --------------------------------------------------------------
tap('KeyP');
check('P: the pause screen', p.state.paused);
const places = dragonskulleMap.places?.(MAP_BOX, ram(), p.state.found) ?? [];
check(`the map offers the screens come onto: ${places.map((q) => q.id).join(' ')}`, places.length >= 6 && places.some((q) => q.here));
tick(2);
shot('3-pause-map');
tap('KeyE');
check('E: ORIGINAL (the play changes off; the effects still on), and kept', !p.frontEnd.enhanced && !p.options.eightWay && !!p.options.effects && options().enhanced === false);
tap('KeyE');
check('E again: ENHANCED', p.frontEnd.enhanced && !!p.options.eightWay && options().enhanced === true);

// ---- travel back by the map ---------------------------------------------------------------------------
// (taps on the place: the first picks it, the second goes)
const goTo = (id: string) => {
  const q = (dragonskulleMap.places?.(MAP_BOX, ram(), p.state.found) ?? []).find((x) => x.id === id);
  if (!q) return false;
  input.touch = true;
  if (!p.state.paused) tap('KeyP');
  input.point(q.x, q.y); tick(2); input.point(q.x, q.y); tick(3);
  input.touch = false;
  const arrived = until(() => !p.state.paused && cell() === id, 100);
  p.grace.clear(); // (travel gives a moment's grace, test/grace.ts; the fights here are about the hurts themselves)
  return arrived;
};
for (const id of ['1,1', '3,4', '2,1']) {
  const went = goTo(id);
  const want = arrivals.get(id) ?? [], got = LOCATION.map((a) => ram()[a]);
  check(`two taps on ${id} on the map: there, where walking in put him (${got.map((v) => v.toString(16)).join(' ')})`, went && want.length > 0 && want.every((v, i) => v === got[i]));
  tick(60);
}
shot('4-travelled');
// with the keys: the arrows pick a place, Enter goes
tap('KeyP');
const before = cell();
tap('ArrowLeft'); tap('Enter');
until(() => !p.state.paused, 100);
tick(2);
check(`keys: an arrow picks another place, Enter goes (${before} -> ${cell()})`, !p.state.paused && cell() !== before);

// ---- fights: random play with stones, among the creatures (the first screen with some) -------------------
let seed = 7;
const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);
const ARROWS = ['', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
let held: string[] = [];
const combat = () => { const c = p.combat; if (!c) throw new Error('no combat'); return c; };
const fightFrame = () => {
  if (rnd() < 1 / 12) {
    for (const k of held) input.keyUp(k);
    held = [ARROWS[Math.floor(rnd() * 5)], rnd() < 0.5 ? 'KeyX' : ''].filter((k) => k !== '');
    for (const k of held) input.keyDown(k);
  }
  tick(1);
  const r = ram(); r[0x1248] = 0; r[0x123e] = 0x14; // (lives kept: the hurts themselves are what's checked)
};
let sawHurt = false, fightAt = '';
for (let f = 0; f < 12000 && !sawHurt; f++) {
  if (f % 1500 === 0) { fightAt = ['1,1', '1,2', '2,4', '3,4', '4,4', '1,3', '2,1', '5,4'][f / 1500]; goTo(fightAt); }
  const sfx = sidLog.sfx.length;
  fightFrame();
  if (combat().events.some((e) => e.kind === 'hurt')) {
    sawHurt = true;
    const d = renderer.effects.model.drawables(performance.now());
    check('a hurt: the red edges and the faces pulsing', d.some((x) => x.kind === 'edge') && d.some((x) => x.kind === 'frame'));
    check('a hurt: its sound', sidLog.sfx.slice(sfx).includes('hurt'));
    shot('8-hurt');
  }
}
check(`a hurt in the fight (on ${fightAt})`, sawHurt);
const gaps = (frames: number) => {
  const at: number[] = [];
  goTo(fightAt);
  for (let f = 0; f < frames; f++) { fightFrame(); if (combat().events.some((e) => e.kind === 'hurt')) at.push(f); }
  return at.slice(1).map((v, i) => v - at[i]);
};
tap('KeyP'); tap('KeyE'); tap('KeyP');
const off = gaps(4000);
tap('KeyP'); tap('KeyE'); tap('KeyP');
const on = gaps(4000);
check(`ORIGINAL: hurts as the game makes them (${off.length + 1}, the closest ${Math.min(...off)} frames apart)`, !p.frontEnd.enhanced || (off.length > 3 && Math.min(...off) < 75));
check(`ENHANCED: none within 75 frames of the last (${on.length + 1}, the closest ${Math.min(...on)} apart)`, p.frontEnd.enhanced && on.length > 1 && Math.min(...on) >= 75);
for (const k of held) input.keyUp(k);
tick(5);

// ---- the energy on the face of the life under way: real hurts, both modes ------------------------------
// (read off the picture as shown against the picture as drawn: the face's lines emptied to dark grey from the
// top, as many as the energy left says; everything else in the status line as the game drew it)
const W = 320;
/** The face of the life under way as shown: which, how many of its lines emptied (and how many the energy says), all else as drawn. */
function energyShown() {
  const m = machine(), at = energyFace.at(m.ram);
  // (the characters only: sprites reach up over the status line)
  const chars = { ram: m.ram, capture: { ...m.capture, sprites: [] } };
  const ref = renderPixels(chars), shown = renderPixels(chars, dragonskulleLayout);
  let emptied = 0, tidy = true, others = 0;
  if (at) {
    const to = placePoint(dragonskulleLayout, at.x, at.y);
    for (let y = 0; y < at.h; y++) {
      let asDrawn = true, empty = true;
      for (let x = 0; x < at.w; x++) {
        const r = ref[(at.y + y) * W + at.x + x], s = shown[(to.y + y) * W + to.x + x];
        if (s !== r) asDrawn = false;
        if (r !== backgroundAt(m.capture, at.y + y) ? s !== energyFace.empty : s !== r) empty = false;
      }
      if (empty && !asDrawn && emptied === y) emptied++;
      else if (!asDrawn) tidy = false;
    }
  }
  // the rest of the status line: as the game drew it
  for (let y = 0; y < 24; y++) for (let x = 0; x < W; x++) {
    const inFace = at && x >= at.x && x < at.x + at.w && y + 176 >= at.y && y + 176 < at.y + at.h;
    if (!inFace && shown[y * W + x] !== ref[(y + 176) * W + x]) others++;
  }
  return { face: at ? Math.floor(m.ram[0x1248] / 3) : -1, emptied, tidy, others, want: at ? emptiedLines(ENERGY.get(m.ram) / ENERGY.max, at.h) : 0 };
}
/** The characters at face f in the status line (the game's face, or its skull: $72-$7A). */
const faceChars = (f: number) => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => ram()[0x400 + 0x387 + 3 * f + 40 * r + c]));
const isSkull = (f: number) => faceChars(f).join() === [0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a].join();
/** Not losing a life ($1249: the game's sound of a life lost, 256 frames) nor anything else travel waits for. */
const settled = () => until(() => ram()[0x1249] === 0 && ram()[0x3425] === 0 && ram()[0x1fef] === 0 && ram()[0x3428] === 0, 600);
/** Random fights on `fightAt`, then the rest of the life's energy taken as a hurt takes it, to the skull: the face looked at each time the energy or the lives change. */
const energyRun = (frames: number, shots: boolean) => {
  goTo(fightAt);
  if (p.state.paused) tap('KeyP'); // (already there: the map doesn't go)
  tick(2);
  const wrong: string[] = [];
  const r = { levels: new Set<number>(), checked: 0, wrong, hurts: 0, lost: 0, skulls: 0 };
  let lastE = ENERGY.get(ram()), lastLost = ram()[0x1248], half = false, low = false;
  const look = (always: boolean) => {
    const e = ENERGY.get(ram()), lost = ram()[0x1248];
    if (e === lastE && lost === lastLost && !always) return;
    const g = energyShown();
    r.checked++; r.levels.add(e);
    if (g.emptied !== g.want || !g.tidy || g.others) r.wrong.push(`energy ${e}: ${g.emptied} lines emptied (want ${g.want}), tidy ${g.tidy}, ${g.others} other pixels`);
    if (lost !== lastLost) {
      r.lost++;
      // the face just gone is the game's own skull, shown as drawn; the next face full
      if (isSkull(lastLost / 3) && g.face === lost / 3 && g.emptied === 0) r.skulls++;
      if (shots && r.lost === 1) shot('8-energy-skull');
    }
    if (shots && !half && e <= ENERGY.max / 2 && e > ENERGY.max / 2 - 3) { half = true; shot('8-energy-half'); }
    if (shots && !low && e <= 2 && e > 0) { low = true; shot('8-energy-low'); }
    lastE = e; lastLost = lost;
  };
  for (let f = 0; f < frames && ram()[0x1248] < 12; f++) {
    if (rnd() < 1 / 12) {
      for (const k of held) input.keyUp(k);
      held = [ARROWS[Math.floor(rnd() * 5)], rnd() < 0.5 ? 'KeyX' : ''].filter((k) => k !== '');
      for (const k of held) input.keyDown(k);
    }
    tick(1);
    if (combat().events.some((e) => e.kind === 'hurt')) r.hurts++;
    look(f % 25 === 0);
  }
  for (const k of held) input.keyUp(k);
  held = [];
  // the rest of this life's energy as damage still to take ($3432, as a hurt leaves it: a point a frame), down to the skull
  settled();
  ram()[0x3432] = ENERGY.get(ram());
  for (let f = 0; f < 40; f++) { tick(1); look(true); }
  return r;
};
{
  // a full face as the game draws it
  goTo(fightAt);
  if (p.state.paused) tap('KeyP');
  tick(2);
  ram()[0x123e] = ENERGY.max; tick(1);
  const full = energyShown();
  check(`full energy: the face of the life under way (face ${full.face + 1}) as the game draws it`, full.emptied === 0 && full.tidy && full.others === 0);
  shot('8-energy-full');
  const runs = [p.frontEnd.enhanced, !p.frontEnd.enhanced].map((enhanced, i) => {
    if (i) { settled(); tap('KeyP'); tap('KeyE'); tap('KeyP'); }
    return { enhanced, ...energyRun(6000, enhanced) };
  });
  settled();
  tap('KeyP'); tap('KeyE'); tap('KeyP');
  for (const x of runs) {
    const mode = x.enhanced ? 'ENHANCED' : 'ORIGINAL';
    check(`${mode}: the face drained as the energy fell, over ${x.hurts} hurts and a life's end: ${x.checked} frames looked at, ${x.levels.size} levels (${[...x.levels].sort((a, b) => a - b).join(' ')}), ${x.wrong.length} wrong${x.wrong.length ? `: ${x.wrong.slice(0, 3).join('; ')}` : ''}`,
      x.hurts > 2 && x.levels.size === ENERGY.max && x.wrong.length === 0);
    // (ENHANCED's unlimited lives bring a face back at once, so no skull stays: ORIGINAL only)
    if (!x.enhanced) check(`${mode}: a life lost, the game's skull there and the next face full (${x.skulls} of ${x.lost})`, x.lost >= 1 && x.skulls === x.lost);
    else check(`${mode}: no face stays lost (${lives()} lives now)`, lives() === 5);
  }
  // energy carries over onto a new screen, ENHANCED too (only continuing fills it): part of a face stays part of one
  settled();
  ram()[0x123e] = 7;
  const went = goTo(fightAt === '1,1' ? '2,1' : '1,1');
  tick(2);
  const back = energyShown();
  check(`ENHANCED: travelled (to ${cell()}), energy kept (${ENERGY.get(ram())}), the face as low (face ${back.face + 1}: ${back.emptied} lines emptied)`, went && p.frontEnd.enhanced && ENERGY.get(ram()) === 7 && back.emptied > 0);
}

// ---- ENHANCED: unlimited lives and continues: lives lost come back, never CONTINUE? --------------------------------
{
  settled();
  let lost = 0;
  for (let n = 0; n < 3000; n++) { ram()[0x123e] = 1; ram()[0x3432] = 2; tick(); if (ram()[0x1249] !== 0) lost++; }
  check(`ENHANCED: life after life taken for 3000 frames (the life-lost sound ran ${lost} frames): still five lives (${lives()}), never CONTINUE? (${p.state.prompt})`, lost > 0 && lives() === 5 && p.state.prompt !== 'continue' && p.state.playing && p.frontEnd.enhanced);
  tap('KeyP'); tap('KeyE'); tap('KeyP');
  check('ORIGINAL: no unlimited lives', !p.frontEnd.enhanced && p.frontEnd.assist.lives === false);
}

// ---- every life lost: CONTINUE?-----------------------------------------------------------------------
for (let n = 0; n < 3000 && p.state.prompt !== 'continue'; n++) { ram()[0x1248] = 0x0c; ram()[0x123e] = 1; ram()[0x3432] = 2; tick(); }
check('the last life lost: CONTINUE?', p.state.prompt === 'continue');
shot('5-continue');
tap('Enter');
until(() => p.state.playing, 300);
tick(5);
check(`Enter: back on ${cell()} with all five lives (${lives()}, energy ${ram()[0x123e]})`, p.state.playing && lives() === 5 && ram()[0x123e] === 0x14);
shot('6-continued');

// ---- a new game ---------------------------------------------------------------------------------------
tap('KeyR'); // (R restarts: back to the title)
until(() => !p.state.playing, 400);
tick(100);
input.keyDown('Space'); tick(10); input.keyUp('Space');
check('Space: NEW GAME? first (a new game over a save asks)', p.state.prompt === 'newGame' && !p.state.playing);
tick(2); input.keyDown('Space'); tick(10); input.keyUp('Space'); // (again: yes)
check(`Space: a new game, on the beach (${cell()})`, until(() => p.state.playing && cell() === '2,0' && ram()[0x341d] === 0x90, 600));
tick(20);
check('a save on coming onto the beach', store.has('dragonskulle.save.v2'));
shot('7-beach');
tap('KeyP'); tap('KeyE'); tap('KeyP'); tick(2); // (back to ENHANCED, the default)
check('and ENHANCED again', p.frontEnd.enhanced && p.frontEnd.assist.lives === true);
// ---- the bar: the status line at the top, the actions at the bottom, in the keys' order -------------------
// (read off the picture as shown: renderPixels with the front end's layout; `ref`: as the machine drew it)
{
  const m = machine();
  check('in play the picture is laid out', renderer.layout === dragonskulleLayout);
  const ref = renderPixels(m), shown = renderPixels(m, renderer.layout);
  const same = (a: Uint8Array, ax: number, ay: number, b: Uint8Array, bx: number, by: number, w: number, h: number) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(ay + y) * W + ax + x] !== b[(by + y) * W + bx + x]) return false;
    return true;
  };
  check('the status line (score, faces) at the top: rows 0-2 as shown are rows 22-24 as drawn', same(shown, 0, 0, ref, 0, 176, W, 24));
  // (the play area's top four lines, y 24-27, are left out: no character is ever drawn there in play)
  const up = PLAY.from.y - PLAY.y;
  check(`the play area under the status line, sprites and all: shown from y ${PLAY.y} is drawn from y ${PLAY.from.y} (rows 3-20, ${up} lines up)`, up === 4 && same(shown, 0, PLAY.y, ref, 0, PLAY.from.y, W, PLAY.from.h));
  const him = m.capture.sprites.find((q) => q.n === 2);
  check(`Pendragon's sprite drawn with the play area (${him ? `${him.x - 24},${him.y - 50}` : 'none'}, shown ${up} higher)`, !!him && same(shown, him.x - 24, him.y - 50 - up, ref, him.x - 24, him.y - 50, 24, 21));
  // which of the game's icons each slot of the bar shows (the icon's own 3x3 characters)
  const slotX = (k: number) => BAR_AT.icon(k), iconY = BAR_AT.icons;
  const name = (n: number) => Object.keys(ACTION)[n] ?? '?';
  const shownOrder = BAR.map((_, k) => [0, 1, 2, 3, 4].find((n) => same(shown, slotX(k), iconY, ref, ICON_AT(n).x, 0, 24, 24)) ?? -1);
  check(`the bar shows, left to right: ${shownOrder.map(name).join(' ')} (no pause)`, shownOrder.join() === [ACTION.jump, ACTION.stone, ACTION.shovel, ACTION.cloak].join());
  // the labels, read letter by letter in the game's own lettering (what the layout added to the picture)
  const font = labelFont(dragonskulleLayout, m.ram, m.capture);
  // (under the bar the picture is cleared to black: anything lit there is the labels)
  const lit = (x: number, y: number) => shown[y * W + x] !== 0;
  /** The letter in the 8x8 cell at (x, y), ' ' if it's empty, '?' if it's neither. */
  const letterAt = (x: number, y: number) => {
    if ([0, 1, 2, 3, 4, 5, 6, 7].every((dy) => [0, 1, 2, 3, 4, 5, 6, 7].every((dx) => !lit(x + dx, y + dy)))) return ' ';
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const g = font?.glyph(ch);
      if (g && [0, 1, 2, 3, 4, 5, 6, 7].every((dy) => [0, 1, 2, 3, 4, 5, 6, 7].every((dx) => !!(g[dy] & (0x80 >> dx)) === lit(x + dx, y + dy)))) return ch;
    }
    return '?';
  };
  /** Slot k's label: read in the 76 pixels round its icon's middle, on whichever 8-pixel grid reads as letters; where its cells start. */
  const labelAt = (k: number) => {
    const mid = slotX(k) + 12;
    for (let d = 0; d < 8; d++) {
      const x0 = mid - 40 + d, cells = Array.from({ length: 10 }, (_, i) => letterAt(x0 + i * 8, BAR_AT.labels));
      if (cells.includes('?')) continue;
      const text = cells.join(''), first = text.length - text.trimStart().length;
      return { text: text.trim(), x: x0 + first * 8, mid };
    }
    return { text: '?', x: 0, mid };
  };
  const read = BAR.map((_, k) => labelAt(k)), labels = read.map((l) => l.text);
  check(`each slot labelled with its key, below its icon: ${labels.map((l) => `"${l}"`).join(' ')}`, labels.join() === 'Z JUMP,X STONE,C DIG,V CLOAK');
  check(`each label centred under its icon (its cells' middle against the icon's: ${read.map((l) => l.x + l.text.length * 4 - l.mid).join(' ')})`, read.every((l) => l.x + l.text.length * 4 === l.mid));
  const colourOf = (x: number) => { for (let dy = 0; dy < 8; dy++) for (let dx = 0; dx < 8; dx++) if (lit(x + dx, BAR_AT.labels + dy)) return shown[(BAR_AT.labels + dy) * W + x + dx]; return -1; };
  check('the key white, the action light grey', read.every((l) => colourOf(l.x) === 1 && colourOf(l.x + 16) === 15));
  // a gap between each icon (with its hand) and its label: the icon's last line drawn, the label's first
  const lastLine = (x: number, w: number, from: number, to: number) => { let at = -1; for (let y = from; y < to; y++) for (let dx = 0; dx < w; dx++) if (lit(x + dx, y)) at = y; return at; };
  const firstLine = (x: number, w: number, from: number, to: number) => { for (let y = from; y < to; y++) for (let dx = 0; dx < w; dx++) if (lit(x + dx, y)) return y; return -1; };
  const gaps = read.map((l, k) => { const end = lastLine(slotX(k), 48, iconY, iconY + 24); return firstLine(l.x, l.text.length * 8, end + 1, 200) - end - 1; });
  check(`each label below its icon, ${gaps.join(' ')} lines between them (at least 2)`, gaps.every((g) => g >= 2 && g < 8));
  const playEnd = PLAY.y + PLAY.from.h, iconTop = Math.min(...BAR.map((_, k) => firstLine(slotX(k), 48, playEnd, 200)));
  check(`the icons below the play area (it ends at y ${playEnd - 1}, the icons start at ${iconTop})`, iconTop > playEnd);
  shot('9-bar');

  // each key, as its label reads: the hand (the game's own, light red) in that slot and no other, and that action under way
  found();
  const handIn = (k: number) => {
    const px = renderPixels(machine(), renderer.layout);
    for (let y = 0; y < 24; y++) for (let x = 24; x < 48; x++) if (px[(iconY + y) * W + slotX(k) + x] === 10) return true;
    return false;
  };
  for (let k = 0; k < BAR.length; k++) {
    const key = `Key${labels[k][0] ?? '?'}`;
    idle(); found();
    input.keyDown(key); tick(1);
    const hands = BAR.map((_, j) => handIn(j)), under = STARTED[shownOrder[k]]?.() ?? false;
    shot(`9-hand-${k + 1}`);
    input.keyUp(key);
    check(`${key}: the hand in slot ${k + 1} ("${labels[k]}") only, and ${name(shownOrder[k])} under way`, hands.every((h, j) => h === (j === k)) && under);
  }

  // how soon each key starts its action, against Space with the hand already there (standing, and walking)
  for (const walk of ['', 'ArrowRight']) {
    for (const b of BAR) {
      const frames = (press: string) => {
        idle(); found(); // (the cloak is used up when it wears off)
        if (walk) { input.keyDown(walk); tick(10); } // (walking already: a press with a new direction turns him first)
        input.keyDown(press);
        let n = 0;
        while (!(STARTED[b.action]?.() ?? false) && n < 50) { tick(); n++; }
        input.keyUp(press); if (walk) input.keyUp(walk);
        return n;
      };
      const direct = frames(`Key${b.key}`);
      const space = frames('Space'); // (the hand is on it now)
      check(`${b.key} ${b.name}${walk ? ' walking' : ''}: under way ${direct} frame(s) after the key, as after Space with the hand there (${space})`, direct === space && direct <= 2 && ram()[0x12eb] === b.action);
    }
  }

  // Enter (or any other key): the hand to the next action along the bar, one a press (never onto PAUSE)
  idle();
  tap('KeyZ'); idle();
  const along: number[] = [];
  for (const key of ['Enter', 'Enter', 'KeyQ', 'Enter']) { input.keyDown(key); tick(1); input.keyUp(key); tick(1); along.push(ram()[0x12eb]); }
  check(`Enter (or another key, Q): one along the bar a press: ${along.map(name).join(' ')}`, along.join() === [ACTION.stone, ACTION.shovel, ACTION.cloak, ACTION.jump].join());
  // a key pressed while the game waits (hit-stop after a kill) still picks its action: Z jumps, rather than throwing
  idle(); tap('KeyX'); idle();
  const c = p.combat;
  if (c) c.hitStop = 4;
  input.keyDown('KeyZ');
  let jumped = false, threw = false;
  for (let i = 0; i < 12; i++) { tick(); jumped ||= STARTED[ACTION.jump]?.() ?? false; threw ||= ram()[0x1fef] !== 0; }
  input.keyUp('KeyZ');
  check(`Z during a hit-stop: the hand onto the jump and a jump (${jumped}), no stone (${threw})`, !!c && jumped && !threw && ram()[0x12eb] === ACTION.jump);

  // what's drawn over the picture goes with it: the faces' pulse to the top, the play area's where it was
  const box = dragonskulleCombat.healthBox ?? { x: 0, y: 0, w: 0, h: 0 };
  const pulse = placeDrawable(dragonskulleLayout, { kind: 'frame', ...box, grow: 0, color: 0, alpha: 1 });
  check(`the faces' pulse drawn round them at the top (y ${pulse.kind === 'frame' ? pulse.y : '?'})`, pulse.kind === 'frame' && pulse.y === 0 && pulse.x === box.x);
  const spot = placePoint(dragonskulleLayout, 150, 120);
  check(`a sparkle in the play area goes up with it (${spot.x},${spot.y})`, spot.x === 150 && spot.y === 116);
  // a sprite at the top of the play area, its middle in the lines left out or up over the game's own panel, goes with the play area too
  const top = [26, 20, 2].map((y) => placeBox(dragonskulleLayout, { x: ICON_AT(ACTION.jump).x, y: y - 10, w: 24, h: 21 }).y - (y - 10));
  check(`a sprite at the top of the play area (its middle at y 26, 20, 2) goes up with it: moved ${top.join(' ')}`, top.every((d) => d === -4));
  idle();
  tap('KeyP'); tap('KeyE'); tap('KeyP'); tick(2);
  check('ORIGINAL: the same bar (it is presentation: both modes)', !p.frontEnd.enhanced && renderer.layout === dragonskulleLayout);
  tap('KeyP'); tap('KeyE'); tap('KeyP');
}

finish();
