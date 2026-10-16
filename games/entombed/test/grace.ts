/**
 * Entombed: a moment's grace (games/shared/grace.ts), headless through the front end: continuing from a
 * save a moment before a fight, the same fight twice, once with the grace cleared (he's hurt) and
 * once as the front end leaves it (not once in its 150 frames), then hurt again after it.
 *
 *   nice -n 15 node tools/test.mjs games/entombed/test/grace.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { run } from '../src/main';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { checkFightGrace, type Launch, type Session } from '../../shared/test/grace';
import { packState, unpackState } from 'c64kit';
import { cpu } from '../../shared/native/cpu';
import { NativeHost } from '../../shared/native/host';
import { must } from '../../shared/test/must';
import { port } from '../src/native';
import { entombedMap } from '../src/map';
import { check, finish } from '../../shared/test/check';

stubFetch(fs.readFileSync('games/entombed/assets/entombed-title.state'));

const titleBytes = fs.readFileSync('games/entombed/assets/entombed-title.state');
/** A save in the corridors of floor 1 (the whip in hand), as the autosave keeps one: where the monsters are. */
function corridorSave() {
  const g = new NativeHost(port, unpackState(new Uint8Array(titleBytes)));
  for (let f = 0; f < 200; f++) { g.m.joy1 = g.m.joy2 = f > 50 && f < 60 ? 0x0f : 0x1f; g.tick(); }
  let done = false;
  g.onWait = (site) => {
    if (done || site !== port.mainLoopWait) return;
    done = true; const r = { ...cpu };
    const all = [...Array(256).keys()].map((k) => `${k & 15},${k >> 4}`);
    entombedMap.go(entombedMap.places({ x: 0, y: 0, w: 196, h: 150 }, g.m.ram, { cells: { 1: all } })[0].id, g.m.ram, {});
    g.m.ram[0x322e] = 1; g.m.ram[0x3215] = 2; // (the whip, chosen)
    Object.assign(cpu, r);
  };
  for (let f = 0; f < 5; f++) g.tick();
  return Buffer.from(packState(must(g.save(), 'a save'))).toString('base64');
}

/** Launched with a save: straight back into play (the grace begins). Without: a new game, a few seconds in. */
const launch: Launch = async (save) => {
  useMemoryStorage(save ? new Map([['entombed.save.v1', save]]) : new Map());
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

await checkFightGrace('entombed', launch, check, ['Space', 'KeyX'], 40, corridorSave());

finish();
