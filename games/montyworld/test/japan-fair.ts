/**
 * Japan's pickups are fair to a person (Chris on the Shogun's Hall: the bot took its coin, so it was probably frame perfect): the route is played as japan.ts plays it, and
 * before each pickup (every coin, both sushi, the daruma, the fish food and the hood) its leg is searched again from several starts a few frames and pixels off the one the
 * bot happened to have: after waiting a few frames (the creatures, trains, doors and crushers are in other places), and after a nudge left or right (he is a pixel or more
 * off). A person cannot repeat the bot's exact inputs, so every one of those starts must still find a way to the pickup. A start the nudge makes impossible (a wall, a drop)
 * is not a start.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/japan-fair.ts [original|enhanced] [first leg] [last leg]
 */
import { enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { copy, frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { CHI } from '../src/china';
import { isJapanese, JP } from '../src/japan';
import { ACTIONS, hold, newGame, play, search } from '../../shared/monty/test/bot';
import { JAPAN_LEGS } from './japan-route';
import { itemIndex, settledOn, standY } from './route';

const mode = process.argv[2] === 'enhanced' ? 'enhanced' : 'original';
const first = Number(process.argv[3] ?? 0), last = Number(process.argv[4] ?? JAPAN_LEGS.length - 1);
const japanese = isJapanese; // (the rooms made with Japan and those added after it shipped: SHOOT FOR THE MOON, GONE WITH THE WIND)

const stick = (name: string) => ACTIONS.find(([n]) => n === name)?.[1] ?? NONE;

/** A start a little off the leg's: `wait` frames of standing, or `nudge` frames of walking one way (then standing until he is on his feet again); null if that kills him or leaves the room. */
function shifted(from: State, how: { wait: number } | { nudge: '<' | '>'; frames: number }): State | null {
  const s: State = { g: copy(from.g), col: from.col };
  const room = s.g.roomId;
  const r = 'wait' in how ? hold(s, NONE, how.wait) : hold(s, stick(how.nudge), how.frames);
  if (r.dead || s.g.roomId !== room) return null;
  for (let n = 0; n < 120 && !settledOn(s.g); n++) { if (hold(s, NONE, 1).dead) return null; }
  return settledOn(s.g) ? s : null;
}

const VARIANTS: readonly { name: string; how: Parameters<typeof shifted>[1] }[] = [
  { name: 'after 5 frames', how: { wait: 5 } }, { name: 'a pixel or two left', how: { nudge: '<', frames: 2 } }, { name: 'a few pixels right', how: { nudge: '>', frames: 5 } },
];

let live = newGame(WORLD, mode === 'enhanced');
for (let i = 0; i < live.g.siCollected.length; i++) if (!japanese(live.g.data.specialItems[i * 4] ?? 0)) live.g.siCollected[i] = 0x81;
wear(live.g, itemIndex(live.g, CHI.top, 0));
enterRoom(live.g, JP.harbour, 0x0c + 4 * 4, standY(17));
for (let n = 0; n < 200 && (live.g.freeze || live.g.script); n++) frame(live, NONE);

let broken = false;
JAPAN_LEGS.forEach((leg, k) => {
  if (k > last || broken) return;
  if (k >= first && leg.pickup) {
    for (const v of VARIANTS) {
      const start = shifted(live, v.how);
      if (!start) continue;
      const found = search(start, leg.goal, leg.aim, 250000, 1.5);
      check(`${mode}: ${leg.name}: a way ${v.name}`, found !== null);
    }
  }
  const found = search(live, leg.goal, leg.aim, 600000, 1.5);
  const next = found ? play(live, found.route) : null;
  if (!next || !leg.goal(next.g)) { check(`${mode}: ${leg.name}: the bot's own way`, false); broken = true; return; }
  live = next;
});
finish();
