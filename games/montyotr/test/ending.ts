/**
 * Travel from the ending (main.ts on the shared front end): on the dock, from the moment the treasure
 * takes Monty there until he walks aboard, the pause screen opens and travel takes him back to a room
 * he's visited, the ending undone (Game.leaveEnding): he arrives exactly as travel there from play
 * has him arrive (the game's memory, colours, sprites and registers, the music), plays on, and coming
 * back to the treasure the ending plays again, through to the finale. Once he's aboard, the pause
 * screen doesn't open; nor in another sequence (a death). After the finale (France): the title and
 * CONTINUE?, the save as it was (the dock room's, with everything collected) and the map's progress
 * kept; yes takes him back into the dock room as he came in, lives and score as saved, and the
 * treasure there plays the ending again.
 *
 *   nice -n 15 node tools/test.mjs games/montyotr/test/ending.ts
 */
import { Input, PixelRenderer } from 'c64kit';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { sidLog } from '../../shared/test/kit';
import { must } from '../../shared/test/must';
import { fromBase64, readFound, readSaves } from '../../shared/saves';
import { exitGridImage, MUSIC } from '../src/data';
import { run } from '../src/main';
import { CODEC } from '../src/save';
import { readJson } from '../../shared/guards';
import { check, finish } from '../../shared/test/check';

const store = useMemoryStorage();

const input = new Input(nowhere), renderer = new PixelRenderer(), p = run({ renderer, input, canvas: nowhere });
const g = p.game;
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
const press = (code: string) => { input.keyDown(code); tick(1); input.keyUp(code); tick(1); };
const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
const lastSong = () => [...sidLog.calls].reverse().find(([a]) => a === MUSIC.init)?.[1];

/**
 * The game as an arrival leaves it: everything the room and the sprites are made of. Not the teleport
 * dissolve's working buffers ($6700, $7000: random noise each time), nor the registers of sprites not
 * shown (what earlier rooms left there), nor which frame an enemy's animation is on (the frame's parity
 * as he came in: their places are compared).
 */
const DISSOLVE = [[0x2700, 0x2780], [0x3000, 0x3080]];
const state = () => JSON.stringify({
  room: g.roomId, mem: Array.from(g.mem).map((v, i) => (DISSOLVE.some(([a, b]) => i >= a && i < b) ? 0 : v)), col: Array.from(g.col), x2: g.x2, y: g.y, mapRow: g.mapRow, exitCol: g.exitCol,
  enable: g.enable, multicolour: g.multicolour, expandX: g.expandX, expandY: g.expandY, priority: g.priority,
  vic: { enable: g.vic.enable, multicolour: g.vic.multicolour, expandX: g.vic.expandX, expandY: g.vic.expandY, priority: g.vic.priority, mc1: g.vic.mc1, mc2: g.vic.mc2, sprites: g.vic.sprites.map((r, n) => (g.vic.enable & (1 << n) ? { x: r.x, y: r.y, colour: r.colour, ptr: n < 4 ? r.ptr : null } : null)) },
  completion: g.completionActive, ending: g.ending, script: g.script !== null, action: g.actionCounter, gameMode: g.gameMode, enemies: g.enemies,
  score: g.score, lives: g.lives, song: lastSong(),
});

/** Travel on the pause screen to `id` (as picking it on the map does: the front end's `going`), and the arrival settled. */
function travel(id: number) {
  press('KeyP');
  if (!p.state.paused) return false;
  p.frontEnd.going = String(id);
  press('KeyP');
  return until(() => g.roomId === id && !g.freeze && !g.script, 400);
}

/** Into room $2F, the jerry can found (the treasure is there), Monty put on the treasure: the ending begins. */
const DOCK = 0x2f, cell = exitGridImage.indexOf(DOCK);
function toTreasure() {
  g.siCollected[8] = 0x81;
  g.mapRow = Math.floor(cell / 23); g.exitCol = cell % 23; g.x2 = 0x70; g.y = 0x9a; g.roomExit = 1;
  until(() => g.roomId === DOCK && !g.freeze, 200);
  return until(() => { g.x2 = 0x40; g.y = 0x99; return g.completionActive === 1; }, 200);
}

tick(300);
press('Space');
tick(40);
const first = g.roomId;
check(`a game under way, in the first room ($${first.toString(16)})`, p.state.mode === 'play' && first === 0);
check('the treasure: the ending begins (the dock, $30)', toTreasure() && g.roomId === 0x30);
tick(60);
press('KeyP');
check('on the dock, before he walks aboard: the pause screen opens', p.state.paused);
press('KeyP');
tick(2);

// from the ending: travel to the first room
const fromEnding = travel(first);
tick(30);
const afterEnding = state();
check(`travel from the ending: in the first room, playing (the ending undone: completion ${g.completionActive}, script ${g.script ? 'running' : 'none'}, the game's tune ${lastSong()})`,
  fromEnding && g.completionActive === 0 && g.ending === null && !g.script && p.state.mode === 'play' && lastSong() === 0);
// the same arrival from play: to the dock room (no treasure there now: only a room) and back by travel
g.siCollected[8] = 0;
const ordinary = travel(DOCK) && travel(first);
tick(30);
const fromPlay = state();
const fields = (s: string): Record<string, unknown> => { const v: unknown = readJson(s); return v && typeof v === 'object' ? Object.fromEntries(Object.entries(v)) : {}; };
const a = fields(afterEnding), b = fields(fromPlay), differ = Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
check(`arriving from the ending is arriving from play (the first room both ways${ordinary ? '' : ', travel from play failed'}; ${differ.length ? `differing: ${differ.join(', ')}` : 'the same memory, colours, sprites, registers, enemies and music'})`, ordinary && differ.length === 0);

// back to the treasure: the ending plays again, to the finale
g.siCollected[8] = 0x81;
g.score = 1230; g.lives = 3; g.coinCollected[0] = 1; // (what he has coming into the dock room, kept through the finale)
check('back to the treasure: the ending again', toTreasure());
until(() => !!g.ending?.aboard, 3000);
press('KeyP');
check('aboard: the pause screen doesn\'t open (the finale plays on)', !p.state.paused && !!g.ending?.aboard);
const saved = must(readSaves('montyotr').current, 'the save on coming into the dock room');
const finished = until(() => p.state.mode === 'title', 4000);
check(`the finale to the end: France (${g.won ? 'won' : 'not won'}), the title`, finished && g.won);

// after the finale: everything kept, and on into the game again
const s = CODEC.unpack(fromBase64(saved.data)), found = Object.keys(readFound('montyotr').rooms ?? {});
check(`the save after finishing is the dock room's, everything collected in it (${saved.summary.join(' / ')})`,
  s.roomId === DOCK && s.items[8] === 0x81 && s.score === 1230 && s.lives === 3 && s.coins[0] === 1 && store.has('montyotr.save.v2') && readSaves('montyotr').current?.data === saved.data && p.state.hasSave);
check(`the map's progress kept (${found.length} rooms seen, the first and the dock among them)`, found.includes(String(first)) && found.includes(String(DOCK)));
check('CONTINUE? offered', until(() => p.state.prompt === 'continue', 600));
press('Enter');
const back = until(() => p.state.mode === 'play' && g.roomId === DOCK && !g.freeze, 200);
check(`yes: back in the dock room ($${g.roomId.toString(16)}), the jerry can still had, lives ${g.lives} and score ${g.score} as saved (${s.lives}, ${s.score}), coins as saved, the game's tune`,
  back && g.siCollected[8] === 0x81 && g.lives === s.lives && g.score === s.score && s.coins.every((c, i) => g.coinCollected[i] === c) && !g.won && lastSong() === 0);
check('the treasure still there: the ending plays again', toTreasure() && g.roomId === 0x30 && lastSong() === 2);

finish();
console.log('all passed');
