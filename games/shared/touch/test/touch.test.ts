/**
 * Headless checks for the touch layer (no browser): the geometry on common phones,
 * synthetic touches turned into Input state (upright, landscape, and the stage drawn
 * turned inside a portrait page), the mode decisions, and that a desktop gets nothing.
 *
 *   npm run test:touch
 */
import { Input } from '../../../../packages/c64kit/src/input';
import { TouchController } from '../controller';
import { clientToStage, decideMode, layoutStage, PICTURE_ASPECT, stageTransform, wantsTouch, type Geometry, type Rect, type SystemSpec, type TouchLayout, type Turn } from '../layout';
import { drawNudgePixels, nudgeChoice, nudgeLayout } from '../nudge';
import { PAUSE_TAP } from '../../native/pause';
import { nowhere } from '../../test/browser';
import { KeyPacer, NamePicker } from '../../letters';
import { must } from '../../test/must';

let failures = 0, checks = 0;
function ok(cond: unknown, what: string) {
  checks++;
  if (!cond) { failures++; console.log(`FAIL ${what}`); }
}

// ---- every game's layout, as declared (RUN added by the native front end for games that run) ----
const RUN = { label: 'RUN', key: 'ShiftLeft', size: 'small', mode: 'toggle' } as const;
const GAMES: Record<string, TouchLayout> = {
  loader: { stick: 'none', buttons: [] },
  montyotr: { stick: '4', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }] },
  awm: { stick: '4', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }, { label: 'FLY', key: 'KeyC', size: 'small' }] },
  thingonaspring: { stick: '8', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }] },
  jsw2: { stick: 'lr', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }, RUN] },
  entombed: { stick: '8', buttons: [{ label: 'USE', key: 'Space', size: 'big' }, { label: 'JUMP', key: 'KeyZ' }, { label: 'WHIP', key: 'KeyX' }, { label: 'TORCH', key: 'KeyC' }, RUN] },
  karnath: { stick: '8', buttons: [{ label: 'CAST', key: 'Space', size: 'big' }, { label: 'SPELL', key: 'Enter' }, RUN] },
  blackwyche: { stick: '8', buttons: [{ label: 'USE', key: 'Space', size: 'big' }, { label: 'JUMP', key: 'KeyZ' }, { label: 'SWORD', key: 'KeyX' }, RUN] },
  dragonskulle: { stick: '8', buttons: [{ label: 'USE', key: 'Space', size: 'big' }, { label: 'JUMP', key: 'KeyZ' }, { label: 'STONE', key: 'KeyX' }, { label: 'DIG', key: 'KeyC' }, { label: 'CLOAK', key: 'KeyV' }, RUN] },
  antiriad: { stick: '8', buttons: [{ label: 'FIRE', key: 'Space', size: 'big', colour: 'red' }] },
};
const SYSTEM: SystemSpec[] = [{ id: 'home', label: 'HOME' }, { id: 'layout', label: 'TURN' }, { id: 'pause', label: 'PAUSE' }, { id: 'enter', label: 'RETURN', key: 'Enter' }];
/** The games with an HD view: the small C64/HD key too (the shell's C64/HD switch on a phone: index.ts showView). */
const VIEW: SystemSpec = { id: 'view', label: 'C64/HD VIEW' };
const HD_GAMES = new Set(['entombed', 'karnath', 'blackwyche', 'dragonskulle']);
/** The small keys as the touch layer lists them for a game with an HD view (index.ts placeKeys). */
const withView: SystemSpec[] = [...SYSTEM.filter((s) => s.id !== 'enter'), VIEW, ...SYSTEM.filter((s) => s.id === 'enter')];
const PHONES = [[360, 780], [412, 915], [390, 844]] as const;

const inside = (r: Rect, o: Rect, slack = 0.5) => r.x >= o.x - slack && r.y >= o.y - slack && r.x + r.w <= o.x + o.w + slack && r.y + r.h <= o.y + o.h + slack;
const circleRect = (c: { x: number; y: number; r: number }): Rect => ({ x: c.x - c.r, y: c.y - c.r, w: 2 * c.r, h: 2 * c.r });
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

function checkGeometry(name: string, g: Geometry, w: number, h: number, game: TouchLayout, inset = { top: 0, bottom: 0 }) {
  const stage = { x: 0, y: 0, w, h };
  const tag = `${name} ${g.mode} ${w}x${h}`;
  ok(inside(g.picture, stage), `${tag}: picture inside the stage`);
  ok(Math.abs(g.picture.w / g.picture.h - PICTURE_ASPECT) < 0.01, `${tag}: picture keeps the C64 shape`);
  // the picture is as big as it can be: in landscape at least 75% of the height, in portrait the full width
  const avail = h - inset.top - inset.bottom;
  if (g.mode === 'landscape') ok(g.picture.h >= avail * (game.buttons.length ? 0.8 : 0.99), `${tag}: picture tall enough (${g.picture.h.toFixed(0)} of ${avail})`);
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
  if (game.stick !== 'none') ok(g.stickRadius >= 30 && g.stickZone, `${tag}: a stick with reach`);
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
    const sys = name === 'loader' ? SYSTEM.filter((s) => s.id === 'layout') : HD_GAMES.has(name) ? withView : SYSTEM;
    checkGeometry(name, layoutStage(ph, pw, 'landscape', game, sys), ph, pw, game);
    if (HD_GAMES.has(name)) for (const [w, h, mode] of [[ph, pw, 'landscape'], [pw, ph, 'portrait']] as const) {
      // the HD key: in PAUSE's gutter, beside it (RET one further along); HOME, TURN and PAUSE where they are without it
      const g = layoutStage(w, h, mode, game, sys), without = layoutStage(w, h, mode, game, SYSTEM);
      const at = (geo: Geometry, id: string) => must(geo.system.find((s) => s.spec.id === id), id);
      const hd = at(g, 'view'), pause = at(g, 'pause');
      ok(Math.hypot(hd.x - pause.x, hd.y - pause.y) < (hd.r + pause.r) * 1.4 && (hd.x > g.picture.x + g.picture.w) === (pause.x > g.picture.x + g.picture.w),
        `${name} ${mode} ${w}x${h}: HD beside PAUSE`);
      ok(SYSTEM.filter((s) => s.id !== 'enter').every((s) => { const a = at(g, s.id), b = at(without, s.id); return a.x === b.x && a.y === b.y; }), `${name} ${mode} ${w}x${h}: HOME, TURN, PAUSE where they are without HD`);
    }
    checkGeometry(name, layoutStage(pw, ph, 'portrait', game, sys), pw, ph, game);
    // with an iPhone's notch (left in landscape) and home bar
    checkGeometry(`${name} notch`, layoutStage(ph, pw, 'landscape', game, sys, { top: 0, right: 0, bottom: 21, left: 47 }), ph, pw, game, { top: 0, bottom: 21 });
  }
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
  const { input, ctl, geo } = rig(GAMES.entombed, 780, 360);
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
  ok(geo.buttons.every((b) => b.r > 0), 'Entombed: five buttons placed');
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
  // the C64/HD key (games with an HD view): the shell's switch when lifted (TouchHost.onView), no key for the game
  const input = new Input(nowhere), geo = layoutStage(915, 412, 'landscape', GAMES.blackwyche, withView), sysCalls: string[] = [];
  const ctl = new TouchController({ keyDown: (c) => input.keyDown(c), keyUp: (c) => input.keyUp(c), tap: () => {} }, geo, GAMES.blackwyche.stick);
  ctl.onSystem = (id) => sysCalls.push(id);
  const hd = must(geo.system.find((s) => s.spec.id === 'view'), 'the C64/HD key');
  ctl.down(1, hd.x, hd.y); input.poll();
  ok(!input.typed.length && !sysCalls.length, 'C64/HD: nothing until lifted, no key for the game');
  ctl.up(1, hd.x, hd.y); input.poll();
  ok(sysCalls.join() === 'view' && !input.typed.length && !input.down.size, 'C64/HD: the switch when lifted, once');
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
ok(decideMode({ vw: 915, vh: 412, preferPortrait: false, started: true, lockPending: false }) === 'landscape', 'mode: landscape viewport → landscape');
ok(decideMode({ vw: 915, vh: 412, preferPortrait: true, started: true, lockPending: false }) === 'landscape', 'mode: a landscape viewport stays landscape even if upright is preferred');
ok(decideMode({ vw: 412, vh: 915, preferPortrait: false, started: false, lockPending: false }) === 'portrait', 'mode: before the first tap, portrait (with the nudge)');
ok(decideMode({ vw: 412, vh: 915, preferPortrait: false, started: true, lockPending: true }) === 'portrait', 'mode: waiting for the lock, not turned yet');
ok(decideMode({ vw: 412, vh: 915, preferPortrait: false, started: true, lockPending: false }) === 'rotated', 'mode: lock refused/unavailable → drawn turned');
ok(decideMode({ vw: 412, vh: 915, preferPortrait: true, started: true, lockPending: false }) === 'portrait', 'mode: upright chosen → portrait');
ok(!wantsTouch(false, false), 'desktop (fine pointer, no touch): no touch UI');
ok(wantsTouch(false, true), 'a touch on a desktop: touch UI');
ok(wantsTouch(true, false), 'phone (coarse pointer): touch UI');
{
  const input = new Input(nowhere);
  input.poll();
  ok(!input.touch && input.points.length === 0 && input.down.size === 0, 'desktop: Input untouched by the touch layer');
  // a desktop with no controls laid out: the picture gets the whole stage
  const g = layoutStage(1280, 800, 'landscape', { stick: 'none', buttons: [] }, []);
  ok(g.buttons.length === 0 && g.system.length === 0 && !g.stickZone, 'no controls: nothing placed');
}

// ---- the nudge ----
{
  const l = nudgeLayout(412, 915);
  ok(nudgeChoice(l.h - 5, l, true) === 'upright' && nudgeChoice(l.h / 3, l, true) === 'turn', 'nudge: the bottom lines choose upright, elsewhere turn');
  ok(nudgeChoice(l.h - 5, l, false) === 'turn', 'nudge: in a landscape viewport, any tap plays');
  const f0 = drawNudgePixels(l, 0, true), f40 = drawNudgePixels(l, 40, true);
  ok(f0.some((c) => c === 15) && f0.some((c) => c === 1), 'nudge: phone and text drawn');
  ok(f0.some((c, i) => c !== f40[i]), 'nudge: the phone turns');
}

// ---- the pause screen's tap places (games/shared/native/pause.ts): option lines bottom up from y=166 ----
{
  const n = 6; // e.g. H FULL LIFE / ON, I HINTS / OFF, B BACK TO / ROOM START
  for (let i = 0; i < n; i++) ok(PAUSE_TAP.option(250, 166 - (n - 1 - i) * 12 + 4, n) === i, `pause: option line ${i} tapped`);
  ok(PAUSE_TAP.option(100, 166, n) === -1, 'pause: a tap on the map is not an option');
  ok(PAUSE_TAP.option(250, 20, n) === -1, 'pause: a tap above the options is not one');
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

console.log(`${checks - failures}/${checks} touch checks passed`);
if (failures) process.exit(1);
