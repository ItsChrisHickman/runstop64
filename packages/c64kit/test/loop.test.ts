/**
 * The fixed-tick loop and Smoothed (src/loop.ts), headless, on a clock the test winds: a 50 Hz tick whatever the frame rate,
 * long gaps clamped, the render alpha between ticks, stopping; and the smoothed position of a figure that moves in ticks.
 *
 *   node tools/test.mjs packages/c64kit/test/loop.test.ts
 */
import { FixedLoop, Smoothed, type LoopClock } from '../src/loop';
import { check, finish } from '../../../games/shared/test/check';

/** A loop on a wound clock: `frame(ms)` moves time on and runs the frame the loop asked for. */
function makeLoop(hz?: number) {
  let time = 5000, next = 1;
  const pending = new Map<number, (now: number) => void>();
  const cancelled: number[] = [];
  const clock: LoopClock = {
    now: () => time,
    request: (cb) => { pending.set(next, cb); return next++; },
    cancel: (id) => { cancelled.push(id); pending.delete(id); },
  };
  const ticks: number[] = [], alphas: number[] = [];
  const loop = new FixedLoop({ tick: () => ticks.push(time), render: (a) => alphas.push(a) }, hz, clock);
  return {
    loop, ticks, alphas, cancelled, pending,
    /** Runs the frame the loop is waiting on, `ms` later. */
    frame(ms: number) {
      time += ms;
      const [id, cb] = [...pending][0] ?? [];
      if (id === undefined || !cb) return;
      pending.delete(id);
      cb(time);
    },
  };
}

{
  const t = makeLoop();
  check('a 50 Hz loop steps every 20 ms', t.loop.step === 20);
  t.loop.start();
  t.loop.start();
  check('starting twice asks for one frame', t.pending.size === 1);
  t.frame(100);
  check('a 100 ms frame is 5 ticks, drawn with no part-tick left', t.ticks.length === 5 && t.alphas.at(-1) === 0);
  t.frame(10);
  check('a 10 ms frame is no tick, drawn half way to the next', t.ticks.length === 5 && Math.abs((t.alphas.at(-1) ?? -1) - 0.5) < 1e-9);
  t.frame(10);
  check('the next 10 ms completes the tick', t.ticks.length === 6 && Math.abs(t.alphas.at(-1) ?? -1) < 1e-9);
  check('one render per frame', t.alphas.length === 3);
}

{
  const t = makeLoop();
  t.loop.start();
  t.frame(10000);
  check(`a 10 s gap (a hidden tab) is clamped to 250 ms: ${t.ticks.length} ticks, not 500`, t.ticks.length === 12 && Math.abs((t.alphas.at(-1) ?? -1) - 0.5) < 1e-9);
}

{
  const t = makeLoop();
  t.loop.start();
  for (let i = 0; i < 200; i++) t.frame(1 + ((i * 7) % 37));
  check('the render alpha is always in [0, 1)', t.alphas.every((a) => a >= 0 && a < 1));
  const total = t.ticks.length;
  const elapsed = Array.from({ length: 200 }, (_, i) => 1 + ((i * 7) % 37)).reduce((a, b) => a + b, 0);
  check(`ticks keep pace with time (${total} ticks in ${elapsed} ms)`, Math.abs(total - elapsed / 20) < 1);
}

{
  const t = makeLoop(25);
  t.loop.start();
  t.frame(100);
  check('a 25 Hz loop steps every 40 ms', t.loop.step === 40 && t.ticks.length === 2);
}

{
  const t = makeLoop();
  t.loop.start();
  t.frame(20);
  const waiting = [...t.pending.keys()][0];
  const cb = t.pending.get(waiting);
  t.loop.stop();
  check('stop cancels the frame it was waiting on', t.cancelled.join() === String(waiting) && t.pending.size === 0);
  cb?.(1000);
  check('a frame that still arrives after stop does nothing', t.ticks.length === 1 && t.alphas.length === 1 && t.pending.size === 0);
  t.loop.start();
  check('and it can start again', t.pending.size === 1);
}

{
  const s = new Smoothed();
  s.reset(40, 90);
  check('reset: every alpha is the reset position, with no glide', [0, 0.5, 1].every((a) => s.at(a).x === 40 && s.at(a).y === 90));
  s.push(50, 80);
  check('push: x glides between the averages of consecutive ticks, y is the latest at once', s.at(0).x === 40 && s.at(0.5).x === 42.5 && s.at(1).x === 45 && s.at(0.5).y === 80);
  s.push(60, 70);
  check('push again: the glide follows, y still the latest', s.at(0).x === 45 && s.at(0.5).x === 50 && s.at(1).x === 55 && s.at(0).y === 70);
  const snap = s.at(0.5, true);
  check('snap: the latest tick position', snap.x === 60 && snap.y === 70);
  s.reset(200, 10);
  check('reset after a teleport: no glide from the old place', s.at(0.5).x === 200 && s.at(0.5).y === 10);
}

finish();
