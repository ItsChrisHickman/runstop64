/**
 * Playing a chamber, for the hint finder (find.ts) and its checks (check.ts): the inputs, a
 * frame of play, and replaying a path of inputs from a chamber's state exactly as it was found.
 */
import type { MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../../shared/native/host';
import { port } from '../../src/native';

export const CORRIDORS = 0x60f8; // the corridors' block's first jump (else he's in a chamber)

/** Joystick (port bits, low = pressed) and the action fire uses ($3215: 1 jump, 2 whip, 3 torch). */
export interface Input { name: string; joy: number; action: number }
const DIRS: [string, number][] = [['', 0x1f], ['left', 0x1b], ['right', 0x17], ['up', 0x1e], ['down', 0x1d], ['up+left', 0x1a], ['up+right', 0x16], ['down+left', 0x19], ['down+right', 0x15]];
export const INPUTS: Input[] = [
  ...DIRS.map(([name, joy]) => ({ name: name || 'none', joy, action: 0 })),
  ...(['jump', 'whip', 'torch'] as const).flatMap((act, i) => DIRS.slice(0, 5).map(([d, joy]) => ({ name: d ? `${act}+${d}` : act, joy: joy & 0x0f, action: i + 1 }))),
];

/** Air and ankhs topped up (so exploring never ends in losing). */
export const keep = (g: NativeHost) => { g.m.ram[0x37f6] = 0; g.m.ram[0x323d] = 0; };
/**
 * Where Pendragon is in the chamber: x is $3212/$3213, his sprite's x as if the chamber hadn't
 * scrolled (the wider chambers scroll a little when he walks near an edge), y his sprite's y.
 */
export const where = (g: NativeHost) => ({ x: g.m.ram[0x3212] | (g.m.ram[0x3213] << 8), y: g.m.ram[0x3220] });
/** On the screen (unscrolled), in the picture's pixels: where he stands (his sprite is 24 wide, 42 high: the middle of its lower half). */
export const onScreen = (p: { x: number; y: number }): [number, number] => [p.x - 24 + 12, p.y - 50 + 32];

/** One frame with an input (choosing its action as the input starts, as the action keys do). */
export function step(g: NativeHost, input: Input, first: boolean) {
  if (first && input.action) g.m.ram[0x3215] = input.action;
  g.m.joy1 = g.m.joy2 = input.joy;
  g.tick();
  keep(g);
}

/** Replay a path ([input, frames]...) from a state; `each` sees every frame (after it). */
export function replay(state: MachineState, path: [number, number][], each?: (g: NativeHost) => void) {
  const g = NativeHost.resume(port, state);
  for (const [i, n] of path) for (let f = 0; f < n; f++) { step(g, INPUTS[i], f === 0); each?.(g); }
  return g;
}
