/**
 * ENHANCED's still poles (src/assists.ts `stillPoles`, at the hook `ANIMATED_DRAWN`): in level I's second room (two poles),
 * with switch 3 off the poles' characters (0-2) stand still while the game's other animated characters (3-9) go on; with it
 * on they move as the game has them; and nothing else differs from the game without it (presentation only: Thing rides a
 * powered pole up the same, a dead one stops him the same).
 *
 *   nice -n 15 node tools/test.mjs games/thingonaspring/test/poles.ts
 */
import { joyOf, newGame, step } from '../re/play';
import { enter } from '../src/travel';
import { ANIMATED_DRAWN, stillPoles } from '../src/assists';
import { check, finish } from '../../shared/test/check';

const POLES = [0x0800, 0x0818] as const, OTHERS = [0x0818, 0x0850] as const;

/** A game in the room with the poles, switch 3 as given, the poles kept still or not; then `frames` of walking right into the left pole. */
function play(switch3: number, still: boolean, frames: number) {
  const g = newGame();
  enter(g.m.ram, 0, 6, 'L');
  for (let k = 0; k < 10; k++) step(g, 0x1f);
  g.m.ram[0x0373] = switch3;
  if (still) g.onHook = (pc) => { if (pc === ANIMATED_DRAWN) stillPoles(g.m.ram); };
  const looks = { poles: new Set<string>(), others: new Set<string>() };
  for (let k = 0; k < frames; k++) {
    step(g, joyOf('right'));
    if (k < 20) continue; // (the room as built, until the game's animation starts)
    looks.poles.add(g.m.ram.subarray(...POLES).join(','));
    looks.others.add(g.m.ram.subarray(...OTHERS).join(','));
  }
  return { ram: g.m.ram, looks, y: g.m.ram[0x1e] };
}
/** The addresses (outside the animated characters) where two games' memory differs. */
function differ(a: Uint8Array, b: Uint8Array) {
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && !(i >= POLES[0] && i < OTHERS[1])) out.push(i);
  return out;
}

const off = play(0, true, 200), offGame = play(0, false, 200);
check(`switch 3 off: the poles stand still (${off.looks.poles.size} look)`, off.looks.poles.size === 1);
check(`switch 3 off: the other animated characters go on (${off.looks.others.size} looks)`, off.looks.others.size > 1);
check(`switch 3 off: the game moves as without it (stuck at the dead pole, y ${off.y})`, differ(off.ram, offGame.ram).length === 0);
const on = play(1, true, 200), onGame = play(1, false, 200);
check(`switch 3 on: the poles move as the game has them (${on.looks.poles.size} looks)`, on.looks.poles.size > 1);
check(`switch 3 on: he rides the pole up as without it (y ${on.y}, ${onGame.y})`, on.y < 100 && differ(on.ram, onGame.ram).length === 0);
finish();
