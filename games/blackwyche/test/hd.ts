/**
 * Blackwyche's HD view (c64kit's hd/, src/hd.ts), headless: the shell's C64/HD switch with the game, and
 * the view itself on the ship reached by playing (the first of re/routes.json, found by automatic
 * play), built from the game's own frames and looked at (games/shared/test/hd.ts: C64 | HD stills
 * with an out-dir); and the rooms over a stretch of play (only what changed made again).
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/hd.ts [out-dir]
 */
import fs from 'node:fs';
import { NativeHost } from '../../shared/native/host';
import { port } from '../src/native';
import { blackwycheHd } from '../src/hd';
import { run } from '../src/main';
import { checkHdEntry, checkHdFrames, checkHdLockstep, checkHdRoom, checkHdSwitch, inFront, routeWalker } from '../../shared/test/hd';
import { stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';

const store = useMemoryStorage();
const title = new Uint8Array(fs.readFileSync('games/blackwyche/assets/blackwyche-title.state'));
stubFetch(title);
const outDir = process.argv[2];
if (outDir) fs.mkdirSync(outDir, { recursive: true });


// (his energy kept up along the route, as the travel check does)
const walk = () => routeWalker({ port, title, routes: 'games/blackwyche/re/routes.json', cheat: (ram) => { ram[0x9d77] = 100; ram[0x3417] = 0; } });
// a ghost leaping over a cannon on the deck (in the air: in front of what it's drawn over, as on the C64),
// the deck (cannons, cannonballs against the bulwark, the rail, the sea), Pendragon in front of the
// wardrobe in the hall with the long table ($7F, the hatched wall of $7C beside it running back), a cabin
// (brown: windows, lanterns, a cupboard), a hold below decks (grey planks, lanterns, buckets, a side wall
// either side: $AC), the grey-and-yellow cabin with the long table, the store room (red, barrels, a lantern)
const w = walk();
const rooms = [['leap', w.at(300)], ['deck', w.at(1050)], ['wardrobe', w.at(3410)], ['cabin', w.at(3750)], ['hold', w.at(9760)], ['table', w.at(17610)], ['store', w.at(27930)]] as const;

await checkHdSwitch(check, { id: 'blackwyche', run, store, save: rooms[0][1], action: 'Space' }, outDir);

const entered: NativeHost['m'][] = [];
for (const [name, state] of rooms) {
  const g = NativeHost.resume(port, state);
  g.tick();
  entered.push(g.m);
  checkHdRoom(check, blackwycheHd, { name, m: g.m, flames: name !== 'deck' && name !== 'leap' }, outDir);
  const f = inFront(blackwycheHd, g.m);
  check(`${name}: of the ${f.shown} sprite pixels the C64 shows, the HD room hides ${f.wrong} behind something standing behind them`, f.wrong === 0);
}

// coming into each of those rooms in turn: no frame of the main thread's stalls (the room built off it)
await checkHdEntry(check, 'blackwyche', blackwycheHd, entered);

// along the first route, every 24th frame: what hides a sprite in the HD view stands in front of it
// (the parts of things on their own feet; things in the air in front of what they're drawn over). A
// few pixels a frame where a stride's foot meets something's foot are left; before the fixes 7,635
// at most 239 in a frame
{
  const v = walk();
  let shown = 0, wrong = 0, worst = 0;
  for (let m = v.next(); m; m = v.next()) {
    if (v.frame % 24) continue;
    const f = inFront(blackwycheHd, m);
    shown += f.shown; wrong += f.wrong; worst = Math.max(worst, f.wrong);
  }
  check(`along the route: of ${shown} sprite pixels the C64 shows, the HD room hides ${wrong} behind something standing behind them (${worst} at most in a frame)`, wrong <= shown * 0.001 && worst <= 24);
}

// the rooms over the route's first 4,000 frames (the deck scrolls as he walks along it)
const v = walk();
checkHdFrames(check, 'walking the ship', blackwycheHd, () => (v.frame < 4000 ? v.next() : null));

// room and sprites locked together as he walks along the deck (it scrolls), every frame drawn: the
// rooms built here, and built off the main thread as the browser does
for (const refresher of [false, true]) {
  const l = walk();
  l.at(900);
  await checkHdLockstep(check, `along the deck${refresher ? ', rooms built off the main thread' : ''}`, blackwycheHd, l.host.m, () => !!l.next(), 400, { refresher });
}

finish();
