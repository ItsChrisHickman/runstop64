/**
 * Karnath's Pendragon as Dragonskulle draws him in ENHANCED (src/figure.ts, shared/pendragon/figure.ts): every picture of him over a
 * scripted run of every pose (walk, the spells), his feet where the original's were, the game's state the same with the swap on or
 * off, and through the front end ENHANCED has the new figure and ORIGINAL the game's own.
 *
 *   nice -n 15 node tools/test.mjs games/karnath/test/figure.ts
 */
import fs from 'node:fs';
import { unpackState } from 'c64kit';
import { GAMES } from '../../shared/native/test/games';
import { stubFetch } from '../../shared/test/browser';
import { finish } from '../../shared/test/check';
import { checkFigure, checkFigureGate, type FigureGame } from '../../shared/test/figure-kit';
import { NativeHost } from '../../shared/native/host';
import { must } from '../../shared/test/must';
import { karnathFigure } from '../src/figure';
import { run } from '../src/main';

const game = GAMES.karnath;
stubFetch(fs.readFileSync(game.title));
const abode = unpackState(new Uint8Array(fs.readFileSync('games/karnath/test/fixtures/abode-obelisk.state')));
const keep = (ram: Uint8Array) => { ram[0x6ffe] = 100; ram[0x322e] = 0; };

/** The abode fixture, a few seconds on, so the save is at the game's main loop. */
function states() {
  const g = NativeHost.resume(game.port, abode);
  g.tick(); g.tick();
  return [must(g.save(), 'a save')];
}
const figure: FigureGame = { id: 'karnath', game, spec: karnathFigure, actions: { addr: 0x322c, values: [1, 3, 5] }, keep, states, run };
checkFigure(figure);
await checkFigureGate(figure);
finish();
