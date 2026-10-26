import { isRecord } from '../json';
/** What AyPlayer (main thread) tells the AY worklet (worklet.ts). */
export type ToAyWorklet =
  | { type: 'tune'; data: ArrayBuffer; stepRate: number }
  | { type: 'play'; on: boolean }
  | { type: 'volume'; value: number };

/** What the worklet tells AyPlayer. */
export type FromAyWorklet = { type: 'error'; message: string };


/** Checks a message arriving at the worklet (a MessageEvent's data is untyped). */
export function isToAyWorklet(d: unknown): d is ToAyWorklet {
  if (!isRecord(d)) return false;
  switch (d.type) {
    case 'tune': return d.data instanceof ArrayBuffer && typeof d.stepRate === 'number';
    case 'play': return typeof d.on === 'boolean';
    case 'volume': return typeof d.value === 'number';
    default: return false;
  }
}

/** Checks a message arriving from the worklet. */
export function isFromAyWorklet(d: unknown): d is FromAyWorklet {
  return isRecord(d) && d.type === 'error' && typeof d.message === 'string';
}
