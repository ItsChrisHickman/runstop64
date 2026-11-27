#!/usr/bin/env node
// A new Monty game on the kit (skill: .claude/skills/new-monty-game):
//
//   node tools/new-game.mjs <id> "<Title>"
//
// writes the smallest game that typechecks and boots on Monty on the Run's engine:
//   games/<id>/src/start.ts    the first region: its room ids, names, map colours, one room in the house format (montyworld's layout.ts `room()`)
//   games/<id>/src/data.ts     the game's MontyData value (rooms through buildRooms, Do Svidaniya Monty's art after Monty on the Run's, every mechanism list empty)
//   games/<id>/src/main.ts     run(host) = runMonty(host, data, { codec }), its own save codec
//   games/<id>/src/info.ts     the info sheet (credits to fill in)
//   games/<id>/test/walk.ts    the data, a new game in its first room, the front end (title, play, autosave, pause)
// and adds an entry to games/registry.ts (listed: false until Chris has played it), the walk test to tools/tests.mjs, and
// docs/<id>-feedback.md for Chris's notes. Then: nice -n 15 npm run --silent typecheck && nice -n 15 node tools/test.mjs games/<id>/test/walk.ts
//
// It refuses an id that is taken. It never edits an existing game.
import fs from 'node:fs';
import path from 'node:path';

const [id, title] = process.argv.slice(2);
if (!id || !title || !/^[a-z][a-z0-9]*$/.test(id)) {
  console.error('usage: node tools/new-game.mjs <id: lower-case letters and digits> "<Title>"');
  process.exit(1);
}
const NAME = title.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 23);
if (!NAME) { console.error('the title needs letters for the directory name'); process.exit(1); }
const dir = path.join('games', id);
if (fs.existsSync(dir)) { console.error(`${dir} exists`); process.exit(1); }
const q = (s) => JSON.stringify(s).slice(1, -1).replace(/'/g, "\\'");

const files = {
  'src/start.ts': `import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { room } from '../../montyworld/src/layout';

/**
 * ${title}'s first region. A region is one file: its room ids (a table), names and map colours, and each room as a literal naming its id
 * (the change detector maps a line to its room by it: keep it so). The room format is Do Svidaniya Monty's (games/montyworld/src/layout.ts:
 * a palette of letters, a paint of boxes on the 32 x 20 playfield, then coins, decor and creatures in playfield cells); its art too
 * (games/montyworld/src/art/world.ts) until this game has its own. Skill: monty-room.
 */
export const ROOM = { start: 0 } as const;

/** The rooms' names (plain and evocative first, a pun only when it lands), centred in the row under the playfield. */
const NAMES = ['THE FIRST ROOM'] as const;
export const SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The map's colour of each room. */
export const SECTOR_COLOURS: readonly number[] = [7];

export const START_ROOMS: readonly RoomSpec[] = [
  // THE FIRST ROOM: a floor, a step up to a ledge with a coin, a wall at the right, a pigeon patrolling the way up.
  room({
    id: ROOM.start, cell: [0, 0], sector: 0,
    palette: { S: ['snowGround', 1], K: ['kremlinBrick', 2] },
    paint(g) {
      g.box(0, 17, 31, 17, 'S').box(0, 18, 31, 19, 'K');
      g.box(30, 0, 31, 16, 'K');
      g.box(18, 13, 25, 13, 'S');
    },
    coins: [[22, 11]],
    creatures: [{ who: 'pigeon', col: 12, row: 4, way: 'down', speed: 1, range: 24 }],
  }),
];
`,

  'src/data.ts': `import sidUrl from '../../montyotr/assets/monty_on_the_run.sid?url';
import { bankImage, ITEM_SPRITES, MOTR_LOOK } from '../../montyotr/src/data';
import type { MontyData } from '../../montyotr/src/montydata';
import { MESSAGE } from '../../montyotr/src/title';
import { buildRooms, extendEnemies, extendTiles, NO_ROOMS, roomCells, type BaseRooms } from '../../shared/monty/rooms';
import { WORLD_CREATURES, WORLD_DECOR, WORLD_TILE_LIST } from '../../montyworld/src/art/world';
import { FIRST_CREATURE } from '../../montyworld/src/layout';
import { SECTOR_COLOURS, SECTORS, START_ROOMS } from './start';

/**
 * ${title}'s data for the Monty engine (games/montyotr/src: \`MontyData\`): a third value on the same code as Monty on the Run (motr.ts) and
 * Do Svidaniya Monty (games/montyworld/src/data.ts), never a copy. Rooms in runstop64's room format, turned into the tables by \`buildRooms\`;
 * Monty on the Run's tiles and creatures with Do Svidaniya Monty's after them. A mechanism is a module in games/montyotr/src and a list here,
 * a region's entries concatenated (skill: monty-mechanism); every list starts empty.
 */

/** The exit grid: columns west to east, rows for the ways up and down. Grow it as regions are added. */
export const GAME_COLS = 4, GAME_ROWS = 2;
/** Every region's rooms in the order they were made: a room's place in the tables, and so its items' numbers, never change once it has shipped (new rooms go last). */
const ROOMS = [...START_ROOMS];

const BASE: BaseRooms = { ...NO_ROOMS, decorTypes: Object.values(WORLD_DECOR) };
const tables = buildRooms(BASE, ROOMS, SECTORS, bankImage);
const tiles = extendTiles(MOTR_LOOK, WORLD_TILE_LIST);
const enemies = extendEnemies(MOTR_LOOK, Object.values(WORLD_CREATURES), FIRST_CREATURE);

export const GAME: MontyData = {
  ...tables,
  ...MOTR_LOOK,
  ...tiles,
  ...enemies,
  music: { ...MOTR_LOOK.music, sidUrl },
  id: '${id}',

  exitGrid: { image: roomCells(GAME_COLS * GAME_ROWS, GAME_COLS, ROOMS), cols: GAME_COLS, rows: GAME_ROWS },
  extensionGrid: new Uint8Array(GAME_COLS * GAME_ROWS).fill(0xff),
  isExtensionRoom: () => false,
  // he starts at the left of the first room, facing right, on its floor (row 17)
  start: { mapRow: 0, exitCol: 0, x2: 0x28, y: 0xc2, facing: 0x01 },
  untravellable: [],

  kit: [],
  itemSprites: ITEM_SPRITES,
  cheatItem: null,
  uncountedItems: [],
  treasure: null,
  roomEffects: [],

  jetpackRooms: [], lifts: [], escalators: [], icicles: [], tunnels: [], cracks: [], charAnims: [], pulses: [], swimRooms: [], swimGate: null, swimSurfaces: [],
  currents: [], arrivals: [], swimPictures: null, roomBlocks: [], risingLava: [], dragons: [], flights: [], canopy: null, planes: [], planeLook: null, boardings: [],
  tally: null, rollers: [], vines: [], cableCars: [], floats: [], skewers: [], run: null, pursuers: [], levers: [], switches: [], cameos: [],
  iceSprites: { full: 0, half: 0, small: 0, shards: 0 }, costumes: [],
  flashingBases: null, bollard: null, risingCloud: null, c5: null, completion: null,

  // every help on in both modes; EASY/HARD changes only the lives (AGENTS.md)
  assists: ['lives', 'respawn', 'hints'],
  hints: { take: [], wanted: [] },
  regions: [{ name: 'START', from: 0, to: GAME_COLS - 1, rows: { from: 0, to: GAME_ROWS - 1 } }],
  progress: { keyItems: [], cakes: [], sectorColours: SECTOR_COLOURS },
  // (Monty on the Run's scroller for now: a new game gets its own title in the house style, LESSONS.md "Words and sound")
  title: { message: MESSAGE },
  ending: null,
};
`,

  'src/main.ts': `import type { Host } from 'c64kit';
import { montyCodec } from '../../montyotr/src/save';
import { runMonty } from '../../montyotr/src/session';
import { GAME } from './data';

/** ${title}: Monty on the Run's engine (games/montyotr/src, \`runMonty\`) on this game's data (data.ts). Loads at #${id} while it is built. */
export { info } from './info';

/** Its own save codec (the envelope's \`game\` is its id). Bump the format when a shipped room's tables move, and read the old one (montyworld's save-migrate.ts). */
export const CODEC = montyCodec('${q(title)}');

export function run(host: Host) {
  return runMonty(host, GAME, { codec: CODEC });
}
`,

  'src/info.ts': `// What the shell's info sheet says about ${title} (shown by games/shell.ts, from the registry's \`load\`). Data only; the game's code is main.ts.
import type { GameInfo } from '../../registry';

export const info: GameInfo = {
  title: '${q(title)}',
  progress: 'Your progress is saved each time Monty enters a room: coming back to the game carries on where you were.',
  html: \`
    <p><strong>${title}</strong>: a new <a href="https://en.wikipedia.org/wiki/Monty_Mole">Monty Mole</a> game, made after
    <a href="https://en.wikipedia.org/wiki/Monty_on_the_Run">Monty on the Run</a> (1985) on its engine, tiles, sprites and music.</p>
    <ul>
      <li>Original game: Peter Harrap</li>
      <li>Graphics: Mark Rodgers</li>
      <li>Music: <a href="https://en.wikipedia.org/wiki/Rob_Hubbard">Rob Hubbard</a></li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Gremlin_Graphics">Gremlin Graphics</a>, 1985</li>
    </ul>
    <p>Controls: arrows or WASD move &middot; Space jumps and starts a game from the title &middot; P or Esc pauses: items found, and a map &middot;
    M music or sound effects.</p>
  \`,
};
`,

  'test/walk.ts': `/**
 * ${title} on the Monty engine: the data (its own exit grid, the first room where its region puts it, no Monty on the Run room, kit or C5),
 * a new game in the first room on its floor, and the same game through the front end: the title, play, the autosave in its own envelope, the
 * pause screen. Made by tools/new-game.mjs; grow it as the game grows (the region's bot and mechanisms get tests of their own).
 *
 *   nice -n 15 node tools/test.mjs games/${id}/test/walk.ts
 */
import { Input, PixelRenderer } from 'c64kit';
import { Game } from '../../montyotr/src/game';
import { sectorName } from '../../montyotr/src/montydata';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { fromBase64, readSaves } from '../../shared/saves';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { GAME, GAME_COLS, GAME_ROWS } from '../src/data';
import { CODEC, run } from '../src/main';
import { ROOM } from '../src/start';

// ---- the data ------------------------------------------------------------------------------------
const cells = GAME.exitGrid.image;
check(\`the exit grid is \${GAME_COLS} by \${GAME_ROWS}\`, GAME.exitGrid.cols === GAME_COLS && GAME.exitGrid.rows === GAME_ROWS && cells.length === GAME_COLS * GAME_ROWS);
check('the first room is in the cell its region gives it, [0, 0]', cells[0] === ROOM.start);
check('no room of Monty on the Run\\'s, no kit, no C5, no jetpack', GAME.extensionGrid.every((c) => c === 0xff) && GAME.kit.length === 0 && !GAME.c5 && GAME.jetpackRooms.length === 0);
check(\`the first room has its name (\${sectorName(GAME, ROOM.start).text})\`, sectorName(GAME, ROOM.start).text.length > 0);

// ---- Monty in the first room ---------------------------------------------------------------------
const g = new Game(GAME);
g.assist = { lives: false, cloud: false, jetpack: false, c5: false, rooms: false, respawn: false, hints: false };
g.start();
const s: State = { g, col: 0 };
for (let n = 0; n < 200 && (g.freeze || g.script); n++) frame(s, NONE);
check(\`a new game starts in the first room at its start place (room \${g.roomId}, \${g.mapRow}/\${g.exitCol})\`, g.roomId === ROOM.start && g.mapRow === 0 && g.exitCol === 0 && !g.freeze);
const y0 = g.y;
for (let n = 0; n < 50; n++) frame(s, NONE);
check(\`he stands on the floor (y \${y0}, then \${g.y})\`, g.y === y0);

// ---- through the front end ------------------------------------------------------------------------
useMemoryStorage();
const input = new Input(nowhere);
const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };

tick(5);
check(\`the title is up, its game is ${q(title)}'s (\${p.game.data.id})\`, p.state.mode === 'title' && p.game.data.id === '${id}');
tap('Space');
tick(80);
check(\`play begins in the first room (\${p.game.roomId})\`, p.state.mode === 'play' && p.game.roomId === ROOM.start);
const saved = readSaves('${id}').current;
check(\`the autosave is in an envelope of its own (game ${id}, format \${CODEC.format}) and its codec reads it back\`,
  saved !== null && saved.format === CODEC.format && CODEC.unpack(fromBase64(saved.data), saved.format).roomId === ROOM.start);
tap('KeyP');
tick(4);
check('the pause screen opens', p.state.paused);

finish();
`,
};

for (const [rel, text] of Object.entries(files)) {
  const file = path.join(dir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

// the registry: one entry, next to its series (after Do Svidaniya Monty), off the directory until Chris has played it
const REG = 'games/registry.ts';
const reg = fs.readFileSync(REG, 'utf8');
const after = reg.split('\n').findIndex((l) => l.includes("id: 'montyworld'"));
if (after < 0) throw new Error(`${REG}: no montyworld entry to put the new game after`);
const regLines = reg.split('\n');
regLines.splice(after + 1, 0, `  { id: '${id}', name: '${NAME}', blocks: 165, load: () => import('./${id}/src/main'), listed: false }, // (tools/new-game.mjs; listed once Chris has played it)`);
fs.writeFileSync(REG, regLines.join('\n'));

// the walk test in the runner's list (before the list's closing bracket)
const TESTS = 'tools/tests.mjs';
const tests = fs.readFileSync(TESTS, 'utf8').split('\n');
const close = tests.findIndex((l) => l === '];');
if (close < 0) throw new Error(`${TESTS}: no closing "];" for TESTS`);
tests.splice(close, 0, `  { file: 'games/${id}/test/walk.ts', set: 'fast', name: 'games/${id}/test/walk.ts (${q(title)} on the Monty engine: its data, a new game in the first room, the front end)' },`);
fs.writeFileSync(TESTS, tests.join('\n'));

// Chris's notes, room by room
const DOC = `docs/${id}-feedback.md`;
if (!fs.existsSync(DOC)) fs.writeFileSync(DOC, `# ${title}: Chris's playtest notes, room by room

The one list of what Chris has said about each room, and where it stands. New notes go here (one row per room; quote him), not
only into a chat. An agent fixing a room reads its row, and marks it **done** with the commit when its render shows the fix.
The plan and region docs (\`docs/${id}-plan.md\`, \`docs/${id}-<region>.md\`) hold the design; this holds the to-do.

Statuses: **open**, **in pass** (a workflow is on it), **done** (commit), **his call** (a decision for Chris).

## Across the game

| Note | Status |
|---|---|

## Start

| Room | Chris | Status |
|---|---|---|
`);

console.log(`made games/${id} (${NAME}), its registry entry, its walk test in ${TESTS} and ${DOC}.
next: nice -n 15 npm run --silent typecheck && tools/wait-turn.sh && nice -n 15 node tools/test.mjs games/${id}/test/walk.ts`);
