/**
 * Headless checks for the touch layer (no browser): the geometry on common phones,
 * synthetic touches turned into Input state (upright, landscape, and the stage drawn
 * turned inside a portrait page), the mode decisions, and that a desktop gets nothing.
 *
 *   npm run test:touch
 */
import fs from 'node:fs';
import { Input } from '../../../../packages/c64kit/src/input';
import { TouchController } from '../controller';
import { clientToStage, decideMode, touchLayout, EDGE_GUARD, edgeGuard, layoutStage, PICTURE_ASPECT, stageTransform, wantsTouch, type Geometry, type Rect, type SystemSpec, type TouchLayout, type Turn } from '../layout';
import { drawNudgePixels, NUDGE_W, nudgeChoice, nudgeLayout } from '../nudge';
import { nowhere } from '../../test/browser';
import { KeyPacer, NamePicker } from '../../letters';
import { must } from '../../test/must';
import { decideBack, PLAY_ENTRY } from '../back-guard';
import { TOUCH as STARQUAKE } from '../../../starquake/src/controls';
import { TOUCH as LOADER } from '../../../loader-touch';
import { TOUCH as ANTIRIAD } from '../../../antiriad/src/touch';
import { TOUCH as AWM } from '../../../awm/src/touch';
import { TOUCH as BLACKWYCHE } from '../../../blackwyche/src/touch';
import { TOUCH as DRAGONSKULLE } from '../../../dragonskulle/src/touch';
import { TOUCH as ENTOMBED } from '../../../entombed/src/touch';
import { TOUCH as JSW2 } from '../../../jsw2/src/touch';
import { TOUCH as KARNATH } from '../../../karnath/src/touch';
import { TOUCH as MOLEY } from '../../../moley/src/touch';
import { TOUCH as MONTYOTR } from '../../../montyotr/src/touch';
import { TOUCH as THINGONASPRING } from '../../../thingonaspring/src/touch';
import { check, finish } from '../../test/check';

/** One check, printed only when it fails (the geometry loops run thousands). */
const ok = (cond: unknown, what: string) => check(what, !!cond, true);

// ---- every game's layout, as the game declares it (the front end adds RUN for games that can run: both are checked) ----
const LAYOUTS: Record<string, TouchLayout | undefined> = {
  loader: LOADER, antiriad: ANTIRIAD, awm: AWM, blackwyche: BLACKWYCHE, dragonskulle: DRAGONSKULLE, entombed: ENTOMBED,
  jsw2: JSW2, karnath: KARNATH, moley: MOLEY, montyotr: MONTYOTR, starquake: STARQUAKE, thingonaspring: THINGONASPRING,
};
const folders = fs.readdirSync('games').filter((name) => fs.existsSync(`games/${name}/src/main.ts`)).sort();
ok(JSON.stringify(Object.keys(LAYOUTS).filter((n) => n !== 'loader').sort()) === JSON.stringify(folders), `every game folder has a layout here (${folders.join(', ')})`);
const FALLBACK = touchLayout(undefined, false);
ok(FALLBACK.stick === '8' && FALLBACK.buttons.map((b) => b.label).join() === 'FIRE', 'a game with no layout gets the 8-way stick and FIRE');
const GAMES: Record<string, TouchLayout> = {};
for (const [name, layout] of Object.entries(LAYOUTS)) {
  if (!layout) continue;
  GAMES[name] = layout;
  if (name !== 'loader') GAMES[`${name}+RUN`] = touchLayout(layout, true);
}
const SYSTEM: SystemSpec[] = [{ id: 'home', label: 'HOME' }, { id: 'layout', label: 'TURN' }, { id: 'pause', label: 'PAUSE' }, { id: 'enter', label: 'RETURN', key: 'Enter' }];
const PHONES = [[360, 780], [412, 915], [390, 844]] as const;

const inside = (r: Rect, o: Rect, slack = 0.5) => r.x >= o.x - slack && r.y >= o.y - slack && r.x + r.w <= o.x + o.w + slack && r.y + r.h <= o.y + o.h + slack;
const circleRect = (c: { x: number; y: number; r: number }): Rect => ({ x: c.x - c.r, y: c.y - c.r, w: 2 * c.r, h: 2 * c.r });
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

function checkGeometry(name: string, g: Geometry, w: number, h: number, game: TouchLayout, inset = { top: 0, bottom: 0 }, minShare = game.buttons.length ? 0.8 : 0.99) {
  const stage = { x: 0, y: 0, w, h };
  const tag = `${name} ${g.mode} ${w}x${h}`;
  ok(inside(g.picture, stage), `${tag}: picture inside the stage`);
  ok(Math.abs(g.picture.w / g.picture.h - PICTURE_ASPECT) < 0.01, `${tag}: picture keeps the C64 shape`);
  // the picture is as big as it can be: in landscape at least 75% of the height, in portrait the full width
  const avail = h - inset.top - inset.bottom;
  if (g.mode === 'landscape') ok(g.picture.h >= avail * minShare, `${tag}: picture tall enough (${g.picture.h.toFixed(0)} of ${avail})`);
  else ok(Math.abs(g.picture.w - w) < 1, `${tag}: picture full width`);
  const controls = [...g.buttons.map(circleRect), ...g.system.map(circleRect)];
  if (g.stickZone) controls.push({ x: g.stickHome.x - g.stickRadius, y: g.stickHome.y - g.stickRadius, w: 2 * g.stickRadius, h: 2 * g.stickRadius });
  for (const c of controls) {
    ok(inside(c, stage), `${tag}: control inside the stage`);
    ok(!overlaps(c, g.picture), `${tag}: control off the picture`);
  }
  for (let i = 0; i < g.buttons.length; i++) for (let j = i + 1; j < g.buttons.length; j++) {
    const a = g.buttons[i], b = g.buttons[j];
    ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r - 0.5, `${tag}: buttons ${a.spec.label}/${b.spec.label} apart`);
  }
  for (const b of g.buttons) ok(b.r * 2 >= 32, `${tag}: ${b.spec.label} at least 32px across (${(b.r * 2).toFixed(0)})`);
  if (g.buttons.length) ok(g.buttons[0].r * 2 >= 56, `${tag}: main button big (${(g.buttons[0].r * 2).toFixed(0)})`);
  if (game.stick !== 'none') ok(g.stickRadius >= 30 && !!g.stickZone, `${tag}: a stick with reach`);
  else ok(!g.stickZone, `${tag}: no stick`);
  if (g.stickZone) ok(!overlaps(g.stickZone, g.picture), `${tag}: stick zone off the picture`);
  if (g.buttonZone) ok(!overlaps(g.buttonZone, g.picture), `${tag}: button zone off the picture`);
  for (const s of g.system) for (const b of g.buttons) ok(Math.hypot(s.x - b.x, s.y - b.y) >= s.r + b.r - 0.5, `${tag}: ${s.spec.id} clear of ${b.spec.label}`);
  for (const s of g.system) for (const t of g.system) if (s !== t) ok(Math.hypot(s.x - t.x, s.y - t.y) >= s.r + t.r - 0.5, `${tag}: ${s.spec.id} clear of ${t.spec.id}`);
  if (g.stickZone) for (const s of g.system) ok(Math.hypot(s.x - g.stickHome.x, s.y - g.stickHome.y) >= s.r + g.stickRadius - 0.5, `${tag}: ${s.spec.id} clear of the stick`);
  // in landscape: stick on the left of the picture, buttons on the right
  if (g.mode === 'landscape' && g.stickZone) ok(g.stickZone.x + g.stickZone.w <= g.picture.x + 0.5, `${tag}: stick left of the picture`);
  if (g.mode === 'landscape') for (const b of g.buttons) ok(b.x > g.picture.x + g.picture.w, `${tag}: ${b.spec.label} right of the picture`);
  if (g.mode === 'portrait') for (const b of g.buttons) ok(b.y > g.picture.y + g.picture.h, `${tag}: ${b.spec.label} under the picture`);
}

for (const [pw, ph] of PHONES) {
  for (const [name, game] of Object.entries(GAMES)) {
    const sys = name === 'loader' ? SYSTEM.filter((s) => s.id === 'layout') : SYSTEM;
    checkGeometry(name, layoutStage(ph, pw, 'landscape', game, sys), ph, pw, game);
    checkGeometry(name, layoutStage(pw, ph, 'portrait', game, sys), pw, ph, game);
    // with an iPhone's notch (left in landscape) and home bar
    const notch = layoutStage(ph, pw, 'landscape', game, sys, { top: 0, right: 0, bottom: 21, left: 47 });
    checkGeometry(`${name} notch`, notch, ph, pw, game, { top: 0, bottom: 21 });
    for (const c of [...notch.buttons, ...notch.system].map(circleRect)) ok(c.x >= 47 - 0.5, `${name} notch ${ph}x${pw}: a control is clear of the notch`);
    const narrower = layoutStage(ph - 47, pw - 21, 'landscape', game, sys);
    ok(Math.abs(notch.picture.x - (narrower.picture.x + 47)) < 1e-6 && Math.abs(notch.picture.w - narrower.picture.w) < 1e-6, `${name} notch ${ph}x${pw}: laid out as the space beside the notch and above the home bar`);
  }
}

// small and short phones (an iPhone SE held sideways: the gutters take their share, the picture at least 60% of the height), and an upright phone with the notch and home bar
for (const [w, h] of [[568, 320], [667, 375]] as const) {
  for (const [name, game] of Object.entries(GAMES)) {
    const sys = name === 'loader' ? SYSTEM.filter((s) => s.id === 'layout') : SYSTEM;
    checkGeometry(`${name} small`, layoutStage(w, h, 'landscape', game, sys), w, h, game, undefined, 0.6);
  }
}
{
  const inset = { top: 47, right: 0, bottom: 34, left: 0 };
  for (const [pw, ph] of PHONES) for (const [name, game] of Object.entries(GAMES)) {
    const sys = name === 'loader' ? SYSTEM.filter((s) => s.id === 'layout') : SYSTEM;
    const g = layoutStage(pw, ph, 'portrait', game, sys, inset);
    const stage = { x: 0, y: inset.top, w: pw, h: ph - inset.top - inset.bottom };
    const tag = `${name} portrait ${pw}x${ph} with insets`;
    ok(g.picture.y >= inset.top - 0.5, `${tag}: the picture starts below the notch`);
    for (const c of [...g.buttons, ...g.system].map(circleRect)) { ok(inside(c, stage), `${tag}: a control is between the notch and the home bar`); ok(!overlaps(c, g.picture), `${tag}: a control is off the picture`); }
    if (g.stickZone) ok(inside(g.stickZone, stage), `${tag}: the stick zone is above the home bar`);
    if (g.buttonZone) ok(inside(g.buttonZone, stage), `${tag}: the buttons' zone is above the home bar`);
  }
}
{
  // more small buttons than a gutter has room for in one row: a second row, and the stick and buttons start below it
  const extra: SystemSpec[] = [...SYSTEM, { id: 'enter', label: 'A', key: 'KeyA' }, { id: 'enter', label: 'B', key: 'KeyB' }];
  const game = GAMES.entombed;
  const g = layoutStage(568, 320, 'landscape', game, extra);
  const rows = new Set(g.system.map((s) => Math.round(s.y)));
  ok(rows.size > 1, `small buttons: ${g.system.length} of them need more than one row (${rows.size})`);
  for (let i = 0; i < g.system.length; i++) for (let j = i + 1; j < g.system.length; j++) {
    const a = g.system[i], b = g.system[j];
    ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r - 0.5, `small buttons: ${a.spec.label} and ${b.spec.label} apart`);
  }
  const leftRows = new Set(g.system.filter((s) => s.x < g.picture.x).map((s) => Math.round(s.y)));
  ok(leftRows.size === 1, 'small buttons: the two on the left stay in one row');
  const rightBottom = Math.max(...g.system.filter((s) => s.x > g.picture.x + g.picture.w).map((s) => s.y + s.r));
  const first = must(g.buttons[0], 'the first button');
  ok(g.buttons.every((b) => b.y - b.r >= rightBottom - 0.5), 'small buttons: the buttons start below the right gutter\'s rows');
  ok(first.y + first.r <= 320 + 0.5, 'small buttons: and still fit the stage');
  for (const s of g.system) ok(inside(circleRect(s), { x: 0, y: 0, w: 568, h: 320 }), `small buttons: ${s.spec.label} inside the stage`);
}

// ---- touches → Input --------------------------------------------------------------------

function rig(game: TouchLayout, w: number, h: number, mode: 'landscape' | 'portrait' = 'landscape') {
  const input = new Input(nowhere);
  const taps: { x: number; y: number }[] = [];
  const geo = layoutStage(w, h, mode, game, SYSTEM);
  const sysCalls: string[] = [];
  const ctl = new TouchController({ keyDown: (c) => input.keyDown(c), keyUp: (c) => input.keyUp(c), tap: (x, y) => taps.push({ x, y }) }, geo, game.stick);
  ctl.onSystem = (id) => sysCalls.push(id);
  return { input, ctl, geo, taps, sysCalls };
}
const heldDirs = (i: Input) => (['up', 'down', 'left', 'right'] as const).filter((d) => i.held[d]).join('+') || 'none';

{
  // 8-way: right, down-right, deadzone, release
  const { input, ctl, geo } = rig(GAMES.entombed, 915, 412);
  const { x, y } = geo.stickHome, R = geo.stickRadius;
  ctl.down(1, x, y); input.poll();
  ok(heldDirs(input) === 'none', '8-way: thumb down = centre, nothing held');
  ctl.move(1, x + R * 0.15, y); input.poll();
  ok(heldDirs(input) === 'none', '8-way: inside the dead zone, nothing held');
  ctl.move(1, x + R * 0.8, y); input.poll();
  ok(heldDirs(input) === 'right' && input.pressed.right, '8-way: right');
  ctl.move(1, x + R * 0.6, y + R * 0.6); input.poll();
  ok(heldDirs(input) === 'down+right', `8-way: down-right (${heldDirs(input)})`);
  ctl.move(1, x - R * 0.7, y - R * 0.7); input.poll();
  ok(heldDirs(input) === 'up+left', `8-way: up-left (${heldDirs(input)})`);
  // far past the reach: the stick follows the thumb, and a small move back still steers
  ctl.move(1, x + R * 3, y); input.poll();
  ok(heldDirs(input) === 'right', '8-way: far right');
  ctl.move(1, x + R * 3 - R * 1.6, y); input.poll();
  ok(heldDirs(input) === 'left', `8-way: the stick followed the thumb, moving back goes left (${heldDirs(input)})`);
  ctl.up(1); input.poll();
  ok(heldDirs(input) === 'none', '8-way: lifted, nothing held');
  ok(ctl.stick.cx === geo.stickHome.x && !ctl.stick.active, '8-way: the stick goes back home');
}
{
  // 4-way: diagonals resolve to one direction, with a little stickiness
  const { input, ctl, geo } = rig(GAMES.montyotr, 780, 360);
  const { x, y } = geo.stickHome, R = geo.stickRadius;
  ctl.down(1, x, y);
  ctl.move(1, x + R * 0.8, y + R * 0.3); input.poll();
  ok(heldDirs(input) === 'right', `4-way: mostly right = right (${heldDirs(input)})`);
  ctl.move(1, x + R * 0.6, y + R * 0.65); input.poll();
  ok(heldDirs(input) === 'right', `4-way: just past the diagonal, still right (sticky) (${heldDirs(input)})`);
  ctl.move(1, x + R * 0.2, y + R * 0.8); input.poll();
  ok(heldDirs(input) === 'down', `4-way: then down (${heldDirs(input)})`);
  ctl.up(1);
}
{
  // left/right only
  const { input, ctl, geo } = rig(GAMES.jsw2, 844, 390);
  const { x, y } = geo.stickHome, R = geo.stickRadius;
  ctl.down(1, x, y);
  ctl.move(1, x, y - R); input.poll();
  ok(heldDirs(input) === 'none', 'lr: up does nothing');
  ctl.move(1, x - R * 0.5, y - R); input.poll();
  ok(heldDirs(input) === 'left', `lr: up-left = left (${heldDirs(input)})`);
  ctl.up(1);
}
{
  // a quick tap on fire between two polls still counts once; multi-touch stick + fire
  const { input, ctl, geo } = rig(GAMES.thingonaspring, 915, 412);
  const fire = geo.buttons[0];
  ctl.down(2, fire.x, fire.y); ctl.up(2); input.poll();
  ok(input.pressed.fire && input.held.fire, 'quick tap: fire seen for one poll');
  input.poll();
  ok(!input.held.fire, 'quick tap: then released');
  const { x, y } = geo.stickHome, R = geo.stickRadius;
  ctl.down(1, x, y); ctl.move(1, x - R * 0.8, y);
  ctl.down(2, fire.x + 5, fire.y - 5); input.poll();
  ok(input.held.left && input.held.fire, 'multi-touch: left and fire together');
  ctl.up(1); input.poll();
  ok(!input.held.left && input.held.fire, 'multi-touch: stick lifted, fire still held');
  ctl.up(2); input.poll();
  ok(!input.held.fire, 'multi-touch: all lifted');
  // a touch near (not on) the button, anywhere in the right gutter, still presses the nearest one
  const zone = must(geo.buttonZone, 'the button zone');
  ctl.down(3, zone.x + 4, zone.y + zone.h - 4); input.poll();
  ok(input.held.fire, 'gutter: a touch in the corner presses the nearest button');
  ctl.up(3);
}
{
  // Entombed: action keys, sliding between buttons, RUN toggle
  const { input, ctl, geo } = rig(GAMES['entombed+RUN'], 780, 360);
  const by = (l: string) => must(geo.buttons.find((b) => b.spec.label === l), `the ${l} button`);
  ctl.down(1, by('WHIP').x, by('WHIP').y); input.poll();
  ok(input.down.has('KeyX') && input.typed.includes('KeyX'), 'Entombed: WHIP presses X');
  ctl.move(1, by('JUMP').x, by('JUMP').y); input.poll();
  ok(input.down.has('KeyZ') && !input.down.has('KeyX'), 'Entombed: sliding to JUMP lets go of X and presses Z');
  ctl.up(1); input.poll();
  ok(!input.down.has('KeyZ'), 'Entombed: lifted');
  const run = by('RUN');
  ctl.down(1, run.x, run.y); ctl.up(1); input.poll(); input.poll();
  ok(input.down.has('ShiftLeft'), 'RUN: on after a tap, stays on');
  ctl.down(1, run.x, run.y); ctl.up(1); input.poll();
  ok(!input.down.has('ShiftLeft'), 'RUN: off after another tap');
}
{
  // Starquake: GET and PAD hold the game's own up and down (the stick's still do); Z and X do the same on a keyboard (and don't fire), except while letters are typed
  const { input, ctl, geo } = rig(GAMES.starquake, 915, 412);
  const by = (l: string) => must(geo.buttons.find((b) => b.spec.label === l), `the ${l} button`);
  ctl.down(1, by('GET').x, by('GET').y); input.poll();
  ok(input.held.up && !input.held.down && !input.held.fire, 'Starquake: GET holds up');
  ctl.up(1); input.poll();
  ok(!input.held.up, 'Starquake: GET lifted');
  ctl.down(1, by('PAD').x, by('PAD').y); input.poll();
  ok(input.held.down && !input.held.up && !input.held.fire, 'Starquake: PAD holds down');
  ctl.up(1); input.poll();
  const { x, y } = geo.stickHome, R = geo.stickRadius;
  ctl.down(2, x, y); ctl.move(2, x, y - R); input.poll();
  ok(input.held.up, 'Starquake: the stick still holds up');
  ctl.up(2); input.poll();
  ok(by('FIRE') === geo.buttons[0] && geo.buttons.length === 3, 'Starquake: FIRE stays the main button, two more beside it');
}
{
  // small buttons: PAUSE acts on lifting the finger; RETURN is the Enter key; a tap on the picture is a point
  const { input, ctl, geo, taps, sysCalls } = rig(GAMES.karnath, 915, 412);
  const sys = (id: string) => must(geo.system.find((s) => s.spec.id === id), `the ${id} button`);
  ctl.down(1, sys('pause').x, sys('pause').y);
  ok(sysCalls.length === 0, 'PAUSE: nothing until lifted');
  ctl.up(1, sys('pause').x, sys('pause').y);
  ok(sysCalls.join() === 'pause', 'PAUSE: acts when lifted');
  ctl.down(1, sys('pause').x, sys('pause').y); ctl.up(1, sys('pause').x + 200, sys('pause').y);
  ok(sysCalls.length === 1, 'PAUSE: sliding off cancels');
  ctl.down(1, sys('enter').x, sys('enter').y); input.poll();
  ok(input.typed.includes('Enter') && input.down.has('Enter'), 'RETURN: Enter typed and held');
  ctl.up(1); input.poll();
  ok(!input.down.has('Enter'), 'RETURN: released');
  ctl.down(4, geo.picture.x + geo.picture.w / 2, geo.picture.y + 10); ctl.up(4);
  ok(taps.length === 1 && Math.abs(taps[0].y - (geo.picture.y + 10)) < 1e-6, 'picture: a tap is a point');
  ok(!input.held.fire && heldDirs(input) === 'none', 'picture: a tap presses nothing');
}
{
  // portrait (upright): the stick under the picture on the left, buttons on the right
  const { input, ctl, geo } = rig(GAMES.blackwyche, 412, 915, 'portrait');
  const { x, y } = geo.stickHome, R = geo.stickRadius;
  ctl.down(1, x, y); ctl.move(1, x, y - R); input.poll();
  ok(heldDirs(input) === 'up', 'portrait: stick up');
  ctl.down(2, geo.buttons[0].x, geo.buttons[0].y); input.poll();
  ok(input.held.fire && input.held.up, 'portrait: fire with the stick');
  ctl.up(1); ctl.up(2);
}

// ---- the stage drawn turned inside a portrait page (iPhone, or no orientation lock) ----
/** Apply "translate(tx, ty) rotate(deg)" (CSS order: rotate first, then translate) to a point. */
function applyTransform(css: string, x: number, y: number) {
  const m = must(/translate\(([-\d.]+)px, ([-\d.]+)(?:px)?\) rotate\(([-\d.]+)deg\)/.exec(css), `a transform in ${css}`);
  const tx = +m[1], ty = +m[2], a = (+m[3] * Math.PI) / 180;
  const c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
  return { x: x * c - y * s + tx, y: x * s + y * c + ty };
}
for (const [vw, vh] of PHONES) {
  for (const turn of [90, -90] satisfies Turn[]) {
    const css = stageTransform(vw, vh, turn);
    // corners of the stage (vh wide, vw tall) land on the viewport's corners
    const corners = [[0, 0], [vh, 0], [0, vw], [vh, vw]].map(([x, y]) => applyTransform(css, x, y));
    ok(corners.every((p) => (Math.abs(p.x) < 1e-6 || Math.abs(p.x - vw) < 1e-6) && (Math.abs(p.y) < 1e-6 || Math.abs(p.y - vh) < 1e-6)), `turned ${turn} ${vw}x${vh}: the stage fills the viewport`);
    for (const [sx, sy] of [[10, 20], [vh - 30, 5], [vh / 2, vw / 2]]) {
      const c = applyTransform(css, sx, sy), back = clientToStage(c.x, c.y, vw, vh, turn);
      ok(Math.abs(back.x - sx) < 1e-6 && Math.abs(back.y - sy) < 1e-6, `turned ${turn}: touch maps back to the stage (${sx},${sy})`);
    }
    // a whole game, touched through the turned page: the player's thumb on the stick, pushed "right"
    // on the stage (which on the physical screen is along the portrait page's y axis)
    const { input, ctl, geo } = rig(GAMES.entombed, vh, vw);
    const home = applyTransform(css, geo.stickHome.x, geo.stickHome.y);
    const pushed = applyTransform(css, geo.stickHome.x + geo.stickRadius, geo.stickHome.y);
    const a = clientToStage(home.x, home.y, vw, vh, turn), b = clientToStage(pushed.x, pushed.y, vw, vh, turn);
    ctl.down(1, a.x, a.y); ctl.move(1, b.x, b.y); input.poll();
    ok(heldDirs(input) === 'right', `turned ${turn} ${vw}x${vh}: stage-right is right (${heldDirs(input)})`);
    ok(turn === 90 ? Math.abs(pushed.y - home.y - geo.stickRadius) < 1e-6 : Math.abs(home.y - pushed.y - geo.stickRadius) < 1e-6, `turned ${turn}: stage-right runs along the page's ${turn === 90 ? 'down' : 'up'}`);
    const fire = applyTransform(css, geo.buttons[0].x, geo.buttons[0].y), f = clientToStage(fire.x, fire.y, vw, vh, turn);
    ctl.down(2, f.x, f.y); input.poll();
    ok(input.held.fire, `turned ${turn}: fire through the turned page`);
    ctl.up(1); ctl.up(2);
  }
}

// ---- which mode, and desktop ----
const MODES: [string, Parameters<typeof decideMode>[0], ReturnType<typeof decideMode>][] = [
  ['landscape viewport', { vw: 915, vh: 412, preferPortrait: false, started: true, lockPending: false }, 'landscape'],
  ['a landscape viewport stays landscape even if upright is preferred', { vw: 915, vh: 412, preferPortrait: true, started: true, lockPending: false }, 'landscape'],
  ['a square viewport is landscape', { vw: 600, vh: 600, preferPortrait: false, started: true, lockPending: false }, 'landscape'],
  ['before the first tap: portrait (with the nudge)', { vw: 412, vh: 915, preferPortrait: false, started: false, lockPending: false }, 'portrait'],
  ['waiting for the lock: not turned yet', { vw: 412, vh: 915, preferPortrait: false, started: true, lockPending: true }, 'portrait'],
  ['lock refused or unavailable: drawn turned', { vw: 412, vh: 915, preferPortrait: false, started: true, lockPending: false }, 'rotated'],
  ['upright chosen: portrait', { vw: 412, vh: 915, preferPortrait: true, started: true, lockPending: false }, 'portrait'],
];
for (const [what, input, want] of MODES) ok(decideMode(input) === want, `mode: ${what} -> ${want}`);
const TOUCH_WANTED: [boolean, boolean, boolean][] = [[false, false, false], [false, true, true], [true, false, true], [true, true, true]];
for (const [coarse, touched, want] of TOUCH_WANTED) ok(wantsTouch(coarse, touched) === want, `touch UI: coarse pointer ${coarse}, touched ${touched} -> ${want}`);
{
  // a desktop with no controls laid out: the picture gets the whole stage
  const g = layoutStage(1280, 800, 'landscape', { stick: 'none', buttons: [] }, []);
  ok(g.buttons.length === 0 && g.system.length === 0 && !g.stickZone, 'no controls: nothing placed');
}

// ---- the nudge ----
{
  const l = nudgeLayout(412, 915);
  ok(nudgeChoice(l.h - 5, l, true) === 'upright' && nudgeChoice(l.h / 3, l, true) === 'turn', 'nudge: the bottom lines choose upright, elsewhere turn');
  ok(nudgeChoice(l.h - 5, l, false) === 'turn', 'nudge: in a landscape viewport, any tap plays');
  const f0 = drawNudgePixels(l, 0, true);
  const box = (px: Uint8Array, colour: number, rows: (y: number) => boolean = () => true) => {
    let x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
    px.forEach((c, i) => { const x = i % NUDGE_W, y = Math.floor(i / NUDGE_W); if (c === colour && rows(y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } });
    return { w: x1 - x0 + 1, h: y1 - y0 + 1, mid: (x0 + x1 + 1) / 2 };
  };
  const phone = box(f0, 15), text = box(f0, 1);
  ok(phone.w === 22 && phone.h === 38 && phone.mid === NUDGE_W / 2, `nudge: the phone is 22x38, upright, centred (${phone.w}x${phone.h})`);
  ok(text.h >= 8 && text.h <= 20 && Math.abs(text.mid - NUDGE_W / 2) <= 4, `nudge: TURN YOUR PHONE is drawn centred in two text rows (${text.w}x${text.h})`);
  const turned = box(drawNudgePixels(l, 50, true), 15);
  ok(turned.w === 38 && turned.h === 22, `nudge: the phone lies on its side half way through the turn (${turned.w}x${turned.h})`);
}

// ---- a name with the touch controls (games/shared/letters.ts NamePicker), through the controller ----
{
  const input = new Input(nowhere);
  const game: TouchLayout = { stick: '4', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }] };
  const geo = layoutStage(915, 412, 'landscape', game, SYSTEM);
  const ctl = new TouchController({ keyDown: (c) => input.keyDown(c), keyUp: (c) => input.keyUp(c) }, geo, game.stick);
  const picker = new NamePicker({ alphabet: 'ABC ', max: 3, button: { label: 'JUMP', key: 'Space' } });
  const keys: string[] = [];
  const frame = () => { input.poll(); const r = picker.frame(input); keys.push(...r.keys); return r.typed; };
  const { x, y } = geo.stickHome, R = geo.stickRadius, b = geo.buttons[0];
  const push = (dy: number, frames = 1) => { ctl.down(1, x, y); ctl.move(1, x, y + dy * R * 0.9); for (let i = 0; i < frames; i++) frame(); ctl.up(1); frame(); };
  const jump = () => { ctl.down(2, b.x, b.y); frame(); ctl.up(2); frame(); };
  frame();
  ok(picker.pending === 'A' && keys.length === 0, 'name: A under the cursor to start, nothing typed');
  push(-1);
  ok(picker.pending === 'B', 'name: stick up, the next letter (B)');
  push(1); push(1);
  ok(picker.pending === ' ', 'name: down twice, round to the last (space)');
  push(1); push(-1);
  jump();
  ok(keys.join() === ' ' && picker.pending === ' ', `name: JUMP puts it in (typed: "${keys.join()}"), the next starts at it`);
  push(-1, 14 + 4 + 1);
  ok(picker.pending === 'C', `name: up held runs on (A, then after a moment B, C: ${picker.pending})`);
  ctl.down(3, x, y); ctl.move(3, x - R * 0.9, y); frame(); ctl.up(3); frame();
  ok(keys.join('|') === ' |Backspace' && picker.pending === ' ', 'name: left rubs out the last letter put in, which is under the cursor again');
  jump(); push(-1); jump(); jump();
  ok(keys.join('|') === ' |Backspace| |A|A' && picker.pending === null, `name: three in, full: none under the cursor (${keys.join('|')})`);
  const enter = must(geo.system.find((s) => s.spec.id === 'enter'), 'RETURN');
  ctl.down(4, enter.x, enter.y); const typed = frame(); ctl.up(4);
  ok(typed.join() === 'Enter', 'name: RET goes to the game as RETURN');
  // the keyboard: not the picker's (its arrows and Space go to the game as typed)
  picker.reset(); keys.length = 0;
  frame();
  input.touchTyped.length = 0;
  const kb = { typed: ['ArrowUp', 'Space', 'KeyQ'], touchTyped: [], down: new Set<string>() };
  const r = picker.frame(kb);
  ok(r.keys.length === 0 && r.typed.join() === 'ArrowUp,Space,KeyQ' && picker.pending === 'A', 'name: the keyboard\'s keys pass the picker by, as typed');
  const pacer = new KeyPacer(2, 1);
  pacer.push(['A', 'A']);
  const seen = Array.from({ length: 7 }, () => pacer.next() ?? '-').join('');
  ok(seen === 'AA-AA--', `pacer: each key held, then let go before the next (${seen})`);
}

// ---- the edges: the OS back gesture starts there, so no control or touch zone does ----
{
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  for (const [name, game] of Object.entries(GAMES)) for (const [pw, ph] of PHONES) {
    const cases = [
      ['landscape', ph, pw, 0], ['portrait', pw, ph, 0], ['landscape', ph, pw, 90],
    ] as const;
    for (const [mode, w, h, turn] of cases) {
      const g = layoutStage(w, h, mode, game, SYSTEM, inset, edgeGuard(turn));
      const tag = `edge ${name} ${mode}${turn ? ' turned' : ''} ${w}x${h}`;
      const sideFree = (r: Rect) => (turn ? r.y >= EDGE_GUARD - 0.5 && r.y + r.h <= h - EDGE_GUARD + 0.5 : r.x >= EDGE_GUARD - 0.5 && r.x + r.w <= w - EDGE_GUARD + 0.5);
      for (const c of [...g.buttons, ...g.system]) ok(sideFree(circleRect(c)), `${tag}: a control keeps clear of the edge`);
      if (g.stickZone) {
        ok(sideFree(g.stickZone), `${tag}: the stick's zone keeps clear of the edge`);
        ok(sideFree(circleRect({ ...g.stickHome, r: g.stickRadius })), `${tag}: the stick rests clear of the edge`);
      }
      if (g.buttonZone) ok(sideFree(g.buttonZone), `${tag}: the buttons' zone keeps clear of the edge`);
      ok(Math.abs(g.picture.w / g.picture.h - PICTURE_ASPECT) < 0.01, `${tag}: picture keeps its shape`);
    }
  }
  // a floating stick put down in the edge band is not a stick touch
  const game = must(GAMES.montyotr, 'montyotr');
  const geo = layoutStage(844, 390, 'landscape', game, SYSTEM, inset, edgeGuard(0));
  const sink = new Input(nowhere);
  const ctl = new TouchController({ keyDown: (c) => sink.keyDown(c), keyUp: (c) => sink.keyUp(c) }, geo, game.stick);
  const z = must(geo.stickZone, 'stick zone');
  ctl.down(1, 4, z.y + z.h / 2);
  ok(ctl.hit(4, z.y + z.h / 2).kind === 'none' && !ctl.stick.active, 'edge: a touch in the edge band does not start the stick');
  ctl.down(2, z.x + 2, z.y + z.h / 2);
  ok(ctl.stick.active && ctl.stick.cx >= z.x + geo.stickRadius * 0.5 - 0.01, 'edge: a stick put down at the guard\'s inner edge floats clear of it');
}

// ---- the back gesture's backstop (the shell carries the decisions out) ----
{
  const at = (over: Partial<Parameters<typeof decideBack>[0]>) => decideBack({ game: 'karnath', state: null, hash: 'karnath', asking: false, paused: false, ...over });
  const BACKS: [string, Partial<Parameters<typeof decideBack>[0]>, ReturnType<typeof decideBack>][] = [
    ['in play, back opens the pause screen', {}, 'pause'],
    ['from the pause screen, back leaves', { paused: true }, 'leave'],
    ['with "back to the menu?" up, back closes it', { asking: true }, 'close-ask'],
    ['"back to the menu?" beats the pause screen', { asking: true, paused: true }, 'close-ask'],
    ['forward onto the guard entry does nothing', { state: PLAY_ENTRY }, 'ignore'],
    ['the guard entry beats "back to the menu?"', { state: PLAY_ENTRY, asking: true }, 'ignore'],
    ['on the directory, back restarts cleanly', { game: null, hash: '' }, 'reload'],
    ['an edited address restarts cleanly', { hash: 'saves' }, 'reload'],
    ['a foreign history entry is not the guard entry', { state: { runstop64: 'other' } }, 'pause'],
    ['a non-object state is not the guard entry', { state: 'play' }, 'pause'],
    ['an empty state object is not the guard entry', { state: {} }, 'pause'],
  ];
  for (const [what, over, want] of BACKS) ok(at(over) === want, `back: ${what} -> ${want}`);
}

// ---- the controller's finer points ----------------------------------------------------------

/** Polar offsets from the stick's home, as a touch point: `deg` 0 = right, 90 = down. */
const polar = (geo: Geometry, deg: number, reach: number) => ({
  x: geo.stickHome.x + Math.cos((deg * Math.PI) / 180) * geo.stickRadius * reach,
  y: geo.stickHome.y + Math.sin((deg * Math.PI) / 180) * geo.stickRadius * reach,
});
const pushTo = (t: ReturnType<typeof rig>, deg: number, reach = 0.8) => {
  const p = polar(t.geo, deg, reach);
  t.ctl.move(1, p.x, p.y);
  t.input.poll();
  return heldDirs(t.input);
};
const startStick = (t: ReturnType<typeof rig>) => t.ctl.down(1, t.geo.stickHome.x, t.geo.stickHome.y);
const buttonOf = (geo: Geometry, label: string) => must(geo.buttons.find((b) => b.spec.label === label), `the ${label} button`);
const systemOf = (geo: Geometry, id: string) => must(geo.system.find((s) => s.spec.id === id), `the ${id} button`);

{
  // one finger owns the stick: a second one in the stick zone does nothing
  const t = rig(GAMES.entombed, 780, 360);
  const z = must(t.geo.stickZone, 'the stick zone');
  startStick(t);
  pushTo(t, 0);
  const before = { ...t.ctl.stick, dirs: [...t.ctl.stick.dirs] };
  t.ctl.down(2, z.x + 6, z.y + 6);
  t.ctl.move(2, z.x + z.w - 6, z.y + z.h - 6);
  t.input.poll();
  ok(t.ctl.stick.cx === before.cx && t.ctl.stick.x === before.x && heldDirs(t.input) === 'right', 'stick: a second finger in the zone neither moves the stick nor changes its directions');
  t.ctl.up(2);
  t.input.poll();
  ok(t.ctl.stick.active && heldDirs(t.input) === 'right', 'stick: the second finger lifting leaves the first one steering');
}

{
  // two fingers on one button hold it until both lift
  const t = rig(GAMES.entombed, 780, 360);
  const jump = buttonOf(t.geo, 'JUMP');
  t.ctl.down(1, jump.x, jump.y);
  t.ctl.down(2, jump.x, jump.y);
  t.ctl.up(1);
  t.input.poll();
  ok(t.input.down.has('KeyZ') && t.ctl.isLit(jump.index), 'button: one of two fingers lifted, still held and lit');
  t.ctl.up(2);
  t.input.poll();
  ok(!t.input.down.has('KeyZ') && !t.ctl.isLit(jump.index), 'button: both lifted, let go and not lit');
}

{
  // a resize or turn lets go of what is held but keeps RUN on; a layout without RUN drops it
  const withRun = GAMES['entombed+RUN'];
  const t = rig(withRun, 780, 360);
  const run = buttonOf(t.geo, 'RUN'), jump = buttonOf(t.geo, 'JUMP');
  t.ctl.down(1, run.x, run.y); t.ctl.up(1);
  t.ctl.down(2, jump.x, jump.y);
  startStick(t); pushTo(t, 0);
  t.ctl.setGeometry(layoutStage(844, 390, 'landscape', withRun, SYSTEM), withRun.stick);
  t.input.poll();
  ok(t.input.down.has('ShiftLeft') && t.ctl.toggled.has(run.index), 'resize: RUN stays on across the new geometry');
  ok(!t.input.down.has('KeyZ') && heldDirs(t.input) === 'none' && !t.ctl.stick.active, 'resize: held buttons and the stick are let go');
  t.ctl.setGeometry(layoutStage(844, 390, 'landscape', GAMES.entombed, SYSTEM), GAMES.entombed.stick);
  t.input.poll();
  ok(!t.input.down.has('ShiftLeft') && t.ctl.toggled.size === 0, 'another layout without RUN: RUN is let go');
}

{
  // sliding from one button to the next: only between plain buttons, and only inside the buttons' zone
  const t = rig(GAMES['entombed+RUN'], 780, 360);
  const zone = must(t.geo.buttonZone, 'the button zone');
  const jump = buttonOf(t.geo, 'JUMP'), run = buttonOf(t.geo, 'RUN');
  t.ctl.down(1, jump.x, jump.y);
  t.ctl.move(1, run.x, run.y);
  t.input.poll();
  ok(t.input.down.has('KeyZ') && !t.input.down.has('ShiftLeft') && !t.ctl.toggled.has(run.index), 'slide: onto a toggle button changes nothing');
  t.ctl.up(1);
  t.ctl.down(2, run.x, run.y);
  t.ctl.move(2, jump.x, jump.y);
  t.input.poll();
  ok(t.input.down.has('ShiftLeft') && !t.input.down.has('KeyZ'), 'slide: off a toggle button presses nothing');
  t.ctl.up(2);
  t.ctl.down(3, jump.x, jump.y);
  // a point just outside the zone that is closer to another plain button than to JUMP
  const rel = (b: { x: number; y: number; r: number }, p: { x: number; y: number }) => Math.hypot(p.x - b.x, p.y - b.y) / b.r;
  const others = t.geo.buttons.filter((b) => b !== jump && b.spec.mode !== 'toggle');
  const outside = others.flatMap((b) => [{ x: zone.x - 3, y: b.y }, { x: zone.x + zone.w + 3, y: b.y }, { x: b.x, y: zone.y - 3 }, { x: b.x, y: zone.y + zone.h + 3 }].map((p) => ({ p, b })))
    .find(({ p, b }) => rel(b, p) < rel(jump, p) && !t.geo.buttons.some((o) => o !== b && rel(o, p) <= rel(b, p)));
  const away = must(outside, 'a point outside the zone nearer another button than JUMP');
  ok(t.ctl.hit(away.p.x, away.p.y).kind !== 'button', 'slide: the test point is outside the buttons\' zone');
  t.ctl.move(3, away.p.x, away.p.y);
  t.input.poll();
  ok(t.input.down.has('KeyZ') && !t.input.down.has(away.b.spec.key), 'slide: outside the zone onto another button changes nothing');
  t.ctl.move(3, away.b.x, away.b.y);
  t.input.poll();
  ok(t.input.down.has(away.b.spec.key) && !t.input.down.has('KeyZ'), 'slide: inside the zone onto another button moves the press');
  t.ctl.up(3);
}

{
  // system buttons: a cancelled touch does not act; reach is the radius plus 6, and a lift counts up to the radius plus 16
  const t = rig(GAMES.karnath, 915, 412);
  const pause = systemOf(t.geo, 'pause');
  t.ctl.down(1, pause.x, pause.y);
  t.ctl.cancel(1);
  ok(t.sysCalls.length === 0, 'PAUSE: a cancelled touch does not act');
  const at = (d: number) => ({ x: pause.x + pause.r + d, y: pause.y });
  ok(t.ctl.hit(at(5).x, at(5).y).kind === 'system', 'PAUSE: a touch 5px outside its edge still hits it');
  ok(t.ctl.hit(at(7).x, at(7).y).kind !== 'system', 'PAUSE: a touch 7px outside its edge misses it');
  t.ctl.down(2, pause.x, pause.y);
  t.ctl.up(2, at(15).x, at(15).y);
  ok(t.sysCalls.join() === 'pause', 'PAUSE: lifted 15px outside its edge, it acts');
  t.ctl.down(3, pause.x, pause.y);
  t.ctl.up(3, at(17).x, at(17).y);
  ok(t.sysCalls.join() === 'pause', 'PAUSE: lifted 17px outside its edge, it does not act');
  t.ctl.down(4, pause.x, pause.y);
  t.ctl.up(4);
  ok(t.sysCalls.join() === 'pause,pause', 'PAUSE: lifted with no position, it acts');
}

{
  // left/right stick: a held direction survives a little way back toward the middle, a fresh one does not start there
  const t = rig(GAMES.jsw2, 844, 390);
  const dead = t.geo.stickRadius * 0.28;
  for (const sign of [1, -1]) {
    const name = sign > 0 ? 'right' : 'left';
    startStick(t);
    const at = (k: number) => t.ctl.move(1, t.geo.stickHome.x + sign * dead * k, t.geo.stickHome.y);
    at(0.85); t.input.poll();
    ok(heldDirs(t.input) === 'none', `lr: ${name} just inside the dead zone is not yet held`);
    at(1.2); t.input.poll();
    ok(heldDirs(t.input) === name, `lr: ${name} past the dead zone is held`);
    at(0.85); t.input.poll();
    ok(heldDirs(t.input) === name, `lr: ${name} stays held a little way back`);
    at(0.5); t.input.poll();
    ok(heldDirs(t.input) === 'none', `lr: ${name} lets go well inside the dead zone`);
    t.ctl.up(1);
  }
}

{
  // 4-way and 8-way sticks keep their direction a little past the sector edge, in every direction
  const FOUR: [number, string][] = [[0, 'right'], [90, 'down'], [180, 'left'], [-90, 'up']];
  const four = rig(GAMES.montyotr, 780, 360);
  for (const [centre, name] of FOUR) for (const sign of [1, -1]) {
    startStick(four);
    pushTo(four, centre);
    const sticky = pushTo(four, centre + sign * 52), past = pushTo(four, centre + sign * 56);
    four.ctl.up(1);
    ok(sticky === name && past !== name && past !== 'none', `4-way: ${name} holds at ${sign * 52} degrees and changes by ${sign * 56} (${sticky}, ${past})`);
  }
  const EIGHT: [number, string][] = [[0, 'right'], [45, 'down+right'], [90, 'down'], [135, 'down+left'], [180, 'left'], [-135, 'up+left'], [-90, 'up'], [-45, 'up+right']];
  const eight = rig(GAMES.entombed, 780, 360);
  for (const [centre, name] of EIGHT) for (const sign of [1, -1]) {
    startStick(eight);
    const first = pushTo(eight, centre);
    const sticky = pushTo(eight, centre + sign * 26), past = pushTo(eight, centre + sign * 31);
    eight.ctl.up(1);
    ok(first === name && sticky === name && past !== name, `8-way: ${name} holds at ${sign * 26} degrees and changes by ${sign * 31} (${first}, ${sticky}, ${past})`);
  }
}

{
  // letting go of everything, the haptic tick, lit buttons and the activity clock
  const t = rig(GAMES['entombed+RUN'], 780, 360);
  const ticks: number[] = [];
  t.ctl.onPress = () => ticks.push(ticks.length);
  const jump = buttonOf(t.geo, 'JUMP'), run = buttonOf(t.geo, 'RUN');
  t.ctl.down(5, jump.x, jump.y, 100);
  ok(ticks.length === 1 && t.ctl.lastActivity === 100, 'a button press ticks once and stamps the activity clock');
  t.ctl.move(5, jump.x + 1, jump.y, 200);
  ok(t.ctl.lastActivity === 200, 'a move stamps the activity clock');
  t.ctl.up(5, undefined, undefined, 300);
  ok(ticks.length === 1 && t.ctl.lastActivity === 300, 'lifting a button does not tick, and stamps the clock');
  t.ctl.down(6, run.x, run.y);
  ok(ticks.length === 2 && t.ctl.isLit(run.index), 'RUN on: ticks and is lit');
  t.ctl.up(6);
  ok(t.ctl.isLit(run.index), 'RUN stays lit after the finger lifts');
  t.ctl.down(7, run.x, run.y);
  ok(ticks.length === 2 && !t.ctl.isLit(run.index), 'RUN off: no tick, no longer lit');
  t.ctl.up(7);
  startStick(t); pushTo(t, 0);
  ok(ticks.length === 3, 'a stick direction ticks once');
  pushTo(t, 0, 0.9);
  ok(ticks.length === 3, 'the same direction again does not tick');
  pushTo(t, 45);
  ok(ticks.length === 4, 'a further direction ticks');
  t.ctl.down(8, jump.x, jump.y);
  t.input.poll();
  t.ctl.releaseAll();
  t.input.poll();
    ok(heldDirs(t.input) === 'none' && !t.input.down.has('KeyZ') && !t.ctl.stick.active && !t.ctl.isLit(jump.index), 'releaseAll lets go of the stick and the buttons');
  const enter = systemOf(t.geo, 'enter');
  t.ctl.down(9, enter.x, enter.y);
  ok(ticks.length === 6, 'a system key press ticks');
  t.ctl.up(9);
}

finish();
