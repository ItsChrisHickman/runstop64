import { buildWork, isToHdWorker, transfers, type FromHdWorker } from './work';

/**
 * The HD view's room builder, off the main thread (refresher.ts starts it): each piece of work in
 * turn, the room built handed back (its arrays moved, not copied). A frame of the game never waits
 * for it.
 */
addEventListener('message', (e: MessageEvent<unknown>) => {
  const m = e.data;
  if (!isToHdWorker(m)) return;
  try {
    const done = buildWork(m.work), reply: FromHdWorker = { id: m.id, done };
    postMessage(reply, { transfer: transfers(done) });
  } catch (err) {
    const reply: FromHdWorker = { id: m.id, error: err instanceof Error ? err.stack ?? err.message : String(err) };
    postMessage(reply);
  }
});
