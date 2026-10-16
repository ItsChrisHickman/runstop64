import type { Input } from './input';
import type { Renderer } from './renderer';

/** What a program uses of the canvas: its pointer events (taps and clicks on the picture). */
export type PointerTarget = Pick<HTMLCanvasElement, 'addEventListener' | 'removeEventListener'>;

/** What the shell hands every program (the loader and each game's `run(host)`). */
export interface Host {
  renderer: Renderer;
  input: Input;
  canvas: PointerTarget;
}
