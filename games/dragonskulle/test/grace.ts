/**
 * Dragonskulle: a moment's grace (games/shared/grace.ts), headless through the front end: continuing from a
 * save a moment before a fight, the same fight twice, once with the grace cleared (he's hurt) and
 * once as the front end leaves it (not once in its 150 frames), then hurt again after it.
 *
 *   nice -n 15 node tools/test.mjs games/dragonskulle/test/grace.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { packState, unpackState } from 'c64kit';
import { NativeHost } from '../../shared/native/host';
import { must } from '../../shared/test/must';
import { port } from '../src/native';
import { run } from '../src/main';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { continueFromTitle } from '../../shared/test/continue-from-title';
import { checkFightFrom, type Launch, type Session } from '../../shared/test/grace';
import { readRoute } from '../../shared/test/data';
import { check, finish } from '../../shared/test/check';

const titleBytes = fs.readFileSync('games/dragonskulle/assets/dragonskulle-title.state');
stubFetch(titleBytes);

/** A save from about 50 frames before the first hurt along a recorded route through the caves (walked, kept alive as it was found). */
function cavesSave() {
  const route = readRoute('games/dragonskulle/re/routes.json');
  const g = new NativeHost(port, unpackState(new Uint8Array(titleBytes)));
  const taken: string[] = [];
  let frame = 0;
  for (let i = 0; i < route.length; i += 2) for (let k = 0; k < route[i + 1]; k++) {
    const v = route[i];
    g.m.joy1 = g.m.joy2 = v & 0x1f; g.m.keys = v & 32 ? [[1, 2]] : [];
    g.tick(); frame++;
    const r = g.m.ram;
    if (frame > 300 && (r[0x123e] < 0x14 || r[0x3432] !== 0 || r[0x1248] !== 0)) return must(taken[0], 'a save before a hurt');
    if (frame % 10 === 0 && g.lastWait === port.mainLoopWait) { const st = g.save(); if (st) { taken.push(Buffer.from(packState(st)).toString('base64')); if (taken.length > 5) taken.shift(); } }
  }
  throw new Error('no hurt along the route');
}

/** Launched with a save: the title, ENTER CONTINUE and Enter, back into play (the grace begins). Without: a new game, a few seconds in. */
const launch: Launch = async (save) => {
  useMemoryStorage(save ? new Map([['dragonskulle.save.v1', save]]) : new Map());
  const input = new Input(nowhere);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  await new Promise((r) => setTimeout(r, 0));
  const s: Session = {
    p, input,
    tick(n = 1) { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } },
    press(code: string) { input.keyDown(code); s.tick(3); input.keyUp(code); s.tick(3); },
  };
  if (save) { continueFromTitle(p, input, s.tick); return s; }
  s.tick(80); s.press('Space'); s.tick(300);
  return s;
};

await checkFightFrom('dragonskulle', launch, check, ['Space', 'KeyX'], cavesSave());

finish();
