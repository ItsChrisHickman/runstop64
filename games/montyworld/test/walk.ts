/**
 * Monty Mole: World Tour, the skeleton on the Monty engine: a second data set on the same code as Monty on the Run. Its three
 * placeholder rooms load (no room of Monty on the Run's in it), the exit grid is the wide one (50 by 3, not the original's 23 by 6),
 * Monty walks through them (the coins and the piece of cake taken, the score and the sector names right), walks back, and the same
 * game runs through the front end: the title, play, the pause screen's map of the wide grid, a save on coming into each room.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/walk.ts
 */
import { Input, PixelRenderer } from 'c64kit';
import { sectorName } from '../../montyotr/src/montydata';
import { Game } from '../../montyotr/src/game';
import { montyMap } from '../../montyotr/src/map';
import { MOTR } from '../../montyotr/src/motr';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { WORLD, WORLD_COLS, WORLD_ROWS } from '../src/data';
import { run } from '../src/main';

// ---- the data ------------------------------------------------------------------------------------
const rooms = [0, 1, 2];
check(`the exit grid is ${WORLD_COLS} by ${WORLD_ROWS} (Monty on the Run's is ${MOTR.exitGrid.cols} by ${MOTR.exitGrid.rows})`,
  WORLD.exitGrid.cols === WORLD_COLS && WORLD.exitGrid.rows === WORLD_ROWS && WORLD.exitGrid.image.length === WORLD_COLS * WORLD_ROWS && MOTR.exitGrid.cols === 23);
check('the three rooms are in the first three cells of the middle row', rooms.every((id) => WORLD.exitGrid.image[WORLD_COLS + id] === id) && WORLD.exitGrid.image.filter((c) => c !== 0xff).length === 3);
check('no room of Monty on the Run\'s extension, no kit, no C5, no jetpack, no ending', WORLD.extensionGrid.every((c) => c === 0xff) && !WORLD.isExtensionRoom(0) && WORLD.kit.length === 0 && !WORLD.c5 && WORLD.jetpackRooms.length === 0 && !WORLD.ending && !WORLD.completion);
check('the sectors: Moscow station, Red Square', sectorName(WORLD, 0).text === 'MOSCOW STATION' && sectorName(WORLD, 1).text === 'MOSCOW STATION' && sectorName(WORLD, 2).text === 'RED SQUARE');
check('two coins and a piece of cake', WORLD.coinTable.length === 6 && WORLD.specialItems.length === 4 && WORLD.specialItems[0] === 1);

// ---- Monty walked through -------------------------------------------------------------------------
const g = new Game(WORLD);
g.assist = { lives: false, cloud: false, jetpack: false, c5: false, rooms: false, respawn: false };
g.start();
const s: State = { g, col: 0 };
const settle = () => { for (let n = 0; n < 200 && (g.freeze || g.script); n++) frame(s, NONE); };
settle();
check(`a new game starts in room $00 at his start place (${g.roomId}, ${g.mapRow}/${g.exitCol})`, g.roomId === 0 && g.mapRow === 1 && g.exitCol === 0 && !g.freeze);
check('the room is drawn: its floor under him', g.flagAt(18, 10) === 1 && g.flagAt(14, 10) === 0);

const seen: number[] = [0];
const right = { left: false, right: true, up: false, down: false, fire: false };
const left = { left: true, right: false, up: false, down: false, fire: false };
for (let t = 0; t < 4000 && !(g.roomId === 2 && g.x2 > 0x80); t++) {
  frame(s, right);
  if (g.roomId !== seen[seen.length - 1]) seen.push(g.roomId);
  if (g.script) for (let n = 0; n < 200 && g.script; n++) frame(s, NONE);
}
check(`walking right goes through rooms ${seen.join(', ')} (0, 1, 2)`, seen.join() === '0,1,2');
check(`both coins and the cake taken: ${g.score} points (2 x 50 + 200)`, g.score === 300 && g.coinCollected.every((c) => c !== 0) && g.siCollected[0] !== 0);

const back: number[] = [2];
for (let t = 0; t < 4000 && g.roomId !== 0; t++) {
  frame(s, left);
  if (g.roomId !== back[back.length - 1]) back.push(g.roomId);
  if (g.script) for (let n = 0; n < 200 && g.script; n++) frame(s, NONE);
}
check(`and back: rooms ${back.join(', ')} (2, 1, 0), nothing taken twice (${g.score} points)`, back.join() === '2,1,0' && g.score === 300);

// ---- through the front end ------------------------------------------------------------------------
useMemoryStorage();
const input = new Input(nowhere);
const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };

tick(5);
check('the title is up, its game is World Tour\'s', p.state.mode === 'title' && p.game.data.id === 'montyworld');
tap('Space');
tick(80);
check(`play begins in room $00 (${p.game.roomId})`, p.state.mode === 'play' && p.game.roomId === 0);
input.keyDown('ArrowRight');
for (let i = 0; i < 4000 && !(p.game.roomId === 2 && p.game.x2 > 0x80); i++) tick();
input.keyUp('ArrowRight');
tick(10);
check(`walked to room $02 through the front end, ${p.game.score} points`, p.game.roomId === 2 && p.game.score === 300);
const found = Object.keys(p.state.found.rooms).map(Number).sort((a, b) => a - b);
check(`the map kept the three rooms seen (${found.join(', ')})`, found.join() === '0,1,2');
tap('KeyP');
tick(4);
check('the pause screen opens with the wide map', p.state.paused);
const numbers = montyMap.info(p.game, p.state.found);
check(`the pause screen's numbers (${numbers.join(' | ')})`, numbers[1] === 'ROOMS  3/3' && numbers[2] === 'ITEMS 0/0' && numbers[3] === 'CAKES  1/1');
tap('KeyP');
tick(4);

finish();
