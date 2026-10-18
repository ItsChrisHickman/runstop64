/**
 * Dragonskulle's HD view (c64kit's hd/, src/hd.ts), headless: the shell's C64/HD switch with the game,
 * and the view itself on the island reached by playing (the first of re/routes.json, found by
 * automatic play), built from the game's own frames and looked at (games/shared/test/hd.ts: C64 | HD
 * stills with an out-dir), laid out as the front end shows the picture (the play area moved up under
 * the status line: the room's band where it's shown, the sprites with it); and the rooms over a
 * stretch of play (only what changed made again).
 *
 *   nice -n 15 node tools/test.mjs games/dragonskulle/test/hd.ts [out-dir]
 */
import fs from 'node:fs';
import { NativeHost } from '../../shared/native/host';
import { port } from '../src/native';
import { dragonskulleHd } from '../src/hd';
import { dragonskulleLayout, PLAY, run } from '../src/main';
import { obliqueRoom } from '../../../packages/c64kit/src/hd/oblique';
import { checkHdEntry, checkHdFrames, checkHdRoom, checkHdSwitch, routeWalker } from '../../shared/test/hd';
import { stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';

const store = useMemoryStorage();
const title = new Uint8Array(fs.readFileSync('games/dragonskulle/assets/dragonskulle-title.state'));
stubFetch(title);
const outDir = process.argv[2];
if (outDir) fs.mkdirSync(outDir, { recursive: true });


// (kept alive along the route, as the travel check does)
const walk = () => routeWalker({ port, title, routes: 'games/dragonskulle/re/routes.json', cheat: (ram) => { ram[0x1248] = 0; ram[0x123e] = 0x14; ram[0x3432] = 0; } });
// the beach (the sky, the sea, the cliffs), further along under the skull rock and its cliffs, a
// cave (sand, rock walls), the cave over the river
const w = walk();
const rooms = [['beach', w.at(300)], ['skull-rock', w.at(800)], ['cliffs', w.at(1200)], ['cave', w.at(1500)], ['river-cave', w.at(1800)]] as const;

await checkHdSwitch(check, { id: 'dragonskulle', run, store, save: rooms[0][1], action: 'KeyZ' }, outDir);

// the play area where the layout shows it: the room's band, as the front end's picture has it
{
  const g = NativeHost.resume(port, rooms[0][1]);
  g.tick();
  const band = obliqueRoom(dragonskulleHd, g.m.ram, g.m.capture, dragonskulleLayout).band;
  check(`the room's band where the layout shows the play area (lines ${band.y}-${band.y + band.h - 1}: the machine's ${dragonskulleHd.band.y}-${dragonskulleHd.band.y + dragonskulleHd.band.h - 1}, moved ${PLAY.from.y - PLAY.y} up)`, band.y === dragonskulleHd.band.y - (PLAY.from.y - PLAY.y) && band.h === dragonskulleHd.band.h);
}

const entered: NativeHost['m'][] = [];
for (const [name, state] of rooms) {
  const g = NativeHost.resume(port, state);
  g.tick();
  entered.push(g.m);
  checkHdRoom(check, dragonskulleHd, { name, m: g.m, layout: dragonskulleLayout }, outDir);
}

// coming into each of those rooms in turn: no frame of the main thread's stalls (the room built off it)
await checkHdEntry(check, 'dragonskulle', dragonskulleHd, entered, { layout: dragonskulleLayout });

// the rooms over the route's first 3,000 frames (the island's rows scroll as he walks along them)
const v = walk();
checkHdFrames(check, 'walking the island', dragonskulleHd, () => (v.frame < 3000 ? v.next() : null), dragonskulleLayout);

finish();
