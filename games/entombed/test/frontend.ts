/**
 * Entombed's front end with the combat effects and assists, headless (games/shared/native/play.ts
 * as the browser runs it, c64kit stood in by games/shared/test/kit.ts): from a save in the
 * corridors, the ORIGINAL/ENHANCED switch on the pause screen (key and tap), then fights:
 *
 * - effects (on by default): a destroyed monster bursts (the effects' model has its particles)
 *   and its sound plays; a hurt flashes and sounds (in both modes: presentation);
 * - hit-stop: the game waits 4 frames on a kill (its memory doesn't change), then goes on;
 * - invulnerability: no hurt starts within 75 frames of the last (off: they come 17 apart);
 * - knockback: after a hurt he's pushed away from what hit him, by his own walk;
 * - R restarts: the game so far becomes the previous save (shared/saves.ts), even with a new game
 *   started the moment the title is back.
 *
 *   nice -n 15 node tools/test.mjs games/entombed/test/frontend.ts [out-dir]
 */
import fs from 'node:fs';
import { Input, PixelRenderer, packState, unpackState } from 'c64kit';
import { sidLog } from '../../shared/test/kit';
import { cpu } from '../../shared/native/cpu';
import { NativeHost } from '../../shared/native/host';
import { port } from '../src/native';
import { entombedMap } from '../src/map';
import { run } from '../src/main';
import { rgbPng } from '../../../tools/probe/render';
import { C64_PALETTE } from '../../../packages/c64kit/src/palette';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';
import { readSaves } from '../../shared/saves';
import { parseOptions } from '../../shared/test/data';
import { check, finish } from '../../shared/test/check';

const store = useMemoryStorage();
const titleBytes = fs.readFileSync('games/entombed/assets/entombed-title.state');
stubFetch(titleBytes);


// a save in the corridors of floor 1 (the whip in hand), as the autosave keeps one
{
  const g = new NativeHost(port, unpackState(new Uint8Array(titleBytes)));
  for (let f = 0; f < 200; f++) { g.m.joy1 = g.m.joy2 = f > 50 && f < 60 ? 0x0f : 0x1f; g.tick(); }
  let done = false;
  g.onWait = (site) => {
    if (done || site !== port.mainLoopWait) return;
    done = true; const r = { ...cpu };
    const all = [...Array(256).keys()].map((k) => `${k & 15},${k >> 4}`);
    entombedMap.go(entombedMap.places({ x: 0, y: 0, w: 196, h: 150 }, g.m.ram, entombedMap.found.parse({ cells: { 1: all } }))[0].id, g.m.ram, entombedMap.found.empty());
    g.m.ram[0x322e] = 1; g.m.ram[0x3215] = 2; // (the whip, chosen)
    Object.assign(cpu, r);
  };
  for (let f = 0; f < 5; f++) g.tick();
  store.set('entombed.save.v1', Buffer.from(packState(must(g.save(), 'a save'))).toString('base64'));
}

const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const press = (code: string) => { input.keyDown(code); tick(1); input.keyUp(code); tick(1); };
const tapAt = (x: number, y: number) => { input.point(x, y); tick(1); };
const outDir = process.argv[2];
const shot = (name: string) => {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  const rgb = new Float32Array(320 * 200 * 3);
  renderer.screen.pixels.forEach((v, i) => { const c = C64_PALETTE[(v === 0xff ? renderer.background : v) & 15]; rgb[i * 3] = (c >> 16) / 255; rgb[i * 3 + 1] = ((c >> 8) & 255) / 255; rgb[i * 3 + 2] = (c & 255) / 255; });
  rgbPng(`${outDir}/${name}.png`, rgb, 320, 200, 2);
};

// ---- launched with a save: straight back into play, in the corridors ----
await new Promise((r) => setTimeout(r, 0));
tick(132);
const m = () => must(p.machine, 'the machine');
check('continued into the corridors', p.state.playing && (m().ram[0x6001] | (m().ram[0x6002] << 8)) === 0x60f8);
const combatOn = () => !!p.options.invulnerable && !!p.options.knockback && !!p.options.hitStop && !!p.options.eightWay && !!p.options.health && !!p.options.hints;
const combatOff = () => !p.options.invulnerable && !p.options.knockback && !p.options.hitStop && !p.options.eightWay && !p.options.health && !p.options.hints;
check('ENHANCED by default: its play changes on, effects on, no glow, no infinite lives', p.frontEnd.enhanced && combatOn() && !!p.options.effects && !p.options.glow && !p.options.lives);

// ---- the switch ----
press('KeyP');
check('P: the pause screen', p.frontEnd.paused);
shot('pause');
press('KeyE');
check('E: ORIGINAL (the play changes off, effects still on)', !p.frontEnd.enhanced && combatOff() && !!p.options.effects);
tapAt(260, 133); // (the switch's line on the right: the first of four, bottom up from y=166)
check('a tap on its line: ENHANCED again, and kept', p.frontEnd.enhanced && combatOn() && parseOptions(store.get('entombed.assist')).enhanced === true);
press('KeyE');
check('E: ORIGINAL, kept', !p.frontEnd.enhanced && parseOptions(store.get('entombed.assist')).enhanced === false);
press('KeyP');
check('P: back to the game', !p.frontEnd.paused);

// ---- fights: random play with the whip ----
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const ARROWS = ['', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
let held: string[] = [];
const fightFrame = () => {
  if (rnd() < 1 / 12) {
    for (const k of held) input.keyUp(k);
    held = [ARROWS[Math.floor(rnd() * 5)], rnd() < 0.5 ? 'KeyX' : ''].filter(Boolean);
    for (const k of held) input.keyDown(k);
  }
  tick(1);
  const r = m().ram; r[0x37f6] = 0; r[0x323d] = 0; // (air and ankhs kept up)
};

// hit-stop and the effects of a kill (ENHANCED)
press('KeyP'); press('KeyE'); press('KeyP');
let stopped = -1, sawKill = false, sawHurt = false, sfxKill = false;
for (let f = 0; f < 6000 && !(sawKill && sawHurt); f++) {
  const sfxBefore = sidLog.sfx.length;
  fightFrame();
  const ev = must(p.combat, 'the combat runtime').events;
  if (!sawKill && ev.some((e) => e.kind === 'kill')) {
    sawKill = true;
    sfxKill = sidLog.sfx.slice(sfxBefore).includes('kill');
    check('a kill: its particles fly', renderer.effects.model.particlesAt(performance.now()).length > 20);
    shot('kill');
    // the game waits 4 frames, then goes on
    const snap = m().ram.slice();
    let same = 0;
    for (let k = 0; k < 6; k++) { tick(1); if (m().ram.every((v, i) => v === snap[i])) same++; }
    stopped = same;
  }
  if (!sawHurt && ev.some((e) => e.kind === 'hurt')) {
    sawHurt = true;
    check('a hurt: the red flash and the health pulse', renderer.effects.model.drawables(performance.now()).some((d) => d.kind === 'edge') && renderer.effects.model.drawables(performance.now()).some((d) => d.kind === 'frame'));
    check('a hurt: its sound', sidLog.sfx.slice(sfxBefore).includes('hurt'));
  }
}
check('a monster destroyed in the fight, with its sound', sawKill && sfxKill);
check(`hit-stop: the game waited ${stopped} frames on the kill (4)`, stopped === 4);

// invulnerability: hurt gaps, ORIGINAL then ENHANCED
const gaps = (frames: number) => {
  const at: number[] = [];
  for (let f = 0; f < frames; f++) { fightFrame(); if (must(p.combat, 'the combat runtime').events.some((e) => e.kind === 'hurt')) at.push(f); }
  return at.slice(1).map((v, i) => v - at[i]);
};
press('KeyP'); press('KeyE'); press('KeyP');
check('ORIGINAL: no invulnerability', !p.options.invulnerable);
const off = gaps(4000);
press('KeyP'); press('KeyE'); press('KeyP');
check('ENHANCED: invulnerability on', !!p.options.invulnerable);
const on = gaps(4000);
check(`off: hurts as the game makes them (${off.length + 1}, the closest ${Math.min(...off)} frames apart)`, off.length > 3 && Math.min(...off) < 40);
check(`on: none within 75 frames of the last (${on.length + 1}, the closest ${Math.min(...on)} apart)`, on.length > 1 && Math.min(...on) >= 75);

// knockback (ENHANCED, with invulnerability): after a hurt, pushed away from what hit him
let pushes = 0, away = 0, toward = 0, whipping = false;
for (let f = 0; f < 6000 && pushes < 6; f++) {
  fightFrame();
  const hurt = must(p.combat, 'the combat runtime').events.find((e) => e.kind === 'hurt');
  if (!hurt?.image) continue;
  const x0 = m().ram[0x3212] | (m().ram[0x3213] << 8);
  for (const k of held) input.keyUp(k);
  held = [];
  tick(1);
  if (must(p.combat, 'the combat runtime').knock.frames === 0) continue; // (none: at the screen's edge)
  const dir = must(p.combat, 'the combat runtime').knock.dir;
  whipping = m().ram[0x20cf] === 1;
  tick(7);
  const x1 = m().ram[0x3212] | (m().ram[0x3213] << 8);
  pushes++;
  if ((dir === 4 && x1 < x0) || (dir === 8 && x1 > x0)) away++;
  if ((dir === 4 && x1 > x0) || (dir === 8 && x1 < x0)) toward++;
  console.log(`  pushed ${dir === 4 ? 'left' : 'right'}: ${x0} -> ${x1}${x1 === x0 ? ` (his walk didn't move him: ${whipping ? 'the whip was out' : 'blocked'})` : ''}`);
}
check(`knockback: ${away} of ${pushes} pushes moved him away from what hit him, none towards it (the rest: his own walk couldn't move him then)`, pushes >= 3 && away >= pushes / 2 && toward === 0);

// ORIGINAL: effects still on (presentation), the play as the original's
press('KeyP'); press('KeyE'); press('KeyP');
renderer.effects.model.clear();
const before = sidLog.sfx.length;
let sawEffects = false;
for (let f = 0; f < 3000 && !sawEffects; f++) { fightFrame(); if (renderer.effects.model.busy(performance.now()) || sidLog.sfx.length > before) sawEffects = true; }
check('ORIGINAL: the effects and sounds still play (presentation, both modes)', sawEffects && !p.options.knockback);

// ---- R restarts: the game so far is kept as the previous save, as a new game from the title keeps it ----
// (once after the title has been up a while, once with a new game started straight away)
for (const k of held) input.keyUp(k);
held = [];
for (const wait of [120, 3]) {
  const was = must(readSaves('entombed').current, 'the save before the restart');
  press('KeyR');
  check(`R: the title (${p.state.lastWait === 0x98bf})`, p.state.lastWait === 0x98bf);
  tick(wait);
  if (wait > 25) check('  the save kept for ENTER CONTINUE, no CONTINUE? (a restart on purpose)', p.state.prompt === 'title' && readSaves('entombed').current?.data === was.data);
  input.keyDown('Space'); tick(10); input.keyUp('Space');
  check('  Space: NEW GAME? first (a new game over a save asks), the title held', p.state.prompt === 'newGame' && p.state.lastWait === 0x98bf && readSaves('entombed').current?.data === was.data);
  tick(2); input.keyDown('Space'); tick(10); input.keyUp('Space'); // (again: yes)
  for (let f = 0; f < 600 && !(p.state.playing && readSaves('entombed').current?.data !== was.data); f++) tick(1);
  const now = readSaves('entombed');
  check(`  Space ${wait > 25 ? 'on the title' : 'straight away'}: a new game saving as the current save, the game before it the previous (${was.rooms} rooms)`, now.previous?.data === was.data && now.current !== null && now.current.data !== was.data);
  check('  the new save is in the envelope: this game, format 1, and which game image it was made on (a hash of the title snapshot)', now.current?.game === 'entombed' && now.current.format === 1 && /^[0-9a-f]{8}$/.test(now.current.image ?? ''));
  // (on to another screen: a new game worth keeping over the one before)
  for (let f = 0; f < 600 && must(readSaves('entombed').current, 'the save').rooms < 2; f++) { input.keyDown('ArrowRight'); tick(1); }
  input.keyUp('ArrowRight'); tick(2);
}

finish();
