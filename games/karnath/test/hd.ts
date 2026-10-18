/**
 * The Staff of Karnath's HD view (c64kit's hd/, src/hd.ts), headless: the shell's C64/HD switch with the
 * game, and the view itself in rooms of the castle reached by playing (the first two of re/routes.json,
 * found by automatic play: the lower and upper floors, the dungeons, Karn's abode), built from the game's
 * own rooms as pieces (src/pictures.ts) and looked at (games/shared/test/hd.ts:
 * C64 | HD stills with an out-dir); the rooms over a stretch of play, the castle's strip
 * scrolling (only what changed made again), and room and sprites locked together along it.
 *
 *   nice -n 15 node tools/test.mjs games/karnath/test/hd.ts [out-dir]
 */
import fs from 'node:fs';
import { NativeHost } from '../../shared/native/host';
import { port } from '../src/native';
import { karnathHd } from '../src/hd';
import { run } from '../src/main';
import { checkHdEntry, checkHdFrames, checkHdLockstep, checkHdRoom, checkHdSwitch, inFront, routeWalker } from '../../shared/test/hd';
import { stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';

const store = useMemoryStorage();
const title = new Uint8Array(fs.readFileSync('games/karnath/assets/karnath-title.state'));
stubFetch(title);
const outDir = process.argv[2];
if (outDir) fs.mkdirSync(outDir, { recursive: true });


// (his energy kept up along the route, as the travel check does)
const walk = (route = 0) => routeWalker({ port, title, route, routes: 'games/karnath/re/routes.json', cheat: (ram) => { ram[0x6ffe] = 100; ram[0x322e] = 0; } });
// the lower guard room (two guards), the west tower's lower room (a door, chairs, candelabras), the
// east tower's (a fireplace); the upper floor's treasury (chairs along the wall) and a hall with a long
// dais; the dungeons (cells, the barred arches); Karn's abode (the maze of low walls)
const w = walk(), w1 = walk(1);
const rooms = [
  ['guard-room', w.at(629)], ['west-tower', w.at(2057)], ['east-tower', w.at(3377)],
  ['treasury', w.at(6840)], ['dais', w.at(9240)], ['dungeon', w1.at(1200)], ['abode', w1.at(2730)],
] as const;

await checkHdSwitch(check, { id: 'karnath', run, store, save: rooms[0][1], action: 'Space' }, outDir);

const entered: NativeHost['m'][] = [];
for (const [name, state] of rooms) {
  const g = NativeHost.resume(port, state);
  g.tick();
  entered.push(g.m);
  checkHdRoom(check, karnathHd, { name, m: g.m, flames: name !== 'abode' }, outDir);
  const f = inFront(karnathHd, g.m);
  check(`${name}: of the ${f.shown} sprite pixels the C64 shows, the HD room hides ${f.wrong} behind something standing behind them`, f.wrong === 0);
}

// coming into each of those rooms in turn: no frame of the main thread's stalls (the room built off it)
await checkHdEntry(check, 'karnath', karnathHd, entered);

// the rooms over the route's first 3,500 frames (walking the castle's lower floor: its strip scrolls)
const v = walk();
checkHdFrames(check, 'walking the lower floor', karnathHd, () => (v.frame < 3500 ? v.next() : null));

// room and sprites locked together as he walks along the lower floor (its strip scrolls: from frame 1,200 of the route the
// picture scrolls on for 950 frames with no other room come into), every frame drawn: the rooms built here, and built off
// the main thread as the browser does
for (const refresher of [false, true]) {
  const l = walk();
  l.at(1200);
  await checkHdLockstep(check, `along the lower floor${refresher ? ', rooms built off the main thread' : ''}`, karnathHd, l.host.m, () => !!l.next(), 400, { refresher });
}

finish();
