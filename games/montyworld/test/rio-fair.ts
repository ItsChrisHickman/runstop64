/**
 * Fairness of the churrascaria (Chris: "painfully difficult and confusing"): with its two gauchos walking and their skewers swinging, the headdress, every coin and the way back out east to the beach must be gettable from
 * several arrival timings (he comes in, waits 0 to 90 frames, then plays), in both modes: a search over the game's own frames, for each timing, takes the pickups one after another and walks out. A timing that has
 * no way is a creature that is near-impossible to pass.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rio-fair.ts
 */
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { RIO_ROOM as R, RIO_ROOMS } from '../src/rio';
import { enterRoom } from '../../montyotr/src/ending';
import { newGame, play, search } from './bot';
import { coin, into, item, standY, type Part } from './route';

const room = RIO_ROOMS.find((r) => r.id === R.steak);
if (!room) throw new Error('no churrascaria');
/** The pickups in the order a player takes them: the east lane's coin, up the stairs to the stage (its coins, the headdress), down the ladder into the west lane (its coins), and out east to the beach. */
const parts: readonly (readonly [string, Part])[] = [
  ['the east lane\'s coin', coin(R.steak, 23, 16)],
  ['the stage\'s coin at 17,10', coin(R.steak, 17, 10)], ['the stage\'s coin at 11,8', coin(R.steak, 11, 8)], ['the stage\'s coin at 9,8', coin(R.steak, 9, 8)],
  ['the headdress', item(R.steak, 0, [6, 8])], ['the stage\'s coin at 5,8', coin(R.steak, 5, 8)],
  ['the west lane\'s coin at 4,16', coin(R.steak, 4, 16)], ['the west lane\'s coin at 15,16', coin(R.steak, 15, 16)],
  ['out east to the beach', into(R.sugar, 31, 17, R.steak)],
];
if (room.coins?.length !== 7) throw new Error('the churrascaria\'s coins are not the ones this test takes');

for (const enhanced of [false, true]) {
  for (const wait of [0, 23, 51, 90]) {
    const s = newGame(WORLD, enhanced);
    enterRoom(s.g, R.steak, 0x0c + (30 + 4) * 4, standY(18));
    for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
    for (let n = 0; n < wait; n++) frame(s, NONE);
    let live = s;
    let failed = '';
    for (const [name, part] of parts) {
      const found = search(live, part.goal, part.aim, 60000, 1.5) ?? search(live, part.goal, part.aim, 400000, 3);
      const next = found ? play(live, found.route) : null;
      if (!next || !part.goal(next.g)) { failed = name; break; }
      live = next;
    }
    check(`${enhanced ? 'ENHANCED' : 'ORIGINAL'}, arriving ${wait} frames before he moves: every pickup and the way out are gettable${failed ? ` (no way: ${failed})` : ''}`, failed === '');
  }
}
finish();
