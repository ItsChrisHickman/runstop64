/**
 * Blackwyche: a moment's grace (games/shared/grace.ts), headless through the front end: continuing from a
 * save a moment before a fight, the same fight twice, once with the grace cleared (he's hurt) and
 * once as the front end leaves it (not once in its 150 frames), then hurt again after it.
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/grace.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { run } from '../src/main';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { checkFightGrace, type Launch, type Session } from '../../shared/test/grace';
import { check, finish } from '../../shared/test/check';

stubFetch(fs.readFileSync('games/blackwyche/assets/blackwyche-title.state'));

/** Launched with a save: straight back into play (the grace begins). Without: a new game, a few seconds in. */
const launch: Launch = async (save) => {
  useMemoryStorage(save ? new Map([['blackwyche.save.v1', save]]) : new Map());
  const input = new Input(nowhere);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 0));
  const s: Session = {
    p, input,
    tick(n = 1) { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } },
    press(code: string) { input.keyDown(code); s.tick(3); input.keyUp(code); s.tick(3); },
  };
  if (save) { for (let i = 0; i < 900 && !p.state.playing; i++) s.tick(1); return s; }
  s.tick(80); s.press('Space'); s.tick(300);
  return s;
};

await checkFightGrace('blackwyche', launch, check, ['Space', 'KeyX']);

finish();
