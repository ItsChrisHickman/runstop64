import { isRecord } from '../json';
import { isSfxName, type SfxName } from './sfx';

/** What SidPlayer (main thread) tells the SID worklet (sid-worklet.ts). */
export type ToWorklet =
  | { type: 'load'; data: ArrayBuffer; song?: number }
  | { type: 'song'; song: number }
  | { type: 'stop' }
  | { type: 'volume'; value: number }
  | { type: 'call'; addr: number; a?: number; x?: number; y?: number }
  | { type: 'stream' }
  | { type: 'frame'; writes: Uint32Array }
  | { type: 'sfx'; name: SfxName };

/** What the worklet tells SidPlayer. */
export type FromWorklet = { type: 'error'; message: string };

const isOptNumber = (v: unknown) => v === undefined || typeof v === 'number';

/** Checks a message arriving at the worklet (a MessageEvent's data is untyped). */
export function isToWorklet(d: unknown): d is ToWorklet {
  if (!isRecord(d)) return false;
  switch (d.type) {
    case 'load': return d.data instanceof ArrayBuffer && isOptNumber(d.song);
    case 'song': return typeof d.song === 'number';
    case 'stop': case 'stream': return true;
    case 'volume': return typeof d.value === 'number';
    case 'call': return typeof d.addr === 'number' && isOptNumber(d.a) && isOptNumber(d.x) && isOptNumber(d.y);
    case 'frame': return d.writes instanceof Uint32Array;
    case 'sfx': return isSfxName(d.name);
    default: return false;
  }
}

/** Checks a message arriving from the worklet. */
export function isFromWorklet(d: unknown): d is FromWorklet {
  return isRecord(d) && d.type === 'error' && typeof d.message === 'string';
}
