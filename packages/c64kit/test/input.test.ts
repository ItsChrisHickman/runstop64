/**
 * Input (src/input.ts), headless: keys, system shortcuts (Cmd held: screenshots, window switching
 * reach no game), focus loss, the touch layer's keys, gamepads and taps.
 *
 *   node tools/test.mjs packages/c64kit/test/input.test.ts
 */
import { Input, type GamepadLike, type GamepadSource, type KeyEventLike, type KeyTarget, type Stick } from '../src/input';
import { check, finish } from '../../../games/shared/test/check';

type Listener = (e: KeyEventLike) => void;
const IDLE: KeyEventLike = { code: '', repeat: false, metaKey: false, preventDefault() {} };

/** A fresh Input on a fake window and document, and the means to send it events. */
function makeInput(pads: GamepadSource = () => []) {
  const win = new Map<string, Listener[]>();
  const doc = new Map<string, Listener[]>();
  const add = (into: Map<string, Listener[]>) => (type: string, fn: Listener) => { into.set(type, [...(into.get(type) ?? []), fn]); };
  const target: KeyTarget = {
    addEventListener: add(win),
    document: { addEventListener: add(doc) },
  };
  const input = new Input(target, pads);
  const send = (from: Map<string, Listener[]>, type: string, e: KeyEventLike = IDLE) => { for (const fn of from.get(type) ?? []) fn(e); };
  return {
    input,
    /** A key event; returns whether the page's default was prevented. */
    key(type: 'keydown' | 'keyup', code: string, opts: { meta?: boolean; repeat?: boolean } = {}): boolean {
      let prevented = false;
      send(win, type, { code, repeat: opts.repeat ?? false, metaKey: opts.meta ?? false, preventDefault() { prevented = true; } });
      return prevented;
    },
    blur: () => send(win, 'blur'),
    hidden: () => send(doc, 'visibilitychange'),
    fullscreen: () => send(doc, 'fullscreenchange'),
  };
}
type Rig = ReturnType<typeof makeInput>;

/** A gamepad whose axes and pressed buttons the test changes between polls. */
function makePad() {
  const pad: { connected: boolean; axes: number[]; buttons: { pressed: boolean }[] } = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  return { pad, source: (): GamepadLike[] => [pad], press: (i: number, on = true) => { pad.buttons[i].pressed = on; } };
}

const NAMES: (keyof Stick)[] = ['left', 'right', 'up', 'down', 'fire'];
const heldOnly = (h: Stick, ...names: (keyof Stick)[]) => NAMES.every((k) => h[k] === names.includes(k));

// Every key of the map sets exactly its direction or fire.
const KEYS: [string, keyof Stick][] = [
  ['ArrowLeft', 'left'], ['KeyA', 'left'], ['ArrowRight', 'right'], ['KeyD', 'right'],
  ['ArrowUp', 'up'], ['KeyW', 'up'], ['ArrowDown', 'down'], ['KeyS', 'down'],
  ['Space', 'fire'], ['KeyZ', 'fire'], ['KeyX', 'fire'], ['ControlLeft', 'fire'], ['ControlRight', 'fire'],
];
for (const [code, dir] of KEYS) {
  const t = makeInput();
  t.key('keydown', code);
  t.input.poll();
  check(`${code} holds only ${dir}, and is typed`, heldOnly(t.input.held, dir) && heldOnly(t.input.pressed, dir) && t.input.typed.includes(code));
}

// Cmd, Shift, Ctrl, 4 (the macOS screenshot): nothing typed, nothing held
{
  const t = makeInput();
  t.key('keydown', 'MetaLeft', { meta: true });
  t.key('keydown', 'ShiftLeft', { meta: true });
  t.key('keydown', 'ControlLeft', { meta: true });
  t.key('keydown', 'Digit4', { meta: true });
  t.input.poll();
  check('Cmd+Shift+Ctrl+4: no key typed, nothing held', t.input.typed.length === 0 && t.input.down.size === 0 && !t.input.held.fire);
  t.key('keyup', 'MetaLeft');
  t.input.poll();
  check('after Cmd is let go: nothing held (macOS sends no other releases)', t.input.down.size === 0 && !t.input.held.fire);
}

// A key held before Cmd goes down is let go
{
  const t = makeInput();
  t.key('keydown', 'ArrowLeft');
  t.input.poll();
  t.key('keydown', 'MetaLeft', { meta: true });
  t.input.poll();
  check('held key is let go when Cmd goes down', t.input.down.size === 0 && !t.input.held.left);
}

// Ctrl first, then Cmd in the same frame: the Ctrl isn't seen either
{
  const t = makeInput();
  t.key('keydown', 'ControlLeft');
  t.key('keydown', 'MetaLeft', { meta: true });
  t.input.poll();
  check('Ctrl then Cmd in one frame: no fire, nothing typed', t.input.typed.length === 0 && !t.input.held.fire);
}

// Typing: a repeat adds nothing, a hold is typed once
{
  const t = makeInput();
  t.key('keydown', 'KeyM');
  t.key('keydown', 'KeyM', { repeat: true });
  t.key('keydown', 'KeyM', { repeat: true });
  t.input.poll();
  check('auto-repeat is not typed again', t.input.typed.join() === 'KeyM' && t.input.down.has('KeyM'));
  t.input.poll();
  check('typed lasts one poll', t.input.typed.length === 0 && t.input.down.has('KeyM'));
}

// The browser's own use of a key is prevented for the game's keys, menu keys, F1 and F7, and not for others
for (const [code, prevented] of [['Space', true], ['ArrowUp', true], ['Enter', true], ['NumpadEnter', true], ['Escape', true], ['F1', true], ['F7', true], ['KeyQ', false], ['F5', false]] as const) {
  const t = makeInput();
  check(`${code}: browser default ${prevented ? 'prevented' : 'left alone'}`, t.key('keydown', code) === prevented);
}

// Keys held go when the window loses focus, the tab hides or full screen changes
const LOSSES: [string, (t: Rig) => void][] = [['blur', (t) => t.blur()], ['visibilitychange', (t) => t.hidden()], ['fullscreenchange', (t) => t.fullscreen()]];
for (const [name, lose] of LOSSES) {
  const t = makeInput();
  t.key('keydown', 'ArrowRight');
  t.input.poll();
  lose(t);
  t.input.poll();
  check(`${name}: held keys are released`, t.input.down.size === 0 && !t.input.held.right);
}

// The touch layer: two fingers on one key, a tap shorter than a poll, letting go of everything
{
  const t = makeInput();
  t.input.keyDown('KeyZ');
  t.input.keyDown('KeyZ');
  t.input.poll();
  check('two fingers on one key: typed once, held', t.input.typed.join() === 'KeyZ' && t.input.touchTyped.join() === 'KeyZ' && t.input.held.fire);
  t.input.keyUp('KeyZ');
  t.input.poll();
  check('one finger lifted: key still held', t.input.held.fire && t.input.down.has('KeyZ') && t.input.touchTyped.length === 0);
  t.input.keyUp('KeyZ');
  t.input.poll();
  check('both fingers lifted: key released', !t.input.held.fire && t.input.down.size === 0);

  t.input.keyDown('Space');
  t.input.keyUp('Space');
  t.input.poll();
  check('a tap shorter than one poll still holds the key for that poll', t.input.held.fire && t.input.pressed.fire);
  t.input.poll();
  check('and no longer', !t.input.held.fire);

  t.input.keyDown('ArrowLeft');
  t.input.keyDown('KeyZ');
  t.input.poll();
  t.input.releaseVirtual();
  t.input.poll();
  check('releaseVirtual lets go of every touch key', t.input.down.size === 0 && heldOnly(t.input.held));
}

// Keyboard keys are not touch presses
{
  const t = makeInput();
  t.key('keydown', 'Space');
  t.input.poll();
  check('a keyboard key is typed but not touch-typed', t.input.typed.includes('Space') && t.input.touchTyped.length === 0);
}

// `pressed` is true only on the poll a direction went down
{
  const t = makeInput();
  t.key('keydown', 'ArrowUp');
  t.input.poll();
  const first = t.input.pressed.up;
  t.input.poll();
  check('pressed: true on the poll the key went down, then false while held', first && !t.input.pressed.up && t.input.held.up);
  t.key('keyup', 'ArrowUp');
  t.input.poll();
  t.key('keydown', 'ArrowUp');
  t.input.poll();
  check('pressed: true again after a release', t.input.pressed.up);
}

// Taps on the picture are delivered once
{
  const t = makeInput();
  t.input.point(3, 4);
  t.input.point(160, 100);
  t.input.poll();
  check('points: both taps delivered, in order', t.input.points.length === 2 && t.input.points[0].x === 3 && t.input.points[0].y === 4 && t.input.points[1].x === 160);
  t.input.poll();
  check('points: gone on the next poll', t.input.points.length === 0);
}

// Gamepad: stick thresholds, d-pad, fire buttons
const PAD: [string, [number, number], number | undefined, (keyof Stick)[]][] = [
  ['axis 0.4 right', [0.4, 0], undefined, []],
  ['axis 0.6 right', [0.6, 0], undefined, ['right']],
  ['axis -0.6 left', [-0.6, 0], undefined, ['left']],
  ['axis -0.4 left', [-0.4, 0], undefined, []],
  ['axis 0.6 down', [0, 0.6], undefined, ['down']],
  ['axis 0.4 down', [0, 0.4], undefined, []],
  ['axis -0.6 up', [0, -0.6], undefined, ['up']],
  ['axis -0.4 up', [0, -0.4], undefined, []],
  ['d-pad 12 up', [0, 0], 12, ['up']],
  ['d-pad 13 down', [0, 0], 13, ['down']],
  ['d-pad 14 left', [0, 0], 14, ['left']],
  ['d-pad 15 right', [0, 0], 15, ['right']],
  ['button 0 fire', [0, 0], 0, ['fire']],
  ['button 1 fire', [0, 0], 1, ['fire']],
  ['button 2 nothing', [0, 0], 2, []],
];
for (const [name, axes, button, want] of PAD) {
  const p = makePad();
  p.pad.axes = [...axes];
  if (button !== undefined) p.press(button);
  const t = makeInput(p.source);
  t.input.poll();
  check(`gamepad ${name}`, heldOnly(t.input.held, ...want));
}

// A disconnected pad is ignored, the first connected pad is read
{
  const gone = { connected: false, axes: [1, 0], buttons: [] } satisfies GamepadLike;
  const p = makePad();
  p.press(0);
  const t = makeInput(() => [null, gone, p.pad]);
  t.input.poll();
  check('gamepad: skips empty and disconnected slots', heldOnly(t.input.held, 'fire'));
}

// Gamepad Start is typed once per press, not every poll
{
  const p = makePad();
  const t = makeInput(p.source);
  p.press(9);
  t.input.poll();
  const first = t.input.typed.filter((c) => c === 'PadStart').length;
  t.input.poll();
  const held = t.input.typed.filter((c) => c === 'PadStart').length;
  p.press(9, false);
  t.input.poll();
  p.press(9);
  t.input.poll();
  check('PadStart: typed on press, not while held, typed again on a new press', first === 1 && held === 0 && t.input.typed.includes('PadStart'));
}

finish();
