import workerUrl from './worker.ts?worker&url';
import { isFromHdWorker, type HdWork, type HdWorked, type ToHdWorker } from './work';
import type { HdRefresher } from './scene';

/**
 * Rooms built off the main thread, by a worker (worker.ts), for HdRooms; null where there's no
 * worker to be had (then they're built on the main thread, as before). Each piece of work is
 * answered in turn; a worker that fails fails what's waiting (HdRooms then builds them itself).
 */
export function hdRefresher(): HdRefresher | null {
  if (typeof Worker === 'undefined' || !workerUrl) return null;
  let worker: Worker;
  // (Vite bundles it as one classic script, `?worker&url`, as it does the SID's worklet)
  try { worker = new Worker(workerUrl); } catch { return null; }
  const waiting = new Map<number, { resolve(d: HdWorked): void; reject(e: Error): void }>();
  let next = 0;
  const failAll = (why: string) => { for (const w of waiting.values()) w.reject(new Error(why)); waiting.clear(); };
  worker.addEventListener('message', (e: MessageEvent<unknown>) => {
    const m = e.data;
    if (!isFromHdWorker(m)) { failAll('a message from the HD view\'s worker that isn\'t one'); return; }
    const w = waiting.get(m.id);
    waiting.delete(m.id);
    if ('error' in m) w?.reject(new Error(m.error)); else w?.resolve(m.done);
  });
  worker.addEventListener('error', (e) => failAll(`the HD view's worker failed: ${e.message}`));
  return {
    post(work: HdWork) {
      const id = next++, message: ToHdWorker = { id, work };
      return new Promise<HdWorked>((resolve, reject) => {
        waiting.set(id, { resolve, reject });
        worker.postMessage(message);
      });
    },
  };
}
