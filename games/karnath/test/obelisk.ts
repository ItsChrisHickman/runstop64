/**
 * Karnath: the obelisk, far left of Karn's abode, is a place on the pause map once he has been in the abode, and the map takes him
 * there the game's own way (travel.ts: the abode's mode by the game's transitions, his place as he first came to the obelisk,
 * places.ts): in the abode, the obelisk (sprite 6) on the screen, and with a piece carried BARACATA at it lays the piece.
 *
 *   nice -n 15 node tools/test.mjs games/karnath/test/obelisk.ts
 */
import fs from 'node:fs';
import { unpackState } from '../../../packages/c64kit/src/c64/machine';
import { cpu } from '../../shared/native/cpu';
import { NativeHost } from '../../shared/native/host';
import { MAP_BOX } from '../../shared/native/pause';
import { GAMES, setJoy } from '../../shared/native/test/games';
import { spriteSpot } from '../../shared/native/spots';
import { check, finish } from '../../shared/test/check';
import { readRoute } from '../../shared/test/data';
import { karnathMap } from '../src/map';
import { PLACES } from '../src/places';

const game = GAMES.karnath;
const title = unpackState(new Uint8Array(fs.readFileSync(game.title)));
const route = readRoute('games/karnath/re/routes.json');
const g = new NativeHost(game.port, title);
for (let i = 0, n = 0; i < route.length && n < 3000; i += 2) for (let k = 0; k < route[i + 1] && n < 3000; k++, n++) {
  setJoy(g.m, game, route[i] & 0x1f); g.m.keys = route[i] & 32 ? [[1, 2]] : []; g.tick(); g.m.ram[0x6ffe] = 100; g.m.ram[0x322e] = 0;
}
const start = g.save();
if (!start) throw new Error('no save');

const found = karnathMap.found.empty();
check('before he has been in the abode the map has no obelisk', !karnathMap.places(MAP_BOX, start.ram, found).some((p) => p.id === 'obelisk'));
found.castle.at['25'] = [...PLACES['254/25']];
const places = karnathMap.places(MAP_BOX, start.ram, found);
check(`once he has, it has (${places.map((p) => p.id).join(' ')})`, places.some((p) => p.id === 'obelisk'));

const h = NativeHost.resume(game.port, start);
let went: boolean | null = null;
h.onWait = (site) => {
  if (went !== null || site !== game.port.mainLoopWait) return;
  const regs = { ...cpu };
  went = karnathMap.go?.('obelisk', h.m.ram, found) ?? false;
  Object.assign(cpu, regs);
};
const r = h.m.ram;
const frame = (joy: number) => { setJoy(h.m, game, joy); h.m.keys = []; h.tick(); r[0x6ffe] = 100; r[0x322e] = 0; };
for (let f = 0; f < 120; f++) frame(0x1f);
check(`the map's travel took him to the abode (mode $${r[0x3219].toString(16)}, room ${r[0x3235]})`, went === true && r[0x3219] === 0xfe && r[0x3235] === 25);
const obelisk = spriteSpot(r, h.m.vic, 6);
check(`the obelisk is on the screen (sprite 6 at ${obelisk ? `${obelisk.x},${obelisk.y}` : 'nowhere'})`, obelisk !== null);
// a piece carried, BARACATA at it (as test/pentacle.ts casts it)
r[0x322f] = 1; r[0x6fff] = 0; r[0x322c] = 7;
const UP = 0x1f & ~1, RIGHT = 0x1f & ~8, FIRE = 0x1f & ~16;
for (let f = 0; f < 80; f++) frame(UP);
for (let f = 0; f < 3; f++) frame(RIGHT);
for (let f = 0; f < 3; f++) frame(FIRE);
for (let f = 0; f < 60; f++) frame(0x1f);
check(`BARACATA at it with a piece: laid (carried ${r[0x322f]}, count ${r[0x6fff]})`, r[0x322f] === 0 && r[0x6fff] === 1);
finish();
