import { wait, type Seq } from '../../shared/monty/deaths';
import { ROW, SCREEN, type Game } from './game';
import { gameOver } from './scripts';

/**
 * Monty on the Run's finale (the data's `completion`): the treasure is touched and Monty is off to France: the dock (room $30),
 * the flag, the boat. Another game's finale, or none, is its own data.
 */

/** Completion.Begin: the treasure is touched — off to France. */
export function* completion(g: Game): Seq {
  g.freeze = 1;
  g.completionActive = 1;
  // (until he walks aboard, travel may take him away: the multicolours it then puts back)
  g.ending = { aboard: false, mc1: g.vic.mc1, mc2: g.vic.mc2 };
  g.actionCounter = 0;
  g.roomId = 0x30;
  g.loadRoom();
  for (const r of [19, 20, 21, 22]) g.col[r * ROW + 2] = 0;
  for (let x = 2, y = 0x65; x < 0x26; x++) {
    g.mem[SCREEN + 19 * ROW + x] = y;
    y = y === 0x67 ? 0x65 : y + 1;
  }
  // SetupDisplay: Monty (sprite 7) and the flag (sprite 0).
  g.sx[7] = 0x9b; g.sy[7] = 0xa3; g.scol[7] = 1;
  g.sx[0] = 0x7b; g.sy[0] = 0x56; g.scol[0] = 1;
  g.animTimer = 1;
  g.multicolour = 0x01;
  g.enable = 0x81;
  g.vic.mc1 = 2;
  g.vic.mc2 = 6;
  g.sound.song(2);
  yield* walkSprite7(g, 0x6c);
  if (!g.roomItemActive[2]) {
    // No passport: arrested at customs (can't happen with the full kit).
    yield* gameOver(g);
    return;
  }
  yield* wait(0xa0);
  // CompletionSetup: the boat.
  g.sy[1] = g.sy[2] = g.sy[3] = 0xa3;
  g.sx[1] = 0x0c; g.sx[2] = 0xe0; g.sx[3] = 0xf8;
  g.multicolour |= 0x0c;
  g.enable |= 0x0e;
  g.expandX = 0x0c;
  g.expandY = 0x0e;
  g.scol[2] = g.scol[3] = 1;
  g.scol[1] = 0;
  g.sptr[2] = 0x9e; g.sptr[3] = 0x9f; g.sptr[1] = 0xb4;
  g.priority = 0x0e;
  // Boat slides in.
  while (g.sx[2] !== 0x38) {
    yield;
    g.stepGate ^= 1;
    if (g.stepGate) { g.sx[2]++; g.sx[3]++; }
    boatParity(g);
  }
  // Monty walks aboard (from here the finale plays on to the end).
  yield* wait(0x80);
  if (g.ending) g.ending.aboard = true;
  yield* walkSprite7(g, 0x5e);
  for (let i = 0; i <= 0x0e; i++) {
    yield;
    g.sy[7]++;
  }
  yield* walkSprite7(g, 0x46);
  yield* wait(0x40);
  // Bon voyage.
  while (g.sx[3] !== 0xf9) {
    yield;
    g.stepGate ^= 1;
    if (!g.stepGate) { g.sx[2]--; g.sx[3]--; g.sx[7]--; }
    g.vic.sprites[7].x |= g.stepGate;
    boatParity(g);
  }
  g.won = true;
  yield* gameOver(g);
}

function boatParity(g: Game) {
  g.vic.sprites[2].x |= g.stepGate;
  g.vic.sprites[3].x |= g.stepGate;
}

/** WalkSprite7ToTarget: Monty (as sprite 7) walks left to a target X. */
function* walkSprite7(g: Game, target: number): Seq {
  while (g.sx[7] !== target) {
    yield;
    g.vic.sprites[7].x |= g.stepGate;
    g.animTimer = (g.animTimer - 1) & 0xff;
    if (!g.animTimer) {
      g.animTimer = 4;
      g.ticker = (g.ticker + 1) & 0xff;
    }
    g.sptr[7] = 0x50 + (g.ticker & 3);
    g.stepGate ^= 1;
    if (g.stepGate) g.sx[7]--;
  }
}
