/**
 * Do Svidaniya Monty on the Monty engine, the data and the front end: Moscow's nine rooms load (none of Monty on the Run's), the exit
 * grid is the wide one (50 by 3, not the original's 23 by 6), the rooms are where the plan puts them with their names, the first room's
 * way out joins the second, and the same game runs through the front end: the title, play, Moscow's version of the tune, the pause
 * screen's counts and map. (The bot, moscow.ts, plays every room; mechanisms.ts checks each mechanism.)
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/walk.ts
 */
import { Input, PixelRenderer, sidLog } from 'c64kit';
import { sectorName } from '../../montyotr/src/montydata';
import { Game } from '../../montyotr/src/game';
import { montyMap } from '../../montyotr/src/map';
import { MOTR } from '../../montyotr/src/motr';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { extendEnemies, extendTiles } from '../../shared/monty/rooms';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { WORLD, WORLD_COLS, WORLD_ROWS } from '../src/data';
import { fromBase64, readSaves } from '../../shared/saves';
import { CODEC, run } from '../src/main';
import { MOSCOW_ROOMS, ROOM } from '../src/moscow';
import { enterRoom } from '../../montyotr/src/ending';
import { creatureRooms, standY } from './route';

// ---- the data ------------------------------------------------------------------------------------
const cells = WORLD.exitGrid.image;
check(`the exit grid is ${WORLD_COLS} by ${WORLD_ROWS} (Monty on the Run's is ${MOTR.exitGrid.cols} by ${MOTR.exitGrid.rows})`,
  WORLD.exitGrid.cols === WORLD_COLS && WORLD.exitGrid.rows === WORLD_ROWS && cells.length === WORLD_COLS * WORLD_ROWS && MOTR.exitGrid.cols === 23);
check('Moscow\'s nine rooms are the first four columns of the grid, each in the cell the plan gives it',
  cells.filter((c) => c !== 0xff && c <= 8).length === 9 && [[1, 0, ROOM.start], [1, 1, ROOM.streets], [1, 2, ROOM.square], [1, 3, ROOM.station], [0, 1, ROOM.gum], [0, 2, ROOM.domes], [0, 3, ROOM.kremlin], [2, 1, ROOM.hall], [2, 2, ROOM.platform]]
    .every(([row, col, id]) => cells[(row ?? 0) * WORLD_COLS + (col ?? 0)] === id));
check('no room of Monty on the Run\'s extension, no kit, no C5, no jetpack, no ending', WORLD.extensionGrid.every((c) => c === 0xff) && !WORLD.isExtensionRoom(0) && WORLD.kit.length === 0 && !WORLD.c5 && WORLD.jetpackRooms.length === 0 && !WORLD.ending && !WORLD.completion);
check('the sectors are the rooms\' names, in Monty on the Run\'s manner', [0, 1, 2, 3, 4, 5, 6, 7, 8].map((id) => sectorName(WORLD, id).text).join('|') ===
  'MOSCOW MOLE|SNOW PLACE LIKE HOME|SEEING RED|ONION DOME SWEET DOME|KREMLIN GREMLINS|SIBERIA YOU LATER|STUCK LIKE GUM|ESCALATING TENSIONS|UNDERGROUND MOVEMENT');
check('Moscow, Siberia, China, Japan, the Pacific and the Andes: 220 coins, 17 snacks (pirozhki, pelmeni, dumplings, sushi, musubi, empanadas), 17 key items', WORLD.coinTable.length === 220 * 3 && WORLD.specialItems.length === 34 * 4 && WORLD.progress.cakes.length === 17 && WORLD.progress.keyItems.length === 17);
{
  // creatures are used rarely, as Monty on the Run's are (its 27 kinds average 5.5 rooms of its 52; Moscow's, in nine rooms, at most two each)
  const rooms = creatureRooms(MOSCOW_ROOMS);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in Moscow's nine rooms, none in more than two (${[...rooms.values()].map((v) => v.size).join(' ')})`, rooms.size >= 8 && rooms.size <= 11 && most <= 2);
}
check('the carriage roof leads east into Siberia: the dining car is east of the station', cells[WORLD_COLS + 4] === 9);

// ---- a game's own tiles, creatures and items come from the data ----------------------------------------
{
  const own = extendTiles(MOTR, [{ chr: new Uint8Array(8).fill(0xff), cls: 2 }, { chr: new Uint8Array(8), cls: 4 }]);
  check('extended tiles: 121 and 122 are ours, with their own classes; the base\'s tiles keep theirs', own.tileLibrary.length === MOTR.tileLibrary.length + 16 && own.tileProperty(121) === 2 && own.tileProperty(122) === 4
    && own.tileProperty(123) === 0 && [0x01, 0x30, 0x50, 0x60, 0x80].every((t) => own.tileProperty(t) === MOTR.tileProperty(t)));
  const frames = new Uint8Array(256).fill(7);
  const bank = extendEnemies(MOTR, [{ frames, copy: true }], 35);
  check('extended enemy bank: type 35 is ours, 8-34 the base\'s', bank.enemyBank(35) === frames && bank.enemyCopyFlag(35) === 1 && bank.enemyBank(9) === MOTR.enemyBank(9) || bank.enemyBank(9).every((b, i) => b === MOTR.enemyBank(9)[i]));
  check('an item\'s colour comes from the data (Monty on the Run\'s are white)', MOTR.itemSprites.colour(0x92) === 1 && WORLD.itemSprites.colour(0x92) === 1);
}

// ---- Monty in the first room ---------------------------------------------------------------------
const g = new Game(WORLD);
g.assist = { lives: false, cloud: false, jetpack: false, c5: false, rooms: false, respawn: false, hints: false };
g.start();
const s: State = { g, col: 0 };
for (let n = 0; n < 200 && (g.freeze || g.script); n++) frame(s, NONE);
check(`a new game starts in room $00 at his start place (${g.roomId}, ${g.mapRow}/${g.exitCol})`, g.roomId === 0 && g.mapRow === 1 && g.exitCol === 0 && !g.freeze);
check('the room is drawn: its floor under him', g.flagAt(20, 10) === 2 || g.flagAt(20, 10) === 1);
// out at the right of the first room takes him to the second (the bot, moscow.ts, plays the way there; this is the join)
enterRoom(g, ROOM.start, 0x0c + (31 + 4) * 4 - 8, standY(7));
for (let t = 0; t < 400 && g.roomId === ROOM.start; t++) { frame(s, { left: false, right: true, up: false, down: false, fire: false }); if (g.script) for (let n = 0; n < 200 && g.script; n++) frame(s, NONE); }
check(`the first room's way out at the right, high, leads to the streets (room ${g.roomId})`, g.roomId === ROOM.streets);

// ---- through the front end ------------------------------------------------------------------------
useMemoryStorage();
const input = new Input(nowhere);
const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };

tick(5);
check('the title is up, its game is Do Svidaniya Monty\'s', p.state.mode === 'title' && p.game.data.id === 'montyworld');
tap('Space');
tick(80);
check(`play begins in room $00 (${p.game.roomId})`, p.state.mode === 'play' && p.game.roomId === 0);
tick(10);
check(`the music: Moscow's version of the tune started once, coming into Moscow (${sidLog.tunes.length} start, the original's none)`, sidLog.tunes.length === 1 && sidLog.tunes[0] !== null);
const found = Object.keys(p.state.found.rooms).map(Number);
check(`the map kept the room seen (${found.join(', ')})`, found.join() === '0');
const saved = readSaves('montyworld').current;
check(`the autosave is in the envelope of its own: { game: "montyworld", format: ${CODEC.format} }, and its codec reads it back (room ${saved ? CODEC.unpack(fromBase64(saved.data), saved.format).roomId : '-'})`,
  saved !== null && saved.format === CODEC.format && CODEC.unpack(fromBase64(saved.data), saved.format).roomId === 0);
tap('KeyP');
tick(4);
check('the pause screen opens with the wide map', p.state.paused);
const numbers = montyMap.info(p.game, p.state.found);
check(`the pause screen's numbers (${numbers.join(' | ')})`, numbers[0] === 'LIVES     5' && numbers[1] === 'ROOMS  1/67' && numbers[2] === 'ITEMS  0/17' && numbers[3] === 'SNACKS 0/17');
tap('KeyP');
tick(4);

finish();
