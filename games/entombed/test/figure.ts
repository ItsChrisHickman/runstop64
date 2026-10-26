/**
 * Entombed's Pendragon as Dragonskulle draws him in ENHANCED (src/figure.ts, shared/pendragon/figure.ts): every picture of him over a
 * scripted run of every pose (walk, jump, whip), his feet where the original's were, the game's state the same with the swap on or
 * off, and through the front end ENHANCED has the new figure and ORIGINAL the game's own.
 *
 *   nice -n 15 node tools/test.mjs games/entombed/test/figure.ts
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from 'c64kit';
import { cpu } from '../../shared/native/cpu';
import { NativeHost } from '../../shared/native/host';
import { must } from '../../shared/test/must';
import { entombedMap } from '../src/map';
import { port } from '../src/native';
import { GAMES } from '../../shared/native/test/games';
import { stubFetch } from '../../shared/test/browser';
import { finish } from '../../shared/test/check';
import { checkFigure, checkFigureGate, type FigureGame } from '../../shared/test/figure-kit';
import { entombedFigure } from '../src/figure';
import { run } from '../src/main';

const game = GAMES.entombed;
stubFetch(fs.readFileSync(game.title));
const keep = (r: Uint8Array) => { r[0x37f6] = 0; r[0x323e] = 0; r[0x323d] = 0; r[0x322e] = 1; r[0x322f] = 1; };

/** Corridor places of a floor, from the start of a game (the map's travel, as the pause screen does it). */
function corridors(): MachineState[] {
  const out: MachineState[] = [];
  for (const [floor, pick] of [[1, 0], [1, 9], [3, 4], [5, 2]]) {
    const g = new NativeHost(port, unpackState(new Uint8Array(fs.readFileSync(game.title))));
    for (let f = 0; f < 200; f++) { g.m.joy1 = g.m.joy2 = f > 50 && f < 60 ? 0x0f : 0x1f; g.tick(); }
    let done = false;
    g.onWait = (site) => {
      if (done || site !== port.mainLoopWait) return;
      done = true; const r = { ...cpu };
      const cells = [...Array(256).keys()].map((k) => `${k & 15},${k >> 4}`);
      const places = entombedMap.places({ x: 0, y: 0, w: 196, h: 150 }, g.m.ram, entombedMap.found.parse({ cells: { [floor]: cells } }));
      entombedMap.go(must(places[pick % places.length], 'a place').id, g.m.ram, entombedMap.found.empty());
      Object.assign(cpu, r);
    };
    for (let f = 0; f < 5; f++) g.tick();
    out.push(must(g.save(), 'a save'));
  }
  return out;
}
const figure: FigureGame = {
  id: 'entombed', game, spec: entombedFigure, actions: { addr: 0x3215, values: [1, 2, 3] }, keep,
  states: corridors,
  run,
};
checkFigure(figure);
await checkFigureGate(figure);
finish();
