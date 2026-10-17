/** The random player of the lockstep runs: keys held for a few frames on the keyboard, a Kempston joystick or Sinclair Interface 2, mixed, and contradictory presses. */
import { press, type Spectrum } from '../../../tools/zx/spectrum';
import { KEYBOARD_KEYS, SINCLAIR_KEYS } from '../src/input';
import type { Driver } from './lockstep-core';

const MOVES: readonly (readonly string[])[] = [
  [], [], ['right'], ['right'], ['left'], ['left'], ['jump'], ['right', 'jump'], ['right', 'jump'], ['left', 'jump'], ['left', 'jump'],
  ['up'], ['up'], ['down'], ['down'], ['up', 'right'], ['up', 'left'], ['down', 'right'], ['down', 'left'], ['up', 'jump'],
  ['left', 'right'], ['up', 'down'], ['left', 'right', 'jump'],
];
const DEVICES = ['keyboard', 'keyboard', 'keyboard', 'keyboard', 'keyboard', 'kempston', 'sinclair', 'mixed'] as const;
const KEMPSTON_NAMES = { right: 'KEMPSTON:right', left: 'KEMPSTON:left', down: 'KEMPSTON:down', up: 'KEMPSTON:up', jump: 'KEMPSTON:fire' } as const;

type Direction = 'left' | 'right' | 'up' | 'down' | 'jump';
function isDirection(s: string): s is Direction { return s === 'left' || s === 'right' || s === 'up' || s === 'down' || s === 'jump'; }

export class RandomPlayer implements Driver {
  private left = 0;
  private held: string[] = [];
  constructor(private readonly rnd: () => number) {}

  choose(m: Spectrum): void {
    if (this.left-- > 0) return;
    for (const k of this.held) press(m, k, false);
    this.held = [];
    this.left = 1 + Math.floor(this.rnd() * (this.rnd() < 0.2 ? 30 : 7));
    const move = MOVES[Math.floor(this.rnd() * MOVES.length)];
    const device = DEVICES[Math.floor(this.rnd() * DEVICES.length)];
    for (const name of move) {
      if (!isDirection(name)) continue;
      const use = device === 'mixed' ? (this.rnd() < 0.5 ? 'keyboard' : 'sinclair') : device;
      const key = use === 'keyboard' ? KEYBOARD_KEYS[name] : use === 'sinclair' ? SINCLAIR_KEYS[name] : KEMPSTON_NAMES[name];
      press(m, key, true);
      this.held.push(key);
    }
  }
}

