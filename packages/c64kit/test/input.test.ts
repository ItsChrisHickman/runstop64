/**
 * Input (src/input.ts), headless: system shortcuts (Cmd held: screenshots, window switching)
 * reach no game, and keys let go while Cmd was down don't stay held.
 *
 *   node tools/test.mjs packages/c64kit/test/input.test.ts
 */
import { Input, type KeyEventLike, type KeyTarget } from '../src/input';
import { check, finish } from '../../../games/shared/test/check';

type Listener = (e: KeyEventLike) => void;
const listeners = new Map<string, Listener[]>();
const target: KeyTarget = {
  addEventListener(type: string, fn: Listener) { listeners.set(type, [...(listeners.get(type) ?? []), fn]); },
};
const fire = (type: 'keydown' | 'keyup', code: string, meta = false) => {
  const e: KeyEventLike = { code, repeat: false, metaKey: meta, preventDefault() {} };
  for (const fn of listeners.get(type) ?? []) fn(e);
};

const input = new Input(target);
const gamepads = () => [];
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: gamepads }, configurable: true });

// Cmd, Shift, Ctrl, 4 (the macOS screenshot): nothing typed, nothing held
fire('keydown', 'MetaLeft', true);
fire('keydown', 'ShiftLeft', true);
fire('keydown', 'ControlLeft', true);
fire('keydown', 'Digit4', true);
input.poll();
check('Cmd+Shift+Ctrl+4: no key typed', input.typed.length === 0);
check('Cmd+Shift+Ctrl+4: no fire held', !input.held.fire && input.down.size === 0);
fire('keyup', 'MetaLeft');
input.poll();
check('after Cmd is let go: nothing held (macOS sends no other releases)', input.down.size === 0 && !input.held.fire);

// Ctrl first, then Cmd in the same frame: the Ctrl isn't seen either
fire('keydown', 'ControlLeft');
fire('keydown', 'MetaLeft', true);
input.poll();
check('Ctrl then Cmd in one frame: no fire', input.typed.length === 0 && !input.held.fire);
fire('keyup', 'MetaLeft');

// ordinary keys still work, Ctrl alone included (a fire key in some games)
input.poll();
fire('keydown', 'Space');
input.poll();
check('Space alone: typed and fire held', input.typed.includes('Space') && input.held.fire);
fire('keyup', 'Space');
fire('keydown', 'ControlLeft');
input.poll();
check('Ctrl alone: typed', input.typed.includes('ControlLeft'));

finish();
