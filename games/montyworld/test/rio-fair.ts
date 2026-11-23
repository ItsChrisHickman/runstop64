/**
 * Fairness of the churrascaria (Chris: "painfully difficult and confusing"): with its two gauchos walking and their skewers swinging, the coin, the crank and the way back down the ladder to Lapa's track must be gettable from
 * several arrival timings (he comes in, waits 0 to 90 frames, then plays), in both modes: a search over the game's own frames, for each timing, takes the pickups one after another and walks out. A timing that has
 * no way is a creature that is near-impossible to pass. The Sambadrome's showdown the same way: from the rope's foot with the crank fitted and the agent on his trail, after a wait of 0 to 51 frames (standing still
 * longer lets the agent catch up: every wait costs time), the lever pulled with the agent under the float's head.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rio-fair.ts
 */
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { RIO_ROOM as R, RIO_ROOMS } from '../src/rio';
import { enterRoom } from '../../montyotr/src/ending';
import { newGame, play, search } from '../../shared/monty/test/bot';
import { coin, into, item, itemIndex, standY, type Part } from './route';
import { wear } from '../../montyotr/src/items';
import { isRio } from '../src/rio';
import { AND } from '../src/andes';
import { readArgs, runLegs } from '../../shared/monty/test/legs';
import { RIO_LEGS } from './rio-route';

const room = RIO_ROOMS.find((r) => r.id === R.steak);
if (!room) throw new Error('no churrascaria');
/** The pickups in the order a player takes them: the coin by the step in the first gaucho's lane, up the ladder past the second's skewer for the crank, and back past both down the ladder. */
const parts: readonly (readonly [string, Part])[] = [
  ['the coin by the step', coin(R.steak, 14, 17)],
  ['the crank', item(R.steak, 0, [28, 6])],
  ['back down the ladder to the track', into(R.lap, 5, 19, R.steak)],
];
if (room.coins?.length !== 1) throw new Error('the churrascaria\'s coins are not the ones this test takes');

for (const enhanced of [false, true]) {
  for (const wait of [0, 23, 51, 90]) {
    const s = newGame(WORLD, enhanced);
    enterRoom(s.g, R.steak, 0x0c + (2 + 4) * 4, standY(18)); // (on the dining floor west of the ladder's hole he comes up through: clear of the first gaucho's lane, cols 8-16)
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
// the showdown: the region's own legs to the rope's foot (the headdress, the dead lever, the crank fitted in the booth, the gantry and the rope), then a wait, then the squash
const toRope = RIO_LEGS.filter((l) => l.name.startsWith('D: ')).slice(0, 4);
const squash = RIO_LEGS.find((l) => l.name.startsWith('D: east under the float'));
if (toRope.length !== 4 || !squash) throw new Error('the Sambadrome\'s legs are not the ones this test plays');
for (const enhanced of [false, true]) {
  const s = newGame(WORLD, enhanced);
  for (let i = 0; i < s.g.siCollected.length; i++) { const r = s.g.data.specialItems[i * 4] ?? 0; if (!isRio(r) && r !== 0xff) s.g.siCollected[i] = 0x81; }
  s.g.siCollected[itemIndex(s.g, R.steak, 0)] = 0x81; // (the crank)
  wear(s.g, itemIndex(s.g, AND.terraces, 1));
  enterRoom(s.g, R.drum, 0x0c + (0 + 4) * 4, standY(8));
  for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
  const mode = enhanced ? 'enhanced' : 'original';
  const { live: atRope, ok } = runLegs({ dir: '/tmp/rio-fair', region: 'rio-fair', mode, legs: toRope, start: s, args: { ...readArgs([]), full: true }, plan: [[60000, 1.5], [400000, 3]] });
  if (!ok) continue;
  for (const wait of [0, 23, 51]) {
    let live = atRope;
    for (let n = 0; n < wait; n++) { const next = play(live, [['', 1]]); if (next) live = next; }
    const found = search(live, squash.goal, squash.aim, 60000, 1.5) ?? search(live, squash.goal, squash.aim, 400000, 3);
    const end = found ? play(live, found.route) : null;
    check(`${enhanced ? 'ENHANCED' : 'ORIGINAL'}, the showdown after a wait of ${wait} frames at the rope's foot: the agent squashed under the float's head`, !!end && squash.goal(end.g));
  }
}
finish();
