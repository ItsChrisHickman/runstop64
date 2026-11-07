/**
 * The random player of the lockstep runs: keys held for a few passes on the device the run's menu chose (keyboard, Kempston or
 * Sinclair), now and then with keys of the other devices too (which the original ignores), and contradictory presses (the original
 * picks up before down before left before right).
 */
import { press, type Spectrum } from '../../../tools/zx/spectrum';
import type { Control } from '../src/input';
import type { Driver } from './lockstep-core';

export type Move = 'left' | 'right' | 'up' | 'down' | 'jump';
const MOVES: readonly (readonly Move[])[] = [
  [], [], ['right'], ['right'], ['left'], ['left'], ['jump'], ['right', 'jump'], ['right', 'jump'], ['left', 'jump'], ['left', 'jump'],
  ['up'], ['up'], ['down'], ['down'], ['up', 'right'], ['up', 'left'], ['down', 'right'], ['down', 'left'], ['up', 'jump'], ['down', 'jump'],
  ['left', 'right'], ['up', 'down'], ['left', 'right', 'jump'],
];
const KEYBOARD: Record<Move, readonly string[]> = { up: ['Q'], down: ['A'], left: ['O'], right: ['P'], jump: ['SPACE', 'SYMBOL', 'M', 'N', 'B'] };
const KEMPSTON: Record<Move, readonly string[]> = { up: ['KEMPSTON:up'], down: ['KEMPSTON:down'], left: ['KEMPSTON:left'], right: ['KEMPSTON:right'], jump: ['KEMPSTON:fire'] };
const SINCLAIR: Record<Move, readonly string[]> = { up: ['4'], down: ['3'], left: ['1'], right: ['2'], jump: ['5'] };
const DEVICES: Record<Control, Record<Move, readonly string[]>> = { 1: KEYBOARD, 2: KEMPSTON, 3: SINCLAIR };

export class RandomPlayer implements Driver {
  private left = 0;
  private held: string[] = [];
  /** `bias`: a move held in half of the choices (a player making for an edge) */
  constructor(private readonly rnd: () => number, private readonly control: Control, private readonly noise = 0.15, private readonly bias: Move | null = null) {}

  choose(m: Spectrum): void {
    if (this.left-- > 0) return;
    for (const k of this.held) press(m, k, false);
    this.held = [];
    this.left = 1 + Math.floor(this.rnd() * (this.rnd() < 0.2 ? 30 : 7));
    const move: readonly Move[] = this.bias !== null && this.rnd() < 0.5 ? (this.rnd() < 0.3 ? [this.bias, 'jump'] : [this.bias]) : (MOVES[Math.floor(this.rnd() * MOVES.length)] ?? []);
    for (const name of move) {
      const keys = DEVICES[this.control][name];
      const key = keys[Math.floor(this.rnd() * keys.length)];
      if (key !== undefined) this.press(m, key);
      if (this.rnd() < this.noise) { // a key of another device held too
        const other = DEVICES[this.control === 1 ? 3 : 1][name][0];
        if (other !== undefined) this.press(m, other);
      }
    }
  }

  private press(m: Spectrum, key: string): void {
    press(m, key, true);
    this.held.push(key);
  }
}
