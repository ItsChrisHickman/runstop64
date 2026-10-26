/**
 * Blackwyche's Pendragon as Dragonskulle draws him in ENHANCED (src/figure.ts, shared/pendragon/figure.ts): every picture of him over a
 * scripted run of every pose (walk, jump, sword), his feet where the original's were, the game's state the same with the swap on or
 * off, and through the front end ENHANCED has the green tunic and ORIGINAL the game's grey.
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/figure.ts
 */
import fs from 'node:fs';
import { GAMES } from '../../shared/native/test/games';
import { stubFetch } from '../../shared/test/browser';
import { finish } from '../../shared/test/check';
import { checkFigure, checkFigureGate, routeStates, type FigureGame } from '../../shared/test/figure-kit';
import { blackwycheFigure } from '../src/figure';
import { run } from '../src/main';

const game = GAMES.blackwyche;
stubFetch(fs.readFileSync(game.title));
const keep = (ram: Uint8Array) => { ram[0x9d77] = 100; ram[0x342b] = 1; };
const figure: FigureGame = {
  id: 'blackwyche', game, spec: blackwycheFigure, actions: { addr: 0x3415, values: [1, 2] }, keep,
  states: () => routeStates(game, 'blackwyche', keep, 1500, 3), run,
};
checkFigure(figure);
await checkFigureGate(figure);
finish();
